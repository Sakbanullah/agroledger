/**
 * Runnable check for SalesService.deleteDraftSale guards.
 *
 * Run: npx tsx src/sales/delete-draft-sale.check.ts  (or node with ts-node)
 *
 * Asserts that a sale holding any accounting record is refused BEFORE the
 * cascade would remove it, and that a clean draft is deleted with only its
 * worker rows.
 */
import assert from 'node:assert/strict';
import { SalesService } from './sales.service';

type SaleFixture = {
  status: string;
  settlements?: unknown[];
  ownerSettlements?: unknown[];
  scanDocuments?: unknown[];
  moneyEntries?: number;
};

function makeService(fixture: SaleFixture) {
  const calls: string[] = [];

  const tx = {
    sale: {
      findUnique: async () => ({
        id: 1,
        status: fixture.status,
        settlements: fixture.settlements ?? [],
        ownerSettlements: fixture.ownerSettlements ?? [],
        scanDocuments: fixture.scanDocuments ?? [],
      }),
      delete: async () => {
        calls.push('sale.delete');
        return { id: 1 };
      },
    },
    rubberSaleWorker: {
      deleteMany: async () => {
        calls.push('rubberSaleWorker.deleteMany');
        return { count: 0 };
      },
    },
    moneyTransaction: {
      count: async () => fixture.moneyEntries ?? 0,
    },
  };

  const prisma = {
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  };

  return { service: new SalesService(prisma as never, {} as never), calls };
}

async function expectRejection(
  label: string,
  fixture: SaleFixture,
  messagePart: string,
) {
  const { service, calls } = makeService(fixture);

  await assert.rejects(
    () => service.deleteDraftSale(1),
    (error: Error & { status?: number }) => {
      assert.match(error.message, new RegExp(messagePart));
      return true;
    },
    label,
  );

  assert.deepEqual(calls, [], `${label}: nothing may be deleted`);
}

async function run() {
  await expectRejection(
    'confirmed sale',
    { status: 'CONFIRMED' },
    'settlement worker',
  );

  await expectRejection(
    'sale with worker settlement',
    { status: 'PENDING', settlements: [{ id: 1 }] },
    'settlement worker',
  );

  await expectRejection(
    'sale with owner settlement',
    { status: 'PENDING', ownerSettlements: [{ id: 1 }] },
    'settlement pemilik',
  );

  await expectRejection(
    'sale with scan document',
    { status: 'PENDING', scanDocuments: [{ id: 1 }] },
    'dokumen scan',
  );

  await expectRejection(
    'sale with money transaction',
    { status: 'PENDING', moneyEntries: 1 },
    'transaksi keuangan',
  );

  // Clean draft: worker rows are removed, then the sale itself.
  const clean = makeService({ status: 'PENDING' });
  await clean.service.deleteDraftSale(1);
  assert.deepEqual(clean.calls, ['rubberSaleWorker.deleteMany', 'sale.delete']);

  console.log('deleteDraftSale checks passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
