"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddDebt from "../add-debt/AddDebt";
import styles from "./CreditList.module.css";

interface Worker {
  id: number;
  name: string;
  phone: string | null;
  type: string;
}

interface CreditTransaction {
  id: number;
  type: "DEBT" | "PAYMENT";
  amount: string;
}

interface CreditAccount {
  id: number;
  personId: number;
  status: string;
  transactions: CreditTransaction[];
}

interface CreditWorker extends Worker {
  creditAccount: CreditAccount | null;
  outstandingBalance: number;
}

export default function CreditList() {
  const router = useRouter();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showWorkerSelector, setShowWorkerSelector] = useState(false);

  const [selectedWorker, setSelectedWorker] = useState<CreditWorker | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [workersResponse, accountsResponse] = await Promise.all([
          fetch("http://localhost:3001/rubber-workers"),
          fetch("http://localhost:3001/credit/accounts"),
        ]);

        if (!workersResponse.ok) {
          throw new Error("Gagal mengambil data worker");
        }

        if (!accountsResponse.ok) {
          throw new Error("Gagal mengambil data akun kasbon");
        }

        const workersData = await workersResponse.json();
        const accountsData = await accountsResponse.json();

        setWorkers(workersData);
        setAccounts(accountsData);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data kasbon.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const creditWorkers = useMemo<CreditWorker[]>(() => {
    return workers.map((worker) => {
      const creditAccount =
        accounts.find((account) => account.personId === worker.id) ?? null;

      let outstandingBalance = 0;

      if (creditAccount) {
        for (const transaction of creditAccount.transactions ?? []) {
          if (transaction.type === "DEBT") {
            outstandingBalance += Number(transaction.amount);
          }

          if (transaction.type === "PAYMENT") {
            outstandingBalance -= Number(transaction.amount);
          }
        }
      }

      return {
        ...worker,
        creditAccount,
        outstandingBalance: Math.max(0, outstandingBalance),
      };
    });
  }, [workers, accounts]);

  const filteredWorkers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return creditWorkers;
    }

    return creditWorkers.filter((worker) =>
      worker.name.toLowerCase().includes(keyword),
    );
  }, [creditWorkers, search]);

  const totalWorkers = creditWorkers.length;

  const workersWithDebt = creditWorkers.filter(
    (worker) => worker.outstandingBalance > 0,
  ).length;

  const totalDebt = creditWorkers.reduce(
    (total, worker) => total + worker.outstandingBalance,
    0,
  );

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString("id-ID")}`;
  };

  const handleSelectWorker = (worker: CreditWorker) => {
    setSelectedWorker(worker);
    setShowWorkerSelector(false);
  };

  const handleCloseAddDebt = () => {
    setSelectedWorker(null);
  };

  const handleAddDebtSuccess = () => {
    setSelectedWorker(null);
    window.location.reload();
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>FINANCIAL MANAGEMENT</span>

            <h1>Kasbon</h1>

            <p>Kelola kasbon dan pembayaran worker dengan mudah.</p>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowWorkerSelector(true)}
          >
            + Tambah Kasbon
          </button>
        </header>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Total Worker</span>

            <strong>{totalWorkers}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Masih Berutang</span>

            <strong>{workersWithDebt}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Total Kasbon</span>

            <strong>{formatCurrency(totalDebt)}</strong>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>WORKERS</span>

              <h2>Daftar Worker</h2>
            </div>

            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Cari worker..."
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>NO</th>
                  <th>WORKER</th>
                  <th>SALDO KASBON</th>
                  <th>STATUS</th>
                  <th>AKSI</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      {error}
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      {search
                        ? "Worker tidak ditemukan."
                        : "Belum ada data worker."}
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker, index) => (
                    <tr key={worker.id}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>{worker.name}</strong>
                      </td>

                      <td>{formatCurrency(worker.outstandingBalance)}</td>

                      <td>
                        {worker.outstandingBalance > 0 ? "Ada Kasbon" : "Lunas"}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => router.push(`/credit/${worker.id}`)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showWorkerSelector && (
        <div
          className={styles.selectorOverlay}
          onMouseDown={() => setShowWorkerSelector(false)}
        >
          <div
            className={styles.selectorModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.selectorHeader}>
              <div>
                <span className={styles.eyebrow}>CREDIT ACCOUNT</span>

                <h2>Pilih Worker</h2>

                <p>Pilih worker yang ingin diberikan kasbon.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setShowWorkerSelector(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.workerList}>
              {creditWorkers.length === 0 ? (
                <div className={styles.selectorEmpty}>Belum ada worker.</div>
              ) : (
                creditWorkers.map((worker) => (
                  <button
                    key={worker.id}
                    type="button"
                    className={styles.workerOption}
                    onClick={() => handleSelectWorker(worker)}
                  >
                    <div>
                      <strong>{worker.name}</strong>

                      <span>
                        {worker.outstandingBalance > 0
                          ? `Kasbon ${formatCurrency(
                              worker.outstandingBalance,
                            )}`
                          : "Belum ada kasbon"}
                      </span>
                    </div>

                    <span className={styles.arrow}>→</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedWorker && (
        <AddDebt
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
          onClose={handleCloseAddDebt}
          onSuccess={handleAddDebtSuccess}
        />
      )}
    </main>
  );
}
