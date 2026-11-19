/**
 * Runnable check for PeopleService.remove and kasbon handling.
 *
 * Runs against the real MySQL database inside one transaction that is
 * rolled back, so no data changes. A mock cannot prove that the credit
 * account chain (transactions -> account -> person) is deleted atomically
 * despite the ON DELETE RESTRICT foreign keys.
 *
 * Run:
 *   npx ts-node --transpile-only src/people/people.service.remove.check.ts
 */
import assert from 'node:assert/strict';

import { PrismaService } from '../prisma/prisma.service';
import { PeopleService } from './people.service';

const BASE_ID = 2147483400;

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const farm = await prisma.farm.findFirst();
  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  assert.ok(farm && karet);

  const passed: string[] = [];
  const pass = (name: string) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };

  try {
    await prisma.$transaction(async (outer) => {
      const tx = outer as unknown as typeof prisma;
      // The service runs on the outer client so nested transactions become
      // savepoints that see this scenario's uncommitted fixtures.
      const service = new PeopleService(outer as never);

      const makePerson = (id: number, name: string) =>
        tx.person.create({ data: { id, name, type: 'WORKER' } });

      const makeAccount = async (personId: number) =>
        tx.creditAccount.create({ data: { personId, status: 'ACTIVE' } });

      const accountCount = (personId: number) =>
        tx.creditAccount.count({ where: { personId } });

      // 1. Settled kasbon: DEBT 2.000.000 + PAYMENT 2.000.000.
      const settledId = BASE_ID + 1;
      await makePerson(settledId, 'QA Settled Kasbon');
      const settledAccount = await makeAccount(settledId);
      await tx.creditTransaction.createMany({
        data: [
          {
            creditAccountId: settledAccount.id,
            type: 'DEBT',
            amount: 2000000,
            transactionDate: new Date('2026-11-01'),
          },
          {
            creditAccountId: settledAccount.id,
            type: 'PAYMENT',
            amount: 2000000,
            transactionDate: new Date('2026-11-10'),
          },
        ],
      });

      await service.remove(settledId);
      assert.equal(await tx.person.count({ where: { id: settledId } }), 0);
      assert.equal(await accountCount(settledId), 0);
      assert.equal(
        await tx.creditTransaction.count({
          where: { creditAccountId: settledAccount.id },
        }),
        0,
      );
      pass('settled kasbon: person, account and transactions removed');

      // 2. Active kasbon: DEBT 1.000.000, unpaid.
      const activeId = BASE_ID + 2;
      await makePerson(activeId, 'QA Active Kasbon');
      const activeAccount = await makeAccount(activeId);
      await tx.creditTransaction.create({
        data: {
          creditAccountId: activeAccount.id,
          type: 'DEBT',
          amount: 1000000,
          transactionDate: new Date('2026-11-01'),
        },
      });

      await assert.rejects(
        () => service.remove(activeId),
        /kasbon belum lunas \(Rp1\.000\.000\)/,
      );
      assert.equal(await tx.person.count({ where: { id: activeId } }), 1);
      assert.equal(await accountCount(activeId), 1);
      assert.equal(
        await tx.creditTransaction.count({
          where: { creditAccountId: activeAccount.id },
        }),
        1,
      );
      pass('active kasbon: refused with the amount, nothing removed');

      // 3. Account without any transaction.
      const emptyId = BASE_ID + 3;
      await makePerson(emptyId, 'QA Empty Kasbon');
      await makeAccount(emptyId);
      await service.remove(emptyId);
      assert.equal(await tx.person.count({ where: { id: emptyId } }), 0);
      assert.equal(await accountCount(emptyId), 0);
      pass('empty kasbon account: person and account removed');

      // 4. No credit account at all.
      const plainId = BASE_ID + 4;
      await makePerson(plainId, 'QA Plain Person');
      await service.remove(plainId);
      assert.equal(await tx.person.count({ where: { id: plainId } }), 0);
      pass('person without kasbon: removed as before');

      // 5. Other related data still blocks.
      const ownerId = BASE_ID + 5;
      await makePerson(ownerId, 'QA Farm Owner');
      const ownedFarm = await tx.farm.create({
        data: { name: 'QA Remove Farm', ownershipType: 'OWN' },
      });
      await tx.farmOwner.create({
        data: { farmId: ownedFarm.id, personId: ownerId },
      });
      await assert.rejects(() => service.remove(ownerId), /kebun/);
      assert.equal(await tx.person.count({ where: { id: ownerId } }), 1);

      const workerId = BASE_ID + 6;
      await makePerson(workerId, 'QA Sale Worker');
      const sale = await tx.sale.create({
        data: {
          farmId: farm.id,
          commodityId: karet.id,
          saleDate: new Date('2026-11-19'),
          status: 'PENDING',
          totalWeightKg: 5,
        },
      });
      await tx.rubberSaleWorker.create({
        data: { saleId: sale.id, workerId, pieces: 1, weightKg: 2 },
      });
      await assert.rejects(() => service.remove(workerId), /penjualan karet/);
      assert.equal(await tx.person.count({ where: { id: workerId } }), 1);
      pass('other related data still blocks deletion');

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
    await prisma.person.count({ where: { id: { gte: BASE_ID } } }),
    0,
    'scenario data rolled back',
  );
  assert.equal(
    await prisma.creditAccount.count({ where: { personId: { gte: BASE_ID } } }),
    0,
    'no orphan kasbon account left behind',
  );

  await prisma.onModuleDestroy();
  console.log(`\n${passed.length} checks passed against the real database`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
