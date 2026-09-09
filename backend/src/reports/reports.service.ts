import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
    };
  }

  async getFinanceSummary(startDate: Date, endDate: Date) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const transactions = await this.prisma.moneyTransaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === 'IN') {
        totalIncome += amount;
      }

      if (transaction.type === 'OUT') {
        totalExpense += amount;
      }
    }

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
    };
  }

  async getSalesSummary(startDate: Date, endDate: Date) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const sales = await this.prisma.sale.findMany({
      where: {
        saleDate: {
          gte: start,
          lte: end,
        },
        status: 'COMPLETED',
      },
      include: {
        commodity: true,
      },
    });

    let totalWeightKg = 0;
    let totalRevenue = 0;

    const commoditySummary = new Map<
      number,
      {
        commodityId: number;
        commodityName: string;
        unit: string;
        totalSales: number;
        totalWeightKg: number;
        totalRevenue: number;
      }
    >();

    for (const sale of sales) {
      const weight = Number(sale.totalWeightKg);
      const price = Number(sale.pricePerKg ?? 0);
      const revenue = weight * price;

      totalWeightKg += weight;
      totalRevenue += revenue;

      const existing = commoditySummary.get(sale.commodityId);

      if (existing) {
        existing.totalSales += 1;
        existing.totalWeightKg += weight;
        existing.totalRevenue += revenue;
      } else {
        commoditySummary.set(sale.commodityId, {
          commodityId: sale.commodityId,
          commodityName: sale.commodity.name,
          unit: sale.commodity.unit,
          totalSales: 1,
          totalWeightKg: weight,
          totalRevenue: revenue,
        });
      }
    }

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      totalSales: sales.length,
      totalWeightKg,
      totalRevenue,
      summaryByCommodity: Array.from(commoditySummary.values()),
      sales,
    };
  }

  async getSettlementSummary(startDate: Date, endDate: Date) {
    const { start, end } = this.getDateRange(startDate, endDate);

    const settlements = await this.prisma.settlement.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: 'CONFIRMED',
      },
    });

    let totalGrossShare = 0;
    let totalDeduction = 0;
    let totalNetAmount = 0;

    for (const settlement of settlements) {
      totalGrossShare += Number(settlement.grossShare);

      totalDeduction += Number(settlement.deductionAmount);

      totalNetAmount += Number(settlement.netAmount);
    }

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      totalSettlements: settlements.length,
      totalGrossShare,
      totalDeduction,
      totalNetAmount,
      settlements,
    };
  }

  async getDashboardSummary() {
    const transactions = await this.prisma.moneyTransaction.findMany({
      orderBy: {
        transactionDate: 'desc',
      },
      take: 10,
    });

    const allTransactions = await this.prisma.moneyTransaction.findMany();

    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of allTransactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === 'IN') {
        totalIncome += amount;
      }

      if (transaction.type === 'OUT') {
        totalExpense += amount;
      }
    }

    return {
      cashPosition: {
        totalIncome,
        totalExpense,
        currentCash: totalIncome - totalExpense,
      },

      recentTransactions: transactions,
    };
  }
}
