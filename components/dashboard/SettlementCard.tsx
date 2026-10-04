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

function formatAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWeight(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SettlementCard({ settlement }: SettlementCardProps) {
  if (!settlement) {
    return (
      <section className="rounded-[10px] border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Settlement
          </p>

          <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
            Latest Settlement
          </h2>
        </div>

        <div className="flex min-h-[220px] items-center justify-center p-5">
          <div className="text-center">
            <p className="text-[12px] font-medium text-text-secondary">
              Belum ada settlement
            </p>

            <p className="mt-1 text-[11px] text-text-muted">
              Settlement terbaru akan muncul di sini.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[10px] border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Settlement
            </p>

            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
              Latest Settlement
            </h2>
          </div>

          <span className="rounded-[5px] bg-surface-soft px-2 py-1 text-[10px] font-semibold text-text-secondary">
            #{settlement.id}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-text-primary">
              {settlement.farmName}
            </p>

            <p className="mt-1 text-[11px] text-text-muted">
              {settlement.commodity}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Berat
            </p>

            <p className="mt-1 text-[13px] font-semibold text-text-primary">
              {formatWeight(settlement.weightKg)} kg
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[8px] bg-surface-muted p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Harga / Kg
            </p>

            <p className="mt-1 text-[13px] font-semibold text-text-primary">
              {formatAmount(settlement.pricePerKg)}
            </p>
          </div>

          <div className="rounded-[8px] bg-surface-muted p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Gross
            </p>

            <p className="mt-1 text-[13px] font-semibold text-text-primary">
              {formatAmount(settlement.gross)}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Management Fee</span>

            <span className="font-medium text-text-secondary">
              {formatAmount(settlement.managementFee)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-primary">
              Net Settlement
            </span>

            <span className="text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
              {formatAmount(settlement.net)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
