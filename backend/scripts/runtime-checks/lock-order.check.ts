/**
 * Runtime check: the multi-row financial transactions take their locks in the
 * global order (Sale -> Settlement -> CreditAccount).
 *
 * The Prisma client is mocked and every `FOR UPDATE` query is recorded, so a
 * lock site that takes the entities in a different order fails this check.
 * This proves the order of the calls, not database behaviour.
 */
import { lockRank } from '../../src/common/lock-order';
import { SalesService } from '../../src/sales/sales.service';
import { SettlementsService } from '../../src/settlements/settlements.service';

type Recorded = { entity: string; ids: number[] };

function entityOf(sql: string): string {
  if (/FROM `?Sale`?/i.test(sql)) return 'Sale';
  if (/FROM `?Settlement`?/i.test(sql)) return 'Settlement';
  if (/FROM `?CreditAccount`?/i.test(sql)) return 'CreditAccount';
  return 'other';
}

function makePrisma(settlement: Record<string, unknown>) {
  const locks: Recorded[] = [];
  let settlementUpdates = 0;

  const prisma: Record<string, any> = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.isArray(strings) ? strings.join('?') : String(strings);
      const entity = entityOf(sql);

      const ids =
        values.length > 0 && Array.isArray(values[0]) ? (values[0] as number[]) : [];

      locks.push({ entity, ids });

      if (entity === 'CreditAccount') {
        return [{ id: 1, personId: 1, status: 'ACTIVE' }];
      }

      if (entity === 'Sale') {
        return [{ id: settlement.saleId }];
      }

      if (entity === 'Settlement' && (!values.length || Array.isArray(values[0]))) {
        // `WHERE saleId = ?` probes answer with rows; `WHERE id = ?` too.
        return [{ id: settlement.id, saleId: settlement.saleId }];
      }

      return [{ id: settlement.id, saleId: settlement.saleId }];
    },
    sale: {
      delete: async () => ({}),
      findUnique: async () => ({
        id: settlement.saleId,
        status: 'COMPLETED',
        farmId: 1,
        totalWeightKg: 20,
        pricePerKg: 2000,
        saleDate: new Date(),
        settlements: [{ id: settlement.id, status: settlement.status }],
        ownerSettlements: [{ id: 1, settledAmount: 0 }],
        scanDocuments: [],
        cancellation: null,
        farm: { name: 'Kebun' },
        commodity: { name: 'Karet' },
      }),
      update: async () => ({}),
      updateMany: async () => ({ count: 1 }),
    },
    settlement: {
      // The operations narrow the row after they lock it; return the shape
      // the caller asked for so the flow reaches every lock site.
      findUnique: async (args?: { include?: unknown; select?: unknown }) =>
        args?.select ? settlement : { ...settlement, worker: { id: 1, name: 'Ahmad' } },
      findMany: async (args?: { select?: unknown; include?: unknown }) =>
        args?.select ? [settlement] : [{ ...settlement, worker: { id: 1, name: 'Ahmad' } }],
      create: async () => ({}),
      updateMany: async () => {
        settlementUpdates += 1;
        return { count: 1 };
      },
    },
    creditTransaction: {
      // The "already deducted?" probe passes a reference; the history read does
      // not. An empty result for the probe keeps the deduction path open.
      findMany: async (args?: { where?: { reference?: string } }) =>
        args?.where?.reference ? [] : [{ type: 'DEBT', amount: 10000 }],
      create: async () => ({ id: 800 }),
    },
    moneyTransaction: {
      create: async () => ({ id: 900 }),
      findMany: async () => [],
      count: async () => 0,
      updateMany: async () => ({ count: 0 }),
    },
    saleCancellation: { create: async () => ({ id: 5 }) },
    farm: { findUnique: async () => ({ id: 1, name: 'Kebun' }) },
    commodity: { findUnique: async () => ({ id: 1, name: 'Karet' }) },
    ownerSettlement: {
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
    },
    rubberSaleWorker: { deleteMany: async () => ({ count: 0 }) },
    scanDocument: { count: async () => 0 },
    settlementReconciliation: {
      create: async () => ({ id: 1 }),
      findMany: async () => [],
    },
    creditAccount: { findFirst: async () => ({ id: 1 }) },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  return { prisma, locks, updates: () => settlementUpdates };
}

function assertOrdered(locks: Recorded[], label: string) {
  const financial = locks.filter((lock) => lock.entity !== 'other');
  let previous = -1;

  for (const lock of financial) {
    const rank = lockRank(lock.entity as never);

    if (rank < previous) {
      throw new Error(
        `${label}: ${lock.entity} was locked after a later entity (${locks
          .map((entry) => entry.entity)
          .join(' -> ')})`,
      );
    }

    previous = rank;
  }

  if (financial.length < 2) {
    throw new Error(`${label}: expected at least two locks, got ${financial.length}`);
  }
}

export async function checkLockOrder(): Promise<void> {
  const settlement = {
    id: 50,
    saleId: 10,
    workerId: 1,
    grossShare: 11000,
    kasbonAmount: 4000,
    deductionAmount: 4000,
    netAmount: 7000,
    status: 'PENDING',
    reconciliationStatus: null,
    worker: { id: 1, name: 'Ahmad' },
  };

  {
    const { prisma, locks } = makePrisma(settlement);
    await new SettlementsService(prisma as never).paySettlement(50);
    assertOrdered(locks, 'paySettlement');
    process.stdout.write('PASS paySettlement locks Sale -> Settlement -> CreditAccount\n');
  }

  {
    const { prisma, locks } = makePrisma(settlement);
    await new SettlementsService(prisma as never).settleSale(10);
    assertOrdered(locks, 'settleSale');
    process.stdout.write('PASS settleSale locks Sale -> Settlement -> CreditAccount\n');
  }

  {
    const { prisma, locks } = makePrisma(settlement);
    const sales = new SalesService(prisma as never, {} as never);
    await sales.cancelSale(10);
    assertOrdered(locks, 'cancelSale');
    process.stdout.write('PASS cancelSale locks Sale -> Settlement\n');
  }

  {
    const { prisma, locks } = makePrisma(settlement);
    const sales = new SalesService(prisma as never, {} as never);
    // A cancelled sale can be hard-deleted; the lock order must still hold.
    prisma.sale.findUnique = async () => ({
      id: 10,
      status: 'CANCELLED',
      totalWeightKg: 20,
      pricePerKg: 2000,
      saleDate: new Date(),
      settlements: [{ id: settlement.id, status: 'PENDING' }],
      ownerSettlements: [],
      scanDocuments: [],
      cancellation: { id: 5 },
      farm: { name: 'Kebun' },
      commodity: { name: 'Karet' },
    });
    await sales.deleteDraftSale(10);
    assertOrdered(locks, 'deleteDraftSale');
    process.stdout.write('PASS deleteDraftSale locks Sale -> Settlement\n');
  }
}
