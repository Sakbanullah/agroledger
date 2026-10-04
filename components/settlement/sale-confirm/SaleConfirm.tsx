"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Worker {
  id: number;
  pieces: number;
  weightKg: string;
  worker: {
    id: number;
    name: string;
  };
}

interface Sale {
  id: number;
  saleDate: string;
  pricePerKg: string | null;
  totalWeightKg: string | null;
  buyerName: string | null;
  status: string;
  notes: string | null;

  farm: {
    id: number;
    name: string;
  };

  commodity: {
    id: number;
    name: string;
  };

  rubberWorkers: Worker[];
}

interface SaleConfirmProps {
  saleId: number;
}

export default function SaleConfirm({ saleId }: SaleConfirmProps) {
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);

  const [pricePerKg, setPricePerKg] = useState("");
  const [buyerName, setBuyerName] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`http://localhost:3001/sales/${saleId}`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil data sale.");
        }

        setSale(data);
        setPricePerKg(data.pricePerKg ?? "");
        setBuyerName(data.buyerName ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [saleId]);

  const isSawit = sale?.commodity?.name?.toLowerCase() === "sawit";

  const totalWeight = useMemo(() => {
    if (isSawit) {
      return Number(sale?.totalWeightKg ?? 0);
    }
    return (sale?.rubberWorkers ?? []).reduce(
      (total, worker) => total + Number(worker.weightKg),
      0,
    );
  }, [sale, isSawit]);

  const totalSaleAmount = useMemo(() => {
    const price = Number(pricePerKg);

    if (!price || price <= 0 || totalWeight <= 0) {
      return 0;
    }

    return totalWeight * price;
  }, [pricePerKg, totalWeight]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const formatCurrency = (value: number) => {
    return `Rp ${formatNumber(value)}`;
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleConfirm = async () => {
    if (!sale) {
      return;
    }

    const price = Number(pricePerKg);

    if (!price || price <= 0) {
      setConfirmError("Harga penjualan harus diisi.");
      return;
    }

    if (totalWeight <= 0) {
      setConfirmError("Total berat harus lebih dari 0 kg.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      // =====================================================
      // 1. SIMPAN HARGA
      // =====================================================

      const priceResponse = await fetch(
        `http://localhost:3001/sales/${saleId}/price`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pricePerKg: price,
          }),
        },
      );

      const priceData = await priceResponse.json();

      if (!priceResponse.ok) {
        throw new Error(priceData.message || "Gagal menyimpan harga karet.");
      }

      // =====================================================
      // 2. CONFIRM SALE
      // =====================================================

      const confirmResponse = await fetch(
        `http://localhost:3001/sales/${saleId}/confirm`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buyerName: buyerName.trim() || undefined,
          }),
        },
      );

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(
          confirmData.message || "Gagal mengonfirmasi penjualan.",
        );
      }

      setSale(confirmData);

      // =====================================================
      // 3. NEXT STEP BERDASARKAN KOMODITAS + OWNERSHIP
      //
      // Backend sudah menjadi sumber validasi:
      // - Karet          -> worker settlement (existing flow)
      // - Sawit OWN      -> complete sale (tanpa owner settlement)
      // - Sawit RELATIVE -> commission -> owner settlement
      // =====================================================

      const commodityName = confirmData.commodity?.name?.toLowerCase();
      const ownershipType = (
        confirmData.ownershipType ??
        confirmData.farm?.ownershipType ??
        ""
      )
        .toString()
        .toUpperCase();

      if (commodityName === "sawit") {
        if (ownershipType === "RELATIVE") {
          // Commission belum ditentukan -> user harus menyepakati rate.
          router.push(`/settlement/sale/${saleId}/commission`);
          return;
        }

        // Sawit OWN: commission = 0, owner share = 0 -> langsung selesai.
        const completeResponse = await fetch(
          `http://localhost:3001/sales/${saleId}/complete`,
          { method: "PUT" },
        );

        if (!completeResponse.ok) {
          const completeData = await completeResponse.json().catch(() => null);

          throw new Error(
            completeData?.message || "Gagal menyelesaikan penjualan.",
          );
        }

        router.push(`/settlement/sale/${saleId}/check`);
        return;
      }

      // Karet: lanjut ke settlement pekerja
      router.push(`/settlement/sale/${saleId}/settlement`);
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat konfirmasi.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#dfe6dc] border-t-[#5f9f4a]" />

            <p className="text-xs text-text-muted">Memuat data penjualan...</p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !sale) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-sm font-semibold text-danger">
              !
            </div>

            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Gagal memuat penjualan
              </h2>

              <p className="mt-1 text-xs text-text-secondary">
                {error ?? "Sale tidak ditemukan."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              SALE #{sale.id}
            </p>

            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-text-primary">
              Konfirmasi Penjualan
            </h1>

            <p className="mt-1.5 text-xs text-text-secondary">
              Periksa data penjualan sebelum dikonfirmasi.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
              sale.status === "COMPLETED"
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            {sale.status === "COMPLETED" ? "Selesai" : "Draft"}
          </span>
        </header>

        {/* =================================================
            SALE INFORMATION
        ================================================== */}

        <section className="mb-4 rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  INFORMASI PENJUALAN
                </p>

                <h2 className="mt-1 text-sm font-semibold text-text-primary">
                  {sale.commodity.name}
                </h2>
              </div>

              <p className="text-[10px] text-text-muted">
                {formatDate(sale.saleDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-[#eef1ed] sm:grid-cols-3">
            <div className="bg-surface px-4 py-4 sm:px-5">
              <p className="text-[9px] text-text-muted">Kebun</p>

              <p className="mt-1 text-xs font-medium text-text-primary">
                {sale.farm.name}
              </p>
            </div>

            <div className="bg-surface px-4 py-4 sm:px-5">
              <p className="text-[9px] text-text-muted">Tanggal Penjualan</p>

              <p className="mt-1 text-xs font-medium text-text-primary">
                {formatDate(sale.saleDate)}
              </p>
            </div>

            <div className="bg-surface px-4 py-4 sm:px-5">
              <p className="text-[9px] text-text-muted">Komoditas</p>

              <p className="mt-1 text-xs font-medium text-text-primary">
                {sale.commodity.name}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            INPUT
        ================================================== */}

        <section className="mb-4 rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              DATA TRANSAKSI
            </p>

            <h2 className="mt-1 text-sm font-semibold text-text-primary">
              Lengkapi informasi penjualan
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {/* PRICE */}
            <div>
              <label
                htmlFor="pricePerKg"
                className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
              >
                Harga Karet / Kg
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">
                  Rp
                </span>

                <input
                  id="pricePerKg"
                  type="number"
                  min="0"
                  value={pricePerKg}
                  onChange={(event) => setPricePerKg(event.target.value)}
                  placeholder="Masukkan harga"
                  disabled={isConfirming || sale.status === "COMPLETED"}
                  className="h-10 w-full rounded-[10px] border border-border bg-surface pl-9 pr-3 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-agro-primary focus:ring-2 focus:ring-success-soft disabled:cursor-not-allowed disabled:bg-surface-muted"
                />
              </div>

              <p className="mt-1.5 text-[9px] text-text-muted">
                Harga digunakan untuk menghitung total penjualan.
              </p>
            </div>

            {/* BUYER */}
            <div>
              <label
                htmlFor="buyerName"
                className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
              >
                Pembeli
              </label>

              <input
                id="buyerName"
                type="text"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                placeholder="Nama pembeli"
                disabled={isConfirming || sale.status === "COMPLETED"}
                className="h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-agro-primary focus:ring-2 focus:ring-success-soft disabled:cursor-not-allowed disabled:bg-surface-muted"
              />

              <p className="mt-1.5 text-[9px] text-text-muted">
                Opsional, isi jika ingin mencatat nama pembeli.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            WORKERS
        ================================================== */}

        <section className="mb-4 rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          {sale.rubberWorkers && (
            <>
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                DATA WORKER
              </p>

              <h2 className="mt-1 text-sm font-semibold text-text-primary">
                Pembagian berat hasil panen
              </h2>
            </div>

            <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[9px] font-medium text-text-secondary">
              {sale.rubberWorkers.length} worker
            </span>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-14 px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    #
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Worker
                  </th>

                  <th className="px-4 py-3 text-right text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Keping
                  </th>

                  <th className="px-5 py-3 text-right text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Berat
                  </th>
                </tr>
              </thead>

              <tbody>
                {sale.rubberWorkers.map((worker, index) => (
                  <tr
                    key={worker.id}
                    className="border-b border-surface-soft last:border-b-0"
                  >
                    <td className="px-5 py-4 text-[10px] text-text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-text-primary">
                        {worker.worker.name}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right text-xs text-text-secondary">
                      {worker.pieces}
                    </td>

                    <td className="px-5 py-4 text-right text-xs font-semibold text-text-primary">
                      {formatNumber(Number(worker.weightKg))} kg
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-surface-soft">
                  <td
                    colSpan={3}
                    className="px-5 py-3 text-right text-[10px] font-medium text-text-secondary"
                  >
                    Total Berat
                  </td>

                  <td className="px-5 py-3 text-right text-xs font-semibold text-text-primary">
                    {formatNumber(totalWeight)} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="divide-y divide-[#eef1ed] sm:hidden">
            {sale.rubberWorkers.map((worker, index) => (
              <div
                key={worker.id}
                className="flex items-center justify-between gap-4 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[9px] font-medium text-text-muted">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text-primary">
                      {worker.worker.name}
                    </p>

                    <p className="mt-0.5 text-[9px] text-text-muted">
                      {worker.pieces} keping
                    </p>
                  </div>
                </div>

                <p className="shrink-0 text-xs font-semibold text-text-primary">
                  {formatNumber(Number(worker.weightKg))} kg
                </p>
              </div>
            ))}

            <div className="flex items-center justify-between bg-surface-soft px-4 py-3">
              <span className="text-[10px] font-medium text-text-secondary">
                Total Berat
              </span>

              <span className="text-xs font-semibold text-text-primary">
                {formatNumber(totalWeight)} kg
              </span>
            </div>
          </div>
          </>
          )}
        </section>

        {/* =================================================
            ERROR
        ================================================== */}

        {confirmError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-soft p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-xs font-semibold text-danger">
              !
            </div>

            <div>
              <p className="text-xs font-semibold text-danger">
                Tidak dapat mengonfirmasi
              </p>

              <p className="mt-0.5 text-[10px] text-danger">
                {confirmError}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            FINAL SUMMARY
        ================================================== */}

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-medium text-text-muted">
              Total Penjualan
            </p>

            <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.035em] text-success">
              {pricePerKg
                ? formatCurrency(totalSaleAmount)
                : "Harga belum diisi"}
            </p>

            {pricePerKg && (
              <p className="mt-1.5 text-[9px] text-text-muted">
                {formatNumber(totalWeight)} kg ×{" "}
                {formatCurrency(Number(pricePerKg))}
                /kg
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isConfirming || sale.status === "COMPLETED" || totalWeight <= 0
            }
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-success-soft px-5 text-xs font-semibold text-white transition hover:bg-success-soft hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-surface-soft disabled:shadow-none sm:w-auto sm:min-w-[210px]"
          >
            {isConfirming
              ? "Mengonfirmasi..."
              : sale.status === "COMPLETED"
                ? "Penjualan Selesai"
                : "Konfirmasi Penjualan"}
          </button>
        </section>
      </div>
    </main>
  );
}
