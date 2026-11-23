"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ExplorerSeriesPoint } from "@/lib/api";

import { formatDateLabel, formatRupiah, formatShort } from "./format";

type CashFlowChartProps = {
  data: ExplorerSeriesPoint[];
  loading?: boolean;
};

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 12, bottom: 28, left: 56 };

/**
 * Interactive income/expense line chart. Clicking a point (or a weekday column)
 * opens that date in the Date Explorer.
 */
export default function CashFlowChart({ data, loading }: CashFlowChartProps) {
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);

  const income = data.map((item) => item.income ?? 0);
  const expense = data.map((item) => item.expense ?? 0);
  const max = Math.max(...income, ...expense, 1);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) =>
    PADDING.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;

  const line = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join(" ");

  const openDate = (index: number) => {
    const point = data[index];
    if (point) router.push(`/financial-explorer/date/${point.date}`);
  };

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-[16px] border border-border bg-surface text-[11px] text-text-muted">
        Memuat grafik...
      </div>
    );
  }

  if (data.length === 0 || data.every((item) => !item.income && !item.expense)) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-[16px] border border-dashed border-border bg-surface">
        <div className="text-center">
          <p className="text-[12px] font-medium text-text-secondary">Belum ada arus kas</p>
          <p className="mt-1 text-[11px] text-text-muted">
            Belum ada pemasukan atau pengeluaran pada periode ini.
          </p>
        </div>
      </div>
    );
  }

  const labelStep = Math.max(1, Math.ceil(data.length / 8));
  const activePoint = active === null ? null : data[active];

  return (
    <section className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-text-primary">Arus Kas Harian</h2>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="h-[3px] w-4 rounded-full bg-success" /> Pemasukan
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="h-[3px] w-4 rounded-full bg-danger" /> Pengeluaran
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label="Grafik pemasukan dan pengeluaran harian"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = max * ratio;
              const lineY = y(value);
              return (
                <g key={ratio}>
                  <line
                    x1={PADDING.left}
                    x2={WIDTH - PADDING.right}
                    y1={lineY}
                    y2={lineY}
                    stroke="var(--border)"
                    strokeDasharray={ratio === 0 ? undefined : "3 4"}
                  />
                  <text x={PADDING.left - 8} y={lineY + 3} textAnchor="end" className="fill-[var(--text-muted)] text-[9px]">
                    {formatShort(value)}
                  </text>
                </g>
              );
            })}

            <path d={line(income)} fill="none" stroke="var(--success)" strokeWidth={2} />
            <path d={line(expense)} fill="none" stroke="var(--danger)" strokeWidth={2} />

            {data.map((item, index) => (
              <g key={item.date}>
                <rect
                  x={x(index) - (data.length > 1 ? plotWidth / (data.length - 1) / 2 : plotWidth / 2)}
                  y={PADDING.top}
                  width={data.length > 1 ? plotWidth / (data.length - 1) : plotWidth}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => openDate(index)}
                />
                {active === index && (
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1={PADDING.top}
                    y2={PADDING.top + plotHeight}
                    stroke="var(--border-strong)"
                  />
                )}
                <circle
                  cx={x(index)}
                  cy={y(item.income ?? 0)}
                  r={active === index ? 4 : 2.5}
                  fill="var(--success)"
                  className="pointer-events-none"
                />
                <circle
                  cx={x(index)}
                  cy={y(item.expense ?? 0)}
                  r={active === index ? 4 : 2.5}
                  fill="var(--danger)"
                  className="pointer-events-none"
                />
                {index % labelStep === 0 && (
                  <text
                    x={x(index)}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-[var(--text-muted)] text-[9px]"
                  >
                    {item.date.slice(5)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {activePoint ? (
        <button
          type="button"
          onClick={() => openDate(active as number)}
          className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border bg-surface-muted px-3 py-2 text-left"
        >
          <span className="text-[11px] font-medium text-text-primary">
            {formatDateLabel(activePoint.date)}
          </span>
          <span className="flex gap-3 text-[10px]">
            <span className="text-success">+{formatRupiah(activePoint.income ?? 0)}</span>
            <span className="text-danger">-{formatRupiah(activePoint.expense ?? 0)}</span>
          </span>
          <span className="text-[10px] text-text-muted">Buka detail tanggal</span>
        </button>
      ) : (
        <p className="mt-2 text-[10px] text-text-muted">
          Arahkan kursor ke grafik, klik titik untuk membuka detail tanggal.
        </p>
      )}
    </section>
  );
}
