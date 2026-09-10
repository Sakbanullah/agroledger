type CashPositionProps = {
  cashBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
};

export default function CashPosition({
  cashBalance = 0,
  totalIncome = 0,
  totalExpense = 0,
}: CashPositionProps) {
  const formatRupiah = (value: number) => {
    return `Rp${value.toLocaleString("id-ID")}`;
  };

  const cards = [
    {
      label: "Saldo Kas",
      value: cashBalance,
      className: "text-[#17221B]",
    },
    {
      label: "Total Pemasukan",
      value: totalIncome,
      className: "text-[#315B42]",
    },
    {
      label: "Total Pengeluaran",
      value: totalExpense,
      className: "text-[#17221B]",
    },
  ];

  return (
    <section>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
          Financial Overview
        </p>

        <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
          Cash Position
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[10px] border border-[#E3E6E1] bg-white p-5"
          >
            <p className="text-[11px] font-medium text-[#7A827C]">
              {card.label}
            </p>

            <p
              className={`mt-2 text-[23px] font-semibold tracking-tight ${card.className}`}
            >
              {formatRupiah(card.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}