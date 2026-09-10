"use client";

import { FormEvent, useState } from "react";
import styles from "./AddDebt.module.css";

interface AddDebtProps {
  workerId: number;
  workerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDebt({
  workerId,
  workerName,
  onClose,
  onSuccess,
}: AddDebtProps) {
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

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/\D/g, "");

    setAmount(rawValue);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Jumlah kasbon harus lebih dari Rp0.");
      return;
    }

    if (!transactionDate) {
      setError("Tanggal kasbon wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:3001/credit/debt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personId: workerId,
          amount: numericAmount,
          transactionDate: new Date(
            `${transactionDate}T00:00:00`,
          ).toISOString(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal menambahkan kasbon.");
      }

      onSuccess();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Gagal menambahkan kasbon.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>CREDIT TRANSACTION</span>

            <h2>Tambah Kasbon</h2>

            <p>
              Tambahkan kasbon baru untuk <strong>{workerName}</strong>.
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

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="amount">Jumlah Kasbon</label>

            <div className={styles.amountWrapper}>
              <span>Rp</span>

              <input
                id="amount"
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
            <label htmlFor="transactionDate">Tanggal</label>

            <input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Keterangan</label>

            <input
              id="description"
              type="text"
              placeholder="Contoh: rokok, kebutuhan warung..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
              maxLength={255}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

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
              {loading ? "Menyimpan..." : "Simpan Kasbon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
