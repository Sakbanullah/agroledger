/**
 * Read-only preview of the settlement backfill.
 *
 * The preview answers one question before the SQL is reviewed against a copy of
 * the real database: "what would the backfill do to each row?" It runs inside
 * a read-only transaction, issues SELECTs only, and never writes a row.
 *
 * Rows are read in pages bounded by id, so the whole table does not have to be
 * loaded to answer the question. A paginated transaction holds its snapshot,
 * exclusive to the connection the transaction runs on, until it commits, so on
 * a large table the run is resumed from the last id of the previous run
 * instead of being made long enough to time out.
 */
import type { Prisma } from '../generated/prisma/client';
import {
  classifyHistoricalSettlement,
  HistoricalClassification,
  HistoricalCreditRow,
  HistoricalMoneyRow,
  HistoricalSettlement,
} from './migration-classifier';

export const PREVIEW_PAGE_SIZE = 500;

/** Largest id on the last page of the previous run, or 0 to start from the first. */
export const PREVIEW_FIRST_ID = 0;

/** The narrow slice of Prisma the preview needs. */
export interface MigrationPreviewReader {
  $transaction<T>(
    callback: (tx: PreviewQuery) => Promise<T>,
    options: { isolationLevel?: 'RepeatableRead' },
  ): Promise<T>;
}

export interface PreviewQuery {
  settlement: {
    findMany(args: {
      where: { id: { gt: number } };
      orderBy: { id: 'asc' };
      take: number;
      select: {
        id: true;
        status: true;
        grossShare: true;
        deductionAmount: true;
        netAmount: true;
      };
    }): Promise<
      Array<{
        id: number;
        status: string;
        grossShare: Prisma.Decimal | number | string;
        deductionAmount: Prisma.Decimal | number | string;
        netAmount: Prisma.Decimal | number | string;
      }>
    >;
  };
  moneyTransaction: {
    findMany(args: {
      where: { referenceType: 'SETTLEMENT'; referenceId: { in: number[] } };
      select: { id: true; referenceId: true; type: true; amount: true };
    }): Promise<
      Array<{
        id: number;
        referenceId: number | null;
        type: string;
        amount: Prisma.Decimal | number | string;
      }>
    >;
  };
  creditTransaction: {
    findMany(args: {
      where: { reference: { in: string[] } };
      select: { id: true; reference: true; type: true; amount: true };
    }): Promise<
      Array<{
        id: number;
        reference: string;
        type: string;
        amount: Prisma.Decimal | number | string;
      }>
    >;
  };
}

export type PreviewOutcome = HistoricalClassification['status'];

export interface PreviewRow {
  id: number;
  status: string;
  classification: HistoricalClassification;
}

export interface PreviewGroup {
  count: number;
  netAmount: number;
  deductionAmount: number;
  /**
   * Rows whose DECIMAL value could not be read. Their figures are in the count
   * but not in the sums, and the group says so instead of returning NaN.
   */
  unreadableAmounts: number;
  settlementIds: number[];
  truncated: boolean;
}

export type PreviewGroups = Record<PreviewOutcome, PreviewGroup>;

/** How many ids of each group are kept for the report. */
export const PREVIEW_SAMPLE_LIMIT = 50;

export interface MigrationPreview {
  readOnly: true;
  total: number;
  groups: PreviewGroups;
}

const emptyGroup = (): PreviewGroup => ({
  count: 0,
  netAmount: 0,
  deductionAmount: 0,
  unreadableAmounts: 0,
  settlementIds: [],
  truncated: false,
});

const emptyGroups = (): PreviewGroups => ({
  PAID_OUT: emptyGroup(),
  SETTLED_BY_OFFSET: emptyGroup(),
  NO_BALANCE: emptyGroup(),
  PENDING: emptyGroup(),
  BACKFILL_EXCLUDED: emptyGroup(),
});

/**
 * A DECIMAL column as a number, or null when it cannot be read. The backfill
 * compares amounts exactly, so a row with an unreadable figure proves nothing
 * and must not be summed as if it were zero.
 */
const amount = (value: Prisma.Decimal | number | string): number | null => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

/** A row with an unreadable figure is left out of the proven groups. */
const unreadable = (row: { grossShare: Prisma.Decimal | number | string; deductionAmount: Prisma.Decimal | number | string; netAmount: Prisma.Decimal | number | string }): boolean =>
  amount(row.grossShare) === null || amount(row.deductionAmount) === null || amount(row.netAmount) === null;

const creditReference = (settlementId: number) => `SETTLEMENT-${settlementId}`;

/**
 * Classifies every settlement exactly as the backfill SQL would, without
 * writing anything. Only the money and credit rows of the rows on the current
 * page are read.
 */
export async function previewSettlementBackfill(
  reader: MigrationPreviewReader,
  firstId = PREVIEW_FIRST_ID,
): Promise<MigrationPreview> {
  return reader.$transaction(
    async (tx) => {
      const groups = emptyGroups();
      let total = 0;
      let afterId = firstId;

      for (;;) {
        const page = await tx.settlement.findMany({
          where: { id: { gt: afterId } },
          orderBy: { id: 'asc' },
          take: PREVIEW_PAGE_SIZE,
          select: {
            id: true,
            status: true,
            grossShare: true,
            deductionAmount: true,
            netAmount: true,
          },
        });

        if (page.length === 0) {
          break;
        }

        afterId = page[page.length - 1].id;

        const ids = page.map((row) => row.id);

        const money = await tx.moneyTransaction.findMany({
          where: { referenceType: 'SETTLEMENT', referenceId: { in: ids } },
          select: { id: true, referenceId: true, type: true, amount: true },
        });

        const credit = await tx.creditTransaction.findMany({
          where: { reference: { in: ids.map(creditReference) } },
          select: { id: true, reference: true, type: true, amount: true },
        });

        const moneyRows: HistoricalMoneyRow[] = money
          .filter((row) => row.referenceId !== null)
          .map((row) => ({
            id: row.id,
            settlementId: row.referenceId as number,
            type: row.type as HistoricalMoneyRow['type'],
            amount: amount(row.amount) as number,
          }));

        const creditRows: HistoricalCreditRow[] = credit.map((row) => ({
          id: row.id,
          settlementId: Number(row.reference.slice('SETTLEMENT-'.length)),
          type: row.type as HistoricalCreditRow['type'],
          amount: amount(row.amount) as number,
        }));

        for (const row of page) {
          const unreadableRow = unreadable(row);

          const classification = unreadableRow
            ? ({ status: 'PENDING', reconciliationStatus: 'REQUIRED' } as const)
            : classifyHistoricalSettlement(
                {
                  id: row.id,
                  status: row.status,
                  grossShare: amount(row.grossShare) as number,
                  deductionAmount: amount(row.deductionAmount) as number,
                  netAmount: amount(row.netAmount) as number,
                } satisfies HistoricalSettlement,
                moneyRows,
                creditRows,
              );

          const group = groups[classification.status];

          group.count += 1;

          if (unreadableRow) {
            group.unreadableAmounts += 1;
          } else {
            group.netAmount += amount(row.netAmount) as number;
            group.deductionAmount += amount(row.deductionAmount) as number;
          }

          if (group.settlementIds.length < PREVIEW_SAMPLE_LIMIT) {
            group.settlementIds.push(row.id);
          } else {
            group.truncated = true;
          }

          total += 1;
        }

        if (page.length < PREVIEW_PAGE_SIZE) {
          break;
        }
      }

      return { readOnly: true, total, groups };
    },
    // One snapshot for every page, but only within this run: a resumed run is
    // a new transaction and reads a fresh snapshot. MySQL is not told the
    // transaction is read-only, so only the SELECTs above are issued here.
    { isolationLevel: 'RepeatableRead' },
  );
}
