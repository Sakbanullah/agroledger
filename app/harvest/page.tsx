"use client";

import {
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Search,
  Wheat,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Farm = {
  id: number;
  name: string;
};

type Commodity = {
  id: number;
  name: string;
  unit: string;
};

type Sale = {
  id: number;
  farmId: number;
  commodityId: number;
  saleDate: string;
  pricePerKg: string | number | null;
  totalWeightKg: string | number | null;
  buyerName: string | null;
  status: string;
  notes: string | null;
  farm?: Farm;
  commodity?: Commodity;
};

function formatWeight(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getMonthKey(date: string) {
  const value = new Date(date);

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getCommodityName(sale: Sale) {
  return sale.commodity?.name?.trim() ?? "";
}

function isCommodity(sale: Sale, name: string) {
  return getCommodityName(sale).toLowerCase() === name.toLowerCase();
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface-soft">
        <Wheat size={19} strokeWidth={1.7} className="text-text-muted" />
      </div>

      <p className="mt-4 text-[12px] font-semibold text-text-primary">
        Belum ada hasil panen
      </p>

      <p className="mt-1 max-w-[300px] text-center text-[10px] leading-5 text-text-secondary">
        Penjualan yang sudah selesai dari menu Settlement akan otomatis muncul
        di sini.
      </p>
    </div>
  );
}

export default function HarvestPage() {
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:3001/sales");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil data penjualan.");
      }

      const completedSales = Array.isArray(data)
        ? data.filter((sale: Sale) => sale.status === "COMPLETED")
        : [];

      setSales(completedSales);
    } catch (error) {
      console.error("Gagal mengambil data harvest:", error);

      setError(
        error instanceof Error ? error.message : "Gagal mengambil data panen.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const commodities = useMemo(() => {
    const map = new Map<number, Commodity>();

    sales.forEach((sale) => {
      if (sale.commodity) {
        map.set(sale.commodity.id, sale.commodity);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "id"),
    );
  }, [sales]);

  const filteredSales = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return sales.filter((sale) => {
      const farmName = sale.farm?.name ?? "";
      const commodityName = getCommodityName(sale);

      const matchesSearch =
        !keyword ||
        farmName.toLowerCase().includes(keyword) ||
        commodityName.toLowerCase().includes(keyword) ||
        String(sale.id).includes(keyword);

      const matchesCommodity =
        commodityFilter === "ALL" ||
        String(sale.commodityId) === commodityFilter;

      return matchesSearch && matchesCommodity;
    });
  }, [sales, search, commodityFilter]);

  const summary = useMemo(() => {
    const totalWeight = sales.reduce(
      (total, sale) => total + Number(sale.totalWeightKg ?? 0),
      0,
    );

    const sawitWeight = sales
      .filter((sale) => isCommodity(sale, "Sawit"))
      .reduce((total, sale) => total + Number(sale.totalWeightKg ?? 0), 0);

    const karetWeight = sales
      .filter((sale) => isCommodity(sale, "Karet"))
      .reduce((total, sale) => total + Number(sale.totalWeightKg ?? 0), 0);

    const currentMonth = new Date();
    const currentMonthKey = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1,
    ).padStart(2, "0")}`;

    const monthlyWeight = sales
      .filter((sale) => getMonthKey(sale.saleDate) === currentMonthKey)
      .reduce((total, sale) => total + Number(sale.totalWeightKg ?? 0), 0);

    return {
      totalWeight,
      sawitWeight,
      karetWeight,
      monthlyWeight,
      totalRecords: sales.length,
    };
  }, [sales]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="mb-6 sm:mb-8">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
              Harvest
            </p>

            <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              Panen
            </h1>

            <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
              Riwayat hasil panen dari penjualan yang telah selesai
            </p>
          </div>
        </header>

        {/* =====================================================
            SOURCE INFO
        ====================================================== */}
        <section className="mb-5 flex items-start gap-3 rounded-[14px] border border-border bg-surface px-4 py-3.5 sm:px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-success-soft">
            <CircleCheck size={15} strokeWidth={1.8} className="text-success" />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-text-primary">
              Data otomatis dari Settlement
            </p>

            <p className="mt-0.5 text-[10px] leading-5 text-text-secondary">
              Hanya penjualan dengan status COMPLETED yang ditampilkan. Tidak
              perlu mencatat panen secara manual.
            </p>
          </div>
        </section>

        {/* =====================================================
            SUMMARY
        ====================================================== */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* SAWIT */}
          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-success-soft">
                <Wheat size={15} strokeWidth={1.8} className="text-success" />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total Sawit
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {formatWeight(summary.sawitWeight)}{" "}
              <span className="text-[13px] font-medium text-text-secondary">
                kg
              </span>
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Seluruh penjualan sawit selesai
            </p>
          </div>

          {/* KARET */}
          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-soft">
                <Wheat
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total Karet
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {formatWeight(summary.karetWeight)}{" "}
              <span className="text-[13px] font-medium text-text-secondary">
                kg
              </span>
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Seluruh penjualan karet selesai
            </p>
          </div>

          {/* TOTAL */}
          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-soft">
                <Wheat
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total Berat
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {formatWeight(summary.totalWeight)}{" "}
              <span className="text-[13px] font-medium text-text-secondary">
                kg
              </span>
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Sawit + karet
            </p>
          </div>

          {/* RECORDS */}
          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-soft">
                <CalendarDays
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Penjualan Selesai
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {summary.totalRecords}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              {formatWeight(summary.monthlyWeight)} kg bulan ini
            </p>
          </div>
        </section>

        {/* =====================================================
            HARVEST LIST
        ====================================================== */}
        <section className="mt-5 overflow-hidden rounded-[16px] border border-border bg-surface sm:mt-6">
          {/* Toolbar */}
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-text-primary sm:text-[14px]">
                  Semua Panen
                </h2>

                <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
                  Penjualan selesai yang tercatat melalui Settlement
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:flex">
                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    strokeWidth={1.8}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari panen..."
                    className="h-9 w-full rounded-[9px] border border-border bg-white pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A] sm:w-full xl:w-[220px]"
                  />
                </div>

                {/* Commodity filter */}
                <div className="relative">
                  <select
                    value={commodityFilter}
                    onChange={(event) => setCommodityFilter(event.target.value)}
                    className="h-9 w-full appearance-none rounded-[9px] border border-border bg-white pl-3 pr-9 text-[11px] font-medium text-text-secondary outline-none transition focus:border-[#5F9F4A] sm:w-auto sm:min-w-[150px]"
                  >
                    <option value="ALL">Semua Komoditas</option>

                    {commodities.map((commodity) => (
                      <option key={commodity.id} value={String(commodity.id)}>
                        {commodity.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={13}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border-b border-danger/20 bg-danger-soft px-4 py-3 text-[10px] leading-5 text-danger sm:px-5 sm:text-[11px]">
              {error}
            </div>
          )}

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    Tanggal
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    Komoditas
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    Kebun
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    Berat
                  </th>

                  <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-[11px] text-text-secondary"
                    >
                      Memuat data panen...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="transition hover:bg-surface-muted/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-[11px] text-text-secondary">
                        {formatDate(sale.saleDate)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-success-soft">
                            <Wheat
                              size={15}
                              strokeWidth={1.8}
                              className="text-success"
                            />
                          </div>

                          <div>
                            <p className="text-[12px] font-semibold text-text-primary">
                              {getCommodityName(sale) || "-"}
                            </p>

                            <p className="mt-0.5 text-[9px] text-text-muted">
                              Sale #{sale.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[11px] text-text-secondary">
                        {sale.farm?.name ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-[12px] font-semibold text-text-primary">
                          {formatWeight(sale.totalWeightKg)}{" "}
                          <span className="text-[10px] font-medium text-text-muted">
                            kg
                          </span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[9px] font-medium text-success">
                          <CircleCheck size={11} strokeWidth={1.9} />
                          Selesai
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {loading ? (
              <div className="px-5 py-14 text-center text-[11px] text-text-secondary">
                Memuat data panen...
              </div>
            ) : filteredSales.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-border">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-success-soft">
                        <Wheat
                          size={16}
                          strokeWidth={1.8}
                          className="text-success"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-text-primary">
                              {getCommodityName(sale) || "-"}
                            </p>

                            <p className="mt-0.5 text-[9px] text-text-muted">
                              Sale #{sale.id}
                            </p>
                          </div>

                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[8px] font-medium text-success">
                            <CircleCheck size={10} strokeWidth={1.9} />
                            Selesai
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 rounded-[10px] bg-surface-muted p-3">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">
                              Tanggal
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-text-secondary">
                              {formatDate(sale.saleDate)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">
                              Berat
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-text-primary">
                              {formatWeight(sale.totalWeightKg)} kg
                            </p>
                          </div>

                          <div className="col-span-2 border-t border-border pt-3">
                            <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">
                              Kebun
                            </p>

                            <p className="mt-1 truncate text-[10px] font-medium text-text-secondary">
                              {sale.farm?.name ?? "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <p className="text-[9px] text-text-muted sm:text-[10px]">
              Menampilkan{" "}
              <span className="font-medium text-text-secondary">
                {filteredSales.length}
              </span>{" "}
              penjualan selesai
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
