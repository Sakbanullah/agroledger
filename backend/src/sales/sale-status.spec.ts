import { cancellationBlocker, deletionBlocker } from './sale-status';

describe('cancellationBlocker (settled workers)', () => {
  const base = {
    status: 'COMPLETED',
    ownerSettlements: [{ settledAmount: 0 }],
  };

  it('allows cancelling a completed sale whose settlements are still pending', () => {
    expect(
      cancellationBlocker({
        ...base,
        settlements: [{ status: 'PENDING' }, { status: 'PENDING' }],
      }),
    ).toBeNull();
  });

  it('refuses a sale with at least one paid-out worker', () => {
    expect(
      cancellationBlocker({
        ...base,
        settlements: [{ status: 'PENDING' }, { status: 'PAID_OUT' }],
      }),
    ).toMatch(/pembayaran pekerja/);
  });

  it('refuses a sale settled entirely by offset', () => {
    expect(
      cancellationBlocker({
        ...base,
        settlements: [{ status: 'SETTLED_BY_OFFSET' }],
      }),
    ).toMatch(/pembayaran pekerja/);
  });

  it('still refuses a sale whose owner share was paid', () => {
    expect(
      cancellationBlocker({
        status: 'COMPLETED',
        settlements: [{ status: 'PENDING' }],
        ownerSettlements: [{ settledAmount: 1000 }],
      }),
    ).toMatch(/pemilik/);
  });

  it('refuses anything that is not completed', () => {
    expect(
      cancellationBlocker({
        status: 'CONFIRMED',
        settlements: [],
        ownerSettlements: [],
      }),
    ).toMatch(/Selesai/);
  });
});

describe('deletionBlocker (settled workers)', () => {
  it('allows deleting a cancelled sale with unsettled settlements', () => {
    expect(
      deletionBlocker({
        status: 'CANCELLED',
        settlements: [{ status: 'PENDING' }],
        ownerSettlements: [],
        moneyEntries: 2,
      }),
    ).toBeNull();
  });

  it('refuses deleting a cancelled sale with a paid-out worker', () => {
    expect(
      deletionBlocker({
        status: 'CANCELLED',
        settlements: [{ status: 'PAID_OUT' }],
        ownerSettlements: [],
        moneyEntries: 2,
      }),
    ).toMatch(/pembayaran pekerja/);
  });

  it('refuses deleting a completed sale', () => {
    expect(
      deletionBlocker({
        status: 'COMPLETED',
        settlements: [],
        ownerSettlements: [],
        moneyEntries: 0,
      }),
    ).toMatch(/dibatalkan terlebih dahulu/);
  });

  it('refuses deleting a cancelled sale that has reconciliation history', () => {
    expect(
      deletionBlocker({
        status: 'CANCELLED',
        settlements: [{ status: 'PENDING' }],
        ownerSettlements: [],
        moneyEntries: 2,
        settlementIds: [1],
        reconciledSettlementIds: [1],
      }),
    ).toMatch(/riwayat rekonsiliasi/);
  });

  it('still allows deleting a cancelled sale without reconciliation history', () => {
    expect(
      deletionBlocker({
        status: 'CANCELLED',
        settlements: [{ status: 'PENDING' }],
        ownerSettlements: [],
        moneyEntries: 2,
        settlementIds: [1],
        reconciledSettlementIds: [],
      }),
    ).toBeNull();
  });
});
