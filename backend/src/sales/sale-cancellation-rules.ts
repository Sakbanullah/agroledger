import { isSettlementSettled } from '../settlements/settlement-status';

/**
 * Whether cancelling the sale may write a reversal for a settlement's cash.
 *
 * Cancellation reverses cash that was actually paid to a worker. A settlement
 * that is still PENDING or closed as NO_BALANCE never handed money over, so a
 * reversal for it would record a cash-in that never happened. Settlements can
 * only reach this check in the unsettled states, because the cancellation
 * blocker refuses the sale once any settlement is settled (BD decision: paid
 * workers are never reversed by the normal cancellation path).
 */
export function settlementReversalAllowed(status: string): boolean {
  return isSettlementSettled(status);
}
