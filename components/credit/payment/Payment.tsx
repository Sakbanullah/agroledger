"use client";

import { FormEvent, useState } from "react";

type PaymentProps = {
  workerId: number;
  workerName: string;
  creditAccountId: number;
  outstandingBalance: number;
  onClose: () => void;
  onSuccess: () => void;
};

function formatRupiah(value: string) {
  const numeric = value.replace(/\D/g, "");

  if (!numeric) return "";

  return new Intl.NumberFormat("id-ID").format(Number(numeric));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Payment({
  workerId,
  workerName,
  creditAccountId,
  outstandingBalance,
  onClose,
  onSuccess,
}: PaymentProps) {
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount.replace(/\D/g, ""));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal pembayaran harus lebih dari Rp0.");
      return;
    }

    if (numericAmount > outstandingBalance) {
      setError(
        `Pembayaran tidak boleh melebihi saldo kasbon ${formatCurrency(
          outstandingBalance,
        )}.`,
      );
      return;
    }

    if (!transactionDate) {
      setError("Tanggal transaksi wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:3001/credit/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creditAccountId,
            type: "PAYMENT",
            amount: numericAmount,
            transactionDate: new Date(
              `${transactionDate}T00:00:00`,
            ).toISOString(),
            ...(description.trim() && {
              description: description.trim(),
            }),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal mencatat pembayaran.");
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mencatat pembayaran.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(23,34,27,0.14)]">
        {/* Header */}
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Pembayaran
              </p>

              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
                Bayar Kasbon
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                Catat pembayaran kasbon untuk{" "}
                <span className="font-medium text-text-primary">
                  {workerName}
                </span>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[20px] leading-none text-text-muted transition hover:bg-[#F3F5F2] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {/* Worker */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                Worker
              </label>

              <div className="flex items-center gap-3 rounded-[10px] border border-border bg-[#F8FAF7] px-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#EAF3E7] text-[12px] font-semibold text-[#3F7635]">
                  {workerName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-text-primary">
                    {workerName}
                  </p>

                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Akun kasbon worker
                  </p>
                </div>
              </div>
            </div>

            {/* Outstanding balance */}
            <div className="rounded-[12px] border border-[#DCE8D8] bg-[#F5F9F3] px-4 py-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Sisa Kasbon
                  </p>

                  <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[#3F7635]">
                    {formatCurrency(outstandingBalance)}
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#E6EFE2] text-[#3F7635]">
                  ↗
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="payment-amount"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
              >
                Nominal Pembayaran
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-text-muted">
                  Rp
                </span>

                <input
                  id="payment-amount"
                  type="text"
                  inputMode="numeric"
                  value={formatRupiah(amount)}
                  onChange={(event) => {
                    const numeric = event.target.value.replace(/\D/g, "");

                    setAmount(numeric);
                    setError("");
                  }}
                  placeholder="0"
                  disabled={loading || outstandingBalance <= 0}
                  autoFocus
                  className="h-12 w-full rounded-[10px] border border-border bg-white pl-10 pr-3 text-[15px] font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p className="text-[10px] text-text-muted">
                  Maksimal sesuai sisa kasbon.
                </p>

                {outstandingBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(outstandingBalance));
                      setError("");
                    }}
                    disabled={loading}
                    className="text-[10px] font-semibold text-[#3F7635] transition hover:text-[#315C2A] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Bayar penuh
                  </button>
                )}
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="payment-date"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
              >
                Tanggal
              </label>

              <input
                id="payment-date"
                type="date"
                value={transactionDate}
                onChange={(event) => {
                  setTransactionDate(event.target.value);
                  setError("");
                }}
                disabled={loading}
                className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="payment-description"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
              >
                Keterangan
                <span className="ml-1 font-normal normal-case tracking-normal text-text-muted">
                  (opsional)
                </span>
              </label>

              <textarea
                id="payment-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setError("");
                }}
                placeholder="Contoh: pembayaran tunai, pelunasan..."
                rows={3}
                disabled={loading}
                className="w-full resize-none rounded-[10px] border border-border bg-white px-3 py-2.5 text-[13px] leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
              />
            </div>

            {/* No balance */}
            {outstandingBalance <= 0 && !error && (
              <div className="rounded-[10px] border border-[#DCE8D8] bg-[#EAF3E7] px-3 py-3">
                <p className="text-[12px] font-medium text-[#3F7635]">
                  Kasbon worker sudah lunas.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-[#E8C8C3] bg-[#FFF3F1] px-3 py-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3D8D3] text-[11px] font-bold text-[#B5473A]">
                  !
                </div>

                <p className="text-[12px] leading-5 text-[#B5473A]">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-[#FBFCFA] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-[10px] border border-border bg-white px-4 text-[12px] font-medium text-text-secondary transition hover:bg-[#F5F7F4] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                loading || numericAmount <= 0 || outstandingBalance <= 0
              }
              className="h-10 rounded-[10px] bg-[#17221B] px-5 text-[12px] font-semibold text-white transition hover:bg-[#26352B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
