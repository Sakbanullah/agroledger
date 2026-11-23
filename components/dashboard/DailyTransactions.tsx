"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ReceiptText, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ExplorerTransaction,
  getExplorerTransaction,
  getExplorerTransactions,
  ExplorerSettlementSummary,
} from "@/lib/api";

import { TransactionRow } from "@/components/financial-explorer/TransactionList";
import {
  categoryLabel,
  formatDateLabel,
  formatRupiah,
  todayISO,
} from "@/components/financial-explorer/format";

const DAYS_BACK = 30;
const DAYS_SHOWN = 4;

type DayGroup = {
  date: string;
  income: number;
  expense: number;
  count: number;
};

const dayKey = (value: string) => value.slice(0, 10);

/** The date `days` days before today, as YYYY-MM-DD. */
function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function isSettlementPaid(settlement: ExplorerSettlementSummary) {
  return (
    settlement.status !== "CANCELLED" &&
    (Number(settlement.cashTransaction?.amount ?? 0) > 0 ||
      Number(settlement.creditPayment?.amount ?? 0) > 0)
  );
}

function SettlementSection({ settlement }: { settlement: ExplorerSettlementSummary }) {
  return (
    <div className="mt-2 space-y-2">
      {!isSettlementPaid(settlement) && (
        <p className="text-[10px] text-text-muted">
          Settlement ini tercatat {settlement.status}; tidak ada uang yang dibayarkan.
        </p>
      )}

      <SettlementBreakdown settlement={settlement} />
    </div>
  );
}

/**
 * Cash movement of one worker settlement, taken from the rows that actually
 * moved money. The calculation rows (bruto, potongan, net) are shown as
 * stored, never recomputed here.
 */
export function SettlementBreakdown({
  settlement,
}: {
  settlement: ExplorerSettlementSummary;
}) {
  const cash = settlement.cashTransaction
    ? Number(settlement.cashTransaction.amount)
    : null;
  const offset = settlement.creditPayment
    ? Number(settlement.creditPayment.amount)
    : null;
  const rows = [
    { label: "Hasil kotor (gross)", value: Number(settlement.grossShare) },
    { label: "Bagian pekerja", value: Number(settlement.workerShareAmount) },
    { label: "Saldo kasbon", value: Number(settlement.kasbonAmount) },
    { label: "Potongan kasbon", value: -Number(settlement.deductionAmount) },
    { label: "Pembayaran bersih", value: Number(settlement.netAmount), strong: true },
    {
      label: "Uang dibayarkan tunai",
      value: cash,
      missing: "Tidak ada — hasil bersih ditutup potongan kasbon",
    },
    {
      label: "Kasbon dipotong (PAYMENT)",
      value: offset,
      missing: "Tidak ada potongan kasbon",
    },
  ];

  return (
    <table className="w-full text-[11px]">
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <tr key={row.label}>
            <td className={`py-1.5 pr-3 ${row.strong ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
              {row.label}
            </td>
            <td
              className={`py-1.5 text-right ${
                row.strong ? "font-semibold text-text-primary" : "text-text-primary"
              } ${row.value !== null && row.value < 0 ? "text-warning" : ""}`}
            >
              {row.value === null
                ? <span className="text-[10px] text-text-muted">{row.missing}</span>
                : formatRupiah(row.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DailyTransactions() {
  const [days, setDays] = useState<DayGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayTransactions, setDayTransactions] = useState<ExplorerTransaction[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [openTransaction, setOpenTransaction] = useState<ExplorerTransaction | null>(
    null,
  );
  const [settlement, setSettlement] = useState<ExplorerSettlementSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const endDate = todayISO();
    const startDate = isoDaysAgo(DAYS_BACK);

    getExplorerTransactions({ startDate, endDate, pageSize: 100 })
      .then((result) => {
        if (cancelled) return;
        setError("");

        // Only the user's own rows count; passthrough sales are not income.
        const groups = new Map<string, DayGroup>();
        for (const row of result.data) {
          if (row.role === "PASSTHROUGH") continue;
          const key = dayKey(row.transactionDate);
          const group = groups.get(key) ?? { date: key, income: 0, expense: 0, count: 0 };
          if (row.type === "IN") group.income += row.amount;
          else group.expense += row.amount;
          group.count += 1;
          groups.set(key, group);
        }

        setDays(
          Array.from(groups.values())
            .filter((group) => group.count > 0)
            .sort((a, b) => b.date.localeCompare(a.date)),
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
  }, []);

  const toggleDay = (date: string) => {
    if (expanded === date) {
      setExpanded(null);
      return;
    }

    setExpanded(date);
    setOpenTransaction(null);
    setSettlement(null);
    setDayLoading(true);

    getExplorerTransactions({ startDate: date, endDate: date, pageSize: 100 })
      .then((result) => setDayTransactions(result.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setDayLoading(false));
  };

  const openSettlement = (transaction: ExplorerTransaction) => {
    if (openTransaction?.id === transaction.id) {
      setOpenTransaction(null);
      setSettlement(null);
      return;
    }

    setOpenTransaction(transaction);
    setSettlement(null);
    setDetailLoading(true);

    getExplorerTransaction(transaction.id)
      .then((detail) => setSettlement(detail.settlement))
      .catch((err: Error) => setError(err.message))
      .finally(() => setDetailLoading(false));
  };

  const shown = days.slice(0, DAYS_SHOWN);

  return (
    <section className="rounded-[12px] border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Transactions
          </p>

          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
            Transaksi Terbaru
          </h2>

          <p className="mt-0.5 text-[11px] text-text-secondary">
            Total kas per tanggal, {DAYS_BACK + 1} hari terakhir
          </p>
        </div>

        <Link
          href="/financial-explorer/transactions"
          className="text-[11px] font-semibold text-success transition hover:text-success"
        >
          Lihat semua
        </Link>
      </div>

      {error && (
        <p className="px-5 py-3 text-[11px] text-danger">{error}</p>
      )}

      {loading ? (
        <div className="flex min-h-[190px] items-center justify-center px-5">
          <p className="text-[11px] text-text-muted">Memuat transaksi...</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-soft text-text-muted">
            <ReceiptText size={17} />
          </div>

          <p className="mt-3 text-[12px] font-medium text-text-secondary">
            Belum ada transaksi
          </p>

          <p className="mt-1 text-[10px] text-text-muted">
            Aktivitas keuangan akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {shown.map((day) => {
            const isOpen = expanded === day.date;

            return (
              <div key={day.date}>
                <button
                  type="button"
                  onClick={() => toggleDay(day.date)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-muted"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-soft text-text-secondary">
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-text-primary">
                      {formatDateLabel(day.date)}
                    </p>

                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {day.count} transaksi
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-4 text-right">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.06em] text-text-muted">
                        Masuk
                      </p>
                      <p className={`text-[11px] font-semibold ${day.income > 0 ? "text-success" : "text-text-muted"}`}>
                        {formatRupiah(day.income)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] uppercase tracking-[0.06em] text-text-muted">
                        Keluar
                      </p>
                      <p className={`text-[11px] font-semibold ${day.expense > 0 ? "text-text-primary" : "text-text-muted"}`}>
                        {formatRupiah(day.expense)}
                      </p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-surface-muted/60 px-4 py-3 sm:px-5">
                    {dayLoading ? (
                      <p className="py-4 text-center text-[11px] text-text-muted">
                        Memuat transaksi...
                      </p>
                    ) : (
                      <>
                        {(["IN", "OUT"] as const).map((type) => {
                          const rows = dayTransactions.filter((row) => row.type === type);
                          const total = rows.reduce(
                            (sum, row) => sum + (row.role === "PASSTHROUGH" ? 0 : row.amount),
                            0,
                          );

                          if (rows.length === 0) return null;

                          return (
                            <div key={type} className="mb-3 last:mb-0">
                              <div className="mb-1 flex items-center justify-between px-1">
                                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                  {type === "IN" ? (
                                    <Wallet size={12} strokeWidth={1.8} className="text-success" />
                                  ) : (
                                    <Wallet size={12} strokeWidth={1.8} />
                                  )}
                                  {type === "IN" ? "Pemasukan" : "Pengeluaran"}
                                </p>

                                <p className="text-[10px] font-semibold text-text-primary">
                                  {formatRupiah(total)}
                                </p>
                              </div>

                              <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
                                {rows.map((row) => (
                                  <div key={row.id} className="border-b border-border last:border-0">
                                    <div className="relative">
                                      <div className="pr-10">
                                        <TransactionRow transaction={row} />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => openSettlement(row)}
                                        aria-expanded={openTransaction?.id === row.id}
                                        aria-label={`Rincian ${row.description ?? categoryLabel(row.category)}`}
                                        className="absolute inset-0 transition hover:bg-surface-muted/40"
                                      />
                                    </div>

                                    {openTransaction?.id === row.id && (
                                      <div className="border-t border-border bg-surface-muted px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-[11px] font-semibold text-text-primary">
                                            {row.referenceType === "SETTLEMENT"
                                              ? `Pembayaran settlement · ${row.description ?? ""}`.trim()
                                              : row.description || categoryLabel(row.category)}
                                          </p>

                                          <Link
                                            href={`/financial-explorer/transactions/${row.id}`}
                                            className="text-[10px] font-medium text-success hover:underline"
                                          >
                                            Buka detail transaksi →
                                          </Link>
                                        </div>

                                        {row.referenceType !== "SETTLEMENT" ? (
                                          <p className="mt-2 text-[10px] text-text-muted">
                                            Transaksi ini bukan pembayaran settlement pekerja.
                                          </p>
                                        ) : settlement ? (
                                          <SettlementSection settlement={settlement} />
                                        ) : detailLoading ? (
                                          <p className="mt-2 text-[10px] text-text-muted">
                                            Memuat rincian settlement...
                                          </p>
                                        ) : (
                                          <p className="mt-2 text-[10px] text-text-muted">
                                            Rincian settlement tidak tersedia untuk transaksi ini.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        <Link
                          href={expanded ? `/financial-explorer/date/${expanded}` : "#"}
                          className="mt-1 inline-block px-1 text-[10px] font-medium text-success hover:underline"
                        >
                          Buka halaman tanggal {expanded ? formatDateLabel(expanded) : ""} →
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && days.length > DAYS_SHOWN && (
        <div className="border-t border-border px-5 py-2.5">
          <Link
            href="/financial-explorer"
            className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
          >
            {days.length - DAYS_SHOWN} tanggal lainnya di Financial Explorer →
          </Link>
        </div>
      )}
    </section>
  );
}
