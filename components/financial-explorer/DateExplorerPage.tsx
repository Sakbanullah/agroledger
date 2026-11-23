"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ExplorerSummary,
  ExplorerTransaction,
  getExplorerSummary,
  getExplorerTransactions,
} from "@/lib/api";

import { TransactionList } from "@/components/financial-explorer/TransactionList";
import {
  categoryLabel,
  formatDateLabel,
  formatRupiah,
} from "@/components/financial-explorer/format";

export default function DateExplorerPage({ date }: { date: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [transactions, setTransactions] = useState<ExplorerTransaction[]>([]);
  const [category, setCategory] = useState("");
  const [farm, setFarm] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getExplorerSummary({ startDate: date, endDate: date }),
      getExplorerTransactions({ startDate: date, endDate: date, pageSize: 100 }),
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
  }, [date]);

  const usedCategories = useMemo(
    () => Array.from(new Set(transactions.map((item) => item.category))),
    [transactions],
  );

  const farms = useMemo(() => {
    const names = new Set(
      transactions.filter((item) => item.farm).map((item) => item.farm!.name),
    );
    return Array.from(names);
  }, [transactions]);

  const visible = transactions.filter(
    (item) =>
      (!category || item.category === category) &&
      (farm === "ALL" || item.farm?.name === farm),
  );

  const previousDay = new Date(`${date}T00:00:00`);
  previousDay.setDate(previousDay.getDate() - 1);
  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const iso = (value: Date) =>
    [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");

  const cards = summary
    ? [
        { label: "Pemasukan", value: formatRupiah(summary.totalIncome) },
        { label: "Pengeluaran", value: formatRupiah(summary.totalExpense) },
        {
          label: "Net Cash Flow",
          value: `${summary.netCashFlow < 0 ? "-" : ""}${formatRupiah(Math.abs(summary.netCashFlow))}`,
        },
        { label: "Transaksi", value: String(summary.transactionCount) },
      ]
    : [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
              Financial Explorer
            </p>

            <div className="mt-1.5 flex items-center gap-2">
              <Link
                href="/financial-explorer"
                aria-label="Kembali ke Financial Explorer"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border text-text-secondary transition hover:bg-surface-muted"
              >
                <ChevronLeft size={15} strokeWidth={1.8} />
              </Link>

              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
                {formatDateLabel(date)}
              </h1>
            </div>

            <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
              Rincian pergerakan kas pada tanggal ini
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/financial-explorer/date/${iso(previousDay)}`}
              className="h-9 rounded-[9px] border border-border bg-surface px-3 text-[11px] font-medium leading-9 text-text-secondary transition hover:bg-surface-muted"
            >
              Sehari sebelumnya
            </Link>

            <Link
              href={`/financial-explorer/date/${iso(nextDay)}`}
              className="h-9 rounded-[9px] border border-border bg-surface px-3 text-[11px] font-medium leading-9 text-text-secondary transition hover:bg-surface-muted"
            >
              Hari berikutnya
            </Link>

            <label className="flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-surface px-2.5">
              <CalendarDays size={13} strokeWidth={1.8} className="text-text-muted" />
              <input
                type="date"
                aria-label="Pilih tanggal"
                value={date}
                onChange={(event) => {
                  if (event.target.value) {
                    router.push(`/financial-explorer/date/${event.target.value}`);
                  }
                }}
                className="w-[112px] bg-transparent text-[11px] text-text-primary outline-none"
              />
            </label>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading ? (
            <p className="col-span-full text-[11px] text-text-muted">Memuat ringkasan...</p>
          ) : (
            cards.map((card) => (
              <div key={card.label} className="rounded-[14px] border border-border bg-surface p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  {card.label}
                </p>
                <p className="mt-2 break-words text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
                  {card.value}
                </p>
              </div>
            ))
          )}
        </section>

        <section className="mt-4 overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="text-[13px] font-semibold text-text-primary">
              Transaksi ({visible.length})
            </h2>

            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter kategori"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[10px] text-text-primary outline-none"
              >
                <option value="">Semua kategori</option>
                {usedCategories.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>

              {farms.length > 0 && (
                <select
                  aria-label="Filter farm"
                  value={farm}
                  onChange={(event) => setFarm(event.target.value)}
                  className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[10px] text-text-primary outline-none"
                >
                  <option value="ALL">Semua farm</option>
                  {farms.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <TransactionList
            transactions={visible}
            loading={loading}
            emptyMessage="Tidak ada transaksi pada tanggal ini."
          />
        </section>
      </div>
    </main>
  );
}
