"use client";

import { ArrowDownLeft, ArrowUpRight, LineChart, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ExplorerCategory,
  ExplorerSeriesPoint,
  ExplorerTransaction,
  getExplorerCashFlow,
  getExplorerCategories,
  getExplorerTransactions,
  getExplorerSummary,
  ExplorerSummary,
} from "@/lib/api";

import CashFlowChart from "@/components/financial-explorer/CashFlowChart";
import ExplorerHeader from "@/components/financial-explorer/ExplorerHeader";
import { TransactionList } from "@/components/financial-explorer/TransactionList";
import {
  categoryLabel,
  daysAgoISO,
  formatRupiah,
  formatShort,
  todayISO,
} from "@/components/financial-explorer/format";

export default function FinancialExplorerPage() {
  const [startDate, setStartDate] = useState(daysAgoISO(29));
  const [endDate, setEndDate] = useState(todayISO());
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [series, setSeries] = useState<ExplorerSeriesPoint[]>([]);
  const [categories, setCategories] = useState<
    (ExplorerCategory & { direction: "IN" | "OUT" })[]
  >([]);
  const [recent, setRecent] = useState<ExplorerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getExplorerSummary({ startDate, endDate }),
      getExplorerCashFlow({ startDate, endDate, period }),
      getExplorerCategories({ startDate, endDate }),
      getExplorerTransactions({ startDate, endDate, pageSize: 8 }),
    ])
      .then(([summaryData, flowData, categoryData, transactionData]) => {
        if (cancelled) return;
        setError("");
        setSummary(summaryData);
        setSeries(flowData.data);
        setCategories(
          [
            ...categoryData.income.categories.map((item) => ({
              ...item,
              direction: "IN" as const,
            })),
            ...categoryData.expense.categories.map((item) => ({
              ...item,
              direction: "OUT" as const,
            })),
          ].sort((a, b) => b.total - a.total),
        );
        setRecent(transactionData.data);
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
  }, [startDate, endDate, period]);

  const topCategories = categories.slice(0, 5);
  const maxCategory = Math.max(...topCategories.map((item) => item.total), 1);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <ExplorerHeader
          title="Financial Explorer"
          subtitle="Telusuri pemasukan dan pengeluaran hingga ke transaksi sumber"
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />

        {error && (
          <div className="mb-4 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-center rounded-[9px] border border-border bg-surface p-0.5 w-fit">
          {(["daily", "weekly", "monthly"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-[7px] px-3 py-1.5 text-[10px] font-medium transition ${
                period === item
                  ? "bg-surface-soft text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {item === "daily" ? "Harian" : item === "weekly" ? "Mingguan" : "Bulanan"}
            </button>
          ))}
        </div>

        <CashFlowChart data={series} loading={loading} />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-[16px] border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <h2 className="text-[13px] font-semibold text-text-primary">Kategori Teratas</h2>
              <Link
                href="/financial-explorer/categories"
                className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
              >
                Semua kategori
              </Link>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <p className="text-[11px] text-text-muted">Memuat kategori...</p>
              ) : topCategories.length === 0 ? (
                <p className="text-[11px] text-text-muted">Belum ada transaksi.</p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((item) => (
                      <Link
                        key={item.category}
                        href={`/financial-explorer/categories/${item.category}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="truncate font-medium text-text-primary">
                            {categoryLabel(item.category)}
                          </span>
                          <span className="shrink-0 text-text-secondary">
                            {formatShort(item.total)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                          <div
                            className={`h-full rounded-full ${item.direction === "IN" ? "bg-success" : "bg-danger/70"}`}
                            style={{ width: `${Math.max((item.total / maxCategory) * 100, 2)}%` }}
                          />
                        </div>
                      </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[16px] border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-text-primary">Jelajahi</h2>
              </div>
              <Link
                href="/financial-explorer/transactions"
                className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
              >
                Semua transaksi
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
              <Link
                href="/financial-explorer/income"
                className="rounded-[12px] border border-border p-4 transition hover:bg-surface-muted"
              >
                <ArrowDownLeft size={16} strokeWidth={1.8} className="text-success" />
                <p className="mt-2 text-[12px] font-medium text-text-primary">Pemasukan</p>
                <p className="mt-0.5 text-[16px] font-semibold text-success">
                  {loading || !summary ? "—" : formatRupiah(summary.totalIncome)}
                </p>
              </Link>

              <Link
                href="/financial-explorer/expenses"
                className="rounded-[12px] border border-border p-4 transition hover:bg-surface-muted"
              >
                <ArrowUpRight size={16} strokeWidth={1.8} className="text-danger" />
                <p className="mt-2 text-[12px] font-medium text-text-primary">Pengeluaran</p>
                <p className="mt-0.5 text-[16px] font-semibold text-text-primary">
                  {loading || !summary ? "—" : formatRupiah(summary.totalExpense)}
                </p>
              </Link>

              <Link
                href="/financial-explorer/categories"
                className="rounded-[12px] border border-border p-4 transition hover:bg-surface-muted"
              >
                <LineChart size={16} strokeWidth={1.8} className="text-info" />
                <p className="mt-2 text-[12px] font-medium text-text-primary">Kategori</p>
                <p className="mt-0.5 text-[10px] text-text-muted">Breakdown per kategori</p>
              </Link>

              <Link
                href="/financial-explorer/transactions"
                className="rounded-[12px] border border-border p-4 transition hover:bg-surface-muted"
              >
                <ReceiptText size={16} strokeWidth={1.8} className="text-text-secondary" />
                <p className="mt-2 text-[12px] font-medium text-text-primary">Transaksi</p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {summary ? `${summary.transactionCount} transaksi` : "Daftar transaksi"}
                </p>
              </Link>
            </div>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="text-[13px] font-semibold text-text-primary">Transaksi Terbaru</h2>
            <Link
              href="/financial-explorer/transactions"
              className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
            >
              Lihat semua
            </Link>
          </div>

          <TransactionList transactions={recent} loading={loading} />
        </section>
      </div>
    </main>
  );
}
