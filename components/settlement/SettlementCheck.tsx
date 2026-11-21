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
  settledAt: string | null;
  settlementMethod: string | null;
  reconciliationStatus: string | null;
};

type ReconciliationHistory = {
  id: number;
  decision: string;
  statusBefore: string;
  statusAfter: string;
  reviewedMoneyTransactionId: number | null;
  reviewedCreditTransactionId: number | null;
  reason: string;
  decidedById: number | null;
  decidedAt: string;
};

type ReconciliationChoice =
  | "USE_EXISTING_PAYMENT"
  | "RESET_CALCULATION"
  | "REVIEWED_UNSETTLED";

interface SettlementCheckProps {
  saleId: number;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Belum dibayar",
  PAID_OUT: "Sudah dibayar tunai",
  SETTLED_BY_OFFSET: "Lunas lewat potongan kasbon",
  NO_BALANCE: "Tidak ada hak dibayar (Rp0)",
  CANCELLED: "Dibatalkan",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PAID_OUT: "bg-emerald-100 text-emerald-900",
  SETTLED_BY_OFFSET: "bg-sky-100 text-sky-900",
  NO_BALANCE: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-neutral-200 text-neutral-700",
};

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

  // The dialog summarises one worker before money is handed over.
  const [payTarget, setPayTarget] = useState<SettlementCheck | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  // Reconciliation of a historical settlement whose record could not be
  // proven. Separate from the payment status on purpose.
  const [reconcileTarget, setReconcileTarget] =
    useState<SettlementCheck | null>(null);
  const [reconcileHistory, setReconcileHistory] = useState<
    ReconciliationHistory[]
  >([]);
  const [reconcileChoice, setReconcileChoice] =
    useState<ReconciliationChoice>("REVIEWED_UNSETTLED");
  const [reconcileDecision, setReconcileDecision] = useState<
    "PAID_OUT" | "SETTLED_BY_OFFSET"
  >("PAID_OUT");
  const [reconcileReason, setReconcileReason] = useState("");
  const [reconcileEvidence, setReconcileEvidence] = useState("");
  const [reconcileError, setReconcileError] = useState("");
  const [reconciling, setReconciling] = useState(false);
  // BD-18: UNSETTLED requires both checks; they are stored with the decision.
  const [verifiedNoCash, setVerifiedNoCash] = useState(false);
  const [verifiedNoKasbon, setVerifiedNoKasbon] = useState(false);

  const reloadChecks = async () => {
    const refreshed = await fetch(
      `http://localhost:3001/settlements/sale/${saleId}/check`,
    );

    if (refreshed.ok) {
      setChecks(await refreshed.json());
    }
  };

  const openReconcile = async (check: SettlementCheck) => {
    setReconcileTarget(check);
    setReconcileError("");
    setReconcileHistory([]);
    setReconcileReason("");
    setReconcileEvidence("");
    setReconcileChoice("REVIEWED_UNSETTLED");
    setVerifiedNoCash(false);
    setVerifiedNoKasbon(false);
    setReconcileDecision(check.calculation.netAmount > 0 ? "PAID_OUT" : "SETTLED_BY_OFFSET");

    try {
      const response = await fetch(
        `http://localhost:3001/settlements/${check.settlementId}/reconciliations`,
      );

      if (response.ok) {
        setReconcileHistory(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitReconcile = async () => {
    if (!reconcileTarget) {
      return;
    }

    setReconciling(true);
    setReconcileError("");

    try {
      const evidenceId = Number(reconcileEvidence);

      // Only ids travel; the API checks that they belong to this settlement.
      // The body carries no identity: the actor comes from authentication.
      const body: Record<string, unknown> = {
        choice: reconcileChoice,
        reason: reconcileReason.trim(),
      };

      if (reconcileChoice === "REVIEWED_UNSETTLED") {
        body.verifiedNoCashPayment = verifiedNoCash;
        body.verifiedKasbonDeductionNotRecorded = verifiedNoKasbon;
      }

      if (reconcileChoice === "USE_EXISTING_PAYMENT") {
        body.decision = reconcileDecision;

        if (Number.isInteger(evidenceId) && evidenceId > 0) {
          if (reconcileDecision === "PAID_OUT") {
            body.reviewedMoneyTransactionId = evidenceId;
          } else {
            body.reviewedCreditTransactionId = evidenceId;
          }
        }
      }

      const response = await fetch(
        `http://localhost:3001/settlements/${reconcileTarget.settlementId}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message) || "Gagal menyimpan rekonsiliasi",
        );
      }

      setReconcileTarget(null);
      await reloadChecks();
    } catch (err) {
      setReconcileError(
        err instanceof Error ? err.message : "Gagal menyimpan rekonsiliasi",
      );
    } finally {
      setReconciling(false);
    }
  };

  const awaitingReconciliation = checks.filter(
    (check) => check.reconciliationStatus === "REQUIRED",
  ).length;

  // Settlement step is idempotent, so a retry after a lost response cannot
  // pay twice; the row simply comes back as already settled.
  const paySettlement = async (settlementId: number) => {
    setPaying(true);
    setPayError("");

    try {
      const response = await fetch(
        `http://localhost:3001/settlements/${settlementId}/pay`,
        { method: "POST" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message;

        // A refused payment because the settlement still needs reconciliation
        // gets its own wording, plus a refresh so the badge shows up.
        throw new Error(
          message?.includes("rekonsiliasi")
            ? `${message} Buka rekonsiliasi pada baris pekerja ini.`
            : message || "Gagal membayar settlement",
        );
      }

      setPayTarget(null);

      const refreshed = await fetch(
        `http://localhost:3001/settlements/sale/${saleId}/check`,
      );

      if (refreshed.ok) {
        setChecks(await refreshed.json());
      }
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Gagal membayar settlement",
      );
      await reloadChecks();
      setPayTarget(null);
    } finally {
      setPaying(false);
    }
  };

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

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          // The API explains why a sale has no check (e.g. Sawit has no
          // worker settlements); show that instead of a generic error.
          throw new Error(
            (Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message) || "Gagal mengambil data check",
          );
        }

        setChecks(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Gagal mengambil data check",
        );
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
      <main className="min-h-screen bg-surface-soft px-4 py-6 sm:px-5 lg:px-7">
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
      <main className="min-h-screen bg-surface-soft px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md border border-black bg-surface p-5">
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
      <main className="min-h-screen bg-surface-soft px-4 py-6 sm:px-5 lg:px-7">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md border border-black bg-surface p-6 text-center">
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
        <main className="min-h-0 bg-surface-soft px-4 pb-4 pt-5 sm:px-5 sm:pt-6 lg:px-7">
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
              className="inline-flex h-10 w-full items-center justify-center gap-2 border border-black bg-black px-5 text-xs font-semibold text-white transition hover:bg-surface hover:text-black sm:w-auto sm:min-w-[150px]"
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
          WORKER PAYOUTS
          Paying is separate from calculating: nothing was handed over when
          the settlement rows were created.
      ========================================================= */}

      <section className="print:hidden bg-surface-soft px-4 pb-6 sm:px-5 lg:px-7">
        <div className="mx-auto w-full max-w-[900px] border border-black bg-surface">
          <div className="border-b border-black px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
              Pembayaran Pekerja
            </p>

            <p className="mt-1 text-xs text-black">
              Serahkan uang lalu tandai. Setelah ada pekerja yang diselesaikan,
              penjualan tidak dapat dibatalkan atau dihapus lagi.
            </p>

            {awaitingReconciliation > 0 && (
              <p className="mt-2 border border-orange-700 bg-orange-100 px-3 py-2 text-[11px] font-semibold text-orange-900">
                {awaitingReconciliation} settlement lama menunggu rekonsiliasi
                sebelum dapat dibayar melalui alur normal.
              </p>
            )}
          </div>

          <ul>
            {checks.map((check) => {
              const settled = check.status !== "PENDING";

              return (
                <li
                  key={check.settlementId}
                  className="flex flex-col gap-3 border-b border-black/20 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-black">
                      {check.worker.name} ·{" "}
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-semibold ${
                          STATUS_CLASS[check.status] ?? "bg-neutral-200"
                        }`}
                      >
                        {STATUS_LABEL[check.status] ?? check.status}
                      </span>
                      {check.reconciliationStatus === "REQUIRED" && (
                        <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold bg-orange-200 text-orange-900">
                          Perlu Rekonsiliasi
                        </span>
                      )}
                    </p>

                    <p className="mt-0.5 text-[10px] text-black/70">
                      Hak {formatRupiah(check.calculation.workerShare)} · Kasbon{" "}
                      {formatRupiah(check.calculation.deduction)} · Bersih{" "}
                      {formatRupiah(check.calculation.netAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!settled && check.status === "PENDING" && check.reconciliationStatus !== "REQUIRED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayError("");
                          setPayTarget(check);
                        }}
                        className="inline-flex h-9 items-center justify-center border border-black bg-black px-4 text-[11px] font-semibold text-white transition hover:bg-surface hover:text-black"
                      >
                        {check.calculation.netAmount > 0
                          ? "Bayar Tunai"
                          : "Selesaikan via Potongan"}
                      </button>
                    )}

                    {check.reconciliationStatus === "REQUIRED" && (
                      <button
                        type="button"
                        onClick={() => openReconcile(check)}
                        className="inline-flex h-9 items-center justify-center border border-orange-700 bg-orange-100 px-4 text-[11px] font-semibold text-orange-900 transition hover:bg-orange-200"
                      >
                        Rekonsiliasi
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* =========================================================
          RECONCILIATION DIALOG
      ========================================================= */}

      {reconcileTarget && (
        <div
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-full w-full max-w-lg overflow-y-auto border border-black bg-surface p-5">
            <h2 className="text-sm font-semibold text-black">
              Rekonsiliasi Settlement #{reconcileTarget.settlementId}
            </h2>

            <p className="mt-1 text-[11px] text-black/70">
              {reconcileTarget.worker.name} · Hak{" "}
              {formatRupiah(reconcileTarget.calculation.workerShare)} · Potongan
              kasbon {formatRupiah(reconcileTarget.calculation.deduction)} ·
              Bersih {formatRupiah(reconcileTarget.calculation.netAmount)}
            </p>

            <div className="mt-3 border border-black bg-surface-soft p-3 text-[11px] text-black">
              <p className="font-semibold">Periksa bukti historis</p>
              <p className="mt-1">
                Referensi pembayaran tersimpan: kas{" "}
                <span className="font-mono">#{reconcileTarget.settlementId}</span>{" "}
                (refType SETTLEMENT). Cari transaksi terkait di halaman Transaksi.
                Masukkan id transaksi kas atau potongan kasbon yang benar-benar
                menjadi bukti settlement ini.
              </p>

              <input
                type="number"
                placeholder="ID transaksi kas / potongan kasbon (opsional untuk REVIEWED_UNSETTLED)"
                value={reconcileEvidence}
                onChange={(event) => setReconcileEvidence(event.target.value)}
                className="mt-2 h-8 w-full border border-black bg-surface px-2 text-[11px] text-black"
              />
            </div>

            <div className="mt-3 space-y-2 text-[11px] text-black">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="choice"
                  checked={reconcileChoice === "USE_EXISTING_PAYMENT"}
                  onChange={() => setReconcileChoice("USE_EXISTING_PAYMENT")}
                />
                <span>
                  Bukti ditemukan: tetapkan keputusan pembayaran
                  <select
                    value={reconcileDecision}
                    onChange={(event) =>
                      setReconcileDecision(
                        event.target.value as "PAID_OUT" | "SETTLED_BY_OFFSET",
                      )
                    }
                    className="ml-2 h-7 border border-black bg-surface px-1 text-[11px]"
                  >
                    <option value="PAID_OUT">PAID_OUT (tunai)</option>
                    <option value="SETTLED_BY_OFFSET">
                      SETTLED_BY_OFFSET (potongan kasbon penuh)
                    </option>
                  </select>
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="choice"
                  checked={reconcileChoice === "REVIEWED_UNSETTLED"}
                  onChange={() => setReconcileChoice("REVIEWED_UNSETTLED")}
                />
                <span>
                  Belum dibayar: tidak ada pembayaran tunai dan potongan kasbon
                  belum tercatat. Settlement kembali ke PENDING dan bisa dibayar
                  melalui alur normal.
                  {reconcileChoice === "REVIEWED_UNSETTLED" && (
                    <span className="mt-1 block space-y-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verifiedNoCash}
                          onChange={(event) => setVerifiedNoCash(event.target.checked)}
                        />
                        Saya pastikan tidak ada pembayaran tunai untuk pekerja ini
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verifiedNoKasbon}
                          onChange={(event) => setVerifiedNoKasbon(event.target.checked)}
                        />
                        Saya pastikan potongan kasbon belum tercatat untuk settlement ini
                      </label>
                    </span>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="choice"
                  checked={reconcileChoice === "RESET_CALCULATION"}
                  onChange={() => setReconcileChoice("RESET_CALCULATION")}
                />
                <span>
                  Kembalikan ke tahap perhitungan (PENDING) agar dihitung ulang
                  dengan data terbaru.
                </span>
              </label>
            </div>

            <textarea
              placeholder="Alasan keputusan (minimal 10 karakter)"
              value={reconcileReason}
              onChange={(event) => setReconcileReason(event.target.value)}
              className="mt-3 h-16 w-full border border-black bg-surface p-2 text-[11px] text-black"
            />

            {reconcileHistory.length > 0 && (
              <div className="mt-3 border-t border-black pt-2">
                <p className="text-[10px] font-semibold text-black">
                  Riwayat rekonsiliasi
                </p>
                <ul className="mt-1 space-y-1 text-[10px] text-black/80">
                  {reconcileHistory.map((row) => (
                    <li key={row.id}>
                      {formatDate(row.decidedAt)} · {row.decision}:{" "}
                      {row.statusBefore} → {row.statusAfter} ·{" "}
                      {row.decidedById ? `pelaku #${row.decidedById}` : "pelaku tidak tercatat"} ·{" "}
                      {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reconcileError && (
              <p className="mt-3 text-[11px] font-semibold text-red-700">
                {reconcileError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={reconciling}
                onClick={() => setReconcileTarget(null)}
                className="inline-flex h-9 items-center border border-black px-4 text-[11px] font-semibold text-black disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={
                  reconciling ||
                  reconcileReason.trim().length < 10 ||
                  (reconcileChoice === "REVIEWED_UNSETTLED" &&
                    !(verifiedNoCash && verifiedNoKasbon))
                }
                onClick={submitReconcile}
                className="inline-flex h-9 items-center border border-black bg-black px-4 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {reconciling ? "Menyimpan..." : "Simpan Rekonsiliasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYMENT CONFIRMATION
      ========================================================= */}

      {payTarget && (
        <div
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-black bg-surface p-5">
            <h2 className="text-sm font-semibold text-black">
              {payTarget.calculation.netAmount > 0
                ? "Konfirmasi Pembayaran Tunai"
                : "Konfirmasi Penyelesaian via Potongan Kasbon"}
            </h2>

            <dl className="mt-4 space-y-1.5 text-xs text-black">
              <div className="flex justify-between gap-3">
                <dt>Pekerja</dt>
                <dd className="font-semibold">{payTarget.worker.name}</dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt>Hak bruto pekerja</dt>
                <dd>{formatRupiah(payTarget.calculation.workerShare)}</dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt>Potongan kasbon</dt>
                <dd>-{formatRupiah(payTarget.calculation.deduction)}</dd>
              </div>

              <div className="flex justify-between gap-3 border-t border-black pt-1.5">
                <dt className="font-semibold">Nominal bersih</dt>
                <dd className="font-semibold">
                  {formatRupiah(payTarget.calculation.netAmount)}
                </dd>
              </div>
            </dl>

            <p className="mt-4 border border-black bg-surface-soft p-3 text-[11px] leading-relaxed text-black">
              {payTarget.calculation.netAmount > 0
                ? "Pastikan uang sudah diserahkan ke pekerja. Setelah dikonfirmasi, penjualan tidak dapat dibatalkan atau dihapus melalui alur normal."
                : "Periksa ulang: konfirmasi ini hanya sah bila kasbon pekerja yang valid menutup seluruh haknya. Tidak ada uang tunai yang diserahkan; potongan tercatat pada akun kasbon pekerja."}
            </p>

            {payError && (
              <p className="mt-3 text-[11px] font-semibold text-red-700">
                {payError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={paying}
                onClick={() => setPayTarget(null)}
                className="inline-flex h-9 items-center border border-black px-4 text-[11px] font-semibold text-black disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={paying}
                onClick={() => paySettlement(payTarget.settlementId)}
                className="inline-flex h-9 items-center border border-black bg-black px-4 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {paying ? "Memproses..." : "Ya, sudah diserahkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SCREEN PREVIEW
      ========================================================= */}

      <main className="bg-surface-soft px-4 pb-10 sm:px-5 lg:px-7 print:hidden">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-4 border border-black bg-surface px-4 py-3">
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
                  className="relative mx-auto mb-6 h-[891px] w-[630px] overflow-hidden bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
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
                        className="absolute overflow-hidden border border-black bg-surface"
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
