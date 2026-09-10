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
  // =========================================================
  // FIND ALL
  // =========================================================
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
  // =========================================================
  // FIND ONE
  // =========================================================
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
  // =========================================================
  // FIND BY SALE
  // =========================================================

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
  // =========================================================
  // CALCULATE SETTLEMENT
  // =========================================================
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

    const pieces = rubberWorker.pieces;
    const weightKg = Number(rubberWorker.weightKg);
    const pricePerKg = Number(rubberWorker.sale.pricePerKg);
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
      pieces,
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
  // =========================================================
  // CONFIRM SINGLE SETTLEMENT
  // =========================================================
  async confirmSettlement(confirmSettlementDto: ConfirmSettlementDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const rubberWorker = await tx.rubberSaleWorker.findUnique({
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
        // -----------------------------------------------------
        // CEK DUPLICATE SETTLEMENT
        // -----------------------------------------------------
        const existingSettlement = await tx.settlement.findUnique({
          where: {
            saleId_workerId: {
              saleId: rubberWorker.saleId,
              workerId: rubberWorker.workerId,
            },
          },
        });
        if (existingSettlement) {
          throw new BadRequestException(
            'Settlement untuk worker ini sudah dibuat',
          );
        }
        // -----------------------------------------------------
        // LOCK CREDIT ACCOUNT
        // -----------------------------------------------------
        const lockedAccounts = await tx.$queryRaw<
          Array<{
            id: number;
            personId: number;
            status: string;
          }>
        >`
            SELECT id, personId, status
            FROM CreditAccount
            WHERE personId = ${rubberWorker.workerId}
            FOR UPDATE
          `;
        const creditAccount = lockedAccounts[0];
        if (creditAccount && creditAccount.status !== 'ACTIVE') {
          throw new BadRequestException('Credit account tidak aktif');
        }
        // -----------------------------------------------------
        // CALCULATION
        // -----------------------------------------------------
        const pieces = rubberWorker.pieces;
        const weightKg = Number(rubberWorker.weightKg);
        const pricePerKg = Number(rubberWorker.sale.pricePerKg);
        const grossValue = weightKg * pricePerKg;
        const workerShare = grossValue / 2;

        // -----------------------------------------------------
        // CALCULATE OUTSTANDING KASBON
        // -----------------------------------------------------

        let outstandingKasbon = 0;

        if (creditAccount) {
          const creditTransactions = await tx.creditTransaction.findMany({
            where: {
              creditAccountId: creditAccount.id,
            },
          });

          for (const transaction of creditTransactions) {
            if (transaction.type === 'DEBT') {
              outstandingKasbon += Number(transaction.amount);
            }

            if (transaction.type === 'PAYMENT') {
              outstandingKasbon -= Number(transaction.amount);
            }
          }
        }
        outstandingKasbon = Math.max(0, outstandingKasbon);
        // -----------------------------------------------------
        // FINAL SETTLEMENT CALCULATION
        // -----------------------------------------------------
        const deductionAmount = Math.min(workerShare, outstandingKasbon);

        const netAmount = workerShare - deductionAmount;

        const remainingKasbon = outstandingKasbon - deductionAmount;
        // -----------------------------------------------------
        // CREATE SETTLEMENT
        // -----------------------------------------------------
        const settlement = await tx.settlement.create({
          data: {
            saleId: rubberWorker.saleId,
            workerId: rubberWorker.workerId,
            grossShare: workerShare,
            kasbonAmount: outstandingKasbon,
            deductionAmount,
            netAmount,
            status: 'CONFIRMED',
          },
        });
        // -----------------------------------------------------
        // CREATE KASBON PAYMENT
        // -----------------------------------------------------
        if (deductionAmount > 0) {
          if (!creditAccount) {
            throw new BadRequestException(
              'Credit account worker tidak ditemukan',
            );
          }

          await tx.creditTransaction.create({
            data: {
              creditAccountId: creditAccount.id,
              type: 'PAYMENT',
              amount: deductionAmount,
              transactionDate: new Date(),
              description: `Potongan kasbon settlement Sale #${rubberWorker.saleId}`,
              reference: `SETTLEMENT-${settlement.id}`,
            },
          });
        }
        // -----------------------------------------------------
        // CREATE MONEY OUT
        // -----------------------------------------------------
        if (netAmount > 0) {
          await tx.moneyTransaction.create({
            data: {
              type: 'OUT',
              amount: netAmount,
              category: 'RUBBER_WORKER_SETTLEMENT',
              description: `Pembayaran settlement ${rubberWorker.worker.name}`,
              transactionDate: new Date(),
              referenceType: 'SETTLEMENT',
              referenceId: settlement.id,
            },
          });
        }

        return settlement;
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  // =========================================================
  // CONFIRM ALL SETTLEMENTS BY SALE
  // =========================================================

  async confirmSaleSettlements(saleId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        // -----------------------------------------------------
        // GET SALE
        // -----------------------------------------------------

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

        if (sale.pricePerKg === null) {
          throw new BadRequestException('Harga karet belum ditentukan');
        }
        // -----------------------------------------------------
        // GET WORKERS
        // -----------------------------------------------------
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
        // -----------------------------------------------------
        // PREVENT DUPLICATE
        // -----------------------------------------------------
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
        // -----------------------------------------------------
        // LOCK CREDIT ACCOUNTS
        // -----------------------------------------------------
        const lockedAccounts = await tx.$queryRaw<
          Array<{
            id: number;
            personId: number;
            status: string;
          }>
        >`
    SELECT
      ca.id,
      ca.personId,
      ca.status
    FROM CreditAccount ca
    INNER JOIN RubberSaleWorker rsw
      ON rsw.workerId = ca.personId
    WHERE rsw.saleId = ${saleId}
    ORDER BY ca.personId ASC
    FOR UPDATE
  `;

        const creditAccountMap = new Map<
          number,
          {
            id: number;
            personId: number;
            status: string;
          }
        >();

        for (const account of lockedAccounts) {
          creditAccountMap.set(account.personId, account);
        }
        // -----------------------------------------------------
        // PROCESS WORKERS
        // -----------------------------------------------------
        const results = [];
        for (const rubberWorker of workers) {
          if (rubberWorker.sale.pricePerKg === null) {
            throw new BadRequestException('Harga karet belum ditentukan');
          }
          // ---------------------------------------------------
          // BASIC DATA
          // ---------------------------------------------------
          const pieces = rubberWorker.pieces;
          const weightKg = Number(rubberWorker.weightKg);
          const pricePerKg = Number(rubberWorker.sale.pricePerKg);
          // ---------------------------------------------------
          // GROSS
          // ---------------------------------------------------
          const grossValue = weightKg * pricePerKg;
          // ---------------------------------------------------
          // WORKER SHARE 50%
          // ---------------------------------------------------
          const workerShare = grossValue / 2;
          // ---------------------------------------------------
          // CREDIT ACCOUNT
          // ---------------------------------------------------
          const creditAccount = creditAccountMap.get(rubberWorker.workerId);
          // ---------------------------------------------------
          // OUTSTANDING KASBON
          // ---------------------------------------------------
          let outstandingKasbon = 0;

          if (creditAccount) {
            if (creditAccount.status !== 'ACTIVE') {
              throw new BadRequestException(
                `Credit account worker ${rubberWorker.worker.name} tidak aktif`,
              );
            }

            const creditTransactions = await tx.creditTransaction.findMany({
              where: {
                creditAccountId: creditAccount.id,
              },
            });

            for (const transaction of creditTransactions) {
              if (transaction.type === 'DEBT') {
                outstandingKasbon += Number(transaction.amount);
              }

              if (transaction.type === 'PAYMENT') {
                outstandingKasbon -= Number(transaction.amount);
              }
            }

            outstandingKasbon = Math.max(0, outstandingKasbon);
          }
          // ---------------------------------------------------
          // DEDUCTION
          // ---------------------------------------------------
          const deductionAmount = Math.min(workerShare, outstandingKasbon);
          // ---------------------------------------------------
          // NET PAYMENT
          // ---------------------------------------------------
          const netAmount = workerShare - deductionAmount;
          // ---------------------------------------------------
          // REMAINING KASBON
          // ---------------------------------------------------
          const remainingKasbon = outstandingKasbon - deductionAmount;
          // ---------------------------------------------------
          // CREATE SETTLEMENT
          // ---------------------------------------------------

          const settlement = await tx.settlement.create({
            data: {
              saleId,
              workerId: rubberWorker.workerId,
              grossShare: workerShare,
              kasbonAmount: outstandingKasbon,
              deductionAmount,
              netAmount,
              status: 'CONFIRMED',
            },
          });

          // ---------------------------------------------------
          // CREATE KASBON PAYMENT
          // ---------------------------------------------------

          if (deductionAmount > 0) {
            if (!creditAccount) {
              throw new BadRequestException(
                `Credit account worker ${rubberWorker.worker.name} tidak ditemukan`,
              );
            }

            await tx.creditTransaction.create({
              data: {
                creditAccountId: creditAccount.id,
                type: 'PAYMENT',
                amount: deductionAmount,
                transactionDate: new Date(),
                description: `Potongan kasbon settlement Sale #${saleId}`,
                reference: `SETTLEMENT-${settlement.id}`,
              },
            });
          }

          // ---------------------------------------------------
          // MONEY OUT
          // ---------------------------------------------------

          if (netAmount > 0) {
            await tx.moneyTransaction.create({
              data: {
                type: 'OUT',
                category: 'RUBBER_WORKER_SETTLEMENT',
                amount: netAmount,
                transactionDate: new Date(),
                description: `Pembayaran settlement ${rubberWorker.worker.name}`,
                referenceType: 'SETTLEMENT',
                referenceId: settlement.id,
              },
            });
          }

          // ---------------------------------------------------
          // RESULT
          // ---------------------------------------------------

          results.push({
            settlement,
            worker: rubberWorker.worker.name,
            pieces,
            weightKg,
            pricePerKg,
            grossValue,
            workerShare,
            outstandingKasbon,
            deductionAmount,
            netAmount,
            remainingKasbon,
          });
        }

        return results;
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  // =========================================================
  // GET CHECKS BY SETTLEMENT IDS
  // =========================================================

  async getChecks(ids: number[]) {
    if (ids.length === 0) {
      throw new BadRequestException('Minimal satu settlement harus dipilih');
    }

    const settlements = await this.prisma.settlement.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        sale: {
          include: {
            rubberWorkers: true,
          },
        },
        worker: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return settlements.map((settlement) => {
      const rubberWorker = settlement.sale.rubberWorkers.find(
        (worker) => worker.workerId === settlement.workerId,
      );

      if (!rubberWorker) {
        throw new NotFoundException(
          `Data worker untuk settlement #${settlement.id} tidak ditemukan`,
        );
      }

      const pieces = rubberWorker.pieces;

      const weightKg = Number(rubberWorker.weightKg);

      const pricePerKg = Number(settlement.sale.pricePerKg);

      const grossValue = weightKg * pricePerKg;

      return {
        settlementId: settlement.id,

        sale: {
          saleId: settlement.saleId,

          saleDate: settlement.sale.saleDate,
        },

        worker: {
          workerId: settlement.workerId,

          name: settlement.worker.name,
        },

        calculation: {
          pieces,

          weightKg,

          pricePerKg,

          grossValue,

          workerShare: Number(settlement.grossShare),

          kasbon: Number(settlement.kasbonAmount),

          deduction: Number(settlement.deductionAmount),

          netAmount: Number(settlement.netAmount),
        },

        status: settlement.status,

        generatedAt: new Date(),
      };
    });
  }

  // =========================================================
  // GET ALL CHECKS BY SALE
  // =========================================================

  async getChecksBySale(saleId: number) {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        saleId: saleId,
        status: 'CONFIRMED',
      },
      include: {
        sale: {
          include: {
            rubberWorkers: true,
          },
        },
        worker: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return settlements.map((settlement) => {
      const rubberWorker = settlement.sale.rubberWorkers.find(
        (worker) => worker.workerId === settlement.workerId,
      );

      const pieces = rubberWorker?.pieces ?? 0;
      const weightKg = rubberWorker ? Number(rubberWorker.weightKg) : 0;

      const pricePerKg = Number(settlement.sale.pricePerKg ?? 0);

      const grossValue = weightKg * pricePerKg;

      const workerShare = Number(settlement.grossShare);

      const kasbon = Number(settlement.kasbonAmount);

      const deduction = Number(settlement.deductionAmount);

      const netAmount = Number(settlement.netAmount);

      /*
       * Saldo worker setelah penjualan.
       *
       * Positif:
       *   worker masih menerima uang
       *
       * Nol:
       *   worker tidak menerima uang dan tidak punya sisa hutang
       *
       * Negatif:
       *   worker tekor dan sisa hutang dibawa
       *   ke penjualan berikutnya
       */
      const balanceAfterSale = workerShare - kasbon;

      return {
        settlementId: settlement.id,

        sale: {
          saleId: settlement.sale.id,
          saleDate: settlement.sale.saleDate,
        },

        worker: {
          workerId: settlement.worker.id,
          name: settlement.worker.name,
        },

        calculation: {
          pieces,
          weightKg,
          pricePerKg,
          grossValue,
          workerShare,
          kasbon,
          deduction,
          netAmount,
          balanceAfterSale,
        },

        status: settlement.status,
      };
    });
  }
}
