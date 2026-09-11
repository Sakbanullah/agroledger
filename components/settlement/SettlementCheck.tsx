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
      <main className="min-h-screen bg-[#f5f6f4] px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d0d0d0] border-t-black" />

            <p className="text-xs text-black">Memuat check...</p>
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
      <main className="min-h-screen bg-[#f5f6f4] px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md border border-black bg-white p-5">
            <h2 className="text-sm font-semibold text-black">
              Gagal memuat check
            </h2>

            <p className="mt-1 text-xs text-black">{error}</p>
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
      <main className="min-h-screen bg-[#f5f6f4] px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md border border-black bg-white p-6 text-center">
            <div className="mx-auto mb-3 text-lg text-black">—</div>

            <h2 className="text-sm font-semibold text-black">
              Belum ada check
            </h2>

            <p className="mt-1 text-xs text-black">
              Settlement untuk penjualan ini belum memiliki bukti pembayaran.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        /* =======================================================
           PRINT
        ======================================================= */

        @media print {
          html,
          body {
            width: 210mm;
            min-width: 210mm;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }

          body {
            overflow: visible !important;
          }

          body * {
            visibility: hidden !important;
          }

          .settlement-print-root,
          .settlement-print-root * {
            visibility: visible !important;
          }

          .settlement-print-root {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          /* =====================================================
             A4 SHEET
          ===================================================== */

          .print-sheet {
            position: relative !important;

            width: 210mm !important;
            height: 297mm !important;

            overflow: hidden !important;

            background: #ffffff !important;

            page-break-after: always !important;
            break-after: page !important;
          }

          .print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* =====================================================
             CHECK

             100mm × 43mm
          ===================================================== */

          .print-check {
            position: absolute !important;

            width: 100mm !important;
            height: 43mm !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: hidden !important;

            background: #ffffff !important;

            border: 0.3mm solid #000000 !important;

            border-radius: 0 !important;

            box-shadow: none !important;

            color: #000000 !important;
          }

          /* =====================================================
             LEFT COLUMN
          ===================================================== */

          .print-check-1 {
            left: 2.5mm !important;
            top: 7mm !important;
          }

          .print-check-3 {
            left: 2.5mm !important;
            top: 55mm !important;
          }

          .print-check-5 {
            left: 2.5mm !important;
            top: 103mm !important;
          }

          .print-check-7 {
            left: 2.5mm !important;
            top: 151mm !important;
          }

          .print-check-9 {
            left: 2.5mm !important;
            top: 199mm !important;
          }

          /* =====================================================
             RIGHT COLUMN
          ===================================================== */

          .print-check-2 {
            left: 107.5mm !important;
            top: 7mm !important;
          }

          .print-check-4 {
            left: 107.5mm !important;
            top: 55mm !important;
          }

          .print-check-6 {
            left: 107.5mm !important;
            top: 103mm !important;
          }

          .print-check-8 {
            left: 107.5mm !important;
            top: 151mm !important;
          }

          .print-check-10 {
            left: 107.5mm !important;
            top: 199mm !important;
          }

          /* =====================================================
             HORIZONTAL CUT LINES

             Check:
             43mm

             Gap:
             5mm

             Line berada di tengah gap.
          ===================================================== */

          .print-cut-horizontal {
            display: block !important;

            position: absolute !important;

            left: 1mm !important;
            width: 208mm !important;

            height: 0 !important;

            border-top: 0.25mm dashed #000000 !important;
          }

          .print-cut-horizontal-1 {
            top: 52.5mm !important;
          }

          .print-cut-horizontal-2 {
            top: 100.5mm !important;
          }

          .print-cut-horizontal-3 {
            top: 148.5mm !important;
          }

          .print-cut-horizontal-4 {
            top: 196.5mm !important;
          }

          /* =====================================================
             VERTICAL CUT LINE
          ===================================================== */

          .print-cut-vertical {
            display: block !important;

            position: absolute !important;

            left: 105mm !important;
            top: 5mm !important;

            width: 0 !important;
            height: 239mm !important;

            border-left: 0.25mm dashed #000000 !important;
          }
        }

        /* =======================================================
           SCREEN
        ======================================================= */

        @media screen {
          .settlement-print-root {
            display: none;
          }
        }
      `}</style>

      {/* =========================================================
          SCREEN HEADER
      ========================================================= */}

      <div className="print:hidden">
        <main className="min-h-0 bg-[#f5f6f4] px-4 pb-4 pt-5 sm:px-5 sm:pt-6 lg:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-black">
                SALE #{saleId}
              </p>

              <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-black">
                Check Settlement
              </h1>

              <p className="mt-1.5 text-xs text-black">
                Bukti settlement worker pada penjualan ini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 border border-black bg-black px-5 text-xs font-semibold text-white transition hover:bg-white hover:text-black sm:w-auto sm:min-w-[150px]"
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

      {/* =========================================================
          SCREEN PREVIEW
      ========================================================= */}

      <main className="bg-[#f5f6f4] px-4 pb-10 sm:px-5 lg:px-7 print:hidden">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-4 border border-black bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
              Preview Cetak
            </p>

            <p className="mt-1 text-xs text-black">
              A4 Portrait · 10 check per halaman · 100 × 43 mm
            </p>
          </div>

          {/* =====================================================
              A4 PREVIEW
          ===================================================== */}

          {Array.from(
            {
              length: Math.ceil(checks.length / 10),
            },
            (_, sheetIndex) => {
              const sheetChecks = checks.slice(
                sheetIndex * 10,
                sheetIndex * 10 + 10,
              );

              return (
                <div
                  key={sheetIndex}
                  className="relative mx-auto mb-6 h-[891px] w-[630px] overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
                >
                  {/* =================================================
                      PREVIEW CHECKS
                  ================================================= */}

                  {sheetChecks.map((check, index) => {
                    const isDebt = check.calculation.balanceAfterSale < 0;

                    const debtAmount = Math.abs(
                      check.calculation.balanceAfterSale,
                    );

                    const column = index % 2;
                    const row = Math.floor(index / 2);

                    return (
                      <div
                        key={check.settlementId}
                        className="absolute overflow-hidden border border-black bg-white"
                        style={{
                          left: column === 0 ? "7.5px" : "322.5px",

                          top: `${21 + row * 144}px`,

                          width: "300px",
                          height: "129px",
                        }}
                      >
                        <CheckContent
                          check={check}
                          isDebt={isDebt}
                          debtAmount={debtAmount}
                          preview
                        />
                      </div>
                    );
                  })}

                  {/* =================================================
                      HORIZONTAL CUT LINES
                  ================================================= */}

                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={`horizontal-cut-${index}`}
                      className="absolute border-t border-dashed border-black"
                      style={{
                        left: "3px",
                        width: "624px",
                        top: `${157.5 + index * 144}px`,
                      }}
                    />
                  ))}

                  {/* =================================================
                      VERTICAL CUT LINE
                  ================================================= */}

                  <div
                    className="absolute border-l border-dashed border-black"
                    style={{
                      left: "315px",
                      top: "15px",
                      height: "717px",
                    }}
                  />
                </div>
              );
            },
          )}
        </div>
      </main>

      {/* =========================================================
          PRINT ROOT
      ========================================================= */}

      <div className="settlement-print-root">
        {Array.from(
          {
            length: Math.ceil(checks.length / 10),
          },
          (_, sheetIndex) => {
            const sheetChecks = checks.slice(
              sheetIndex * 10,
              sheetIndex * 10 + 10,
            );

            return (
              <div key={sheetIndex} className="print-sheet">
                {/* =================================================
                    PRINT CHECKS
                ================================================= */}

                {sheetChecks.map((check, index) => {
                  const isDebt = check.calculation.balanceAfterSale < 0;

                  const debtAmount = Math.abs(
                    check.calculation.balanceAfterSale,
                  );

                  return (
                    <div
                      key={check.settlementId}
                      className={`print-check print-check-${index + 1}`}
                    >
                      <CheckContent
                        check={check}
                        isDebt={isDebt}
                        debtAmount={debtAmount}
                      />
                    </div>
                  );
                })}

                {/* =================================================
                    HORIZONTAL CUT LINES
                ================================================= */}

                <div className="print-cut-horizontal print-cut-horizontal-1" />

                <div className="print-cut-horizontal print-cut-horizontal-2" />

                <div className="print-cut-horizontal print-cut-horizontal-3" />

                <div className="print-cut-horizontal print-cut-horizontal-4" />

                {/* =================================================
                    VERTICAL CUT LINE
                ================================================= */}

                <div className="print-cut-vertical" />
              </div>
            );
          },
        )}
      </div>
    </>
  );
}

/* =========================================================
   CHECK CONTENT
========================================================= */

function CheckContent({
  check,
  isDebt,
  debtAmount,
  preview = false,
}: {
  check: SettlementCheck;
  isDebt: boolean;
  debtAmount: number;
  preview?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col text-black ${
        preview ? "px-[10px] py-[7px]" : "px-[12px] py-[9px]"
      }`}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div>
        <p
          className={`font-semibold leading-none tracking-[-0.02em] text-black ${
            preview ? "text-[10px]" : "text-[12px]"
          }`}
        >
          {check.worker.name}
        </p>

        <p
          className={`text-black ${
            preview ? "mt-[3px] text-[5px]" : "mt-[4px] text-[6px]"
          }`}
        >
          {formatDate(check.sale.saleDate)}
        </p>
      </div>

      {/* =====================================================
          DETAIL
      ===================================================== */}

      <div
        className={`grid grid-cols-3 ${
          preview ? "mt-[7px] gap-2" : "mt-[10px] gap-3"
        }`}
      >
        <div>
          <p className="text-[5.5px] uppercase tracking-[0.08em] text-black">
            Keping
          </p>

          <p
            className={`font-semibold text-black ${
              preview ? "mt-[2px] text-[7px]" : "mt-[2px] text-[8px]"
            }`}
          >
            {formatNumber(check.calculation.pieces)}
          </p>
        </div>

        <div>
          <p className="text-[5.5px] uppercase tracking-[0.08em] text-black">
            Berat
          </p>

          <p
            className={`font-semibold text-black ${
              preview ? "mt-[2px] text-[7px]" : "mt-[2px] text-[8px]"
            }`}
          >
            {formatNumber(check.calculation.weightKg)} kg
          </p>
        </div>

        <div>
          <p className="text-[5.5px] uppercase tracking-[0.08em] text-black">
            Harga
          </p>

          <p
            className={`font-semibold text-black ${
              preview ? "mt-[2px] text-[7px]" : "mt-[2px] text-[8px]"
            }`}
          >
            {formatRupiah(check.calculation.pricePerKg)}
          </p>
        </div>
      </div>

      {/* =====================================================
          CALCULATION
      ===================================================== */}

      <div
        className={`${
          preview ? "mt-[6px] space-y-[2px]" : "mt-[10px] space-y-[4px]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-black ${preview ? "text-[6px]" : "text-[7px]"}`}
          >
            Pendapatan Kotor
          </span>

          <strong
            className={`font-semibold text-black ${
              preview ? "text-[6px]" : "text-[7px]"
            }`}
          >
            {formatRupiah(check.calculation.grossValue)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-black ${preview ? "text-[6px]" : "text-[7px]"}`}
          >
            Bagian Worker ÷ 2
          </span>

          <strong
            className={`font-semibold text-black ${
              preview ? "text-[6px]" : "text-[7px]"
            }`}
          >
            {formatRupiah(check.calculation.workerShare)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-black ${preview ? "text-[6px]" : "text-[7px]"}`}
          >
            KASBON
          </span>

          <strong
            className={`font-semibold text-black ${
              preview ? "text-[6px]" : "text-[7px]"
            }`}
          >
            {formatRupiah(check.calculation.kasbon)}
          </strong>
        </div>

        {check.calculation.deduction > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-black ${preview ? "text-[6px]" : "text-[7px]"}`}
            >
              Dibayar dari KASBON
            </span>

            <strong
              className={`font-semibold text-black ${
                preview ? "text-[6px]" : "text-[7px]"
              }`}
            >
              {formatRupiah(check.calculation.deduction)}
            </strong>
          </div>
        )}
      </div>

      {/* =====================================================
          TOTAL
      ===================================================== */}

      <div
        className={`border-t border-black ${
          preview ? "mt-[5px] pt-[4px]" : "mt-[8px] pt-[6px]"
        }`}
      >
        <div className="flex items-end justify-between gap-3">
          <p
            className={`font-semibold uppercase tracking-[0.08em] text-black ${
              preview ? "text-[5px]" : "text-[6px]"
            }`}
          >
            {isDebt ? "Tekor / Sisa Kasbon" : "Total Dibayarkan"}
          </p>

          <strong
            className={`font-semibold tracking-[-0.02em] text-black ${
              preview ? "text-[9px]" : "text-[11px]"
            }`}
          >
            {isDebt
              ? `-${formatRupiah(debtAmount)}`
              : formatRupiah(check.calculation.netAmount)}
          </strong>
        </div>
      </div>
    </div>
  );
}
