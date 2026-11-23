import type { Prisma } from '../generated/prisma/client';
import {
  MigrationPreviewReader,
  PREVIEW_SAMPLE_LIMIT,
  previewSettlementBackfill,
} from './migration-preview';

// DECIMAL columns arrive as Prisma.Decimal; a string stands in for one here.
const decimal = (value: number): Prisma.Decimal =>
  ({ toString: () => String(value) }) as unknown as Prisma.Decimal;

const row = (id: number, over: Partial<{ status: string; grossShare: number; deductionAmount: number; netAmount: number }> = {}) => ({
  id,
  status: 'CONFIRMED',
  grossShare: decimal(10000),
  deductionAmount: decimal(0),
  netAmount: decimal(10000),
  ...over,
});

const reader = (settlements: ReturnType<typeof row>[]) => {
  const calls: string[] = [];
  const queried: number[][] = [];

  const fake: MigrationPreviewReader = {
    async $transaction(callback, options) {
      calls.push(`$transaction:${options?.isolationLevel ?? 'default'}`);
      return callback(query);
    },
  };

  const query = {
    settlement: {
      async findMany({ where, take }: { where: { id: { gt: number } }; take: number }) {
        calls.push('settlement.findMany');
        return settlements
          .filter((item) => item.id > where.id.gt)
          .sort((a, b) => a.id - b.id)
          .slice(0, take);
      },
    },
    moneyTransaction: {
      async findMany({ where }: { where: { referenceId: { in: number[] } } }) {
        calls.push('moneyTransaction.findMany');
        queried.push(where.referenceId.in);
        return where.referenceId.in
          .filter((id) => id === 1)
          .map((id) => ({ id: 100, referenceId: id, type: 'OUT', amount: decimal(10000) }));
      },
    },
    creditTransaction: {
      async findMany({ where }: { where: { reference: { in: string[] } } }) {
        calls.push('creditTransaction.findMany');
        return where.reference.in
          .filter((reference) => reference === 'SETTLEMENT-3')
          .map((reference) => ({ id: 200, reference, type: 'PAYMENT', amount: decimal(10000) }));
      },
    },
  };

  return { fake, calls, queried };
};

describe('previewSettlementBackfill', () => {
  it('classifies every row the same way the backfill would, without writing', async () => {
    const { fake, calls } = reader([
      row(1),
      row(2, { netAmount: 999 }),
      row(3, { deductionAmount: 10000, netAmount: 0 }),
      row(4, { status: 'CANCELLED' }),
    ]);

    const preview = await previewSettlementBackfill(fake);

    expect(preview.readOnly).toBe(true);
    expect(preview.total).toBe(4);
    expect(preview.groups.PAID_OUT.count).toBe(1);
    expect(preview.groups.PAID_OUT.settlementIds).toEqual([1]);
    expect(preview.groups.PENDING.count).toBe(1);
    expect(preview.groups.PENDING.settlementIds).toEqual([2]);
    expect(preview.groups.SETTLED_BY_OFFSET.settlementIds).toEqual([3]);
    expect(preview.groups.BACKFILL_EXCLUDED.settlementIds).toEqual([4]);

    expect(calls.every((call) => /findMany|^\$transaction/.test(call))).toBe(true);
    expect(calls).toContain('$transaction:RepeatableRead');
  });

  it('reads the money rows page by page and sums the figures', async () => {
    const { fake, queried } = reader([row(1), row(5), row(6)]);

    const preview = await previewSettlementBackfill(fake);

    expect(queried).toEqual([[1, 5, 6]]);
    expect(preview.groups.PAID_OUT.netAmount).toBe(10000);
    expect(preview.total).toBe(3);
  });

  it('stops collecting ids at the sample limit and says so', async () => {
    const rows = Array.from({ length: PREVIEW_SAMPLE_LIMIT + 2 }, (_, index) =>
      row(index + 1, { netAmount: 999 }),
    );

    const { fake } = reader(rows);
    const preview = await previewSettlementBackfill(fake);

    expect(preview.groups.PENDING.count).toBe(PREVIEW_SAMPLE_LIMIT + 2);
    expect(preview.groups.PENDING.settlementIds).toHaveLength(PREVIEW_SAMPLE_LIMIT);
    expect(preview.groups.PENDING.truncated).toBe(true);
    expect(preview.groups.PAID_OUT.truncated).toBe(false);
  });
});
