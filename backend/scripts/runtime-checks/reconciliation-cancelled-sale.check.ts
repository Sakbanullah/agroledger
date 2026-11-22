/**
 * Runtime check: reconciliation refuses a settlement whose sale was cancelled.
 *
 * A cancelled sale keeps its settlements and their REQUIRED reconciliation
 * flag. Without the guard an admin decision could mark that settlement
 * PAID_OUT or SETTLED_BY_OFFSET, inventing a payout for a sale that no longer
 * exists - paySettlement already refuses the same sale.
 */
import { HttpException } from '@nestjs/common';

import { SettlementsService } from '../../src/settlements/settlements.service';

export async function checkCancelledSaleReconciliation(): Promise<void> {
  const writes: string[] = [];

  const buildPrisma = (saleStatus: string) => {
    const prisma: Record<string, any> = {
      settlement: {
        findUnique: async () => ({
          id: 50,
          saleId: 10,
          workerId: 1,
          grossShare: 10000,
          deductionAmount: 4000,
          netAmount: 6000,
          status: 'PENDING',
          reconciliationStatus: 'REQUIRED',
        }),
        updateMany: async () => {
          writes.push('settlement.updateMany');
          return { count: 1 };
        },
      },
      sale: { findUnique: async () => ({ status: saleStatus }) },
      moneyTransaction: { count: async () => 0, findUnique: async () => null },
      creditTransaction: { count: async () => 0, findFirst: async () => null },
      settlementReconciliation: {
        create: async () => {
          writes.push('settlementReconciliation.create');
          return { id: 1 };
        },
      },
      $queryRaw: async () => [{ id: 50 }],
      $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
    };

    return prisma;
  };

  const dto = {
    choice: 'REVIEWED_UNSETTLED',
    verifiedNoCashPayment: true,
    verifiedKasbonDeductionNotRecorded: true,
    reason: 'Tidak ada pembayaran tunai; potongan kasbon belum tercatat',
  } as never;

  const cancelled = new SettlementsService(buildPrisma('CANCELLED') as never);
  let status: number | null = null;

  try {
    await cancelled.reconcileSettlement(50, dto);
  } catch (err) {
    if (!(err instanceof HttpException)) {
      throw err;
    }

    status = err.getStatus();
  }

  if (status === null) {
    throw new Error('a cancelled sale was reconciled');
  }

  if (status !== 409) {
    throw new Error(`expected 409, got ${status}`);
  }

  if (writes.length !== 0) {
    throw new Error(`refused reconciliation still wrote: ${writes.join(', ')}`);
  }

  process.stdout.write('PASS reconciliation is refused for a cancelled sale\n');

  // The same decision on a live sale still goes through, so the guard is
  // narrow and does not block the workflow it protects.
  const live = new SettlementsService(buildPrisma('COMPLETED') as never);
  await live.reconcileSettlement(50, dto);

  if (!writes.includes('settlementReconciliation.create')) {
    throw new Error('a live sale was not reconciled');
  }

  process.stdout.write('PASS reconciliation still works for a live sale\n');
}
