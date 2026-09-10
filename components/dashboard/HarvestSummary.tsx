type HarvestSummaryProps = {
  totalValue?: number;
  completion?: number;
  pendingSettlements?: number;
};

export default function HarvestSummary({
  totalValue = 0,
  completion = 0,
  pendingSettlements = 0,
}: HarvestSummaryProps) {
  const formatRupiah = (value: number) => {
    if (value >= 1_000_000_000) {
      return `Rp${(value / 1_000_000_000).toFixed(1)}B`;
    }

    if (value >= 1_000_000) {
      return `Rp${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `Rp${(value / 1_000).toFixed(0)}K`;
    }

    return `Rp${value.toLocaleString("id-ID")}`;
  };

  return (
    <section className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
          This Season
        </p>

        <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
          Harvest Summary
        </h2>
      </div>

      <div className="mt-6">
        <p className="text-xs text-[#6B746D]">
          Total nilai panen
        </p>

        <p className="mt-1 text-[25px] font-semibold tracking-tight text-[#17221B]">
          {formatRupiah(totalValue)}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#6B746D]">
            Settlement completion
          </p>

          <p className="text-xs font-semibold text-[#315B42]">
            {completion}%
          </p>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8EBE7]">
          <div
            className="h-full rounded-full bg-[#315B42] transition-all"
            style={{
              width: `${Math.min(Math.max(completion, 0), 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#ECEEEB] pt-4">
        <span className="text-xs text-[#6B746D]">
          Pending settlement
        </span>

        <span className="rounded-full bg-[#F3EEDF] px-2.5 py-1 text-[10px] font-semibold text-[#8A7040]">
          {pendingSettlements}
        </span>
      </div>
    </section>
  );
}