"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SaleCard from "./SaleCard";
import styles from "./SaleList.module.css";

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

export default function SaleList() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

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

        setSales(Array.isArray(data) ? data : []);
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

  const pendingCount = useMemo(
    () => sales.filter((sale) => sale.status === "PENDING").length,
    [sales],
  );

  const completedCount = useMemo(
    () => sales.filter((sale) => sale.status === "COMPLETED").length,
    [sales],
  );

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

  const handleOpenSale = (sale: Sale) => {
    if (sale.status === "PENDING") {
      router.push(`/settlement/sale/${sale.id}/confirm`);

      return;
    }

    router.push(`/settlement/sale/${sale.id}/settlement`);
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />

            <div className={styles.loadingText}>
              <strong>Memuat penjualan</strong>
              <span>Menyiapkan data transaksi...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            <div className={styles.errorIcon}>!</div>

            <div className={styles.errorContent}>
              <h2>Gagal memuat penjualan</h2>
              <p>{error}</p>

              <button
                type="button"
                className={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>SETTLEMENT</div>

            <h1>Penjualan</h1>

            <p>
              Riwayat transaksi penjualan hasil panen dan proses settlement.
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={() => router.push("/settlement/sale/new")}
          >
            <span className={styles.createIcon}>+</span>

            <span>Penjualan Baru</span>
          </button>
        </header>

        {/* SUMMARY */}
        <section className={styles.summary} aria-label="Ringkasan penjualan">
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total Penjualan</div>

            <div className={styles.summaryValue}>{sales.length}</div>

            <div className={styles.summaryHint}>seluruh transaksi</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Draft</div>

            <div className={styles.summaryValue}>{pendingCount}</div>

            <div className={styles.summaryHint}>menunggu konfirmasi</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Selesai</div>

            <div className={styles.summaryValue}>{completedCount}</div>

            <div className={styles.summaryHint}>transaksi selesai</div>
          </div>
        </section>

        {/* FILTER */}
        <div className={styles.toolbar}>
          <div
            className={styles.filterGroup}
            role="tablist"
            aria-label="Filter penjualan"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === "ALL"}
              className={
                filter === "ALL" ? styles.filterActive : styles.filterButton
              }
              onClick={() => setFilter("ALL")}
            >
              Semua
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "PENDING"}
              className={
                filter === "PENDING" ? styles.filterActive : styles.filterButton
              }
              onClick={() => setFilter("PENDING")}
            >
              Draft
              {pendingCount > 0 && (
                <span className={styles.filterCount}>{pendingCount}</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filter === "COMPLETED"}
              className={
                filter === "COMPLETED"
                  ? styles.filterActive
                  : styles.filterButton
              }
              onClick={() => setFilter("COMPLETED")}
            >
              Selesai
            </button>
          </div>

          <div className={styles.resultCount}>
            <strong>{sortedSales.length}</strong> transaksi
          </div>
        </div>

        {/* LIST */}
        {sortedSales.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <span>∅</span>
            </div>

            <h2>Belum ada penjualan</h2>

            <p>Belum ada transaksi dengan filter yang dipilih.</p>

            {filter !== "ALL" && (
              <button
                type="button"
                className={styles.emptyAction}
                onClick={() => setFilter("ALL")}
              >
                Tampilkan semua
              </button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {sortedSales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                formattedDate={formatDate(sale.saleDate)}
                formattedWeight={formatNumber(sale.totalWeightKg)}
                onClick={() => handleOpenSale(sale)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
