type SettlementCardProps = {
  settlement?: {
    id: string;
    farmName: string;
    commodity: string;
    weightKg: number;
    pricePerKg: number;
    gross: number;
    managementFee: number;
    net: number;
  };
};

export default function SettlementCard({
  settlement,
}: SettlementCardProps) {
  const formatRupiah = (value: number) => {
    return `Rp${value.toLocaleString("id-ID")}`;
  };

  const formatWeight = (value: number) => {
    return `${value.toLocaleString("id-ID")} kg`;
  };

  const data = settlement ?? {
    id: "0248",
    farmName: "Slamet Farm",
    commodity: "Palm Oil",
    weightKg: 1842,
    pricePerKg: 18000,
    gross: 33156000,
    managementFee: 1657800,
    net: 31498200,
  };

  return (
    <section className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
            Latest Settlement
          </p>

          <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
            Settlement #{data.id}
          </h2>
        </div>

        <span className="rounded-full bg-[#EAF1EB] px-2.5 py-1 text-[10px] font-semibold text-[#315B42]">
          Completed
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-semibold text-[#17221B]">
          {data.farmName}
        </p>

        <p className="mt-1 text-[11px] text-[#7A827C]">
          {data.commodity}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8A918B]">
            Weight
          </p>

          <p className="mt-1 text-[13px] font-semibold text-[#17221B]">
            {formatWeight(data.weightKg)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8A918B]">
            Price / kg
          </p>

          <p className="mt-1 text-[13px] font-semibold text-[#17221B]">
            {formatRupiah(data.pricePerKg)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8A918B]">
            Gross
          </p>

          <p className="mt-1 text-[13px] font-semibold text-[#17221B]">
            {formatRupiah(data.gross)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8A918B]">
            Management fee
          </p>

          <p className="mt-1 text-[13px] font-semibold text-[#17221B]">
            {formatRupiah(data.managementFee)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-[#ECEEEB] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8A918B]">
            Net settlement
          </p>

          <p className="mt-1 text-[20px] font-semibold tracking-tight text-[#315B42]">
            {formatRupiah(data.net)}
          </p>
        </div>

        <button className="text-[11px] font-semibold text-[#59625B] hover:text-[#17221B]">
          View details →
        </button>
      </div>
    </section>
  );
}