type HarvestSummaryProps = {
  totalValue?: number;
  completion?: number;
  pendingSettlements?: number;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HarvestSummary({
  totalValue = 0,
  completion = 0,
  pendingSettlements = 0,
}: HarvestSummaryProps) {
  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="border-b border-[#ECEEEB] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
          Harvest
        </p>

        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#17221B]">
              Ringkasan Panen
            </h2>

            <p className="mt-1 text-[11px] text-[#8A918B]">
              Aktivitas panen dan settlement
            </p>
          </div>

          <span className="rounded-[5px] bg-[#F2F4F1] px-2 py-1 text-[10px] font-semibold text-[#59625B]">
            Periode ini
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
              Total Nilai Panen
            </p>

            <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.03em] text-[#17221B]">
              {formatAmount(totalValue)}
            </p>

            <p className="mt-1 text-[10px] text-[#8A918B]">
              Nilai hasil panen tercatat
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
                Settlement
              </p>

              <span className="text-[11px] font-semibold text-[#17221B]">
                {completion}%
              </span>
            </div>

            <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[#ECEEEB]">
              <div
                className="h-full rounded-full bg-[#17221B] transition-all"
                style={{
                  width: `${Math.min(Math.max(completion, 0), 100)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[10px] text-[#8A918B]">
              Progress settlement panen
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#ECEEEB] pt-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
              Pending Settlement
            </p>

            <p className="mt-1 text-[15px] font-semibold text-[#17221B]">
              {pendingSettlements}
            </p>
          </div>

          <div className="rounded-[6px] border border-[#E5E7E4] px-2.5 py-1.5 text-[10px] font-medium text-[#59625B]">
            {pendingSettlements === 0
              ? "Semua selesai"
              : "Perlu ditindaklanjuti"}
          </div>
        </div>
      </div>
    </section>
  );
}
