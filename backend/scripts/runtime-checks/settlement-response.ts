/**
 * Harness copy of lib/settlement-response.ts.
 *
 * The runtime-check compiler keeps `rootDir` at backend/ (so the backend
 * services land in the expected output path) and cannot pull files from the
 * repository-root `lib/`. This file must stay behaviourally identical; the
 * check drives it through the same payloads the page receives.
 *
 * Mirrors SettlementCompletionState in
 * backend/src/settlements/settlement-status.ts.
 */
export type SettlementCompletionState =
  | "NOT_SETTLED"
  | "PARTIALLY_SETTLED"
  | "FULLY_SETTLED";

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
