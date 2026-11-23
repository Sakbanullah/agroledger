"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";

import { getExplorerSummary, ExplorerSummary } from "@/lib/api";

import {
  RANGE_PRESETS,
  daysAgoISO,
  formatRupiah,
  todayISO,
} from "./format";

type ExplorerHeaderProps = {
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  backHref?: string;
};

/**
 * Shared page header for the explorer: title, period picker, and the summary
 * strip. The strip always comes from GET /financial-explorer/summary, so the
 * numbers on every explorer page agree with each other.
 */
export default function ExplorerHeader({
  title,
  subtitle,
  startDate,
  endDate,
  onRangeChange,
  backHref,
}: ExplorerHeaderProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExplorerSummary({ startDate, endDate })
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const cards = summary
    ? [
        { label: "Pemasukan", value: summary.totalIncome },
        { label: "Pengeluaran", value: summary.totalExpense },
        { label: "Net Cash Flow", value: summary.netCashFlow },
        { label: "Saldo Awal", value: summary.openingBalance },
        { label: "Saldo Akhir", value: summary.closingBalance },
      ]
    : [];

  return (
    <header className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
            Financial Explorer
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            {backHref && (
              <button
                type="button"
                onClick={() => router.push(backHref)}
                aria-label="Kembali"
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-border text-text-secondary transition hover:bg-surface-muted"
              >
                <ChevronLeft size={15} strokeWidth={1.8} />
              </button>
            )}

            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {title}
            </h1>
          </div>

          <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((preset) => {
            const presetStart = daysAgoISO(preset.days);
            const active = startDate === presetStart && endDate === todayISO();

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onRangeChange(presetStart, todayISO())}
                className={`h-9 rounded-[9px] border px-3 text-[11px] font-medium transition ${
                  active
                    ? "border-agro-primary bg-agro-primary-soft text-agro-primary-dark"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-muted"
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <div className="flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-surface px-2.5">
            <CalendarDays size={13} strokeWidth={1.8} className="text-text-muted" />

            <input
              type="date"
              aria-label="Tanggal mulai"
              value={startDate}
              max={endDate}
              onChange={(event) =>
                event.target.value && onRangeChange(event.target.value, endDate)
              }
              className="w-[112px] bg-transparent text-[11px] text-text-primary outline-none"
            />

            <span className="text-[10px] text-text-muted">s/d</span>

            <input
              type="date"
              aria-label="Tanggal akhir"
              value={endDate}
              min={startDate}
              onChange={(event) =>
                event.target.value && onRangeChange(startDate, event.target.value)
              }
              className="w-[112px] bg-transparent text-[11px] text-text-primary outline-none"
            />
          </div>
        </div>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {failed ? (
          <p className="col-span-full text-[11px] text-danger">
            Gagal memuat ringkasan.
          </p>
        ) : !summary ? (
          <p className="col-span-full text-[11px] text-text-muted">Memuat ringkasan...</p>
        ) : (
          cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[14px] border border-border bg-surface p-4"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted sm:text-[10px]">
                {card.label}
              </p>

              <p
                className={`mt-2 break-words text-[16px] font-semibold tracking-[-0.02em] sm:text-[18px] ${
                  card.label === "Net Cash Flow" && card.value < 0
                    ? "text-danger"
                    : "text-text-primary"
                }`}
              >
                {formatRupiah(card.value)}
              </p>
            </div>
          ))
        )}
      </section>

      {summary && summary.passthrough.salesIn > 0 && (
        <p className="mt-3 rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-[10px] leading-5 text-text-secondary sm:text-[11px]">
          {formatRupiah(summary.passthrough.salesIn)} berasal dari penjualan farm
          saudara ({summary.passthrough.count} transaksi). Uang ini milik pemilik
          farm dan tidak dihitung sebagai pemasukan Anda.
        </p>
      )}
    </header>
  );
}
