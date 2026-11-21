/**
 * Global lock order for financial transactions.
 *
 * Every transaction that needs more than one row lock must take them in this
 * order; a path that takes them the other way round can deadlock with it.
 * MySQL reports deadlocks as errors rather than corrupting data, but a refusal
 * mid-operation is still a broken user action, so the order is fixed here and
 * every lock site below follows it.
 *
 *   Sale  ->  Settlement  ->  CreditAccount  ->  OwnerSettlement
 *
 * Current callers:
 *   - cancelSale        Sale, then settlements (id ASC)
 *   - deleteDraftSale   Sale, then settlements
 *   - settleSale        Sale, then settlements (id ASC), then CreditAccount
 *   - paySettlement     Sale, then the one settlement, then CreditAccount
 *   - reconcileSettlement  Sale, then the one settlement
 *   - owner pay         OwnerSettlement only, so it cannot participate
 *   - credit payment    CreditAccount only (no Sale, no Settlement)
 *
 * A single-row operation may lock only its own entity; it must not take a
 * later entity before an earlier one. When a lock site cannot follow the order
 * for a real reason, document it here as a partial order rather than leaving
 * it implicit.
 */
export const LOCK_ORDER = [
  'Sale',
  'Settlement',
  'CreditAccount',
  'OwnerSettlement',
] as const;

export type LockedEntity = (typeof LOCK_ORDER)[number];

/** Rank of an entity in the global order; lower locks first. */
export function lockRank(entity: LockedEntity): number {
  return LOCK_ORDER.indexOf(entity);
}

/** True when locking `next` after `previous` respects the global order. */
export function respectsLockOrder(previous: LockedEntity, next: LockedEntity) {
  return lockRank(previous) < lockRank(next);
}
