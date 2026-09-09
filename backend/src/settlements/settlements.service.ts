import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ConfirmSettlementDto } from './dto/confirm-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.settlement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.settlement.findUnique({
      where: {
        id,
      },
      include: {
        worker: true,
        sale: {
          include: {
            farm: true,
            commodity: true,
          },
        },
      },
    });
  }

  async findBySale(saleId: number) {
    return this.prisma.settlement.findMany({
      where: {
        saleId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }

  async calculateSettlement(rubberWorkerId: number) {
    const rubberWorker = await this.prisma.rubberSaleWorker.findUnique({
      where: {
        id: rubberWorkerId,
      },
      include: {
        worker: true,
        sale: true,
      },
    });

    if (!rubberWorker) {
      throw new NotFoundException('Rubber worker tidak ditemukan');
    }

    if (rubberWorker.sale.pricePerKg === null) {
      throw new BadRequestException('Harga karet belum tersedia');
    }

    const pricePerKg = Number(rubberWorker.sale.pricePerKg);

    const weightKg = Number(rubberWorker.weightKg);

    const grossValue = weightKg * pricePerKg;

    const workerShare = grossValue / 2;

    const creditAccount = await this.prisma.creditAccount.findUnique({
      where: {
        personId: rubberWorker.workerId,
      },
    });

    let outstandingKasbon = 0;

    if (creditAccount) {
      const transactions = await this.prisma.creditTransaction.findMany({
        where: {
          creditAccountId: creditAccount.id,
        },
      });

      for (const transaction of transactions) {
        if (transaction.type === 'DEBT') {
          outstandingKasbon += Number(transaction.amount);
        }

        if (transaction.type === 'PAYMENT') {
          outstandingKasbon -= Number(transaction.amount);
        }
      }
    }

    outstandingKasbon = Math.max(0, outstandingKasbon);

    const deductionAmount = Math.min(workerShare, outstandingKasbon);

    const netAmount = workerShare - deductionAmount;

    const remainingKasbon = outstandingKasbon - deductionAmount;

    return {
      rubberWorkerId,
      worker: rubberWorker.worker.name,
      saleId: rubberWorker.saleId,
      weightKg,
      pricePerKg,
      grossValue,
      workerShare,
      outstandingKasbon,
      deductionAmount,
      netAmount,
      remainingKasbon,
    };
  }

  async confirmSettlement(confirmSettlementDto: ConfirmSettlementDto) {
    const rubberWorker = await this.prisma.rubberSaleWorker.findUnique({
      where: {
        id: confirmSettlementDto.rubberWorkerId,
      },
      include: {
        worker: true,
        sale: true,
      },
    });

    if (!rubberWorker) {
      throw new NotFoundException('Rubber worker tidak ditemukan');
    }

    if (rubberWorker.sale.pricePerKg === null) {
      throw new BadRequestException('Harga karet belum tersedia');
    }

    const existingSettlement = await this.prisma.settlement.findUnique({
      where: {
        saleId_workerId: {
          saleId: rubberWorker.saleId,
          workerId: rubberWorker.workerId,
        },
      },
    });

    if (existingSettlement) {
      throw new BadRequestException('Settlement untuk worker ini sudah dibuat');
    }

    const calculation = await this.calculateSettlement(
      confirmSettlementDto.rubberWorkerId,
    );

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          saleId: rubberWorker.saleId,
          workerId: rubberWorker.workerId,
          grossShare: calculation.workerShare,
          kasbonAmount: calculation.outstandingKasbon,
          deductionAmount: calculation.deductionAmount,
          netAmount: calculation.netAmount,
          status: 'CONFIRMED',
        },
      });

      if (calculation.deductionAmount > 0) {
        const creditAccount = await tx.creditAccount.findUnique({
          where: {
            personId: rubberWorker.workerId,
          },
        });

        if (!creditAccount) {
          throw new BadRequestException(
            'Credit account worker tidak ditemukan',
          );
        }

        await tx.creditTransaction.create({
          data: {
            creditAccountId: creditAccount.id,
            type: 'PAYMENT',
            amount: calculation.deductionAmount,
            transactionDate: new Date(),
            description: `Potongan kasbon settlement Sale #${rubberWorker.saleId}`,
            reference: `SETTLEMENT-${settlement.id}`,
          },
        });
      }

      if (calculation.netAmount > 0) {
        await tx.moneyTransaction.create({
          data: {
            type: 'OUT',
            category: 'RUBBER_WORKER_SETTLEMENT',
            amount: calculation.netAmount,
            transactionDate: new Date(),
            description: `Pembayaran settlement ${rubberWorker.worker.name}`,
            referenceType: 'SETTLEMENT',
            referenceId: settlement.id,
          },
        });
      }

      return settlement;
    });
  }
  async confirmSaleSettlements(saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id: saleId,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      if (sale.status !== 'COMPLETED') {
        throw new BadRequestException(
          'Sale harus dikonfirmasi terlebih dahulu sebelum settlement',
        );
      }
      const workers = await tx.rubberSaleWorker.findMany({
        where: {
          saleId,
        },
        include: {
          worker: true,
          sale: true,
        },
      });

      if (workers.length === 0) {
        throw new NotFoundException('Tidak ada worker pada sale tersebut');
      }

      const existingSettlements = await tx.settlement.findMany({
        where: {
          saleId,
        },
      });

      if (existingSettlements.length > 0) {
        throw new BadRequestException(
          'Settlement untuk sale ini sudah pernah dibuat',
        );
      }

      const results = [];

      for (const rubberWorker of workers) {
        if (rubberWorker.sale.pricePerKg === null) {
          throw new BadRequestException('Harga karet belum ditentukan');
        }

        const pricePerKg = Number(rubberWorker.sale.pricePerKg);
        const weightKg = Number(rubberWorker.weightKg);

        const grossShare = weightKg * pricePerKg;
        const workerShare = grossShare / 2;

        const creditTransactions = await tx.creditTransaction.findMany({
          where: {
            creditAccount: {
              personId: rubberWorker.workerId,
            },
          },
        });

        let outstandingKasbon = 0;

        for (const transaction of creditTransactions) {
          if (transaction.type === 'DEBT') {
            outstandingKasbon += Number(transaction.amount);
          }

          if (transaction.type === 'PAYMENT') {
            outstandingKasbon -= Number(transaction.amount);
          }
        }

        outstandingKasbon = Math.max(outstandingKasbon, 0);

        const deductionAmount = Math.min(workerShare, outstandingKasbon);

        const netAmount = workerShare - deductionAmount;

        const remainingKasbon = outstandingKasbon - deductionAmount;

        const settlement = await tx.settlement.create({
          data: {
            saleId,
            workerId: rubberWorker.workerId,
            grossShare,
            kasbonAmount: outstandingKasbon,
            deductionAmount,
            netAmount,
            status: 'CONFIRMED',
          },
        });

        if (deductionAmount > 0) {
          const creditAccount = await tx.creditAccount.findFirst({
            where: {
              personId: rubberWorker.workerId,
            },
          });

          if (!creditAccount) {
            throw new BadRequestException(
              `Credit account untuk ${rubberWorker.worker.name} tidak ditemukan`,
            );
          }

          await tx.creditTransaction.create({
            data: {
              creditAccountId: creditAccount.id,
              type: 'PAYMENT',
              amount: deductionAmount,
              description: `Potongan kasbon dari settlement karet`,
              transactionDate: new Date(),
            },
          });
        }

        if (netAmount > 0) {
          await tx.moneyTransaction.create({
            data: {
              type: 'OUT',
              amount: netAmount,
              category: 'RUBBER_WORKER_SETTLEMENT',
              description: `Pembayaran hasil karet ${rubberWorker.worker.name}`,
              transactionDate: new Date(),
            },
          });
        }

        results.push({
          settlementId: settlement.id,
          workerId: rubberWorker.workerId,
          workerName: rubberWorker.worker.name,
          weightKg,
          grossShare,
          workerShare,
          kasbonAmount: outstandingKasbon,
          deductionAmount,
          netAmount,
          remainingKasbon,
        });
      }

      return {
        saleId,
        status: 'CONFIRMED',
        workers: results,
      };
    });
  }
}
