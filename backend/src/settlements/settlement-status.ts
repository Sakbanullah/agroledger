/**
 * Settlement lifecycle (Karet worker share).
 *
 * PENDING            calculated; nothing handed over, kasbon not deducted yet
 * PAID_OUT           net cash handed to the worker; one MoneyTransaction OUT
 * SETTLED_BY_OFFSET  gross share fully covered by the kasbon deduction (net 0),
 *                    so no cash moved; the deduction is recorded as a
 *                    CreditTransaction PAYMENT
 * NO_BALANCE         nothing was ever owed: gross 0, no kasbon to apply and no
 *                    payment rows. Closed without any transaction (BD-17).
 * CANCELLED          cancelled through the sale's deletion
 *
 * COMPLETED does not exist here any more: finishing the calculation no longer
 * means money moved.
 */
export const SETTLEMENT_STATUS = {
  PENDING: 'PENDING',
  PAID_OUT: 'PAID_OUT',
  SETTLED_BY_OFFSET: 'SETTLED_BY_OFFSET',
  NO_BALANCE: 'NO_BALANCE',
  CANCELLED: 'CANCELLED',
} as const;

export type SettlementStatus =
  (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

/** Statuses after which a settlement can no longer change or be deleted. */
export const SETTLEMENT_SETTLED_STATUSES = [
  SETTLEMENT_STATUS.PAID_OUT,
  SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
] as const;

/** Every status that closed without anything being handed over or deducted. */
export const SETTLEMENT_NON_PAYMENT_STATUSES = [
  SETTLEMENT_STATUS.PAID_OUT,
  SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
  SETTLEMENT_STATUS.NO_BALANCE,
] as const;

export function isSettlementSettled(status: string): boolean {
  return (SETTLEMENT_SETTLED_STATUSES as readonly string[]).includes(status);
}

/**
 * True only for the statuses a cancellation/deletion must respect. NO_BALANCE
 * moves no money, so it does not create anything that a reversal could
 * corrupt and it is deliberately absent here (BD-17).
 */
export function isSettlementPaymentGuarded(status: string): boolean {
  return isSettlementSettled(status);
}

/**
 * True when a status means the settlement is closed for any reason, including
 * NO_BALANCE. Used for presenting and aggregating completion.
 */
export function isSettlementClosed(status: string): boolean {
  return (SETTLEMENT_NON_PAYMENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Reconciliation is a second, orthogonal dimension: it says whether the stored
 * record of an old settlement can be trusted, not what happened to the money.
 * null means the settlement is normal and needs no reconciliation.
 */
export const RECONCILIATION_STATUS = {
  REQUIRED: 'REQUIRED',
  RESOLVED: 'RESOLVED',
} as const;

export type ReconciliationStatus =
  (typeof RECONCILIATION_STATUS)[keyof typeof RECONCILIATION_STATUS];

/** Prisma filter for settlements whose history awaits reconciliation. */
export const reconciliationRequiredFilter = {
  reconciliationStatus: RECONCILIATION_STATUS.REQUIRED,
} as const;

/**
 * Decisions a reconciliation may record. Each one is backed by evidence the
 * admin reviewed; none of them writes a MoneyTransaction or a CreditTransaction.
 *
 * CORRECTED is deliberately absent: correcting stored amounts is an open
 * Product Owner decision.
 */
export type ReconciliationDecision = 'PAID_OUT' | 'SETTLED_BY_OFFSET';

export const RECONCILIATION_DECISIONS: readonly ReconciliationDecision[] = [
  'PAID_OUT',
  'SETTLED_BY_OFFSET',
];

/**
 * Whether a decision is even possible for the stored figures:
 *   PAID_OUT           needs a positive net (cash was handed over);
 *   SETTLED_BY_OFFSET  needs the deduction to cover the whole share;
 *   NO_BALANCE         needs a zero balance with no debt and no payment at all
 *                      (BD-17), proven at decision time by the service.
 */
export function reconciliationDecisionAllowed(
  decision: ReconciliationDecision,
  settlement: { grossShare: unknown; deductionAmount: unknown; netAmount: unknown },
): boolean {
  const gross = Number(settlement.grossShare);
  const deduction = Number(settlement.deductionAmount);
  const net = Number(settlement.netAmount);

  if (decision === 'PAID_OUT') {
    return Number.isFinite(net) && net > 0;
  }

  return (
    Number.isFinite(gross) &&
    Number.isFinite(deduction) &&
    gross > 0 &&
    net === 0 &&
    deduction === gross
  );
}

/** Why a decision cannot be taken for the stored figures (admin-facing). */
export function reconciliationDecisionMessage(
  decision: ReconciliationDecision,
  settlement: { grossShare: unknown; deductionAmount: unknown; netAmount: unknown },
): string {
  if (decision === 'PAID_OUT') {
    return 'Keputusan PAID_OUT membutuhkan net pembayaran lebih dari Rp0 pada settlement ini';
  }

  return 'Keputusan SETTLED_BY_OFFSET hanya berlaku bila potongan kasbon menutup seluruh hak pekerja (net Rp0)';
}

/**
 * Aggregate completion of a sale's worker settlements. Deliberately not named
 * after cash: a worker settled through the kasbon offset was never paid cash.
 */
export type SettlementCompletionState =
  | 'NOT_SETTLED'
  | 'PARTIALLY_SETTLED'
  | 'FULLY_SETTLED';

/**
 * Computed from every settlement row of the sale, never stored: the settlement
 * rows are the single source of truth.
 *
 * PENDING (and CANCELLED) rows count as not settled. A sale without
 * settlements is NOT_SETTLED.
 */
export function salePaymentState(
  settlements: { status: string }[],
): SettlementCompletionState {
  if (settlements.length === 0) {
    return 'NOT_SETTLED';
  }

  const settled = settlements.filter((row) => isSettlementClosed(row.status))
    .length;

  if (settled === settlements.length) {
    return 'FULLY_SETTLED';
  }

  return settled === 0 ? 'NOT_SETTLED' : 'PARTIALLY_SETTLED';
}

/**
 * What settling a PENDING settlement will record, decided from the stored
 * numbers alone:
 *   INVALID     figures disagree (negative, not adding up, or a zero net the
 *               deduction does not cover);
 *   NO_BALANCE  gross 0 with nothing deducted (BD-17): nothing is owed, so
 *               there is no cash to hand over and no kasbon to apply;
 *   OFFSET      the kasbon deduction covers the entire gross share (net 0),
 *               so no cash can move;
 *   CASH        a net amount is handed to the worker.
 */
export type SettlementSettlementMethod = 'CASH' | 'OFFSET' | 'NO_BALANCE' | 'INVALID';

export function resolveSettlementMethod(input: {
  grossShare: unknown;
  deductionAmount: unknown;
  netAmount: unknown;
}): SettlementSettlementMethod {
  const gross = Number(input.grossShare);
  const deduction = Number(input.deductionAmount);
  const net = Number(input.netAmount);

  if (!Number.isFinite(gross) || !Number.isFinite(deduction) || !Number.isFinite(net)) {
    return 'INVALID';
  }

  if (gross < 0 || deduction < 0 || net < 0) {
    return 'INVALID';
  }

  // BD-17: nothing owed, nothing deducted, nothing to hand over.
  if (gross === 0) {
    return deduction === 0 && net === 0 ? 'NO_BALANCE' : 'INVALID';
  }

  if (net === 0) {
    // A zero net is an offset only when the deduction covers the whole share.
    return deduction === gross ? 'OFFSET' : 'INVALID';
  }

  // Stored figures must add up. The stored deduction is the kasbon snapshot
  // from calculation time; the payment step compares it against the live debt
  // separately.
  if (gross !== net + deduction) {
    return 'INVALID';
  }

  return 'CASH';
}
