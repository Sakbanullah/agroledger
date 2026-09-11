"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import AddDebt from "../add-debt/AddDebt";
import Payment from "../payment/Payment";

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

  const safeOutstanding = Math.max(0, outstandingBalance);

  const totalDebt = transactions
    .filter((transaction) => transaction.type === "DEBT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalPayment = transactions
    .filter((transaction) => transaction.type === "PAYMENT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 size={15} className="animate-spin" />
            Memuat detail worker...
          </div>
        </div>
      </main>
    );
  }

  if (error || !worker) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="rounded-[10px] bg-[#FFF3F1] px-4 py-3 text-center text-[11px] text-[#B5473A]">
            {error || "Worker tidak ditemukan."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-5 inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[10px] font-medium text-text-muted transition hover:bg-[#F1F3EF] hover:text-text-primary"
          >
            <ArrowLeft size={13} />
            Kembali
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E6EFE2] text-[12px] font-semibold text-[#3F7635]">
                {getInitials(worker.name)}
              </div>

              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Worker Account
                </p>

                <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[28px]">
                  {worker.name}
                </h1>

                <p className="mt-1 text-[11px] text-text-secondary">
                  Kelola kasbon dan riwayat transaksi worker.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowPayment(true)}
                disabled={!account || safeOutstanding <= 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-border bg-white px-4 text-[11px] font-medium text-text-secondary transition hover:bg-[#F7F8F5] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <WalletCards size={14} />
                Bayar Kasbon
              </button>

              <button
                type="button"
                onClick={() => setShowAddDebt(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-[11px] font-medium text-white transition hover:bg-[#26352B]"
              >
                <Plus size={14} />
                Tambah Kasbon
              </button>
            </div>
          </div>
        </header>

        {/* ACCOUNT OVERVIEW */}
        <section className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          {/* BALANCE */}
          <div className="rounded-[14px] border border-border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/55">
                  Saldo Kasbon
                </p>

                <p className="mt-3 text-[27px] font-semibold tracking-[-0.04em]">
                  {formatCurrency(safeOutstanding)}
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-medium text-white/75">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      safeOutstanding > 0 ? "bg-[#C88A42]" : "bg-[#7DA871]"
                    }`}
                  />

                  {safeOutstanding > 0 ? "Ada Kasbon" : "Lunas"}
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/10">
                <CircleDollarSign size={17} />
              </div>
            </div>
          </div>

          {/* TOTAL DEBT */}
          <div className="rounded-[14px] border border-border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-text-muted">
                  Total Kasbon
                </p>

                <p className="mt-3 text-[21px] font-semibold tracking-[-0.03em] text-text-primary">
                  {formatCurrency(totalDebt)}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Total kasbon tercatat
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FFF4E8] text-[#A96D2E]">
                <ArrowDownLeft size={16} />
              </div>
            </div>
          </div>

          {/* TOTAL PAYMENT */}
          <div className="rounded-[14px] border border-border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-text-muted">
                  Total Pembayaran
                </p>

                <p className="mt-3 text-[21px] font-semibold tracking-[-0.03em] text-text-primary">
                  {formatCurrency(totalPayment)}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Total pembayaran tercatat
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6EFE2] text-[#3F7635]">
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>
        </section>

        {/* TRANSACTION HISTORY */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                Transactions
              </p>

              <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
                Riwayat Kasbon
              </h2>
            </div>

            <span className="w-fit rounded-full bg-[#F1F3EF] px-2.5 py-1 text-[9px] font-medium text-text-muted">
              {transactions.length} transaksi
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F3EF] text-text-muted">
                <ReceiptText size={18} />
              </div>

              <p className="text-[12px] font-medium text-text-primary">
                Belum ada transaksi kasbon
              </p>

              <p className="mt-1 text-[10px] text-text-muted">
                Transaksi kasbon worker akan muncul di sini.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-[#FAFAF8] text-left">
                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Tanggal
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Jenis
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Keterangan
                      </th>

                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Jumlah
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((transaction) => {
                      const isDebt = transaction.type === "DEBT";

                      return (
                        <tr
                          key={transaction.id}
                          className="border-b border-border last:border-0 hover:bg-[#FCFCFA]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                              <CalendarDays
                                size={13}
                                className="text-text-muted"
                              />
                              {formatDate(transaction.transactionDate)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {isDebt ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[10px] font-medium text-[#A96D2E]">
                                <ArrowDownLeft size={11} />
                                Kasbon
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3E7] px-2.5 py-1 text-[10px] font-medium text-[#3F7635]">
                                <ArrowUpRight size={11} />
                                Pembayaran
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-[11px] text-text-secondary">
                              {transaction.description || "-"}
                            </p>

                            {transaction.reference && (
                              <p className="mt-0.5 text-[9px] text-text-muted">
                                Ref. {transaction.reference}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <p
                              className={`text-[12px] font-semibold ${
                                isDebt ? "text-[#A96D2E]" : "text-[#3F7635]"
                              }`}
                            >
                              {isDebt ? "+" : "-"}
                              {formatCurrency(Number(transaction.amount))}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">
                {transactions.map((transaction) => {
                  const isDebt = transaction.type === "DEBT";

                  return (
                    <div key={transaction.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                              isDebt
                                ? "bg-[#FFF4E8] text-[#A96D2E]"
                                : "bg-[#EAF3E7] text-[#3F7635]"
                            }`}
                          >
                            {isDebt ? (
                              <ArrowDownLeft size={15} />
                            ) : (
                              <ArrowUpRight size={15} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-text-primary">
                              {isDebt ? "Kasbon" : "Pembayaran"}
                            </p>

                            <p className="mt-0.5 text-[9px] text-text-muted">
                              {formatDate(transaction.transactionDate)}
                            </p>
                          </div>
                        </div>

                        <p
                          className={`shrink-0 text-[12px] font-semibold ${
                            isDebt ? "text-[#A96D2E]" : "text-[#3F7635]"
                          }`}
                        >
                          {isDebt ? "+" : "-"}
                          {formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>

                      <div className="mt-3 rounded-[8px] bg-[#FAFAF8] px-3 py-2.5">
                        <p className="text-[10px] text-text-secondary">
                          {transaction.description || "Tidak ada keterangan"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ADD DEBT */}
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

      {/* PAYMENT */}
      {showPayment && account && safeOutstanding > 0 && (
        <Payment
          workerId={worker.id}
          workerName={worker.name}
          creditAccountId={account.id}
          outstandingBalance={safeOutstanding}
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
