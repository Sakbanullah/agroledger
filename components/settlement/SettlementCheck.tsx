"use client";

import { useEffect, useState } from "react";

type SettlementCheck = {
  settlementId: number;

  sale: {
    saleId: number;
    saleDate: string;
  };

  worker: {
    workerId: number;
    name: string;
  };

  calculation: {
    pieces: number;
    weightKg: number;
    pricePerKg: number;
    grossValue: number;
    workerShare: number;
    kasbon: number;
    deduction: number;
    netAmount: number;
    balanceAfterSale: number;
  };

  status: string;
};

interface SettlementCheckProps {
  saleId: number;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function SettlementCheck({ saleId }: SettlementCheckProps) {
  const [checks, setChecks] = useState<SettlementCheck[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =========================================================
  // FETCH CHECK
  // =========================================================

  useEffect(() => {
    const fetchChecks = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:3001/settlements/sale/${saleId}/check`,
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data check");
        }

        const data = await response.json();

        setChecks(data);
      } catch (err) {
        console.error(err);
        setError("Gagal mengambil data check");
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
  }, [saleId]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#dfe6dc] border-t-[#5f9f4a]" />

            <p className="text-xs text-[#929a93]">Memuat check...</p>
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
      <main className="min-h-screen bg-background px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-[#f0d4d4] bg-white p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-sm font-semibold text-[#c85c5c]">
              !
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#17221b]">
                Gagal memuat check
              </h2>

              <p className="mt-1 text-xs text-[#687169]">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // EMPTY
  // =========================================================

  if (checks.length === 0) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#e3e8e1] bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f3ee] text-sm text-[#929a93]">
              —
            </div>

            <h2 className="text-sm font-semibold text-[#17221b]">
              Belum ada check
            </h2>

            <p className="mt-1 text-xs text-[#929a93]">
              Settlement untuk penjualan ini belum memiliki bukti pembayaran.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <>
      {/* =====================================================
          SCREEN HEADER / ACTION
      ===================================================== */}

      <div className="print:hidden">
        <main className="min-h-0 bg-background px-4 pb-4 pt-5 sm:px-5 sm:pt-6 lg:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#929a93]">
                SALE #{saleId}
              </p>

              <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#17221b]">
                Bukti Pembayaran
              </h1>

              <p className="mt-1.5 text-xs text-[#687169]">
                Check settlement worker pada penjualan ini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] sm:w-auto sm:min-w-[150px]"
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
          </div>
        </main>
      </div>

      {/* =====================================================
          PRINT AREA
      ===================================================== */}

      <main className="bg-background px-4 pb-10 sm:px-5 lg:px-7 print:bg-white print:p-0">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 print:block print:max-w-none">
          {checks.map((check) => {
            const isDebt = check.calculation.balanceAfterSale < 0;

            const debtAmount = Math.abs(check.calculation.balanceAfterSale);

            return (
              <article
                key={check.settlementId}
                className="overflow-hidden rounded-2xl border border-[#dfe5dd] bg-white shadow-[0_8px_30px_rgba(23,34,27,0.05)] print:rounded-none print:border print:border-[#d9ddd8] print:shadow-none"
              >
                {/* =================================================
                    CHECK HEADER
                ================================================= */}

                <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7 print:px-8 print:pb-5 print:pt-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-semibold tracking-[-0.02em] text-[#315f3f]">
                        AgroLedger
                      </p>

                      <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.16em] text-[#929a93]">
                        Financial Record
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929a93]">
                        Bukti Pembayaran
                      </p>

                      <p className="mt-1 text-[9px] text-[#b0b6b1]">
                        #{check.settlementId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-px bg-[#dfe5dd]" />

                  {/* =================================================
                      IDENTITY
                  ================================================= */}

                  <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#929a93]">
                        Nama Worker
                      </p>

                      <p className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[#17221b]">
                        {check.worker.name}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#929a93]">
                        Tanggal Jual
                      </p>

                      <p className="mt-1 text-xs font-medium text-[#27322c]">
                        {formatDate(check.sale.saleDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    DETAIL
                ================================================= */}

                <div className="border-y border-[#eef1ed] bg-[#fafbf9] px-5 py-4 sm:px-7 print:px-8">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                        Keping
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#27322c]">
                        {formatNumber(check.calculation.pieces)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                        Berat Total
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#27322c]">
                        {formatNumber(check.calculation.weightKg)} kg
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                        Harga / Kg
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#27322c]">
                        {formatRupiah(check.calculation.pricePerKg)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    CALCULATION
                ================================================= */}

                <div className="px-5 py-5 sm:px-7 print:px-8">
                  <p className="mb-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#929a93]">
                    Perhitungan
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#687169]">
                        Pendapatan Kotor
                      </span>

                      <strong className="text-xs font-semibold text-[#27322c]">
                        {formatRupiah(check.calculation.grossValue)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#687169]">
                        Pendapatan Setelah ÷ 2
                      </span>

                      <strong className="text-xs font-semibold text-[#27322c]">
                        {formatRupiah(check.calculation.workerShare)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#687169]">KASBON</span>

                      <strong className="text-xs font-semibold text-[#b48624]">
                        {formatRupiah(check.calculation.kasbon)}
                      </strong>
                    </div>

                    {check.calculation.deduction > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[#687169]">
                          Dibayar dari KASBON
                        </span>

                        <strong className="text-xs font-semibold text-[#b48624]">
                          {formatRupiah(check.calculation.deduction)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    FINAL PAYMENT
                ================================================= */}

                {isDebt ? (
                  <div className="mx-5 mb-5 rounded-2xl border border-[#eadfca] bg-[#fffaf0] px-5 py-5 text-center sm:mx-7 print:mx-8">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#927b4b]">
                      TEKOR / SISA KASBON
                    </p>

                    <p className="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#8e6c21]">
                      -{formatRupiah(debtAmount)}
                    </p>

                    <p className="mt-1 text-[9px] text-[#a58d5d]">
                      Kasbon masih tersisa setelah settlement.
                    </p>
                  </div>
                ) : (
                  <div className="mx-5 mb-5 rounded-2xl border border-[#d7e8d2] bg-[#f2f7f3] px-5 py-5 text-center sm:mx-7 print:mx-8">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
                      PENDAPATAN BERSIH
                    </p>

                    <p className="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#315f3f]">
                      {formatRupiah(check.calculation.netAmount)}
                    </p>

                    <p className="mt-1 text-[9px] text-[#718078]">
                      Jumlah yang diterima worker setelah KASBON diperhitungkan.
                    </p>
                  </div>
                )}

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="border-t border-[#eef1ed] px-5 py-4 text-center sm:px-7 print:px-8">
                  <p className="text-[8px] text-[#a0a7a1]">
                    AgroLedger · Bukti Pembayaran
                  </p>

                  <p className="mt-1 text-[7px] text-[#b3b9b4]">
                    Dokumen ini dibuat berdasarkan settlement penjualan #
                    {saleId}.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
