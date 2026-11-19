/**
 * Sale lifecycle.
 *
 * PENDING   draft, not yet confirmed
 * CONFIRMED buyer has paid, worker/owner settlement pending
 * COMPLETED all settlements done
 * CANCELLED financial effects reversed; the sale is ready to be deleted
 */
export const SALE_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

/**
 * Pure rule: may this sale be cancelled right now?
 *
 * Only a COMPLETED sale is cancelled, and only while nothing is still
 * owed to an owner. Owner share already paid has no reversal path, so a
 * sale with paid owner settlements must be refused instead of reversed
 * incorrectly.
 */
export function cancellationBlocker(input: {
  status: string;
  ownerSettlements: { settledAmount: unknown }[];
}): string | null {
  if (input.status === SALE_STATUS.CANCELLED) {
    return 'Transaksi ini sudah dibatalkan sebelumnya';
  }

  if (input.status !== SALE_STATUS.COMPLETED) {
    return 'Hanya penjualan berstatus Selesai yang dapat dibatalkan';
  }

  const paidOwner = input.ownerSettlements.find(
    (settlement) => Number(settlement.settledAmount) > 0,
  );

  if (paidOwner) {
    return 'Pembatalan tidak dapat dilakukan karena pembagian ke pemilik sudah dibayar';
  }

  return null;
}

/**
 * Pure rule: may this sale be physically deleted?
 *
 * Deleting cascades worker settlements, owner settlements and scan
 * documents, so those must be gone first. Money transactions are kept
 * (not cascaded) and become the audit trail of the deleted sale.
 */
export function deletionBlocker(input: {
  status: string;
  settlements: unknown[];
  ownerSettlements: unknown[];
  moneyEntries: number;
}): string | null {
  if (input.status === SALE_STATUS.COMPLETED) {
    return 'Penjualan berstatus Selesai harus dibatalkan terlebih dahulu sebelum dihapus';
  }

  if (input.status !== SALE_STATUS.PENDING && input.status !== SALE_STATUS.CANCELLED) {
    return 'Penjualan dengan settlement worker tidak dapat dihapus';
  }

  // A cancelled sale keeps its settlements as history. They are neutralized
  // first (status CANCELLED, amounts zeroed) and marked via their money rows,
  // so the cascade cannot remove settlement cash records that reports read.
  if (
    input.settlements.length > 0 &&
    input.status !== SALE_STATUS.CANCELLED
  ) {
    return 'Penjualan tidak dapat dihapus karena settlement worker sudah dibuat';
  }

  if (input.ownerSettlements.length > 0) {
    return 'Penjualan tidak dapat dihapus karena masih memiliki settlement pemilik';
  }

  if (input.moneyEntries > 0 && input.status !== SALE_STATUS.CANCELLED) {
    return 'Penjualan tidak dapat dihapus karena sudah tercatat pada transaksi keuangan';
  }

  return null;
}
