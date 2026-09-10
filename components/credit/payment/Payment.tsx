"use client";

import { FormEvent, useState } from "react";
import styles from "./Payment.module.css";

interface PaymentProps {
  workerId: number;
  workerName: string;
  creditAccountId: number;
  outstandingBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function Payment({
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

  const formatCurrency = (value: string) => {
    const number = Number(value.replace(/\D/g, ""));

    if (!number) {
      return "";
    }

    return number.toLocaleString("id-ID");
  };

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const rawValue = event.target.value.replace(/\D/g, "");

    setAmount(rawValue);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Jumlah pembayaran harus lebih dari Rp0.");
      return;
    }

    if (numericAmount > outstandingBalance) {
      setError(
        `Pembayaran tidak boleh melebihi kasbon ${formatCurrency(
          String(outstandingBalance),
        )}.`,
      );
      return;
    }

    if (!transactionDate) {
      setError("Tanggal pembayaran wajib diisi.");
      return;
    }

    try {
      setLoading(true);

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
            description: description.trim() || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Gagal melakukan pembayaran kasbon.",
        );
      }

      onSuccess();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal melakukan pembayaran kasbon.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={onClose}
    >
      <div
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              CREDIT PAYMENT
            </span>

            <h2>Bayar Kasbon</h2>

            <p>
              Catat pembayaran kasbon{" "}
              <strong>{workerName}</strong>.
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className={styles.balanceInfo}>
          <span>Kasbon Saat Ini</span>

          <strong>
            Rp{outstandingBalance.toLocaleString("id-ID")}
          </strong>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <div className={styles.formGroup}>
            <label htmlFor="paymentAmount">
              Jumlah Pembayaran
            </label>

            <div className={styles.amountWrapper}>
              <span>Rp</span>

              <input
                id="paymentAmount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatCurrency(amount)}
                onChange={handleAmountChange}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="paymentDate">
              Tanggal
            </label>

            <input
              id="paymentDate"
              type="date"
              value={transactionDate}
              onChange={(event) =>
                setTransactionDate(event.target.value)
              }
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="paymentDescription">
              Keterangan
            </label>

            <input
              id="paymentDescription"
              type="text"
              placeholder="Contoh: pembayaran tunai..."
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={loading}
              maxLength={255}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? "Menyimpan..."
                : "Bayar Kasbon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}