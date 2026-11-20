/**
 * Integration tests for sale cancellation, reversal and deletion.
 *
 * Runs against the real MySQL database through PrismaService, inside one
 * outer transaction that is rolled back, so the database is left unchanged.
 * Money effects are asserted against the same tables the dashboard and
 * reports read (MoneyTransaction signed sums, CreditTransaction, Settlement,
 * Sale status).
 *
 * Run:
 *   npx ts-node --transpile-only src/sales/sale-cancellation.integration.spec.ts
 */
import assert from 'node:assert/strict';

import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from './sales.service';

const BASE_ID = 2147483200;
const worker = BASE_ID + 1;
const otherWorker = BASE_ID + 2;

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const karet = await prisma.commodity.findFirst({ where: { name: 'Karet' } });
  const farm = await prisma.farm.findFirst();
  assert.ok(karet && farm);

  const passed: string[] = [];
  const pass = (name: string) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };

  try {
    await prisma.$transaction(async (outer) => {
      const tx = outer as unknown as typeof prisma;
      // Nested transactions cannot see these uncommitted fixtures, so the
      // service runs on the outer client (its own nests become savepoints).
      const service = new SalesService(outer as never, null as never);

      // ---------------- fixtures --------------------------------
      await tx.person.create({
        data: { id: worker, name: `QA Cancel ${worker}`, type: 'WORKER' },
      });
      await tx.person.create({
        data: { id: otherWorker, name: `QA Cancel ${otherWorker}`, type: 'WORKER' },
      });
      const creditAccount = await tx.creditAccount.create({
        data: { personId: worker, status: 'ACTIVE' },
      });
      await tx.creditTransaction.create({
        data: {
          creditAccountId: creditAccount.id,
          type: 'DEBT',
          amount: 5000,
          transactionDate: new Date('2026-11-01'),
          description: 'Kasbon lama',
        },
      });

      const makeSale = async (status: string) =>
        tx.sale.create({
          data: {
            farmId: farm.id,
            commodityId: karet.id,
            saleDate: new Date('2026-11-18'),
            status,
            totalWeightKg: 20,
            pricePerKg: 2000,
            ownershipType: 'OWN',
          },
        });

      // Net cash effect of a sale: its own money rows plus every reversal
      // recorded on the sale's cancellation record.
      const cashOf = async (saleId: number) => {
        const cancellation = await tx.saleCancellation.findUnique({
          where: { saleId },
        });
        const rows = await tx.moneyTransaction.findMany({
          where: {
            OR: [
              { referenceType: 'SALE', referenceId: saleId },
              ...(cancellation
                ? [
                    {
                      referenceType: 'SALE_CANCELLATION',
                      referenceId: cancellation.id,
                      description: { startsWith: `Pembatalan penjualan Sale #${saleId} [HARVEST_SALE]` },
                    },
                  ]
                : []),
            ],
          },
        });
        return rows.reduce(
          (total, row) =>
            total + (row.type === 'IN' ? Number(row.amount) : -Number(row.amount)),
          0,
        );
      };

      const settlementCashOf = async (settlementId: number) => {
        const rows = await tx.moneyTransaction.findMany({
          where: { referenceType: 'SETTLEMENT', referenceId: settlementId },
        });
        return rows.reduce(
          (total, row) =>
            total + (row.type === 'IN' ? Number(row.amount) : -Number(row.amount)),
          0,
        );
      };

      const kasbonBalanceOf = async (accountId: number) => {
        const rows = await tx.creditTransaction.findMany({
          where: { creditAccountId: accountId },
        });
        return rows.reduce(
          (total, row) =>
            total + (row.type === 'DEBT' ? Number(row.amount) : -Number(row.amount)),
          0,
        );
      };

      // A COMPLETED sale with its real financial effects:
      // cash in 40000, worker settlement cash out 15000, kasbon 5000 deducted.
      const sale = await makeSale('CONFIRMED');
      await tx.moneyTransaction.create({
        data: {
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: 40000,
          transactionDate: new Date(),
          referenceType: 'SALE',
          referenceId: sale.id,
          farmId: farm.id,
        },
      });
      const settlement = await tx.settlement.create({
        data: {
          saleId: sale.id,
          workerId: worker,
          grossShare: 20000,
          kasbonAmount: 5000,
          deductionAmount: 5000,
          netAmount: 15000,
          status: 'CONFIRMED',
        },
      });
      await tx.creditTransaction.create({
        data: {
          creditAccountId: creditAccount.id,
          type: 'PAYMENT',
          amount: 5000,
          transactionDate: new Date(),
          reference: `SETTLEMENT-${settlement.id}`,
          description: 'Potongan kasbon settlement',
        },
      });
      await tx.moneyTransaction.create({
        data: {
          type: 'OUT',
          category: 'RUBBER_WORKER_SETTLEMENT',
          amount: 15000,
          transactionDate: new Date(),
          referenceType: 'SETTLEMENT',
          referenceId: settlement.id,
        },
      });
      await tx.sale.update({ where: { id: sale.id }, data: { status: 'COMPLETED' } });

      // An unrelated sale that must never be touched.
      const otherSale = await makeSale('COMPLETED');
      await tx.moneyTransaction.create({
        data: {
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: 40000,
          transactionDate: new Date(),
          referenceType: 'SALE',
          referenceId: otherSale.id,
          farmId: farm.id,
        },
      });

      const kasbonBefore = await kasbonBalanceOf(creditAccount.id);
      assert.equal(await cashOf(sale.id), 40000);

      // ---------------- 1. draft deletion ----------------------
      const draft = await makeSale('PENDING');
      await tx.rubberSaleWorker.create({
        data: { saleId: draft.id, workerId: otherWorker, pieces: 1, weightKg: 5 },
      });
      await service.deleteDraftSale(draft.id);
      assert.equal(await tx.sale.count({ where: { id: draft.id } }), 0);
      pass('1. draft can be deleted');

      // ---------------- 3. COMPLETED cannot be deleted ---------
      await assert.rejects(
        () => service.deleteDraftSale(sale.id),
        /dibatalkan terlebih dahulu/,
      );
      assert.equal(
        (await tx.sale.findUnique({ where: { id: sale.id } }))?.status,
        'COMPLETED',
      );
      assert.equal(await cashOf(sale.id), 40000);
      pass('3. COMPLETED sale cannot be deleted directly');

      // ---------------- 6. failed cancellation changes nothing --
      // A CONFIRMED sale must not be cancelled.
      const confirmedOnly = await makeSale('CONFIRMED');
      await assert.rejects(
        () => service.cancelSale(confirmedOnly.id),
        /Hanya penjualan berstatus Selesai/,
      );
      assert.equal(
        (await tx.sale.findUnique({ where: { id: confirmedOnly.id } }))?.status,
        'CONFIRMED',
      );
      assert.equal(
        await tx.moneyTransaction.count({
          where: { category: 'SALE_CANCELLATION', referenceId: confirmedOnly.id },
        }),
        0,
      );
      pass('6a. cancellation refused for non-COMPLETED sale, nothing changed');

      // A paid owner share has no reversal path: refuse, change nothing.
      const owner = await tx.person.create({
        data: { id: otherWorker + 100, name: 'QA Owner', type: 'RELATIVE_OWNER' },
      });
      const paidSale = await makeSale('COMPLETED');
      await tx.ownerSettlement.create({
        data: {
          saleId: paidSale.id,
          ownerId: owner.id,
          ownerShareAmount: 1000,
          settledAmount: 500,
          outstandingAmount: 500,
          status: 'PARTIAL',
        },
      });
      await assert.rejects(
        () => service.cancelSale(paidSale.id),
        /pembagian ke pemilik sudah dibayar/,
      );
      assert.equal(
        (await tx.sale.findUnique({ where: { id: paidSale.id } }))?.status,
        'COMPLETED',
      );
      assert.equal(
        await tx.moneyTransaction.count({ where: { referenceId: paidSale.id } }),
        0,
      );
      pass('6b. cancellation refused when owner share already paid');

      // ---------------- 4 + 12. cancellation reverses ---------
      const cancelled = await service.cancelSale(sale.id);
      assert.equal(cancelled.sale?.status, 'CANCELLED');
      assert.equal(await cashOf(sale.id), 0, 'buyer income fully reversed');
      const reversalsOnRecord = await tx.moneyTransaction.findMany({
        where: {
          category: 'SALE_CANCELLATION',
          referenceType: 'SALE_CANCELLATION',
          referenceId: (await tx.saleCancellation.findUnique({ where: { saleId: sale.id } }))!.id,
        },
      });
      const settlementReversal = reversalsOnRecord
        .filter((r) => (r.description ?? '').includes('[RUBBER_WORKER_SETTLEMENT]'))
        .reduce(
        (t, r) => t + (r.type === 'IN' ? Number(r.amount) : -Number(r.amount)),
        0,
      );
      assert.equal(
        Number(await settlementCashOf(settlement.id)) + settlementReversal,
        0,
        'worker settlement cash reversed',
      );
      assert.equal(
        await kasbonBalanceOf(creditAccount.id),
        kasbonBefore + 5000,
        'deducted kasbon restored',
      );

      // Scoped to this scenario: the dev database may already hold
      // cancellations from manual testing.
      const scenarioCancellations = (
        await tx.saleCancellation.findMany({
          where: { saleId: { in: [sale.id, paidSale.id, otherSale.id] } },
        })
      ).map((row) => row.id);
      const reversalRows = await tx.moneyTransaction.findMany({
        where: {
          category: 'SALE_CANCELLATION',
          referenceType: 'SALE_CANCELLATION',
          referenceId: { in: scenarioCancellations },
        },
      });
      assert.equal(reversalRows.length, 2, 'income + worker cash reversed');
      pass('4. cancellation reverses cash and restores kasbon');

      // ---------------- 7. repeated cancellation --------------
      await assert.rejects(
        () => service.cancelSale(sale.id),
        /sudah dibatalkan sebelumnya/,
      );
      assert.equal(
        await tx.moneyTransaction.count({
          where: {
            category: 'SALE_CANCELLATION',
            referenceType: 'SALE_CANCELLATION',
            referenceId: { in: scenarioCancellations },
          },
        }),
        2,
        'no second reversal',
      );
      pass('7. repeated cancellation is rejected without double reversal');

      // ---------------- 9. history kept ------------------------
      assert.equal(
        await tx.moneyTransaction.count({
          where: { category: 'HARVEST_SALE', referenceId: sale.id },
        }),
        1,
        'original income row is never edited or deleted',
      );
      assert.equal(
        (await tx.settlement.findUnique({ where: { id: settlement.id } }))?.status,
        'CONFIRMED',
        'settlement still intact before deletion',
      );
      pass('9. original money rows and settlement are preserved');

      // ---------------- 11. other sale unaffected -------------
      assert.equal(await cashOf(otherSale.id), 40000);
      assert.equal(
        (await tx.sale.findUnique({ where: { id: otherSale.id } }))?.status,
        'COMPLETED',
      );
      pass('11. other sale unaffected');

      // ---------------- 5 + 10. deletion after cancellation ---
      const cancellationRecord = await tx.saleCancellation.findUnique({
        where: { saleId: sale.id },
      });
      assert.ok(cancellationRecord);

      const moneyBeforeDelete = await tx.moneyTransaction.count({
        where: { referenceType: 'SALE_CANCELLATION', referenceId: cancellationRecord.id },
      });
      assert.ok(moneyBeforeDelete > 0);

      await service.deleteDraftSale(sale.id);
      assert.equal(await tx.sale.count({ where: { id: sale.id } }), 0);
      pass('5. cancelled sale can be deleted');

      // Money rows survive and point at the cancellation record, not at a
      // deleted sale id.
      assert.equal(
        await tx.moneyTransaction.count({
          where: { referenceType: 'SALE', referenceId: sale.id },
        }),
        0,
        'no money row left pointing at the deleted sale',
      );
      assert.equal(
        await tx.moneyTransaction.count({
          where: { referenceType: 'SALE_CANCELLATION', referenceId: cancellationRecord.id },
        }),
        moneyBeforeDelete + 2,
        'reversal rows plus the repointed originals are kept for audit',
      );
      assert.equal(
        await tx.moneyTransaction.count({
          where: { referenceType: 'SETTLEMENT', referenceId: settlement.id },
        }),
        0,
        'settlement-cash rows were repointed before the cascade',
      );
      pass('10. money rows survive deletion and no reference is orphaned');

      // Settlement rows are gone (cascade), but were neutralized first, so
      // report sums reading CONFIRMED settlements do not count them.
      assert.equal(
        await tx.settlement.count({ where: { saleId: sale.id } }),
        0,
      );
      const liveSettlements = await tx.settlement.count({
        where: { id: settlement.id, status: 'CONFIRMED' },
      });
      assert.equal(liveSettlements, 0);
      pass('9b. settlement rows neutralized, reports see no settlement');

      // ---------------- 12. global cash consistent -----------
      const allMoney = await tx.moneyTransaction.findMany({
        where: {
          OR: [
            { referenceType: 'SALE', referenceId: sale.id },
            {
              referenceType: 'SALE_CANCELLATION',
              referenceId: cancellationRecord.id,
            },
          ],
        },
      });
      const net = allMoney.reduce(
        (t, r) => t + (r.type === 'IN' ? Number(r.amount) : -Number(r.amount)),
        0,
      );
      assert.equal(net, 0, 'net cash effect of the deleted sale is zero');
      pass('12. money history nets to zero after cancel + delete');

      // ---------------- 8. failed deletion leaves no partial ---
      const noSettlement = await makeSale('COMPLETED');
      await assert.rejects(
        () => service.deleteDraftSale(noSettlement.id),
        /dibatalkan terlebih dahulu/,
      );
      assert.equal(await tx.sale.count({ where: { id: noSettlement.id } }), 1);
      pass('8. refused deletion leaves the sale and its data intact');

      // ---------------- 9c. owner settlement on a cancelled sale ---
      // The owner share was already paid before cancelling, then the sale
      // is cancelled and deleted: owner rows are neutralized and the
      // owner's payment survives on the cancellation record.
      const ownerSale = await makeSale('COMPLETED');
      const ownerSettlementRow = await tx.ownerSettlement.create({
        data: {
          saleId: ownerSale.id,
          ownerId: owner.id,
          ownerShareAmount: 1000,
          settledAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING',
        },
      });
      const ownerPayment = await tx.moneyTransaction.create({
        data: {
          type: 'OUT',
          category: 'OWNER_SETTLEMENT',
          amount: 1000,
          transactionDate: new Date(),
          referenceType: 'OWNER_SETTLEMENT',
          referenceId: ownerSettlementRow.id,
          farmId: farm.id,
        },
      });

      // Owner share unpaid: cancellation is allowed (nothing paid yet).
      const cancelledOwnerSale = await service.cancelSale(ownerSale.id);

      // Deleting must now succeed despite the owner settlement row.
      await service.deleteDraftSale(ownerSale.id);

      assert.equal(await tx.sale.count({ where: { id: ownerSale.id } }), 0);
      assert.equal(
        await tx.ownerSettlement.count({ where: { saleId: ownerSale.id } }),
        0,
      );
      const ownerPaymentAfter = await tx.moneyTransaction.findUnique({
        where: { id: ownerPayment.id },
      });
      assert.equal(ownerPaymentAfter?.referenceType, 'SALE_CANCELLATION');
      assert.equal(ownerPaymentAfter?.referenceId, cancelledOwnerSale.cancellationId);
      assert.equal(Number(ownerPaymentAfter?.amount), 1000);
      pass('9c. owner settle cancelled sale deletes; owner payment kept');

      // Unpaid owner share still blocks deleting a non-cancelled sale.
      const pendingOwnerSale = await makeSale('CONFIRMED');
      await tx.ownerSettlement.create({
        data: {
          saleId: pendingOwnerSale.id,
          ownerId: owner.id,
          ownerShareAmount: 500,
          settledAmount: 0,
          outstandingAmount: 500,
          status: 'PENDING',
        },
      });
      await assert.rejects(
        () => service.deleteDraftSale(pendingOwnerSale.id),
        /settlement worker|settlement pemilik/,
      );
      assert.equal(
        await tx.sale.count({ where: { id: pendingOwnerSale.id } }),
        1,
      );
      pass('9d. owner settlement still blocks deleting a non-cancelled sale');

      throw new Error('rollback-scenario');
    }).catch((error) => {
      if ((error as Error).message !== 'rollback-scenario') {
        throw error;
      }
    });
  } finally {
    // Every write above is inside the rolled-back transaction.
  }

  assert.equal(
    await prisma.sale.count({ where: { id: { gte: BASE_ID } } }),
    0,
    'scenario data rolled back',
  );
  assert.equal(
    await prisma.saleCancellation.count({ where: { saleId: { gte: BASE_ID } } }),
    0,
  );

  await prisma.onModuleDestroy();
  console.log(`\n${passed.length} checks passed against the real database`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
