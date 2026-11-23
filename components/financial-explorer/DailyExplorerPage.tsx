"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ExplorerCategory,
  ExplorerSeriesPoint,
  getExplorerCategories,
  getExplorerDaily,
  getExplorerSummary,
  ExplorerSummary,
} from "@/lib/api";

import ExplorerHeader from "@/components/financial-explorer/ExplorerHeader";
import {
  categoryLabel,
  formatDateLabel,
  formatRupiah,
  formatShort,
  todayISO,
  daysAgoISO,
} from "@/components/financial-explorer/format";

type Direction = "IN" | "OUT";

const COPY: Record<
  Direction,
  { empty: string; count: (n: number) => string; color: string }
> = {
  IN: {
    empty: "Belum ada pemasukan pada periode ini.",
    count: (n) => `${n} transaksi pemasukan`,
    color: "text-success",
  },
  OUT: {
    empty: "Belum ada pengeluaran pada periode ini.",
    count: (n) => `${n} transaksi pengeluaran`,
    color: "text-danger",
  },
};

/**
 * Day-by-day explorer for one direction. The rows link to that date's
 * Date Explorer page, preserving the current period.
 */
export default function DailyExplorerPage({
  direction,
  title,
  subtitle,
}: {
  direction: Direction;
  title: string;
  subtitle: string;
}) {
  const [startDate, setStartDate] = useState(daysAgoISO(29));
  const [endDate, setEndDate] = useState(todayISO());

  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [days, setDays] = useState<ExplorerSeriesPoint[]>([]);
  const [categories, setCategories] = useState<ExplorerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getExplorerSummary({ startDate, endDate }),
      getExplorerDaily(direction, { startDate, endDate }),
      getExplorerCategories({ startDate, endDate }),
    ])
      .then(([summaryData, dailyData, categoryData]) => {
        if (cancelled) return;
        setError("");
        setSummary(summaryData);
        setDays(dailyData.days);
        setCategories(
          direction === "IN" ? categoryData.income.categories : categoryData.expense.categories,
        );
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
  }, [startDate, endDate, direction]);

  const total = direction === "IN" ? summary?.totalIncome ?? 0 : summary?.totalExpense ?? 0;
  const count = direction === "IN" ? summary?.incomeCount ?? 0 : summary?.expenseCount ?? 0;
  const activeDays = days.filter((day) => (day.amount ?? 0) > 0);
  const max = Math.max(...activeDays.map((day) => day.amount ?? 0), 1);

  const copy = COPY[direction];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <ExplorerHeader
          title={title}
          subtitle={subtitle}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          backHref="/financial-explorer"
        />

        {error && (
          <div className="mb-4 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Total
            </p>
            <p className={`mt-2 text-[20px] font-semibold tracking-[-0.02em] ${copy.color}`}>
              {loading || !summary ? "—" : formatRupiah(total)}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">
              {loading || !summary ? "" : copy.count(count)}
            </p>
          </section>

          <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5 lg:col-span-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Breakdown Kategori
            </p>

            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="text-[11px] text-text-muted">Memuat kategori...</p>
              ) : categories.length === 0 ? (
                <p className="text-[11px] text-text-muted">{copy.empty}</p>
              ) : (
                categories.map((item) => (
                  <Link
                    key={item.category}
                    href={`/financial-explorer/categories/${item.category}?startDate=${startDate}&endDate=${endDate}`}
                    className="flex items-center justify-between gap-3 rounded-[8px] px-1 py-1 text-[11px] transition hover:bg-surface-muted"
                  >
                    <span className="truncate text-text-primary">
                      {categoryLabel(item.category)}
                    </span>
                    <span className="shrink-0 text-text-secondary">
                      {formatShort(item.total)} ({item.percentage}%)
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="text-[13px] font-semibold text-text-primary">Per Hari</h2>
            <span className="text-[10px] text-text-muted">
              {loading ? "" : `${activeDays.length} hari aktif`}
            </span>
          </div>

          {loading ? (
            <p className="px-4 py-10 text-center text-[11px] text-text-muted">Memuat...</p>
          ) : activeDays.length === 0 ? (
            <p className="px-4 py-10 text-center text-[11px] text-text-muted">{copy.empty}</p>
          ) : (
            <div className="divide-y divide-border">
              {activeDays.map((day) => (
                <Link
                  key={day.date}
                  href={`/financial-explorer/date/${day.date}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted sm:px-5"
                >
                  <span className="w-[92px] shrink-0 text-[11px] text-text-secondary">
                    {formatDateLabel(day.date)}
                  </span>

                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
                    <div
                      className={`h-full rounded-full ${direction === "IN" ? "bg-success" : "bg-danger/70"}`}
                      style={{ width: `${Math.max(((day.amount ?? 0) / max) * 100, 2)}%` }}
                    />
                  </div>

                  <span className={`w-[110px] shrink-0 text-right text-[11px] font-semibold ${copy.color}`}>
                    {formatRupiah(day.amount ?? 0)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
