import { isSettlementSettled } from '../settlements/settlement-status';

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
  settlements?: { status: string }[];
  ownerSettlements: { settledAmount: unknown }[];
}): string | null {
  if (input.status === SALE_STATUS.CANCELLED) {
    return 'Transaksi ini sudah dibatalkan sebelumnya';
  }

  if (input.status !== SALE_STATUS.COMPLETED) {
    return 'Hanya penjualan berstatus Selesai yang dapat dibatalkan';
  }

  // Once a worker has actually been settled, the money already left the user.
  // Reversing it as cash-in would invent cash that never came back, so this
  // path is refused; a dedicated correction flow is a separate decision.
  if ((input.settlements ?? []).some((row) => isSettlementSettled(row.status))) {
    return 'Pembatalan tidak dapat dilakukan karena pembayaran pekerja sudah diserahkan';
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
  settlements: { status: string }[];
  ownerSettlements: unknown[];
  moneyEntries: number;
}): string | null {
  if (input.status === SALE_STATUS.COMPLETED) {
    return 'Penjualan berstatus Selesai harus dibatalkan terlebih dahulu sebelum dihapus';
  }

  // Settled workers keep their financial history: the cash that left the user
  // must stay traceable to a settlement row.
  if (input.settlements.some((row) => isSettlementSettled(row.status))) {
    return 'Penjualan tidak dapat dihapus karena pembayaran pekerja sudah diserahkan';
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

  // Same for the owner share: a cancelled sale neutralizes (and marks)
  // those rows before the cascade.
  if (
    input.ownerSettlements.length > 0 &&
    input.status !== SALE_STATUS.CANCELLED
  ) {
    return 'Penjualan tidak dapat dihapus karena masih memiliki settlement pemilik';
  }

  if (input.moneyEntries > 0 && input.status !== SALE_STATUS.CANCELLED) {
    return 'Penjualan tidak dapat dihapus karena sudah tercatat pada transaksi keuangan';
  }

  return null;
}
