"use client";

import { useEffect, useState } from "react";
import CashPosition from "@/components/dashboard/CashPosition";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import HarvestSummary from "@/components/dashboard/HarvestSummary";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SettlementCard from "@/components/dashboard/SettlementCard";

import {
  getCashFlow,
  getCashFlowSummary,
  getDashboardSummary,
} from "@/lib/api";

type DashboardData = {
  cashPosition?: {
    currentCash?: number;
    totalIncome?: number;
    totalExpense?: number;
  };
  recentTransactions?: {
    id: number;
    type: string;
    category: string;
    amount: number | string;
    description?: string | null;
    transactionDate: string;
  }[];
};

type CashFlowItem = {
  date: string;
  income: number;
  expense: number;
};

type CashFlowSummary = {
  income: number;
  expense: number;
  net: number;
};

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary>({
    income: 0,
    expense: 0,
    net: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [dashboardData, cashFlowData, cashFlowSummaryData] =
          await Promise.all([
            getDashboardSummary(),
            getCashFlow("2026-09-01", "2026-09-30", "daily"),
            getCashFlowSummary("2026-09-01", "2026-09-30"),
          ]);

        setDashboard(dashboardData);

        const cashFlowItems = Array.isArray(cashFlowData)
          ? cashFlowData
          : Array.isArray(cashFlowData?.data)
            ? cashFlowData.data
            : [];

        setCashFlow(
          cashFlowItems.map((item: any) => ({
            date: item.date,
            income: Number(item.moneyIn ?? item.income ?? 0),
            expense: Number(item.moneyOut ?? item.expense ?? 0),
          })),
        );
        setCashFlowSummary({
          income: Number(cashFlowSummaryData?.income ?? 0),
          expense: Number(cashFlowSummaryData?.expense ?? 0),
          net: Number(
            cashFlowSummaryData?.net ??
              (cashFlowSummaryData?.income ?? 0) -
                (cashFlowSummaryData?.expense ?? 0),
          ),
        });
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const cashPosition = dashboard?.cashPosition;

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#17221B]">
      <main className="min-h-screen">
        <div className="w-full px-5 py-6 sm:px-7 lg:px-9">
          {loading ? (
            <div className="mt-6 rounded-[10px] border border-[#E5E7E4] bg-white p-10 text-center">
              <p className="text-[12px] text-[#8A918B]">Memuat dashboard...</p>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-[10px] border border-[#E5E7E4] bg-white p-10 text-center">
              <p className="text-[12px] font-medium text-[#A33A32]">{error}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Financial Overview */}
              <CashPosition
                cashBalance={Number(cashPosition?.currentCash ?? 0)}
                totalIncome={Number(cashPosition?.totalIncome ?? 0)}
                totalExpense={Number(cashPosition?.totalExpense ?? 0)}
              />

              {/* Main Overview */}
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
                <CashFlowChart data={cashFlow} summary={cashFlowSummary} />

                <HarvestSummary
                  totalValue={0}
                  completion={0}
                  pendingSettlements={0}
                />
              </section>
              {/* Activity */}
              <section>
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
                    Activity
                  </p>

                  <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#17221B]">
                    Aktivitas Terbaru
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
                  <RecentTransactions
                    transactions={dashboard?.recentTransactions ?? []}
                  />
                  <SettlementCard />
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
