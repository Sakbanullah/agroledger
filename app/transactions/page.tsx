"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createMoneyTransaction, getMoneyTransactions } from "@/lib/api";

type Transaction = {
  id: number;
  type: "IN" | "OUT";
  category: string;
  amount: number | string;
  transactionDate: string;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdBy: number | null;
  createdAt: string;
};

const categories = [
  "OPERASIONAL",
  "WARUNG",
  "PERTANIAN",
  "TRANSPORTASI",
  "PERAWATAN",
  "LAINNYA",
];

function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    OPERASIONAL: "Operasional",
    WARUNG: "Warung",
    PERTANIAN: "Pertanian",
    TRANSPORTASI: "Transportasi",
    PERAWATAN: "Perawatan",
    LAINNYA: "Lainnya",
  };

  return labels[category] ?? category;
}

function getTransactionTitle(transaction: Transaction) {
  if (transaction.description) {
    return transaction.description;
  }

  const titles: Record<string, string> = {
    OPERASIONAL: "Pengeluaran operasional",
    WARUNG: "Transaksi warung",
    PERTANIAN: "Transaksi pertanian",
    TRANSPORTASI: "Transportasi",
    PERAWATAN: "Perawatan",
    LAINNYA: "Transaksi lainnya",
  };

  return titles[transaction.category] ?? "Transaksi";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [category, setCategory] = useState("PERTANIAN");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const data = await getMoneyTransactions();

      setTransactions(data);
    } catch (error) {
      console.error("Gagal mengambil transaksi:", error);

      setError(
        error instanceof Error ? error.message : "Gagal mengambil transaksi.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const openForm = () => {
    setError("");

    setType("IN");
    setCategory("PERTANIAN");
    setAmount("");
    setDescription("");

    setTransactionDate(new Date().toISOString().split("T")[0]);

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setError("");
  };

  const handleOverlayClick = () => {
    closeForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Jumlah harus lebih besar dari 0.");
      return;
    }

    if (!transactionDate) {
      setError("Tanggal transaksi wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      await createMoneyTransaction({
        type,
        category: category as
          | "OPERASIONAL"
          | "WARUNG"
          | "PERTANIAN"
          | "TRANSPORTASI"
          | "PERAWATAN"
          | "LAINNYA",
        amount: numericAmount,
        transactionDate,
        description: description.trim() || undefined,
      });

      await loadTransactions();

      setShowForm(false);

      setType("IN");
      setCategory("PERTANIAN");
      setAmount("");
      setDescription("");
      setTransactionDate("");
    } catch (error) {
      console.error("Gagal membuat transaksi:", error);

      setError(
        error instanceof Error ? error.message : "Gagal membuat transaksi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "ALL" || transaction.type === typeFilter;

      const matchesSearch =
        !keyword ||
        transaction.description?.toLowerCase().includes(keyword) ||
        transaction.category.toLowerCase().includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [transactions, search, typeFilter]);

  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;

    for (const transaction of transactions) {
      const transactionAmount = Number(transaction.amount);

      if (transaction.type === "IN") {
        moneyIn += transactionAmount;
      }

      if (transaction.type === "OUT") {
        moneyOut += transactionAmount;
      }
    }

    return {
      moneyIn,
      moneyOut,
      balance: moneyIn - moneyOut,
    };
  }, [transactions]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
              Transactions
            </p>

            <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              Transaksi
            </h1>

            <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
              Riwayat seluruh pemasukan dan pengeluaran
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-[12px] font-medium text-white transition hover:bg-[#26362B] sm:w-auto"
          >
            <Plus size={15} strokeWidth={2} />
            Tambah Transaksi
          </button>
        </header>

        {/* =====================================================
            FINANCIAL SUMMARY
        ====================================================== */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Saldo Kas */}
          <div className="rounded-[16px] border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft">
                <Wallet
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Saldo Kas
              </p>
            </div>

            <p className="mt-4 break-words text-[21px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[23px]">
              {formatRupiah(summary.balance)}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Saldo berdasarkan seluruh transaksi
            </p>
          </div>

          {/* Pemasukan */}
          <div className="rounded-[16px] border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-success-soft">
                <ArrowDownLeft
                  size={15}
                  strokeWidth={1.8}
                  className="text-success"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total Pemasukan
              </p>
            </div>

            <p className="mt-4 break-words text-[21px] font-semibold tracking-[-0.03em] text-success sm:text-[23px]">
              {formatRupiah(summary.moneyIn)}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Total pemasukan yang tercatat
            </p>
          </div>

          {/* Pengeluaran */}
          <div className="rounded-[16px] border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-soft">
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total Pengeluaran
              </p>
            </div>

            <p className="mt-4 break-words text-[21px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[23px]">
              {formatRupiah(summary.moneyOut)}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Total pengeluaran yang tercatat
            </p>
          </div>
        </section>

        {/* =====================================================
            TRANSACTION LIST
        ====================================================== */}
        <section className="mt-5 overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:mt-6">
          {/* Toolbar */}
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-text-primary sm:text-[14px]">
                  Semua Transaksi
                </h2>

                <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
                  Seluruh pergerakan uang yang tercatat
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:flex xl:flex-row">
                {/* Search */}
                <div className="relative sm:min-w-0">
                  <Search
                    size={14}
                    strokeWidth={1.8}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari transaksi..."
                    className="h-9 w-full rounded-[9px] border border-border bg-white pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A] sm:w-full xl:w-[220px]"
                  />
                </div>

                {/* Type filter */}
                <button
                  type="button"
                  onClick={() =>
                    setTypeFilter((current) =>
                      current === "ALL"
                        ? "IN"
                        : current === "IN"
                          ? "OUT"
                          : "ALL",
                    )
                  }
                  className="flex h-9 w-full items-center justify-between gap-5 rounded-[9px] border border-border bg-white px-3 text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted sm:w-auto sm:min-w-[130px]"
                >
                  <span>
                    {typeFilter === "ALL"
                      ? "Semua"
                      : typeFilter === "IN"
                        ? "Pemasukan"
                        : "Pengeluaran"}
                  </span>

                  <ChevronDown size={13} strokeWidth={1.8} />
                </button>

                {/* Date */}
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between gap-2.5 rounded-[9px] border border-border bg-white px-3 text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted sm:w-auto"
                >
                  <CalendarDays size={13} strokeWidth={1.8} />

                  <span>Bulan ini</span>

                  <ChevronDown size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5 sm:text-[10px]">
                    Tanggal
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5 sm:text-[10px]">
                    Transaksi
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5 sm:text-[10px]">
                    Kategori
                  </th>

                  <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted sm:px-5 sm:text-[10px]">
                    Jumlah
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <p className="text-[11px] text-text-secondary">
                        Memuat transaksi...
                      </p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-soft">
                        <CircleDollarSign
                          size={18}
                          strokeWidth={1.7}
                          className="text-text-muted"
                        />
                      </div>

                      <p className="mt-3 text-[12px] font-medium text-text-primary">
                        Belum ada transaksi
                      </p>

                      <p className="mx-auto mt-1 max-w-[280px] text-[10px] leading-5 text-text-secondary">
                        Coba ubah pencarian atau tambahkan transaksi baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-surface-muted/60"
                    >
                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-4 text-[10px] text-text-secondary sm:px-5 sm:text-[11px]">
                        {formatDate(transaction.transactionDate)}
                      </td>

                      {/* Transaction */}
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                              transaction.type === "IN"
                                ? "bg-success-soft text-success"
                                : "bg-surface-soft text-text-secondary"
                            }`}
                          >
                            {transaction.type === "IN" ? (
                              <ArrowDownLeft size={15} strokeWidth={1.8} />
                            ) : (
                              <ArrowUpRight size={15} strokeWidth={1.8} />
                            )}
                          </div>

                          <div className="min-w-0 max-w-[260px]">
                            <p className="truncate text-[11px] font-semibold text-text-primary sm:text-[12px]">
                              {getTransactionTitle(transaction)}
                            </p>

                            <p className="mt-0.5 truncate text-[9px] text-text-muted sm:text-[10px]">
                              {transaction.description ??
                                "Tidak ada keterangan"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4 sm:px-5">
                        <span className="inline-flex whitespace-nowrap rounded-full bg-surface-soft px-2.5 py-1 text-[9px] font-medium text-text-secondary sm:text-[10px]">
                          {getCategoryLabel(transaction.category)}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={`whitespace-nowrap px-4 py-4 text-right text-[11px] font-semibold sm:px-5 sm:text-[12px] ${
                          transaction.type === "IN"
                            ? "text-success"
                            : "text-text-primary"
                        }`}
                      >
                        {transaction.type === "IN" ? "+" : "-"}

                        {formatRupiah(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <p className="text-[9px] text-text-muted sm:text-[10px]">
              Menampilkan{" "}
              <span className="font-medium text-text-secondary">
                {filteredTransactions.length}
              </span>{" "}
              transaksi
            </p>
          </div>
        </section>
      </div>

      {/* =======================================================
          ADD TRANSACTION MODAL
      ======================================================== */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17221B]/20 p-3 backdrop-blur-[6px] sm:p-5"
          onMouseDown={handleOverlayClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-transaction-title"
            className="flex max-h-[calc(100vh-24px)] w-full max-w-[500px] flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_24px_80px_rgba(23,34,27,0.18)] sm:max-h-[calc(100vh-40px)] sm:rounded-[18px]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-text-muted sm:text-[9px]">
                  Money Movement
                </p>

                <h2
                  id="add-transaction-title"
                  className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary sm:text-[16px]"
                >
                  Tambah Transaksi
                </h2>

                <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
                  Catat pergerakan kas keluarga
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Tutup"
                className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-text-muted transition hover:bg-surface-soft hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8F5] p-3 sm:p-5">
                <div className="rounded-[14px] border border-border bg-white sm:rounded-[16px]">
                  <div className="space-y-5 p-4 sm:space-y-6 sm:p-5">
                    {/* Type */}
                    <div>
                      <label className="mb-2.5 block text-[10px] font-medium text-text-primary sm:text-[11px]">
                        Jenis Transaksi
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setType("IN")}
                          className={`flex h-10 items-center justify-center rounded-[9px] border text-[11px] font-medium transition sm:h-11 sm:text-[12px] ${
                            type === "IN"
                              ? "border-[#5F9F4A] bg-success-soft text-[#3F7632]"
                              : "border-border bg-white text-text-secondary hover:bg-surface-muted"
                          }`}
                        >
                          Pemasukan
                        </button>

                        <button
                          type="button"
                          onClick={() => setType("OUT")}
                          className={`flex h-10 items-center justify-center rounded-[9px] border text-[11px] font-medium transition sm:h-11 sm:text-[12px] ${
                            type === "OUT"
                              ? "border-[#5F9F4A] bg-success-soft text-[#3F7632]"
                              : "border-border bg-white text-text-secondary hover:bg-surface-muted"
                          }`}
                        >
                          Pengeluaran
                        </button>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label
                        htmlFor="category"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Kategori
                      </label>

                      <select
                        id="category"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[11px] text-text-primary outline-none transition focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[12px]"
                      >
                        {categories.map((categoryItem) => (
                          <option key={categoryItem} value={categoryItem}>
                            {getCategoryLabel(categoryItem)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label
                        htmlFor="amount"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Jumlah
                      </label>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-muted sm:text-[11px]">
                          Rp
                        </span>

                        <input
                          id="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="0"
                          className="h-10 w-full rounded-[9px] border border-border bg-white pl-9 pr-3 text-[12px] font-medium text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[13px]"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        htmlFor="date"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Tanggal
                      </label>

                      <div className="relative">
                        <input
                          id="date"
                          type="date"
                          value={transactionDate}
                          onChange={(event) =>
                            setTransactionDate(event.target.value)
                          }
                          className="h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[11px] text-text-primary outline-none transition focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[12px]"
                        />

                        <CalendarDays
                          size={15}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="description"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Keterangan
                      </label>

                      <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Contoh: Penjualan karet"
                        className="min-h-[100px] w-full resize-none rounded-[9px] border border-border bg-white px-3 py-2.5 text-[11px] leading-5 text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:min-h-[110px] sm:text-[12px]"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="rounded-[10px] border border-danger/20 bg-danger-soft px-3.5 py-3 text-[10px] leading-5 text-danger sm:text-[11px]">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-border bg-white p-3 sm:p-4 sm:px-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="h-10 rounded-[10px] border border-border bg-white text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 sm:text-[12px]"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-[10px] bg-[#17221B] text-[11px] font-medium text-white transition hover:bg-[#26362B] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[12px]"
                  >
                    {saving ? "Menyimpan..." : "Simpan Transaksi"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
