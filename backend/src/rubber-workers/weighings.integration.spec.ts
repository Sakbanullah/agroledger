/**
 * Integration tests for a worker that is weighed more than once inside one
 * sale (too many pieces for a single scale load) and saved through the scan
 * flow. Runs against the real MySQL database and rolls everything back.
 *
 * Run:
 *   npx ts-node --transpile-only src/rubber-workers/weighings.integration.spec.ts
 */
import assert from 'node:assert/strict';

import { PrismaService } from '../prisma/prisma.service';
import type { SaveScannedWorkersDto } from './dto/save-scanned-workers.dto';
import { RubberWorkersService } from './rubber-workers.service';

const BASE_ID = 2147482000;
const workerA = BASE_ID + 1;
const workerB = BASE_ID + 2;

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

  const save = (saleId: number, workers: SaveScannedWorkersDto['workers']) =>
    ({ saleId, workers }) as SaveScannedWorkersDto;

  try {
    await prisma.$transaction(async (outer) => {
      const service = new RubberWorkersService(outer as never, null as never);

      for (const id of [workerA, workerB]) {
        await outer.person.create({
          data: { id, name: `QA Weighing ${id}`, type: 'WORKER' },
        });
      }

      const sale = await outer.sale.create({
        data: {
          farmId: farm.id,
          commodityId: karet.id,
          saleDate: new Date('2026-11-20'),
          status: 'PENDING',
          totalWeightKg: 500,
          pricePerKg: 2000,
        },
      });

      // ---------------- 1. two weighings, one worker ----------
      const result = (await service.saveScannedWorkers(
        save(sale.id, [
          {
            workerId: workerA,
            weighings: [
              { pieces: 10, weightKg: 30.5 },
              { pieces: 4, weightKg: 12 },
            ],
          },
          { workerId: workerB, weighings: [{ pieces: 2, weightKg: 5 }] },
        ]),
      )) as { totalWeightKg: number };

      const rowA = await outer.rubberSaleWorker.findFirstOrThrow({
        where: { saleId: sale.id, workerId: workerA },
        include: { weighings: { orderBy: { id: 'asc' } } },
      });

      assert.equal(rowA.pieces, 14);
      assert.equal(Number(rowA.weightKg), 42.5);
      assert.deepEqual(
        rowA.weighings.map((w) => `${w.pieces}/${Number(w.weightKg)}`),
        ['10/30.5', '4/12'],
      );
      assert.equal(result.totalWeightKg, 47.5);
      pass('two weighings sum into one row, sale weight follows');

      // ---------------- 2. same worker twice is still refused --
      await assert.rejects(
        () =>
          service.saveScannedWorkers(
            save(sale.id, [
              { workerId: workerA, weighings: [{ pieces: 1, weightKg: 1 }] },
              { workerId: workerA, weighings: [{ pieces: 1, weightKg: 1 }] },
            ]),
          ),
        /tidak boleh muncul lebih dari satu kali/,
      );
      pass('duplicate worker in one request still rejected');

      // ---------------- 3. worker already in the sale ----------
      await assert.rejects(
        () =>
          service.saveScannedWorkers(
            save(sale.id, [
              { workerId: workerA, weighings: [{ pieces: 1, weightKg: 1 }] },
            ]),
          ),
        /sudah terdaftar pada sale ini/,
      );
      pass('worker already registered in the sale is refused');

      // ---------------- 4. manual draft still works ------------
      const draftSale = await outer.sale.create({
        data: {
          farmId: farm.id,
          commodityId: karet.id,
          saleDate: new Date('2026-11-20'),
          status: 'PENDING',
          totalWeightKg: 100,
          pricePerKg: 2000,
        },
      });

      await service.saveDraftWorkers({
        saleId: draftSale.id,
        workers: [{ workerId: workerA, pieces: 6, weightKg: 20 }],
      } as never);

      const draftRow = await outer.rubberSaleWorker.findFirstOrThrow({
        where: { saleId: draftSale.id },
        include: { weighings: true },
      });

      assert.equal(draftRow.weighings.length, 1);
      assert.equal(draftRow.weighings[0].pieces, 6);
      assert.equal(Number(draftRow.weighings[0].weightKg), 20);
      pass('manual draft row carries its single weighing');

      throw new Error('rollback-scenario');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-scenario') throw error;
    });
  } finally {
    assert.equal(
      await prisma.person.count({ where: { id: { gte: BASE_ID } } }),
      0,
      'scenario data must be rolled back',
    );
    await prisma.onModuleDestroy();
  }

  console.log(`\n${passed.length} checks passed against the real database`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
