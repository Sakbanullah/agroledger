/**
 * Runtime check: the settlement page reads GET /settlements/sale/:id the same
 * way the API writes it.
 *
 * Prevents the regression where the endpoint switched from a bare array to an
 * envelope and the page kept treating the payload as an array, showing an empty
 * settlement list for a sale that already had one.
 */
import {
  readCompletionState,
  readSettlementList,
  settlementPageMode,
} from './settlement-response';

export async function checkSettlementResponse(): Promise<void> {
  const rows = [{ id: 50, saleId: 10, status: 'PENDING' }];

  const envelope = {
    saleId: 10,
    completionState: 'NOT_SETTLED',
    settlements: rows,
  };

  if (readSettlementList(envelope).length !== 1) {
    throw new Error('the envelope list is not read');
  }

  if (settlementPageMode(envelope) !== 'REVIEW') {
    throw new Error('a calculated sale would offer the calculate action again');
  }

  process.stdout.write('PASS envelope is read as one settlement\n');

  if (readSettlementList(rows).length !== 1) {
    throw new Error('a bare array no longer reads as settlements');
  }

  process.stdout.write('PASS a bare array is still accepted\n');

  if (settlementPageMode({ saleId: 10, completionState: 'NOT_SETTLED', settlements: [] }) !== 'CALCULATE') {
    throw new Error('a sale without settlements should allow calculation');
  }

  for (const [payload, expected] of [
    [null, 'NOT_SETTLED'],
    [{}, 'NOT_SETTLED'],
    [{ completionState: 'nope' }, 'NOT_SETTLED'],
    [{ completionState: 'FULLY_SETTLED' }, 'FULLY_SETTLED'],
    [{ completionState: 'PARTIALLY_SETTLED' }, 'PARTIALLY_SETTLED'],
  ] as const) {
    if (readCompletionState(payload) !== expected) {
      throw new Error(`completion state ${JSON.stringify(payload)} was misread`);
    }
  }

  process.stdout.write('PASS completion state is read safely\n');
}
