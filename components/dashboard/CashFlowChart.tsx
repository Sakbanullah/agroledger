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

type Period = "daily" | "weekly" | "monthly";

export default function CashFlowChart({
  data = [],
  summary,
}: CashFlowChartProps) {
  const [period, setPeriod] = useState<Period>("daily");

  const formatAmount = (value: number) => {
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

  const totalIncome =
    summary?.income ??
    data.reduce((total, item) => total + item.income, 0);

  const totalExpense =
    summary?.expense ??
    data.reduce((total, item) => total + item.expense, 0);

  const net =
    summary?.net ??
    totalIncome - totalExpense;

  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1,
  );

  return (
    <section className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A918B]">
            Cash Flow
          </p>

          <h2 className="mt-1 text-[16px] font-semibold text-[#17221B]">
            Arus Kas
          </h2>
        </div>

        <div className="flex items-center rounded-[7px] border border-[#E1E4E0] bg-[#FAFAF8] p-0.5">
          {(["daily", "weekly", "monthly"] as Period[]).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`rounded-[5px] px-3 py-1.5 text-[11px] font-medium transition ${
                period === item
                  ? "bg-white text-[#17221B] shadow-sm"
                  : "text-[#7A827C] hover:text-[#17221B]"
              }`}
            >
              {item === "daily"
                ? "Daily"
                : item === "weekly"
                  ? "Weekly"
                  : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#8A918B]">
            Money In
          </p>

          <p className="mt-1 text-[14px] font-semibold text-[#315B42]">
            {formatAmount(totalIncome)}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#8A918B]">
            Money Out
          </p>

          <p className="mt-1 text-[14px] font-semibold text-[#17221B]">
            {formatAmount(totalExpense)}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#8A918B]">
            Net
          </p>

          <p className="mt-1 text-[14px] font-semibold text-[#17221B]">
            {formatAmount(net)}
          </p>
        </div>
      </div>

      <div className="mt-6 h-[220px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[#DDE1DC]">
            <p className="text-xs text-[#8A918B]">
              Belum ada data arus kas
            </p>
          </div>
        ) : (
          <div className="flex h-full items-end gap-2 overflow-x-auto pb-6">
            {data.map((item, index) => {
              const incomeHeight =
                Math.max((item.income / maxValue) * 170, 3);

              const expenseHeight =
                Math.max((item.expense / maxValue) * 170, 3);

              return (
                <div
                  key={`${item.date}-${index}`}
                  className="flex min-w-[28px] flex-1 items-end justify-center gap-1"
                >
                  <div className="flex h-[180px] items-end">
                    <div
                      className="w-[8px] rounded-t-[3px] bg-[#315B42]"
                      style={{
                        height: `${incomeHeight}px`,
                      }}
                      title={`Income: ${item.income.toLocaleString(
                        "id-ID",
                      )}`}
                    />
                  </div>

                  <div className="flex h-[180px] items-end">
                    <div
                      className="w-[8px] rounded-t-[3px] bg-[#D7DAD6]"
                      style={{
                        height: `${expenseHeight}px`,
                      }}
                      title={`Expense: ${item.expense.toLocaleString(
                        "id-ID",
                      )}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#315B42]" />
          <span className="text-[10px] text-[#737B75]">
            Income
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#D7DAD6]" />
          <span className="text-[10px] text-[#737B75]">
            Expense
          </span>
        </div>
      </div>
    </section>
  );
}