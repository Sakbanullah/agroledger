// Mirrors SettlementCompletionState in
// backend/src/settlements/settlement-status.ts. The frontend must not import
// from backend/, so the values are kept here and the runtime check asserts
// they still read the same payload shape.
export type SettlementCompletionState =
  | "NOT_SETTLED"
  | "PARTIALLY_SETTLED"
  | "FULLY_SETTLED";

/**
 * Shape of GET /settlements/sale/:saleId.
 *
 * The endpoint answers with an envelope so it can also report the computed
 * completion state of the sale's settlements:
 *   { saleId, completionState, settlements: [...] }
 *
 * Older clients expected a bare array. Reading the envelope defensively keeps
 * that mismatch from turning into an empty settlement list, which would make
 * the page offer "save calculation" for a sale that is already calculated.
 */
export function readSettlementList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { settlements?: unknown }).settlements)
  ) {
    return (payload as { settlements: T[] }).settlements;
  }

  return [];
}

export function readCompletionState(
  payload: unknown,
): SettlementCompletionState {
  const value =
    payload && typeof payload === "object"
      ? (payload as { completionState?: unknown }).completionState
      : undefined;

  if (
    value === "NOT_SETTLED" ||
    value === "PARTIALLY_SETTLED" ||
    value === "FULLY_SETTLED"
  ) {
    return value;
  }

  return "NOT_SETTLED";
}

/**
 * What the settlement page may do after loading a sale.
 *   CALCULATE  no settlement yet, so the calculation can be saved;
 *   REVIEW     a calculation exists; paying happens on the check page.
 * The envelope carries the list, so a calculated sale must never show the
 * calculate button again (the backend would answer 400).
 */
export type SettlementPageMode = "CALCULATE" | "REVIEW";

export function settlementPageMode(payload: unknown): SettlementPageMode {
  return readSettlementList(payload).length > 0 ? "REVIEW" : "CALCULATE";
}
