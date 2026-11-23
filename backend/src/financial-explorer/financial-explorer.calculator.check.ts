import {
  classify,
  dailySeries,
  openingBalanceBefore,
  summarize,
} from './financial-explorer.calculator';

const day = (d: number) => new Date(2026, 10, d, 10, 0, 0);
const row = (
  overrides: Partial<{
    id: number;
    type: string;
    category: string;
    amount: number;
    transactionDate: Date;
    farmOwnershipType: string | null;
  }> = {},
) => ({
  id: 1,
  type: 'IN',
  category: 'HARVEST_SALE',
  amount: 0,
  transactionDate: day(10),
  farmOwnershipType: 'OWN',
  ...overrides,
});

// Own-farm sale is income; relative-farm gross sale is passthrough, NOT income.
const rows = [
  row({ id: 1, amount: 1000, farmOwnershipType: 'OWN' }),
  row({ id: 2, amount: 2000, farmOwnershipType: 'RELATIVE' }),
  row({
    id: 3,
    type: 'OUT',
    category: 'OWNER_SETTLEMENT',
    amount: 2000,
    farmOwnershipType: 'RELATIVE',
  }),
  row({ id: 4, type: 'OUT', category: 'PERTANIAN', amount: 300 }),
  row({ id: 5, amount: 50, category: 'OPENING_BALANCE', transactionDate: day(1) }),
];

const s = summarize(rows, day(5), day(20));
console.assert(s.totalIncome === 1000, 'income excludes relative sale', s.totalIncome);
console.assert(s.totalExpense === 2300, 'expense counts owner settlement', s.totalExpense);
console.assert(s.netCashFlow === -1300, 'net', s.netCashFlow);
console.assert(s.openingBalance === 50, 'opening balance', s.openingBalance);
console.assert(s.closingBalance === -1250, 'closing', s.closingBalance);
console.assert(s.passthrough.salesIn === 2000, 'passthrough', s.passthrough);
console.assert(s.transactionCount === 3, 'count excludes passthrough', s.transactionCount);
console.assert(s.closingBalance === 50 + 1000 - 2000 - 300, 'reconciles');

// Daily series covers empty days and skips passthrough.
const series = dailySeries(rows, day(9), day(11));
console.assert(series.length === 3, 'series length');
console.assert(series[1].income === 1000 && series[1].expense === 2300, 'day 10', series[1]);
console.assert(series[0].income === 0 && series[0].expense === 0, 'empty day');

// classify keeps the signed direction independent of the raw type string.
console.assert(classify(row({ type: 'IN', amount: -5 })).amount === 5, 'abs amount');

// openingBalanceBefore ignores the start day itself.
console.assert(openingBalanceBefore(rows, day(1)) === 0, 'opening before first day');

console.log('financial-explorer.calculator self-check passed');
