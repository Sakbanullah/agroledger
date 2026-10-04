"use client";

import { ArrowRight, CircleDollarSign, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOwnerSettlements } from "@/lib/api";

type OwnerSettlement = {
  id: number;
  saleId: number;
  ownerId: number;
  ownerShareAmount: string | number;
  settledAmount: string | number;
  outstandingAmount: string | number;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string };
  sale: {
    id: number;
    saleDate: string;
    status: string;
    farm?: { id: number; name: string; ownershipType?: string | null };
    commodity?: { id: number; name: string };
  };
};

function formatRupiah(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `Rp${new Intl.NumberFormat("id-ID").format(Number(value))}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  if (status === "PENDING") return "Pending";
  if (status === "PARTIAL") return "Sebagian Dibayar";
  if (status === "COMPLETED") return "Lunas";
  return status;
}

function getStatusClass(status: string) {
  if (status === "COMPLETED") return "bg-success-soft text-success";
  if (status === "PARTIAL") return "bg-info-soft text-info";
  return "bg-warning-soft text-warning";
}

export default function OwnerSettlementPage() {
  const [settlements, setSettlements] = useState<OwnerSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getOwnerSettlements();
      setSettlements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data pembayaran pemilik.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    let totalShare = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    settlements.forEach((s) => {
      totalShare += Number(s.ownerShareAmount ?? 0);
      totalPaid += Number(s.settledAmount ?? 0);
      totalOutstanding += Number(s.outstandingAmount ?? 0);
    });

    return { totalShare, totalPaid, totalOutstanding };
  }, [settlements]);

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-success" />
            <p className="text-xs text-text-muted">
              Memuat pembayaran pemilik...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-sm font-semibold text-danger">
            !
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Gagal memuat pembayaran pemilik
            </h2>
            <p className="mt-1 text-xs text-text-secondary">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-6">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            SETTLEMENT
          </p>
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-text-primary">
            Pembayaran Pemilik
          </h1>
          <p className="mt-1.5 text-xs text-text-secondary">
            Bagian pemilik dari penjualan sawit milik saudara yang menunggu
            pembayaran.
          </p>
        </header>

        {/* SUMMARY */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-surface-soft">
                <Wallet size={13} className="text-success" />
              </div>
              <p className="text-[10px] text-text-muted">Bagian Pemilik</p>
            </div>
            <p className="mt-3 text-[20px] font-semibold leading-none tracking-[-0.035em] text-text-primary">
              {formatRupiah(summary.totalShare)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-surface-soft">
                <CircleDollarSign size={13} className="text-success" />
              </div>
              <p className="text-[10px] text-text-muted">Sudah Dibayar</p>
            </div>
            <p className="mt-3 text-[20px] font-semibold leading-none tracking-[-0.035em] text-success">
              {formatRupiah(summary.totalPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-warning-soft">
                <Wallet size={13} className="text-warning" />
              </div>
              <p className="text-[10px] text-text-muted">Sisa Pembayaran</p>
            </div>
            <p className="mt-3 text-[20px] font-semibold leading-none tracking-[-0.035em] text-warning">
              {formatRupiah(summary.totalOutstanding)}
            </p>
          </div>
        </section>

        {/* LIST */}
        {settlements.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-lg text-text-muted">
              ∅
            </div>
            <h2 className="text-sm font-semibold text-text-primary">
              Belum ada pembayaran pemilik
            </h2>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Bagian pemilik dari penjualan sawit milik saudara akan muncul di
              sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-surface-soft">
                  <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Pemilik
                  </th>
                  <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Kebun / Penjualan
                  </th>
                  <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Bagian Pemilik
                  </th>
                  <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Sudah Dibayar
                  </th>
                  <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Sisa Pembayaran
                  </th>
                  <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eef1ed]">
                {settlements.map((s) => (
                  <tr key={s.id} className="transition hover:bg-[#fafcf8]">
                    <td className="px-4 py-3.5 text-xs font-medium text-text-primary sm:px-5">
                      {s.owner?.name ?? "-"}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-[#4c574f] sm:px-5">
                      <p className="font-medium">{s.sale?.farm?.name ?? "-"}</p>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        Sale #{s.saleId} · {formatDate(s.sale?.saleDate ?? s.createdAt)}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-text-primary sm:px-5">
                      {formatRupiah(s.ownerShareAmount)}
                    </td>

                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-success sm:px-5">
                      {formatRupiah(s.settledAmount)}
                    </td>

                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-warning sm:px-5">
                      {formatRupiah(s.outstandingAmount)}
                    </td>

                    <td className="px-4 py-3.5 sm:px-5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] ${getStatusClass(
                          s.status,
                        )}`}
                      >
                        {getStatusLabel(s.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right sm:px-5">
                      <Link
                        href={`/owner-settlement/${s.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-success transition hover:text-success"
                      >
                        Detail
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
