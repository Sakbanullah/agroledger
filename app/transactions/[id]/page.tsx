"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CircleDollarSign,
  FileText,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getMoneyTransaction } from "@/lib/api";

type TransactionDetail = {
  id: number;
  type: "IN" | "OUT";
  category: string;
  amount: number | string;
  transactionDate: string;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  farmId: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt?: string;
};

type FarmDetail = {
  id: number;
  name: string;
  location: string | null;
  ownershipType: string | null;
};

function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(dateString: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    OPERASIONAL: "Operasional",
    WARUNG: "Warung",
    PERTANIAN: "Pertanian",
    TRANSPORTASI: "Transportasi",
    PERAWATAN: "Perawatan",
    LAINNYA: "Lainnya",
    HARVEST_SALE: "Penjualan Panen",
    OWNER_SETTLEMENT: "Settlement Pemilik",
    RUBBER_WORKER_SETTLEMENT: "Settlement Pekerja",
    OPENING_BALANCE: "Saldo Awal",
  };

  return labels[category] ?? category;
}

function getReferenceSourceLabel(type: string) {
  const labels: Record<string, string> = {
    SALE: "Penjualan Hasil Panen",
    OWNER_SETTLEMENT: "Pembayaran Pemilik Kebun",
    SETTLEMENT: "Settlement Pekerja",
    OPENING_BALANCE: "Saldo Awal",
  };

  return labels[type] ?? type;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const transactionId = Number(idParam);

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transactionId || Number.isNaN(transactionId)) {
      setError("ID transaksi tidak valid.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const tx = await getMoneyTransaction(transactionId);
        setTransaction(tx);

        if (tx.farmId) {
          try {
            const res = await fetch(`http://localhost:3001/farms/${tx.farmId}`);
            if (res.ok) {
              const farmData = await res.json();
              setFarm(farmData);
            }
          } catch {
            // Non-critical, fallback to showing farmId
          }
        }
      } catch (err) {
        console.error("Gagal mengambil detail transaksi:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil detail transaksi.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [transactionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="mx-auto max-w-3xl">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-soft" />
          <div className="mt-6 h-40 animate-pulse rounded-[16px] bg-surface-soft" />
        </div>
      </main>
    );
  }

  if (error || !transaction) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-[12px] font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            Kembali ke Transaksi
          </Link>

          <div className="mt-6 rounded-[16px] border border-border bg-surface p-8 text-center shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-surface-soft text-text-muted">
              <CircleDollarSign size={22} />
            </div>

            <h1 className="mt-4 text-[16px] font-semibold text-text-primary">
              Transaksi Tidak Ditemukan
            </h1>

            <p className="mt-1 text-[12px] text-text-secondary">
              {error || "Transaksi yang Anda cari tidak tersedia."}
            </p>

            <Link
              href="/transactions"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-[10px] bg-surface px-4 text-[12px] font-medium text-white transition hover:bg-surface-soft"
            >
              Kembali ke Daftar Transaksi
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isAutomatic = Boolean(transaction.referenceType);

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-5 text-text-primary sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="mx-auto max-w-3xl">
        {/* Navigation */}
        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Kembali ke Transaksi
        </Link>

        {/* Header Card */}
        <div className="mt-4 rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${
                  transaction.type === "IN"
                    ? "bg-success-soft text-success"
                    : "bg-surface-soft text-text-secondary"
                }`}
              >
                {transaction.type === "IN" ? (
                  <ArrowDownLeft size={22} strokeWidth={1.8} />
                ) : (
                  <ArrowUpRight size={22} strokeWidth={1.8} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Transaksi #{transaction.id}
                  </p>

                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                      isAutomatic
                        ? "bg-surface-soft text-success"
                        : "bg-surface-soft text-text-secondary"
                    }`}
                  >
                    {isAutomatic ? "Otomatis System" : "Manual"}
                  </span>
                </div>

                <p className="mt-1 text-[24px] font-bold tracking-[-0.03em] sm:text-[28px]">
                  <span
                    className={
                      transaction.type === "IN"
                        ? "text-success"
                        : "text-text-primary"
                    }
                  >
                    {transaction.type === "IN" ? "+" : "-"}
                    {formatRupiah(transaction.amount)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
                  transaction.type === "IN"
                    ? "bg-success-soft text-success"
                    : "bg-surface-soft text-text-secondary"
                }`}
              >
                {transaction.type === "IN" ? "Pemasukan" : "Pengeluaran"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1 text-[11px] font-medium text-text-secondary">
                <Tag size={12} />
                {getCategoryLabel(transaction.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details Section */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* Main Info */}
          <div className="rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <h2 className="text-[13px] font-semibold text-text-primary">
              Informasi Transaksi
            </h2>

            <div className="mt-4 space-y-3 text-[12px]">
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Calendar size={14} className="text-text-muted" />
                  Tanggal Transaksi
                </span>

                <span className="font-medium text-text-primary">
                  {formatDate(transaction.transactionDate)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Tag size={14} className="text-text-muted" />
                  Kategori
                </span>

                <span className="font-medium text-text-primary">
                  {getCategoryLabel(transaction.category)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 pt-1">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <FileText size={14} className="text-text-muted" />
                  Keterangan
                </span>

                <span className="text-right font-medium text-text-primary">
                  {transaction.description ?? "Tidak ada keterangan"}
                </span>
              </div>
            </div>
          </div>

          {/* Context / Reference Info */}
          <div className="rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <h2 className="text-[13px] font-semibold text-text-primary">
              Konteks & Asal Transaksi
            </h2>

            <div className="mt-4 space-y-3 text-[12px]">
              {transaction.referenceType ? (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5">
                    <span className="text-text-secondary">Sumber / Ref Type</span>

                    {transaction.referenceType === "OWNER_SETTLEMENT" && transaction.referenceId ? (
                        <Link
                          href={`/owner-settlement/${transaction.referenceId}`}
                          className="font-medium text-success hover:underline"
                        >
                          {getReferenceSourceLabel(transaction.referenceType)}
                        </Link>
                      ) : (
                        <span className="font-medium text-success">
                          {getReferenceSourceLabel(transaction.referenceType)}
                        </span>
                      )}
                  </div>

                  {transaction.referenceId && (
                    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2.5">
                      <span className="text-text-secondary">ID Referensi</span>

                      <span className="font-mono font-medium text-text-primary">
                        #{transaction.referenceId}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="border-b border-border/60 pb-2.5 text-text-muted">
                  Transaksi dibuat secara manual oleh pengguna.
                </div>
              )}

              {/* Farm Info */}
              {farm ? (
                <div className="flex items-start justify-between gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Building2 size={14} className="text-text-muted" />
                    Kebun
                  </span>

                  <div className="text-right">
                    <p className="font-medium text-text-primary">{farm.name}</p>

                    {farm.ownershipType && (
                      <p className="text-[10px] uppercase text-text-muted">
                        Milik {farm.ownershipType === "OWN" ? "Sendiri" : "Saudara"}
                      </p>
                    )}
                  </div>
                </div>
              ) : transaction.farmId ? (
                <div className="flex items-start justify-between gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Building2 size={14} className="text-text-muted" />
                    ID Kebun
                  </span>

                  <span className="font-mono font-medium text-text-primary">
                    #{transaction.farmId}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* System Metadata Card */}
        <div className="mt-5 rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <h2 className="text-[13px] font-semibold text-text-primary">
            Metadata Sistem
          </h2>

          <div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
            <div>
              <span className="text-text-muted">Waktu Dicatat: </span>

              <span className="font-medium text-text-secondary">
                {formatDateTime(transaction.createdAt)}
              </span>
            </div>

            {transaction.updatedAt && (
              <div>
                <span className="text-text-muted">Terakhir Diperbarui: </span>

                <span className="font-medium text-text-secondary">
                  {formatDateTime(transaction.updatedAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
