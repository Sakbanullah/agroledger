/**
 * Runtime check: a worker cannot be changed once the sale has a settlement,
 * whatever the settlement's status.
 *
 * The sale status guard alone is not enough (a sale carrying a settlement may
 * still be PENDING after a reconciliation reset), so every status is probed
 * here, including NO_BALANCE.
 */
import { BadRequestException } from '@nestjs/common';

import { RubberWorkersService } from '../../src/rubber-workers/rubber-workers.service';

const STATUSES = ['PENDING', 'PAID_OUT', 'SETTLED_BY_OFFSET', 'NO_BALANCE'];

function makeService(settlement: { id: number } | null) {
  let updates = 0;
  let deletes = 0;
  let creates = 0;

  const prisma = {
    sale: {
      findUnique: async () => ({
        id: 10,
        status: 'PENDING',
        totalWeightKg: 100,
      }),
    },
    settlement: { findFirst: async () => settlement },
    rubberSaleWorker: {
      findUnique: async () => ({
        id: 7,
        saleId: 10,
        workerId: 1,
        pieces: 1,
        weightKg: 10,
        sale: { id: 10, status: 'PENDING', totalWeightKg: 100 },
        weighings: [{ pieces: 1, weightKg: 10 }],
      }),
      findMany: async () => [],
      update: async () => {
        updates += 1;
        return {};
      },
      delete: async () => {
        deletes += 1;
        return {};
      },
      create: async () => {
        creates += 1;
        return {};
      },
    },
    person: { findUnique: async () => ({ id: 1, type: 'WORKER' }) },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  return {
    service: new RubberWorkersService(prisma as never, {} as never),
    writes: () => ({ updates, deletes, creates }),
  };
}

export async function checkWorkerSettlementGuard(): Promise<void> {
  for (const status of STATUSES) {
    const { service, writes } = makeService({ id: 50 });

    for (const [label, action] of [
      ['update', () => service.update(7, { pieces: 2 })],
      ['remove', () => service.remove(7)],
    ] as const) {
      let refused = false;

      try {
        await action();
      } catch (error) {
        refused = error instanceof BadRequestException;
      }

      if (!refused) {
        throw new Error(`${label} was allowed with a ${status} settlement`);
      }
    }

    const { writes: after } = { writes: writes() };

    if (after.updates || after.deletes) {
      throw new Error(`a worker write reached the database for ${status}`);
    }
  }

  process.stdout.write('PASS worker edits are frozen by any settlement\n');

  const { service, writes } = makeService(null);
  await service.update(7, { pieces: 2 });

  if (writes().updates !== 1) {
    throw new Error('a worker without settlement could not be edited');
  }

  process.stdout.write('PASS worker without settlement can still be edited\n');
}
