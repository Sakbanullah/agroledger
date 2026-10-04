"use client";

import { useEffect, useMemo, useState } from "react";

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

/*
 * FIX:
 * Settlement disimpan sebagai snapshot.
 * Kalau sale sudah settlement, gunakan data ini,
 * jangan gunakan outstanding kasbon terbaru.
 */
interface SettlementRecord {
  id: number;
  saleId: number;
  workerId: number;
  grossShare: string | number;
  kasbonAmount: string | number;
  deductionAmount: string | number;
  netAmount: string | number;
  status: string;
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function SaleSettlement({ saleId }: SaleSettlementProps) {
  const [sale, setSale] = useState<Sale | null>(null);

  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);

  const [outstandingMap, setOutstandingMap] = useState<Record<number, number>>(
    {},
  );

  // FIX: simpan data settlement, bukan hanya boolean
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);

  const [hasSettlement, setHasSettlement] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingKasbon, setLoadingKasbon] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // =========================================================
  // FETCH DATA
  // =========================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // =====================================================
        // GET SALE
        // =====================================================

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

        // =====================================================
        // GET SETTLEMENT
        // =====================================================

        const settlementResponse = await fetch(
          `http://localhost:3001/settlements/sale/${saleId}`,
        );

        const settlementData = await settlementResponse.json();

        if (!settlementResponse.ok) {
          throw new Error(
            settlementData.message || "Gagal mengambil data settlement.",
          );
        }

        /*
         * FIX:
         * Simpan settlement yang sudah ada.
         *
         * Sebelumnya hanya:
         * setHasSettlement(...)
         *
         * Akibatnya data settlement lama tidak digunakan
         * untuk menghitung kasbon.
         */
        const existingSettlements: SettlementRecord[] = Array.isArray(
          settlementData,
        )
          ? settlementData
          : [];

        setSettlements(existingSettlements);
        setHasSettlement(existingSettlements.length > 0);

        // =====================================================
        // GET CREDIT ACCOUNTS
        // =====================================================

        /*
         * FIX:
         * Kalau settlement SUDAH ADA, jangan mengambil
         * outstanding kasbon terbaru.
         *
         * Outstanding terbaru hanya diperlukan untuk
         * preview sebelum settlement dibuat.
         */
        if (existingSettlements.length === 0) {
          setLoadingKasbon(true);

          const creditResponse = await fetch(
            "http://localhost:3001/credit/accounts",
          );

          const creditData = await creditResponse.json();

          if (!creditResponse.ok) {
            throw new Error(
              creditData.message || "Gagal mengambil data kasbon.",
            );
          }

          setCreditAccounts(creditData);

          // ===================================================
          // MAP PERSON → CREDIT ACCOUNT
          // ===================================================

          const accountsByPerson = new Map<number, CreditAccount>();

          for (const account of creditData) {
            accountsByPerson.set(account.personId, account);
          }

          // ===================================================
          // GET OUTSTANDING KASBON
          // ===================================================

          const workers = saleData.rubberWorkers ?? [];

          const outstandingEntries = await Promise.all(
            workers.map(async (worker: RubberWorker) => {
              const account = accountsByPerson.get(worker.workerId);

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
        } else {
          /*
           * FIX:
           * Sale sudah settlement.
           * Jangan simpan outstanding terbaru karena akan
           * membuat settlement lama berubah di UI.
           */
          setOutstandingMap({});
          setCreditAccounts([]);
        }
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

  // =========================================================
  // SETTLEMENT MAP
  // =========================================================

  /*
   * FIX:
   * Mapping settlement berdasarkan workerId supaya setiap
   * worker mengambil snapshot settlement miliknya.
   */
  const settlementMap = useMemo(() => {
    const map: Record<number, SettlementRecord> = {};

    for (const settlement of settlements) {
      map[settlement.workerId] = settlement;
    }

    return map;
  }, [settlements]);

  // =========================================================
  // CALCULATIONS
  // =========================================================

  const totalWeight = useMemo(() => {
    return workers.reduce(
      (total, worker) => total + Number(worker.weightKg),
      0,
    );
  }, [workers]);

  const pricePerKg = sale?.pricePerKg ? Number(sale.pricePerKg) : 0;

  const totalSaleValue = totalWeight * pricePerKg;

  const workerSettlements: WorkerSettlement[] = useMemo(() => {
    return workers.map((worker) => {
      const weightKg = Number(worker.weightKg);

      const grossValue = weightKg * pricePerKg;

      /*
       * FIX:
       * Cek apakah worker sudah memiliki settlement.
       */
      const settlement = settlementMap[worker.workerId];

      // =====================================================
      // HISTORICAL SETTLEMENT
      // =====================================================

      if (settlement) {
        /*
         * Gunakan snapshot yang tersimpan di database.
         *
         * Jangan menggunakan outstandingMap di sini.
         */
        const workerShare = Number(settlement.grossShare);

        const kasbon = Number(settlement.kasbonAmount);

        const deduction = Number(settlement.deductionAmount);

        const netAmount = Number(settlement.netAmount);

        /*
         * Sisa kasbon pada saat settlement dibuat.
         *
         * Ini tetap historis walaupun worker mendapatkan
         * bon baru setelah settlement.
         */
        const remainingKasbon = Math.max(0, kasbon - deduction);

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
      }

      // =====================================================
      // PREVIEW BELUM SETTLEMENT
      // =====================================================

      /*
       * Kalau belum settlement, baru gunakan outstanding
       * kasbon terbaru.
       */
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
  }, [workers, pricePerKg, outstandingMap, settlementMap]);

  /*
   * FIX:
   * Total bagian worker juga mengikuti snapshot settlement
   * kalau settlement sudah dibuat.
   */
  const totalWorkerShare = useMemo(() => {
    return workerSettlements.reduce(
      (total, item) => total + item.workerShare,
      0,
    );
  }, [workerSettlements]);

  const totalKasbon = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.kasbon, 0);
  }, [workerSettlements]);

  const totalDeduction = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.deduction, 0);
  }, [workerSettlements]);

  const totalNetAmount = useMemo(() => {
    return workerSettlements.reduce((total, item) => total + item.netAmount, 0);
  }, [workerSettlements]);

  const totalRemainingKasbon = useMemo(() => {
    return workerSettlements.reduce(
      (total, item) => total + item.remainingKasbon,
      0,
    );
  }, [workerSettlements]);

  // =========================================================
  // CONFIRM SETTLEMENT
  // =========================================================

  const handleConfirmSettlement = async () => {
    if (!sale) {
      return;
    }
    if (sale.status !== "CONFIRMED") {
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

    if (pricePerKg <= 0) {
      setConfirmError("Harga karet belum tersedia.");
      return;
    }

    if (totalWeight <= 0) {
      setConfirmError("Total berat harus lebih dari 0 kg.");
      return;
    }

    if (hasSettlement) {
      setConfirmError("Settlement untuk sale ini sudah dibuat.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);
    setConfirmSuccess(false);

    try {
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

      setHasSettlement(true);
      setConfirmSuccess(true);

      setTimeout(() => {
        window.location.href = `/settlement/sale/${sale.id}/check`;
      }, 500);
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat settlement.",
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

            <p className="text-xs text-text-muted">Memuat data settlement...</p>
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
                Gagal memuat settlement
              </h2>

              <p className="mt-1 text-xs text-text-secondary">
                {error ?? "Data penjualan tidak ditemukan."}
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
        {/* HEADER */}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              SALE #{sale.id}
            </p>

            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-text-primary">
              Settlement Penjualan
            </h1>

            <p className="mt-1.5 text-xs text-text-secondary">
              Periksa pembagian hasil setiap worker sebelum settlement.
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

        {/* SALE SUMMARY */}

        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Komoditas",
              value: sale.commodity.name,
            },
            {
              label: "Kebun",
              value: sale.farm.name,
            },
            {
              label: "Total Berat",
              value: `${formatNumber(totalWeight)} kg`,
            },
            {
              label: "Harga / Kg",
              value: formatRupiah(pricePerKg),
            },
            {
              label: "Total Penjualan",
              value: formatRupiah(totalSaleValue),
            },
            {
              label: "Total Bagian Worker",
              value: formatRupiah(totalWorkerShare),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5"
            >
              <p className="text-[10px] text-text-muted">{item.label}</p>

              <p className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-text-primary">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* WORKER TABLE */}

        <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          {/* SECTION HEADER */}

          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                WORKER
              </p>

              <h2 className="mt-1 text-sm font-semibold text-text-primary">
                Rincian Settlement
              </h2>

              <p className="mt-1 text-[10px] text-text-muted">
                {workers.length} worker terdaftar pada penjualan ini.
              </p>
            </div>

            {loadingKasbon && (
              <span className="w-fit rounded-full bg-surface-soft px-2.5 py-1 text-[9px] font-medium text-text-secondary">
                Memuat kasbon...
              </span>
            )}
          </div>

          {workers.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-sm font-semibold text-danger">
                !
              </div>

              <h2 className="text-sm font-semibold text-text-primary">
                Belum ada worker
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                Sale ini belum memiliki data worker.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-soft">
                      <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Worker
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Keping
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Berat
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Bagian Worker
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        KASBON
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Dibayar dari KASBON
                      </th>

                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                        Diterima
                      </th>
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
                        remainingKasbon,
                      } = item;

                      const hasKasbon = kasbon > 0;

                      const hasRemaining = remainingKasbon > 0;

                      return (
                        <tr
                          key={worker.id}
                          className="border-b border-surface-soft last:border-b-0"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-text-primary">
                                {worker.worker.name}
                              </span>

                              {hasRemaining && (
                                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[8px] font-semibold text-warning">
                                  Sisa
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-text-secondary">
                            {worker.pieces}
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-text-secondary">
                            {formatNumber(weightKg)} kg
                          </td>

                          <td className="px-3 py-4 text-right text-xs font-semibold text-text-primary">
                            {formatRupiah(workerShare)}
                          </td>

                          <td className="px-3 py-4 text-right">
                            <span
                              className={
                                hasKasbon
                                  ? "text-xs font-medium text-warning"
                                  : "text-xs text-text-muted"
                              }
                            >
                              {formatRupiah(kasbon)}
                            </span>
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-text-secondary">
                            {deduction > 0 ? formatRupiah(deduction) : "-"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <strong
                              className={
                                netAmount > 0
                                  ? "text-xs font-semibold text-success"
                                  : "text-xs font-semibold text-text-muted"
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
                    <tr className="bg-surface-soft">
                      <td
                        colSpan={3}
                        className="px-5 py-3 text-left text-[10px] font-semibold text-text-secondary"
                      >
                        TOTAL
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-text-primary">
                        {formatRupiah(totalWorkerShare)}
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-warning">
                        {formatRupiah(totalKasbon)}
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-text-secondary">
                        {formatRupiah(totalDeduction)}
                      </td>

                      <td className="px-5 py-3 text-right text-xs font-semibold text-success">
                        {formatRupiah(totalNetAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TABLET / MOBILE */}

              <div className="divide-y divide-[#eef1ed] lg:hidden">
                {workerSettlements.map((item, index) => {
                  const {
                    worker,
                    weightKg,
                    workerShare,
                    kasbon,
                    deduction,
                    netAmount,
                    remainingKasbon,
                  } = item;

                  return (
                    <div key={worker.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[9px] font-medium text-text-muted">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-text-primary">
                              {worker.worker.name}
                            </p>

                            <p className="mt-0.5 text-[9px] text-text-muted">
                              {worker.pieces} keping · {formatNumber(weightKg)}{" "}
                              kg
                            </p>
                          </div>
                        </div>

                        {remainingKasbon > 0 && (
                          <span className="shrink-0 rounded-full bg-warning-soft px-2 py-1 text-[8px] font-semibold text-warning">
                            Sisa KASBON
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-[9px] text-text-muted">
                            Bagian Worker
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-text-primary">
                            {formatRupiah(workerShare)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-text-muted">KASBON</p>

                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              kasbon > 0 ? "text-warning" : "text-text-muted"
                            }`}
                          >
                            {formatRupiah(kasbon)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-text-muted">
                            Dibayar dari KASBON
                          </p>

                          <p className="mt-0.5 text-xs text-text-secondary">
                            {deduction > 0 ? formatRupiah(deduction) : "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-text-muted">Diterima</p>

                          <p
                            className={`mt-0.5 text-xs font-semibold ${
                              netAmount > 0
                                ? "text-success"
                                : "text-text-muted"
                            }`}
                          >
                            {formatRupiah(netAmount)}
                          </p>
                        </div>
                      </div>

                      {remainingKasbon > 0 && (
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-warning-soft px-3 py-2">
                          <span className="text-[9px] font-medium text-warning">
                            Sisa KASBON
                          </span>

                          <span className="text-[10px] font-semibold text-warning">
                            {formatRupiah(remainingKasbon)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* MOBILE TOTAL */}

                <div className="bg-surface-soft p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-text-secondary">
                      TOTAL
                    </span>

                    <span className="text-xs font-semibold text-success">
                      {formatRupiah(totalNetAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[9px] text-text-muted">Bagian Worker</p>

                      <p className="mt-0.5 text-[10px] font-semibold text-text-primary">
                        {formatRupiah(totalWorkerShare)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-text-muted">KASBON</p>

                      <p className="mt-0.5 text-[10px] font-semibold text-warning">
                        {formatRupiah(totalKasbon)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-text-muted">
                        Dibayar dari KASBON
                      </p>

                      <p className="mt-0.5 text-[10px] font-semibold text-text-secondary">
                        {formatRupiah(totalDeduction)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-text-muted">Sisa KASBON</p>

                      <p
                        className={`mt-0.5 text-[10px] font-semibold ${
                          totalRemainingKasbon > 0
                            ? "text-warning"
                            : "text-text-muted"
                        }`}
                      >
                        {formatRupiah(totalRemainingKasbon)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* SETTLEMENT SUMMARY */}

        <section className="mb-4 rounded-2xl border border-border bg-surface-soft p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                SETTLEMENT SUMMARY
              </p>

              <h2 className="mt-1 text-sm font-semibold text-success">
                Ringkasan Pembayaran
              </h2>

              <p className="mt-1 text-[10px] text-text-secondary">
                Hasil pembayaran setelah KASBON diperhitungkan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:min-w-[650px]">
              <div>
                <p className="text-[9px] text-text-secondary">Total KASBON</p>

                <p className="mt-1 text-xs font-semibold text-warning">
                  {formatRupiah(totalKasbon)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-text-secondary">Dibayar dari KASBON</p>

                <p className="mt-1 text-xs font-semibold text-text-secondary">
                  {formatRupiah(totalDeduction)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-text-secondary">
                  Total Diterima Worker
                </p>

                <p className="mt-1 text-sm font-semibold text-success">
                  {formatRupiah(totalNetAmount)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-text-secondary">Sisa KASBON</p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    totalRemainingKasbon > 0
                      ? "text-warning"
                      : "text-text-secondary"
                  }`}
                >
                  {formatRupiah(totalRemainingKasbon)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {confirmError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-soft p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-xs font-semibold text-danger">
              !
            </div>

            <div>
              <p className="text-xs font-semibold text-danger">
                Tidak dapat mengonfirmasi
              </p>

              <p className="mt-0.5 text-[10px] leading-relaxed text-danger">
                {confirmError}
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}

        {confirmSuccess && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-soft p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-semibold text-success">
              ✓
            </div>

            <div>
              <p className="text-xs font-semibold text-success">
                Settlement berhasil dikonfirmasi
              </p>

              <p className="mt-0.5 text-[10px] text-text-secondary">
                Membuka halaman check...
              </p>
            </div>
          </div>
        )}

        {/* FINAL ACTION */}

        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {hasSettlement ? "SETTLEMENT SELESAI" : "FINAL REVIEW"}
            </p>

            <h2 className="mt-1 text-sm font-semibold text-text-primary">
              {hasSettlement
                ? "Settlement sudah dikonfirmasi"
                : "Settlement siap ditinjau"}
            </h2>

            <p className="mt-1 text-[10px] text-text-muted">
              {hasSettlement
                ? "Check pembayaran dapat dicetak kembali kapan saja."
                : "Periksa data worker dan kasbon sebelum settlement dikonfirmasi."}
            </p>
          </div>

          {hasSettlement ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = `/settlement/sale/${sale.id}/check`;
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-success-soft px-5 text-xs font-semibold text-white transition hover:bg-success-soft hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] sm:w-auto sm:min-w-[170px]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" rx="1" />
              </svg>
              Cetak Check
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSettlement}
              disabled={
                isConfirming ||
                loadingKasbon ||
                workers.length === 0 ||
                sale.status !== "CONFIRMED"
              }
              className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-success-soft px-5 text-xs font-semibold text-white transition hover:bg-success-soft hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-surface-soft disabled:shadow-none sm:w-auto sm:min-w-[210px]"
            >
              {isConfirming
                ? "Memproses Settlement..."
                : "Konfirmasi Settlement"}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
