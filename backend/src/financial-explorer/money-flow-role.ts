export type Direction = 'IN' | 'OUT';

/**
 * Role of one MoneyTransaction row in the user's own cash flow.
 *
 * OWN          the money is the user's own: counts as income (IN) or expense (OUT)
 * PASSTHROUGH  the row reflects money belonging to another farm owner (the gross
 *              HARVEST_SALE IN of a RELATIVE farm). It must never be reported as
 *              the user's income or expense; the paired OWNER_SETTLEMENT OUT is a
 *              real outflow of the user's cash, so it stays OWN.
 */
export type FlowRole = 'OWN' | 'PASSTHROUGH';

export const HARVEST_SALE_CATEGORY = 'HARVEST_SALE';
export const RELATIVE_OWNERSHIP = 'RELATIVE';

export function flowRoleFor(row: {
  category: string;
  farmOwnershipType?: string | null;
}): FlowRole {
  return row.category === HARVEST_SALE_CATEGORY &&
    row.farmOwnershipType === RELATIVE_OWNERSHIP
    ? 'PASSTHROUGH'
    : 'OWN';
}

/**
 * Signed cash effect of one money row on the user's own cash.
 * Passthrough rows move nothing of the user's.
 */
export function signedOwnCash(row: {
  type: string;
  amount: unknown;
  category: string;
  farmOwnershipType?: string | null;
}): number {
  if (flowRoleFor(row) === 'PASSTHROUGH') return 0;
  const amount = Math.abs(Number(row.amount));
  return row.type === 'IN' ? amount : -amount;
}
