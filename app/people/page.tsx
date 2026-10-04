"use client";

import {
  ArrowLeft,
  Check,
  Plus,
  Users,
  UserRound,
  ShieldUser,
  X,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getPeople,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
} from "@/lib/api";

type Person = {
  id: number;
  name: string;
  phone?: string | null;
  type?: string | null;
};

export default function PeoplePage() {
  const router = useRouter();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPeople = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPeople();
      setPeople(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal mengambil data person.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const openAddModal = () => {
    setName("");
    setPhone("");
    setType("");
    setError("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (isSaving) return;
    setShowAddModal(false);
    setName("");
    setPhone("");
    setType("");
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      const newPerson = await createPerson({ name: name.trim(), phone: phone.trim() || undefined, type: type.trim() || undefined });
      setPeople((c) => [...c, newPerson].sort((a, b) => a.name.localeCompare(b.name, "id")));
      closeAddModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan person.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----- Edit -----
  const openEditModal = (person: Person) => {
    setEditingPerson(person);
    setName(person.name);
    setPhone(person.phone ?? "");
    setType(person.type ?? "");
    setError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setShowEditModal(false);
    setEditingPerson(null);
    setName("");
    setPhone("");
    setType("");
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      const updated = await updatePerson(editingPerson.id, { name: name.trim(), phone: phone.trim() || undefined, type: type.trim() || undefined });
      setPeople((c) => c.map((p) => (p.id === editingPerson.id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name, "id")));
      closeEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui person.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----- Delete -----
  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true);
      await deletePerson(id);
      setPeople((c) => c.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus person.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ----- Derived data (hooks must run before any early return) -----
  const filteredPeople = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return people;

    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        (p.phone ?? "").toLowerCase().includes(keyword),
    );
  }, [people, search]);

  const workerCount = people.filter((p) => p.type === "WORKER").length;
  const relativeCount = people.filter((p) => p.type === "RELATIVE_OWNER").length;

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-success" />
            <p className="text-[11px] text-text-secondary">Memuat data person...</p>
          </div>
        </div>
      </main>
    );
  }

  const getTypeLabel = (type: string | null | undefined) => {
    if (!type) return null;
    if (type === "WORKER") return "Worker";
    if (type === "RELATIVE_OWNER") return "Pemilik Saudara";
    return type.replace(/_/g, " ");
  };

  const getTypeClass = (type: string | null | undefined) => {
    if (type === "WORKER")
      return "inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-medium text-success";
    if (type === "RELATIVE_OWNER")
      return "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-medium text-warning";
    return "inline-flex items-center rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-medium text-text-muted";
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =================================================
            HEADER
        ================================================== */}
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              People
            </p>

            <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[30px]">
              Daftar Orang
            </h1>

            <p className="mt-1.5 text-[12px] text-text-secondary">
              Kelola data person yang digunakan dalam kebun, settlement, dan
              kredit.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-surface px-4 text-[12px] font-medium text-white transition hover:bg-surface-soft active:scale-[0.99]"
          >
            <Plus size={15} />
            Tambah Person
          </button>
        </header>

        {/* =================================================
            SUMMARY
        ================================================== */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[12px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Total Person
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {people.length}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Seluruh data person
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-soft text-success">
                <Users size={17} />
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Worker
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {workerCount}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Person ber tipe worker
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-soft text-success">
                <UserRound size={17} />
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Pemilik Saudara
                </p>

                <p className="mt-2 text-[23px] font-semibold tracking-[-0.035em] text-text-primary">
                  {relativeCount}
                </p>

                <p className="mt-1 text-[10px] text-text-muted">
                  Person ber tipe pemilik saudara
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-warning-soft text-warning">
                <ShieldUser size={17} />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            MAIN CARD
        ================================================== */}
        <section className="overflow-hidden rounded-[14px] border border-border bg-surface">
          {/* CARD HEADER */}
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                People
              </p>

              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
                  Daftar Person
                </h2>

                <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-medium text-text-muted">
                  {people.length} person
                </span>
              </div>
            </div>

            <div className="relative w-full sm:w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                placeholder="Cari orang..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-[9px] border border-border bg-surface-muted pl-9 pr-3 text-[11px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-agro-primary focus:bg-surface"
              />
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Loader2 size={15} className="animate-spin" />
                Memuat data person...
              </div>
            </div>
          ) : error ? (
            /* ERROR */
            <div className="flex min-h-[300px] items-center justify-center px-5">
              <div className="rounded-[10px] bg-danger-soft px-4 py-3 text-center text-[11px] text-danger">
                {error}
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left">
                      <th className="w-[70px] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        No
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Person
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Telepon
                      </th>

                      <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Tipe
                      </th>

                      <th className="px-5 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPeople.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex min-h-[240px] flex-col items-center justify-center">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text-muted">
                              <UserRound size={18} />
                            </div>

                            <p className="text-[12px] font-medium text-text-primary">
                              {search
                                ? "Person tidak ditemukan"
                                : "Belum ada orang"}
                            </p>

                            <p className="mt-1 text-[11px] text-text-muted">
                              {search
                                ? "Coba gunakan kata kunci lain."
                                : "Tambahkan orang untuk dipakai sebagai Owner, Worker, atau pihak Credit."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPeople.map((p, index) => (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-surface-soft"
                        >
                          <td className="px-5 py-4 text-[11px] text-text-muted">
                            {String(index + 1).padStart(2, "0")}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] font-semibold text-success">
                                {getInitials(p.name)}
                              </div>

                              <p className="text-[12px] font-semibold text-text-primary">
                                {p.name}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[11px] text-text-muted">
                            {p.phone ?? "Tidak ada nomor telepon"}
                          </td>

                          <td className="px-5 py-4">
                            <span className={getTypeClass(p.type)}>
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  p.type === "WORKER"
                                    ? "bg-success"
                                    : p.type === "RELATIVE_OWNER"
                                      ? "bg-warning-soft"
                                      : "bg-surface-muted"
                                }`}
                              />
                              {getTypeLabel(p.type) ?? "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPerson(p);
                                  setShowDeleteModal(true);
                                }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[10px] font-medium text-text-secondary transition hover:bg-danger-soft hover:text-danger"
                              >
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
                {filteredPeople.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center px-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-text-muted">
                      <UserRound size={18} />
                    </div>

                    <p className="text-[12px] font-medium text-text-primary">
                      {search
                        ? "Person tidak ditemukan"
                        : "Belum ada orang"}
                    </p>

                    <p className="mt-1 text-[11px] text-text-muted">
                      {search
                        ? "Coba gunakan kata kunci lain."
                        : "Tambahkan orang untuk dipakai sebagai Owner, Worker, atau pihak Credit."}
                    </p>
                  </div>
                ) : (
                  filteredPeople.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-4 transition hover:bg-surface-soft"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] font-semibold text-success">
                        {getInitials(p.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[12px] font-semibold text-text-primary">
                            {p.name}
                          </p>

                          <span className={getTypeClass(p.type)}>
                            {getTypeLabel(p.type) ?? "-"}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="truncate text-[10px] text-text-muted">
                            {p.phone ?? "Tidak ada nomor telepon"}
                          </span>

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="inline-flex h-7 items-center rounded-[7px] px-2 text-[10px] font-medium text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPerson(p);
                                setShowDeleteModal(true);
                              }}
                              className="inline-flex h-7 items-center rounded-[7px] px-2 text-[10px] font-medium text-text-secondary transition hover:bg-danger-soft hover:text-danger"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] px-4">
            <div className="w-full max-w-md overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
              <div className="flex items-start justify-between border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold text-text-primary">Tambah Person</h2>
                <button type="button" onClick={closeAddModal} className="text-text-muted hover:text-text-primary" disabled={isSaving}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Nama</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Telepon (opsional)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Tipe (opsional)</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
                  <button type="button" onClick={closeAddModal} disabled={isSaving} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                    Batal
                  </button>
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-[9px] bg-success-soft px-4 py-2 text-sm font-semibold text-white hover:bg-success-soft">
                    {isSaving ? "Menyimpan..." : <><Check size={14} /> Simpan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] px-4">
            <div className="w-full max-w-md overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
              <div className="flex items-start justify-between border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold text-text-primary">Edit Person</h2>
                <button type="button" onClick={closeEditModal} className="text-text-muted hover:text-text-primary" disabled={isSaving}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Nama</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Telepon (opsional)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-text-secondary">Tipe (opsional)</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary focus:border-border"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
                  <button type="button" onClick={closeEditModal} disabled={isSaving} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                    Batal
                  </button>
                  <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-[9px] bg-success-soft px-4 py-2 text-sm font-semibold text-white hover:bg-success-soft">
                    {isSaving ? "Menyimpan..." : <><Check size={14} /> Simpan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
