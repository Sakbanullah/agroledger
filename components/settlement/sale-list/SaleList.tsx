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
  ownershipType: string | null;

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

type Filter = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export default function SaleList() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  const [deleteError, setDeleteError] = useState("");

  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);

  const [cancelError, setCancelError] = useState("");

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Set by flows that finish a sale away from the list (e.g. Sawit).
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedId = params.get("saved");

    if (savedId) {
      setNotice(`Penjualan #${savedId} sudah selesai.`);
      // Drop the query so a refresh does not repeat the message.
      router.replace("/settlement");
    }
  }, [router]);

  // =========================================================
  // FETCH SALES
  // =========================================================

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
        err instanceof Error ? err.message : "Gagal mengambil data penjualan.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredSales = useMemo(() => {
    if (filter === "ALL") {
      return sales;
    }

    return sales.filter((sale) => sale.status === filter);
  }, [sales, filter]);

  // =========================================================
  // SORT
  // =========================================================

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime(),
    );
  }, [filteredSales]);

  // =========================================================
  // FORMAT
  // =========================================================

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

  // =========================================================
  // OPEN SALE
  // =========================================================

  // Sawit never uses workers, so it never has a settlement or check step.
  // Same rule as the backend isSawitCommodity.
  const isSawit = (name: string) =>
    (name ?? "").trim().toLowerCase().includes("sawit");

  const handleOpenSale = (sale: Sale) => {
    const sawit = isSawit(sale.commodity.name);

    // Draft
    if (sale.status === "PENDING") {
      router.push(`/settlement/sale/${sale.id}/confirm`);
      return;
    }

    if (sale.status === "CONFIRMED") {
      // Sawit RELATIVE still needs the commission agreed; Sawit OWN just
      // finishes from the confirm screen.
      if (sawit && sale.ownershipType === "RELATIVE") {
        router.push(`/settlement/sale/${sale.id}/commission`);
        return;
      }

      if (sawit) {
        router.push(`/settlement/sale/${sale.id}/confirm`);
        return;
      }

      router.push(`/settlement/sale/${sale.id}/settlement`);
      return;
    }

    if (sale.status === "COMPLETED") {
      // Check exists only for Karet's worker settlements.
      router.push(
        sawit
          ? `/settlement/sale/${sale.id}/confirm`
          : `/settlement/sale/${sale.id}/check`,
      );
      return;
    }
  };

  // =========================================================
  // DELETE SALE (Draft / Dibatalkan) AND CANCEL (Selesai)
  // =========================================================

  const openCancelDialog = (event: React.MouseEvent, sale: Sale) => {
    event.stopPropagation();

    if (sale.status !== "COMPLETED") {
      return;
    }

    setCancelError("");
    setCancelTarget(sale);
  };

  const closeCancelDialog = () => {
    if (cancellingId !== null) {
      return;
    }

    setCancelTarget(null);
  };

  const handleCancelSale = async () => {
    const sale = cancelTarget;

    if (!sale) {
      return;
    }

    try {
      setCancellingId(sale.id);
      setCancelError("");

      const response = await fetch(
        `http://localhost:3001/sales/${sale.id}/cancel`,
        { method: "POST" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Gagal membatalkan transaksi penjualan.",
        );
      }

      // Only after the backend confirms the reversal does the card switch
      // to the delete action.
      setSales((currentSales) =>
        currentSales.map((item) =>
          item.id === sale.id ? { ...item, status: "CANCELLED" } : item,
        ),
      );

      setCancelTarget(null);
    } catch (err) {
      console.error(err);

      setCancelError(
        err instanceof Error
          ? err.message
          : "Gagal membatalkan transaksi penjualan.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const openDeleteDialog = (event: React.MouseEvent, sale: Sale) => {
    event.stopPropagation();

    if (
      sale.status !== "PENDING" &&
      sale.status !== "CONFIRMED" &&
      sale.status !== "CANCELLED"
    ) {
      return;
    }

    setDeleteError("");
    setDeleteTarget(sale);
  };

  const closeDeleteDialog = () => {
    if (deletingId !== null) {
      return;
    }

    setDeleteTarget(null);
  };

  const handleDeleteSale = async () => {
    const sale = deleteTarget;

    if (!sale) {
      return;
    }

    try {
      setDeletingId(sale.id);
      setDeleteError("");

      const response = await fetch(`http://localhost:3001/sales/${sale.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Gagal menghapus penjualan.");
      }

      setSales((currentSales) =>
        currentSales.filter((item) => item.id !== sale.id),
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(err);

      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus penjualan.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalSales = sales.length;

  const draftSales = sales.filter((sale) => sale.status === "PENDING").length;

  const confirmedSales = sales.filter(
    (sale) => sale.status === "CONFIRMED",
  ).length;

  const completedSales = sales.filter(
    (sale) => sale.status === "COMPLETED",
  ).length;

  const cancelledSales = sales.filter(
    (sale) => sale.status === "CANCELLED",
  ).length;

  // =========================================================
  // STATUS UI
  // =========================================================

  const getStatusLabel = (status: string) => {
    if (status === "PENDING") {
      return "Draft";
    }

    if (status === "CONFIRMED") {
      return "Menunggu Settlement";
    }

    if (status === "COMPLETED") {
      return "Selesai";
    }

    if (status === "CANCELLED") {
      return "Dibatalkan";
    }

    return status;
  };

  const getStatusClass = (status: string) => {
    if (status === "CANCELLED") {
      return "bg-danger-soft text-danger";
    }

    if (status === "COMPLETED") {
      return "bg-success-soft text-success";
    }

    if (status === "CONFIRMED") {
      return "bg-info-soft text-info";
    }

    return "bg-warning-soft text-warning";
  };

  const getActionLabel = (status: string, commodityName: string) => {
    const sawit = isSawit(commodityName);

    if (status === "PENDING") {
      return "Lanjutkan →";
    }

    if (status === "CONFIRMED") {
      return sawit ? "Lanjutkan →" : "Lanjutkan Settlement →";
    }

    if (status === "COMPLETED") {
      return sawit ? "Lihat Detail →" : "Lihat Check →";
    }

    return "Buka →";
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

  if (error) {
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

              <p className="mt-1 text-xs text-text-secondary">{error}</p>
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
        {/* HEADER */}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              SETTLEMENT
            </p>

            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-text-primary">
              Penjualan
            </h1>

            <p className="mt-1.5 text-xs text-text-secondary">
              Riwayat transaksi penjualan hasil panen dan proses settlement.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/owner-settlement")}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 text-[11px] font-medium text-[#4c574f] transition hover:bg-surface-soft"
            >
              Pembayaran Pemilik
            </button>

            <button
              type="button"
              onClick={() => router.push("/settlement/sale/new")}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-surface px-4 text-[11px] font-medium text-white transition hover:bg-surface-soft"
            >
              <span className="text-sm leading-none">+</span>
              Penjualan Baru
            </button>
          </div>
        </header>

        {/* NOTICE */}

        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-border bg-success-soft p-4">
            <p className="text-xs font-semibold text-success">{notice}</p>

            <button
              type="button"
              onClick={() => setNotice("")}
              className="shrink-0 text-xs text-success/70 transition hover:text-success"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        )}

        {/* DELETE ERROR */}

        {deleteError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-xs font-semibold text-danger">
              !
            </div>

            <div>
              <p className="text-xs font-semibold text-danger">
                Gagal menghapus draft
              </p>

              <p className="mt-0.5 text-[10px] text-text-secondary">{deleteError}</p>
            </div>
          </div>
        )}

        {/* SUMMARY */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-text-muted">Total Penjualan</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-text-primary">
              {totalSales}
            </p>

            <p className="mt-1.5 text-[10px] text-text-muted">
              seluruh transaksi
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-text-muted">Dalam Proses</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-text-primary">
              {draftSales + confirmedSales}
            </p>

            <p className="mt-1.5 text-[10px] text-text-muted">
              draft & settlement
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <p className="text-[10px] text-text-muted">Selesai</p>

            <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.035em] text-text-primary">
              {completedSales}
            </p>

            <p className="mt-1.5 text-[10px] text-text-muted">check tersedia</p>
          </div>
        </section>

        {/* FILTER */}

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-border bg-surface-soft p-1">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "ALL"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Semua
            </button>

            <button
              type="button"
              onClick={() => setFilter("PENDING")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "PENDING"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Draft
              {draftSales > 0 && (
                <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[8px] text-warning">
                  {draftSales}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("CONFIRMED")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "CONFIRMED"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Settlement
              {confirmedSales > 0 && (
                <span className="ml-1.5 rounded-full bg-info-soft px-1.5 py-0.5 text-[8px] text-info">
                  {confirmedSales}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("COMPLETED")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "COMPLETED"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Selesai
            </button>

            <button
              type="button"
              onClick={() => setFilter("CANCELLED")}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                filter === "CANCELLED"
                  ? "bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Dibatalkan
              {cancelledSales > 0 && (
                <span className="ml-1.5 rounded-full bg-danger-soft px-1.5 py-0.5 text-[8px] text-danger">
                  {cancelledSales}
                </span>
              )}
            </button>
          </div>

          <span className="text-[10px] text-text-muted">
            {sortedSales.length} transaksi
          </span>
        </div>

        {/* LIST */}

        {sortedSales.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-lg text-text-muted">
              ∅
            </div>

            <h2 className="text-sm font-semibold text-text-primary">
              Belum ada penjualan
            </h2>

            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Belum ada transaksi dengan filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSales.map((sale) => {
              const isPending = sale.status === "PENDING";

              const isConfirmed = sale.status === "CONFIRMED";

              const isCompletedSale = sale.status === "COMPLETED";

              const isCancelled = sale.status === "CANCELLED";

              const isDeleting = deletingId === sale.id;

              const totalAmount =
                sale.totalWeightKg !== null && sale.pricePerKg !== null
                  ? Number(sale.totalWeightKg) * Number(sale.pricePerKg)
                  : null;

              return (
                <div
                  key={sale.id}
                  className="group rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)] transition hover:border-border hover:shadow-[0_8px_24px_rgba(23,34,27,0.04)]"
                >
                  {/* CLICKABLE CONTENT */}

                  <button
                    type="button"
                    onClick={() => handleOpenSale(sale)}
                    className="block w-full text-left"
                  >
                    <div className="p-4 sm:p-5">
                      {/* CARD HEADER */}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-sm font-semibold text-text-primary">
                            {sale.commodity.name}
                          </h2>

                          <p className="mt-1 text-[10px] text-text-muted">
                            {formatDate(sale.saleDate)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] ${getStatusClass(
                            sale.status,
                          )}`}
                        >
                          {getStatusLabel(sale.status)}
                        </span>
                      </div>

                      {/* METRICS */}

                      <div className="mt-4 grid grid-cols-1 gap-4 border-y border-border py-4 sm:grid-cols-3">
                        <div>
                          <p className="text-[9px] text-text-muted">Berat</p>

                          <p className="mt-1 text-xs font-semibold text-text-primary">
                            {formatNumber(sale.totalWeightKg)} kg
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-text-muted">
                            Harga / Kg
                          </p>

                          <p className="mt-1 text-xs font-semibold text-text-primary">
                            {formatCurrency(sale.pricePerKg)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-text-muted">
                            Total Penjualan
                          </p>

                          <p className="mt-1 text-xs font-semibold text-text-primary">
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

                          <p className="mt-0.5 text-[9px] text-text-muted">
                            {sale.farm.location || "Lokasi tidak tersedia"}
                          </p>
                        </div>

                        <span className="text-[10px] font-semibold text-success transition group-hover:translate-x-0.5">
                          {getActionLabel(sale.status, sale.commodity.name)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* STATUS ACTION */}

                  {(isPending || isCancelled) && (
                    <div className="border-t border-border px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(event) => openDeleteDialog(event, sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-danger transition hover:bg-[#faeeee] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border border-[#e5bebe] border-t-[#b65c5c]" />
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <span className="text-xs">🗑</span>
                            {isPending ? "Hapus Draft" : "Hapus"}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="border-t border-border px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        disabled={deletingId === sale.id}
                        onClick={(event) => openDeleteDialog(event, sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-danger transition hover:bg-[#faeeee] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === sale.id ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border border-[#e5bebe] border-t-[#b65c5c]" />
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <span className="text-xs">🗑</span>
                            Hapus Penjualan
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isCompletedSale && (
                    <div className="border-t border-border px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        disabled={cancellingId === sale.id}
                        onClick={(event) => openCancelDialog(event, sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-danger transition hover:bg-[#faeeee] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingId === sale.id ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border border-[#e5bebe] border-t-[#b65c5c]" />
                            Membatalkan...
                          </>
                        ) : (
                          <>
                            <span className="text-xs">↩</span>
                            Batalkan Transaksi
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_20px_60px_rgba(23,34,27,0.14)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {deleteTarget.status === "PENDING"
                  ? "Hapus Draft Penjualan"
                  : "Hapus Penjualan"}
              </h2>
            </div>

            <div className="space-y-4 px-5 py-4">
              <p className="text-xs text-text-secondary">
                Data berikut akan dihapus permanen dan tidak dapat
                dikembalikan.
              </p>

              <dl className="grid grid-cols-[96px_1fr] gap-y-2 rounded-[10px] border border-border bg-surface-soft px-4 py-3 text-xs">
                <dt className="text-text-muted">Sale</dt>
                <dd className="font-semibold text-text-primary">
                  #{deleteTarget.id}
                </dd>

                <dt className="text-text-muted">Komoditas</dt>
                <dd className="text-text-primary">
                  {deleteTarget.commodity.name}
                </dd>

                <dt className="text-text-muted">Tanggal</dt>
                <dd className="text-text-primary">
                  {formatDate(deleteTarget.saleDate)}
                </dd>

                <dt className="text-text-muted">Kebun</dt>
                <dd className="text-text-primary">{deleteTarget.farm.name}</dd>

                <dt className="text-text-muted">Status</dt>
                <dd className="text-text-primary">
                  {getStatusLabel(deleteTarget.status)}
                </dd>
              </dl>

              <div className="space-y-1 text-[11px] leading-5 text-text-muted">
                <p>Yang ikut terhapus: input worker penjualan ini.</p>

                {deleteTarget.status === "CANCELLED" ? (
                  <p>
                    Yang dipertahankan: catatan pembatalan beserta riwayat
                    transaksi keuangannya, untuk audit.
                  </p>
                ) : (
                  <p>
                    Penjualan yang masih memiliki settlement atau transaksi
                    keuangan akan ditolak oleh sistem dengan alasannya.
                  </p>
                )}
              </div>

              {deleteError && (
                <div className="rounded-[10px] bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deletingId !== null}
                className="rounded-[9px] px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteSale}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 rounded-[9px] bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deletingId !== null ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
                    Menghapus...
                  </>
                ) : deleteTarget.status === "PENDING" ? (
                  "Hapus Draft"
                ) : (
                  "Hapus Penjualan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCancelDialog();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_20px_60px_rgba(23,34,27,0.14)]">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                Batalkan Transaksi Penjualan
              </h2>
            </div>

            <div className="space-y-4 px-5 py-4">
              <dl className="grid grid-cols-[96px_1fr] gap-y-2 rounded-[10px] border border-border bg-surface-soft px-4 py-3 text-xs">
                <dt className="text-text-muted">Sale</dt>
                <dd className="font-semibold text-text-primary">
                  #{cancelTarget.id}
                </dd>

                <dt className="text-text-muted">Komoditas</dt>
                <dd className="text-text-primary">
                  {cancelTarget.commodity.name}
                </dd>

                <dt className="text-text-muted">Tanggal</dt>
                <dd className="text-text-primary">
                  {formatDate(cancelTarget.saleDate)}
                </dd>

                <dt className="text-text-muted">Kebun</dt>
                <dd className="text-text-primary">{cancelTarget.farm.name}</dd>
              </dl>

              <div className="space-y-1.5 text-[11px] leading-5 text-text-secondary">
                <p>
                  Pembatalan membalik dampak keuangan transaksi ini: uang
                  masuk penjualan dicatat sebagai uang keluar, dan uang yang
                  sudah dibayarkan ke worker dikembalikan ke kas.
                </p>
                <p>
                  Pembatalan <strong>tidak sama</strong> dengan penghapusan.
                  Penjualan berstatus Dibatalkan tetap ada dan baru bisa
                  dihapus setelahnya.
                </p>
                <p className="text-text-muted">
                  Riwayat transaksi asli tidak diubah; pembatalan dicatat
                  sebagai transaksi pembalik terpisah.
                </p>
              </div>

              {cancelError && (
                <div className="rounded-[10px] bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                  {cancelError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={cancellingId !== null}
                className="rounded-[9px] px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary disabled:opacity-50"
              >
                Tidak
              </button>

              <button
                type="button"
                onClick={handleCancelSale}
                disabled={cancellingId !== null}
                className="inline-flex items-center gap-2 rounded-[9px] bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {cancellingId !== null ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
                    Membatalkan...
                  </>
                ) : (
                  "Ya, Batalkan Transaksi"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
