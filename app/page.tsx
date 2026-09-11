"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Leaf,
  ReceiptText,
  Sprout,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  getCashFlow,
  getCashFlowSummary,
  getDashboardSummary,
} from "@/lib/api";

type Period = "daily" | "weekly" | "monthly";

type DashboardData = {
  cashPosition: {
    totalIncome: number;
    totalExpense: number;
    currentCash: number;
  };
  recentTransactions: Array<{
    id: number;
    type: string;
    category: string;
    amount: string | number;
    transactionDate: string;
    description: string | null;
  }>;
};

type SalesSummary = {
  totalSales: number;
  totalWeightKg: number;
  totalRevenue: number;
  summaryByCommodity: Array<{
    commodityId: number;
    commodityName: string;
    unit: string;
    totalSales: number;
    totalWeightKg: number;
    totalRevenue: number;
  }>;
};

type Settlement = {
  id: number;
  saleId: number;
  workerId: number;
  grossShare: string | number;
  kasbonAmount: string | number;
  deductionAmount: string | number;
  netAmount: string | number;
  status: string;
  createdAt: string;
  worker?: {
    id: number;
    name: string;
  };
  sale?: {
    id: number;
    saleDate: string;
    pricePerKg: string | number | null;
    totalWeightKg: string | number | null;
    farm?: {
      name: string;
    };
    commodity?: {
      name: string;
    };
  };
};

function formatRupiah(value: number | string) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactRupiah(value: number | string) {
  const amount = Number(value) || 0;

  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1)}M`;
  }

  if (Math.abs(amount) >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(amount) >= 1_000) {
    return `Rp${(amount / 1_000).toFixed(0)}K`;
  }

  return formatRupiah(amount);
}

function formatWeight(value: number | string) {
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)} kg`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const toApiDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    startDate: toApiDate(start),
    endDate: toApiDate(end),
  };
}

function PageHeader() {
  return (
    <header className="border-b border-border pb-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
          AgroLedger
        </p>

        <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.035em] text-text-primary">
          Overview
        </h1>

        <p className="mt-1 text-[12px] text-text-secondary">
          Ringkasan keuangan dan aktivitas usaha
        </p>
      </div>
    </header>
  );
}

function CashPosition({ data }: { data?: DashboardData["cashPosition"] }) {
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const currentCash = data?.currentCash ?? 0;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-text-primary">
          Posisi Kas
        </h2>

        <p className="mt-1 text-[11px] text-text-secondary">
          Kondisi kas keluarga saat ini
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Saldo */}
        <div className="rounded-[12px] border border-border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Saldo Kas
              </p>

              <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-primary">
                {formatRupiah(currentCash)}
              </p>

              <p className="mt-1 text-[10px] text-text-muted">
                Posisi kas saat ini
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#F1F4EF] text-[#3F7635]">
              <Wallet size={16} strokeWidth={1.8} />
            </div>
          </div>
        </div>

        {/* Income */}
        <div className="rounded-[12px] border border-border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Total Pemasukan
              </p>

              <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#3F7635]">
                {formatRupiah(totalIncome)}
              </p>

              <p className="mt-1 text-[10px] text-text-muted">
                Seluruh uang masuk
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EAF3E7] text-[#3F7635]">
              <ArrowDownLeft size={16} strokeWidth={1.8} />
            </div>
          </div>
        </div>

        {/* Expense */}
        <div className="rounded-[12px] border border-border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Total Pengeluaran
              </p>

              <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-primary">
                {formatRupiah(totalExpense)}
              </p>

              <p className="mt-1 text-[10px] text-text-muted">
                Seluruh uang keluar
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#F3F4F1] text-text-secondary">
              <ArrowUpRight size={16} strokeWidth={1.8} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CashFlowCard({
  cashFlow,
  summary,
  period,
  onPeriodChange,
}: {
  cashFlow: any;
  summary: any;
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const data = cashFlow?.data ?? [];

  const totalIn = Number(summary?.totalIn ?? 0);
  const totalOut = Number(summary?.totalOut ?? 0);
  const netCashFlow = Number(summary?.netCashFlow ?? 0);

  const maxValue = Math.max(
    ...data.map((item: any) =>
      Math.max(Number(item.moneyIn ?? 0), Number(item.moneyOut ?? 0)),
    ),
    1,
  );

  const periodLabel =
    period === "daily"
      ? "Harian"
      : period === "weekly"
        ? "Mingguan"
        : "Bulanan";

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);

    if (period === "monthly") {
      return date.toLocaleDateString("id-ID", {
        month: "short",
      });
    }

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <section className="rounded-[12px] border border-border bg-white">
      <div className="border-b border-[#EAECE8] px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Cash Flow
            </p>

            <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
              Arus Kas
            </h2>

            <p className="mt-0.5 text-[11px] text-text-secondary">
              Pergerakan uang berdasarkan periode
            </p>
          </div>

          <div className="relative">
            <select
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as Period)}
              className="h-8 cursor-pointer appearance-none rounded-[8px] border border-border bg-white pl-3 pr-8 text-[11px] font-medium text-text-secondary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2]"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
            </select>

            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 border-t border-[#EEF0EC] pt-4">
          <div>
            <p className="text-[10px] text-text-muted">Masuk</p>

            <p className="mt-1 text-[14px] font-semibold text-[#3F7635]">
              {formatCompactRupiah(totalIn)}
            </p>
          </div>

          <div className="border-l border-[#EAECE8] pl-4">
            <p className="text-[10px] text-text-muted">Keluar</p>

            <p className="mt-1 text-[14px] font-semibold text-text-primary">
              {formatCompactRupiah(totalOut)}
            </p>
          </div>

          <div className="border-l border-[#EAECE8] pl-4">
            <p className="text-[10px] text-text-muted">Bersih</p>

            <p
              className={`mt-1 text-[14px] font-semibold ${
                netCashFlow >= 0 ? "text-[#3F7635]" : "text-[#B5473A]"
              }`}
            >
              {netCashFlow >= 0 ? "+" : "-"}
              {formatCompactRupiah(Math.abs(netCashFlow))}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-6">
        {data.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F3F5F2] text-text-muted">
              <CircleDollarSign size={18} />
            </div>

            <p className="mt-3 text-[12px] font-medium text-text-secondary">
              Belum ada aktivitas kas
            </p>

            <p className="mt-1 text-[10px] text-text-muted">
              Data arus kas akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-[220px] items-end gap-2 overflow-x-auto sm:gap-3">
              {data.map((item: any, index: number) => {
                const moneyIn = Number(item.moneyIn ?? 0);
                const moneyOut = Number(item.moneyOut ?? 0);

                const inHeight =
                  moneyIn > 0 ? Math.max((moneyIn / maxValue) * 100, 3) : 0;

                const outHeight =
                  moneyOut > 0 ? Math.max((moneyOut / maxValue) * 100, 3) : 0;

                return (
                  <div
                    key={`${item.date}-${index}`}
                    className="group flex h-full min-w-[44px] flex-1 items-end gap-1"
                  >
                    <div
                      className="relative flex-1"
                      style={{
                        height: `${inHeight}%`,
                      }}
                    >
                      <div className="h-full w-full rounded-t-[4px] bg-[#3F7635]/75 transition group-hover:bg-[#3F7635]" />

                      {moneyIn > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-[#17221B] px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                          Masuk: {formatRupiah(moneyIn)}
                        </div>
                      )}
                    </div>

                    <div
                      className="relative flex-1"
                      style={{
                        height: `${outHeight}%`,
                      }}
                    >
                      <div className="h-full w-full rounded-t-[4px] bg-[#C8A96B]/75 transition group-hover:bg-[#C8A96B]" />

                      {moneyOut > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-[#17221B] px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                          Keluar: {formatRupiah(moneyOut)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between gap-2 overflow-x-auto border-t border-[#EEF0EC] pt-3">
              {data.map((item: any, index: number) => (
                <span
                  key={`${item.date}-label-${index}`}
                  className="min-w-[44px] text-center text-[9px] text-text-muted"
                >
                  {formatChartDate(item.date)}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-5 text-[10px] text-text-secondary">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3F7635]" />
                  Uang masuk
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#C8A96B]" />
                  Uang keluar
                </span>
              </div>

              <span className="text-[10px] text-text-muted">{periodLabel}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function HarvestOverview({ data }: { data: SalesSummary | null }) {
  const commodities = data?.summaryByCommodity ?? [];

  const sawit = commodities.find((item) =>
    item.commodityName.toLowerCase().includes("sawit"),
  );

  const karet = commodities.find((item) =>
    item.commodityName.toLowerCase().includes("karet"),
  );

  return (
    <section className="rounded-[12px] border border-border bg-white">
      <div className="border-b border-[#EAECE8] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Harvest Overview
        </p>

        <div className="mt-1 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">
              Aktivitas Panen
            </h2>

            <p className="mt-0.5 text-[11px] text-text-secondary">
              Penjualan selesai bulan ini
            </p>
          </div>

          <span className="rounded-full bg-[#F1F4EF] px-2.5 py-1 text-[10px] font-semibold text-[#3F7635]">
            {data?.totalSales ?? 0} penjualan
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-[10px] bg-[#F8FAF7] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EAF3E7] text-[#3F7635]">
                <Sprout size={17} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-[11px] text-text-muted">Total hasil</p>

                <p className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-text-primary">
                  {formatWeight(data?.totalWeightKg ?? 0)}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-text-muted">Nilai penjualan</p>

              <p className="mt-0.5 text-[13px] font-semibold text-[#3F7635]">
                {formatCompactRupiah(data?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#EEF0EC]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] font-medium text-text-primary">Sawit</p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                {sawit?.totalSales ?? 0} penjualan
              </p>
            </div>

            <div className="text-right">
              <p className="text-[12px] font-semibold text-text-primary">
                {formatWeight(sawit?.totalWeightKg ?? 0)}
              </p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                {formatCompactRupiah(sawit?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] font-medium text-text-primary">Karet</p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                {karet?.totalSales ?? 0} penjualan
              </p>
            </div>

            <div className="text-right">
              <p className="text-[12px] font-semibold text-text-primary">
                {formatWeight(karet?.totalWeightKg ?? 0)}
              </p>

              <p className="mt-0.5 text-[10px] text-text-muted">
                {formatCompactRupiah(karet?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: DashboardData["recentTransactions"];
}) {
  const getTransactionTitle = (category: string) => {
    const titles: Record<string, string> = {
      HARVEST_SALE: "Penjualan hasil panen",
      RUBBER_WORKER_SETTLEMENT: "Settlement worker",
      SETTLEMENT: "Settlement",
      OPERATIONAL_EXPENSE: "Biaya operasional",
      OPENING_BALANCE: "Saldo awal",
    };

    return (
      titles[category] ??
      category
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
  };

  return (
    <section className="rounded-[12px] border border-border bg-white">
      <div className="flex items-center justify-between border-b border-[#EAECE8] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Transactions
          </p>

          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
            Aktivitas Terbaru
          </h2>

          <p className="mt-0.5 text-[11px] text-text-secondary">
            Pergerakan kas terbaru
          </p>
        </div>

        <a
          href="/transactions"
          className="text-[11px] font-semibold text-[#3F7635] transition hover:text-[#315C2A]"
        >
          Lihat semua
        </a>
      </div>

      <div className="divide-y divide-[#EEF0EC]">
        {transactions.length === 0 ? (
          <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F3F5F2] text-text-muted">
              <ReceiptText size={17} />
            </div>

            <p className="mt-3 text-[12px] font-medium text-text-secondary">
              Belum ada transaksi
            </p>

            <p className="mt-1 text-[10px] text-text-muted">
              Aktivitas keuangan akan muncul di sini.
            </p>
          </div>
        ) : (
          transactions.slice(0, 6).map((transaction) => {
            const isIncome = transaction.type === "IN";

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                    isIncome
                      ? "bg-[#EAF3E7] text-[#3F7635]"
                      : "bg-[#F3F4F1] text-text-secondary"
                  }`}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={15} strokeWidth={1.8} />
                  ) : (
                    <ArrowUpRight size={15} strokeWidth={1.8} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-text-primary">
                    {getTransactionTitle(transaction.category)}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-text-muted">
                    {transaction.description ||
                      formatDate(transaction.transactionDate)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`text-[12px] font-semibold ${
                      isIncome ? "text-[#3F7635]" : "text-text-primary"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatRupiah(transaction.amount)}
                  </p>

                  <p className="mt-0.5 text-[9px] text-text-muted">
                    {formatDate(transaction.transactionDate)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function LatestSettlement({ settlement }: { settlement: Settlement | null }) {
  if (!settlement) {
    return (
      <section className="rounded-[12px] border border-border bg-white">
        <div className="border-b border-[#EAECE8] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Settlement
          </p>

          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
            Settlement Terbaru
          </h2>
        </div>

        <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F3F5F2] text-text-muted">
            <FileText size={17} />
          </div>

          <p className="mt-3 text-[12px] font-medium text-text-secondary">
            Belum ada settlement
          </p>

          <p className="mt-1 text-[10px] text-text-muted">
            Settlement yang sudah dikonfirmasi akan muncul di sini.
          </p>
        </div>
      </section>
    );
  }

  const gross = Number(settlement.grossShare);
  const deduction = Number(settlement.deductionAmount);
  const net = Number(settlement.netAmount);

  return (
    <section className="rounded-[12px] border border-border bg-white">
      <div className="flex items-start justify-between border-b border-[#EAECE8] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Settlement
          </p>

          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">
            Settlement Terbaru
          </h2>

          <p className="mt-0.5 text-[10px] text-text-muted">
            Settlement #{settlement.id}
          </p>
        </div>

        <span className="rounded-full bg-[#EAF3E7] px-2.5 py-1 text-[10px] font-semibold text-[#3F7635]">
          Confirmed
        </span>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#EAF3E7] text-[#3F7635]">
            <Sprout size={17} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-text-primary">
              {settlement.worker?.name ?? `Worker #${settlement.workerId}`}
            </p>

            <p className="mt-0.5 truncate text-[10px] text-text-muted">
              {settlement.sale?.farm?.name ?? "Farm tidak tersedia"}
              {" · "}
              {settlement.sale?.commodity?.name ?? "Komoditas"}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-[#EEF0EC] pt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-secondary">Gross share</span>

            <span className="font-medium text-text-primary">
              {formatRupiah(gross)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-secondary">Kasbon</span>

            <span className="font-medium text-[#A96D2E]">
              {deduction > 0 ? `-${formatRupiah(deduction)}` : formatRupiah(0)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#EEF0EC] pt-3">
            <span className="text-[12px] font-semibold text-text-primary">
              Diterima worker
            </span>

            <span className="text-[15px] font-semibold text-[#3F7635]">
              {formatRupiah(net)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] text-text-muted">
          <span>{formatDate(settlement.createdAt)}</span>

          <a
            href={`/settlement/sale/${settlement.saleId}/check`}
            className="font-semibold text-[#3F7635] hover:text-[#315C2A]"
          >
            Lihat check
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [cashFlow, setCashFlow] = useState<any>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<any>(null);

  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);

  const [latestSettlement, setLatestSettlement] = useState<Settlement | null>(
    null,
  );

  const [cashFlowPeriod, setCashFlowPeriod] = useState<Period>("daily");

  const [loading, setLoading] = useState(true);

  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  useEffect(() => {
    async function loadOverview() {
      try {
        setLoading(true);

        const [dashboardData, salesData, settlementsData] = await Promise.all([
          getDashboardSummary(),

          fetch(
            `http://localhost:3001/reports/sales?startDate=${monthRange.startDate}&endDate=${monthRange.endDate}`,
          ).then(async (response) => {
            if (!response.ok) {
              throw new Error("Gagal mengambil ringkasan panen.");
            }

            return response.json();
          }),

          fetch("http://localhost:3001/settlements").then(async (response) => {
            if (!response.ok) {
              throw new Error("Gagal mengambil settlement.");
            }

            return response.json();
          }),
        ]);

        setDashboard(dashboardData);
        setSalesSummary(salesData);

        const settlements: Settlement[] = Array.isArray(settlementsData)
          ? settlementsData
          : [];

        const confirmed = settlements
          .filter((item) => item.status === "CONFIRMED")
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        setLatestSettlement(confirmed[0] ?? null);
      } catch (error) {
        console.error("Gagal mengambil data overview:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, [monthRange.endDate, monthRange.startDate]);

  useEffect(() => {
    async function loadCashFlow() {
      try {
        const [cashFlowData, summaryData] = await Promise.all([
          getCashFlow(monthRange.startDate, monthRange.endDate, cashFlowPeriod),
          getCashFlowSummary(monthRange.startDate, monthRange.endDate),
        ]);

        setCashFlow(cashFlowData);
        setCashFlowSummary(summaryData);
      } catch (error) {
        console.error("Gagal mengambil cash flow:", error);
      }
    }

    loadCashFlow();
  }, [cashFlowPeriod, monthRange.endDate, monthRange.startDate]);

  if (loading && !dashboard) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <div className="border-b border-border pb-6">
            <div className="h-3 w-20 animate-pulse rounded bg-[#E7EBE5]" />

            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-[#E7EBE5]" />

            <div className="mt-2 h-3 w-64 animate-pulse rounded bg-[#E7EBE5]" />
          </div>

          <div className="mt-7 space-y-7">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[130px] animate-pulse rounded-[12px] border border-border bg-white"
                />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
              <div className="h-[430px] animate-pulse rounded-[12px] border border-border bg-white" />

              <div className="h-[430px] animate-pulse rounded-[12px] border border-border bg-white" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 text-text-primary sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <PageHeader />

        <div className="mt-7 space-y-7">
          <CashPosition data={dashboard?.cashPosition} />

          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <CashFlowCard
              cashFlow={cashFlow}
              summary={cashFlowSummary}
              period={cashFlowPeriod}
              onPeriodChange={setCashFlowPeriod}
            />

            <HarvestOverview data={salesSummary} />
          </div>

          <section>
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Activity
              </p>

              <h2 className="mt-1 text-[16px] font-semibold text-text-primary">
                Aktivitas Keuangan
              </h2>

              <p className="mt-0.5 text-[11px] text-text-secondary">
                Transaksi dan settlement terbaru
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
              <RecentTransactions
                transactions={dashboard?.recentTransactions ?? []}
              />

              <LatestSettlement settlement={latestSettlement} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
