"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ExplorerTransaction,
  getExplorerSummary,
  getExplorerTransactions,
  ExplorerSummary,
} from "@/lib/api";

import { TransactionList } from "@/components/financial-explorer/TransactionList";
import {
  categoryLabel,
  daysAgoISO,
  formatDateLabel,
  formatRupiah,
  formatShort,
  todayISO,
} from "@/components/financial-explorer/format";

const TYPE_BY_CATEGORY: Record<string, "IN" | "OUT"> = {
  HARVEST_SALE: "IN",
  OPENING_BALANCE: "IN",
  OWNER_SETTLEMENT: "OUT",
  RUBBER_WORKER_SETTLEMENT: "OUT",
  SALE_CANCELLATION: "OUT",
};

/**
 * One category over a period: its share of the direction total, its daily
 * trend, and every transaction in it.
 */
export default function CategoryDetailPage({
  category,
  initialStartDate,
  initialEndDate,
}: {
  category: string;
  initialStartDate: string | null;
  initialEndDate: string | null;
}) {
  const [startDate, setStartDate] = useState(initialStartDate ?? daysAgoISO(29));
  const [endDate, setEndDate] = useState(initialEndDate ?? todayISO());

  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [transactions, setTransactions] = useState<ExplorerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getExplorerSummary({ startDate, endDate }),
      getExplorerTransactions({ startDate, endDate, category, pageSize: 100 }),
    ])
      .then(([summaryData, transactionData]) => {
        if (cancelled) return;
        setError("");
        setSummary(summaryData);
        setTransactions(transactionData.data);
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
  }, [startDate, endDate, category]);

  const total = transactions.reduce(
    (sum, item) => sum + (item.role === "PASSTHROUGH" ? 0 : item.amount),
    0,
  );
  const directionTotal =
    (TYPE_BY_CATEGORY[category] ?? "OUT") === "IN"
      ? summary?.totalIncome ?? 0
      : summary?.totalExpense ?? 0;
  const share = directionTotal > 0 ? Math.round((total / directionTotal) * 10000) / 100 : 0;

  // Trend: this category's own daily totals, from the downloaded rows.
  const dailyByCategory = new Map<string, number>();
  for (const item of transactions) {
    const day = item.transactionDate.slice(0, 10);
    dailyByCategory.set(
      day,
      (dailyByCategory.get(day) ?? 0) + (item.role === "PASSTHROUGH" ? 0 : item.amount),
    );
  }
  const trendPoints = Array.from(dailyByCategory.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const maxTrend = Math.max(...trendPoints.map((point) => point.total), 1);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
              Kategori
            </p>

            <div className="mt-1.5 flex items-center gap-2">
              <Link
                href="/financial-explorer/categories"
                aria-label="Kembali ke daftar kategori"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border text-text-secondary transition hover:bg-surface-muted"
              >
                <ChevronLeft size={15} strokeWidth={1.8} />
              </Link>

              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
                {categoryLabel(category)}
              </h1>
            </div>

            <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
              {formatDateLabel(startDate)} – {formatDateLabel(endDate)}
            </p>
          </div>

          <div className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-surface px-2.5">
            <input
              type="date"
              aria-label="Tanggal mulai"
              value={startDate}
              max={endDate}
              onChange={(event) => event.target.value && setStartDate(event.target.value)}
              className="w-[112px] bg-transparent text-[11px] text-text-primary outline-none"
            />
            <span className="text-[10px] text-text-muted">s/d</span>
            <input
              type="date"
              aria-label="Tanggal akhir"
              value={endDate}
              min={startDate}
              onChange={(event) => event.target.value && setEndDate(event.target.value)}
              className="w-[112px] bg-transparent text-[11px] text-text-primary outline-none"
            />
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-[14px] border border-border bg-surface p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Total Kategori
            </p>
            <p className="mt-2 text-[18px] font-semibold text-text-primary">
              {loading ? "—" : formatRupiah(total)}
            </p>
          </div>

          <div className="rounded-[14px] border border-border bg-surface p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Porsi
            </p>
            <p className="mt-2 text-[18px] font-semibold text-text-primary">
              {loading ? "—" : `${share}%`}
            </p>
          </div>

          <div className="rounded-[14px] border border-border bg-surface p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Transaksi
            </p>
            <p className="mt-2 text-[18px] font-semibold text-text-primary">
              {loading ? "—" : transactions.length}
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[16px] border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold text-text-primary">Tren</h2>

          {loading ? (
            <p className="mt-3 text-[11px] text-text-muted">Memuat...</p>
          ) : trendPoints.length === 0 ? (
            <p className="mt-3 text-[11px] text-text-muted">
              Tidak ada transaksi pada periode ini.
            </p>
          ) : (
            <div className="mt-4 flex h-[120px] items-end gap-1">
              {trendPoints.map((point) => (
                <Link
                  key={point.date}
                  href={`/financial-explorer/date/${point.date}`}
                  title={`${formatDateLabel(point.date)}: ${formatRupiah(point.total)}`}
                  className="group flex min-w-[6px] flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 hidden text-[8px] text-text-muted group-hover:block">
                    {formatShort(point.total)}
                  </span>
                  <div
                    className="w-full rounded-t-[3px] bg-agro-primary/70 transition group-hover:bg-agro-primary"
                    style={{ height: `${Math.max((point.total / maxTrend) * 100, 3)}%` }}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="text-[13px] font-semibold text-text-primary">Transaksi</h2>
          </div>

          <TransactionList
            transactions={transactions}
            loading={loading}
            emptyMessage="Tidak ada transaksi pada kategori ini."
          />
        </section>
      </div>
    </main>
  );
}
