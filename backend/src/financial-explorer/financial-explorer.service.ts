import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import {
  categoryBreakdown,
  dailySeries,
  eachDay,
  summarize,
} from './financial-explorer.calculator';
import { flowRoleFor } from './money-flow-role';

import { FinancialExplorerQueryDto } from './dto/financial-explorer-query.dto';

export type ExplorerFilters = Pick<
  FinancialExplorerQueryDto,
  'type' | 'category' | 'farmId' | 'search'
>;

/**
 * Read-only financial explorer over MoneyTransaction, the single record of
 * actual money movement. Sales and settlements are never counted directly:
 * they reach the explorer only through the rows they wrote.
 */
@Injectable()
export class FinancialExplorerService {
  constructor(private readonly prisma: PrismaService) {}

  private range(startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /** Only the columns the calculator needs, so rows stay cheap to build. */
  private readonly rowSelect = {
    id: true,
    type: true,
    category: true,
    amount: true,
    transactionDate: true,
    description: true,
    referenceType: true,
    referenceId: true,
    farmId: true,
    farm: { select: { name: true, ownershipType: true } },
  } as const;

  /** All rows up to `end`, including the opening-balance history before start. */
  private async rowsUntil(end: Date) {
    const rows = await this.prisma.moneyTransaction.findMany({
      where: { transactionDate: { lte: end } },
      select: this.rowSelect,
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      ...row,
      farmOwnershipType: row.farm?.ownershipType ?? null,
    }));
  }

  private where(filters: ExplorerFilters) {
    const search = filters.search?.trim();
    return {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.farmId ? { farmId: filters.farmId } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    };
  }

  async getSummary(query: FinancialExplorerQueryDto) {
    const { start, end } = this.range(query.startDate, query.endDate);
    const rows = await this.rowsUntil(end);
    const result = summarize(rows, start, end);

    return {
      ...result,
      startDate: result.startDate.toISOString(),
      endDate: result.endDate.toISOString(),
    };
  }

  async getCashFlow(query: FinancialExplorerQueryDto) {
    const { start, end } = this.range(query.startDate, query.endDate);
    const rows = await this.rowsUntil(end);
    const days = dailySeries(rows, start, end);

    const period = query.period ?? 'daily';
    const data =
      period === 'daily' ? days : this.groupByPeriod(days, period);

    return {
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      data,
    };
  }

  private groupByPeriod(
    days: { date: string; income: number; expense: number; count: number }[],
    period: 'weekly' | 'monthly',
  ) {
    const groups = new Map<
      string,
      { date: string; income: number; expense: number; count: number }
    >();

    for (const day of days) {
      const [year, month, date] = day.date.split('-').map(Number);
      const key =
        period === 'monthly'
          ? `${day.date.slice(0, 7)}`
          : this.weekKey(new Date(year, month - 1, date));

      const current = groups.get(key) ?? {
        date: key,
        income: 0,
        expense: 0,
        count: 0,
      };
      current.income += day.income;
      current.expense += day.expense;
      current.count += day.count;
      groups.set(key, current);
    }

    return Array.from(groups.values());
  }

  private weekKey(date: Date) {
    const monday = new Date(date);
    const weekday = monday.getDay();
    monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday));
    return [
      monday.getFullYear(),
      String(monday.getMonth() + 1).padStart(2, '0'),
      String(monday.getDate()).padStart(2, '0'),
    ].join('-');
  }

  async getDaily(
    type: 'IN' | 'OUT',
    query: FinancialExplorerQueryDto,
  ) {
    const breakdown = await this.getCashFlow(query);
    const total = breakdown.data.reduce(
      (sum, item) => sum + (type === 'IN' ? item.income : item.expense),
      0,
    );

    return {
      type,
      startDate: breakdown.startDate,
      endDate: breakdown.endDate,
      total,
      days: breakdown.data.map((item) => ({
        date: item.date,
        amount: type === 'IN' ? item.income : item.expense,
        count: item.count,
      })),
    };
  }

  async getCategories(query: FinancialExplorerQueryDto) {
    const { start, end } = this.range(query.startDate, query.endDate);
    const rows = await this.rowsUntil(end);

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      income: categoryBreakdown(rows, 'IN', start, end),
      expense: categoryBreakdown(rows, 'OUT', start, end),
      // Gross sales of another owner's farm, shown apart from income.
      passthrough: categoryBreakdown(rows, 'IN', start, end, true).categories.filter(
        (item) => item.category === 'HARVEST_SALE',
      ),
    };
  }

  async getTransactions(query: FinancialExplorerQueryDto) {
    const { start, end } = this.range(query.startDate, query.endDate);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      transactionDate: { gte: start, lte: end },
      ...this.where(query),
    };

    const [total, totalAmount, rows, allRows] = await Promise.all([
      this.prisma.moneyTransaction.count({ where }),
      this.prisma.moneyTransaction.aggregate({ where, _sum: { amount: true } }),
      this.prisma.moneyTransaction.findMany({
        where,
        select: this.rowSelect,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // Needed to flag passthrough rows in the page (see flowRoleFor).
      this.prisma.moneyTransaction.findMany({
        where,
        select: { id: true, category: true, farm: { select: { ownershipType: true } } },
      }),
    ]);

    const roles = new Map(
      allRows.map((row) => [
        row.id,
        flowRoleFor({
          category: row.category,
          farmOwnershipType: row.farm?.ownershipType ?? null,
        }),
      ]),
    );

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      totalAmount: Math.abs(Number(totalAmount._sum.amount ?? 0)),
      data: rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        role: roles.get(row.id) ?? 'OWN',
      })),
    };
  }

  /**
   * One transaction plus the rows that describe the same event:
   * its sale (and that sale's settlements) or the settlement's sale.
   * Unrelated contexts are simply absent.
   */
  async getDetail(id: number) {
    const row = await this.prisma.moneyTransaction.findUnique({
      where: { id },
      include: {
        farm: { select: { id: true, name: true, ownershipType: true } },
      },
    });

    if (!row) throw new NotFoundException('Transaksi tidak ditemukan');

    const [sale, settlement] = await this.related(row);

    return {
      transaction: {
        ...row,
        amount: Number(row.amount),
        role: flowRoleFor({
          category: row.category,
          farmOwnershipType: row.farm?.ownershipType ?? null,
        }),
      },
      sale,
      settlement,
    };
  }

  /** Ids of the rows that carry the same event as `row`. */
  private async related(row: {
    referenceType: string | null;
    referenceId: number | null;
    category: string;
  }) {
    const referenceId = row.referenceId;
    if (!referenceId) return [null, null] as const;

    if (row.referenceType === 'SALE') {
      return [
        await this.saleContext(referenceId),
        null,
      ] as const;
    }

    if (row.referenceType === 'OWNER_SETTLEMENT') {
      const ownerSettlement = await this.prisma.ownerSettlement.findUnique({
        where: { id: referenceId },
        select: { saleId: true },
      });
      return [
        ownerSettlement ? await this.saleContext(ownerSettlement.saleId) : null,
        null,
      ] as const;
    }

    if (row.referenceType === 'SETTLEMENT') {
      return [null, await this.settlementContext(referenceId)] as const;
    }

    return [null, null] as const;
  }

  private saleContext(saleId: number) {
    return this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        farm: { select: { id: true, name: true, ownershipType: true } },
        commodity: { select: { id: true, name: true, unit: true } },
        settlements: {
          select: {
            id: true,
            worker: { select: { id: true, name: true } },
            grossShare: true,
            deductionAmount: true,
            netAmount: true,
            status: true,
            settledAt: true,
          },
        },
        scanDocuments: {
          select: {
            id: true,
            imagePath: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }

  private async settlementContext(settlementId: number) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        worker: { select: { id: true, name: true } },
        sale: {
          include: {
            farm: { select: { id: true, name: true, ownershipType: true } },
            commodity: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    if (!settlement) return null;

    const [money, credit] = await Promise.all([
      settlement.cashTransactionId
        ? this.prisma.moneyTransaction.findMany({
            where: { id: settlement.cashTransactionId },
            select: { id: true, type: true, category: true, amount: true },
          })
        : [],
      this.prisma.creditTransaction.findMany({
        where: { reference: `SETTLEMENT-${settlement.id}` },
        select: { id: true, type: true, amount: true, description: true },
      }),
    ]);

    return { ...settlement, money, credit };
  }

  /** Every row that shares the event behind `id`, for traceability. */
  async getTrace(id: number) {
    const detail = await this.getDetail(id);
    const { transaction, sale, settlement } = detail;

    const rows: {
      id: number;
      relation: string;
      type: string;
      category: string;
      amount: number;
      transactionDate: Date;
    }[] = [
      {
        id: transaction.id,
        relation: 'THIS',
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        transactionDate: transaction.transactionDate,
      },
    ];

    const saleId = sale?.id ?? settlement?.sale?.id ?? null;

    if (saleId) {
      const money = await this.prisma.moneyTransaction.findMany({
        where: {
          OR: [
            { referenceType: 'SALE', referenceId: saleId },
            { referenceType: 'OWNER_SETTLEMENT' },
          ],
        },
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          transactionDate: true,
          referenceType: true,
          referenceId: true,
        },
      });

      const saleIds = await this.prisma.ownerSettlement.findMany({
        where: { saleId },
        select: { id: true },
      });
      const ownerIds = new Set(saleIds.map((item) => item.id));

      const settlementIds = (sale?.settlements ?? []).map((item) => item.id);

      for (const row of money) {
        if (row.id === transaction.id) continue;
        if (row.referenceType === 'SALE') {
          rows.push({ id: row.id, relation: 'SALE', ...pick(row) });
          continue;
        }
        if (
          row.referenceType === 'OWNER_SETTLEMENT' &&
          row.referenceId !== null &&
          ownerIds.has(row.referenceId)
        ) {
          rows.push({ id: row.id, relation: 'OWNER_SETTLEMENT', ...pick(row) });
        }
      }

      if (settlementIds.length) {
        const settlementMoney = await this.prisma.moneyTransaction.findMany({
          where: { referenceType: 'SETTLEMENT', referenceId: { in: settlementIds } },
          select: {
            id: true,
            type: true,
            category: true,
            amount: true,
            transactionDate: true,
          },
        });
        for (const row of settlementMoney) {
          if (row.id === transaction.id) continue;
          rows.push({ id: row.id, relation: 'WORKER_SETTLEMENT', ...pick(row) });
        }
      }
    }

    return {
      transactionId: transaction.id,
      saleId,
      settlementId: settlement?.id ?? null,
      rows,
    };
  }
}

function pick(row: {
  type: string;
  category: string;
  amount: unknown;
  transactionDate: Date;
}) {
  return {
    type: row.type,
    category: row.category,
    amount: Math.abs(Number(row.amount)),
    transactionDate: row.transactionDate,
  };
}
