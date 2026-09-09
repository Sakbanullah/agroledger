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
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createMoneyTransaction,
  getMoneyTransactions,
} from "@/lib/api";

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
    OPERASIONAL: "Operational expense",
    WARUNG: "Warung transaction",
    PERTANIAN: "Agriculture transaction",
    TRANSPORTASI: "Transportation",
    PERAWATAN: "Maintenance",
    LAINNYA: "Other transaction",
  };

  return titles[transaction.category] ?? "Transaction";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [category, setCategory] = useState("PERTANIAN");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] =
    useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "IN" | "OUT"
  >("ALL");

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const data = await getMoneyTransactions();

      setTransactions(data);
    } catch (error) {
      console.error(
        "Gagal mengambil transaksi:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil transaksi.",
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

    setTransactionDate(
      new Date().toISOString().split("T")[0],
    );

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Amount harus lebih besar dari 0.");
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
        description:
          description.trim() || undefined,
      });

      await loadTransactions();

      setShowForm(false);

      setType("IN");
      setCategory("PERTANIAN");
      setAmount("");
      setDescription("");
      setTransactionDate("");
    } catch (error) {
      console.error(
        "Gagal membuat transaksi:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal membuat transaksi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "ALL" ||
        transaction.type === typeFilter;

      const matchesSearch =
        !keyword ||
        transaction.description
          ?.toLowerCase()
          .includes(keyword) ||
        transaction.category
          .toLowerCase()
          .includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [transactions, search, typeFilter]);

  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === "IN") {
        moneyIn += amount;
      }

      if (transaction.type === "OUT") {
        moneyOut += amount;
      }
    }

    return {
      moneyIn,
      moneyOut,
      balance: moneyIn - moneyOut,
    };
  }, [transactions]);

  return (
    <main className="min-h-screen bg-[#F7F7F2] px-5 pb-10 pt-6 lg:px-7">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#7A827C]">
              Family finance
            </p>

            <h1 className="text-[22px] font-semibold tracking-tight text-[#17221B]">
              Transactions
            </h1>

            <p className="mt-1 text-[13px] text-[#6B746D]">
              Track every movement of family cash.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[7px] bg-[#315B42] px-4 text-[12px] font-medium text-white transition hover:bg-[#284B36]"
          >
            <Plus size={15} strokeWidth={2} />
            New transaction
          </button>
        </div>

        {/* Financial Summary */}
        <div className="mt-7 grid grid-cols-1 overflow-hidden rounded-[10px] border border-[#E1E4DF] bg-white sm:grid-cols-3">
          <div className="border-b border-[#E7E9E5] px-5 py-5 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-2">
              <Wallet
                size={15}
                className="text-[#68716A]"
              />

              <p className="text-[11px] font-medium uppercase tracking-wide text-[#858D87]">
                Cash balance
              </p>
            </div>

            <p className="mt-3 text-[24px] font-semibold tracking-tight text-[#17221B]">
              {formatRupiah(summary.balance)}
            </p>

            <p className="mt-1 text-[11px] text-[#858D87]">
              Current family cash
            </p>
          </div>

          <div className="border-b border-[#E7E9E5] px-5 py-5 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-2">
              <ArrowDownLeft
                size={15}
                className="text-[#315B42]"
              />

              <p className="text-[11px] font-medium uppercase tracking-wide text-[#858D87]">
                Money in
              </p>
            </div>

            <p className="mt-3 text-[24px] font-semibold tracking-tight text-[#315B42]">
              {formatRupiah(summary.moneyIn)}
            </p>

            <p className="mt-1 text-[11px] text-[#858D87]">
              Total recorded income
            </p>
          </div>

          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <ArrowUpRight
                size={15}
                className="text-[#68716A]"
              />

              <p className="text-[11px] font-medium uppercase tracking-wide text-[#858D87]">
                Money out
              </p>
            </div>

            <p className="mt-3 text-[24px] font-semibold tracking-tight text-[#17221B]">
              {formatRupiah(summary.moneyOut)}
            </p>

            <p className="mt-1 text-[11px] text-[#858D87]">
              Total recorded expenses
            </p>
          </div>
        </div>

        {/* Transactions */}
        <section className="mt-6 overflow-hidden rounded-[10px] border border-[#E1E4DF] bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-[#E7E9E5] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#17221B]">
                All transactions
              </h2>

              <p className="mt-0.5 text-[11px] text-[#858D87]">
                Every recorded family cash movement
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Search */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A918B]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search transactions..."
                  className="h-8 w-full rounded-[7px] border border-[#E1E4DF] bg-white pl-9 pr-3 text-[11px] text-[#17221B] outline-none placeholder:text-[#9AA19C] focus:border-[#315B42] sm:w-[210px]"
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
                className="flex h-8 items-center justify-between gap-5 rounded-[7px] border border-[#E1E4DF] px-3 text-[11px] font-medium text-[#5F6861]"
              >
                {typeFilter === "ALL"
                  ? "All types"
                  : typeFilter === "IN"
                    ? "Income"
                    : "Expense"}

                <ChevronDown size={13} />
              </button>

              {/* Date filter */}
              <button
                type="button"
                className="flex h-8 items-center justify-between gap-3 rounded-[7px] border border-[#E1E4DF] px-3 text-[11px] font-medium text-[#5F6861]"
              >
                <CalendarDays size={13} />
                This month
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[#E7E9E5] bg-[#FAFAF7]">
                  <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#858D87]">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#858D87]">
                    Description
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#858D87]">
                    Category
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wide text-[#858D87]">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EEF0EC]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-[11px] text-[#858D87]"
                    >
                      Loading transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center"
                    >
                      <p className="text-[12px] font-medium text-[#68716A]">
                        No transactions found
                      </p>

                      <p className="mt-1 text-[10px] text-[#8A918B]">
                        Try another search or create a new
                        transaction.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                        className="transition hover:bg-[#FBFCF9]"
                      >
                        <td className="px-5 py-4 text-[11px] text-[#6B746D]">
                          {formatDate(
                            transaction.transactionDate,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F0] text-[#68716A]">
                              <CircleDollarSign
                                size={15}
                                strokeWidth={1.8}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-[#17221B]">
                                {getTransactionTitle(
                                  transaction,
                                )}
                              </p>

                              <p className="mt-0.5 text-[10px] text-[#8A918B]">
                                {transaction.description ??
                                  "No description"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-[#F1F4F0] px-2.5 py-1 text-[10px] font-medium text-[#526058]">
                            {getCategoryLabel(
                              transaction.category,
                            )}
                          </span>
                        </td>

                        <td
                          className={`px-5 py-4 text-right text-[12px] font-semibold ${
                            transaction.type === "IN"
                              ? "text-[#315B42]"
                              : "text-[#17221B]"
                          }`}
                        >
                          {transaction.type === "IN"
                            ? "+"
                            : "-"}
                          {formatRupiah(
                            transaction.amount,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E7E9E5] px-5 py-3">
            <p className="text-[10px] text-[#858D87]">
              Showing {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1
                ? "transaction"
                : "transactions"}
            </p>

            <button
              type="button"
              className="text-[11px] font-medium text-[#315B42]"
            >
              View all
            </button>
          </div>
        </section>
      </div>

      {/* New Transaction Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#17221B]/20">
          <div className="flex h-full w-full max-w-[430px] flex-col border-l border-[#E1E4DF] bg-[#F7F7F2] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E1E4DF] bg-white px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#17221B]">
                  New transaction
                </h2>

                <p className="mt-0.5 text-[11px] text-[#858D87]">
                  Record a family cash movement
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-[18px] leading-none text-[#7A827C] hover:text-[#17221B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 overflow-y-auto p-5">
                <div className="rounded-[10px] border border-[#E1E4DF] bg-white">
                  <div className="border-b border-[#E7E9E5] px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#858D87]">
                      Money movement
                    </p>
                  </div>

                  <div className="space-y-5 p-4">
                    {/* Type */}
                    <div>
                      <label className="mb-2 block text-[11px] font-medium text-[#17221B]">
                        Type
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setType("IN")}
                          className={`rounded-[7px] border px-3 py-2.5 text-[12px] font-medium ${
                            type === "IN"
                              ? "border-[#315B42] bg-[#F0F5F1] text-[#315B42]"
                              : "border-[#E1E4DF] text-[#68716A]"
                          }`}
                        >
                          Income
                        </button>

                        <button
                          type="button"
                          onClick={() => setType("OUT")}
                          className={`rounded-[7px] border px-3 py-2.5 text-[12px] font-medium ${
                            type === "OUT"
                              ? "border-[#315B42] bg-[#F0F5F1] text-[#315B42]"
                              : "border-[#E1E4DF] text-[#68716A]"
                          }`}
                        >
                          Expense
                        </button>
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label
                        htmlFor="category"
                        className="mb-2 block text-[11px] font-medium text-[#17221B]"
                      >
                        Category
                      </label>

                      <select
                        id="category"
                        value={category}
                        onChange={(event) =>
                          setCategory(event.target.value)
                        }
                        className="h-9 w-full rounded-[7px] border border-[#E1E4DF] bg-white px-3 text-[12px] text-[#17221B] outline-none focus:border-[#315B42]"
                      >
                        {categories.map(
                          (categoryItem) => (
                            <option
                              key={categoryItem}
                              value={categoryItem}
                            >
                              {getCategoryLabel(
                                categoryItem,
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label
                        htmlFor="amount"
                        className="mb-2 block text-[11px] font-medium text-[#17221B]"
                      >
                        Amount
                      </label>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#858D87]">
                          Rp
                        </span>

                        <input
                          id="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(event) =>
                            setAmount(event.target.value)
                          }
                          placeholder="0"
                          className="h-10 w-full rounded-[7px] border border-[#E1E4DF] bg-white pl-9 pr-3 text-[13px] font-medium text-[#17221B] outline-none focus:border-[#315B42]"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        htmlFor="date"
                        className="mb-2 block text-[11px] font-medium text-[#17221B]"
                      >
                        Date
                      </label>

                      <input
                        id="date"
                        type="date"
                        value={transactionDate}
                        onChange={(event) =>
                          setTransactionDate(
                            event.target.value,
                          )
                        }
                        className="h-9 w-full rounded-[7px] border border-[#E1E4DF] bg-white px-3 text-[12px] text-[#17221B] outline-none focus:border-[#315B42]"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="description"
                        className="mb-2 block text-[11px] font-medium text-[#17221B]"
                      >
                        Description
                      </label>

                      <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(event) =>
                          setDescription(
                            event.target.value,
                          )
                        }
                        placeholder="Example: Penjualan karet"
                        className="w-full resize-none rounded-[7px] border border-[#E1E4DF] bg-white px-3 py-2.5 text-[12px] text-[#17221B] outline-none placeholder:text-[#9AA19C] focus:border-[#315B42]"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="rounded-[7px] border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E1E4DF] bg-white p-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="h-9 flex-1 rounded-[7px] border border-[#E1E4DF] text-[12px] font-medium text-[#68716A] hover:bg-[#F7F7F2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-9 flex-1 rounded-[7px] bg-[#315B42] text-[12px] font-medium text-white hover:bg-[#284B36] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : "Save transaction"}
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