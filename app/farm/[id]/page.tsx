"use client";

import {
  ArrowLeft,
  CircleDollarSign,
  LandPlot,
  Loader2,
  MapPin,
  Scale,
  ShieldUser,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getDashboardSummary, getFarm } from "@/lib/api";

type FarmDetail = {
  id: number;
  name: string;
  location: string | null;
  ownershipType: string | null;
  owners?: Array<{
    person: {
      id: number;
      name: string;
      phone: string | null;
    };
  }>;
};

type FarmSummary = {
  farmId: number;
  farmName: string;
  ownershipType: string;
  totalSales: number;
  totalWeightKg: number;
  grossSales: number;
  ownIncome: number;
  commissionIncome: number;
};

function formatRupiah(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `Rp${new Intl.NumberFormat("id-ID").format(Number(value))}`;
}

function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function getOwnershipLabel(type: string | null | undefined) {
  if (type === "OWN") return "Milik Sendiri (OWN)";
  if (type === "RELATIVE") return "Milik Saudara (RELATIVE)";
  return "Tidak Diketahui";
}

function getOwnershipClass(type: string | null | undefined) {
  if (type === "OWN") return "bg-success-soft text-success";
  if (type === "RELATIVE") return "bg-info-soft text-info";
  return "bg-surface-soft text-text-secondary";
}

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [farmSummary, setFarmSummary] = useState<FarmSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID kebun tidak valid.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [farmData, dashboardData] = await Promise.all([
          getFarm(id),
          getDashboardSummary(),
        ]);

        setFarm(farmData);

        const summaries: FarmSummary[] =
          dashboardData?.sales?.summaryByFarm || [];
        const match = summaries.find((s) => s.farmId === id);
        setFarmSummary(match || null);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat informasi kebun.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-success" />
            <p className="text-[11px] text-text-secondary">Memuat kebun...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !farm) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <Link
            href="/farm"
            className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Kembali ke daftar ladang
          </Link>

          <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-danger/20 bg-danger-soft p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-danger">
              !
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-text-primary">
                Gagal memuat kebun
              </h2>
              <p className="mt-1 text-[11px] text-text-secondary">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const ownersList = farm.owners?.map((o) => o.person?.name).filter(Boolean) || [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/farm"
          className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Kembali ke daftar ladang
        </Link>

        {/* HEADER */}
        <header className="mt-4 rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
                DETAIL KEBUN
              </p>
              <h1 className="mt-1.5 text-[20px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[22px]">
                {farm.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-text-muted" />
                  <span>{farm.location || "Lokasi belum diisi"}</span>
                </div>

                {ownersList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ShieldUser size={13} className="text-text-muted" />
                    <span>Pemilik: {ownersList.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getOwnershipClass(
                farm.ownershipType,
              )}`}
            >
              {getOwnershipLabel(farm.ownershipType)}
            </span>
          </div>
        </header>

        {/* FINANCIAL & ACTIVITY SUMMARY */}
        <section className="mt-4">
          <h2 className="text-[13px] font-semibold text-text-primary sm:text-[14px]">
            Ringkasan Aktivitas & Keuangan
          </h2>
          <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
            Akumulasi transaksi selesai dari kebun ini
          </p>

          {!farmSummary ? (
            <div className="mt-3 rounded-[16px] border border-border bg-surface px-5 py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[11px] bg-success-soft">
                <LandPlot size={18} className="text-success" />
              </div>
              <p className="mt-3 text-[12px] font-semibold text-text-primary">
                Belum ada data penjualan
              </p>
              <p className="mt-1 text-[10px] text-text-secondary">
                Kebun ini belum memiliki transaksi penjualan yang selesai.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Volume & Penjualan
                </p>

                <div className="mt-4 space-y-3 text-[11px] sm:text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Transaksi</span>
                    <span className="font-semibold text-text-primary">
                      {farmSummary.totalSales} penjualan
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Berat</span>
                    <span className="font-semibold text-text-primary">
                      {formatNumber(farmSummary.totalWeightKg)} kg
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-semibold text-text-primary">
                      Gross Sales (Bruto)
                    </span>
                    <span className="font-semibold text-text-primary">
                      {formatRupiah(farmSummary.grossSales)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Pendapatan & Komisi
                </p>

                <div className="mt-4 space-y-3 text-[11px] sm:text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Own Income</span>
                    <span className="font-semibold text-success">
                      {formatRupiah(farmSummary.ownIncome)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-secondary">Commission Income</span>
                    <span className="font-semibold text-success">
                      {formatRupiah(farmSummary.commissionIncome)}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="text-[10px] text-text-muted">
                      *Mengikuti aturan kepemilikan dan komisi bisnis
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
