"use client";

import {
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Plus,
  Search,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddDebt from "../add-debt/AddDebt";

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

  const paidWorkers = totalWorkers - workersWithDebt;

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
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Financial Management
            </p>

            <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[30px]">
              Kasbon
            </h1>

            <p className="mt-1.5 text-[12px] text-text-secondary">
              Kelola kasbon dan pembayaran worker dengan mudah.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowWorkerSelector(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-[12px] font-medium text-white transition hover:bg-[#26352B] active:scale-[0.99]"
          >
            <Plus size={15} />
            Tambah Kasbon
          </button>
        </header>

        {/* SUMMARY */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* TOTAL OUTSTANDING */}
          <div className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Total Kasbon
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {formatCurrency(totalDebt)}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Outstanding seluruh worker
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6EFE2] text-[#3F7635]">
                <WalletCards size={17} />
              </div>
            </div>
          </div>

          {/* WORKER WITH DEBT */}
          <div className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Masih Berutang
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {workersWithDebt}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Worker dengan saldo kasbon
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FFF3E6] text-[#A96D2E]">
                <CircleDollarSign size={17} />
              </div>
            </div>
          </div>

          {/* WORKER STATUS */}
          <div className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Worker
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {totalWorkers}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  {paidWorkers} worker tanpa kasbon
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6EFE2] text-[#3F7635]">
                <Users size={17} />
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CARD */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-white">
          {/* CARD HEADER */}
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                Workers
              </p>

              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
                  Daftar Kasbon
                </h2>

                <span className="rounded-full bg-[#F1F3EF] px-2 py-0.5 text-[9px] font-medium text-text-muted">
                  {totalWorkers} worker
                </span>
              </div>
            </div>

            <div className="relative w-full sm:w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                placeholder="Cari worker..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-[9px] border border-border bg-[#F7F8F5] pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:bg-white"
              />
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Loader2 size={15} className="animate-spin" />
                Memuat data kasbon...
              </div>
            </div>
          ) : error ? (
            /* ERROR */
            <div className="flex min-h-[300px] items-center justify-center px-5">
              <div className="rounded-[10px] bg-[#FFF3F1] px-4 py-3 text-center text-[11px] text-[#B5473A]">
                {error}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-[#FAFAF8] text-left">
                      <th className="w-[70px] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        No
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Worker
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Saldo Kasbon
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredWorkers.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex min-h-[240px] flex-col items-center justify-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F3EF] text-text-muted">
                              <UserRound size={18} />
                            </div>

                            <p className="text-[12px] font-medium text-text-primary">
                              {search
                                ? "Worker tidak ditemukan"
                                : "Belum ada worker"}
                            </p>

                            <p className="mt-1 text-[11px] text-text-muted">
                              {search
                                ? "Coba gunakan kata kunci lain."
                                : "Data worker akan muncul di sini."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredWorkers.map((worker, index) => {
                        const hasDebt = worker.outstandingBalance > 0;

                        return (
                          <tr
                            key={worker.id}
                            className="border-b border-border last:border-0 transition-colors hover:bg-[#FCFCFA]"
                          >
                            <td className="px-5 py-4 text-[11px] text-text-muted">
                              {String(index + 1).padStart(2, "0")}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6EFE2] text-[10px] font-semibold text-[#3F7635]">
                                  {worker.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((part) => part[0])
                                    .join("")
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <p className="text-[12px] font-semibold text-text-primary">
                                    {worker.name}
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-text-muted">
                                    {worker.phone ?? "Tidak ada nomor telepon"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p
                                className={`text-[12px] font-semibold ${
                                  hasDebt
                                    ? "text-text-primary"
                                    : "text-text-muted"
                                }`}
                              >
                                {formatCurrency(worker.outstandingBalance)}
                              </p>

                              <p className="mt-0.5 text-[9px] text-text-muted">
                                Outstanding
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              {hasDebt ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[10px] font-medium text-[#A96D2E]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#C88A42]" />
                                  Ada Kasbon
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3E7] px-2.5 py-1 text-[10px] font-medium text-[#3F7635]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#5B8F50]" />
                                  Lunas
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/credit/${worker.id}`)
                                  }
                                  className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-text-secondary transition hover:bg-[#F1F3EF] hover:text-text-primary"
                                >
                                  Detail
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">
                {filteredWorkers.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center px-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F3EF] text-text-muted">
                      <UserRound size={18} />
                    </div>

                    <p className="text-[12px] font-medium text-text-primary">
                      {search ? "Worker tidak ditemukan" : "Belum ada worker"}
                    </p>

                    <p className="mt-1 text-[11px] text-text-muted">
                      {search
                        ? "Coba gunakan kata kunci lain."
                        : "Data worker akan muncul di sini."}
                    </p>
                  </div>
                ) : (
                  filteredWorkers.map((worker) => {
                    const hasDebt = worker.outstandingBalance > 0;

                    return (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => router.push(`/credit/${worker.id}`)}
                        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#FCFCFA]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6EFE2] text-[10px] font-semibold text-[#3F7635]">
                          {worker.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[12px] font-semibold text-text-primary">
                              {worker.name}
                            </p>

                            {hasDebt ? (
                              <span className="shrink-0 rounded-full bg-[#FFF4E8] px-2 py-1 text-[9px] font-medium text-[#A96D2E]">
                                Ada Kasbon
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-[#EAF3E7] px-2 py-1 text-[9px] font-medium text-[#3F7635]">
                                Lunas
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="truncate text-[10px] text-text-muted">
                              {worker.phone ?? "Tidak ada nomor telepon"}
                            </span>

                            <span className="shrink-0 text-[11px] font-semibold text-text-primary">
                              {formatCurrency(worker.outstandingBalance)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          size={15}
                          className="shrink-0 text-text-muted"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* WORKER SELECTOR */}
      {showWorkerSelector && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onMouseDown={() => setShowWorkerSelector(false)}
        >
          <div
            className="flex max-h-[min(620px,calc(100vh-32px))] w-full max-w-[460px] flex-col overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(23,34,27,0.14)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                  Credit Account
                </p>

                <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-text-primary">
                  Pilih Worker
                </h2>

                <p className="mt-1 text-[11px] text-text-secondary">
                  Pilih worker yang ingin diberikan kasbon.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWorkerSelector(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-text-muted transition hover:bg-[#F1F3EF] hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            {/* SEARCH */}
            <div className="shrink-0 border-b border-border px-5 py-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />

                <input
                  type="text"
                  placeholder="Cari worker..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 w-full rounded-[9px] border border-border bg-[#F7F8F5] pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:bg-white"
                />
              </div>
            </div>

            {/* WORKER LIST */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredWorkers.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-5">
                  <UserRound size={20} className="mb-3 text-text-muted" />

                  <p className="text-[12px] font-medium text-text-primary">
                    Worker tidak ditemukan
                  </p>

                  <p className="mt-1 text-[10px] text-text-muted">
                    Coba gunakan nama worker yang berbeda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredWorkers.map((worker) => {
                    const hasDebt = worker.outstandingBalance > 0;

                    return (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => handleSelectWorker(worker)}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#FAFBF8]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6EFE2] text-[10px] font-semibold text-[#3F7635]">
                          {worker.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-text-primary">
                            {worker.name}
                          </p>

                          <p className="mt-0.5 text-[10px] text-text-muted">
                            {hasDebt
                              ? `Kasbon ${formatCurrency(
                                  worker.outstandingBalance,
                                )}`
                              : "Belum ada kasbon"}
                          </p>
                        </div>

                        <ChevronRight
                          size={15}
                          className="shrink-0 text-text-muted"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD DEBT */}
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
