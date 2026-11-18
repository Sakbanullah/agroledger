/**
 * Mutation check: proves finalize-draft.integration.spec.ts can actually
 * detect a lost draft.
 *
 * It replays the pre-fix flow (draft cancelled in its own step, final write
 * afterwards) against the same database-level failure injection, and asserts
 * that the draft is GONE. If this check ever finds the draft intact, the
 * integration spec would pass even for a non-atomic implementation.
 *
 * Run:
 *   npx ts-node --transpile-only src/rubber-workers/finalize-draft.mutation.check.ts
 */
import assert from 'node:assert/strict';

import mariadb from 'mariadb';

import { PrismaService } from '../prisma/prisma.service';

const BASE_ID = 2147483100;
const worker = BASE_ID + 1;
const FAILED_PIECES = 77;
const TRIGGER = 'qa_mutation_rubber_sale_worker_failure';

async function ddl(sql: string) {
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

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  const farm = await prisma.farm.findFirst();
  assert.ok(karet && farm);

  await ddl(
    `CREATE TRIGGER ${TRIGGER} BEFORE INSERT ON RubberSaleWorker
     FOR EACH ROW BEGIN
       IF NEW.pieces = ${FAILED_PIECES} THEN
         SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INJECTED_WRITE_FAILURE';
       END IF;
     END`,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.person.create({
        data: { id: worker, name: `QA Mutation ${worker}`, type: 'WORKER' },
      });
      const sale = await tx.sale.create({
        data: {
          farmId: farm.id,
          commodityId: karet.id,
          saleDate: new Date('2026-11-18'),
          status: 'PENDING',
          totalWeightKg: 100,
          pricePerKg: 2000,
        },
      });
      await tx.rubberSaleWorker.create({
        data: { saleId: sale.id, workerId: worker, pieces: 9, weightKg: 40 },
      });

      // --- pre-fix flow: draft cancelled on its own, then final write ---
      await tx.rubberSaleWorker.deleteMany({ where: { saleId: sale.id } });

      await assert.rejects(() =>
        tx.$transaction(async (inner) => {
          await inner.rubberSaleWorker.create({
            data: {
              saleId: sale.id,
              workerId: worker,
              pieces: FAILED_PIECES,
              weightKg: 40,
            },
          });
        }),
      );

      const rowsAfterFailure = await tx.rubberSaleWorker.count({
        where: { saleId: sale.id },
      });

      assert.equal(
        rowsAfterFailure,
        0,
        'the old flow should lose the draft — if it survives, the integration spec proves nothing',
      );

      console.log('MUTATION CHECK: old flow loses the draft, as expected');
      throw new Error('rollback-mutation');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-mutation') {
        throw error;
      }
    });
  } finally {
    await ddl(`DROP TRIGGER IF EXISTS ${TRIGGER}`).catch(() => undefined);
  }

  assert.equal(
    await prisma.person.count({ where: { id: { gte: BASE_ID } } }),
    0,
  );
  await prisma.onModuleDestroy();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
