import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AuthenticatedActor } from '../auth/authenticated-actor';
import { ConfirmSettlementDto } from './dto/confirm-settlement.dto';
import { ReconcileSettlementDto } from './dto/reconcile-settlement.dto';
import {
  SETTLEMENT_STATUS,
  SETTLEMENT_SETTLED_STATUSES,
  RECONCILIATION_STATUS,
  isSettlementSettled,
  reconciliationDecisionAllowed,
  reconciliationDecisionMessage,
  resolveSettlementMethod,
  salePaymentState,
  type SettlementSettlementMethod,
} from './settlement-status';

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
    const settlements = await this.prisma.settlement.findMany({
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

    // Payment state is computed from the settlement rows (single source of
    // truth), never stored on the sale.
    return {
      saleId,
      completionState: salePaymentState(settlements),
      settlements,
    };
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

        // -----------------------------------------------------
        // CREATE SETTLEMENT
        // -----------------------------------------------------

        // -----------------------------------------------------
        // CREATE SETTLEMENT (calculation only)
        //
        // Nothing is handed over and no kasbon is deducted here: the cash OUT
        // and the CreditTransaction PAYMENT belong to the payment step.
        // -----------------------------------------------------

        const settlement = await tx.settlement.create({
          data: {
            saleId: rubberWorker.saleId,
            workerId: rubberWorker.workerId,
            grossShare: workerShare,
            kasbonAmount: outstandingKasbon,
            deductionAmount,
            netAmount,
            status: SETTLEMENT_STATUS.PENDING,
          },
        });

        return {
          ...settlement,
          worker: rubberWorker.worker.name,
          pieces,
          weightKg,
          pricePerKg,
          grossValue,
          workerShare,
          outstandingKasbon,
          deductionAmount,
          netAmount,
          remainingKasbon: outstandingKasbon - deductionAmount,
        };
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  // =========================================================
  // PAY ONE WORKER'S SETTLEMENT
  //
  // Calculation and payment are two steps. paySettlement is the only place
  // that hands money over:
  //   * net > 0  -> exactly one MoneyTransaction OUT, settlement PAID_OUT;
  //   * net = 0  -> the kasbon offset explains the whole share, so no cash row
  //                 is written and the settlement is SETTLED_BY_OFFSET.
  // Either way the kasbon deduction is recorded now, as a CreditTransaction
  // PAYMENT, never as cash flow.
  //
  // Guards, in this order:
  //   1. the settlement row is locked (base lock); the Sale row lock is only
  //      added for a sale below COMPLETED, where deletion is possible, and is
  //      always taken last so the lock order is Sale -> Settlement;
  //   2. the sale must still be COMPLETED (not CANCELLED);
  //   3. an already-settled settlement returns as-is, so a retry makes no
  //      second payment.
  // =========================================================

  async paySettlement(id: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.settlement.findUnique({
          where: { id },
          select: { saleId: true },
        });

        if (!target) {
          throw new NotFoundException('Settlement tidak ditemukan');
        }

        // Global lock order (src/common/lock-order.ts): Sale, then Settlement,
        // then CreditAccount. The sale is locked first so a concurrent
        // cancellation and this payment cannot interleave their locks.
        await tx.$queryRaw`SELECT id FROM Sale WHERE id = ${target.saleId} FOR UPDATE`;

        const sale = await tx.sale.findUnique({
          where: { id: target.saleId },
        });

        if (!sale) {
          throw new NotFoundException('Sale tidak ditemukan');
        }

        await tx.$queryRaw`SELECT id FROM Settlement WHERE id = ${id} FOR UPDATE`;

        const settlement = await tx.settlement.findUnique({
          where: { id },
          include: { worker: true },
        });

        if (!settlement) {
          throw new NotFoundException('Settlement tidak ditemukan');
        }

        if (isSettlementSettled(settlement.status)) {
          return {
            alreadySettled: true,
            status: settlement.status,
            settlement,
            completionState: await this.completionStateOf(tx, settlement.saleId),
          };
        }

        if (sale.status === 'CANCELLED') {
          throw new BadRequestException(
            'Sale sudah dibatalkan. Settlement tidak dapat dibayar.',
          );
        }

        this.assertNotAwaitingReconciliation(settlement);

        if (settlement.status !== SETTLEMENT_STATUS.PENDING) {
          throw new BadRequestException(
            'Settlement tidak dapat dibayar pada status saat ini',
          );
        }

        const result = await this.settleOne(tx, settlement, sale.farmId);

        return {
          alreadySettled: false,
          status: result.status,
          cashTransactionId: result.cashTransactionId,
          creditTransactionId: result.creditTransactionId,
          settlement: await tx.settlement.findUnique({
            where: { id },
            include: { worker: true },
          }),
          completionState: await this.completionStateOf(tx, settlement.saleId),
        };
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  // =========================================================
  // PAY EVERY PENDING SETTLEMENT OF A SALE
  //
  // Same rules as paySettlement, with the Sale row locked first and the
  // settlement rows locked in id order so concurrent calls cannot interleave
  // their locks.
  // =========================================================

  async settleSale(saleId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const lockedSale = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM Sale WHERE id = ${saleId} FOR UPDATE
        `;

        if (lockedSale.length === 0) {
          throw new NotFoundException('Sale tidak ditemukan');
        }

        const sale = await tx.sale.findUnique({
          where: { id: saleId },
        });

        if (!sale) {
          throw new NotFoundException('Sale tidak ditemukan');
        }

        if (sale.status !== 'COMPLETED') {
          throw new BadRequestException(
            'Sale harus COMPLETED (perhitungan selesai) sebelum pekerja dibayar',
          );
        }

        const settlements = await tx.settlement.findMany({
          where: { saleId },
          orderBy: { id: 'asc' },
        });

        if (settlements.length === 0) {
          throw new NotFoundException('Tidak ada settlement pada sale tersebut');
        }

        await tx.$queryRaw`
          SELECT id FROM Settlement WHERE saleId = ${saleId} ORDER BY id ASC FOR UPDATE
        `;

        // A settlement flagged for reconciliation is never paid by the
        // normal path: the whole sale has to wait for that decision.
        const blocked = settlements.find(
          (row) =>
            row.status === SETTLEMENT_STATUS.PENDING &&
            row.reconciliationStatus === RECONCILIATION_STATUS.REQUIRED,
        );

        if (blocked) {
          throw new BadRequestException(
            `Settlement ${blocked.id} masih menunggu rekonsiliasi. Selesaikan rekonsiliasi sebelum membayar pekerja.`,
          );
        }

        const pending = await tx.settlement.findMany({
          where: { saleId, status: SETTLEMENT_STATUS.PENDING },
          orderBy: { id: 'asc' },
          include: { worker: true },
        });

        const results = [];

        for (const settlement of pending) {
          results.push(await this.settleOne(tx, settlement, sale.farmId));
        }

        return {
          saleId,
          paidCash: results.filter(
            (row) => row.status === SETTLEMENT_STATUS.PAID_OUT,
          ).length,
          settledByOffset: results.filter(
            (row) => row.status === SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
          ).length,
          skipped: settlements.length - pending.length,
          results,
          completionState: salePaymentState(
            await tx.settlement.findMany({
              where: { saleId },
              select: { status: true },
            }),
          ),
        };
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  private async completionStateOf(
    tx: {
      settlement: {
        findMany: (args: {
          where: { saleId: number };
          select: { status: true };
        }) => Promise<{ status: string }[]>;
      };
    },
    saleId: number,
  ) {
    return salePaymentState(
      await tx.settlement.findMany({
        where: { saleId },
        select: { status: true },
      }),
    );
  }

  private assertNotAwaitingReconciliation(settlement: {
    id: number;
    reconciliationStatus: string | null;
  }) {
    if (settlement.reconciliationStatus === RECONCILIATION_STATUS.REQUIRED) {
      throw new BadRequestException(
        `Settlement ${settlement.id} menunggu rekonsiliasi. Pembayaran normal tidak tersedia sampai rekonsiliasi diselesaikan.`,
      );
    }
  }

  // =========================================================
  // RECONCILE A HISTORICAL SETTLEMENT
  //
  // Only for settlements the backfill could not prove (reconciliationStatus
  // REQUIRED). The admin reviews the evidence rows, picks a choice, and the
  // decision is recorded append-only in the same transaction. No
  // MoneyTransaction and no CreditTransaction is written, and no historical
  // row is touched.
  //
  // The actor comes from the authenticated request only; a body-supplied
  // identity is never read. Authentication is not enforced by this API yet, so
  // the actor can be null; that is a reported limitation, not a guarantee.
  // =========================================================

  async reconcileSettlement(
    id: number,
    dto: ReconcileSettlementDto,
    actor?: AuthenticatedActor,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM Settlement WHERE id = ${id} FOR UPDATE
        `;

        if (locked.length === 0) {
          throw new NotFoundException('Settlement tidak ditemukan');
        }

        const settlement = await tx.settlement.findUnique({
          where: { id },
        });

        if (!settlement) {
          throw new NotFoundException('Settlement tidak ditemukan');
        }

        if (settlement.reconciliationStatus !== RECONCILIATION_STATUS.REQUIRED) {
          throw new BadRequestException(
            'Settlement ini tidak menunggu rekonsiliasi',
          );
        }

        if (isSettlementSettled(settlement.status)) {
          throw new BadRequestException(
            'Settlement sudah diselesaikan oleh proses lain',
          );
        }

        if (dto.choice === 'USE_EXISTING_PAYMENT') {
          if (!dto.decision) {
            throw new BadRequestException(
              'Pilih keputusan pembayaran yang ingin ditetapkan',
            );
          }

          if (!reconciliationDecisionAllowed(dto.decision, settlement)) {
            throw new BadRequestException(
              reconciliationDecisionMessage(dto.decision, settlement),
            );
          }
        }

        // Evidence must exist and belong to this settlement; rows of another
        // settlement are refused.
        const money = await this.evidenceMoneyTransaction(tx, settlement, dto);
        const credit = await this.evidenceCreditTransaction(tx, settlement, dto);

        if (dto.choice === 'USE_EXISTING_PAYMENT') {
          if (dto.decision === 'PAID_OUT') {
            if (!money || money.type !== 'OUT') {
              throw new BadRequestException(
                'Bukti transaksi kas yang dipilih bukan pembayaran keluar untuk settlement ini',
              );
            }
          } else if (!credit || credit.type !== 'PAYMENT') {
            throw new BadRequestException(
              'Bukti potongan kasbon yang dipilih bukan pembayaran untuk settlement ini',
            );
          }
        }

        // BD-18: UNSETTLED may only be accepted when the evidence proves the
        // worker never received anything. The seller has to say what they
        // checked (both checks are required); the service then verifies the
        // ledger agrees - the only financial proof that exists.
        if (dto.choice === 'REVIEWED_UNSETTLED') {
          if (!dto.verifiedNoCashPayment || !dto.verifiedKasbonDeductionNotRecorded) {
            throw new BadRequestException(
              'Keputusan UNSETTLED hanya diterima bila keduanya dipastikan: tidak ada pembayaran tunai dan potongan kasbon belum tercatat',
            );
          }

          const unsettled = await this.isUnsettledByEvidence(tx, settlement);

          if (!unsettled.ok) {
            throw new BadRequestException(unsettled.reason);
          }
        }

        const statusBefore = settlement.status;
        let statusAfter = statusBefore;
        let updates: Prisma.SettlementUpdateManyMutationInput | null = null;

        if (dto.choice === 'USE_EXISTING_PAYMENT' && dto.decision === 'PAID_OUT') {
          statusAfter = SETTLEMENT_STATUS.PAID_OUT;
          updates = {
            status: statusAfter,
            settlementMethod: 'CASH',
            settledAt: money?.transactionDate ?? null,
            cashTransactionId: money?.id ?? null,
            creditTransactionId: null,
            reconciliationStatus: RECONCILIATION_STATUS.RESOLVED,
          };
        } else if (
          dto.choice === 'USE_EXISTING_PAYMENT' &&
          dto.decision === 'SETTLED_BY_OFFSET'
        ) {
          statusAfter = SETTLEMENT_STATUS.SETTLED_BY_OFFSET;
          updates = {
            status: statusAfter,
            settlementMethod: 'OFFSET',
            settledAt: credit?.transactionDate ?? null,
            cashTransactionId: null,
            creditTransactionId: credit?.id ?? null,
            reconciliationStatus: RECONCILIATION_STATUS.RESOLVED,
          };
        } else if (dto.choice === 'REVIEWED_UNSETTLED') {
          // BD-18: the settlement is back to "nothing handed over", so it
          // leaves reconciliation and may be paid through the normal endpoint
          // again. Nothing financial is written here; the normal payment step
          // still runs every validation when it is used.
          statusAfter = SETTLEMENT_STATUS.PENDING;
          updates = {
            status: statusAfter,
            reconciliationStatus: RECONCILIATION_STATUS.RESOLVED,
          };
        } else if (dto.choice === 'RESET_CALCULATION') {
          // Explicit reset back to the calculation stage; the payment step
          // then recomputes against the current data. Nothing financial is
          // written. Stays REQUIRED until that recalculation happens.
          statusAfter = SETTLEMENT_STATUS.PENDING;
          updates = { status: statusAfter };
        }

        if (updates) {
          const applied = await tx.settlement.updateMany({
            where: {
              id,
              status: statusBefore,
              reconciliationStatus: RECONCILIATION_STATUS.REQUIRED,
            },
            data: updates,
          });

          if (applied.count !== 1) {
            throw new BadRequestException(
              'Settlement sudah direkonsiliasi oleh proses lain',
            );
          }
        }

        // Append-only audit row, written in the same transaction. Earlier
        // decisions stay untouched; this row keeps its own copy of the figures
        // and the ids of the evidence rows that were examined.
        const audit = await tx.settlementReconciliation.create({
          data: {
            settlementId: id,
            decision: dto.choice,
            grossShare: settlement.grossShare,
            deductionAmount: settlement.deductionAmount,
            netAmount: settlement.netAmount,
            statusBefore,
            statusAfter,
            reviewedMoneyTransactionId: money?.id ?? null,
            reviewedCreditTransactionId: credit?.id ?? null,
            reason: dto.reason.trim(),
            // Only UNSETTLED rests on the admin's assertions; every other
            // decision rests on a ledger row, so the flags stay empty.
            verifiedNoCashPayment:
              dto.choice === 'REVIEWED_UNSETTLED'
                ? Boolean(dto.verifiedNoCashPayment)
                : null,
            verifiedKasbonDeductionNotRecorded:
              dto.choice === 'REVIEWED_UNSETTLED'
                ? Boolean(dto.verifiedKasbonDeductionNotRecorded)
                : null,
            decidedById: actor?.userId ?? null,
          },
        });

        return {
          settlement: await tx.settlement.findUnique({ where: { id } }),
          reconciliation: audit,
        };
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }

  async findReconciliations(settlementId: number) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { id: true },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement tidak ditemukan');
    }

    return this.prisma.settlementReconciliation.findMany({
      where: { settlementId },
      orderBy: { decidedAt: 'desc' },
    });
  }

  async countAwaitingReconciliation() {
    return this.prisma.settlement.count({
      where: { reconciliationStatus: RECONCILIATION_STATUS.REQUIRED },
    });
  }

  /**
   * Ledger proof for an UNSETTLED decision (BD-18): an OUT money row for this
   * settlement or a kasbon PAYMENT for this settlement means something was
   * handed over or deducted, so the worker cannot be declared unpaid.
   */
  private async isUnsettledByEvidence(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    settlement: { id: number },
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const cashRows = await tx.moneyTransaction.count({
      where: {
        referenceType: 'SETTLEMENT',
        referenceId: settlement.id,
        type: 'OUT',
      },
    });

    if (cashRows > 0) {
      return {
        ok: false,
        reason:
          'Ada transaksi pembayaran kas untuk settlement ini. UNSETTLED tidak dapat ditetapkan.',
      };
    }

    const deductions = await tx.creditTransaction.count({
      where: {
        reference: `SETTLEMENT-${settlement.id}`,
        type: 'PAYMENT',
      },
    });

    if (deductions > 0) {
      return {
        ok: false,
        reason:
          'Potongan kasbon untuk settlement ini sudah tercatat. UNSETTLED tidak dapat ditetapkan.',
      };
    }

    return { ok: true };
  }

  private async evidenceMoneyTransaction(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    settlement: { id: number },
    dto: ReconcileSettlementDto,
  ) {
    if (dto.reviewedMoneyTransactionId === undefined) {
      return null;
    }

    const row = await tx.moneyTransaction.findUnique({
      where: { id: dto.reviewedMoneyTransactionId },
    });

    if (
      !row ||
      row.referenceType !== 'SETTLEMENT' ||
      row.referenceId !== settlement.id
    ) {
      throw new BadRequestException(
        'Transaksi kas yang dipilih tidak terkait dengan settlement ini',
      );
    }

    return row;
  }

  private async evidenceCreditTransaction(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    settlement: { id: number },
    dto: ReconcileSettlementDto,
  ) {
    if (dto.reviewedCreditTransactionId === undefined) {
      return null;
    }

    const row = await tx.creditTransaction.findFirst({
      where: { id: dto.reviewedCreditTransactionId },
    });

    if (!row || row.reference !== `SETTLEMENT-${settlement.id}`) {
      throw new BadRequestException(
        'Potongan kasbon yang dipilih tidak terkait dengan settlement ini',
      );
    }

    return row;
  }

  /**
   * Settle exactly one settlement row. Shared by paySettlement and settleSale
   * so both follow the same rules; the caller owns the transaction and has
   * already locked the sale (and, for settleSale, the settlement rows).
   *
   * The stored figures decide what happens before anything is written:
   *   INVALID -> refuse; nothing recorded, no false OUT and no second offset;
   *   OFFSET  -> one CreditTransaction PAYMENT covering the whole share,
   *              no MoneyTransaction, status SETTLED_BY_OFFSET;
   *   CASH    -> one MoneyTransaction OUT for the net plus one CreditTransaction
   *              PAYMENT for the deduction, status PAID_OUT.
   */
  private async settleOne(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    settlement: {
      id: number;
      saleId: number;
      workerId: number;
      grossShare: unknown;
      deductionAmount: unknown;
      netAmount: unknown;
      worker: { name: string };
    },
    farmId: number,
  ) {
    const method = resolveSettlementMethod(settlement);

    const grossShare = Number(settlement.grossShare);
    const deductionAmount = Number(settlement.deductionAmount);
    const netAmount = Number(settlement.netAmount);

    if (method === 'INVALID') {
      throw new BadRequestException(
        `Settlement ${settlement.id} tidak bisa diselesaikan: hak ${grossShare}, potongan kasbon ${deductionAmount}, dan net ${netAmount} tidak konsisten atau tidak menimbulkan hak untuk dibayar. Periksa lalu hitung ulang settlement.`,
      );
    }

    if (grossShare !== netAmount + deductionAmount) {
      throw new BadRequestException(
        `Settlement ${settlement.id} tidak konsisten: hak ${grossShare} bukan net ${netAmount} + potongan ${deductionAmount}.`,
      );
    }

    const now = new Date();

    // -----------------------------------------------------
    // KASBON DEDUCTION (never cash flow)
    // -----------------------------------------------------

    let creditTransactionId: number | null = null;

    if (deductionAmount > 0) {
      const lockedAccounts = await tx.$queryRaw<
        Array<{ id: number; status: string }>
      >`
        SELECT id, status FROM CreditAccount
        WHERE personId = ${settlement.workerId} FOR UPDATE
      `;

      const creditAccount = lockedAccounts[0];

      if (!creditAccount || creditAccount.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Credit account worker ${settlement.worker.name} tidak aktif atau tidak ditemukan`,
        );
      }

      // The deduction is applied once, at settlement. An earlier PAYMENT row
      // for this settlement — for instance written by the old code that
      // deducted at calculation time — means it already happened; applying it
      // again would shrink the worker's debt twice.
      const alreadyApplied = await tx.creditTransaction.findMany({
        where: { reference: `SETTLEMENT-${settlement.id}` },
        take: 1,
      });

      if (alreadyApplied.length > 0) {
        throw new BadRequestException(
          `Potongan kasbon settlement ${settlement.id} sudah pernah dicatat. Periksa lalu rekonsiliasi settlement ini.`,
        );
      }

      const creditTransactions = await tx.creditTransaction.findMany({
        where: { creditAccountId: creditAccount.id },
      });

      const outstanding = Math.max(
        0,
        creditTransactions.reduce(
          (total, item) =>
            item.type === 'DEBT'
              ? total + Number(item.amount)
              : total - Number(item.amount),
          0,
        ),
      );

      if (deductionAmount > outstanding) {
        throw new BadRequestException(
          `Potongan kasbon worker ${settlement.worker.name} (${deductionAmount}) melebihi saldo kasbon (${outstanding})`,
        );
      }

      const payment = await tx.creditTransaction.create({
        data: {
          creditAccountId: creditAccount.id,
          type: 'PAYMENT',
          amount: deductionAmount,
          transactionDate: now,
          description: `Potongan kasbon settlement Sale #${settlement.saleId}`,
          reference: `SETTLEMENT-${settlement.id}`,
        },
      });

      creditTransactionId = payment.id;
    }

    // -----------------------------------------------------
    // CASH HANDED OVER (only a real net amount moves cash; OFFSET and
    // NO_BALANCE write nothing here)
    // -----------------------------------------------------

    let cashTransactionId: number | null = null;

    if (method === 'CASH' && netAmount > 0) {
      const money = await tx.moneyTransaction.create({
        data: {
          type: 'OUT',
          category: 'RUBBER_WORKER_SETTLEMENT',
          amount: netAmount,
          transactionDate: now,
          description: `Pembayaran settlement ${settlement.worker.name}`,
          referenceType: 'SETTLEMENT',
          referenceId: settlement.id,
          farmId,
        },
      });

      cashTransactionId = money.id;
    }

    // -----------------------------------------------------
    // CLAIM THE STATUS
    // -----------------------------------------------------

    const claimed = await tx.settlement.updateMany({
      where: { id: settlement.id, status: SETTLEMENT_STATUS.PENDING },
      data: {
        status: closingStatusFor(method),
        settlementMethod: method,
        settledAt: now,
        cashTransactionId,
        creditTransactionId,
      },
    });

    if (claimed.count !== 1) {
      throw new BadRequestException(
        'Settlement sudah diselesaikan oleh proses lain',
      );
    }

    return {
      settlementId: settlement.id,
      worker: settlement.worker.name,
      grossShare,
      netAmount,
      deductionAmount,
      status: closingStatusFor(method),
      cashTransactionId,
      creditTransactionId,
    };
  }

  // =========================================================
  // CONFIRM ALL SETTLEMENTS BY SALE
  // CONFIRMED → COMPLETED
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

        // -----------------------------------------------------
        // SALE MUST BE CONFIRMED
        // -----------------------------------------------------

        if (sale.status !== 'CONFIRMED') {
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

          // Calculation only: the cash OUT and the CreditTransaction PAYMENT
          // are written by paySettlement once the admin actually pays.

          const settlement = await tx.settlement.create({
            data: {
              saleId,
              workerId: rubberWorker.workerId,
              grossShare: workerShare,
              kasbonAmount: outstandingKasbon,
              deductionAmount,
              netAmount,
              status: SETTLEMENT_STATUS.PENDING,
            },
          });

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

        // =====================================================
        // ALL SETTLEMENTS CREATED
        // CONFIRMED → COMPLETED
        //
        // COMPLETED means the calculation is done. The money is still with the
        // user until each settlement is paid (see paySettlement).
        // =====================================================

        await tx.sale.update({
          where: {
            id: saleId,
          },
          data: {
            status: 'COMPLETED',
          },
        });

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
        reconciliationStatus: settlement.reconciliationStatus,

        generatedAt: new Date(),
      };
    });
  }

  // =========================================================
  // GET ALL CHECKS BY SALE
  // =========================================================

  async getChecksBySale(saleId: number) {
    // -------------------------------------------------------
    // CHECK SALE STATUS FIRST
    // -------------------------------------------------------

    const sale = await this.prisma.sale.findUnique({
      where: {
        id: saleId,
      },
      include: {
        commodity: { select: { name: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale tidak ditemukan');
    }

    if (sale.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Check belum tersedia. Settlement belum selesai.',
      );
    }

    // Only Karet has worker settlements. Sawit finishes without workers,
    // so it has no check to print.
    if (sale.commodity.name !== 'Karet') {
      throw new BadRequestException(
        `Check hanya tersedia untuk penjualan Karet. ${sale.commodity.name} tidak memakai worker.`,
      );
    }

    // -------------------------------------------------------
    // GET THIS SALE'S SETTLEMENTS
    //
    // The check is the record of what each worker is owed, so it must be
    // printable from the moment the calculation exists (PENDING), not only
    // after the cash was handed over.
    // -------------------------------------------------------

    const settlements = await this.prisma.settlement.findMany({
      where: {
        saleId,
        status: { in: [SETTLEMENT_STATUS.PENDING, ...SETTLEMENT_SETTLED_STATUSES] },
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
        settledAt: settlement.settledAt,
        settlementMethod: settlement.settlementMethod,
        reconciliationStatus: settlement.reconciliationStatus,
      };
    });
  }
}

/**
 * Closing status for a settled row: NO_BALANCE (BD-17) is not a payment and
 * must never be presented as one.
 */
function closingStatusFor(method: Exclude<SettlementSettlementMethod, 'INVALID'>) {
  if (method === 'CASH') {
    return SETTLEMENT_STATUS.PAID_OUT;
  }

  return method === 'OFFSET'
    ? SETTLEMENT_STATUS.SETTLED_BY_OFFSET
    : SETTLEMENT_STATUS.NO_BALANCE;
}
