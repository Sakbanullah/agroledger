/**
 * Runtime check: the UNSETTLED assertions and the deciding actor are stored
 * on the audit row, taken from the session, never from the request body.
 */
import { SettlementsService } from '../../src/settlements/settlements.service';

export async function checkReconciliationAudit(): Promise<void> {
  const created: Record<string, unknown>[] = [];

  const prisma = {
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
      updateMany: async () => ({ count: 1 }),
    },
    sale: {
      findUnique: async () => ({ status: 'COMPLETED' }),
    },
    moneyTransaction: {
      count: async () => 0,
      findUnique: async () => null,
    },
    creditTransaction: {
      count: async () => 0,
      findFirst: async () => null,
    },
    settlementReconciliation: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: 1, ...data };
      },
    },
    $queryRaw: async () => [{ id: 50 }],
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const service = new SettlementsService(prisma as never);

  await service.reconcileSettlement(
    50,
    {
      choice: 'REVIEWED_UNSETTLED',
      verifiedNoCashPayment: true,
      verifiedKasbonDeductionNotRecorded: true,
      reason: 'Tidak ada pembayaran tunai; potongan kasbon belum tercatat',
      decidedById: 999,
    } as never,
    { userId: 7 },
  );

  const row = created[0];

  if (!row) {
    throw new Error('no audit row was written');
  }

  if (row.verifiedNoCashPayment !== true) {
    throw new Error('the cash assertion was not persisted');
  }

  if (row.decidedById !== 7) {
    throw new Error('the actor does not come from the authenticated session');
  }

  process.stdout.write('PASS reconciliation audit stores assertions and actor\n');

  // A decision that rests on a ledger row carries no UNSETTLED assertions.
  created.length = 0;

  prisma.moneyTransaction.findUnique = async () => ({
    id: 900,
    type: 'OUT',
    amount: 7000,
    referenceType: 'SETTLEMENT',
    referenceId: 50,
    transactionDate: new Date(),
  }) as never;

  await service.reconcileSettlement(50, {
    choice: 'USE_EXISTING_PAYMENT',
    decision: 'PAID_OUT',
    reviewedMoneyTransactionId: 900,
    verifiedNoCashPayment: true,
    reason: 'Bukti transfer ditemukan dan cocok',
  } as never);

  const ledgerRow = created[0];

  if (
    ledgerRow.verifiedNoCashPayment !== null ||
    ledgerRow.verifiedKasbonDeductionNotRecorded !== null
  ) {
    throw new Error('a ledger-backed decision stored UNSETTLED assertions');
  }

  process.stdout.write('PASS ledger-backed decisions store no assertions\n');
}
