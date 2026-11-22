/**
 * Runtime check: every path that changes a kasbon balance takes the
 * CreditAccount row lock first.
 *
 * A PAYMENT reads the outstanding balance and refuses an over-payment. A DEBT
 * written between that read and the payment's insert would make the refusal
 * wrong - and a settlement paying out under the same lock would deduct from a
 * balance that no longer exists. Both debt entry points must hold the lock,
 * taken in the global order (src/common/lock-order.ts): after Sale and
 * Settlement, on CreditAccount.
 */
import { CreditService } from '../../src/credit/credit.service';

export async function checkCreditBalanceLock(): Promise<void> {
  const queries: string[] = [];

  const prisma: Record<string, any> = {
    person: { findUnique: async () => ({ id: 1 }) },
    creditAccount: {
      findUnique: async () => {
        throw new Error('the account was read without its row lock');
      },
      create: async () => ({ id: 1, personId: 1, status: 'ACTIVE' }),
    },
    creditTransaction: {
      create: async () => ({ id: 99 }),
      findMany: async () => [{ type: 'DEBT', amount: 1000 }],
    },
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');

      if (!/FROM CreditAccount/.test(sql) || !/FOR UPDATE/.test(sql)) {
        throw new Error(`a query without the account lock ran: ${sql}`);
      }

      queries.push(sql);
      return [{ id: 1, personId: 1, status: 'ACTIVE' }];
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const service = new CreditService(prisma as never);

  await service.createDebt({
    personId: 1,
    amount: 1000,
    transactionDate: new Date().toISOString(),
  } as never);

  process.stdout.write('PASS createDebt locks the credit account\n');

  await service.createTransaction({
    creditAccountId: 1,
    type: 'DEBT',
    amount: 1000,
    transactionDate: new Date().toISOString(),
  } as never);

  process.stdout.write('PASS a DEBT transaction locks the credit account\n');

  if (queries.length !== 2) {
    throw new Error(`expected two locked reads, got ${queries.length}`);
  }
}
