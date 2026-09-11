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

        setHasSettlement(
          Array.isArray(settlementData) && settlementData.length > 0,
        );

        // =====================================================
        // GET CREDIT ACCOUNTS
        // =====================================================

        setLoadingKasbon(true);

        const creditResponse = await fetch(
          "http://localhost:3001/credit/accounts",
        );

        const creditData = await creditResponse.json();

        if (!creditResponse.ok) {
          throw new Error(creditData.message || "Gagal mengambil data kasbon.");
        }

        setCreditAccounts(creditData);

        // =====================================================
        // MAP PERSON → CREDIT ACCOUNT
        // =====================================================

        const accountsByPerson = new Map<number, CreditAccount>();

        for (const account of creditData) {
          accountsByPerson.set(account.personId, account);
        }

        // =====================================================
        // GET OUTSTANDING KASBON
        // =====================================================

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

  const totalWorkerShare = totalSaleValue / 2;

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

            <p className="text-xs text-[#929a93]">Memuat data settlement...</p>
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
          <div className="flex items-start gap-3 rounded-2xl border border-[#f0d4d4] bg-white p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-sm font-semibold text-[#c85c5c]">
              !
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#17221b]">
                Gagal memuat settlement
              </h2>

              <p className="mt-1 text-xs text-[#687169]">
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
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#929a93]">
              SALE #{sale.id}
            </p>

            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#17221b]">
              Settlement Penjualan
            </h1>

            <p className="mt-1.5 text-xs text-[#687169]">
              Periksa pembagian hasil setiap worker sebelum settlement.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
              sale.status === "COMPLETED"
                ? "bg-[#eaf3e6] text-[#4d873d]"
                : "bg-[#fbf3df] text-[#b48624]"
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
              className="rounded-2xl border border-[#e3e8e1] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5"
            >
              <p className="text-[10px] text-[#929a93]">{item.label}</p>

              <p className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-[#17221b]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* WORKER TABLE */}

        <section className="mb-4 overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          {/* SECTION HEADER */}

          <div className="flex flex-col gap-3 border-b border-[#eef1ed] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929a93]">
                WORKER
              </p>

              <h2 className="mt-1 text-sm font-semibold text-[#17221b]">
                Rincian Settlement
              </h2>

              <p className="mt-1 text-[10px] text-[#929a93]">
                {workers.length} worker terdaftar pada penjualan ini.
              </p>
            </div>

            {loadingKasbon && (
              <span className="w-fit rounded-full bg-[#f0f3ee] px-2.5 py-1 text-[9px] font-medium text-[#687169]">
                Memuat kasbon...
              </span>
            )}
          </div>

          {workers.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#faeaea] text-sm font-semibold text-[#c85c5c]">
                !
              </div>

              <h2 className="text-sm font-semibold text-[#17221b]">
                Belum ada worker
              </h2>

              <p className="mt-1 text-xs text-[#929a93]">
                Sale ini belum memiliki data worker.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#eef1ed] bg-[#fafbf9]">
                      <th className="px-5 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        Worker
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        Keping
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        Berat
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        Bagian Worker
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        KASBON
                      </th>

                      <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                        Dibayar dari KASBON
                      </th>

                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
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
                          className="border-b border-[#f0f2ef] last:border-b-0"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#27322c]">
                                {worker.worker.name}
                              </span>

                              {hasRemaining && (
                                <span className="rounded-full bg-[#fbf3df] px-2 py-0.5 text-[8px] font-semibold text-[#b48624]">
                                  Sisa
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-[#687169]">
                            {worker.pieces}
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-[#687169]">
                            {formatNumber(weightKg)} kg
                          </td>

                          <td className="px-3 py-4 text-right text-xs font-semibold text-[#17221b]">
                            {formatRupiah(workerShare)}
                          </td>

                          <td className="px-3 py-4 text-right">
                            <span
                              className={
                                hasKasbon
                                  ? "text-xs font-medium text-[#b48624]"
                                  : "text-xs text-[#a7aea8]"
                              }
                            >
                              {formatRupiah(kasbon)}
                            </span>
                          </td>

                          <td className="px-3 py-4 text-right text-xs text-[#687169]">
                            {deduction > 0 ? formatRupiah(deduction) : "-"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <strong
                              className={
                                netAmount > 0
                                  ? "text-xs font-semibold text-[#315f3f]"
                                  : "text-xs font-semibold text-[#929a93]"
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
                    <tr className="bg-[#f7f9f6]">
                      <td
                        colSpan={3}
                        className="px-5 py-3 text-left text-[10px] font-semibold text-[#687169]"
                      >
                        TOTAL
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-[#17221b]">
                        {formatRupiah(totalWorkerShare)}
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-[#b48624]">
                        {formatRupiah(totalKasbon)}
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold text-[#687169]">
                        {formatRupiah(totalDeduction)}
                      </td>

                      <td className="px-5 py-3 text-right text-xs font-semibold text-[#315f3f]">
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
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f3ee] text-[9px] font-medium text-[#929a93]">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#27322c]">
                              {worker.worker.name}
                            </p>

                            <p className="mt-0.5 text-[9px] text-[#929a93]">
                              {worker.pieces} keping · {formatNumber(weightKg)}{" "}
                              kg
                            </p>
                          </div>
                        </div>

                        {remainingKasbon > 0 && (
                          <span className="shrink-0 rounded-full bg-[#fbf3df] px-2 py-1 text-[8px] font-semibold text-[#b48624]">
                            Sisa KASBON
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-[9px] text-[#929a93]">
                            Bagian Worker
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-[#17221b]">
                            {formatRupiah(workerShare)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-[#929a93]">KASBON</p>

                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              kasbon > 0 ? "text-[#b48624]" : "text-[#929a93]"
                            }`}
                          >
                            {formatRupiah(kasbon)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-[#929a93]">
                            Dibayar dari KASBON
                          </p>

                          <p className="mt-0.5 text-xs text-[#687169]">
                            {deduction > 0 ? formatRupiah(deduction) : "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-[#929a93]">Diterima</p>

                          <p
                            className={`mt-0.5 text-xs font-semibold ${
                              netAmount > 0
                                ? "text-[#315f3f]"
                                : "text-[#929a93]"
                            }`}
                          >
                            {formatRupiah(netAmount)}
                          </p>
                        </div>
                      </div>

                      {remainingKasbon > 0 && (
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#fbf3df] px-3 py-2">
                          <span className="text-[9px] font-medium text-[#8e6c21]">
                            Sisa KASBON
                          </span>

                          <span className="text-[10px] font-semibold text-[#8e6c21]">
                            {formatRupiah(remainingKasbon)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* MOBILE TOTAL */}

                <div className="bg-[#f7f9f6] p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#687169]">
                      TOTAL
                    </span>

                    <span className="text-xs font-semibold text-[#315f3f]">
                      {formatRupiah(totalNetAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[9px] text-[#929a93]">Bagian Worker</p>

                      <p className="mt-0.5 text-[10px] font-semibold text-[#17221b]">
                        {formatRupiah(totalWorkerShare)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-[#929a93]">KASBON</p>

                      <p className="mt-0.5 text-[10px] font-semibold text-[#b48624]">
                        {formatRupiah(totalKasbon)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-[#929a93]">
                        Dibayar dari KASBON
                      </p>

                      <p className="mt-0.5 text-[10px] font-semibold text-[#687169]">
                        {formatRupiah(totalDeduction)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-[#929a93]">Sisa KASBON</p>

                      <p
                        className={`mt-0.5 text-[10px] font-semibold ${
                          totalRemainingKasbon > 0
                            ? "text-[#b48624]"
                            : "text-[#929a93]"
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

        <section className="mb-4 rounded-2xl border border-[#dce8df] bg-[#f2f7f3] p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
                SETTLEMENT SUMMARY
              </p>

              <h2 className="mt-1 text-sm font-semibold text-[#244c31]">
                Ringkasan Pembayaran
              </h2>

              <p className="mt-1 text-[10px] text-[#718078]">
                Hasil pembayaran setelah KASBON diperhitungkan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:min-w-[650px]">
              <div>
                <p className="text-[9px] text-[#718078]">Total KASBON</p>

                <p className="mt-1 text-xs font-semibold text-[#8e6c21]">
                  {formatRupiah(totalKasbon)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-[#718078]">Dibayar dari KASBON</p>

                <p className="mt-1 text-xs font-semibold text-[#687169]">
                  {formatRupiah(totalDeduction)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-[#718078]">
                  Total Diterima Worker
                </p>

                <p className="mt-1 text-sm font-semibold text-[#315f3f]">
                  {formatRupiah(totalNetAmount)}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-[#718078]">Sisa KASBON</p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    totalRemainingKasbon > 0
                      ? "text-[#b48624]"
                      : "text-[#718078]"
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
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#f0d4d4] bg-[#fffafa] p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-xs font-semibold text-[#c85c5c]">
              !
            </div>

            <div>
              <p className="text-xs font-semibold text-[#a04444]">
                Tidak dapat mengonfirmasi
              </p>

              <p className="mt-0.5 text-[10px] leading-relaxed text-[#a04444]">
                {confirmError}
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}

        {confirmSuccess && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#d7e8d2] bg-[#f4f9f2] p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3e6] text-xs font-semibold text-[#4d873d]">
              ✓
            </div>

            <div>
              <p className="text-xs font-semibold text-[#315f3f]">
                Settlement berhasil dikonfirmasi
              </p>

              <p className="mt-0.5 text-[10px] text-[#687169]">
                Membuka halaman check...
              </p>
            </div>
          </div>
        )}

        {/* FINAL ACTION */}

        <section className="flex flex-col gap-5 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
              {hasSettlement ? "SETTLEMENT SELESAI" : "FINAL REVIEW"}
            </p>

            <h2 className="mt-1 text-sm font-semibold text-[#17221b]">
              {hasSettlement
                ? "Settlement sudah dikonfirmasi"
                : "Settlement siap ditinjau"}
            </h2>

            <p className="mt-1 text-[10px] text-[#929a93]">
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
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] sm:w-auto sm:min-w-[170px]"
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
                sale.status !== "COMPLETED"
              }
              className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] disabled:shadow-none sm:w-auto sm:min-w-[210px]"
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
