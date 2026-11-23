"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { ExplorerTransaction } from "@/lib/api";

import { categoryLabel, formatDateLabel, formatRupiah } from "./format";

export function RoleBadge({ role }: { role: "OWN" | "PASSTHROUGH" }) {
  if (role === "OWN") return null;

  return (
    <span
      title="Uang milik pemilik farm lain, bukan pemasukan Anda"
      className="inline-flex whitespace-nowrap rounded-full bg-warning-soft px-2 py-0.5 text-[9px] font-medium text-warning"
    >
      Dana saudara
    </span>
  );
}

export function TransactionRow({ transaction }: { transaction: ExplorerTransaction }) {
  const income = transaction.type === "IN";
  const passthrough = transaction.role === "PASSTHROUGH";

  return (
    <Link
      href={`/financial-explorer/transactions/${transaction.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-muted sm:px-5"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
          income ? "bg-success-soft text-success" : "bg-surface-soft text-text-secondary"
        } ${passthrough ? "opacity-60" : ""}`}
      >
        {income ? <ArrowDownLeft size={15} strokeWidth={1.8} /> : <ArrowUpRight size={15} strokeWidth={1.8} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[12px] font-medium text-text-primary">
            {transaction.description || categoryLabel(transaction.category)}
          </p>
          <RoleBadge role={transaction.role} />
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
          <span>{categoryLabel(transaction.category)}</span>
          <span>•</span>
          <span>{formatDateLabel(transaction.transactionDate.slice(0, 10))}</span>
          {transaction.farm && (
            <>
              <span>•</span>
              <span className="truncate">{transaction.farm.name}</span>
            </>
          )}
        </div>
      </div>

      <p
        className={`shrink-0 text-[12px] font-semibold ${
          passthrough ? "text-text-muted" : income ? "text-success" : "text-text-primary"
        }`}
      >
        {income ? "+" : "-"}
        {formatRupiah(transaction.amount)}
      </p>
    </Link>
  );
}

export function TransactionList({
  transactions,
  loading,
  emptyMessage = "Belum ada transaksi pada periode ini.",
}: {
  transactions: ExplorerTransaction[];
  loading: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-[11px] text-text-muted">
        Memuat transaksi...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center px-5 text-center">
        <p className="text-[11px] text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
