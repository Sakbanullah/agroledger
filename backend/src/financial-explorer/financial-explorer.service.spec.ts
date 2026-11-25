import { PrismaService } from '../prisma/prisma.service';
import { CSV_BATCH_SIZE, FinancialExplorerService } from './financial-explorer.service';

type FakeRow = {
  id: number;
  type: string;
  category: string;
  amount: number;
  transactionDate: Date;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  farmId: number | null;
  farm: { name: string; ownershipType: string | null } | null;
};

function fakeRow(id: number): FakeRow {
  return {
    id,
    type: 'OUT',
    category: 'OPERASIONAL',
    amount: 1000 + id,
    transactionDate: new Date(2026, 10, 24),
    description: `baris ${id}`,
    referenceType: null,
    referenceId: null,
    farmId: null,
    farm: null,
  };
}

describe('FinancialExplorerService CSV export', () => {
  // `any` on purpose: the mock doubles Prisma's delegate types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let service: FinancialExplorerService;

  beforeEach(() => {
    prisma = {
      moneyTransaction: { findMany: jest.fn() },
      settlement: { findMany: jest.fn().mockResolvedValue([]) },
      ownerSettlement: { findMany: jest.fn().mockResolvedValue([]) },
    };

    service = new FinancialExplorerService(
      prisma as unknown as PrismaService,
    );
  });

  it('exports every filtered row across pagination batches', async () => {
    const firstBatch = Array.from({ length: CSV_BATCH_SIZE }, (_, index) =>
      fakeRow(CSV_BATCH_SIZE - index),
    );
    const secondBatch = [fakeRow(1)];

    prisma.moneyTransaction.findMany
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch);

    const chunks: string[] = [];
    for await (const chunk of service.streamTransactionsCsv({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      category: 'OPERASIONAL',
    })) {
      chunks.push(chunk);
    }

    const lines = chunks.join('').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1 + CSV_BATCH_SIZE + 1);
    expect(lines[1]).toContain('baris 500');
    expect(lines[lines.length - 1]).toContain('baris 1');

    expect(prisma.moneyTransaction.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.moneyTransaction.findMany.mock.calls[0][0]).toMatchObject({
      where: { category: 'OPERASIONAL' },
    });
    expect(prisma.moneyTransaction.findMany.mock.calls[1][0]).toMatchObject({
      cursor: { id: 1 },
      skip: 1,
    });
  });

  it('exports the stored amount unchanged', async () => {
    prisma.moneyTransaction.findMany.mockResolvedValueOnce([
      { ...fakeRow(3), amount: 1234.56 },
    ]);

    const chunks: string[] = [];
    for await (const chunk of service.streamTransactionsCsv({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain(',1234.56,');
  });

  it('names the owner of an OWNER_SETTLEMENT row', async () => {
    prisma.moneyTransaction.findMany.mockResolvedValueOnce([
      {
        ...fakeRow(4),
        category: 'OWNER_SETTLEMENT',
        referenceType: 'OWNER_SETTLEMENT',
        referenceId: 11,
      },
    ]);
    prisma.ownerSettlement.findMany.mockResolvedValueOnce([
      { id: 11, owner: { name: 'Pak Tani' } },
    ]);

    const chunks: string[] = [];
    for await (const chunk of service.streamTransactionsCsv({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toContain(',OWNER_SETTLEMENT,11,Pak Tani,');
  });
});
