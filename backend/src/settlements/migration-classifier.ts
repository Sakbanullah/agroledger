/**
 * Pure mirror of the historical backfill in
 * prisma/migrations/20261121120000_settlement_payment_status/migration.sql.
 *
 * The SQL itself still has to run once, reviewed, against a copy of the real
 * database; this function only makes the classification rules executable and
 * testable without a database. It must stay in sync with the SQL WHERE
 * clauses; the spec next to it is the contract for both.
 *
 * The SQL only touches settlements that still carry the old CONFIRMED status.
 * Every other row - including CANCELLED, which may keep its historic amounts
 * but is never written by the backfill - is classified BACKFILL_EXCLUDED so a
 * preview can say so explicitly instead of reporting it as unproven.
 */

export interface HistoricalSettlement {
  id: number;
  status: string;
  grossShare: number;
  deductionAmount: number;
  netAmount: number;
}

/** The only status the backfill rewrites. */
export const BACKFILL_SOURCE_STATUS = 'CONFIRMED';

export interface HistoricalMoneyRow {
  id: number;
  settlementId: number;
  type: 'IN' | 'OUT';
  amount: number;
}

export interface HistoricalCreditRow {
  id: number;
  settlementId: number;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
}

export type HistoricalClassification =
  | { status: 'PAID_OUT'; settlementMethod: 'CASH'; evidenceMoneyTransactionId: number }
  | { status: 'SETTLED_BY_OFFSET'; settlementMethod: 'OFFSET'; evidenceCreditTransactionId: number }
  | { status: 'NO_BALANCE'; settlementMethod: 'NO_BALANCE' }
  | { status: 'PENDING'; reconciliationStatus: 'REQUIRED' }
  | { status: 'BACKFILL_EXCLUDED'; reason: 'STATUS' };

export function classifyHistoricalSettlement(
  settlement: HistoricalSettlement,
  money: HistoricalMoneyRow[],
  credit: HistoricalCreditRow[],
): HistoricalClassification {
  if (settlement.status !== BACKFILL_SOURCE_STATUS) {
    return { status: 'BACKFILL_EXCLUDED', reason: 'STATUS' };
  }

  const rows = money.filter((row) => row.settlementId === settlement.id);
  const payments = credit.filter(
    (row) => row.settlementId === settlement.id && row.type === 'PAYMENT',
  );

  const onlyOut = rows.length === 1 && rows[0].type === 'OUT';

  if (settlement.netAmount > 0 && settlement.deductionAmount === 0) {
    const exact = rows.filter(
      (row) => row.type === 'OUT' && row.amount === settlement.netAmount,
    );

    if (onlyOut && exact.length === 1 && credit.every((c) => c.settlementId !== settlement.id)) {
      return {
        status: 'PAID_OUT',
        settlementMethod: 'CASH',
        evidenceMoneyTransactionId: rows[0].id,
      };
    }
  }

  // Cash + kasbon: the same NOT EXISTS on any credit row the cash-only branch
  // applies, so a stray DEBT or a second PAYMENT of another amount is not
  // silently accepted as the proven shape.
  if (settlement.netAmount > 0 && settlement.deductionAmount > 0) {
    const exactPayments = payments.filter(
      (row) => row.amount === settlement.deductionAmount,
    );

    if (
      onlyOut &&
      rows[0].amount === settlement.netAmount &&
      payments.length === 1 &&
      exactPayments.length === 1 &&
      credit.every((c) => c.settlementId !== settlement.id || c.type === 'PAYMENT')
    ) {
      return {
        status: 'PAID_OUT',
        settlementMethod: 'CASH',
        evidenceMoneyTransactionId: rows[0].id,
      };
    }
  }

  if (
    settlement.netAmount === 0 &&
    settlement.grossShare > 0 &&
    settlement.deductionAmount === settlement.grossShare
  ) {
    const exactPayments = payments.filter(
      (row) => row.amount === settlement.deductionAmount,
    );

    if (
      rows.length === 0 &&
      settlement.deductionAmount > 0 &&
      payments.length === 1 &&
      exactPayments.length === 1 &&
      credit.every((c) => c.settlementId !== settlement.id || c.type === 'PAYMENT')
    ) {
      return {
        status: 'SETTLED_BY_OFFSET',
        settlementMethod: 'OFFSET',
        evidenceCreditTransactionId: payments[0].id,
      };
    }
  }

  // BD-17: nothing was ever owed. Every condition must hold: gross 0,
  // deduction 0, net 0, and not a single payment or kasbon row for the
  // settlement. Anything else falls through to reconciliation.
  if (
    settlement.grossShare === 0 &&
    settlement.deductionAmount === 0 &&
    settlement.netAmount === 0 &&
    rows.length === 0 &&
    credit.every((row) => row.settlementId !== settlement.id)
  ) {
    return { status: 'NO_BALANCE', settlementMethod: 'NO_BALANCE' };
  }

  return { status: 'PENDING', reconciliationStatus: 'REQUIRED' };
}
