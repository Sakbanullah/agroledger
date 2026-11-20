/**
 * Runnable check: Sawit sales finish without workers or a check.
 *
 * Runs against the real MySQL database inside one transaction that is
 * rolled back, so no data changes. Fixtures (Sawit commodity, OWN and
 * RELATIVE farms, owner) are created inside that transaction too.
 *
 * Run:
 *   npx ts-node --transpile-only src/sales/sawit-flow.check.ts
 */
import assert from 'node:assert/strict';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SettlementsService } from '../settlements/settlements.service';
import { SalesService } from './sales.service';

const BASE_ID = 2147483500;

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  assert.ok(karet, 'need a Karet commodity');

  const passed: string[] = [];
  const pass = (name: string) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };

  try {
    await prisma.$transaction(async (outer) => {
      const tx = outer as unknown as typeof prisma;
      // Service on the outer client so nested transactions see fixtures.
      const settings = new SettingsService(outer as never);
      const sales = new SalesService(outer as never, settings as never);
      const settlements = new SettlementsService(outer as never);

      // ---------------- fixtures --------------------------------
      const sawit = await tx.commodity.create({
        data: { name: 'Sawit', unit: 'KG' },
      });

      const owner = await tx.person.create({
        data: { id: BASE_ID + 1, name: 'QA Sawit Owner', type: 'RELATIVE_OWNER' },
      });

      const ownFarm = await tx.farm.create({
        data: { name: 'QA Sawit OWN', ownershipType: 'OWN' },
      });

      const relativeFarm = await tx.farm.create({
        data: { name: 'QA Sawit RELATIVE', ownershipType: 'RELATIVE' },
      });
      await tx.farmOwner.create({
        data: { farmId: relativeFarm.id, personId: owner.id },
      });

      const makeSale = (
        farmId: number,
        commodityId: number,
        ownershipType: string,
      ) =>
        tx.sale.create({
          data: {
            farmId,
            commodityId,
            saleDate: new Date('2026-11-19'),
            status: 'PENDING',
            totalWeightKg: 100,
            pricePerKg: 2000,
            ownershipType,
          },
        });

      // ---- Sawit OWN: confirm without workers -> complete ----
      const ownSale = await makeSale(ownFarm.id, sawit.id, 'OWN');
      await sales.confirmSale(ownSale.id, {});
      assert.equal(
        (await tx.sale.findUnique({ where: { id: ownSale.id } }))?.status,
        'CONFIRMED',
      );
      assert.equal(await tx.settlement.count({ where: { saleId: ownSale.id } }), 0);

      await sales.completeSale(ownSale.id);
      assert.equal(
        (await tx.sale.findUnique({ where: { id: ownSale.id } }))?.status,
        'COMPLETED',
      );
      assert.equal(await tx.settlement.count({ where: { saleId: ownSale.id } }), 0);
      pass('Sawit OWN: confirmed and completed without a single worker');

      // ---- Sawit RELATIVE: commission completes the sale ----
      const relSale = await makeSale(relativeFarm.id, sawit.id, 'RELATIVE');
      await sales.confirmSale(relSale.id, {});
      assert.equal(
        (await tx.sale.findUnique({ where: { id: relSale.id } }))?.status,
        'CONFIRMED',
      );

      await sales.setCommission(relSale.id, { commissionRatePerKg: 250 });

      const after = await tx.sale.findUnique({ where: { id: relSale.id } });
      assert.equal(after?.status, 'COMPLETED', 'commission finishes the sale');
      assert.equal(Number(after?.commissionRatePerKg), 250);
      assert.equal(Number(after?.commissionAmount), 25000);
      assert.equal(Number(after?.ownerShareAmount), 200000 - 25000);

      const ownerRows = await tx.ownerSettlement.findMany({
        where: { saleId: relSale.id },
      });
      assert.equal(ownerRows.length, 1);
      assert.equal(Number(ownerRows[0].outstandingAmount), 175000);
      assert.equal(ownerRows[0].status, 'PENDING', 'owner share still payable');

      await assert.rejects(
        () => sales.setCommission(relSale.id, { commissionRatePerKg: 300 }),
      );
      assert.equal(
        Number(
          (await tx.sale.findUnique({ where: { id: relSale.id } }))
            ?.commissionRatePerKg,
        ),
        250,
      );
      pass('Sawit RELATIVE: commission completes sale, owner share kept payable');

      // ---- Check is Karet only ----
      await assert.rejects(
        () => settlements.getChecksBySale(ownSale.id),
        /Check hanya tersedia untuk penjualan Karet/,
      );
      await assert.rejects(
        () => settlements.getChecksBySale(relSale.id),
        /Check hanya tersedia untuk penjualan Karet/,
      );
      pass('check refused for Sawit sales');

      // ---- Karet behaviour unchanged ----
      const karetSale = await makeSale(ownFarm.id, karet.id, 'OWN');
      // Karet still requires workers -- the rule that must NOT change.
      await assert.rejects(
        () => sales.confirmSale(karetSale.id, {}),
        /Sale karet harus memiliki minimal satu worker/,
      );
      pass('Karet unchanged: confirmation still requires workers');

      // ---- Other sales untouched ----
      assert.equal(
        (await tx.sale.findUnique({ where: { id: ownSale.id } }))?.status,
        'COMPLETED',
      );
      pass('other sales untouched');

      throw new Error('rollback-scenario');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-scenario') {
        throw error;
      }
    });
  } finally {
    // Everything ran inside the rolled-back transaction.
  }

  assert.equal(
    await prisma.sale.count({ where: { id: { gte: BASE_ID } } }),
    0,
    'scenario data rolled back',
  );
  assert.equal(
    await prisma.commodity.count({ where: { name: 'Sawit' } }),
    0,
    'fixture commodity rolled back',
  );
  await prisma.onModuleDestroy();
  console.log(`\n${passed.length} checks passed against the real database`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
