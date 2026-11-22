/**
 * Runtime check: the public credit endpoints refuse server-owned references
 * before writing anything.
 *
 * Service-level specs cannot run under this repo's Jest setup (Jest loads
 * @nestjs/common as ESM), so the check compiles the service to CommonJS and
 * drives it with a mocked Prisma client. It proves the write decisions, not a
 * database.
 *
 * Run: npm run check:runtime (after `nest build`-style compilation; see
 * scripts/runtime-checks/run.js).
 */
import { BadRequestException } from '@nestjs/common';

import { CreditService } from '../../src/credit/credit.service';

export async function checkCreditReference(): Promise<void> {
  let writes = 0;

  const recordWrite = async () => {
    writes += 1;
    return { id: 99 };
  };

  const prisma = {
    person: { findUnique: async () => ({ id: 1 }) },
    creditAccount: {
      findUnique: async () => ({ id: 1, personId: 1, status: 'ACTIVE' }),
      create: async () => ({ id: 1, personId: 1, status: 'ACTIVE' }),
    },
    creditTransaction: {
      create: recordWrite,
      findMany: async () => [{ type: 'DEBT', amount: 1000 }],
    },
    $queryRaw: async () => [{ id: 1, personId: 1, status: 'ACTIVE' }],
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const service = new CreditService(prisma as never);

  await refuses(
    () =>
      service.createDebt({
        personId: 1,
        amount: 1000,
        transactionDate: new Date().toISOString(),
        reference: 'SETTLEMENT-42',
      }),
    'debt with reserved reference is refused',
  );

  await refuses(
    () =>
      service.createTransaction({
        creditAccountId: 1,
        type: 'PAYMENT',
        amount: 1000,
        transactionDate: new Date().toISOString(),
        reference: 'cancellation-7',
      } as never),
    'payment with reserved reference is refused',
  );

  if (writes > 0) {
    throw new Error('a reserved reference reached the database write');
  }

  process.stdout.write('PASS credit reference guard\n');
}

async function refuses(action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof BadRequestException) {
      process.stdout.write(`PASS ${label}\n`);
      return;
    }

    throw error;
  }

  throw new Error(`${label}: expected the call to be refused`);
}
