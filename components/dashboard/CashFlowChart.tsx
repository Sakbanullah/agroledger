"use client";

import { useState } from "react";

type CashFlowData = {
  date: string;
  income: number;
  expense: number;
};

type CashFlowSummary = {
  income: number;
  expense: number;
  net: number;
};

type CashFlowChartProps = {
  data?: CashFlowData[];
  summary?: CashFlowSummary;
};

function formatAmount(value: number) {
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)}K`;
  }

  return `Rp${Math.round(value)}`;
}

function formatFullAmount(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CashFlowChart({
  data = [],
  summary = {
    income: 0,
    expense: 0,
    net: 0,
  },
}: CashFlowChartProps) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );

  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1,
  );

  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="border-b border-[#ECEEEB] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
              Cash Flow
            </p>

            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#17221B]">
              Arus Kas
            </h2>

            <p className="mt-1 text-[11px] text-[#8A918B]">
              Pemasukan dan pengeluaran berdasarkan periode
            </p>
          </div>

          <div className="flex items-center rounded-[7px] border border-[#E1E4E0] bg-[#FAFAF8] p-0.5">
            {(["daily", "weekly", "monthly"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`rounded-[5px] px-2.5 py-1.5 text-[10px] font-medium transition ${
                  period === item
                    ? "bg-white text-[#17221B] shadow-sm"
                    : "text-[#8A918B] hover:text-[#59625B]"
                }`}
              >
                {item === "daily"
                  ? "Harian"
                  : item === "weekly"
                    ? "Mingguan"
                    : "Bulanan"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
              Pemasukan
            </p>

            <p className="mt-1 text-[15px] font-semibold text-[#17221B]">
              {formatFullAmount(summary.income)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
              Pengeluaran
            </p>

            <p className="mt-1 text-[15px] font-semibold text-[#17221B]">
              {formatFullAmount(summary.expense)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9AA19B]">
              Net Cash Flow
            </p>

            <p
              className={`mt-1 text-[15px] font-semibold ${
                summary.net >= 0 ? "text-[#17221B]" : "text-[#A33A32]"
              }`}
            >
              {formatFullAmount(summary.net)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {data.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center rounded-[8px] border border-dashed border-[#E1E4E0]">
            <div className="text-center">
              <p className="text-[12px] font-medium text-[#59625B]">
                Belum ada data arus kas
              </p>

              <p className="mt-1 text-[11px] text-[#9AA19B]">
                Transaksi akan muncul di sini setelah tersedia.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="flex h-[220px] items-end gap-2 border-b border-[#E5E7E4] px-1">
                {data.map((item, index) => {
                  const incomeHeight =
                    item.income > 0
                      ? Math.max((item.income / maxValue) * 180, 4)
                      : 0;

                  const expenseHeight =
                    item.expense > 0
                      ? Math.max((item.expense / maxValue) * 180, 4)
                      : 0;

                  return (
                    <div
                      key={`${item.date}-${index}`}
                      className="group flex min-w-[28px] flex-1 items-end justify-center gap-1"
                    >
                      <div className="relative flex items-end">
                        <div
                          title={`Pemasukan: ${formatFullAmount(item.income)}`}
                          className="w-[9px] rounded-t-[3px] bg-[#17221B] transition-opacity group-hover:opacity-80"
                          style={{ height: `${incomeHeight}px` }}
                        />
                      </div>

                      <div className="relative flex items-end">
                        <div
                          title={`Pengeluaran: ${formatFullAmount(item.expense)}`}
                          className="w-[9px] rounded-t-[3px] bg-[#C8CEC9] transition-opacity group-hover:opacity-80"
                          style={{ height: `${expenseHeight}px` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2 px-1">
                {data.map((item, index) => (
                  <div
                    key={`${item.date}-label-${index}`}
                    className="min-w-[28px] flex-1 text-center text-[9px] text-[#9AA19B]"
                  >
                    {new Date(item.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-[#17221B]" />
                  <span className="text-[10px] text-[#7A827C]">
                    Pemasukan
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-[#C8CEC9]" />
                  <span className="text-[10px] text-[#7A827C]">
                    Pengeluaran
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}