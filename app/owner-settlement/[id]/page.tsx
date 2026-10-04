"use client";

import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getOwnerSettlement, payOwnerSettlement } from "@/lib/api";

type OwnerSettlement = {
  id: number;
  saleId: number;
  ownerId: number;
  ownerShareAmount: string | number;
  settledAmount: string | number;
  outstandingAmount: string | number;
  status: string;
  owner: { id: number; name: string };
  sale: {
    id: number;
    saleDate: string;
    pricePerKg: string | number | null;
    totalWeightKg: string | number | null;
    notes: string | null;
    status: string;
    farmId: number;
    commodityId: number;
    commissionRatePerKg: string | number | null;
    commissionAmount: string | number | null;
    ownerShareAmount: string | number | null;
    farm?: { id: number; name: string; location: string | null };
    commodity?: { id: number; name: string };
  };
};

function formatRupiah(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `Rp${new Intl.NumberFormat("id-ID").format(Number(value))}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
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

export default function OwnerSettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [settlement, setSettlement] = useState<OwnerSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getOwnerSettlement(id);
      setSettlement(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil detail pembayaran pemilik.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID pembayaran pemilik tidak valid.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const outstanding = settlement ? Number(settlement.outstandingAmount) : 0;
  const isCompleted = settlement?.status === "COMPLETED";
  const parsedAmount = Number(amount);

  const handlePayFull = () => {
    if (!settlement) return;
    setAmount(String(Number(settlement.outstandingAmount)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settlement) return;

    setPayError("");
    setPaySuccess("");

    if (!amount || Number.isNaN(parsedAmount)) {
      setPayError("Nominal wajib diisi.");
      return;
    }

    if (parsedAmount <= 0) {
      setPayError("Nominal harus lebih dari 0.");
      return;
    }

    if (parsedAmount > outstanding) {
      setPayError(
        `Nominal (${formatRupiah(parsedAmount)}) melebihi sisa pembayaran (${formatRupiah(outstanding)}).`,
      );
      return;
    }

    try {
      setPaying(true);
      await payOwnerSettlement(id, parsedAmount);
      setAmount("");
      setPaySuccess("Pembayaran berhasil dicatat.");
      const data = await getOwnerSettlement(id);
      setSettlement(data);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Gagal melakukan pembayaran.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-success" />
            <p className="text-xs text-text-muted">Memuat detail...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !settlement) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <Link
            href="/owner-settlement"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Kembali
          </Link>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
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
        </div>
      </main>
    );
  }

  const grossSale =
    settlement.sale.pricePerKg !== null &&
    settlement.sale.totalWeightKg !== null
      ? Number(settlement.sale.pricePerKg) *
        Number(settlement.sale.totalWeightKg)
      : null;

  const commission = settlement.sale.commissionAmount ?? null;
  const ownerShare = settlement.ownerShareAmount;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/owner-settlement"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Kembali ke daftar
        </Link>

        {/* HEADER */}
        <header className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                PEMBAYARAN PEMILIK
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.035em] text-text-primary">
                {settlement.owner?.name}
              </h1>
              <p className="mt-1 text-xs text-text-secondary">
                Sale #{settlement.saleId} ·{" "}
                {settlement.sale.commodity?.name ?? "-"} ·{" "}
                {formatDate(settlement.sale.saleDate)}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClass(
                settlement.status,
              )}`}
            >
              {getStatusLabel(settlement.status)}
            </span>
          </div>
        </header>

        {/* SALE + FINANCE */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Penjualan
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Kebun</span>
                <span className="font-medium text-text-primary">
                  {settlement.sale.farm?.name ?? "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Komoditas</span>
                <span className="font-medium text-text-primary">
                  {settlement.sale.commodity?.name ?? "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">
                  Berat × Harga
                </span>
                <span className="font-medium text-text-primary">
                  {settlement.sale.totalWeightKg ?? "-"} kg ×{" "}
                  {settlement.sale.pricePerKg !== null
                    ? formatRupiah(settlement.sale.pricePerKg)
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Gross Sale</span>
                <span className="font-semibold text-text-primary">
                  {grossSale !== null ? formatRupiah(grossSale) : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Commission</span>
                <span className="font-medium text-text-primary">
                  {commission !== null ? formatRupiah(commission) : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Bagian Pemilik
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Bagian Pemilik</span>
                <span className="font-semibold text-text-primary">
                  {formatRupiah(ownerShare)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Sudah Dibayar</span>
                <span className="font-semibold text-success">
                  {formatRupiah(settlement.settledAmount)}
                </span>
              </div>

              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-medium text-warning">
                  Sisa Pembayaran
                </span>
                <span className="font-semibold text-warning">
                  {formatRupiah(settlement.outstandingAmount)}
                </span>
              </div>

              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">Status</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${getStatusClass(
                    settlement.status,
                  )}`}
                >
                  {getStatusLabel(settlement.status)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PAYMENT FORM */}
        <section className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-soft">
              <Wallet size={14} className="text-success" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">
              Pembayaran
            </h2>
          </div>

          {isCompleted ? (
            <p className="mt-4 rounded-xl border border-border bg-surface-soft px-4 py-3 text-xs text-text-secondary">
              Pembayaran sudah lunas. Tidak ada tindakan yang diperlukan.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4">
              <p className="text-[10px] text-text-muted">
                Maksimum yang dapat dibayar:{" "}
                <span className="font-semibold text-text-primary">
                  {formatRupiah(outstanding)}
                </span>
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Nominal pembayaran"
                    min={0.01}
                    step="0.01"
                    max={outstanding}
                    className="h-10 w-full rounded-[10px] border border-border bg-surface pl-8 pr-3 text-xs text-text-primary outline-none transition focus:border-border sm:text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePayFull}
                  className="shrink-0 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[11px] font-medium text-[#4c574f] transition hover:bg-surface-soft"
                >
                  Bayar penuh
                </button>
              </div>

              {payError && (
                <p className="mt-3 rounded-xl border border-border bg-danger-soft px-3 py-2 text-[11px] text-danger">
                  {payError}
                </p>
              )}

              {paySuccess && (
                <p className="mt-3 rounded-xl border border-[#d6e8cf] bg-surface-soft px-3 py-2 text-[11px] text-success">
                  {paySuccess}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={paying}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-surface px-5 text-xs font-medium text-white transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {paying && <Loader2 size={14} className="animate-spin" />}
                  Bayar
                </button>

                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] border border-border bg-surface px-4 text-xs text-[#4c574f] transition hover:bg-surface-soft"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
