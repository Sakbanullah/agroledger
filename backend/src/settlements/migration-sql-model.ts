/**
 * Executable model of the WHERE clauses in
 * prisma/migrations/20261121120000_settlement_payment_status/migration.sql,
 * used to prove the TypeScript classifier and the backfill SQL agree.
 *
 * The migration has already run against the local database, so its behaviour
 * cannot be re-observed there; this model is the evidence used instead. Each
 * predicate carries `cursor`, the line of the migration that states it, and
 * migration-sql-model.spec.ts checks that the SQL at that line still says what
 * the model assumes. If the migration text moves, the test fails instead of the
 * model silently drifting.
 *
 * Evaluation order mirrors the SQL file: the first UPDATE whose WHERE matches
 * writes the status, and later UPDATEs never see that row again. A row that
 * matches none of them ends as PENDING + REQUIRED (migration lines 238-241).
 *
 * Limitations:
 * - This is a model, not the server. It has been checked statement by statement
 *   against a real MySQL connection, but it is not executed by the test suite,
 *   so "the SQL runs" is not claimed by any passing test here.
 * - The backfill wrote statuses directly; nothing records which UPDATE wrote a
 *   row, so a row that matches UPDATE 2 by chance is indistinguishable from one
 *   the old code produced. The verification migration accepts the shape, not
 *   the provenance.
 * - The verification migration checks each status's own shapes only. It cannot
 *   see a row that carries a status its rows were never checked against (for
 *   example an offset row labelled PAID_OUT).
 */
import type {
  HistoricalCreditRow,
  HistoricalMoneyRow,
  HistoricalSettlement,
} from './migration-classifier';

export type SqlOutcome =
  | 'PAID_OUT'
  | 'SETTLED_BY_OFFSET'
  | 'NO_BALANCE'
  | 'PENDING_REQUIRED'
  | 'UNTOUCHED';

export interface MigrationInput {
  settlement: HistoricalSettlement;
  money: HistoricalMoneyRow[];
  credit: HistoricalCreditRow[];
}

export interface MigrationRule {
  /** Identifies the same check in the SQL file and in the TypeScript classifier. */
  name: string;
  /** Line in the migration file that states the predicate. */
  cursor: number;
  /** Text of that statement must contain these fragments. */
  evidence: string[];
  matches: (input: MigrationInput) => boolean;
  outcome: SqlOutcome;
}

const moneyOf = ({ settlement, money }: MigrationInput): HistoricalMoneyRow[] =>
  money.filter((row) => row.settlementId === settlement.id);

const creditOf = ({ settlement, credit }: MigrationInput): HistoricalCreditRow[] =>
  credit.filter((row) => row.settlementId === settlement.id);

const rows = (input: MigrationInput) => ({
  ...input,
  money: moneyOf(input),
  credit: creditOf(input),
});

const cashIsExactly = (money: HistoricalMoneyRow[], settlement: HistoricalSettlement): boolean =>
  money.length === 1 &&
  money.filter((row) => row.type === 'OUT' && row.amount === settlement.netAmount).length === 1;

const exactPayments = (credit: HistoricalCreditRow[], amount: number): number =>
  credit.filter((row) => row.type === 'PAYMENT' && row.amount === amount).length;

const countsOnlyExactPayments = (input: MigrationInput): boolean => {
  const { settlement: s, money, credit } = rows(input);

  return (
    s.status === 'CONFIRMED' &&
    s.netAmount > 0 &&
    s.deductionAmount > 0 &&
    cashIsExactly(money, s) &&
    exactPayments(credit, s.deductionAmount) === 1
  );
};

const backfillRules: Record<string, (input: MigrationInput) => boolean> = {
  paidOutCashKasbon: countsOnlyExactPayments,
  paidOutCashOnly: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'CONFIRMED' &&
      s.netAmount > 0 &&
      s.deductionAmount === 0 &&
      cashIsExactly(money, s) &&
      credit.length === 0
    );
  },
  offset: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'CONFIRMED' &&
      s.netAmount === 0 &&
      s.grossShare > 0 &&
      s.deductionAmount === s.grossShare &&
      money.length === 0 &&
      exactPayments(credit, s.deductionAmount) === 1
    );
  },
  noBalance: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'CONFIRMED' &&
      s.grossShare === 0 &&
      s.deductionAmount === 0 &&
      s.netAmount === 0 &&
      money.length === 0 &&
      credit.length === 0
    );
  },
};

/** What 20261121120000_settlement_payment_status writes, in file order. */
export const BACKFILL_RULES: MigrationRule[] = [
  {
    name: 'paidOutCashKasbon',
    cursor: 117,
    evidence: [
      "s.status = 'CONFIRMED'",
      's.netAmount > 0',
      's.deductionAmount > 0',
      "mt.type = 'OUT' AND mt.amount = s.netAmount",
      "c.type = 'PAYMENT' AND c.amount = s.deductionAmount",
    ],
    matches: backfillRules.paidOutCashKasbon,
    outcome: 'PAID_OUT',
  },
  {
    name: 'paidOutCashOnly',
    cursor: 153,
    evidence: [
      "s.status = 'CONFIRMED'",
      's.netAmount > 0',
      's.deductionAmount = 0',
      "mt.type = 'OUT' AND mt.amount = s.netAmount",
      'NOT EXISTS (',
    ],
    matches: backfillRules.paidOutCashOnly,
    outcome: 'PAID_OUT',
  },
  {
    name: 'offset',
    cursor: 189,
    evidence: [
      "s.status = 'CONFIRMED'",
      's.netAmount = 0',
      's.grossShare > 0',
      's.deductionAmount = s.grossShare',
      'NOT EXISTS (',
      "c.type = 'PAYMENT' AND c.amount = s.deductionAmount",
    ],
    matches: backfillRules.offset,
    outcome: 'SETTLED_BY_OFFSET',
  },
  {
    name: 'noBalance',
    cursor: 217,
    evidence: [
      "s.status = 'CONFIRMED'",
      's.grossShare = 0',
      's.deductionAmount = 0',
      's.netAmount = 0',
      'NOT EXISTS (',
    ],
    matches: backfillRules.noBalance,
    outcome: 'NO_BALANCE',
  },
];

/**
 * What 20261125120000_verify_settlement_backfill_payment_shapes accepts: a row
 * with the post-backfill status passes only if its rows prove the shape. The
 * verification is stricter than the backfill it checks (a second PAYMENT of
 * another amount fails even though the backfill counted it as exact), which is
 * the whole point of that migration.
 */
const verificationRules: Record<string, (input: MigrationInput) => boolean> = {
  paidOutCashKasbon: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'PAID_OUT' &&
      s.deductionAmount > 0 &&
      cashIsExactly(money, s) &&
      credit.length === 1 &&
      exactPayments(credit, s.deductionAmount) === 1
    );
  },
  paidOutCashOnly: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'PAID_OUT' &&
      s.deductionAmount === 0 &&
      cashIsExactly(money, s) &&
      credit.length === 0
    );
  },
  offset: (input) => {
    const { settlement: s, money, credit } = rows(input);

    return (
      s.status === 'SETTLED_BY_OFFSET' &&
      money.length === 0 &&
      credit.length === 1 &&
      exactPayments(credit, s.deductionAmount) === 1
    );
  },
  noBalance: (input) => {
    const { settlement: s, credit } = rows(input);

    return s.status === 'NO_BALANCE' && credit.length === 0;
  },
};

/**
 * Where each verification check is stated in
 * 20261125120000_verify_settlement_backfill_payment_shapes/migration.sql.
 */
export const VERIFICATION_PINS: Array<{ name: string; cursor: number; evidence: string[] }> = [
  { name: 'paidOutCashKasbon', cursor: 30, evidence: ["s.status = 'PAID_OUT'", 's.deductionAmount > 0', "c.type = 'PAYMENT' AND c.amount = s.deductionAmount"] },
  { name: 'paidOutCashOnly', cursor: 51, evidence: ["s.status = 'PAID_OUT'", 's.deductionAmount = 0'] },
  { name: 'offset', cursor: 66, evidence: ["s.status = 'SETTLED_BY_OFFSET'", "c.type = 'PAYMENT' AND c.amount = s.deductionAmount", "mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id"] },
  { name: 'noBalance', cursor: 90, evidence: ["s.status = 'NO_BALANCE'"] },
];

/** True when the row proves the status the backfill gave it. */
export const VERIFICATION_CHECKS: Array<[name: string, holds: (input: MigrationInput) => boolean]> = [
  ['paidOutCashKasbon', verificationRules.paidOutCashKasbon],
  ['paidOutCashOnly', verificationRules.paidOutCashOnly],
  ['offset', verificationRules.offset],
  ['noBalance', verificationRules.noBalance],
];

/**
 * PENDING_REQUIRED means "the row is not proven". For the backfill that is the
 * status it writes last; for the verification migration it means the SIGNAL
 * fires and the migration aborts.
 */
const classifyWith = (rules: MigrationRule[], input: MigrationInput): SqlOutcome => {
  const matched = rules.find((rule) => rule.matches(input));

  return matched ? matched.outcome : 'PENDING_REQUIRED';
};

export const classifyAsBackfillSql = (input: MigrationInput): SqlOutcome => {
  // Lines 238-241: only rows still CONFIRMED when the file runs are rewritten.
  if (input.settlement.status !== 'CONFIRMED') {
    return 'UNTOUCHED';
  }

  return classifyWith(BACKFILL_RULES, input);
};

export const classifyAsVerificationSql = (input: MigrationInput): SqlOutcome => {
  const status = input.settlement.status;
  const holds = VERIFICATION_CHECKS.some(([, check]) => check(input));

  return status === 'CONFIRMED' || !holds ? 'PENDING_REQUIRED' : (status as SqlOutcome);
};
