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

  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "COMPLETED"
  >("ALL");

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:3001/sales",
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Gagal mengambil data penjualan.",
          );
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

    return sales.filter(
      (sale) => sale.status === filter,
    );
  }, [sales, filter]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort(
      (a, b) =>
        new Date(b.saleDate).getTime() -
        new Date(a.saleDate).getTime(),
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

    return new Intl.NumberFormat("id-ID").format(
      Number(value),
    );
  };

  const handleOpenSale = (sale: Sale) => {
    if (sale.status === "PENDING") {
      router.push(
        `/settlement/sale/${sale.id}/confirm`,
      );

      return;
    }

    router.push(
      `/settlement/sale/${sale.id}/settlement`,
    );
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Memuat data penjualan...</p>
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

            <div>
              <h2>Gagal memuat penjualan</h2>
              <p>{error}</p>
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
          <div>
            <div className={styles.eyebrow}>
              AGROLEDGER
            </div>

            <h1>Penjualan</h1>

            <p>
              Kelola transaksi penjualan dan settlement
              hasil panen.
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={() =>
              router.push(
                "/settlement/sale/new",
              )
            }
          >
            <span>+</span>
            Penjualan Baru
          </button>
        </header>

        {/* SUMMARY */}
        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <span>Total Penjualan</span>
            <strong>{sales.length}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Draft</span>
            <strong>
              {
                sales.filter(
                  (sale) =>
                    sale.status === "PENDING",
                ).length
              }
            </strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Selesai</span>
            <strong>
              {
                sales.filter(
                  (sale) =>
                    sale.status === "COMPLETED",
                ).length
              }
            </strong>
          </div>
        </section>

        {/* FILTER */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <button
              type="button"
              className={
                filter === "ALL"
                  ? styles.filterActive
                  : styles.filterButton
              }
              onClick={() => setFilter("ALL")}
            >
              Semua
            </button>

            <button
              type="button"
              className={
                filter === "PENDING"
                  ? styles.filterActive
                  : styles.filterButton
              }
              onClick={() =>
                setFilter("PENDING")
              }
            >
              Draft
            </button>

            <button
              type="button"
              className={
                filter === "COMPLETED"
                  ? styles.filterActive
                  : styles.filterButton
              }
              onClick={() =>
                setFilter("COMPLETED")
              }
            >
              Selesai
            </button>
          </div>

          <span className={styles.resultCount}>
            {sortedSales.length} transaksi
          </span>
        </div>

        {/* LIST */}
        {sortedSales.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              ∅
            </div>

            <h2>
              Belum ada penjualan
            </h2>

            <p>
              Belum ada transaksi dengan filter
              yang dipilih.
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {sortedSales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                formattedDate={formatDate(
                  sale.saleDate,
                )}
                formattedWeight={formatNumber(
                  sale.totalWeightKg,
                )}
                onClick={() =>
                  handleOpenSale(sale)
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}