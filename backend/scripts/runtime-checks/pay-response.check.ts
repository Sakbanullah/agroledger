/**
 * Runtime check: the payment step reports a retry as `alreadySettled` without
 * writing a second payout.
 *
 * The check page relies on that flag to tell the operator nothing new was
 * recorded. Guarding it here keeps a future refactor from silently turning a
 * duplicate click into a success that looks like a fresh payment.
 */
import { SettlementsService } from '../../src/settlements/settlements.service';

export async function checkPayResponse(): Promise<void> {
  let cashRows = 0;
  let creditRows = 0;

  const settledRow = (status: string) => ({
    id: 50,
    saleId: 10,
    workerId: 1,
    grossShare: 11000,
    kasbonAmount: 4000,
    deductionAmount: 4000,
    netAmount: 7000,
    status,
    reconciliationStatus: null,
    worker: { id: 1, name: 'Ahmad' },
  });

  const prisma: Record<string, any> = {
    sale: {
      findUnique: async () => ({ id: 10, status: 'COMPLETED', farmId: 3 }),
    },
    settlement: {
      findUnique: async () => settledRow(currentStatus),
      findMany: async () => [{ status: currentStatus }],
      updateMany: async () => {
        currentStatus = 'PAID_OUT';
        return { count: 1 };
      },
    },
    creditTransaction: {
      findMany: async (args?: { where?: { reference?: string } }) =>
        args?.where?.reference ? [] : [{ type: 'DEBT', amount: 4000 }],
      create: async () => {
        creditRows += 1;
        return { id: 800 };
      },
    },
    moneyTransaction: {
      create: async () => {
        cashRows += 1;
        return { id: 900 };
      },
    },
    // Sale row, then the worker's credit account (locked for the deduction).
    $queryRaw: async () => [{ id: 1, personId: 1, status: 'ACTIVE' }],
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  let currentStatus = 'PENDING';
  const service = new SettlementsService(prisma as never);

  const first = await service.paySettlement(50);

  if (first.alreadySettled !== false) {
    throw new Error('the first payment was reported as a retry');
  }

  const second = await service.paySettlement(50);

  if (second.alreadySettled !== true) {
    throw new Error('a retry was not reported as already settled');
  }

  if (cashRows !== 1 || creditRows !== 1) {
    throw new Error(
      `a retry wrote extra rows (cash ${cashRows}, credit ${creditRows})`,
    );
  }

  process.stdout.write('PASS retry reports alreadySettled without new rows\n');
}
