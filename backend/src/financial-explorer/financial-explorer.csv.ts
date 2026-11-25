import { ymd } from './financial-explorer.calculator';
import { flowRoleFor } from './money-flow-role';

/**
 * CSV presenter for the transaction export. It only formats rows that the
 * explorer already reads; no figure is recalculated here.
 */
export const CSV_COLUMNS = [
  'transaction_date',
  'description',
  'category',
  'direction',
  'amount',
  'reference_type',
  'reference_id',
  'person_name',
  'farm_name',
  'settlement_gross',
  'worker_share',
  'kasbon_deduction',
  'net_payment',
  'financial_role',
] as const;

export type CsvSettlement = {
  grossShare: unknown;
  kasbonAmount: unknown;
  deductionAmount: unknown;
  netAmount: unknown;
  worker: { name: string };
  sale: { farm: { name: string } | null } | null;
};

export type CsvRow = {
  transactionDate: Date;
  description: string | null;
  category: string;
  type: string;
  amount: unknown;
  referenceType: string | null;
  referenceId: number | null;
  farm: { name: string; ownershipType: string | null } | null;
  settlement: CsvSettlement | null;
};

/** Excel treats a leading =, +, -, @ or tab as a formula, so force text. */
function text(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180 escaping: quote when the value holds a delimiter, quote or break. */
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function amount(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '';
}

export function csvHeaderLine(): string {
  return `${CSV_COLUMNS.join(',')}\r\n`;
}

export function csvLineFor(row: CsvRow, ownerName?: string | null): string {
  const settlement = row.settlement;
  const cells = [
    ymd(row.transactionDate),
    text(row.description),
    text(row.category),
    text(row.type),
    amount(row.amount),
    text(row.referenceType),
    row.referenceId === null ? '' : String(row.referenceId),
    text(settlement?.worker.name ?? ownerName),
    text(settlement?.sale?.farm?.name ?? row.farm?.name),
    amount(settlement?.grossShare),
    amount(settlement?.grossShare),
    amount(settlement?.deductionAmount),
    amount(settlement?.netAmount),
    text(
      flowRoleFor({
        category: row.category,
        farmOwnershipType: row.farm?.ownershipType ?? null,
      }),
    ),
  ];

  return `${cells.map(csvCell).join(',')}\r\n`;
}
