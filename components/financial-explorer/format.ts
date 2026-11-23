export const CATEGORY_LABELS: Record<string, string> = {
  OPERASIONAL: "Operasional",
  WARUNG: "Warung",
  PERTANIAN: "Pertanian",
  TRANSPORTASI: "Transportasi",
  PERAWATAN: "Perawatan",
  LAINNYA: "Lainnya",
  HARVEST_SALE: "Penjualan Hasil Panen",
  OWNER_SETTLEMENT: "Pembayaran Pemilik",
  RUBBER_WORKER_SETTLEMENT: "Settlement Pekerja",
  SALE_CANCELLATION: "Pembatalan Penjualan",
  OPENING_BALANCE: "Saldo Awal",
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category.replaceAll("_", " ");
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShort(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1_000) return `Rp${Math.round(value / 1_000)}rb`;
  return `Rp${Math.round(value)}`;
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function todayISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export const RANGE_PRESETS = [
  { label: "7 hari", days: 6 },
  { label: "30 hari", days: 29 },
  { label: "90 hari", days: 89 },
] as const;

export const EXPLORER_CATEGORIES = Object.keys(CATEGORY_LABELS);
