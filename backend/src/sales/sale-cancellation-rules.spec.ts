import { SETTLEMENT_STATUS } from '../settlements/settlement-status';
import { cancellationBlocker } from './sale-status';
import { settlementReversalAllowed } from './sale-cancellation-rules';

describe('cancellation cash reversal rules', () => {
  it('never reverses a settlement that handed nothing over', () => {
    expect(settlementReversalAllowed(SETTLEMENT_STATUS.PENDING)).toBe(false);
    expect(settlementReversalAllowed(SETTLEMENT_STATUS.NO_BALANCE)).toBe(false);
  });

  it('reverses a settlement that actually moved money', () => {
    expect(settlementReversalAllowed(SETTLEMENT_STATUS.PAID_OUT)).toBe(true);
    expect(settlementReversalAllowed(SETTLEMENT_STATUS.SETTLED_BY_OFFSET)).toBe(
      true,
    );
  });

  it('a sale with only zero-balance settlements can be cancelled', () => {
    expect(
      cancellationBlocker({
        status: 'COMPLETED',
        settlements: [{ status: SETTLEMENT_STATUS.NO_BALANCE }],
        ownerSettlements: [],
      }),
    ).toBeNull();
  });

  it('but no sale with a settled worker ever reaches the reversal step', () => {
    for (const status of [
      SETTLEMENT_STATUS.PAID_OUT,
      SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
    ]) {
      expect(
        cancellationBlocker({
          status: 'COMPLETED',
          settlements: [{ status }],
          ownerSettlements: [],
        }),
      ).toMatch(/pembayaran pekerja/);
    }
  });
});
