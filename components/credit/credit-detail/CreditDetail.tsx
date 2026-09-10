"use client";

import { useEffect, useState } from "react";
import AddDebt from "../add-debt/AddDebt";
import Payment from "../payment/Payment";
import styles from "./CreditDetail.module.css";

interface Person {
  id: number;
  name: string;
  phone: string | null;
  type: string;
}

interface CreditTransaction {
  id: number;
  creditAccountId: number;
  type: "DEBT" | "PAYMENT";
  amount: string;
  transactionDate: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

interface CreditAccount {
  id: number;
  personId: number;
  status: string;
  transactions: CreditTransaction[];
}

interface CreditDetailProps {
  workerId: number;
}

export default function CreditDetail({ workerId }: CreditDetailProps) {
  const [worker, setWorker] = useState<Person | null>(null);
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const [workerResponse, accountsResponse] = await Promise.all([
          fetch(`http://localhost:3001/rubber-workers/${workerId}`),
          fetch("http://localhost:3001/credit/accounts"),
        ]);

        if (!workerResponse.ok) {
          throw new Error("Worker tidak ditemukan");
        }

        if (!accountsResponse.ok) {
          throw new Error("Gagal mengambil akun kasbon");
        }

        const workerData = await workerResponse.json();
        const accountsData: CreditAccount[] = await accountsResponse.json();

        const workerAccount =
          accountsData.find((item) => item.personId === workerData.id) ?? null;

        setWorker(workerData);
        setAccount(workerAccount);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat detail worker.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [workerId]);

  const transactions = account?.transactions ?? [];

  const outstandingBalance = transactions.reduce((balance, transaction) => {
    if (transaction.type === "DEBT") {
      return balance + Number(transaction.amount);
    }

    if (transaction.type === "PAYMENT") {
      return balance - Number(transaction.amount);
    }

    return balance;
  }, 0);

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString("id-ID")}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>Memuat detail worker...</div>
        </div>
      </main>
    );
  }

  if (error || !worker) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>
            {error || "Worker tidak ditemukan."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => window.history.back()}
            >
              ← Kembali
            </button>

            <span className={styles.eyebrow}>WORKER ACCOUNT</span>

            <h1>{worker.name}</h1>

            <p>Kelola kasbon dan riwayat transaksi worker.</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setShowPayment(true)}
              disabled={!account || outstandingBalance <= 0}
            >
              Bayar Kasbon
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setShowAddDebt(true)}
            >
              + Tambah Kasbon
            </button>
          </div>
        </header>

        <section className={styles.balanceCard}>
          <div>
            <span>Saldo Kasbon</span>

            <strong>{formatCurrency(Math.max(0, outstandingBalance))}</strong>
          </div>

          <div
            className={
              outstandingBalance > 0 ? styles.debtStatus : styles.paidStatus
            }
          >
            {outstandingBalance > 0 ? "Ada Kasbon" : "Lunas"}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>TRANSACTIONS</span>

              <h2>Riwayat Kasbon</h2>
            </div>

            <span className={styles.transactionCount}>
              {transactions.length} transaksi
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>TANGGAL</th>
                  <th>JENIS</th>
                  <th>KETERANGAN</th>
                  <th>JUMLAH</th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyState}>
                      Belum ada transaksi kasbon.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.transactionDate)}</td>

                      <td>
                        <span
                          className={
                            transaction.type === "DEBT"
                              ? styles.debtBadge
                              : styles.paymentBadge
                          }
                        >
                          {transaction.type === "DEBT"
                            ? "Kasbon"
                            : "Pembayaran"}
                        </span>
                      </td>

                      <td>{transaction.description || "-"}</td>

                      <td
                        className={
                          transaction.type === "DEBT"
                            ? styles.debtAmount
                            : styles.paymentAmount
                        }
                      >
                        {transaction.type === "DEBT" ? "+" : "-"}

                        {formatCurrency(Number(transaction.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showAddDebt && (
        <AddDebt
          workerId={worker.id}
          workerName={worker.name}
          onClose={() => setShowAddDebt(false)}
          onSuccess={() => {
            setShowAddDebt(false);
            window.location.reload();
          }}
        />
      )}
      {showPayment && account && outstandingBalance > 0 && (
        <Payment
          workerId={worker.id}
          workerName={worker.name}
          creditAccountId={account.id}
          outstandingBalance={Math.max(0, outstandingBalance)}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
