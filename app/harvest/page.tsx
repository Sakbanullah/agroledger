"use client";

import {
  CalendarDays,
  ChevronDown,
  CirclePlus,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Wheat,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createHarvest,
  deleteHarvest,
  getCommodities,
  getFarms,
  getHarvests,
  updateHarvest,
} from "@/lib/api";

type Farm = {
  id: number;
  name: string;
};

type Commodity = {
  id: number;
  name: string;
};

type Harvest = {
  id: number;
  farmId: number;
  commodityId: number;
  harvestDate: string;
  weightKg: number | string;
  farm?: Farm;
  commodity?: Commodity;
};

type HarvestForm = {
  farmId: string;
  commodityId: string;
  harvestDate: string;
  weightKg: string;
};

function formatWeight(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(Number(value));
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

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function HarvestPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);

  const [showDelete, setShowDelete] = useState(false);

  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [form, setForm] = useState<HarvestForm>({
    farmId: "",
    commodityId: "",
    harvestDate: getToday(),
    weightKg: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [harvestData, farmData, commodityData] = await Promise.all([
        getHarvests(),
        getFarms(),
        getCommodities(),
      ]);

      setHarvests(Array.isArray(harvestData) ? harvestData : []);

      setFarms(Array.isArray(farmData) ? farmData : []);

      setCommodities(Array.isArray(commodityData) ? commodityData : []);
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

  const openCreateForm = () => {
    setEditingHarvest(null);

    setForm({
      farmId: farms[0] ? String(farms[0].id) : "",
      commodityId: commodities[0] ? String(commodities[0].id) : "",
      harvestDate: getToday(),
      weightKg: "",
    });

    setError("");
    setShowForm(true);
  };

  const openEditForm = (harvest: Harvest) => {
    setEditingHarvest(harvest);

    setForm({
      farmId: String(harvest.farmId),
      commodityId: String(harvest.commodityId),
      harvestDate: harvest.harvestDate.split("T")[0],
      weightKg: String(harvest.weightKg),
    });

    setError("");
    setOpenMenuId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingHarvest(null);
    setError("");
  };

  const openDeleteModal = (harvest: Harvest) => {
    setSelectedHarvest(harvest);
    setOpenMenuId(null);
    setShowDelete(true);
  };

  const closeDeleteModal = () => {
    if (saving) return;

    setShowDelete(false);
    setSelectedHarvest(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!form.farmId) {
      setError("Kebun wajib dipilih.");
      return;
    }

    if (!form.commodityId) {
      setError("Komoditas wajib dipilih.");
      return;
    }

    if (!form.harvestDate) {
      setError("Tanggal panen wajib diisi.");
      return;
    }

    const numericWeight = Number(form.weightKg);

    if (!numericWeight || numericWeight <= 0) {
      setError("Berat panen harus lebih besar dari 0.");
      return;
    }

    try {
      setSaving(true);

      if (editingHarvest) {
        await updateHarvest(editingHarvest.id, {
          farmId: Number(form.farmId),
          commodityId: Number(form.commodityId),
          harvestDate: form.harvestDate,
          weightKg: numericWeight,
        });
      } else {
        await createHarvest({
          farmId: Number(form.farmId),
          commodityId: Number(form.commodityId),
          harvestDate: form.harvestDate,
          weightKg: numericWeight,
        });
      }

      await loadData();

      closeForm();
    } catch (error) {
      console.error("Gagal menyimpan panen:", error);

      setError(
        error instanceof Error ? error.message : "Gagal menyimpan data panen.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHarvest) return;

    try {
      setSaving(true);
      setError("");

      await deleteHarvest(selectedHarvest.id);

      await loadData();

      closeDeleteModal();
    } catch (error) {
      console.error("Gagal menghapus panen:", error);

      setError(
        error instanceof Error ? error.message : "Gagal menghapus data panen.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredHarvests = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return harvests.filter((harvest) => {
      const farmName = harvest.farm?.name ?? "";

      const commodityName = harvest.commodity?.name ?? "";

      const matchesSearch =
        !keyword ||
        farmName.toLowerCase().includes(keyword) ||
        commodityName.toLowerCase().includes(keyword);

      const matchesCommodity =
        commodityFilter === "ALL" ||
        String(harvest.commodityId) === commodityFilter;

      return matchesSearch && matchesCommodity;
    });
  }, [harvests, search, commodityFilter]);

  const summary = useMemo(() => {
    const totalWeight = harvests.reduce(
      (total, harvest) => total + Number(harvest.weightKg),
      0,
    );

    const currentMonth = new Date();

    const currentMonthKey = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1,
    ).padStart(2, "0")}`;

    const monthlyWeight = harvests
      .filter((harvest) => getMonthKey(harvest.harvestDate) === currentMonthKey)
      .reduce((total, harvest) => total + Number(harvest.weightKg), 0);

    return {
      totalWeight,
      monthlyWeight,
      totalRecords: harvests.length,
    };
  }, [harvests]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
              Harvest
            </p>

            <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              Panen
            </h1>

            <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
              Riwayat dan pencatatan hasil panen
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-[12px] font-medium text-white transition hover:bg-[#26362B] sm:w-auto"
          >
            <CirclePlus size={15} strokeWidth={1.9} />
            Tambah Panen
          </button>
        </header>

        {/* =====================================================
            SUMMARY
        ====================================================== */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-success-soft">
                <Wheat size={15} strokeWidth={1.8} className="text-success" />
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
              Seluruh hasil panen tercatat
            </p>
          </div>

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
                Bulan Ini
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {formatWeight(summary.monthlyWeight)}{" "}
              <span className="text-[13px] font-medium text-text-secondary">
                kg
              </span>
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Berat panen bulan berjalan
            </p>
          </div>

          <div className="rounded-[16px] border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-soft">
                <CirclePlus
                  size={15}
                  strokeWidth={1.8}
                  className="text-text-secondary"
                />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Catatan Panen
              </p>
            </div>

            <p className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
              {summary.totalRecords}
            </p>

            <p className="mt-1 text-[10px] text-text-secondary sm:text-[11px]">
              Total catatan hasil panen
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
                  Riwayat hasil panen yang tercatat
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

          {/* Desktop / Tablet Table */}
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

                  <th className="w-[70px] px-5 py-3" />
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
                ) : filteredHarvests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  filteredHarvests.map((harvest) => (
                    <tr
                      key={harvest.id}
                      className="transition hover:bg-surface-muted/60"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-[11px] text-text-secondary">
                        {formatDate(harvest.harvestDate)}
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

                          <p className="text-[12px] font-semibold text-text-primary">
                            {harvest.commodity?.name ?? "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[11px] text-text-secondary">
                        {harvest.farm?.name ?? "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="text-[12px] font-semibold text-text-primary">
                          {formatWeight(harvest.weightKg)}{" "}
                          <span className="text-[10px] font-medium text-text-muted">
                            kg
                          </span>
                        </span>
                      </td>

                      <td className="relative px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === harvest.id ? null : harvest.id,
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                          aria-label="Menu panen"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.8} />
                        </button>

                        {openMenuId === harvest.id && (
                          <div className="absolute right-5 top-[48px] z-20 w-[140px] overflow-hidden rounded-[10px] border border-border bg-white p-1.5 text-left shadow-[0_10px_30px_rgba(23,34,27,0.10)]">
                            <button
                              type="button"
                              onClick={() => openEditForm(harvest)}
                              className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-[11px] text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
                            >
                              <Pencil size={13} strokeWidth={1.8} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(harvest)}
                              className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-[11px] text-danger transition hover:bg-danger-soft"
                            >
                              <Trash2 size={13} strokeWidth={1.8} />
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              MOBILE LIST
          ================================================== */}
          <div className="md:hidden">
            {loading ? (
              <div className="px-5 py-14 text-center text-[11px] text-text-secondary">
                Memuat data panen...
              </div>
            ) : filteredHarvests.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <EmptyState />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredHarvests.map((harvest) => (
                  <div key={harvest.id} className="relative px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-success-soft">
                          <Wheat
                            size={16}
                            strokeWidth={1.8}
                            className="text-success"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-text-primary">
                            {harvest.commodity?.name ?? "-"}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-text-secondary">
                            {harvest.farm?.name ?? "-"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === harvest.id ? null : harvest.id,
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-text-muted hover:bg-surface-soft"
                      >
                        <MoreHorizontal size={16} strokeWidth={1.8} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] bg-surface-muted p-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">
                          Tanggal
                        </p>

                        <p className="mt-1 text-[10px] font-medium text-text-secondary">
                          {formatDate(harvest.harvestDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">
                          Berat
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-text-primary">
                          {formatWeight(harvest.weightKg)} kg
                        </p>
                      </div>
                    </div>

                    {openMenuId === harvest.id && (
                      <div className="absolute right-4 top-[52px] z-20 w-[140px] overflow-hidden rounded-[10px] border border-border bg-white p-1.5 shadow-[0_10px_30px_rgba(23,34,27,0.10)]">
                        <button
                          type="button"
                          onClick={() => openEditForm(harvest)}
                          className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-[11px] text-text-secondary hover:bg-surface-muted"
                        >
                          <Pencil size={13} strokeWidth={1.8} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(harvest)}
                          className="flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-[11px] text-danger hover:bg-danger-soft"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                          Hapus
                        </button>
                      </div>
                    )}
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
                {filteredHarvests.length}
              </span>{" "}
              catatan panen
            </p>
          </div>
        </section>
      </div>

      {/* =======================================================
          ADD / EDIT HARVEST MODAL
      ======================================================== */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17221B]/20 p-3 backdrop-blur-[6px] sm:p-5"
          onMouseDown={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[calc(100vh-24px)] w-full max-w-[500px] flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-[0_24px_80px_rgba(23,34,27,0.18)] sm:max-h-[calc(100vh-40px)] sm:rounded-[18px]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-border bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-text-muted sm:text-[9px]">
                  Harvest Record
                </p>

                <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary sm:text-[16px]">
                  {editingHarvest ? "Edit Panen" : "Tambah Panen"}
                </h2>

                <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
                  Catat hasil panen yang baru dilakukan
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-text-muted transition hover:bg-surface-soft hover:text-text-primary disabled:opacity-50"
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8F5] p-3 sm:p-5">
                <div className="rounded-[14px] border border-border bg-white sm:rounded-[16px]">
                  <div className="space-y-5 p-4 sm:space-y-6 sm:p-5">
                    {/* Farm */}
                    <div>
                      <label
                        htmlFor="farm"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Kebun
                      </label>

                      <div className="relative">
                        <select
                          id="farm"
                          value={form.farmId}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              farmId: event.target.value,
                            }))
                          }
                          className="h-10 w-full appearance-none rounded-[9px] border border-border bg-white px-3 pr-9 text-[11px] text-text-primary outline-none transition focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[12px]"
                        >
                          <option value="">Pilih kebun</option>

                          {farms.map((farm) => (
                            <option key={farm.id} value={String(farm.id)}>
                              {farm.name}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={14}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                      </div>
                    </div>

                    {/* Commodity */}
                    <div>
                      <label
                        htmlFor="commodity"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Komoditas
                      </label>

                      <div className="relative">
                        <select
                          id="commodity"
                          value={form.commodityId}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              commodityId: event.target.value,
                            }))
                          }
                          className="h-10 w-full appearance-none rounded-[9px] border border-border bg-white px-3 pr-9 text-[11px] text-text-primary outline-none transition focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[12px]"
                        >
                          <option value="">Pilih komoditas</option>

                          {commodities.map((commodity) => (
                            <option
                              key={commodity.id}
                              value={String(commodity.id)}
                            >
                              {commodity.name}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={14}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        htmlFor="harvest-date"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Tanggal Panen
                      </label>

                      <div className="relative">
                        <input
                          id="harvest-date"
                          type="date"
                          value={form.harvestDate}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              harvestDate: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[11px] text-text-primary outline-none transition focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[12px]"
                        />

                        <CalendarDays
                          size={15}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                        />
                      </div>
                    </div>

                    {/* Weight */}
                    <div>
                      <label
                        htmlFor="weight"
                        className="mb-2 block text-[10px] font-medium text-text-primary sm:text-[11px]"
                      >
                        Berat Panen
                      </label>

                      <div className="relative">
                        <input
                          id="weight"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={form.weightKg}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              weightKg: event.target.value,
                            }))
                          }
                          placeholder="0"
                          className="h-10 w-full rounded-[9px] border border-border bg-white pl-3 pr-12 text-[12px] font-medium text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A] focus:ring-2 focus:ring-[#EAF3E6] sm:h-11 sm:text-[13px]"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-muted">
                          kg
                        </span>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="rounded-[10px] border border-danger/20 bg-danger-soft px-3.5 py-3 text-[10px] leading-5 text-danger sm:text-[11px]">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border bg-white p-3 sm:p-4 sm:px-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="h-10 rounded-[10px] border border-border bg-white text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted disabled:opacity-50 sm:text-[12px]"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-[10px] bg-[#17221B] text-[11px] font-medium text-white transition hover:bg-[#26362B] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[12px]"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingHarvest
                        ? "Simpan Perubahan"
                        : "Simpan Panen"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          DELETE MODAL
      ======================================================== */}
      {showDelete && selectedHarvest && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#17221B]/20 p-4 backdrop-blur-[6px]"
          onMouseDown={closeDeleteModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[390px] rounded-[16px] border border-border bg-white p-5 shadow-[0_24px_80px_rgba(23,34,27,0.18)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-danger-soft">
              <Trash2 size={17} strokeWidth={1.8} className="text-danger" />
            </div>

            <h2 className="mt-4 text-[15px] font-semibold text-text-primary">
              Hapus catatan panen?
            </h2>

            <p className="mt-1.5 text-[11px] leading-5 text-text-secondary">
              Catatan{" "}
              <span className="font-medium text-text-primary">
                {selectedHarvest.commodity?.name ?? "panen"}
              </span>{" "}
              seberat{" "}
              <span className="font-medium text-text-primary">
                {formatWeight(selectedHarvest.weightKg)} kg
              </span>{" "}
              akan dihapus secara permanen.
            </p>

            {error && (
              <div className="mt-4 rounded-[10px] border border-danger/20 bg-danger-soft px-3 py-2.5 text-[10px] leading-5 text-danger">
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={saving}
                className="h-10 rounded-[10px] border border-border text-[11px] font-medium text-text-secondary transition hover:bg-surface-muted disabled:opacity-50 sm:text-[12px]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-10 rounded-[10px] bg-danger text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-60 sm:text-[12px]"
              >
                {saving ? "Menghapus..." : "Hapus Panen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-soft">
        <Wheat size={18} strokeWidth={1.7} className="text-text-muted" />
      </div>

      <p className="mt-3 text-[12px] font-medium text-text-primary">
        Belum ada catatan panen
      </p>

      <p className="mx-auto mt-1 max-w-[280px] text-[10px] leading-5 text-text-secondary">
        Tambahkan hasil panen untuk mulai mencatat aktivitas kebun.
      </p>
    </>
  );
}
