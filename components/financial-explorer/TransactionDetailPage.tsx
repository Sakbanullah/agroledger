"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import {
  apiBaseUrl,
  ExplorerDetail,
  ExplorerTrace,
  getExplorerTrace,
  getExplorerTransaction,
} from "@/lib/api";

import { RoleBadge } from "@/components/financial-explorer/TransactionList";
import {
  categoryLabel,
  formatDateLabel,
  formatRupiah,
} from "@/components/financial-explorer/format";

const RELATION_LABELS: Record<ExplorerTrace["rows"][number]["relation"], string> = {
  THIS: "Transaksi ini",
  SALE: "Pencatatan penjualan",
  OWNER_SETTLEMENT: "Pembayaran ke pemilik farm",
  WORKER_SETTLEMENT: "Pembayaran settlement pekerja",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  PAID_OUT: "Dibayar",
  SETTLED_BY_OFFSET: "Ditutup potongan kasbon",
  NO_BALANCE: "Tidak ada saldo",
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[12px] text-text-primary">{value}</dd>
    </div>
  );
}

function num(value: string | null | undefined) {
  return Number(value ?? 0);
}

export default function TransactionDetailPage({ id }: { id: number }) {
  const [detail, setDetail] = useState<ExplorerDetail | null>(null);
  const [trace, setTrace] = useState<ExplorerTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([getExplorerTransaction(id), getExplorerTrace(id)])
      .then(([detailData, traceData]) => {
        if (cancelled) return;
        setError("");
        setDetail(detailData);
        setTrace(traceData);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 pt-6 sm:px-5 lg:px-7">
        <p className="text-[11px] text-text-muted">Memuat transaksi...</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-background px-4 pt-6 sm:px-5 lg:px-7">
        <p className="rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
          {error || "Transaksi tidak ditemukan"}
        </p>
      </main>
    );
  }

  const { transaction, sale, settlement } = detail;
  const income = transaction.type === "IN";
  const passthrough = transaction.role === "PASSTHROUGH";

  const saleGross = sale
    ? num(sale.totalWeightKg) * num(sale.pricePerKg)
    : 0;
  const settlementDeductions = settlement ? num(settlement.deductionAmount) : 0;
  const settlementNet = settlement ? num(settlement.netAmount) : 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <header className="mb-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
            Financial Explorer
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            <Link
              href={`/financial-explorer/date/${transaction.transactionDate.slice(0, 10)}`}
              aria-label="Kembali ke tanggal transaksi"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border text-text-secondary transition hover:bg-surface-muted"
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
            </Link>

            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              Detail Transaksi
            </h1>
          </div>

          <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
            TRX-{transaction.id}
          </p>
        </header>

        <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  income ? "bg-success-soft text-success" : "bg-surface-soft text-text-secondary"
                }`}
              >
                {income ? "Pemasukan" : "Pengeluaran"}
              </span>
              <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[10px] text-text-secondary">
                {categoryLabel(transaction.category)}
              </span>
              <RoleBadge role={transaction.role} />
            </div>

            <p
              className={`text-[22px] font-semibold tracking-[-0.02em] ${
                passthrough ? "text-text-muted" : income ? "text-success" : "text-text-primary"
              }`}
            >
              {income ? "+" : "-"}
              {formatRupiah(transaction.amount)}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem
              label="Tanggal"
              value={formatDateLabel(transaction.transactionDate.slice(0, 10))}
            />
            <DetailItem label="Tipe" value={income ? "Pemasukan (IN)" : "Pengeluaran (OUT)"} />
            <DetailItem label="Keterangan" value={transaction.description || "—"} />
            <DetailItem
              label="Farm"
              value={
                transaction.farm
                  ? `${transaction.farm.name}${
                      transaction.farm.ownershipType === "RELATIVE"
                        ? " (milik saudara)"
                        : " (milik sendiri)"
                    }`
                  : "—"
              }
            />
            <DetailItem
              label="Sumber"
              value={
                transaction.referenceType
                  ? `${transaction.referenceType.replaceAll("_", " ")} #${transaction.referenceId ?? "—"}`
                  : "Input manual"
              }
            />
            <DetailItem label="Dibuat" value={new Date(transaction.createdAt).toLocaleString("id-ID")} />
          </dl>

          {passthrough && (
            <p className="mt-4 rounded-[10px] border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[10px] leading-5 text-text-secondary">
              Dana ini milik pemilik farm saudara. Transaksi ini tidak dihitung
              sebagai pemasukan Anda; pembayaran ke pemilik tercatat sebagai
              pengeluaran terpisah.
            </p>
          )}
        </section>

        {sale && (
          <section className="mt-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-text-primary">
                Penjualan #{sale.id}
              </h2>
              <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[10px] text-text-secondary">
                {STATUS_LABELS[sale.status] ?? sale.status}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailItem label="Tanggal jual" value={formatDateLabel(sale.saleDate.slice(0, 10))} />
              <DetailItem label="Komoditas" value={sale.commodity.name} />
              <DetailItem label="Farm" value={sale.farm.name} />
              <DetailItem label="Berat" value={`${num(sale.totalWeightKg).toLocaleString("id-ID")} kg`} />
              <DetailItem label="Harga/kg" value={formatRupiah(num(sale.pricePerKg))} />
              <DetailItem label="Pembeli" value={sale.buyerName || "—"} />
              <DetailItem label="Gross" value={formatRupiah(saleGross)} />
              <DetailItem
                label="Komisi"
                value={
                  sale.commissionAmount
                    ? `${formatRupiah(num(sale.commissionAmount))} (${formatRupiah(
                        num(sale.commissionRatePerKg),
                      )}/kg)`
                    : "—"
                }
              />
              <DetailItem
                label="Bagian pemilik"
                value={sale.ownerShareAmount ? formatRupiah(num(sale.ownerShareAmount)) : "—"}
              />
            </dl>

            {sale.scanDocuments.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Dokumen pendukung
                </p>
                <ul className="mt-2 space-y-1">
                  {sale.scanDocuments.map((document) => (
                    <li key={document.id}>
                      <a
                        href={`${apiBaseUrl()}/${document.imagePath.replace(/^\/+/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-info hover:underline"
                      >
                        Nota #{document.id} ({document.status})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {settlement && (
          <section className="mt-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-text-primary">
                Settlement pekerja — {settlement.worker.name}
              </h2>
              <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[10px] text-text-secondary">
                {STATUS_LABELS[settlement.status] ?? settlement.status}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DetailItem label="Bruto" value={formatRupiah(num(settlement.grossShare))} />
              <DetailItem label="Kasbon" value={formatRupiah(num(settlement.kasbonAmount))} />
              <DetailItem label="Potongan" value={formatRupiah(settlementDeductions)} />
              <DetailItem label="Net dibayar" value={formatRupiah(settlementNet)} />
            </dl>

            <p className="mt-3 text-[10px] text-text-muted">
              Penjualan #{settlement.sale.id} • {settlement.sale.commodity.name} •{" "}
              {settlement.settledAt
                ? `diselesaikan ${formatDateLabel(settlement.settledAt.slice(0, 10))}`
                : "belum diselesaikan"}
            </p>
          </section>
        )}

        <section className="mt-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold text-text-primary">Jejak Sumber</h2>

          <p className="mt-1 text-[10px] text-text-muted">
            Semua pergerakan uang untuk peristiwa yang sama. Klik untuk membuka detailnya.
          </p>

          <ol className="mt-4 space-y-2">
            {(trace?.rows ?? []).map((row) => {
              const rowIncome = row.type === "IN";

              return (
                <li key={row.id}>
                  <Link
                    href={`/financial-explorer/transactions/${row.id}`}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 transition hover:bg-surface-muted ${
                      row.id === transaction.id
                        ? "border-agro-primary/40 bg-agro-primary-soft"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-text-primary">
                        {RELATION_LABELS[row.relation]}
                      </p>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        TRX-{row.id} • {categoryLabel(row.category)} •{" "}
                        {formatDateLabel(row.transactionDate.slice(0, 10))}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold ${
                        rowIncome ? "text-success" : "text-text-primary"
                      }`}
                    >
                      {rowIncome ? "+" : "-"}
                      {formatRupiah(row.amount)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
