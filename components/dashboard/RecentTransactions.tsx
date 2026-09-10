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

export default function RecentTransactions({
  transactions = [],
}: RecentTransactionsProps) {
  const formatRupiah = (value: number) => {
    return `Rp${value.toLocaleString("id-ID")}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTitle = (category: string) => {
    switch (category) {
      case "HARVEST_SALE":
        return "Harvest sale";

      case "SETTLEMENT":
        return "Settlement";

      case "OPERATIONAL_EXPENSE":
        return "Operational expense";

      case "OPENING_BALANCE":
        return "Opening balance";

      default:
        return category.replaceAll("_", " ");
    }
  };

  if (transactions.length === 0) {
    return (
      <section className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
            Financial Activity
          </p>

          <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
            Recent Transactions
          </h2>
        </div>

        <div className="mt-5 flex min-h-[160px] items-center justify-center rounded-[8px] border border-dashed border-[#DDE1DC]">
          <p className="text-xs text-[#8A918B]">
            Belum ada transaksi
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
            Financial Activity
          </p>

          <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
            Recent Transactions
          </h2>
        </div>

        <button className="text-[11px] font-semibold text-[#59625B] hover:text-[#17221B]">
          View all →
        </button>
      </div>

      <div className="mt-5 divide-y divide-[#ECEEEB]">
        {transactions.map((transaction) => {
          const amount = Number(transaction.amount);

          const isIncome =
            transaction.type === "IN" ||
            transaction.category === "HARVEST_SALE";

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#17221B]">
                  {getTitle(transaction.category)}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-[#8A918B]">
                    {formatDate(transaction.transactionDate)}
                  </span>

                  {transaction.description && (
                    <>
                      <span className="text-[#C7CBC7]">•</span>

                      <span className="truncate text-[10px] text-[#8A918B]">
                        {transaction.description}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <p
                className={`shrink-0 text-[12px] font-semibold ${
                  isIncome
                    ? "text-[#315B42]"
                    : "text-[#17221B]"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatRupiah(Math.abs(amount))}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}