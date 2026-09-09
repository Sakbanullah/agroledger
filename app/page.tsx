"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sprout,
  Users,
  Wallet,
} from "lucide-react";

import { useEffect, useState } from "react";
import {
  getCashFlow,
  getCashFlowSummary,
  getDashboardSummary,
} from "@/lib/api";

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

function Sidebar() {
  const navigation = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: "Transactions",
      icon: ReceiptText,
    },
    {
      label: "Harvest",
      icon: Sprout,
    },
    {
      label: "Settlement",
      icon: FileText,
    },
    {
      label: "Reports",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-[#E5E7E4] bg-[#F7F7F2] lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-5">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17221B] text-white">
            <Leaf size={16} strokeWidth={2} />
          </div>

          <div>
            <p className="text-[15px] font-semibold tracking-tight text-[#17221B]">
              AgroLedger
            </p>

            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A918B]">
              Family Finance
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-10">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929992]">
            Workspace
          </p>

          <nav className="mt-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium transition ${
                    item.active
                      ? "bg-[#17221B] text-white"
                      : "text-[#69726B] hover:bg-white hover:text-[#17221B]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Secondary */}
        <div className="mt-auto space-y-1">
          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] hover:bg-white">
            <Users size={16} strokeWidth={1.8} />
            People
          </button>

          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] hover:bg-white">
            <Settings size={16} strokeWidth={1.8} />
            Settings
          </button>

          <div className="mt-4 border-t border-[#E5E7E4] pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DDE5DD] text-xs font-semibold text-[#315B42]">
                SD
              </div>

              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#17221B]">
                  Family Account
                </p>

                <p className="text-[11px] text-[#8A918B]">Owner</p>
              </div>

              <MoreHorizontal size={16} className="ml-auto text-[#9AA09B]" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-[#E5E7E4] px-5 py-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17221B] text-white">
          <Leaf size={16} />
        </div>

        <span className="text-[15px] font-semibold text-[#17221B]">
          AgroLedger
        </span>
      </div>

      <button className="rounded-lg p-2 text-[#69726B]">
        <Menu size={20} />
      </button>
    </header>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[#E5E7E4] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-medium text-[#8A918B]">
          Wednesday, 9 September 2026
        </p>

        <h1 className="mt-1 text-[23px] font-semibold tracking-[-0.025em] text-[#17221B]">
          Overview
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-9 items-center gap-2 rounded-[7px] border border-[#DCDFDA] bg-white px-3 text-[12px] font-medium text-[#59625B] hover:bg-[#FAFAF8]">
          September 2026
          <ChevronDown size={14} />
        </button>

        <button className="flex h-9 items-center gap-2 rounded-[7px] bg-[#17221B] px-3.5 text-[12px] font-semibold text-white hover:bg-[#253229]">
          <Plus size={15} />
          Add transaction
        </button>
      </div>
    </div>
  );
}

function CashPosition({
  data,
}: {
  data?: {
    totalIncome: number;
    totalExpense: number;
    currentCash: number;
  };
}) {
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const currentCash = data?.currentCash ?? 0;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#17221B]">
            Cash Position
          </h2>
          <p className="mt-1 text-xs text-[#6B746D]">
            Ringkasan posisi kas keluarga
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
          <p className="text-xs font-medium text-[#6B746D]">Saldo Kas</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#17221B]">
            {formatRupiah(currentCash)}
          </p>

          <p className="mt-2 text-xs text-[#6B746D]">Posisi kas saat ini</p>
        </div>

        <div className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
          <p className="text-xs font-medium text-[#6B746D]">Total Pemasukan</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#315B42]">
            {formatRupiah(totalIncome)}
          </p>

          <p className="mt-2 text-xs text-[#6B746D]">Seluruh uang masuk</p>
        </div>

        <div className="rounded-[10px] border border-[#E3E6E1] bg-white p-5">
          <p className="text-xs font-medium text-[#6B746D]">
            Total Pengeluaran
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#17221B]">
            {formatRupiah(totalExpense)}
          </p>

          <p className="mt-2 text-xs text-[#6B746D]">Seluruh uang keluar</p>
        </div>
      </div>
    </section>
  );
}
function CashFlowChart({
  cashFlow,
  summary,
  period,
  onPeriodChange,
}: {
  cashFlow: any;
  summary: any;
  period: "daily" | "weekly" | "monthly";
  onPeriodChange: (period: "daily" | "weekly" | "monthly") => void;
}) {
  const data = cashFlow?.data ?? [];

  const totalIn = Number(summary?.totalIn ?? 0);
  const totalOut = Number(summary?.totalOut ?? 0);
  const netCashFlow = Number(summary?.netCashFlow ?? 0);

  const maxValue = Math.max(
    ...data.map((item: any) =>
      Math.max(Number(item.moneyIn), Number(item.moneyOut)),
    ),
    1,
  );

  const formatAmount = (value: number) => {
    if (value >= 1_000_000_000) {
      return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000_000) {
      return `Rp${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `Rp${(value / 1_000).toFixed(0)}K`;
    }

    return `Rp${value.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    if (period === "monthly") {
      return date.toLocaleDateString("en-US", {
        month: "short",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const periodLabel =
    period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly";

  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="border-b border-[#EAECE8] px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#17221B]">
              Cash flow
            </h2>

            <p className="mt-0.5 text-[11px] text-[#858D87]">
              Money movement over the selected period
            </p>
          </div>

          <div className="relative">
            <select
              value={period}
              onChange={(event) =>
                onPeriodChange(
                  event.target.value as "daily" | "weekly" | "monthly",
                )
              }
              aria-label="Cash flow period"
              className="cursor-pointer appearance-none bg-transparent pr-5 text-[11px] font-medium text-[#68716A] outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <ChevronDown
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
              size={12}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-t border-[#EEF0EC] pt-4">
          <div>
            <p className="text-[10px] text-[#858D87]">Money in</p>
            <p className="mt-1 text-[14px] font-semibold text-[#315B42]">
              {formatAmount(totalIn)}
            </p>
          </div>

          <div className="border-l border-[#EAECE8] pl-4">
            <p className="text-[10px] text-[#858D87]">Money out</p>
            <p className="mt-1 text-[14px] font-semibold text-[#17221B]">
              {formatAmount(totalOut)}
            </p>
          </div>

          <div className="border-l border-[#EAECE8] pl-4">
            <p className="text-[10px] text-[#858D87]">Net cash flow</p>
            <p
              className={`mt-1 text-[14px] font-semibold ${
                netCashFlow >= 0 ? "text-[#315B42]" : "text-[#9A5D45]"
              }`}
            >
              {netCashFlow >= 0 ? "+" : "-"}
              {formatAmount(Math.abs(netCashFlow))}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-6">
        {data.length === 0 ? (
          <div className="flex h-[190px] items-center justify-center text-[12px] text-[#858D87]">
            No cash flow data available
          </div>
        ) : (
          <>
            <div className="flex h-[190px] items-end gap-2 overflow-x-auto sm:gap-3">
              {data.map((item: any, index: number) => {
                const moneyIn = Number(item.moneyIn);
                const moneyOut = Number(item.moneyOut);

                const inHeight =
                  moneyIn > 0 ? Math.max((moneyIn / maxValue) * 100, 4) : 0;

                const outHeight =
                  moneyOut > 0 ? Math.max((moneyOut / maxValue) * 100, 4) : 0;

                return (
                  <div
                    key={`${item.date}-${index}`}
                    className="group flex h-full min-w-[42px] flex-1 items-end gap-1"
                  >
                    <div
                      className="relative flex-1"
                      style={{ height: `${inHeight}%` }}
                    >
                      <div className="h-full w-full rounded-t-[3px] bg-[#315B42]/80 transition group-hover:bg-[#315B42]" />

                      {moneyIn > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#17221B] px-2 py-1 text-[10px] text-white shadow-sm group-hover:block">
                          Money in: {formatAmount(moneyIn)}
                        </div>
                      )}
                    </div>

                    <div
                      className="relative flex-1"
                      style={{ height: `${outHeight}%` }}
                    >
                      <div className="h-full w-full rounded-t-[3px] bg-[#C8A96B]/80 transition group-hover:bg-[#C8A96B]" />

                      {moneyOut > 0 && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#17221B] px-2 py-1 text-[10px] text-white shadow-sm group-hover:block">
                          Money out: {formatAmount(moneyOut)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between gap-2 overflow-x-auto border-t border-[#EEF0EC] pt-3 text-[10px] text-[#929992]">
              {data.map((item: any, index: number) => (
                <span
                  key={`${item.date}-label-${index}`}
                  className="min-w-[42px] text-center"
                >
                  {formatDate(item.date)}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-5 text-[11px] text-[#6F7771]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#315B42]" />
                  Money in
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#C8A96B]" />
                  Money out
                </span>
              </div>

              <span className="text-[10px] text-[#929992]">{periodLabel}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function HarvestSummary() {
  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="border-b border-[#EAECE8] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929992]">
          This season
        </p>

        <div className="mt-1 flex items-end justify-between">
          <h2 className="text-[25px] font-semibold tracking-[-0.025em] text-[#17221B]">
            Rp246.8M
          </h2>

          <span className="text-[12px] font-medium text-[#315B42]">87%</span>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#E8ECE7]">
          <div
            className="h-full rounded-full bg-[#315B42]"
            style={{ width: "87%" }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#858D87]">Harvest revenue</p>

            <p className="mt-0.5 text-[13px] font-semibold text-[#17221B]">
              87% of target
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-[#858D87]">Pending</p>

            <p className="mt-0.5 text-[13px] font-semibold text-[#17221B]">
              3 settlements
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettlementCard() {
  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="flex items-start justify-between border-b border-[#EAECE8] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#929992]">
            Recent settlement
          </p>

          <h2 className="mt-1 text-[14px] font-semibold text-[#17221B]">
            Settlement #0248
          </h2>
        </div>

        <span className="rounded-full bg-[#EEF3EE] px-2.5 py-1 text-[10px] font-semibold text-[#315B42]">
          Completed
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F3EE] text-[#315B42]">
            <Sprout size={17} />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-[#17221B]">
              Slamet Farm
            </p>

            <p className="text-[11px] text-[#858D87]">Palm Oil · 1,842 kg</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-[#EEF0EC] pt-4">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#7C847E]">Price / kg</span>

            <span className="font-medium text-[#17221B]">Rp18,000</span>
          </div>

          <div className="flex justify-between text-[12px]">
            <span className="text-[#7C847E]">Gross</span>

            <span className="font-medium text-[#17221B]">Rp33.16M</span>
          </div>

          <div className="flex justify-between text-[12px]">
            <span className="text-[#7C847E]">Management fee</span>

            <span className="font-medium text-[#9A5D45]">-Rp1.66M</span>
          </div>

          <div className="mt-3 flex justify-between border-t border-[#EAECE8] pt-3">
            <span className="text-[12px] font-semibold text-[#17221B]">
              Net settlement
            </span>

            <span className="text-[15px] font-semibold text-[#17221B]">
              Rp31.50M
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: Array<{
    id: number;
    type: string;
    category: string;
    amount: number | string;
    description?: string | null;
    transactionDate: string;
  }>;
}) {
  const formatRupiah = (value: number | string) => {
    const amount = Number(value);

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionTitle = (category: string) => {
    const titles: Record<string, string> = {
      HARVEST_SALE: "Harvest sale",
      SETTLEMENT: "Rubber settlement",
      OPERATIONAL_EXPENSE: "Operational expense",
      OPENING_BALANCE: "Opening balance",
    };

    return titles[category] ?? category.replaceAll("_", " ");
  };

  return (
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="flex items-center justify-between border-b border-[#EAECE8] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#17221B]">
            Recent transactions
          </h2>

          <p className="mt-0.5 text-[11px] text-[#858D87]">
            Latest movement in family cash
          </p>
        </div>

        <button className="text-[11px] font-medium text-[#315B42]">
          View all
        </button>
      </div>

      <div className="divide-y divide-[#EEF0EC]">
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] font-medium text-[#68716A]">
              No transactions yet
            </p>

            <p className="mt-1 text-[10px] text-[#8A918B]">
              Family cash movements will appear here.
            </p>
          </div>
        ) : (
          transactions.map((transaction) => {
            const isIncome = transaction.type === "IN";
            const isExpense = transaction.type === "OUT";

            const Icon = isIncome
              ? ArrowDownLeft
              : isExpense
                ? Wallet
                : CircleDollarSign;

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F1] text-[#68716A]">
                  <Icon size={15} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#17221B]">
                    {getTransactionTitle(transaction.category)}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-[#8A918B]">
                    {transaction.description ?? "No description"}
                  </p>
                </div>

                <p
                  className={`text-[12px] font-semibold ${
                    isIncome
                      ? "text-[#315B42]"
                      : isExpense
                        ? "text-[#17221B]"
                        : "text-[#8A918B]"
                  }`}
                >
                  {isIncome ? "+" : isExpense ? "-" : ""}
                  {formatRupiah(transaction.amount)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [cashFlowSummary, setCashFlowSummary] = useState<any>(null);

  const [cashFlowPeriod, setCashFlowPeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");

  const [loading, setLoading] = useState(true);

  // Dashboard
  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getDashboardSummary();
        setDashboard(data);
      } catch (error) {
        console.error("Gagal mengambil dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // Cash Flow
  useEffect(() => {
    async function loadCashFlow() {
      try {
        const [cashFlowData, summaryData] = await Promise.all([
          getCashFlow("2026-09-01", "2026-09-30", cashFlowPeriod),
          getCashFlowSummary("2026-09-01", "2026-09-30"),
        ]);

        setCashFlow(cashFlowData);
        setCashFlowSummary(summaryData);
      } catch (error) {
        console.error("Gagal mengambil cash flow:", error);
      }
    }

    loadCashFlow();
  }, [cashFlowPeriod]);
  return (
    <main className="min-h-screen bg-[#F7F7F2] text-[#17221B]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <MobileHeader />

          <div className="mx-auto max-w-[1380px] px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
            <PageHeader />

            <div className="mt-7 space-y-7">
              <CashPosition data={dashboard?.cashPosition} />

              <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <CashFlowChart
                  cashFlow={cashFlow}
                  summary={cashFlowSummary}
                  period={cashFlowPeriod}
                  onPeriodChange={setCashFlowPeriod}
                />
                <HarvestSummary />
              </div>

              <div>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#17221B]">
                      Financial activity
                    </h2>

                    <p className="mt-0.5 text-[11px] text-[#858D87]">
                      Recent cash movements and settlements
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
                  <RecentTransactions
                    transactions={dashboard?.recentTransactions ?? []}
                  />
                  <SettlementCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
