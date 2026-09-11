"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Weight,
  X,
} from "lucide-react";

interface Worker {
  id: number;
  name: string;
  phone?: string | null;
  type?: string | null;
}

interface Sale {
  id: number;
  saleDate: string;
  status: string;
  totalWeightKg: string | null;
  farm: {
    id: number;
    name: string;
  };
  commodity: {
    id: number;
    name: string;
  };
}

interface WorkerRow {
  id: string;
  workerId: number;
  pieces: string;
  weightKg: string;
}

interface SaleManualProps {
  saleId: number;
}

export default function SaleManual({ saleId }: SaleManualProps) {
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rows, setRows] = useState<WorkerRow[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [saleResponse, workersResponse] = await Promise.all([
          fetch(`http://localhost:3001/sales/${saleId}`),
          fetch("http://localhost:3001/workers"),
        ]);

        const saleData = await saleResponse.json();
        const workersData = await workersResponse.json();

        if (!saleResponse.ok) {
          throw new Error(
            saleData.message || "Gagal mengambil data penjualan.",
          );
        }

        if (!workersResponse.ok) {
          throw new Error(
            workersData.message || "Gagal mengambil data worker.",
          );
        }

        if (saleData.status !== "PENDING") {
          throw new Error(
            "Penjualan ini sudah selesai dan tidak dapat diubah.",
          );
        }

        if (saleData.commodity?.name !== "Karet") {
          throw new Error(
            "Input manual worker hanya tersedia untuk komoditas Karet.",
          );
        }

        setSale(saleData);
        setWorkers(Array.isArray(workersData) ? workersData : []);
      } catch (err) {
        console.error(err);

        setError(err instanceof Error ? err.message : "Gagal mengambil data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [saleId]);

  const selectedWorkerIds = useMemo(
    () => rows.map((row) => row.workerId),
    [rows],
  );

  const availableWorkers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return workers.filter((worker) => {
      const alreadySelected = selectedWorkerIds.includes(worker.id);

      if (alreadySelected) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        worker.name.toLowerCase().includes(keyword) ||
        worker.phone?.toLowerCase().includes(keyword)
      );
    });
  }, [workers, selectedWorkerIds, search]);

  const totalWeight = useMemo(
    () => rows.reduce((total, row) => total + Number(row.weightKg || 0), 0),
    [rows],
  );

  const totalPieces = useMemo(
    () => rows.reduce((total, row) => total + Number(row.pieces || 0), 0),
    [rows],
  );

  const addWorker = (worker: Worker) => {
    setRows((currentRows) => [
      ...currentRows,
      {
        id: crypto.randomUUID(),
        workerId: worker.id,
        pieces: "",
        weightKg: "",
      },
    ]);

    setSearch("");
    setPickerOpen(false);
    setError("");
  };

  const removeWorker = (rowId: string) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
  };

  const updateRow = (
    rowId: string,
    field: "pieces" | "weightKg",
    value: string,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const getWorker = (workerId: number) =>
    workers.find((worker) => worker.id === workerId);

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    if (!sale) return;

    if (rows.length === 0) {
      setError("Pilih minimal satu worker.");
      return;
    }

    for (const row of rows) {
      if (!row.pieces || Number(row.pieces) <= 0) {
        setError("Jumlah keping setiap worker harus lebih dari 0.");
        return;
      }

      if (!row.weightKg || Number(row.weightKg) <= 0) {
        setError("Berat setiap worker harus lebih dari 0 kg.");
        return;
      }
    }

    if (totalWeight <= 0) {
      setError("Total berat harus lebih dari 0 kg.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        "http://localhost:3001/rubber-workers/save-scanned",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saleId,
            workers: rows.map((row) => ({
              workerId: row.workerId,
              pieces: Number(row.pieces),
              weightKg: Number(row.weightKg),
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Gagal menyimpan worker.",
        );
      }

      setSuccess(true);

      setTimeout(() => {
        router.push(`/settlement/sale/${saleId}/confirm`);
      }, 400);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Gagal menyimpan data worker.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data penjualan...
          </div>
        </div>
      </main>
    );
  }

  if (error && !sale) {
    return (
      <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 sm:pt-6 lg:px-7">
        <div className="w-full">
          <button
            type="button"
            onClick={() => router.push("/settlement")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Penjualan
          </button>

          <div className="rounded-[12px] border border-[#E8C5C0] bg-[#FFF3F1] px-4 py-4 text-sm font-medium text-[#B5473A]">
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="w-full">
          <button
            type="button"
            onClick={() => router.push("/settlement")}
            disabled={isSaving}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-text-primary disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Penjualan
          </button>

          <header className="mb-7">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3F7635]">
              <span>SALE #{saleId}</span>
              <span className="text-text-muted">/</span>
              <span>INPUT MANUAL</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-text-primary sm:text-3xl">
              Input Hasil Penjualan
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Pilih worker yang ikut dalam penjualan, lalu masukkan jumlah
              keping dan beratnya.
            </p>
          </header>

          {sale && (
            <section className="mb-5 rounded-[14px] border border-border bg-white">
              <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-5 py-4">
                  <p className="text-xs text-text-muted">Kebun</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">
                    {sale.farm?.name ?? "-"}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs text-text-muted">Komoditas</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">
                    {sale.commodity?.name ?? "-"}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs text-text-muted">Tanggal</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">
                    {new Date(sale.saleDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </section>
          )}

          {error && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-[12px] border border-[#E8C5C0] bg-[#FFF3F1] px-4 py-3 text-sm font-medium text-[#B5473A]">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2 rounded-[12px] border border-[#CFE1CA] bg-[#EEF6EB] px-4 py-3 text-sm font-medium text-[#3F7635]">
              <Check className="h-4 w-4" />
              Data worker berhasil disimpan. Melanjutkan...
            </div>
          )}

          <section className="rounded-[14px] border border-border bg-white">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-xs font-bold text-[#3F7635]">
                  01
                </div>

                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Worker
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Tambahkan worker yang ikut dalam hasil penjualan ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {rows.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#C9D5C5] bg-[#FBFCFA] px-5 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#EAF3E7] text-[#3F7635]">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-text-primary">
                    Belum ada worker
                  </h3>

                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-secondary">
                    Pilih worker untuk mulai mencatat hasil penjualan.
                  </p>

                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={workers.length === 0 || isSaving}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-sm font-semibold text-white transition hover:bg-[#26352B] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Pilih Worker
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {rows.map((row, index) => {
                      const worker = getWorker(row.workerId);

                      return (
                        <div
                          key={row.id}
                          className="rounded-[12px] border border-border bg-[#FBFCFA] p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-[#3F7635]">
                                <UserRound className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">
                                  {worker?.name ?? "Worker"}
                                </p>

                                <p className="mt-0.5 text-xs text-text-muted">
                                  Worker #{index + 1}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeWorker(row.id)}
                              disabled={isSaving}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-text-muted transition hover:bg-[#FFF3F1] hover:text-[#B5473A] disabled:opacity-50"
                              title="Hapus worker"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs font-medium text-text-secondary">
                                Jumlah Keping
                              </label>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={row.pieces}
                                onChange={(event) =>
                                  updateRow(
                                    row.id,
                                    "pieces",
                                    event.target.value,
                                  )
                                }
                                placeholder="0"
                                disabled={isSaving}
                                className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F4F5F3]"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-medium text-text-secondary">
                                Berat
                              </label>

                              <div className="relative">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={row.weightKg}
                                  onChange={(event) =>
                                    updateRow(
                                      row.id,
                                      "weightKg",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  disabled={isSaving}
                                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 pr-12 text-sm text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F4F5F3]"
                                />

                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                                  kg
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={availableWorkers.length === 0 || isSaving}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-semibold text-text-primary transition hover:border-[#B8CBB2] hover:bg-[#F7F9F6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Pilih Worker
                  </button>

                  {availableWorkers.length === 0 && workers.length > 0 && (
                    <p className="mt-2 text-xs text-text-muted">
                      Semua worker sudah dipilih.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-[14px] border border-border bg-white">
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-[#3F7635]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-text-muted">Total Worker</p>

                  <p className="mt-0.5 text-xl font-semibold text-text-primary">
                    {rows.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-[#3F7635]">
                  <Weight className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-text-muted">Total Berat</p>

                  <p className="mt-0.5 text-xl font-semibold text-text-primary">
                    {totalWeight.toLocaleString("id-ID")}{" "}
                    <span className="text-sm font-medium text-text-secondary">
                      kg
                    </span>
                  </p>

                  <p className="mt-0.5 text-xs text-text-muted">
                    {totalPieces.toLocaleString("id-ID")} keping
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-text-muted">
              Pastikan berat dan jumlah keping sudah sesuai catatan sebelum
              melanjutkan.
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || rows.length === 0 || totalWeight <= 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-5 text-sm font-semibold text-white transition hover:bg-[#26352B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  Simpan & Lanjutkan
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPickerOpen(false);
              setSearch("");
            }
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(23,34,27,0.14)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Pilih Worker
                </h2>

                <p className="mt-1 text-xs text-text-secondary">
                  Worker yang sudah dipilih tidak akan muncul lagi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setSearch("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition hover:bg-[#F4F5F3] hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama worker..."
                  className="h-11 w-full rounded-[10px] border border-border bg-white pl-10 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2]"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {availableWorkers.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F4F5F3] text-text-muted">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-text-primary">
                    Worker tidak ditemukan
                  </p>

                  <p className="mt-1 text-xs text-text-secondary">
                    Coba gunakan nama lain.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableWorkers.map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => addWorker(worker)}
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition hover:bg-[#F5F8F3]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-[#3F7635]">
                        <UserRound className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {worker.name}
                        </p>

                        {worker.phone && (
                          <p className="mt-0.5 text-xs text-text-muted">
                            {worker.phone}
                          </p>
                        )}
                      </div>

                      <Plus className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-[#FBFCFA] px-5 py-3">
              <p className="text-xs text-text-muted">
                {availableWorkers.length} worker tersedia
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
