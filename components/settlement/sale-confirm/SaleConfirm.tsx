"use client";

import { useEffect, useState } from "react";

import SaleSummary from "./SaleSummary";
import SaleWorkerTable from "./SaleWorkerTable";
import styles from "./SaleConfirm.module.css";

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

        const response = await fetch(`http://localhost:3001/sales/${saleId}`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil data sale.");
        }

        setSale(data);
        console.log("SALE DETAIL:", data);
        console.log("RUBBER WORKERS:", data.rubberWorkers);
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

  const handleConfirm = async () => {
    if (!sale) {
      return;
    }

    const price = Number(pricePerKg);

    if (!price || price <= 0) {
      setConfirmError("Harga karet harus diisi.");
      return;
    }

    if (totalWeight <= 0) {
      setConfirmError("Total berat harus lebih dari 0 kg.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      // 1. Simpan harga
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

      // 2. Confirm sale
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

      // 3. Lanjut ke settlement
      window.location.href = `/settlement/sale/${saleId}/settlement`;
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

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Memuat data penjualan...</div>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className={styles.page}>
        <div className={styles.error}>{error ?? "Sale tidak ditemukan."}</div>
      </main>
    );
  }

  const totalWeight = (sale.rubberWorkers ?? []).reduce(
    (total, worker) => total + Number(worker.weightKg),
    0,
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SALE #{sale.id}</span>

            <h1>Konfirmasi Penjualan</h1>

            <p>Periksa data penjualan sebelum dikonfirmasi.</p>
          </div>

          <span className={styles.status}>{sale.status}</span>
        </header>

        <SaleSummary
          sale={sale}
          buyerName={buyerName}
          pricePerKg={pricePerKg}
          totalWeight={totalWeight}
          onBuyerChange={setBuyerName}
          onPriceChange={setPricePerKg}
        />
        <SaleWorkerTable
          workers={sale.rubberWorkers ?? []}
          totalWeight={totalWeight}
        />
        {confirmError && <div className={styles.error}>{confirmError}</div>}
        <section className={styles.footer}>
          <div>
            <span className={styles.footerLabel}>Total Penjualan</span>

            <strong>
              {pricePerKg
                ? `Rp ${(totalWeight * Number(pricePerKg)).toLocaleString(
                    "id-ID",
                  )}`
                : "Harga belum diisi"}
            </strong>
          </div>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Mengonfirmasi..." : "Konfirmasi Penjualan"}
          </button>
        </section>
      </div>
    </main>
  );
}
