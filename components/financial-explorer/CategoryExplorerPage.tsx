"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ExplorerCategory,
  ExplorerSummary,
  getExplorerCategories,
  getExplorerSummary,
} from "@/lib/api";

import ExplorerHeader from "@/components/financial-explorer/ExplorerHeader";
import {
  categoryLabel,
  daysAgoISO,
  formatRupiah,
  todayISO,
} from "@/components/financial-explorer/format";

function CategorySection({
  title,
  direction,
  data,
  startDate,
  endDate,
  color,
}: {
  title: string;
  direction: "IN" | "OUT";
  data: ExplorerCategory[];
  startDate: string;
  endDate: string;
  color: string;
}) {
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <section className="rounded-[16px] border border-border bg-surface">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>
      </div>

      {data.length === 0 ? (
        <p className="px-4 py-10 text-center text-[11px] text-text-muted sm:px-5">
          Belum ada transaksi pada periode ini.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {data.map((item) => (
            <Link
              key={item.category}
              href={`/financial-explorer/categories/${item.category}?startDate=${startDate}&endDate=${endDate}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-muted sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[12px] font-medium text-text-primary">
                    {categoryLabel(item.category)}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-text-primary">
                    {formatRupiah(item.total)}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${Math.max((item.total / max) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="w-[52px] shrink-0 text-right text-[10px] text-text-muted">
                    {item.percentage}%
                  </span>
                  <span className="w-[70px] shrink-0 text-right text-[10px] text-text-muted">
                    {item.count} trx
                  </span>
                </div>
              </div>

              <ChevronRight size={14} strokeWidth={1.8} className="shrink-0 text-text-muted" />
            </Link>
          ))}
        </div>
      )}

      <div className="border-t border-border px-4 py-2.5 sm:px-5">
        <Link
          href={`/financial-explorer/transactions?type=${direction}&startDate=${startDate}&endDate=${endDate}`}
          className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
        >
          Lihat semua transaksi {direction === "IN" ? "pemasukan" : "pengeluaran"} →
        </Link>
      </div>
    </section>
  );
}

export default function CategoryExplorerPage() {
  const [startDate, setStartDate] = useState(daysAgoISO(29));
  const [endDate, setEndDate] = useState(todayISO());

  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [income, setIncome] = useState<ExplorerCategory[]>([]);
  const [expense, setExpense] = useState<ExplorerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getExplorerSummary({ startDate, endDate }),
      getExplorerCategories({ startDate, endDate }),
    ])
      .then(([summaryData, categoryData]) => {
        if (cancelled) return;
        setError("");
        setSummary(summaryData);
        setIncome(categoryData.income.categories);
        setExpense(categoryData.expense.categories);
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
  }, [startDate, endDate]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <ExplorerHeader
          title="Kategori"
          subtitle="Kemana uang masuk dan keluar, per kategori"
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

        {loading ? (
          <p className="text-[11px] text-text-muted">Memuat kategori...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CategorySection
              title={`Pemasukan — ${summary ? formatRupiah(summary.totalIncome) : ""}`}
              direction="IN"
              data={income}
              startDate={startDate}
              endDate={endDate}
              color="bg-success"
            />

            <CategorySection
              title={`Pengeluaran — ${summary ? formatRupiah(summary.totalExpense) : ""}`}
              direction="OUT"
              data={expense}
              startDate={startDate}
              endDate={endDate}
              color="bg-danger/70"
            />
          </div>
        )}

        {!loading && summary && summary.passthrough.salesIn > 0 && (
          <p className="mt-4 rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-[10px] leading-5 text-text-secondary sm:text-[11px]">
            Penjualan {formatRupiah(summary.passthrough.salesIn)} dari farm saudara
            tidak termasuk pemasukan karena uangnya milik pemilik farm. Pembayaran
            ke pemilik tercatat sebagai pengeluaran.
          </p>
        )}
      </div>
    </main>
  );
}
