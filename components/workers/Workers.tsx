"use client";

import { useEffect, useState } from "react";

import styles from "./Workers.module.css";

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

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>Memuat data worker...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.state}>{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>WORKER MANAGEMENT</span>

            <h1>Worker</h1>

            <p>Kelola data worker yang terdaftar di AgroLedger.</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openCreateModal}
            >
              + Tambah Worker
            </button>
          </div>
        </header>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Total Worker</span>

            <strong>{workers.length}</strong>
          </div>

          <div className={styles.summaryCard}>
            <span>Status</span>

            <strong>Aktif</strong>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>WORKERS</span>

              <h2>Daftar Worker</h2>
            </div>

            <span className={styles.workerCount}>{workers.length} worker</span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NAMA WORKER</th>
                  <th>NO. TELEPON</th>
                  <th>STATUS</th>
                  <th>AKSI</th>
                </tr>
              </thead>

              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      Belum ada worker.
                    </td>
                  </tr>
                ) : (
                  workers.map((worker) => (
                    <tr key={worker.id}>
                      <td>{worker.id}</td>

                      <td className={styles.workerName}>{worker.name}</td>

                      <td className={styles.phone}>{worker.phone ?? "-"}</td>

                      <td>
                        <span className={styles.statusBadge}>Aktif</span>
                      </td>

                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => openEditModal(worker)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => openDeleteModal(worker)}
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
        </section>
      </div>

      {modal === "create" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>NEW WORKER</span>

                <h2>Tambah Worker</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <label>
                Nama Worker
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Masukkan nama worker"
                  disabled={submitting}
                />
              </label>

              <label>
                No. Telepon
                <input
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Opsional"
                  disabled={submitting}
                />
              </label>

              {actionError && <p className={styles.formError}>{actionError}</p>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeModal}
                disabled={submitting}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan Worker"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "edit" && selectedWorker && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>EDIT WORKER</span>

                <h2>Edit Worker</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <label>
                Nama Worker
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Masukkan nama worker"
                  disabled={submitting}
                />
              </label>

              <label>
                No. Telepon
                <input
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Opsional"
                  disabled={submitting}
                />
              </label>

              {actionError && <p className={styles.formError}>{actionError}</p>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeModal}
                disabled={submitting}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleUpdate}
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && selectedWorker && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>DELETE WORKER</span>

                <h2>Hapus Worker</h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <div className={styles.deleteContent}>
              <p>
                Apakah kamu yakin ingin menghapus worker{" "}
                <strong>{selectedWorker.name}</strong>?
              </p>

              <p className={styles.deleteWarning}>
                Worker yang sudah memiliki riwayat penjualan karet atau akun
                kasbon tidak dapat dihapus.
              </p>

              {actionError && <p className={styles.formError}>{actionError}</p>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeModal}
                disabled={submitting}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? "Menghapus..." : "Hapus Worker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
