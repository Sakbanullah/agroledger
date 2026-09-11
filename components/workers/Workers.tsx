"use client";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Worker = {
  id: number;
  name: string;
  phone: string | null;
  type: "WORKER";
  createdAt: string;
  updatedAt: string;
};

type ModalType = "create" | "edit" | "delete" | null;

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:3001/workers");

      if (!response.ok) {
        throw new Error("Gagal mengambil data worker");
      }

      const data: Worker[] = await response.json();
      setWorkers(data);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data worker.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return workers;

    return workers.filter(
      (worker) =>
        worker.name.toLowerCase().includes(keyword) ||
        worker.phone?.toLowerCase().includes(keyword),
    );
  }, [workers, search]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setActionError("");
    setSelectedWorker(null);
  };

  const closeModal = () => {
    if (submitting) return;

    setModal(null);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setModal("create");
  };

  const openEditModal = (worker: Worker) => {
    setSelectedWorker(worker);
    setName(worker.name);
    setPhone(worker.phone ?? "");
    setActionError("");
    setModal("edit");
  };

  const openDeleteModal = (worker: Worker) => {
    setSelectedWorker(worker);
    setActionError("");
    setModal("delete");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setActionError("Nama worker wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      const response = await fetch("http://localhost:3001/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal menambahkan worker.");
      }

      setModal(null);
      resetForm();
      await fetchWorkers();
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Gagal menambahkan worker.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedWorker) return;

    if (!name.trim()) {
      setActionError("Nama worker wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      const response = await fetch(
        `http://localhost:3001/workers/${selectedWorker.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim() || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengubah worker.");
      }

      setModal(null);
      resetForm();
      await fetchWorkers();
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Gagal mengubah worker.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorker) return;

    try {
      setSubmitting(true);
      setActionError("");

      const response = await fetch(
        `http://localhost:3001/workers/${selectedWorker.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal menghapus worker.");
      }

      setModal(null);
      resetForm();
      await fetchWorkers();
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Gagal menghapus worker.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-[10px] border border-border bg-white px-3.5 text-[13px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2]";

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* HEADER */}
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Worker Management
            </p>

            <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[30px]">
              Workers
            </h1>

            <p className="mt-1.5 text-[12px] text-text-secondary">
              Kelola data worker yang terdaftar di AgroLedger.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-4 text-[12px] font-medium text-white transition hover:bg-[#26352B] active:scale-[0.99]"
          >
            <Plus size={15} />
            Tambah Worker
          </button>
        </header>

        {/* SUMMARY */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Total Worker
                </p>

                <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-primary">
                  {workers.length}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6EFE2] text-[#3F7635]">
                <Users size={17} />
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Status
                </p>

                <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-[#3F7635]">
                  Aktif
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E6EFE2] text-[#3F7635]">
                <Check size={17} />
              </div>
            </div>
          </div>
        </section>

        {/* TABLE CARD */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                Workers
              </p>

              <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
                Daftar Worker
              </h2>
            </div>

            <div className="relative w-full sm:w-[230px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari worker..."
                className="h-9 w-full rounded-[9px] border border-border bg-[#F7F8F5] pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Loader2 size={15} className="animate-spin" />
                Memuat data worker...
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[260px] items-center justify-center px-5">
              <div className="rounded-[10px] bg-[#FFF4F2] px-4 py-3 text-center text-[12px] text-[#B5473A]">
                {error}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-border bg-[#FAFAF8] text-left">
                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        ID
                      </th>
                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Worker
                      </th>
                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Telepon
                      </th>
                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredWorkers.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex min-h-[220px] flex-col items-center justify-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F3EF] text-text-muted">
                              <UserRound size={18} />
                            </div>

                            <p className="text-[12px] font-medium text-text-primary">
                              {search
                                ? "Worker tidak ditemukan"
                                : "Belum ada worker"}
                            </p>

                            <p className="mt-1 text-[11px] text-text-muted">
                              {search
                                ? "Coba gunakan kata kunci lain."
                                : "Tambahkan worker untuk mulai mengelola data."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredWorkers.map((worker) => (
                        <tr
                          key={worker.id}
                          className="border-b border-border last:border-0 hover:bg-[#FCFCFA]"
                        >
                          <td className="px-5 py-4 text-[11px] text-text-muted">
                            #{worker.id}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6EFE2] text-[10px] font-semibold text-[#3F7635]">
                                {worker.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="text-[12px] font-semibold text-text-primary">
                                  {worker.name}
                                </p>
                                <p className="mt-0.5 text-[10px] text-text-muted">
                                  Worker
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[11px] text-text-secondary">
                            {worker.phone ?? "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3E7] px-2.5 py-1 text-[10px] font-medium text-[#3F7635]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#5B8F50]" />
                              Aktif
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(worker)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-text-secondary transition hover:bg-[#F1F3EF] hover:text-text-primary"
                              >
                                <Pencil size={13} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteModal(worker)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-[#B5473A] transition hover:bg-[#FFF2F0]"
                              >
                                <Trash2 size={13} />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">
                {filteredWorkers.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-5">
                    <UserRound size={20} className="mb-3 text-text-muted" />
                    <p className="text-[12px] font-medium text-text-primary">
                      {search ? "Worker tidak ditemukan" : "Belum ada worker"}
                    </p>
                  </div>
                ) : (
                  filteredWorkers.map((worker) => (
                    <div key={worker.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6EFE2] text-[10px] font-semibold text-[#3F7635]">
                            {worker.name
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-text-primary">
                              {worker.name}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-text-muted">
                              {worker.phone ?? "Tidak ada nomor telepon"}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#EAF3E7] px-2 py-1 text-[9px] font-medium text-[#3F7635]">
                          Aktif
                        </span>
                      </div>

                      <div className="mt-3 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(worker)}
                          className="rounded-[8px] px-3 py-2 text-[10px] font-medium text-text-secondary hover:bg-[#F1F3EF]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(worker)}
                          className="rounded-[8px] px-3 py-2 text-[10px] font-medium text-[#B5473A] hover:bg-[#FFF2F0]"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* MODAL */}
      {(modal === "create" || modal === "edit") && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onMouseDown={closeModal}
        >
          <div
            className="w-full max-w-[430px] rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(23,34,27,0.14)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                  {modal === "create" ? "New Worker" : "Edit Worker"}
                </p>

                <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-text-primary">
                  {modal === "create" ? "Tambah Worker" : "Edit Worker"}
                </h2>

                <p className="mt-1 text-[11px] text-text-secondary">
                  {modal === "create"
                    ? "Tambahkan worker baru ke AgroLedger."
                    : "Perbarui informasi worker."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-[#F1F3EF] hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-text-primary">
                  Nama Worker
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Masukkan nama worker"
                  disabled={submitting}
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-text-primary">
                  No. Telepon
                </label>

                <input
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Opsional"
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              {actionError && (
                <div className="rounded-[9px] bg-[#FFF3F1] px-3 py-2.5 text-[11px] text-[#B5473A]">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="h-9 rounded-[9px] px-3.5 text-[11px] font-medium text-text-secondary hover:bg-[#F1F3EF]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={modal === "create" ? handleCreate : handleUpdate}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#17221B] px-4 text-[11px] font-medium text-white hover:bg-[#26352B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {submitting
                  ? "Menyimpan..."
                  : modal === "create"
                    ? "Simpan Worker"
                    : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {modal === "delete" && selectedWorker && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onMouseDown={closeModal}
        >
          <div
            className="w-full max-w-[400px] rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(23,34,27,0.14)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF2F0] text-[#B5473A]">
                <Trash2 size={17} />
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                Delete Worker
              </p>

              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-text-primary">
                Hapus Worker?
              </h2>

              <p className="mt-2 text-[12px] leading-5 text-text-secondary">
                Apakah kamu yakin ingin menghapus{" "}
                <strong className="font-semibold text-text-primary">
                  {selectedWorker.name}
                </strong>
                ?
              </p>

              <div className="mt-4 rounded-[9px] bg-[#FFF8F6] px-3 py-2.5 text-[10px] leading-4 text-[#A14B40]">
                Worker yang sudah memiliki riwayat penjualan karet atau akun
                kasbon tidak dapat dihapus.
              </div>

              {actionError && (
                <div className="mt-3 rounded-[9px] bg-[#FFF3F1] px-3 py-2.5 text-[11px] text-[#B5473A]">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="h-9 rounded-[9px] px-3.5 text-[11px] font-medium text-text-secondary hover:bg-[#F1F3EF]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#B5473A] px-4 text-[11px] font-medium text-white hover:bg-[#963B31] disabled:opacity-60"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {submitting ? "Menghapus..." : "Hapus Worker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
