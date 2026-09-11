"use client";

import {
  AlertTriangle,
  Check,
  Ellipsis,
  LandPlot,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Farm = {
  id: number;
  name: string;
  location: string | null;
};

export default function FarmList() {
  const [farms, setFarms] = useState<Farm[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:3001/farms");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil data ladang.");
      }

      setFarms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Gagal mengambil data ladang.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const openAddModal = () => {
    setName("");
    setLocation("");
    setError("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (isSaving) return;

    setShowAddModal(false);
    setName("");
    setLocation("");
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName) {
      setError("Nama ladang wajib diisi.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Nama ladang minimal 2 karakter.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch("http://localhost:3001/farms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          ...(trimmedLocation && {
            location: trimmedLocation,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Gagal menambahkan ladang.",
        );
      }

      setFarms((current) =>
        [...current, data].sort((a, b) => a.name.localeCompare(b.name, "id")),
      );

      closeAddModal();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Gagal menambahkan ladang.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (farm: Farm) => {
    setSelectedFarm(farm);
    setError("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;

    setShowDeleteModal(false);
    setSelectedFarm(null);
  };

  const handleDelete = async () => {
    if (!selectedFarm) return;

    try {
      setIsDeleting(true);
      setError("");

      const response = await fetch(
        `http://localhost:3001/farms/${selectedFarm.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message || "Ladang tidak dapat dihapus.",
        );
      }

      setFarms((current) =>
        current.filter((farm) => farm.id !== selectedFarm.id),
      );

      closeDeleteModal();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Ladang tidak dapat dihapus.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted sm:text-[10px]">
            Farm
          </p>

          <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-text-primary sm:text-[24px]">
            Ladang
          </h1>

          <p className="mt-1 text-[11px] text-text-secondary sm:text-[12px]">
            Kelola ladang yang digunakan dalam AgroLedger
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] bg-[#3F7635] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#35642D] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Tambah Ladang
        </button>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}
      {error && !showAddModal && !showDeleteModal && (
        <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />

          <p className="text-[10px] leading-5 text-danger sm:text-[11px]">
            {error}
          </p>
        </div>
      )}

      {/* =====================================================
          FARM LIST
      ====================================================== */}
      <section className="mt-6 overflow-hidden rounded-[16px] border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[13px] font-semibold text-text-primary sm:text-[14px]">
              Ladang Terdaftar
            </h2>

            <p className="mt-0.5 text-[10px] text-text-secondary sm:text-[11px]">
              {farms.length} ladang terdaftar
            </p>
          </div>

          <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-soft px-2.5 text-[10px] font-semibold text-text-secondary">
            {farms.length}
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-[11px] text-text-secondary">
            Memuat data ladang...
          </div>
        ) : farms.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-success-soft">
              <LandPlot size={19} strokeWidth={1.7} className="text-success" />
            </div>

            <p className="mt-4 text-[12px] font-semibold text-text-primary">
              Belum ada ladang
            </p>

            <p className="mt-1 max-w-[280px] text-center text-[10px] leading-5 text-text-secondary">
              Tambahkan ladang pertama untuk mulai mencatat aktivitas pertanian.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-[9px] border border-border bg-white px-3.5 text-[10px] font-semibold text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
            >
              <Plus size={13} />
              Tambah Ladang
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {farms.map((farm) => (
              <div
                key={farm.id}
                className="group flex items-center gap-3 px-4 py-4 transition hover:bg-surface-muted/50 sm:px-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-success-soft">
                  <LandPlot
                    size={17}
                    strokeWidth={1.8}
                    className="text-success"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-text-primary">
                    {farm.name}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <MapPin
                      size={11}
                      strokeWidth={1.8}
                      className="shrink-0 text-text-muted"
                    />

                    <p className="truncate text-[10px] text-text-secondary">
                      {farm.location || "Lokasi belum diisi"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDeleteModal(farm)}
                  title={`Hapus ${farm.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-text-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <Ellipsis size={16} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          ADD MODAL
      ====================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[440px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary">
                  Tambah Ladang
                </h2>

                <p className="mt-1 text-[10px] text-text-secondary">
                  Tambahkan ladang baru ke AgroLedger.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={isSaving}
                className="flex h-7 w-7 items-center justify-center rounded-[7px] text-text-muted transition hover:bg-surface-soft hover:text-text-primary disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="space-y-4 px-5 py-5">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-[10px] border border-danger/20 bg-danger-soft px-3 py-2.5">
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0 text-danger"
                    />

                    <p className="text-[10px] leading-5 text-danger">{error}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="farm-name"
                    className="mb-1.5 block text-[10px] font-semibold text-text-secondary"
                  >
                    Nama Ladang
                  </label>

                  <input
                    id="farm-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Kebun Sawit Utama"
                    autoFocus
                    className="h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="farm-location"
                    className="mb-1.5 block text-[10px] font-semibold text-text-secondary"
                  >
                    Lokasi
                    <span className="ml-1 font-normal text-text-muted">
                      (opsional)
                    </span>
                  </label>

                  <input
                    id="farm-location"
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Contoh: Banyuasin"
                    className="h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#5F9F4A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={isSaving}
                  className="h-9 rounded-[9px] px-3.5 text-[10px] font-semibold text-text-secondary transition hover:bg-white hover:text-text-primary disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#3F7635] px-4 text-[10px] font-semibold text-white transition hover:bg-[#35642D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <Check size={13} />
                      Simpan Ladang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
      ====================================================== */}
      {showDeleteModal && selectedFarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[400px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
            <div className="px-5 pb-2 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-danger-soft">
                <Trash2 size={17} strokeWidth={1.8} className="text-danger" />
              </div>

              <h2 className="mt-4 text-[14px] font-semibold text-text-primary">
                Hapus ladang?
              </h2>

              <p className="mt-1.5 text-[10px] leading-5 text-text-secondary">
                Kamu akan menghapus{" "}
                <span className="font-semibold text-text-primary">
                  {selectedFarm.name}
                </span>
                . Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            {error && (
              <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/20 bg-danger-soft px-3 py-2.5">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0 text-danger"
                />

                <p className="text-[10px] leading-5 text-danger">{error}</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3.5">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="h-9 rounded-[9px] px-3.5 text-[10px] font-semibold text-text-secondary transition hover:bg-white hover:text-text-primary disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-danger px-4 text-[10px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={13} />

                {isDeleting ? "Menghapus..." : "Hapus Ladang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
