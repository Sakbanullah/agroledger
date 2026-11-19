/**
 * Negative / mutation checks for the cancellation and deletion rules.
 *
 * Proves the protections live in the backend: bypassing the buttons and
 * calling the service directly still gets refused, and the database is
 * unchanged. Also proves a double reversal is impossible by construction
 * (the status claim is a conditional update).
 *
 * Run:
 *   npx ts-node --transpile-only src/sales/sale-cancellation.mutation.check.ts
 */
import assert from 'node:assert/strict';

import { PrismaService } from '../prisma/prisma.service';
import { deletionBlocker, cancellationBlocker } from './sale-status';
import { SalesService } from './sales.service';

const BASE_ID = 2147483300;

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const farm = await prisma.farm.findFirst();
  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  assert.ok(farm && karet);

  try {
    await prisma.$transaction(async (outer) => {
      const tx = outer as unknown as typeof prisma;
      const service = new SalesService(outer as never, null as never);

      const sale = await tx.sale.create({
        data: {
          farmId: farm.id,
          commodityId: karet.id,
          saleDate: new Date('2026-11-18'),
          status: 'COMPLETED',
          totalWeightKg: 10,
          pricePerKg: 2000,
        },
      });
      await tx.moneyTransaction.create({
        data: {
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: 20000,
          transactionDate: new Date(),
          referenceType: 'SALE',
          referenceId: sale.id,
          farmId: farm.id,
        },
      });

      // Direct calls, as a user bypassing the UI would.
      await assert.rejects(
        () => service.deleteDraftSale(sale.id),
        /dibatalkan terlebih dahulu/,
      );
      assert.equal(await tx.sale.count({ where: { id: sale.id } }), 1);
      assert.equal(
        await tx.moneyTransaction.count({ where: { referenceId: sale.id } }),
        1,
      );
      console.log('PASS backend refuses deleting a COMPLETED sale');

      await service.cancelSale(sale.id);

      // A second cancellation cannot double the reversal.
      await assert.rejects(
        () => service.cancelSale(sale.id),
        /sudah dibatalkan sebelumnya/,
      );
      assert.equal(
        await tx.moneyTransaction.count({ where: { category: 'SALE_CANCELLATION' } }),
        1,
      );
      console.log('PASS backend refuses a second cancellation');

      // Pure rule checks: independent of the database.
      assert.equal(
        cancellationBlocker({ status: 'CANCELLED', ownerSettlements: [] }),
        'Transaksi ini sudah dibatalkan sebelumnya',
      );
      assert.equal(
        cancellationBlocker({ status: 'PENDING', ownerSettlements: [] }),
        'Hanya penjualan berstatus Selesai yang dapat dibatalkan',
      );
      assert.equal(
        deletionBlocker({
          status: 'COMPLETED',
          settlements: [],
          ownerSettlements: [],
          moneyEntries: 1,
        }),
        'Penjualan berstatus Selesai harus dibatalkan terlebih dahulu sebelum dihapus',
      );
      assert.equal(
        deletionBlocker({
          status: 'CANCELLED',
          settlements: [{ id: 1 }],
          ownerSettlements: [],
          moneyEntries: 3,
        }),
        null,
        'a cancelled sale may be deleted even with settlements present',
      );
      console.log('PASS status rules hold without a database');

      throw new Error('rollback-scenario');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-scenario') {
        throw error;
      }
    });
  } finally {
    // Everything was rolled back.
  }

  assert.equal(await prisma.sale.count({ where: { id: { gte: BASE_ID } } }), 0);
  await prisma.onModuleDestroy();
  console.log('\nall mutation checks passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
