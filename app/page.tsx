"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/dashboard/Sidebar";
import MobileHeader from "@/components/dashboard/MobileHeader";
import PageHeader from "@/components/dashboard/PageHeader";
import CashPosition from "@/components/dashboard/CashPosition";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import HarvestSummary from "@/components/dashboard/HarvestSummary";
import SettlementCard from "@/components/dashboard/SettlementCard";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

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

type CashFlowPeriod = "daily" | "weekly" | "monthly";

type CashFlowItem = {
  date: string;
  moneyIn: number | string;
  moneyOut: number | string;
};

type CashFlowResponse = {
  data?: CashFlowItem[];
};

type CashFlowSummaryResponse = {
  totalIn?: number | string;
  totalOut?: number | string;
  netCashFlow?: number | string;
};

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(null);

  const [cashFlowSummary, setCashFlowSummary] =
    useState<CashFlowSummaryResponse | null>(null);

  const [cashFlowPeriod, setCashFlowPeriod] = useState<CashFlowPeriod>("daily");

  const [loading, setLoading] = useState(true);

  /*
   * ============================
   * DASHBOARD
   * ============================
   */

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

  /*
   * ============================
   * CASH FLOW
   * ============================
   */

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

  /*
   * ============================
   * TRANSFORM CASH FLOW DATA
   * ============================
   *
   * API lama:
   * moneyIn / moneyOut
   *
   * Component baru:
   * income / expense
   */

  const cashFlowChartData =
    cashFlow?.data?.map((item) => ({
      date: item.date,
      income: Number(item.moneyIn),
      expense: Number(item.moneyOut),
    })) ?? [];

  const cashFlowChartSummary = {
    income: Number(cashFlowSummary?.totalIn ?? 0),

    expense: Number(cashFlowSummary?.totalOut ?? 0),

    net: Number(cashFlowSummary?.netCashFlow ?? 0),
  };

  /*
   * ============================
   * LOADING
   * ============================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F2] text-[#17221B]">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="min-w-0 flex-1">
            <MobileHeader />

            <div className="mx-auto max-w-[1380px] px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#DDE3DD] border-t-[#315B42]" />

                  <p className="mt-3 text-xs text-[#858D87]">
                    Loading dashboard...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ============================
   * DASHBOARD
   * ============================
   */

  return (
    <main className="min-h-screen bg-[#F7F7F2] text-[#17221B]">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <Sidebar />

        <div className="min-w-0 flex-1">
          {/* MOBILE HEADER */}
          <MobileHeader />

          <div className="mx-auto max-w-[1380px] px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
            {/* PAGE HEADER */}
            <PageHeader />

            <div className="mt-7 space-y-7">
              {/* ============================
                  CASH POSITION
              ============================ */}

              <CashPosition
                cashBalance={dashboard?.cashPosition?.currentCash ?? 0}
                totalIncome={dashboard?.cashPosition?.totalIncome ?? 0}
                totalExpense={dashboard?.cashPosition?.totalExpense ?? 0}
              />

              {/* ============================
                  CASH FLOW + HARVEST
              ============================ */}

              <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <CashFlowChart
                  data={cashFlowChartData}
                  summary={cashFlowChartSummary}
                />

                <HarvestSummary
                  totalValue={246_800_000}
                  completion={87}
                  pendingSettlements={3}
                />
              </div>

              {/* ============================
                  FINANCIAL ACTIVITY
              ============================ */}

              <div>
                <div className="mb-4">
                  <h2 className="text-[16px] font-semibold text-[#17221B]">
                    Financial activity
                  </h2>

                  <p className="mt-0.5 text-[11px] text-[#858D87]">
                    Recent cash movements and settlements
                  </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
                  {/* RECENT TRANSACTIONS */}

                  <RecentTransactions
                    transactions={dashboard?.recentTransactions ?? []}
                  />

                  {/* RECENT SETTLEMENT */}

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
