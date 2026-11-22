import { LOCK_ORDER, lockRank, respectsLockOrder } from './lock-order';

describe('global lock order', () => {
  it('locks the sale before the settlements it owns', () => {
    expect(lockRank('Sale')).toBeLessThan(lockRank('Settlement'));
  });

  it('locks the credit account after the settlement that deducts from it', () => {
    expect(lockRank('Settlement')).toBeLessThan(lockRank('CreditAccount'));
  });

  it('keeps the owner settlement last', () => {
    expect(LOCK_ORDER[LOCK_ORDER.length - 1]).toBe('OwnerSettlement');
  });

  it('detects a lock taken out of order', () => {
    expect(respectsLockOrder('Sale', 'Settlement')).toBe(true);
    expect(respectsLockOrder('Settlement', 'Sale')).toBe(false);
  });
});
