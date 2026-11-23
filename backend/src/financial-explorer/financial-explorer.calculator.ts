import {
  Direction,
  FlowRole,
  flowRoleFor,
  signedOwnCash,
} from './money-flow-role';

export const OPENING_BALANCE_CATEGORY = 'OPENING_BALANCE';

export type MoneyRow = {
  id: number;
  type: string;
  category: string;
  amount: unknown;
  transactionDate: Date;
  farmOwnershipType?: string | null;
};

export type ClassifiedRow = MoneyRow & {
  role: FlowRole;
  direction: Direction;
  /** Positive magnitude; meaning depends on role and direction. */
  amount: number;
};

/** Evening cutoff: a date is accepted while it is still that date locally. */
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function ymd(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Every calendar day between two dates, inclusive, in local time. */
export function eachDay(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    days.push(ymd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function classify(row: MoneyRow): ClassifiedRow {
  return {
    ...row,
    role: flowRoleFor(row),
    direction: row.type === 'IN' ? 'IN' : 'OUT',
    amount: Math.abs(Number(row.amount)),
  };
}

export function sumAmounts<T extends { amount: number }>(rows: T[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

/**
 * Opening balance at the start of `startDate`: cash effect of every row
 * strictly before it, counting only the user's own rows.
 */
export function openingBalanceBefore(rows: MoneyRow[], startDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  let balance = 0;
  for (const row of rows) {
    if (row.transactionDate >= start) continue;
    // An opening balance is a stated starting point, not money moved: it
    // starts the ledger instead of also counting as an inflow.
    if (row.category === OPENING_BALANCE_CATEGORY) {
      balance += Math.abs(Number(row.amount));
    } else {
      balance += signedOwnCash(row);
    }
  }
  return balance;
}

export function summarize(rows: MoneyRow[], startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = endOfDay(endDate);

  const own = rows.filter((row) => flowRoleFor(row) === 'OWN');
  const passthrough = rows.filter((row) => flowRoleFor(row) === 'PASSTHROUGH');
  const inRange = (row: MoneyRow) =>
    row.transactionDate >= start && row.transactionDate <= end;

  const ownInRange = own.filter(inRange).map((row) => classify(row));
  const expenseInRange = ownInRange.filter((row) => row.direction === 'OUT');
  const incomeInRange = ownInRange.filter(
    (row) => row.direction === 'IN' && row.category !== OPENING_BALANCE_CATEGORY,
  );
  const openingInRange = ownInRange.filter(
    (row) => row.direction === 'IN' && row.category === OPENING_BALANCE_CATEGORY,
  );
  const passthroughInRange = passthrough.filter(inRange);

  const totalIncome = sumAmounts(incomeInRange);
  const totalExpense = sumAmounts(expenseInRange);
  const openingBalance = openingBalanceBefore(rows, start);
  // Closing is derived from the opening balance plus every own cash movement,
  // so it reconciles with the transaction list by construction.
  const openingInRangeTotal = sumAmounts(openingInRange);
  const netCashFlow =
    totalIncome - totalExpense + openingInRangeTotal;
  const closingBalance = openingBalance + netCashFlow;

  return {
    startDate: start,
    endDate: end,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    openingBalance,
    closingBalance,
    transactionCount:
      incomeInRange.length + expenseInRange.length + openingInRange.length,
    incomeCount: incomeInRange.length,
    expenseCount: expenseInRange.length,
    openingBalanceInPeriod: openingInRangeTotal,
    // Gross sales of another owner's farm that moved through the user's hands.
    // Reported apart from income because the money is not the user's.
    passthrough: {
      salesIn: sumAmounts(
        passthroughInRange
          .filter((row) => row.type === 'IN')
          .map((row) => classify(row)),
      ),
      count: passthroughInRange.length,
    },
  };
}

export function dailySeries(rows: MoneyRow[], startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = endOfDay(endDate);

  const buckets = new Map<
    string,
    { date: string; income: number; expense: number; count: number }
  >();
  for (const day of eachDay(start, end)) {
    buckets.set(day, { date: day, income: 0, expense: 0, count: 0 });
  }

  for (const row of rows) {
    if (row.transactionDate < start || row.transactionDate > end) continue;
    if (flowRoleFor(row) === 'PASSTHROUGH') continue;
    const bucket = buckets.get(ymd(row.transactionDate));
    if (!bucket) continue;
    if (row.type === 'IN') bucket.income += Math.abs(Number(row.amount));
    else bucket.expense += Math.abs(Number(row.amount));
    bucket.count += 1;
  }

  return Array.from(buckets.values());
}

export function categoryBreakdown(
  rows: MoneyRow[],
  direction: Direction,
  startDate: Date,
  endDate: Date,
  includePassthrough = false,
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = endOfDay(endDate);

  const groups = new Map<string, { category: string; total: number; count: number }>();

  for (const row of rows) {
    if (row.transactionDate < start || row.transactionDate > end) continue;
    if (!includePassthrough && flowRoleFor(row) === 'PASSTHROUGH') continue;
    if (row.category === OPENING_BALANCE_CATEGORY) continue;
    if ((row.type === 'IN' ? 'IN' : 'OUT') !== direction) continue;
    const current = groups.get(row.category) ?? {
      category: row.category,
      total: 0,
      count: 0,
    };
    current.total += Math.abs(Number(row.amount));
    current.count += 1;
    groups.set(row.category, current);
  }

  const total = Array.from(groups.values()).reduce((sum, item) => sum + item.total, 0);

  return {
    direction,
    total,
    categories: Array.from(groups.values())
      .sort((a, b) => b.total - a.total)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? Math.round((item.total / total) * 10000) / 100 : 0,
      })),
  };
}
