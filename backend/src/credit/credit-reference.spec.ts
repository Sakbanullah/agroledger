import {
  isServerOwnedCreditReference,
  SERVER_OWNED_REFERENCE_MESSAGE,
} from './credit-reference';

describe('isServerOwnedCreditReference', () => {
  it('flags the settlement and cancellation references the server writes', () => {
    expect(isServerOwnedCreditReference('SETTLEMENT-42')).toBe(true);
    expect(isServerOwnedCreditReference('CANCELLATION-42')).toBe(true);
  });

  it('is case and whitespace insensitive, so a spoof cannot slip through', () => {
    expect(isServerOwnedCreditReference('  settlement-7 ')).toBe(true);
    expect(isServerOwnedCreditReference('Cancellation-100')).toBe(true);
  });

  it('allows ordinary user references', () => {
    expect(isServerOwnedCreditReference('kasbon warung')).toBe(false);
    expect(isServerOwnedCreditReference('bon-2026-01')).toBe(false);
    expect(isServerOwnedCreditReference('SETTLEMENT')).toBe(false);
    expect(isServerOwnedCreditReference('xSETTLEMENT-1')).toBe(false);
  });

  it('treats a missing reference as user content', () => {
    expect(isServerOwnedCreditReference(undefined)).toBe(false);
    expect(isServerOwnedCreditReference(null)).toBe(false);
    expect(isServerOwnedCreditReference('')).toBe(false);
  });

  it('exposes one message for the refusal', () => {
    expect(SERVER_OWNED_REFERENCE_MESSAGE).toMatch(/settlement/);
  });
});
