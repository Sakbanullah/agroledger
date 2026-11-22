import { classifyHistoricalSettlement } from './migration-classifier';

const sale = (over: Partial<{ id: number; grossShare: number; deductionAmount: number; netAmount: number }> = {}) => ({
  id: 10,
  status: 'CONFIRMED',
  grossShare: 10000,
  deductionAmount: 0,
  netAmount: 10000,
  ...over,
});

const out = (id: number, settlementId: number, amount: number) =>
  ({ id, settlementId, type: 'OUT' as const, amount });

const payment = (id: number, settlementId: number, amount: number) =>
  ({ id, settlementId, type: 'PAYMENT' as const, amount });

describe('historical settlement backfill classification', () => {
  it('cash-only: one exact OUT, no PAYMENT at all -> PAID_OUT', () => {
    expect(classifyHistoricalSettlement(sale(), [out(1, 10, 10000)], [])).toEqual({
      status: 'PAID_OUT',
      settlementMethod: 'CASH',
      evidenceMoneyTransactionId: 1,
    });
  });

  it('cash + kasbon: one exact OUT and one exact PAYMENT -> PAID_OUT', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 4000, netAmount: 6000 }),
        [out(2, 10, 6000)],
        [payment(3, 10, 4000)],
      ),
    ).toEqual({
      status: 'PAID_OUT',
      settlementMethod: 'CASH',
      evidenceMoneyTransactionId: 2,
    });
  });

  it('full offset: no cash row, one exact PAYMENT -> SETTLED_BY_OFFSET', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 10000, netAmount: 0 }),
        [],
        [payment(4, 10, 10000)],
      ),
    ).toEqual({
      status: 'SETTLED_BY_OFFSET',
      settlementMethod: 'OFFSET',
      evidenceCreditTransactionId: 4,
    });
  });

  it('BD-17: gross 0, deduction 0, no rows -> NO_BALANCE', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ grossShare: 0, deductionAmount: 0, netAmount: 0 }),
        [],
        [],
      ),
    ).toEqual({ status: 'NO_BALANCE', settlementMethod: 'NO_BALANCE' });
  });

  it('BD-17: gross 0 with a cash row -> REQUIRED', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ grossShare: 0, deductionAmount: 0, netAmount: 0 }),
        [out(1, 10, 0)],
        [],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('BD-17: gross 0 with a PAYMENT row -> REQUIRED', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ grossShare: 0, deductionAmount: 0, netAmount: 0 }),
        [],
        [payment(2, 10, 0)],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('BD-17: gross 0 with a non-zero deduction -> REQUIRED', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ grossShare: 0, deductionAmount: 500, netAmount: 0 }),
        [],
        [],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('missing cash row -> reconciliation', () => {
    expect(classifyHistoricalSettlement(sale(), [], [])).toEqual({
      status: 'PENDING',
      reconciliationStatus: 'REQUIRED',
    });
  });

  it('missing kasbon row where the figures need one -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 4000, netAmount: 6000 }),
        [out(2, 10, 6000)],
        [],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('duplicate cash rows -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(
        sale(),
        [out(1, 10, 10000), out(2, 10, 10000)],
        [],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('duplicate adjustment rows -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 4000, netAmount: 6000 }),
        [out(2, 10, 6000)],
        [payment(3, 10, 4000), payment(4, 10, 4000)],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('cash amount mismatch -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(sale(), [out(1, 10, 9999)], []),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('kasbon amount mismatch -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 4000, netAmount: 6000 }),
        [out(2, 10, 6000)],
        [payment(3, 10, 3000)],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('rows of another settlement are never matched', () => {
    expect(
      classifyHistoricalSettlement(sale(), [out(1, 11, 10000)], []),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });

    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 4000, netAmount: 6000 }),
        [out(2, 11, 6000)],
        [payment(3, 10, 4000)],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('cash-only with a stray PAYMENT contradicts the figures -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(sale(), [out(1, 10, 10000)], [payment(3, 10, 1)]),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });

  it('offset with an extra cash row -> reconciliation', () => {
    expect(
      classifyHistoricalSettlement(
        sale({ deductionAmount: 10000, netAmount: 0 }),
        [out(5, 10, 0)],
        [payment(4, 10, 10000)],
      ),
    ).toEqual({ status: 'PENDING', reconciliationStatus: 'REQUIRED' });
  });
});
