const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

const workers = [
  { name: 'Budi Final', pieces: 5, weightKg: 500, debt: 500000 },
  { name: 'Andi Final', pieces: 4, weightKg: 400, debt: 0 },
  { name: 'Asep Final', pieces: 6, weightKg: 600, debt: 750000 },
  { name: 'Dedi Final', pieces: 3, weightKg: 300, debt: 500000 },
  { name: 'Eko Final', pieces: 5, weightKg: 500, debt: 3000000 },
  { name: 'Fajar Final', pieces: 4, weightKg: 400, debt: 500000 },
  { name: 'Gandi Final', pieces: 3, weightKg: 350, debt: 250000 },
  { name: 'Hendra Final', pieces: 5, weightKg: 450, debt: 1000000 },
  { name: 'Iwan Final', pieces: 4, weightKg: 400, debt: 0 },
  { name: 'Joko Final', pieces: 6, weightKg: 600, debt: 1500000 },
];

async function main() {
  console.log('\n=== AGROLEDGER FINAL TEST SEED ===\n');

  // =========================
  // 1. FARM
  // =========================

  const farm = await prisma.farm.findFirst();

  if (!farm) {
    throw new Error(
      'Tidak ada Farm di database. Buat Farm terlebih dahulu.',
    );
  }

  console.log(`Farm: ${farm.name} (ID ${farm.id})`);

  // =========================
  // 2. COMMODITY KARET
  // =========================

  const commodity = await prisma.commodity.findFirst({
    where: {
      name: 'Karet',
    },
  });

  if (!commodity) {
    throw new Error(
      'Commodity "Karet" tidak ditemukan.',
    );
  }

  console.log(
    `Commodity: ${commodity.name} (ID ${commodity.id})`,
  );

  // =========================
  // 3. CREATE 10 WORKERS
  // =========================

  const createdWorkers = [];

  console.log('\nMembuat worker...\n');

  for (const data of workers) {
    const existing = await prisma.person.findFirst({
      where: {
        name: data.name,
        type: 'WORKER',
      },
    });

    let worker;

    if (existing) {
      worker = existing;
      console.log(
        `- ${worker.name} sudah ada (ID ${worker.id})`,
      );
    } else {
      worker = await prisma.person.create({
        data: {
          name: data.name,
          type: 'WORKER',
        },
      });

      console.log(
        `+ ${worker.name} dibuat (ID ${worker.id})`,
      );
    }

    createdWorkers.push({
      ...data,
      id: worker.id,
    });
  }

  // =========================
  // 4. CREATE CREDIT ACCOUNT
  // =========================

  console.log('\nMembuat Credit Account...\n');

  for (const worker of createdWorkers) {
    let creditAccount =
      await prisma.creditAccount.findUnique({
        where: {
          personId: worker.id,
        },
      });

    if (!creditAccount) {
      creditAccount =
        await prisma.creditAccount.create({
          data: {
            personId: worker.id,
            status: 'ACTIVE',
          },
        });

      console.log(
        `+ Credit Account ${creditAccount.id} → ${worker.name}`,
      );
    } else {
      console.log(
        `- Credit Account ${creditAccount.id} sudah ada → ${worker.name}`,
      );
    }

    worker.creditAccountId = creditAccount.id;
  }

  // =========================
  // 5. CREATE DEBT FOR 8 WORKERS
  // =========================

  console.log('\nMembuat kasbon untuk 8 worker...\n');

  for (const worker of createdWorkers) {
    if (worker.debt <= 0) {
      console.log(
        `- ${worker.name}: TIDAK punya hutang`,
      );
      continue;
    }

    await prisma.creditTransaction.create({
      data: {
        creditAccountId: worker.creditAccountId,
        type: 'DEBT',
        amount: worker.debt,
        transactionDate: new Date('2026-09-10'),
        description:
          'Kasbon Final Test Sale',
        reference: 'FINAL-TEST',
      },
    });

    console.log(
      `+ ${worker.name}: hutang Rp${worker.debt.toLocaleString(
        'id-ID',
      )}`,
    );
  }

  // =========================
  // 6. TOTAL WEIGHT
  // =========================

  const totalWeight = createdWorkers.reduce(
    (total, worker) =>
      total + worker.weightKg,
    0,
  );

  console.log(
    `\nTotal berat sale: ${totalWeight} kg`,
  );

  // =========================
  // 7. CREATE SALE
  // =========================

  const sale = await prisma.sale.create({
    data: {
      farmId: farm.id,
      commodityId: commodity.id,
      saleDate: new Date('2026-09-10'),
      pricePerKg: 10000,
      totalWeightKg: totalWeight,
      buyerName: 'Final Test Buyer',
      status: 'PENDING',
      notes:
        'Dataset final testing 10 worker',
    },
  });

  console.log(
    `\n+ Sale dibuat: ID ${sale.id}`,
  );

  // =========================
  // 8. CREATE RUBBER SALE WORKERS
  // =========================

  console.log('\nMenambahkan worker ke Sale...\n');

  for (const worker of createdWorkers) {
    await prisma.rubberSaleWorker.create({
      data: {
        saleId: sale.id,
        workerId: worker.id,
        pieces: worker.pieces,
        weightKg: worker.weightKg,
      },
    });

    console.log(
      `+ ${worker.name} → ${worker.weightKg} kg`,
    );
  }

  // =========================
  // 9. SUMMARY
  // =========================

  console.log('\n================================');
  console.log('      SEED BERHASIL');
  console.log('================================\n');

  console.log(`Sale ID       : ${sale.id}`);
  console.log(`Farm          : ${farm.name}`);
  console.log(`Commodity     : ${commodity.name}`);
  console.log(`Harga / Kg    : Rp10.000`);
  console.log(`Total Worker  : 10`);
  console.log(`Total Berat   : ${totalWeight} kg`);
  console.log(`Worker Hutang : 8`);
  console.log(`Worker Tanpa Hutang : 2`);

  console.log('\nWorker:');

  for (const worker of createdWorkers) {
    console.log(
      `${worker.name.padEnd(16)} | ` +
        `${String(worker.weightKg).padStart(4)} kg | ` +
        `Kasbon Rp${worker.debt.toLocaleString('id-ID')}`,
    );
  }

  console.log('\n================================');
  console.log(
    `Sale ID untuk settlement: ${sale.id}`,
  );
  console.log('================================\n');
}

main()
  .catch((error) => {
    console.error('\n❌ SEED GAGAL\n');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });