"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Sale {
  id: number;
  farmId: number;
  commodityId: number;
  saleDate: string;
  pricePerKg: string | null;
  totalWeightKg: string | null;
  buyerName: string | null;
  status: string;
  notes: string | null;

  farm: {
    id: number;
    name: string;
    location: string;
  };

  commodity: {
    id: number;
    name: string;
    unit: string;
  };
}

type Filter = "ALL" | "PENDING" | "COMPLETED";

export default function SaleList() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("http://localhost:3001/sales");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil data penjualan.");
        }

        setSales(data);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data penjualan.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    if (filter === "ALL") {
      return sales;
    }

    return sales.filter((sale) => sale.status === filter);
  }, [sales, filter]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime(),
    );
  }, [filteredSales]);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatNumber = (value: string | null) => {
    if (value === null) {
      return "-";
    }

    return new Intl.NumberFormat("id-ID").format(Number(value));
  };

  const formatCurrency = (value: string | null) => {
    if (value === null) {
      return "-";
    }

    return `Rp${new Intl.NumberFormat("id-ID").format(Number(value))}`;
  };

  const handleOpenSale = (sale: Sale) => {
    if (sale.status === "PENDING") {
      router.push(`/settlement/sale/${sale.id}/confirm`);
      return;
    }

    router.push(`/settlement/sale/${sale.id}/settlement`);
  };

  const totalSales = sales.length;

  const draftSales = sales.filter((sale) => sale.status === "PENDING").length;

  const completedSales = sales.filter(
    (sale) => sale.status === "COMPLETED",
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#dfe6dc] border-t-[#5f9f4a]" />
            <p className="text-xs text-[#929a93]">Memuat data penjualan...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <div className="flex items-start gap-3 rounded-2xl border border-[#f0d4d4] bg-white p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-sm font-semibold text-[#c85c5c]">
              !
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#17221b]">
                Gagal memuat penjualan
              </h2>

              <p className="mt-1 text-xs text-[#687169]">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#929a93]">
              SETTLEMENT
            </p>

            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#17221b]">
              Penjualan
            </h1>

            <p className="mt-1.5 text-xs text-[#687169]">
              Riwayat transaksi penjualan hasil panen dan proses settlement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/settlement/sale/new")}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[#17221b] px-4 text-[11px] font-medium text-white transition hover:bg-[#26362b]"
          >
            <span className="text-sm leading-none">+</span>
            Penjualan Baru
          </button>
        </header>

        {/* SUMMARY */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-[#929a93]">Total Penjualan</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-[#17221b]">
              {totalSales}
            </p>

            <p className="mt-1.5 text-[10px] text-[#929a93]">
              seluruh transaksi
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-[#929a93]">Draft</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-[#17221b]">
              {draftSales}
            </p>

            <p className="mt-1.5 text-[10px] text-[#929a93]">
              menunggu konfirmasi
            </p>
          </div>

          <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-[#929a93]">Selesai</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-[#17221b]">
              {completedSales}
            </p>

            <p className="mt-1.5 text-[10px] text-[#929a93]">
              transaksi selesai
            </p>
          </div>
        </section>

        {/* FILTER */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-[#e3e8e1] bg-[#f0f3ee] p-1">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "ALL"
                  ? "bg-white text-[#17221b] shadow-sm"
                  : "text-[#687169] hover:text-[#17221b]"
              }`}
            >
              Semua
            </button>

            <button
              type="button"
              onClick={() => setFilter("PENDING")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "PENDING"
                  ? "bg-white text-[#17221b] shadow-sm"
                  : "text-[#687169] hover:text-[#17221b]"
              }`}
            >
              Draft
              {draftSales > 0 && (
                <span className="ml-1.5 rounded-full bg-[#fbf3df] px-1.5 py-0.5 text-[8px] text-[#b48624]">
                  {draftSales}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("COMPLETED")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "COMPLETED"
                  ? "bg-white text-[#17221b] shadow-sm"
                  : "text-[#687169] hover:text-[#17221b]"
              }`}
            >
              Selesai
            </button>
          </div>

          <span className="text-[10px] text-[#929a93]">
            {sortedSales.length} transaksi
          </span>
        </div>

        {/* LIST */}
        {sortedSales.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe5dc] bg-white px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f3ee] text-lg text-[#929a93]">
              ∅
            </div>

            <h2 className="text-sm font-semibold text-[#17221b]">
              Belum ada penjualan
            </h2>

            <p className="mt-1 max-w-xs text-xs text-[#929a93]">
              Belum ada transaksi dengan filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSales.map((sale) => {
              const isPending = sale.status === "PENDING";
              const isCompleted = sale.status === "COMPLETED";

              const totalAmount =
                sale.totalWeightKg !== null && sale.pricePerKg !== null
                  ? Number(sale.totalWeightKg) * Number(sale.pricePerKg)
                  : null;

              return (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => handleOpenSale(sale)}
                  className="group block w-full rounded-2xl border border-[#e3e8e1] bg-white text-left shadow-[0_1px_2px_rgba(23,34,27,0.02)] transition hover:-translate-y-px hover:border-[#d6ddd3] hover:shadow-[0_8px_24px_rgba(23,34,27,0.04)]"
                >
                  <div className="p-4 sm:p-5">
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[#17221b]">
                          {sale.commodity.name}
                        </h2>

                        <p className="mt-1 text-[10px] text-[#929a93]">
                          {formatDate(sale.saleDate)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] ${
                          isCompleted
                            ? "bg-[#eaf3e6] text-[#4d873d]"
                            : "bg-[#fbf3df] text-[#b48624]"
                        }`}
                      >
                        {isCompleted ? "Selesai" : "Draft"}
                      </span>
                    </div>

                    {/* METRICS */}
                    <div className="mt-4 grid grid-cols-1 gap-4 border-y border-[#eef1ed] py-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[9px] text-[#929a93]">Berat</p>

                        <p className="mt-1 text-xs font-semibold text-[#17221b]">
                          {formatNumber(sale.totalWeightKg)} kg
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] text-[#929a93]">Harga / Kg</p>

                        <p className="mt-1 text-xs font-semibold text-[#17221b]">
                          {formatCurrency(sale.pricePerKg)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] text-[#929a93]">
                          Total Penjualan
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#17221b]">
                          {formatCurrency(
                            totalAmount === null ? null : String(totalAmount),
                          )}
                        </p>
                      </div>
                    </div>

                    {/* CARD FOOTER */}
                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-[#4c574f]">
                          {sale.farm.name}
                        </p>

                        <p className="mt-0.5 text-[9px] text-[#929a93]">
                          {sale.farm.location || "Lokasi tidak tersedia"}
                        </p>
                      </div>

                      <span className="text-[10px] font-semibold text-[#4d873d] transition group-hover:translate-x-0.5">
                        {isPending ? "Lanjutkan →" : "Lihat settlement →"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
