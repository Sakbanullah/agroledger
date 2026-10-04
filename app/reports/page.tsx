"use client";

import { AlertTriangle, BarChart3, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getDashboardSummary,
  getFinanceSummary,
  getSalesSummary,
  getSettlementSummary,
} from "@/lib/api";

// ── helpers ──
function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function weeksAgoISO(weeks: number) {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().split("T")[0];
}
function fmtRupiah(v: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(v))}`;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(weeksAgoISO(4));
  const [endDate, setEndDate] = useState(todayISO());

  const [dashboard, setDashboard] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [sales, setSales] = useState<any>(null);
  const [settlements, setSettlements] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [d, f, s, st] = await Promise.all([
        getDashboardSummary(),
        getFinanceSummary(startDate, endDate).catch((e: Error) => {
          throw new Error(`Finance: ${e.message}`);
        }),
        getSalesSummary(startDate, endDate).catch((e: Error) => {
          throw new Error(`Sales: ${e.message}`);
        }),
        getSettlementSummary(startDate, endDate).catch((e: Error) => {
          throw new Error(`Settlement: ${e.message}`);
        }),
      ]);
      setDashboard(d);
      setFinance(f);
      setSales(s);
      setSettlements(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasEmptyPeriod =
    !loading &&
    !error &&
    sales !== null &&
    sales.totalSales === 0 &&
    finance !== null &&
    (finance.cashIn ?? 0) === 0 &&
    (finance.cashOut ?? 0) === 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1160px]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">REPORTS</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
          Laporan Keuangan
        </h1>
        <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
          Ringkasan keuangan, penjualan, dan kewajiban berdasarkan data backend Reports.
        </p>

        {/* Filter */}
        <section className="mt-5 rounded-[16px] border border-border bg-surface px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Periode Laporan
          </p>

          <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
              <input
                type="date"
                aria-label="Dari"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-[9px] border border-border bg-surface-soft px-3 text-[11px] text-text-primary outline-none transition focus:border-agro-primary sm:w-[150px]"
              />

              <span className="hidden text-text-muted sm:inline" aria-hidden="true">
                →
              </span>
              <span className="text-[10px] text-text-muted sm:hidden">sampai</span>

              <input
                type="date"
                aria-label="Sampai"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-[9px] border border-border bg-surface-soft px-3 text-[11px] text-text-primary outline-none transition focus:border-agro-primary sm:w-[150px]"
              />
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-agro-primary px-3.5 text-[11px] font-semibold text-white transition hover:bg-agro-primary-dark disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              Muat Ulang
            </button>
          </div>

          <p className="mt-2 text-[10px] text-text-muted">
            Data laporan berdasarkan periode yang dipilih.
          </p>
        </section>

        {/* Loading / Error */}
        {loading && (
          <div className="mt-6 flex items-center gap-2 text-[11px] text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Memuat laporan...
          </div>
        )}
        {error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-[10px] border border-danger/20 bg-danger-soft px-3 py-3 text-[11px] text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Empty */}
        {hasEmptyPeriod && (
          <div className="mt-6 flex flex-col items-center rounded-[16px] border border-border bg-surface px-6 py-14">
            <BarChart3 size={24} className="text-text-muted" />
            <p className="mt-3 text-[13px] font-semibold text-text-primary">Tidak ada data pada periode ini</p>
            <p className="mt-1 text-[11px] text-text-secondary">Ubah tanggal atau buat transaksi baru.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Cash Position */}
            <section className="mt-6">
              <h2 className="text-[13px] font-semibold text-text-primary">Cash Position</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card title="Cash In">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(finance?.cashIn ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Berdasarkan MoneyTransaction bertipe IN.</p>
                </Card>
                <Card title="Cash Out">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(finance?.cashOut ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Berdasarkan MoneyTransaction bertipe OUT.</p>
                </Card>
                <Card title="Net Cash">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(finance?.netCashFlow ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Net Cash = Cash In − Cash Out.</p>
                </Card>
              </div>
            </section>

            {/* Income */}
            <section className="mt-6">
              <h2 className="text-[13px] font-semibold text-text-primary">Pendapatan (Income)</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card title="Gross Sales">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(sales?.grossSales ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-muted">Gross Sales ≠ Own Income.</p>
                </Card>
                <Card title="Own Income">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(sales?.totalOwnIncome ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Sawit OWN = gross, Sawit RELATIVE = commission.</p>
                </Card>
                <Card title="Commission Income">
                  <p className="text-[18px] font-semibold text-text-primary">{fmtRupiah(sales?.totalCommissionIncome ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Hanya Sawit RELATIVE.</p>
                </Card>
              </div>
            </section>

            {/* Obligation */}
            <section className="mt-6">
              <h2 className="text-[13px] font-semibold text-text-primary">Kewajiban Owner (Obligation)</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card title="Owner Share Outstanding">
                  <p className="text-[18px] font-semibold text-danger">{fmtRupiah(dashboard?.obligation?.ownerShareOutstanding ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Obligation — tidak mengurangi Cash In.</p>
                </Card>
                <Card title="Owner Share Paid">
                  <p className="text-[18px] font-semibold text-success">{fmtRupiah(dashboard?.obligation?.ownerSharePaid ?? 0)}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">Total yang sudah dibayarkan.</p>
                </Card>
              </div>
            </section>

            {/* Breakdown */}
            <section className="mt-6">
              <h2 className="text-[13px] font-semibold text-text-primary">Breakdown</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
                <Card title="By Commodity">
                  {(sales?.summaryByCommodity ?? []).length === 0 ? (
                    <p className="text-[11px] text-text-muted">Tidak ada data.</p>
                  ) : (
                    <ul className="space-y-2 text-[11px] text-text-primary">
                      {(sales?.summaryByCommodity ?? []).map((c: any) => (
                        <li key={c.commodityId} className="flex justify-between rounded-[9px] bg-surface-soft px-3 py-2">
                          <span>{c.commodityName}</span>
                          <span className="font-semibold">{fmtRupiah(c.grossSales)} · {c.totalSales} sale</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="By Ownership">
                  {(sales?.summaryByOwnership ?? []).length === 0 ? (
                    <p className="text-[11px] text-text-muted">Tidak ada data.</p>
                  ) : (
                    <ul className="space-y-2 text-[11px] text-text-primary">
                      {(sales?.summaryByOwnership ?? []).map((o: any) => (
                        <li key={o.ownershipType} className="flex justify-between rounded-[9px] bg-surface-soft px-3 py-2">
                          <span>{o.ownershipType}</span>
                          <span className="font-semibold">{fmtRupiah(o.grossSales)} · {o.totalSales} sale</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="By Farm">
                  {(sales?.summaryByFarm ?? []).length === 0 ? (
                    <p className="text-[11px] text-text-muted">Tidak ada data.</p>
                  ) : (
                    <ul className="space-y-2 text-[11px] text-text-primary">
                      {(sales?.summaryByFarm ?? []).map((f: any) => (
                        <li key={f.farmId} className="flex justify-between rounded-[9px] bg-surface-soft px-3 py-2">
                          <span>{f.farmName}</span>
                          <span className="font-semibold">{fmtRupiah(f.grossSales)} · {f.totalSales} sale</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </section>

            {/* Settlement */}
            <section className="mt-6">
              <h2 className="text-[13px] font-semibold text-text-primary">Settlement Summary</h2>
              <div className="mt-3 rounded-[16px] border border-border bg-surface p-5">
                <div className="grid grid-cols-2 gap-4 text-[11px] sm:grid-cols-4">
                  <div>
                    <p className="text-text-muted">Total Settlements</p>
                    <p className="mt-1 text-[16px] font-semibold text-text-primary">{settlements?.totalSettlements ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Worker Share</p>
                    <p className="mt-1 text-[16px] font-semibold text-text-primary">{fmtRupiah(settlements?.totalWorkerShare ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Total Deduction</p>
                    <p className="mt-1 text-[16px] font-semibold text-text-primary">{fmtRupiah(settlements?.totalDeduction ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Net Payment</p>
                    <p className="mt-1 text-[16px] font-semibold text-text-primary">{fmtRupiah(settlements?.totalNetPayment ?? 0)}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
