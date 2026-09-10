type CashPositionProps = {
  cashBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CashPosition({
  cashBalance = 0,
  totalIncome = 0,
  totalExpense = 0,
}: CashPositionProps) {
  const cards = [
    {
      label: "Saldo Kas",
      value: cashBalance,
      description: "Posisi kas saat ini",
      featured: true,
    },
    {
      label: "Total Pemasukan",
      value: totalIncome,
      description: "Pemasukan periode ini",
      featured: false,
    },
    {
      label: "Total Pengeluaran",
      value: totalExpense,
      description: "Pengeluaran periode ini",
      featured: false,
    },
  ];

  return (
    <section>
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
          Financial Overview
        </p>
        <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#17221B]">
          Posisi Keuangan
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-[10px] border p-5 transition ${
              card.featured
                ? "border-[#17221B] bg-[#17221B] text-white"
                : "border-[#E5E7E4] bg-white text-[#17221B] hover:border-[#D6DAD5]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p
                className={`text-[11px] font-medium ${
                  card.featured ? "text-[#B8C0BA]" : "text-[#8A918B]"
                }`}
              >
                {card.label}
              </p>

              <span
                className={`h-2 w-2 rounded-full ${
                  card.featured ? "bg-white" : "bg-[#7C887F]"
                }`}
              />
            </div>

            <p
              className={`mt-3 text-[23px] font-semibold tracking-[-0.035em] ${
                card.featured ? "text-white" : "text-[#17221B]"
              }`}
            >
              {formatAmount(card.value)}
            </p>

            <p
              className={`mt-1 text-[11px] ${
                card.featured ? "text-[#AEB8B1]" : "text-[#8A918B]"
              }`}
            >
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}