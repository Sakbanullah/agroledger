"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./SaleSettlement.module.css";

interface RubberWorker {
  id: number;
  saleId: number;
  workerId: number;
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
  farm: {
    id: number;
    name: string;
  };
  commodity: {
    id: number;
    name: string;
  };
  rubberWorkers: RubberWorker[];
}

interface CreditAccount {
  id: number;
  personId: number;
  status: string;
  person: {
    id: number;
    name: string;
  };
}

interface SaleSettlementProps {
  saleId: number;
}

interface WorkerSettlement {
  worker: RubberWorker;
  weightKg: number;
  grossValue: number;
  workerShare: number;
  kasbon: number;
  deduction: number;
  netAmount: number;
  remainingKasbon: number;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
}

export default function SaleSettlement({ saleId }: SaleSettlementProps) {
  const [sale, setSale] = useState<Sale | null>(null);

  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);

  const [outstandingMap, setOutstandingMap] = useState<Record<number, number>>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [loadingKasbon, setLoadingKasbon] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // =========================
        // GET SALE
        // =========================

        const saleResponse = await fetch(
          `http://localhost:3001/sales/${saleId}`,
        );

        const saleData = await saleResponse.json();

        if (!saleResponse.ok) {
          throw new Error(
            saleData.message || "Gagal mengambil data penjualan.",
          );
        }

        setSale(saleData);

        // =========================
        // GET CREDIT ACCOUNTS
        // =========================

        setLoadingKasbon(true);

        const creditResponse = await fetch(
          "http://localhost:3001/credit/accounts",
        );

        const creditData = await creditResponse.json();

        if (!creditResponse.ok) {
          throw new Error(creditData.message || "Gagal mengambil data kasbon.");
        }

        setCreditAccounts(creditData);

        // =========================
        // MAP PERSON → CREDIT ACCOUNT
        // =========================

        const accountsByPerson = new Map<number, CreditAccount>();

        for (const account of creditData) {
          accountsByPerson.set(account.personId, account);
        }

        // =========================
        // GET OUTSTANDING KASBON
        // =========================

        const workers = saleData.rubberWorkers ?? [];

        const outstandingEntries = await Promise.all(
          workers.map(async (worker: RubberWorker) => {
            const account = accountsByPerson.get(worker.workerId);

            // Worker belum punya CreditAccount
            // berarti tidak punya kasbon aktif.
            if (!account) {
              return [worker.workerId, 0] as const;
            }

            try {
              const response = await fetch(
                `http://localhost:3001/credit/accounts/${account.id}/outstanding`,
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message ||
                    `Gagal mengambil kasbon ${worker.worker.name}`,
                );
              }

              return [
                worker.workerId,
                Number(data.outstandingBalance ?? 0),
              ] as const;
            } catch (err) {
              console.error(
                `Gagal mengambil kasbon ${worker.worker.name}`,
                err,
              );

              throw new Error(`Gagal mengambil kasbon ${worker.worker.name}`);
            }
          }),
        );

        const nextOutstandingMap: Record<number, number> = {};

        for (const [workerId, balance] of outstandingEntries) {
          nextOutstandingMap[workerId] = balance;
        }

        setOutstandingMap(nextOutstandingMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setLoading(false);
        setLoadingKasbon(false);
      }
    };

    fetchData();
  }, [saleId]);

  const workers = sale?.rubberWorkers ?? [];

  // =========================
  // TOTAL WEIGHT
  // =========================

  const totalWeight = useMemo(() => {
    return workers.reduce(
      (total, worker) => total + Number(worker.weightKg),
      0,
    );
  }, [workers]);

  // =========================
  // PRICE
  // =========================

  const pricePerKg = sale?.pricePerKg ? Number(sale.pricePerKg) : 0;

  // =========================
  // TOTAL SALE
  // =========================

  const totalSaleValue = totalWeight * pricePerKg;

  const totalWorkerShare = totalSaleValue / 2;

  // =========================
  // SETTLEMENT PREVIEW
  // =========================

  const workerSettlements: WorkerSettlement[] = useMemo(() => {
    return workers.map((worker) => {
      const weightKg = Number(worker.weightKg);

      const grossValue = weightKg * pricePerKg;

      const workerShare = grossValue / 2;

      const kasbon = outstandingMap[worker.workerId] ?? 0;

      const deduction = Math.min(workerShare, kasbon);

      const netAmount = workerShare - deduction;

      const remainingKasbon = kasbon - deduction;

      return {
        worker,
        weightKg,
        grossValue,
        workerShare,
        kasbon,
        deduction,
        netAmount,
        remainingKasbon,
      };
    });
  }, [workers, pricePerKg, outstandingMap]);

  // =========================
  // TOTAL KASBON
  // =========================

  const totalKasbon = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.kasbon, 0);
  }, [workerSettlements]);

  // =========================
  // TOTAL DEDUCTION
  // =========================

  const totalDeduction = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.deduction, 0);
  }, [workerSettlements]);

  // =========================
  // TOTAL NET
  // =========================

  const totalNetAmount = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.netAmount, 0);
  }, [workerSettlements]);

  // =========================
  // TOTAL REMAINING KASBON
  // =========================

  const totalRemainingKasbon = useMemo(() => {
    return workerSettlements.reduce(
      (total, item) => total + item.remainingKasbon,
      0,
    );
  }, [workerSettlements]);

  // =========================
  // CONFIRM SETTLEMENT
  // =========================

  const handleConfirmSettlement = async () => {
    if (!sale) {
      return;
    }

    if (sale.status !== "COMPLETED") {
      setConfirmError("Sale harus dikonfirmasi terlebih dahulu.");
      return;
    }

    if (workers.length === 0) {
      setConfirmError("Tidak ada worker pada sale ini.");
      return;
    }

    if (loadingKasbon) {
      setConfirmError("Data kasbon masih dimuat. Tunggu sebentar.");
      return;
    }

    // Safety check
    if (pricePerKg <= 0) {
      setConfirmError("Harga karet belum tersedia.");
      return;
    }

    if (totalWeight <= 0) {
      setConfirmError("Total berat harus lebih dari 0 kg.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);
    setConfirmSuccess(false);

    try {
      console.log("CONFIRM SETTLEMENT", {
        saleId: sale.id,
        workers: workers.length,
        totalWeight,
        pricePerKg,
        totalSaleValue,
        totalWorkerShare,
        totalKasbon,
        totalDeduction,
        totalNetAmount,
        totalRemainingKasbon,
      });

      // =========================
      // CONFIRM BATCH SETTLEMENT
      // =========================

      const response = await fetch(
        "http://localhost:3001/settlements/confirm-sale",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saleId: sale.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        let message = "Gagal mengonfirmasi settlement.";

        if (Array.isArray(data.message)) {
          message = data.message.join(", ");
        } else if (typeof data.message === "string") {
          message = data.message;
        }

        throw new Error(message);
      }

      console.log("SETTLEMENT CONFIRMED:", data);

      setConfirmSuccess(true);

      // =========================
      // REDIRECT KE CHECK
      // =========================

      setTimeout(() => {
        window.location.href = `/settlement/sale/${sale.id}/check`;
      }, 500);
    } catch (err) {
      console.error("CONFIRM SETTLEMENT ERROR:", err);

      setConfirmError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat settlement.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Memuat data settlement...</div>
      </main>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error || !sale) {
    return (
      <main className={styles.page}>
        <div className={styles.error}>
          {error ?? "Data penjualan tidak ditemukan."}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* =========================
            HEADER
        ========================= */}

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SALE #{sale.id}</span>

            <h1>Settlement Penjualan</h1>

            <p>Periksa pembagian hasil setiap worker sebelum settlement.</p>
          </div>

          <span className={styles.status}>{sale.status}</span>
        </header>

        {/* =========================
            SUMMARY
        ========================= */}

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Komoditas</span>

            <strong>{sale.commodity.name}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Kebun</span>

            <strong>{sale.farm.name}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Total Berat</span>

            <strong>{formatNumber(totalWeight)} kg</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Harga / Kg</span>

            <strong>{formatRupiah(pricePerKg)}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Total Penjualan</span>

            <strong>{formatRupiah(totalSaleValue)}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Total Bagian Worker</span>

            <strong>{formatRupiah(totalWorkerShare)}</strong>
          </div>
        </section>

        {/* =========================
            WORKER TABLE
        ========================= */}

        <section className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>WORKER</span>

              <h2>Rincian Settlement</h2>

              <p>{workers.length} worker terdaftar pada penjualan ini.</p>
            </div>

            {loadingKasbon && (
              <span className={styles.loadingBadge}>Memuat kasbon...</span>
            )}
          </div>

          {workers.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>!</div>

              <h2>Belum ada worker</h2>

              <p>Sale ini belum memiliki data worker.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Keping</th>
                    <th>Berat</th>
                    <th>Bagian Worker</th>
                    <th>Kasbon</th>
                    <th>Potongan</th>
                    <th>Diterima</th>
                  </tr>
                </thead>

                <tbody>
                  {workerSettlements.map((item) => {
                    const {
                      worker,
                      weightKg,
                      workerShare,
                      kasbon,
                      deduction,
                      netAmount,
                    } = item;

                    const hasKasbon = kasbon > 0;

                    const hasRemaining = item.remainingKasbon > 0;

                    return (
                      <tr key={worker.id}>
                        <td>
                          <div className={styles.workerName}>
                            <strong>{worker.worker.name}</strong>

                            {hasRemaining && (
                              <span className={styles.debtBadge}>Sisa</span>
                            )}
                          </div>
                        </td>

                        <td>{worker.pieces}</td>

                        <td>{formatNumber(weightKg)} kg</td>

                        <td>
                          <strong>{formatRupiah(workerShare)}</strong>
                        </td>

                        <td>
                          <span
                            className={
                              hasKasbon
                                ? styles.kasbonAmount
                                : styles.zeroAmount
                            }
                          >
                            {formatRupiah(kasbon)}
                          </span>
                        </td>

                        <td>{deduction > 0 ? formatRupiah(deduction) : "-"}</td>

                        <td>
                          <strong
                            className={
                              netAmount > 0
                                ? styles.netAmount
                                : styles.zeroAmount
                            }
                          >
                            {formatRupiah(netAmount)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={3}>
                      <strong>TOTAL</strong>
                    </td>

                    <td>
                      <strong>{formatRupiah(totalWorkerShare)}</strong>
                    </td>

                    <td>
                      <strong>{formatRupiah(totalKasbon)}</strong>
                    </td>

                    <td>
                      <strong>{formatRupiah(totalDeduction)}</strong>
                    </td>

                    <td>
                      <strong>{formatRupiah(totalNetAmount)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* =========================
            SETTLEMENT SUMMARY
        ========================= */}

        <section className={styles.settlementSummary}>
          <div>
            <span className={styles.sectionEyebrow}>SETTLEMENT SUMMARY</span>

            <h2>Ringkasan Pembayaran</h2>

            <p>Hasil setelah potongan kasbon diperhitungkan.</p>
          </div>

          <div className={styles.summaryStats}>
            <div>
              <span>Total Kasbon</span>

              <strong>{formatRupiah(totalKasbon)}</strong>
            </div>

            <div>
              <span>Total Potongan</span>

              <strong>{formatRupiah(totalDeduction)}</strong>
            </div>

            <div>
              <span>Total Diterima Worker</span>

              <strong className={styles.highlightAmount}>
                {formatRupiah(totalNetAmount)}
              </strong>
            </div>

            <div>
              <span>Sisa Kasbon</span>

              <strong
                className={
                  totalRemainingKasbon > 0
                    ? styles.debtAmount
                    : styles.zeroAmount
                }
              >
                {formatRupiah(totalRemainingKasbon)}
              </strong>
            </div>
          </div>
        </section>

        {/* =========================
            CONFIRM ERROR
        ========================= */}

        {confirmError && <div className={styles.error}>{confirmError}</div>}

        {/* =========================
            CONFIRM SUCCESS
        ========================= */}

        {confirmSuccess && (
          <div className={styles.successMessage}>
            Settlement berhasil dikonfirmasi. Membuka halaman check...
          </div>
        )}

        {/* =========================
            FINAL REVIEW
        ========================= */}

        <section className={styles.actionCard}>
          <div>
            <span className={styles.sectionEyebrow}>FINAL REVIEW</span>

            <h2>Settlement siap ditinjau</h2>

            <p>
              Periksa data worker dan kasbon sebelum settlement dikonfirmasi.
            </p>
          </div>

          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirmSettlement}
            disabled={
              isConfirming ||
              loadingKasbon ||
              workers.length === 0 ||
              sale.status !== "COMPLETED"
            }
          >
            {isConfirming ? "Memproses Settlement..." : "Konfirmasi Settlement"}
          </button>
        </section>
      </div>
    </main>
  );
}
