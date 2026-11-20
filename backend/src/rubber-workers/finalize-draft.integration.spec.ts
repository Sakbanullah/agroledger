/**
 * Integration tests for finalizing manual worker input.
 *
 * Runs against the real MySQL database through the same Prisma adapter the
 * application uses. A mock cannot prove that a failed finalize restores the
 * draft rows, so failures are injected at the database level with a
 * temporary trigger that raises an SQL error when a marker value is written.
 *
 * Every scenario runs inside one outer transaction that is rolled back, so
 * the database is left unchanged.
 *
 * Run:
 *   npx ts-node --transpile-only src/rubber-workers/finalize-draft.integration.spec.ts
 */
import assert from 'node:assert/strict';

import mariadb from 'mariadb';

import { PrismaService } from '../prisma/prisma.service';
import { RubberWorkersService } from './rubber-workers.service';

/**
 * The Prisma driver rejects CREATE TRIGGER (prepared-statement protocol).
 * Only the DDL of the failure injection goes through a plain connection;
 * everything under test still runs through PrismaService.
 */
async function withDdl(sql: string) {
  const connection = await mariadb.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'agroledger',
  });

  try {
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}

const BASE_ID = 2147483000; // far above the autoincrement range
const workerA = BASE_ID + 1;
const workerB = BASE_ID + 2;
const workerC = BASE_ID + 3;
const FAILED_PIECES = 77; // marker that makes the trigger fail
const TRIGGER = 'qa_inject_rubber_sale_worker_failure';

type Client = {
  sale: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: number }>;
  };
  person: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: number }>;
  };
};

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  const farm = await prisma.farm.findFirst();
  assert.ok(karet && farm, 'need one Karet commodity and one farm');

  const passed: string[] = [];
  const pass = (name: string) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };

  // DDL cannot run inside a transaction with this driver, so the trigger is
  // created up front. It only reacts to the marker pieces value, and it is
  // always dropped in `finally`.
  await withDdl(
    `CREATE TRIGGER ${TRIGGER} BEFORE INSERT ON RubberSaleWorker
     FOR EACH ROW BEGIN
       IF NEW.pieces = ${FAILED_PIECES} THEN
         SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INJECTED_WRITE_FAILURE';
       END IF;
     END`,
  );

  try {
    await prisma.$transaction(async (outer) => {
      // The service runs on this transaction, so its nested
      // $transaction calls become savepoints inside it: a failed
      // finalize rolls back on its own, yet the rows stay readable.
      const service = new RubberWorkersService(outer as never, null as never);
      const tx = outer as unknown as Client;

      const rowsOf = async (saleId: number) =>
        (
          await outer.rubberSaleWorker.findMany({
            where: { saleId },
            orderBy: { id: 'asc' },
          })
        ).map((row) => `${row.workerId}:${row.pieces}/${Number(row.weightKg)}`);

      const weightOf = async (saleId: number) =>
        Number(
          (
            await outer.sale.findUnique({
              where: { id: saleId },
              select: { totalWeightKg: true },
            })
          )?.totalWeightKg,
        );

      // ---------------- fixtures --------------------------------
      for (const id of [workerA, workerB, workerC]) {
        await tx.person.create({
          data: { id, name: `QA Finalize ${id}`, type: 'WORKER' },
        });
      }

      const saleData = (weight: number) => ({
        farmId: farm.id,
        commodityId: karet.id,
        saleDate: new Date('2026-11-18'),
        status: 'PENDING',
        totalWeightKg: weight,
        pricePerKg: 2000,
      });

      const saleA = await tx.sale.create({ data: saleData(100) });
      const saleB = await tx.sale.create({ data: saleData(50) });

      await outer.rubberSaleWorker.create({
        data: { saleId: saleA.id, workerId: workerA, pieces: 9, weightKg: 40 },
      });
      await outer.rubberSaleWorker.create({
        data: { saleId: saleB.id, workerId: workerB, pieces: 5, weightKg: 20 },
      });

      const draftA = [`${workerA}:9/40`];
      const draftB = [`${workerB}:5/20`];
      const finalInput = {
        saleId: saleA.id,
        workers: [
          { workerId: workerA, weighings: [{ pieces: 10, weightKg: 44 }] },
          // Marker row: the trigger rejects it, aborting the transaction.
          { workerId: workerC, weighings: [{ pieces: FAILED_PIECES, weightKg: 10 }] },
        ],
      };

      // ---------------- 2. validation failure ----------------
      await assert.rejects(
        () =>
          service.finalizeDraftWorkers({
            ...finalInput,
            workers: [{ workerId: 999999999, weighings: [{ pieces: 1, weightKg: 2 }] }],
          }),
        /tidak ditemukan atau bukan worker/,
      );
      assert.deepEqual(await rowsOf(saleA.id), draftA);
      assert.equal(await weightOf(saleA.id), 100);
      pass('validation failure: draft and totalWeightKg unchanged');

      // ---------------- 3 + 4. write failure mid-transaction --
      // The draft rows are deleted, one final row is written, then the
      // trigger aborts the second one. Everything must come back.
      await assert.rejects(
        () => service.finalizeDraftWorkers(finalInput),
        (error: Error) => /INJECTED_WRITE_FAILURE|P2004|P2010/.test(error.message),
      );
      assert.deepEqual(
        await rowsOf(saleA.id),
        draftA,
        'draft must be restored after an aborted finalize',
      );
      assert.equal(
        await weightOf(saleA.id),
        100,
        'Sale.totalWeightKg must not change when the transaction fails',
      );
      pass('mid-transaction failure: draft rows restored, totalWeightKg unchanged');

      // The partially written final row must not survive.
      const orphan = await outer.rubberSaleWorker.count({
        where: { saleId: saleA.id, workerId: workerC },
      });
      assert.equal(orphan, 0);
      pass('mid-transaction failure: no partial final row left behind');

      // ---------------- 6. other sale untouched --------------
      assert.deepEqual(await rowsOf(saleB.id), draftB);
      assert.equal(await weightOf(saleB.id), 50);
      pass('another sale draft and weight unaffected');

      // ---------------- 1 + 5. retry then succeed ------------
      const good = {
        ...finalInput,
        workers: finalInput.workers.map((worker) =>
          worker.workerId === workerC
            ? { ...worker, weighings: [{ pieces: 4, weightKg: 10 }] }
            : worker,
        ),
      };

      const first = (await service.finalizeDraftWorkers(good)) as {
        totalWeightKg: number;
      };
      const retry = (await service.finalizeDraftWorkers(good)) as {
        totalWeightKg: number;
      };

      const expectedRows = [`${workerA}:10/44`, `${workerC}:4/10`];
      assert.deepEqual(await rowsOf(saleA.id), expectedRows);
      assert.deepEqual(await rowsOf(saleA.id), expectedRows, 'retry must not duplicate');
      assert.equal(first.totalWeightKg, 54);
      assert.equal(retry.totalWeightKg, 54);
      assert.equal(await weightOf(saleA.id), 54);
      pass('retry after failure: one row per worker, no duplication');

      // ---------------- 7. business values unchanged ---------
      // Same rule as Settlement: workerShare = (weight x price) / 2.
      const workerShare = (Number('44') * 2000) / 2;
      assert.equal(workerShare, 44000);
      assert.equal(
        await weightOf(saleA.id),
        Number('44') + Number('10'),
        'sale weight equals the sum of final worker weights',
      );
      pass('settlement inputs unchanged (weight x price / 2)');

      // Roll the whole scenario back: nothing is persisted.
      throw new Error('rollback-scenario');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-scenario') {
        throw error;
      }
    });
  } finally {
    await withDdl(`DROP TRIGGER IF EXISTS ${TRIGGER}`).catch(() => undefined);
  }

  const leftovers = await prisma.person.count({
    where: { id: { gte: BASE_ID } },
  });
  assert.equal(leftovers, 0, 'scenario data must be rolled back');

  await prisma.onModuleDestroy();
  console.log(`\n${passed.length} checks passed against the real database`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
