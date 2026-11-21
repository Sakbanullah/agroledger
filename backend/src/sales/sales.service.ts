import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  salePaymentState,
} from '../settlements/settlement-status';
import { isSawitCommodity } from '../reports/reports.calculator';
import { SettingsService } from '../settings/settings.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ConfirmSaleDto } from './dto/confirm-sale.dto';
import { UpdateSalePriceDto } from './dto/update-sale-price.dto';
import { SetCommissionDto } from './dto/set-commission.dto';
import {
  SALE_STATUS,
  cancellationBlocker,
  deletionBlocker,
} from './sale-status';
import { settlementReversalAllowed } from './sale-cancellation-rules';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  // ==========================================
  // GET ALL SALES
  // ==========================================

  async findAll() {
    const sales = await this.prisma.sale.findMany({
      orderBy: {
        saleDate: 'desc',
      },
      include: {
        farm: true,
        commodity: true,
        settlements: { select: { status: true } },
      },
    });

    // Payment state is computed from the settlement rows, never stored on the
    // sale: one source of truth for "has every worker been settled?".
    return sales.map(({ settlements, ...sale }) => ({
      ...sale,
      paymentState: salePaymentState(settlements),
    }));
  }

  // ==========================================
  // GET SINGLE SALE
  // ==========================================

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: {
        id,
      },
      include: {
        farm: true,
        commodity: true,
        rubberWorkers: {
          include: {
            worker: true,
          },
        },
        settlements: {
          include: {
            worker: true,
          },
        },
      },
    });

    if (!sale) {
      return sale;
    }

    return {
      ...sale,
      paymentState: salePaymentState(sale.settlements),
    };
  }

  // ==========================================
  // CREATE SALE
  // ==========================================

  async create(createSaleDto: CreateSaleDto) {
    const farm = await this.prisma.farm.findUnique({
      where: {
        id: createSaleDto.farmId,
      },
    });

    if (!farm) {
      throw new NotFoundException('Farm tidak ditemukan');
    }

    return this.prisma.sale.create({
      data: {
        farmId: createSaleDto.farmId,
        commodityId: createSaleDto.commodityId,
        saleDate: new Date(createSaleDto.saleDate),

        ...(createSaleDto.pricePerKg !== undefined && {
          pricePerKg: createSaleDto.pricePerKg,
        }),

        ...(createSaleDto.totalWeightKg !== undefined && {
          totalWeightKg: createSaleDto.totalWeightKg,
        }),

        ...(createSaleDto.buyerName !== undefined && {
          buyerName: createSaleDto.buyerName,
        }),

        status: createSaleDto.status ?? 'PENDING',

        ...(createSaleDto.notes !== undefined && {
          notes: createSaleDto.notes,
        }),

        // Snapshot Farm.ownershipType at creation time.
        // Historical integrity: changes to Farm.ownershipType
        // do not retroactively affect existing sales.
        ownershipType: farm.ownershipType,
      },

      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  // ==========================================
  // UPDATE SALE PRICE
  // ==========================================

  async updatePrice(id: number, updateSalePriceDto: UpdateSalePriceDto) {
    const sale = await this.prisma.sale.findUnique({
      where: {
        id,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale tidak ditemukan');
    }

    if (sale.status !== 'PENDING') {
      throw new BadRequestException(
        'Harga hanya dapat diubah untuk Sale yang masih PENDING',
      );
    }

    return this.prisma.sale.update({
      where: {
        id,
      },
      data: {
        pricePerKg: updateSalePriceDto.pricePerKg,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  // ==========================================
  // CONFIRM SALE
  // PENDING → CONFIRMED
  // ==========================================

  async confirmSale(id: number, confirmSaleDto: ConfirmSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          commodity: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // ONLY PENDING CAN BE CONFIRMED
      // ==========================================

      if (sale.status !== 'PENDING') {
        throw new BadRequestException('Sale sudah dikonfirmasi');
      }

      // ==========================================
      // VALIDATE PRICE
      // ==========================================

      if (sale.pricePerKg === null) {
        throw new BadRequestException('Harga penjualan belum tersedia');
      }

      // ==========================================
      // VALIDATE WEIGHT
      // ==========================================

      if (Number(sale.totalWeightKg) <= 0) {
        throw new BadRequestException('Berat penjualan harus lebih dari 0');
      }

      // ==========================================
      // VALIDATE RUBBER WORKERS
      // ==========================================

      if (sale.commodity.name === 'Karet') {
        const rubberWorkers = await tx.rubberSaleWorker.findMany({
          where: {
            saleId: id,
          },
        });

        if (rubberWorkers.length === 0) {
          throw new BadRequestException(
            'Sale karet harus memiliki minimal satu worker',
          );
        }

        const totalWorkerWeight = rubberWorkers.reduce(
          (total, worker) => total + Number(worker.weightKg),
          0,
        );

        if (totalWorkerWeight !== Number(sale.totalWeightKg)) {
          throw new BadRequestException(
            `Total berat worker (${totalWorkerWeight} kg) tidak sama dengan total berat sale (${Number(
              sale.totalWeightKg,
            )} kg)`,
          );
        }
      }

      // ==========================================
      // CALCULATE TOTAL
      // ==========================================

      const totalAmount = Number(sale.totalWeightKg) * Number(sale.pricePerKg);

      // ==========================================
      // UPDATE SALE STATUS
      // PENDING → CONFIRMED
      // ==========================================

      const updateResult = await tx.sale.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'CONFIRMED',

          ...(confirmSaleDto.buyerName !== undefined && {
            buyerName: confirmSaleDto.buyerName,
          }),
        },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException(
          'Sale sudah dikonfirmasi oleh proses lain',
        );
      }

      // ==========================================
      // CREATE MONEY IN
      // ==========================================
      //
      // Uang hasil penjualan masuk pada saat
      // penjualan dikonfirmasi.
      //
      // Ini TIDAK berarti sale sudah COMPLETED.
      // COMPLETED baru diberikan setelah settlement
      // seluruh worker selesai.
      //
      // Phase 2A: Single cash-in transaction (gross sale).
      // Commission is NOT recorded as a second cash-in.
      // Commission and OwnerSettlement are determined AFTER
      // buyer pays and rate is agreed with owner.
      // ==========================================

      await tx.moneyTransaction.create({
        data: {
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: totalAmount,
          transactionDate: new Date(),
          description: `Penerimaan penjualan ${sale.commodity.name}`,
          referenceType: 'SALE',
          referenceId: sale.id,
          farmId: sale.farmId,
        },
      });

      // ==========================================
      // RETURN UPDATED SALE
      // ==========================================

      return tx.sale.findUnique({
        where: {
          id: sale.id,
        },
        include: {
          farm: true,
          commodity: true,
        },
      });
    });
  }

  // ==========================================
  // DELETE DRAFT SALE
  // ==========================================

  async deleteDraftSale(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // ==========================================
      // GET SALE
      // ==========================================

      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          settlements: { select: { id: true, status: true } },
          ownerSettlements: { select: { id: true } },
          scanDocuments: { select: { id: true } },
          cancellation: { select: { id: true } },
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // STATUS AND DEPENDENCY RULE
      //
      // PENDING drafts and CANCELLED sales may be deleted; a COMPLETED
      // sale must be cancelled first. Deleting cascades settlements and
      // scan documents, so those must already be neutralized.
      // ==========================================

      if (sale.scanDocuments.length > 0) {
        throw new ConflictException(
          'Penjualan tidak dapat dihapus karena sudah memiliki dokumen scan',
        );
      }

      const moneyEntries = await tx.moneyTransaction.count({
        where: {
          referenceType: 'SALE',
          referenceId: id,
        },
      });

      // Reconciliation history is audit data: find out whether any of this
      // sale's settlements were reconciled before allowing a hard delete.
      const settlementIds = sale.settlements.map((row) => row.id);

      const reconciled = settlementIds.length
        ? await tx.settlementReconciliation.findMany({
            where: { settlementId: { in: settlementIds } },
            select: { settlementId: true },
            distinct: ['settlementId'],
          })
        : [];

      const blocker = deletionBlocker({
        status: sale.status,
        settlements: sale.settlements,
        ownerSettlements: sale.ownerSettlements,
        moneyEntries,
        settlementIds,
        reconciledSettlementIds: reconciled.map((row) => row.settlementId),
      });

      if (blocker) {
        throw new ConflictException(blocker);
      }

      // ==========================================
      // CANCELLED: KEEP THE FINANCIAL AUDIT TRAIL
      //
      // - settlements are neutralized and marked (amounts zeroed), so the
      //   reports that read Settlement rows stay correct once the cascade
      //   removes them;
      // - money rows are repointed to the cancellation record, so they
      //   survive the delete and no sale id is left dangling.
      // ==========================================

      if (sale.status === SALE_STATUS.CANCELLED) {
        const cancellationRecordId = sale.cancellation?.id ?? null;

        if (sale.settlements.length > 0) {
          await tx.settlement.updateMany({
            where: { saleId: id },
            data: {
              status: 'CANCELLED',
              grossShare: 0,
              kasbonAmount: 0,
              deductionAmount: 0,
              netAmount: 0,
            },
          });

          await tx.moneyTransaction.updateMany({
            where: {
              referenceType: 'SETTLEMENT',
              referenceId: { in: sale.settlements.map((row) => row.id) },
            },
            data: {
              referenceType: 'SALE_CANCELLATION',
              referenceId: cancellationRecordId,
            },
          });
        }

        await tx.moneyTransaction.updateMany({
          where: { referenceType: 'SALE', referenceId: id },
          data: {
            referenceType: 'SALE_CANCELLATION',
            referenceId: cancellationRecordId,
          },
        });

        // Owner share rows cascade with the sale. Mark and zero them first
        // so report sums that read OwnerSettlement stay correct, and keep
        // the owner's payments attached to the cancellation record.
        await tx.ownerSettlement.updateMany({
          where: { saleId: id },
          data: {
            status: 'CANCELLED',
            settledAmount: 0,
            outstandingAmount: 0,
          },
        });

        await tx.moneyTransaction.updateMany({
          where: {
            referenceType: 'OWNER_SETTLEMENT',
            referenceId: {
              in: sale.ownerSettlements.map((row) => row.id),
            },
          },
          data: {
            referenceType: 'SALE_CANCELLATION',
            referenceId: cancellationRecordId,
          },
        });
      }

      // ==========================================
      // DELETE RUBBER SALE WORKERS
      // (draft input only, not a financial record)
      // ==========================================

      await tx.rubberSaleWorker.deleteMany({
        where: {
          saleId: id,
        },
      });

      // ==========================================
      // DELETE SALE
      // ==========================================

      await tx.sale.delete({
        where: {
          id,
        },
      });

      // ==========================================
      // RESULT
      // ==========================================

      return {
        message: 'Penjualan berhasil dihapus',
        saleId: id,
      };
    });
  }

  // ==========================================
  // CANCEL SALE (Selesai -> Dibatalkan)
  //
  // Reverses the sale's cash effect with new, opposite money rows
  // instead of editing or deleting history:
  //   - buyer income (HARVEST_SALE IN)      -> SALE_CANCELLATION OUT
  //   - worker settlement cash (OUT)        -> SALE_CANCELLATION IN
  //   - kasbon payments made for this sale  -> DEBT rows
  // A SaleCancellation record keeps the sale identity for audit.
  // ==========================================

  async cancelSale(id: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id },
          include: {
            farm: { select: { name: true } },
            commodity: { select: { name: true } },
            settlements: { select: { id: true, status: true } },
            ownerSettlements: { select: { id: true, settledAmount: true } },
          },
        });

        if (!sale) {
          throw new NotFoundException('Sale tidak ditemukan');
        }

        const blocker = cancellationBlocker({
          status: sale.status,
          settlements: sale.settlements,
          ownerSettlements: sale.ownerSettlements,
        });

        if (blocker) {
          throw new ConflictException(blocker);
        }

        // Global lock order (src/common/lock-order.ts): Sale, then Settlement.
        // The blocker above read the settlements without a lock, so the sale is
        // locked first and the settlements second; a payment locks in the same
        // order, so either this blocker sees the settlement already settled, or
        // the payment sees the sale already CANCELLED.
        await tx.$queryRaw`SELECT id FROM Sale WHERE id = ${id} FOR UPDATE`;

        const settlementIds = sale.settlements.map((row) => row.id);

        if (settlementIds.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM Settlement
            WHERE id IN (${Prisma.join(settlementIds)})
            ORDER BY id ASC FOR UPDATE
          `;
        }

        // Claim the transition atomically: a repeated or concurrent
        // cancellation matches zero rows and writes no second reversal.
        const claimed = await tx.sale.updateMany({
          where: { id, status: SALE_STATUS.COMPLETED },
          data: { status: SALE_STATUS.CANCELLED },
        });

        if (claimed.count !== 1) {
          throw new ConflictException(
            'Transaksi ini sudah dibatalkan sebelumnya',
          );
        }

        // Audit record: keeps the sale identity and money together even
        // after the sale itself is deleted.
        const cancellation = await tx.saleCancellation.create({
          data: {
            saleId: id,
            commodity: sale.commodity.name,
            farmName: sale.farm.name,
            saleDate: sale.saleDate,
            totalWeightKg: sale.totalWeightKg,
            pricePerKg: sale.pricePerKg,
            status: 'CANCELLED',
          },
        });

        const now = new Date();
        const reversalRows: {
          type: string;
          category: string;
          amount: number;
          transactionDate: Date;
          description: string;
          referenceType: string;
          referenceId: number;
          farmId: number | null;
        }[] = [];

        const queueReversal = (entry: {
          type: string;
          amount: unknown;
          description: string | null;
          category: string;
          farmId: number | null;
        }) => {
          const amount = Number(entry.amount);

          if (amount <= 0) {
            return;
          }

          reversalRows.push({
            type: entry.type === 'IN' ? 'OUT' : 'IN',
            category: 'SALE_CANCELLATION',
            amount,
            transactionDate: now,
            description: `Pembatalan penjualan Sale #${id} [${entry.category}]: ${entry.description ?? entry.category}`,
            referenceType: 'SALE_CANCELLATION',
            referenceId: cancellation.id,
            farmId: entry.farmId,
          });
        };

        // 1. Buyer income recorded for this sale.
        const saleMoney = await tx.moneyTransaction.findMany({
          where: { referenceType: 'SALE', referenceId: id },
        });

        saleMoney.forEach(queueReversal);

        // 2. Cash paid to rubber workers for this sale.
        //
        // Only settle-state settlements can have handed cash over. A PENDING or
        // NO_BALANCE settlement never moved money, so writing its "reversal"
        // would invent a cash-in that never happened; the row has nothing to
        // reverse and is skipped here.
        const settledSettlementIds = sale.settlements
          .filter((row) => settlementReversalAllowed(row.status))
          .map((row) => row.id);

        const settlementMoney = settledSettlementIds.length
          ? await tx.moneyTransaction.findMany({
              where: {
                category: 'RUBBER_WORKER_SETTLEMENT',
                referenceType: 'SETTLEMENT',
                referenceId: { in: settledSettlementIds },
              },
            })
          : [];

        settlementMoney.forEach(queueReversal);

        // 3. Kasbon deducted during this sale's settlement must return to
        // the worker's credit account, otherwise the debt disappears.
        for (const settlement of sale.settlements) {
          const payments = await tx.creditTransaction.findMany({
            where: { reference: `SETTLEMENT-${settlement.id}` },
          });

          for (const payment of payments) {
            const amount = Number(payment.amount);

            if (amount <= 0) {
              continue;
            }

            await tx.creditTransaction.create({
              data: {
                creditAccountId: payment.creditAccountId,
                type: 'DEBT',
                amount,
                transactionDate: now,
                description: `Pembatalan potongan kasbon Sale #${id}`,
                reference: `CANCELLATION-${settlement.id}`,
              },
            });
          }
        }

        if (reversalRows.length > 0) {
          await tx.moneyTransaction.createMany({ data: reversalRows });
        }

        return {
          message: 'Transaksi berhasil dibatalkan',
          saleId: id,
          cancellationId: cancellation.id,
          reversedTransactions: reversalRows.length,
          sale: await tx.sale.findUnique({
            where: { id },
            include: { farm: true, commodity: true },
          }),
        };
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  // ==========================================
  // SET COMMISSION
  // Phase 2B: Determine commission after CONFIRMED
  // Only for RELATIVE + Sawit
  // ==========================================

  async setCommission(id: number, setCommissionDto: SetCommissionDto) {
    return this.prisma.$transaction(async (tx) => {
      // ==========================================
      // GET SALE WITH FARM AND COMMODITY
      // ==========================================

      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          farm: {
            include: {
              owners: {
                include: {
                  person: true,
                },
              },
            },
          },
          commodity: true,
          ownerSettlements: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // VALIDATE STATUS
      // ==========================================

      if (sale.status !== 'CONFIRMED') {
        throw new BadRequestException(
          'Commission hanya dapat ditentukan untuk Sale yang sudah CONFIRMED',
        );
      }

      // ==========================================
      // VALIDATE COMMODITY
      // ==========================================

      if (!isSawitCommodity(sale.commodity.name)) {
        throw new BadRequestException(
          'Commission hanya berlaku untuk Sawit, bukan Karet',
        );
      }

      // ==========================================
      // VALIDATE COMMISSION NOT ALREADY SET
      // ==========================================

      if (sale.commissionRatePerKg !== null) {
        throw new BadRequestException(
          'Commission sudah ditentukan untuk Sale ini. Tidak dapat diubah.',
        );
      }

      if (sale.ownershipType !== 'RELATIVE') {
        throw new BadRequestException(
          'Commission hanya berlaku untuk Farm RELATIVE, bukan OWN',
        );
      }

      // ==========================================
      // VALIDATE WEIGHT
      // ==========================================

      if (!sale.totalWeightKg || Number(sale.totalWeightKg) <= 0) {
        throw new BadRequestException('Berat penjualan tidak valid');
      }

      // ==========================================
      // VALIDATE PRICE
      // ==========================================

      if (!sale.pricePerKg || Number(sale.pricePerKg) <= 0) {
        throw new BadRequestException('Harga penjualan tidak valid');
      }

      // ==========================================
      // CALCULATE GROSS SALE
      // ==========================================

      const grossSale = Number(sale.totalWeightKg) * Number(sale.pricePerKg);

      // ==========================================
      // DETERMINE COMMISSION RATE
      // Priority: per-sale override > Settings default > Rp200 fallback
      // ==========================================

      const defaultRate = await this.settingsService.getDefaultCommission();
      const appliedRate = setCommissionDto.commissionRatePerKg ?? defaultRate;

      // ==========================================
      // CALCULATE COMMISSION
      // ==========================================

      const commissionAmount = Number(sale.totalWeightKg) * appliedRate;

      // ==========================================
      // VALIDATE COMMISSION <= GROSS SALE
      // ==========================================

      if (commissionAmount > grossSale) {
        throw new BadRequestException(
          `Commission (${commissionAmount}) tidak boleh melebihi gross sale (${grossSale})`,
        );
      }

      // ==========================================
      // CALCULATE OWNER SHARE
      // ==========================================

      const ownerShareAmount = grossSale - commissionAmount;

      // ==========================================
      // FIND SINGLE OWNER FOR RELATIVE FARM
      // ==========================================

      const farmOwners = sale.farm.owners;

      if (!farmOwners || farmOwners.length === 0) {
        throw new BadRequestException(
          'Farm RELATIVE harus memiliki minimal satu owner',
        );
      }

      if (farmOwners.length > 1) {
        throw new BadRequestException(
          'Untuk sementara, Farm RELATIVE hanya boleh memiliki satu owner. Multi-owner belum didukung.',
        );
      }

      const owner = farmOwners[0].person;

      // ==========================================
      // CHECK FOR EXISTING OWNER SETTLEMENT
      // ==========================================

      const existingSettlement = sale.ownerSettlements.find(
        (s) => s.ownerId === owner.id,
      );

      if (existingSettlement) {
        throw new BadRequestException(
          'OwnerSettlement sudah ada untuk Sale ini. Tidak dapat membuat duplikat.',
        );
      }

      // ==========================================
      // UPDATE SALE WITH COMMISSION
      // Sawit has no worker settlement step, so agreeing the
      // commission is the last step of the sale: CONFIRMED -> COMPLETED.
      // The owner share stays payable and is tracked separately.
      // ==========================================

      const completed = await tx.sale.updateMany({
        where: {
          id,
          status: 'CONFIRMED',
        },
        data: {
          commissionRatePerKg: appliedRate,
          commissionAmount: commissionAmount,
          ownerShareAmount: ownerShareAmount,
          status: 'COMPLETED',
        },
      });

      if (completed.count !== 1) {
        throw new BadRequestException(
          'Sale sudah diselesaikan oleh proses lain',
        );
      }

      // ==========================================
      // CREATE OWNER SETTLEMENT
      // ==========================================

      await tx.ownerSettlement.create({
        data: {
          saleId: id,
          ownerId: owner.id,
          ownerShareAmount: ownerShareAmount,
          settledAmount: 0,
          outstandingAmount: ownerShareAmount,
          status: 'PENDING',
        },
      });

      // ==========================================
      // RETURN UPDATED SALE
      // ==========================================

      return tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          farm: true,
          commodity: true,
          ownerSettlements: {
            include: {
              owner: true,
            },
          },
        },
      });
    });
  }

  // ==========================================
  // COMPLETE SALE
  // CONFIRMED → COMPLETED
  // ==========================================
  //
  // Karet: diselesaikan melalui workflow settlement
  // worker yang sudah ada (SettlementsService), bukan di sini.
  //
  // Sawit OWN: CONFIRMED → COMPLETED.
  //
  // Sawit RELATIVE: hanya boleh COMPLETED jika commission
  // sudah ditentukan DAN OwnerSettlement sudah lunas
  // (status COMPLETED / outstanding = 0).
  // ==========================================

  async completeSale(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          commodity: true,
          ownerSettlements: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // ONLY CONFIRMED CAN BE COMPLETED
      // ==========================================

      if (sale.status !== 'CONFIRMED') {
        throw new BadRequestException(
          'Hanya Sale yang sudah CONFIRMED dapat diselesaikan',
        );
      }

      // ==========================================
      // KARET USES EXISTING WORKER SETTLEMENT FLOW
      // ==========================================

      if (sale.commodity.name === 'Karet') {
        throw new BadRequestException(
          'Sale Karet diselesaikan melalui workflow settlement worker',
        );
      }

      // ==========================================
      // SAWIT RELATIVE REQUIRES COMMISSION + SETTLED OWNER SHARE
      // ==========================================

      if (sale.ownershipType === 'RELATIVE') {
        if (sale.commissionRatePerKg === null) {
          throw new BadRequestException(
            'Commission belum ditentukan untuk Sale RELATIVE',
          );
        }

        if (sale.ownerSettlements.length === 0) {
          throw new BadRequestException(
            'OwnerSettlement belum dibuat untuk Sale RELATIVE',
          );
        }

        const ownerSettlement = sale.ownerSettlements[0];

        const outstanding = Number(ownerSettlement.outstandingAmount);

        const isSettled =
          ownerSettlement.status === 'COMPLETED' || outstanding <= 0;

        if (!isSettled) {
          throw new BadRequestException(
            'OwnerSettlement belum lunas. Sale belum dapat diselesaikan.',
          );
        }
      }

      // ==========================================
      // UPDATE SALE STATUS
      // CONFIRMED → COMPLETED
      // ==========================================

      const updateResult = await tx.sale.updateMany({
        where: {
          id,
          status: 'CONFIRMED',
        },
        data: {
          status: 'COMPLETED',
        },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException(
          'Sale sudah diselesaikan oleh proses lain',
        );
      }

      // ==========================================
      // RETURN UPDATED SALE
      // ==========================================

      return tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          farm: true,
          commodity: true,
          ownerSettlements: {
            include: {
              owner: true,
            },
          },
        },
      });
    });
  }
}
