import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Transaction = {
  id: number;
  type: string;
  category: string;
  amount: number | string;
  description?: string | null;
  transactionDate: string;
};

type RecentTransactionsProps = {
  transactions?: Transaction[];
};

function formatAmount(value: number | string) {
  const amount = Number(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    HARVEST_SALE: "Penjualan Panen",
    SETTLEMENT: "Settlement",
    OPERATIONAL_EXPENSE: "Operasional",
    OPENING_BALANCE: "Saldo Awal",
  };

  return labels[category] ?? category.replaceAll("_", " ");
}

function isIncome(transaction: Transaction) {
  return transaction.type === "IN";
}

export default function RecentTransactions({
  transactions = [],
}: RecentTransactionsProps) {
  return (
    <section className="rounded-[10px] border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Activity
          </p>

          <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
            Recent Transactions
          </h2>
        </div>

        <span className="text-[10px] font-medium text-text-muted">
          {transactions.length} transaksi
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center px-5">
          <div className="text-center">
            <p className="text-[12px] font-medium text-text-secondary">
              Belum ada transaksi
            </p>

            <p className="mt-1 text-[11px] text-text-muted">
              Transaksi terbaru akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#ECEEEB]">
          {transactions.slice(0, 6).map((transaction) => {
            const income = isIncome(transaction);

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-muted"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ${
                    income ? "bg-surface-soft" : "bg-surface-soft"
                  }`}
                >
                  {income ? (
                    <ArrowDownLeft size={14} className="text-text-primary" />
                  ) : (
                    <ArrowUpRight size={14} className="text-text-secondary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-text-primary">
                    {transaction.description ||
                      getCategoryLabel(transaction.category)}
                  </p>

                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-[10px] text-text-muted">
                      {getCategoryLabel(transaction.category)}
                    </span>

                    <span className="text-[9px] text-[#C2C6C2]">•</span>

                    <span className="shrink-0 text-[10px] text-text-muted">
                      {formatDate(transaction.transactionDate)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-[12px] font-semibold ${
                      income ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {income ? "+" : "-"}
                    {formatAmount(transaction.amount)}
                  </p>

                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.06em] text-text-muted">
                    {income ? "IN" : "OUT"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
