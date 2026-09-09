import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';

import { CreateMoneyTransactionDto } from './dto/create-money-transaction.dto';

@Injectable()
export class MoneyTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.moneyTransaction.findMany({
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  async getCashFlow(startDate: Date, endDate: Date) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.moneyTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: end,
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });
  }

  async getCashFlowSummary(startDate: Date, endDate: Date) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions =
      await this.prisma.moneyTransaction.findMany({
        where: {
          transactionDate: {
            gte: startDate,
            lte: end,
          },
        },
      });

    let totalIn = 0;
    let totalOut = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === 'IN') {
        totalIn += amount;
      }

      if (transaction.type === 'OUT') {
        totalOut += amount;
      }
    }

    return {
      startDate,
      endDate: end,
      totalIn,
      totalOut,
      netCashFlow: totalIn - totalOut,
    };
  }

  async getCashFlowByPeriod(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly',
  ) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions =
      await this.prisma.moneyTransaction.findMany({
        where: {
          transactionDate: {
            gte: startDate,
            lte: end,
          },
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

    const grouped = new Map<
      string,
      {
        date: string;
        moneyIn: number;
        moneyOut: number;
        net: number;
      }
    >();

    for (const transaction of transactions) {
      const transactionDate = new Date(
        transaction.transactionDate,
      );

      let key: string;

      if (period === 'daily') {
        key = this.getDailyKey(transactionDate);
      } else if (period === 'weekly') {
        key = this.getWeeklyKey(transactionDate);
      } else {
        key = this.getMonthlyKey(transactionDate);
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          moneyIn: 0,
          moneyOut: 0,
          net: 0,
        });
      }

      const item = grouped.get(key)!;
      const amount = Number(transaction.amount);

      if (transaction.type === 'IN') {
        item.moneyIn += amount;
      }

      if (transaction.type === 'OUT') {
        item.moneyOut += amount;
      }

      item.net = item.moneyIn - item.moneyOut;
    }

    return {
      period,
      startDate,
      endDate: end,
      data: Array.from(grouped.values()),
    };
  }

  private getDailyKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private getWeeklyKey(date: Date): string {
    const result = new Date(date);

    const day = result.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);

    return this.getDailyKey(result);
  }

  private getMonthlyKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
    ].join('-');
  }

  async findOne(id: number) {
    return this.prisma.moneyTransaction.findUnique({
      where: {
        id,
      },
    });
  }

  async createOpeningBalance(
    createOpeningBalanceDto: CreateOpeningBalanceDto,
  ) {
    const existingOpeningBalance =
      await this.prisma.moneyTransaction.findFirst({
        where: {
          type: 'IN',
          category: 'OPENING_BALANCE',
        },
      });

    if (existingOpeningBalance) {
      throw new BadRequestException(
        'Saldo awal sudah pernah dibuat',
      );
    }

    return this.prisma.moneyTransaction.create({
      data: {
        type: 'IN',
        category: 'OPENING_BALANCE',
        amount: createOpeningBalanceDto.amount,
        transactionDate: new Date(
          createOpeningBalanceDto.transactionDate,
        ),
        description:
          createOpeningBalanceDto.description ??
          'Saldo awal',
        referenceType: 'OPENING_BALANCE',
      },
    });
  }

  async create(
    createMoneyTransactionDto: CreateMoneyTransactionDto,
  ) {
    return this.prisma.moneyTransaction.create({
      data: {
        type: createMoneyTransactionDto.type,
        category: createMoneyTransactionDto.category,
        amount: createMoneyTransactionDto.amount,
        transactionDate: new Date(
          createMoneyTransactionDto.transactionDate,
        ),
        description:
          createMoneyTransactionDto.description,
      },
    });
  }

  async getCashPosition() {
    const result =
      await this.prisma.moneyTransaction.groupBy({
        by: ['type'],
        _sum: {
          amount: true,
        },
      });

    let totalIn = 0;
    let totalOut = 0;

    for (const item of result) {
      const amount = Number(
        item._sum.amount ?? 0,
      );

      if (item.type === 'IN') {
        totalIn += amount;
      }

      if (item.type === 'OUT') {
        totalOut += amount;
      }
    }

    return {
      totalIn,
      totalOut,
      cashPosition: totalIn - totalOut,
    };
  }
}