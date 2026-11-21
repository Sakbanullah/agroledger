/**
 * Credit references the server owns.
 *
 * CreditTransaction.reference is how the settlement code finds its own rows:
 * `SETTLEMENT-<id>` marks the kasbon deduction of one settlement and
 * `CANCELLATION-<id>` marks the debt put back when that settlement is
 * reversed. A client that could write those prefixes could fake, block or
 * hide a settlement's kasbon deduction, so any request carrying one is refused
 * before it reaches the database.
 *
 * Plain user references stay allowed: they only describe a kasbon.
 */
const SERVER_OWNED_PREFIXES = ['SETTLEMENT-', 'CANCELLATION-'] as const;

export function isServerOwnedCreditReference(
  reference: string | undefined | null,
): boolean {
  if (!reference) {
    return false;
  }

  const normalized = reference.trim().toUpperCase();

  return SERVER_OWNED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export const SERVER_OWNED_REFERENCE_MESSAGE =
  'Reference ini dipakai sistem untuk settlement dan tidak dapat diisi manual';
