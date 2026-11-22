import {
  RECONCILIATION_STATUS,
  SETTLEMENT_STATUS,
  isSettlementClosed,
  isSettlementPaymentGuarded,
  isSettlementSettled,
  reconciliationDecisionAllowed,
  reconciliationDecisionMessage,
  resolveSettlementMethod,
  salePaymentState,
} from './settlement-status';

describe('resolveSettlementMethod (net 0 is not automatically an offset)', () => {
  it('is CASH when a net amount is handed over', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 4000,
        netAmount: 6000,
      }),
    ).toBe('CASH');
  });

  it('is CASH when nothing is deducted', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 0,
        netAmount: 10000,
      }),
    ).toBe('CASH');
  });

  it('is OFFSET only when the deduction covers the whole share', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 10000,
        netAmount: 0,
      }),
    ).toBe('OFFSET');
  });

  it('is INVALID when a zero net is not fully covered by the deduction', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 4000,
        netAmount: 0,
      }),
    ).toBe('INVALID');
  });

  it('is NO_BALANCE for gross 0 with nothing deducted (BD-17)', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 0,
        deductionAmount: 0,
        netAmount: 0,
      }),
    ).toBe('NO_BALANCE');
  });

  it('is INVALID for gross 0 with a deduction', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 0,
        deductionAmount: 1000,
        netAmount: 0,
      }),
    ).toBe('INVALID');
  });

  it('is INVALID when the figures do not add up', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 4000,
        netAmount: 5000,
      }),
    ).toBe('INVALID');
  });

  it('is INVALID for negative or non-finite figures', () => {
    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: -1,
        netAmount: 10001,
      }),
    ).toBe('INVALID');

    expect(
      resolveSettlementMethod({
        grossShare: 10000,
        deductionAmount: 4000,
        netAmount: Number.NaN,
      }),
    ).toBe('INVALID');
  });
});

describe('salePaymentState (computed from settlement rows)', () => {
  it('is NOT_SETTLED when every worker is still pending', () => {
    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.PENDING },
        { status: SETTLEMENT_STATUS.PENDING },
      ]),
    ).toBe('NOT_SETTLED');
  });

  it('is PARTIALLY_SETTLED when only some workers settled', () => {
    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.PAID_OUT },
        { status: SETTLEMENT_STATUS.PENDING },
      ]),
    ).toBe('PARTIALLY_SETTLED');

    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.SETTLED_BY_OFFSET },
        { status: SETTLEMENT_STATUS.PENDING },
      ]),
    ).toBe('PARTIALLY_SETTLED');
  });

  it('is FULLY_SETTLED when cash and offset settlements cover every worker', () => {
    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.PAID_OUT },
        { status: SETTLEMENT_STATUS.SETTLED_BY_OFFSET },
      ]),
    ).toBe('FULLY_SETTLED');
  });

  it('treats a cancelled settlement like an unsettled one', () => {
    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.CANCELLED },
        { status: SETTLEMENT_STATUS.PENDING },
      ]),
    ).toBe('NOT_SETTLED');
  });

  it('is NOT_SETTLED with no settlements at all', () => {
    expect(salePaymentState([])).toBe('NOT_SETTLED');
  });

  it('NO_BALANCE is closed but never a payment', () => {
    expect(isSettlementClosed(SETTLEMENT_STATUS.NO_BALANCE)).toBe(true);
    expect(isSettlementPaymentGuarded(SETTLEMENT_STATUS.NO_BALANCE)).toBe(false);
    expect(isSettlementSettled(SETTLEMENT_STATUS.NO_BALANCE)).toBe(false);
    expect(salePaymentState([{ status: SETTLEMENT_STATUS.NO_BALANCE }])).toBe(
      'FULLY_SETTLED',
    );
    expect(
      salePaymentState([
        { status: SETTLEMENT_STATUS.NO_BALANCE },
        { status: SETTLEMENT_STATUS.PENDING },
      ]),
    ).toBe('PARTIALLY_SETTLED');
  });

  it('counts only cash and offset as settled', () => {
    expect(isSettlementSettled(SETTLEMENT_STATUS.PAID_OUT)).toBe(true);
    expect(isSettlementSettled(SETTLEMENT_STATUS.SETTLED_BY_OFFSET)).toBe(true);
    expect(isSettlementSettled(SETTLEMENT_STATUS.PENDING)).toBe(false);
    expect(isSettlementSettled(SETTLEMENT_STATUS.CANCELLED)).toBe(false);
    expect(isSettlementSettled('CONFIRMED')).toBe(false);
    expect(isSettlementSettled('NO_BALANCE')).toBe(false);
    expect(isSettlementPaymentGuarded('NO_BALANCE')).toBe(false);
  });
});

describe('reconciliation decisions', () => {
  it('allows PAID_OUT only when there is a net to have handed over', () => {
    expect(
      reconciliationDecisionAllowed('PAID_OUT', {
        grossShare: 11000,
        deductionAmount: 4000,
        netAmount: 7000,
      }),
    ).toBe(true);

    expect(
      reconciliationDecisionAllowed('PAID_OUT', {
        grossShare: 10000,
        deductionAmount: 10000,
        netAmount: 0,
      }),
    ).toBe(false);
  });

  it('allows SETTLED_BY_OFFSET only when the deduction covers the whole share', () => {
    expect(
      reconciliationDecisionAllowed('SETTLED_BY_OFFSET', {
        grossShare: 10000,
        deductionAmount: 10000,
        netAmount: 0,
      }),
    ).toBe(true);

    expect(
      reconciliationDecisionAllowed('SETTLED_BY_OFFSET', {
        grossShare: 11000,
        deductionAmount: 4000,
        netAmount: 7000,
      }),
    ).toBe(false);
  });

  it('explains a refused decision', () => {
    expect(
      reconciliationDecisionMessage('PAID_OUT', {
        grossShare: 10000,
        deductionAmount: 10000,
        netAmount: 0,
      }),
    ).toMatch(/net pembayaran/);
  });

  it('tracks reconciliation separately from the settlement status', () => {
    expect(RECONCILIATION_STATUS.REQUIRED).not.toBe(SETTLEMENT_STATUS.PENDING);
    expect(RECONCILIATION_STATUS.RESOLVED).not.toBe(SETTLEMENT_STATUS.PAID_OUT);
  });
});
