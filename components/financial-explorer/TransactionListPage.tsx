"use client";

import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ExplorerTransaction,
  exportExplorerTransactionsCsv,
  getExplorerTransactions,
} from "@/lib/api";

import ExplorerHeader from "@/components/financial-explorer/ExplorerHeader";
import { TransactionList } from "@/components/financial-explorer/TransactionList";
import {
  EXPLORER_CATEGORIES,
  categoryLabel,
  daysAgoISO,
  formatRupiah,
  todayISO,
} from "@/components/financial-explorer/format";

/**
 * Paginated, server-filtered transaction list. The query string is the source
 * of truth for filters so detail pages can link back with the same context.
 */
export default function TransactionListPage() {
  const query = useSearchParams();

  const [startDate, setStartDate] = useState(query.get("startDate") ?? daysAgoISO(29));
  const [endDate, setEndDate] = useState(query.get("endDate") ?? todayISO());
  const [type, setType] = useState<"" | "IN" | "OUT">(
    (query.get("type") as "" | "IN" | "OUT") ?? "",
  );
  const [category, setCategory] = useState(query.get("category") ?? "");
  const [search, setSearch] = useState(query.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [appliedSearch, setAppliedSearch] = useState(search);

  const [data, setData] = useState<{
    data: ExplorerTransaction[];
    total: number;
    totalPages: number;
    totalAmount: number;
  }>({ data: [], total: 0, totalPages: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setAppliedSearch(search);
      getExplorerTransactions({
        startDate,
        endDate,
        type: type || undefined,
        category: category || undefined,
        search: search || undefined,
        page,
        pageSize: 25,
      })
        .then((result) => {
          if (cancelled) return;
          setError("");
          setData({
            data: result.data,
            total: result.total,
            totalPages: result.totalPages,
            totalAmount: result.totalAmount,
          });
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startDate, endDate, type, category, search, page]);

  const updateFilter = (apply: () => void) => {
    setPage(1);
    setExportFeedback(null);
    apply();
  };

  const exportCsv = async () => {
    setExporting(true);
    setExportFeedback(null);

    try {
      const { blob, filename } = await exportExplorerTransactionsCsv({
        startDate,
        endDate,
        type: type || undefined,
        category: category || undefined,
        search: search || undefined,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      link.remove();
      // Revoke after the browser has started the download.
      setTimeout(() => URL.revokeObjectURL(url), 0);

      setExportFeedback({
        tone: "ok",
        text: `CSV berhasil diunduh: ${filename}`,
      });
    } catch (err) {
      setExportFeedback({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal mengekspor transaksi",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <ExplorerHeader
          title="Transaksi"
          subtitle="Semua pergerakan kas, dapat difilter dan ditelusuri"
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => updateFilter(() => {
            setStartDate(start);
            setEndDate(end);
          })}
          backHref="/financial-explorer"
        />

        {error && (
          <div className="mb-4 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <label className="relative block w-full sm:w-[240px]">
              <Search
                size={14}
                strokeWidth={1.8}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={search}
                placeholder="Cari keterangan atau kategori..."
                onChange={(event) =>
                  updateFilter(() => setSearch(event.target.value))
                }
                aria-label="Cari transaksi"
                className="h-9 w-full rounded-[9px] border border-border bg-surface pl-9 pr-3 text-[11px] text-text-primary outline-none placeholder:text-text-muted"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter tipe"
                value={type}
                onChange={(event) =>
                  updateFilter(() => setType(event.target.value as "" | "IN" | "OUT"))
                }
                className="h-9 rounded-[9px] border border-border bg-surface px-2 text-[11px] text-text-primary outline-none"
              >
                <option value="">Semua tipe</option>
                <option value="IN">Pemasukan</option>
                <option value="OUT">Pengeluaran</option>
              </select>

              <select
                aria-label="Filter kategori"
                value={category}
                onChange={(event) => updateFilter(() => setCategory(event.target.value))}
                className="h-9 rounded-[9px] border border-border bg-surface px-2 text-[11px] text-text-primary outline-none"
              >
                <option value="">Semua kategori</option>
                {EXPLORER_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={exportCsv}
                disabled={exporting || loading}
                className="flex h-9 items-center gap-1.5 rounded-[9px] border border-border px-3 text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted disabled:opacity-40"
              >
                <Download size={13} strokeWidth={1.8} />
                {exporting ? "Mengekspor..." : "Export CSV"}
              </button>
            </div>
          </div>

          {exportFeedback && (
            <div
              role="status"
              className={`border-b border-border px-4 py-2.5 text-[10px] sm:px-5 ${
                exportFeedback.tone === "ok" ? "text-text-secondary" : "text-danger"
              }`}
            >
              {exportFeedback.text}
            </div>
          )}

          <div className="flex flex-wrap gap-4 border-b border-border bg-surface-muted px-4 py-2.5 text-[10px] text-text-secondary sm:px-5">
            <span>
              {loading
                ? "Memuat..."
                : appliedSearch
                  ? `${data.total} transaksi untuk "${appliedSearch}"`
                  : `${data.total} transaksi`}
            </span>
            <span>Total: {formatRupiah(data.totalAmount)}</span>
          </div>

          <TransactionList transactions={data.data} loading={loading} />

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[10px] sm:px-5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-[8px] border border-border px-3 py-1.5 font-medium text-text-secondary transition hover:bg-surface-muted disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="text-text-muted">
                Halaman {page} dari {data.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= data.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-[8px] border border-border px-3 py-1.5 font-medium text-text-secondary transition hover:bg-surface-muted disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
