import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeSaleOwnIncome,
  isSawitCommodity,
  parseDecimal,
} from './reports.calculator';

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

    let cashIn = 0;
    let cashOut = 0;

    for (const transaction of transactions) {
      const amount = parseDecimal(transaction.amount);

      if (transaction.type === 'IN') {
        cashIn += amount;
      }

      if (transaction.type === 'OUT') {
        cashOut += amount;
      }
    }

    const netCashFlow = cashIn - cashOut;

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      cashIn,
      cashOut,
      netCashFlow,
      // Backward compatibility aliases
      totalIncome: cashIn,
      totalExpense: cashOut,
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
        farm: true,
      },
    });

    let totalWeightKg = 0;
    let totalGrossSales = 0;
    let totalOwnIncome = 0;
    let totalCommissionIncome = 0;

    const commoditySummaryMap = new Map<
      number,
      {
        commodityId: number;
        commodityName: string;
        unit: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    const ownershipSummaryMap = new Map<
      string,
      {
        ownershipType: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    const farmSummaryMap = new Map<
      number,
      {
        farmId: number;
        farmName: string;
        ownershipType: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    for (const sale of sales) {
      const weight = parseDecimal(sale.totalWeightKg);
      const { gross, ownIncome, commissionIncome } =
        computeSaleOwnIncome(sale);

      totalWeightKg += weight;
      totalGrossSales += gross;
      totalOwnIncome += ownIncome;
      totalCommissionIncome += commissionIncome;

      // Commodity map
      const commId = sale.commodityId;
      const commExisting = commoditySummaryMap.get(commId);
      if (commExisting) {
        commExisting.totalSales += 1;
        commExisting.totalWeightKg += weight;
        commExisting.grossSales += gross;
        commExisting.ownIncome += ownIncome;
        commExisting.commissionIncome += commissionIncome;
      } else {
        commoditySummaryMap.set(commId, {
          commodityId: commId,
          commodityName: sale.commodity.name,
          unit: sale.commodity.unit,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome,
          commissionIncome,
        });
      }

      // Ownership map
      const ownershipKey =
        sale.ownershipType ?? sale.farm?.ownershipType ?? 'UNKNOWN';
      const ownExisting = ownershipSummaryMap.get(ownershipKey);
      if (ownExisting) {
        ownExisting.totalSales += 1;
        ownExisting.totalWeightKg += weight;
        ownExisting.grossSales += gross;
        ownExisting.ownIncome += ownIncome;
        ownExisting.commissionIncome += commissionIncome;
      } else {
        ownershipSummaryMap.set(ownershipKey, {
          ownershipType: ownershipKey,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome,
          commissionIncome,
        });
      }

      // Farm map
      const farmId = sale.farmId;
      const farmName = sale.farm?.name ?? `Farm #${farmId}`;
      const farmOwnership = sale.farm?.ownershipType ?? 'UNKNOWN';
      const farmExisting = farmSummaryMap.get(farmId);
      if (farmExisting) {
        farmExisting.totalSales += 1;
        farmExisting.totalWeightKg += weight;
        farmExisting.grossSales += gross;
        farmExisting.ownIncome += ownIncome;
        farmExisting.commissionIncome += commissionIncome;
      } else {
        farmSummaryMap.set(farmId, {
          farmId,
          farmName,
          ownershipType: farmOwnership,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome,
          commissionIncome,
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
      grossSales: totalGrossSales,
      totalRevenue: totalGrossSales, // backward compatibility
      totalOwnIncome,
      totalCommissionIncome,
      summaryByCommodity: Array.from(commoditySummaryMap.values()),
      summaryByOwnership: Array.from(ownershipSummaryMap.values()),
      summaryByFarm: Array.from(farmSummaryMap.values()),
      sales,
    };
  }

  async getSettlementSummary(startDate: Date, endDate: Date) {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalSettlements = 0;
    let totalWorkerShare = 0;
    let totalDeduction = 0;
    let totalNetPayment = 0;

    for (const settlement of settlements) {
      totalSettlements += 1;
      totalWorkerShare += parseDecimal(settlement.grossShare);
      totalDeduction += parseDecimal(settlement.deductionAmount);
      totalNetPayment += parseDecimal(settlement.netAmount);
    }

    return {
      totalSettlements,
      totalWorkerShare,
      totalDeduction,
      totalNetPayment,
    };
  }

  async getDashboardSummary() {
    const [
      recentTransactions,
      incomeResult,
      expenseResult,
      sales,
      settlements,
      ownerSettlementResult,
    ] = await Promise.all([
      this.prisma.moneyTransaction.findMany({
        orderBy: {
          transactionDate: 'desc',
        },
        take: 10,
      }),

      this.prisma.moneyTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: 'IN',
        },
      }),

      this.prisma.moneyTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: 'OUT',
        },
      }),

      this.prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
        },
        include: {
          commodity: true,
          farm: true,
        },
      }),

      this.prisma.settlement.findMany({
        where: {
          status: 'CONFIRMED',
        },
      }),

      this.prisma.ownerSettlement.aggregate({
        _sum: {
          outstandingAmount: true,
          settledAmount: true,
          ownerShareAmount: true,
        },
      }),
    ]);

    const cashIn = parseDecimal(incomeResult._sum.amount);
    const cashOut = parseDecimal(expenseResult._sum.amount);
    const netCash = cashIn - cashOut;

    let totalSales = 0;
    let totalWeightKg = 0;
    let grossSales = 0;
    let ownIncome = 0;
    let commissionIncome = 0;
    let ownFarmSalesGross = 0;
    let relativeFarmSalesGross = 0;

    const commoditySummaryMap = new Map<
      number,
      {
        commodityId: number;
        commodityName: string;
        unit: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    const ownershipSummaryMap = new Map<
      string,
      {
        ownershipType: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    const farmSummaryMap = new Map<
      number,
      {
        farmId: number;
        farmName: string;
        ownershipType: string;
        totalSales: number;
        totalWeightKg: number;
        grossSales: number;
        ownIncome: number;
        commissionIncome: number;
      }
    >();

    for (const sale of sales) {
      const weight = parseDecimal(sale.totalWeightKg);
      const { gross, ownIncome: saleIncome, commissionIncome: saleCommission } =
        computeSaleOwnIncome(sale);

      totalSales += 1;
      totalWeightKg += weight;
      grossSales += gross;
      ownIncome += saleIncome;
      commissionIncome += saleCommission;

      const ownership =
        sale.ownershipType ?? sale.farm?.ownershipType ?? 'UNKNOWN';
      const isSawit = isSawitCommodity(sale.commodity?.name);

      if (isSawit) {
        if (ownership === 'OWN') {
          ownFarmSalesGross += gross;
        } else if (ownership === 'RELATIVE') {
          relativeFarmSalesGross += gross;
        }
      }

      // Commodity Map
      const commId = sale.commodityId;
      const commExisting = commoditySummaryMap.get(commId);
      if (commExisting) {
        commExisting.totalSales += 1;
        commExisting.totalWeightKg += weight;
        commExisting.grossSales += gross;
        commExisting.ownIncome += saleIncome;
        commExisting.commissionIncome += saleCommission;
      } else {
        commoditySummaryMap.set(commId, {
          commodityId: commId,
          commodityName: sale.commodity.name,
          unit: sale.commodity.unit,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome: saleIncome,
          commissionIncome: saleCommission,
        });
      }

      // Ownership Map
      const ownExisting = ownershipSummaryMap.get(ownership);
      if (ownExisting) {
        ownExisting.totalSales += 1;
        ownExisting.totalWeightKg += weight;
        ownExisting.grossSales += gross;
        ownExisting.ownIncome += saleIncome;
        ownExisting.commissionIncome += saleCommission;
      } else {
        ownershipSummaryMap.set(ownership, {
          ownershipType: ownership,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome: saleIncome,
          commissionIncome: saleCommission,
        });
      }

      // Farm Map
      const farmId = sale.farmId;
      const farmName = sale.farm?.name ?? `Farm #${farmId}`;
      const farmOwnership = sale.farm?.ownershipType ?? 'UNKNOWN';
      const farmExisting = farmSummaryMap.get(farmId);
      if (farmExisting) {
        farmExisting.totalSales += 1;
        farmExisting.totalWeightKg += weight;
        farmExisting.grossSales += gross;
        farmExisting.ownIncome += saleIncome;
        farmExisting.commissionIncome += saleCommission;
      } else {
        farmSummaryMap.set(farmId, {
          farmId,
          farmName,
          ownershipType: farmOwnership,
          totalSales: 1,
          totalWeightKg: weight,
          grossSales: gross,
          ownIncome: saleIncome,
          commissionIncome: saleCommission,
        });
      }
    }

    let totalSettlements = 0;
    let totalWorkerShare = 0;
    let totalDeduction = 0;
    let totalNetPayment = 0;

    for (const settlement of settlements) {
      totalSettlements += 1;
      totalWorkerShare += parseDecimal(settlement.grossShare);
      totalDeduction += parseDecimal(settlement.deductionAmount);
      totalNetPayment += parseDecimal(settlement.netAmount);
    }

    const ownerShareOutstanding = parseDecimal(
      ownerSettlementResult._sum.outstandingAmount,
    );
    const ownerSharePaid = parseDecimal(
      ownerSettlementResult._sum.settledAmount,
    );

    return {
      cashPosition: {
        cashIn,
        cashOut,
        netCash,
        // Backward compatibility
        totalIncome: cashIn,
        totalExpense: cashOut,
        currentCash: netCash,
      },

      income: {
        grossSales,
        ownIncome,
        commissionIncome,
        ownFarmSalesGross,
        relativeFarmSalesGross,
      },

      obligation: {
        ownerShareOutstanding,
        ownerSharePaid,
      },

      sales: {
        totalSales,
        totalWeightKg,
        grossSales,
        ownIncome,
        commissionIncome,
        totalRevenue: grossSales, // backward compatibility
        summaryByCommodity: Array.from(commoditySummaryMap.values()),
        summaryByOwnership: Array.from(ownershipSummaryMap.values()),
        summaryByFarm: Array.from(farmSummaryMap.values()),
      },

      settlements: {
        totalSettlements,
        totalWorkerShare,
        totalDeduction,
        totalNetPayment,
      },

      recentTransactions,
    };
  }
}
