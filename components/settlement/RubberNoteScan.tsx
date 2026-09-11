"use client";

import { ChangeEvent, useEffect, useState } from "react";

interface RubberNoteScanProps {
  saleId: number;
}

interface WorkerMatch {
  id: number;
  name: string;
  phone: string | null;
  type: string;
  score: number;
}

interface ScannedWorker {
  name: string | null;
  pieces: number | null;
  weightKg: number | null;
  matches: WorkerMatch[];
  selectedWorkerId: number | null;
  confirmed: boolean;
}

interface ScanResponse {
  workers: Array<{
    name: string | null;
    pieces: number | null;
    weightKg: number | null;
    matches: WorkerMatch[];
  }>;
}

interface ConfirmedWorkerPayload {
  workerId: number;
  name: string;
  pieces: number;
  weightKg: number;
}

interface FinalReview {
  workers: ConfirmedWorkerPayload[];
  totalWeightKg: number;
}

export default function RubberNoteScan({ saleId }: RubberNoteScanProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [workers, setWorkers] = useState<ScannedWorker[]>([]);

  const [isScanning, setIsScanning] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [hasScanned, setHasScanned] = useState(false);

  const [showFinalReview, setShowFinalReview] = useState(false);

  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);

  const [showNewWorkerModal, setShowNewWorkerModal] = useState(false);

  const [newWorkerIndex, setNewWorkerIndex] = useState<number | null>(null);

  const [isCreatingWorker, setIsCreatingWorker] = useState(false);

  // =========================================================
  // PREVIEW CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // =========================================================
  // FILE
  // =========================================================

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError(null);
    setSaveSuccess(null);
    setHasScanned(false);
    setShowFinalReview(false);
    setFinalReview(null);
    setWorkers([]);

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  // =========================================================
  // SCAN
  // =========================================================

  const handleScan = async () => {
    if (!file) {
      setError("Pilih foto catatan terlebih dahulu.");
      return;
    }

    setIsScanning(true);
    setError(null);
    setSaveSuccess(null);
    setShowFinalReview(false);
    setFinalReview(null);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "http://localhost:3001/ai/scan/rubber-note",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal melakukan scan catatan.");
      }

      const result = data as ScanResponse;

      const scannedWorkers = result.workers.map((worker) => ({
        name: worker.name,
        pieces: worker.pieces,
        weightKg: worker.weightKg,
        matches: worker.matches,
        selectedWorkerId: null,
        confirmed: false,
      }));

      setWorkers(scannedWorkers);
      setHasScanned(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat scan.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  // =========================================================
  // UPDATE WORKER
  // =========================================================

  const updateWorker = (
    index: number,
    field: "name" | "pieces" | "weightKg",
    value: string,
  ) => {
    setWorkers((current) =>
      current.map((worker, workerIndex) => {
        if (workerIndex !== index) {
          return worker;
        }

        if (field === "name") {
          return {
            ...worker,
            name: value,
            selectedWorkerId: null,
            matches: [],
            confirmed: false,
          };
        }

        if (field === "pieces") {
          return {
            ...worker,
            pieces: value === "" ? null : Number(value),
            confirmed: false,
          };
        }

        return {
          ...worker,
          weightKg: value === "" ? null : Number(value),
          confirmed: false,
        };
      }),
    );
  };

  // =========================================================
  // SWAP
  // =========================================================

  const handleSwap = (index: number) => {
    setWorkers((current) =>
      current.map((worker, workerIndex) => {
        if (workerIndex !== index) {
          return worker;
        }

        return {
          ...worker,
          pieces: worker.weightKg,
          weightKg: worker.pieces,
          confirmed: false,
        };
      }),
    );
  };

  // =========================================================
  // SELECT WORKER
  // =========================================================

  const handleSelectWorker = (workerIndex: number, workerId: number) => {
    setWorkers((current) =>
      current.map((worker, index) => {
        if (index !== workerIndex) {
          return worker;
        }

        return {
          ...worker,
          selectedWorkerId: workerId,
          confirmed: false,
        };
      }),
    );
  };

  // =========================================================
  // CREATE NEW WORKER
  // =========================================================

  const handleCreateNewWorker = async () => {
    if (newWorkerIndex === null) {
      return;
    }

    const scannedWorker = workers[newWorkerIndex];

    const name = scannedWorker?.name?.trim();

    if (!name) {
      setError("Nama worker hasil scan tidak ditemukan.");
      return;
    }

    setIsCreatingWorker(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3001/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Gagal menambahkan worker baru.",
        );
      }

      if (!data.id || !data.name) {
        throw new Error("Response worker baru tidak valid.");
      }

      setWorkers((current) =>
        current.map((worker, index) =>
          index !== newWorkerIndex
            ? worker
            : {
                ...worker,
                selectedWorkerId: data.id,
                matches: [
                  {
                    id: data.id,
                    name: data.name,
                    phone: data.phone ?? null,
                    type: data.type ?? "WORKER",
                    score: 1,
                  },
                ],
                confirmed: true,
              },
        ),
      );

      setShowNewWorkerModal(false);
      setNewWorkerIndex(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan worker baru.",
      );
    } finally {
      setIsCreatingWorker(false);
    }
  };

  const openNewWorkerModal = (index: number) => {
    const worker = workers[index];

    if (!worker?.name?.trim()) {
      setError("Nama worker hasil scan tidak ditemukan.");
      return;
    }

    setNewWorkerIndex(index);
    setShowNewWorkerModal(true);
    setError(null);
  };

  // =========================================================
  // CONFIRM WORKER
  // =========================================================

  const handleConfirmWorker = (index: number) => {
    setWorkers((current) =>
      current.map((worker, workerIndex) => {
        if (workerIndex !== index) {
          return worker;
        }

        if (
          !worker.name?.trim() ||
          worker.pieces === null ||
          worker.weightKg === null ||
          worker.pieces <= 0 ||
          worker.weightKg <= 0 ||
          !worker.selectedWorkerId
        ) {
          return worker;
        }

        return {
          ...worker,
          confirmed: true,
        };
      }),
    );
  };

  // =========================================================
  // REVIEW DATA
  // =========================================================

  const totalWeight = workers.reduce(
    (total, worker) => total + (worker.weightKg ?? 0),
    0,
  );

  const confirmedCount = workers.filter((worker) => worker.confirmed).length;

  const allConfirmed =
    workers.length > 0 &&
    workers.every(
      (worker) =>
        worker.confirmed &&
        !!worker.name?.trim() &&
        worker.selectedWorkerId !== null &&
        worker.pieces !== null &&
        worker.pieces > 0 &&
        worker.weightKg !== null &&
        worker.weightKg > 0,
    );

  const handleContinue = () => {
    if (workers.length === 0) {
      setError("Tidak ada worker hasil scan.");
      return;
    }

    if (!allConfirmed) {
      setError(
        "Pastikan semua worker sudah dikonfirmasi dan data berat serta pieces sudah lengkap.",
      );
      return;
    }

    const workerIds = workers.map((worker) => worker.selectedWorkerId!);

    if (new Set(workerIds).size !== workerIds.length) {
      setError("Worker yang sama tidak boleh dipilih lebih dari satu kali.");
      return;
    }

    const confirmedWorkers: ConfirmedWorkerPayload[] = workers.map((worker) => {
      const selectedMatch = worker.matches.find(
        (match) => match.id === worker.selectedWorkerId,
      );

      return {
        workerId: worker.selectedWorkerId!,
        name: selectedMatch?.name ?? worker.name!,
        pieces: worker.pieces!,
        weightKg: worker.weightKg!,
      };
    });

    const totalWeightKg = confirmedWorkers.reduce(
      (total, worker) => total + worker.weightKg,
      0,
    );

    if (totalWeightKg <= 0) {
      setError("Total berat worker harus lebih dari 0.");
      return;
    }

    setFinalReview({
      workers: confirmedWorkers,
      totalWeightKg,
    });

    setShowFinalReview(true);
    setError(null);
  };

  // =========================================================
  // SAVE TO SALE
  // =========================================================

  const handleSaveToSale = async () => {
    if (!finalReview) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

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
            workers: finalReview.workers.map((worker) => ({
              workerId: worker.workerId,
              pieces: worker.pieces,
              weightKg: worker.weightKg,
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal menyimpan worker ke penjualan.");
      }

      window.location.href = `/settlement/sale/${saleId}/confirm`;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan data.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="mb-6">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#929a93]">
            SALE #{saleId}
          </p>

          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#17221b]">
            Scan Catatan Karet
          </h1>

          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#687169]">
            Upload catatan penjualan karet untuk membaca data pekerja secara
            otomatis.
          </p>
        </header>

        {/* =====================================================
            UPLOAD
        ===================================================== */}

        <section className="mb-5 overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
          <div className="border-b border-[#eef1ed] px-4 py-4 sm:px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929a93]">
              STEP 01
            </p>

            <h2 className="mt-1 text-sm font-semibold text-[#17221b]">
              Upload Catatan
            </h2>

            <p className="mt-1 text-[10px] text-[#929a93]">
              JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)]">
            {/* UPLOAD BOX */}

            <div>
              <label
                htmlFor="rubber-note-file"
                className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7ded5] bg-[#fafbf9] px-6 text-center transition hover:border-[#9db695] hover:bg-[#f7f9f6]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ea] text-[#4d873d]">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.5" />
                    <path d="M14 4v5h5" />
                    <circle cx="9" cy="14" r="1.5" />
                    <path d="m20 14-3.2-3.2L11 16.5" />
                  </svg>
                </div>

                <p className="max-w-full truncate text-xs font-semibold text-[#27322c]">
                  {file ? file.name : "Pilih foto catatan"}
                </p>

                <p className="mt-1.5 text-[10px] text-[#929a93]">
                  Klik untuk memilih gambar
                </p>
              </label>

              <input
                id="rubber-note-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* PREVIEW */}

            <div className="min-h-[220px] overflow-hidden rounded-2xl border border-[#e3e8e1] bg-[#f7f8f6]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview catatan karet"
                  className="h-full min-h-[220px] w-full object-contain"
                />
              ) : (
                <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
                  <div>
                    <div className="mx-auto mb-2 text-xl text-[#b4bcb5]">◇</div>

                    <p className="text-[10px] text-[#929a93]">
                      Preview foto akan muncul di sini
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-[#f0d4d4] bg-[#fffafa] p-3.5 sm:mx-5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-xs font-semibold text-[#c85c5c]">
                !
              </div>

              <p className="pt-1 text-[10px] leading-relaxed text-[#a04444]">
                {error}
              </p>
            </div>
          )}

          {/* SUCCESS */}

          {saveSuccess && (
            <div
              role="status"
              className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-[#d7e8d2] bg-[#f4f9f2] p-3.5 sm:mx-5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3e6] text-sm font-semibold text-[#4d873d]">
                ✓
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#315f3f]">
                  Data berhasil disimpan
                </p>

                <p className="mt-0.5 text-[10px] leading-relaxed text-[#687169]">
                  {saveSuccess
                    .replace("Berhasil menyimpan ", "")
                    .replace(".", "")}
                </p>
              </div>
            </div>
          )}

          {/* ACTION */}

          <div className="flex justify-end border-t border-[#eef1ed] px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={handleScan}
              disabled={!file || isScanning}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] disabled:shadow-none sm:w-auto sm:min-w-[150px]"
            >
              {isScanning && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {isScanning ? "Sedang membaca..." : "Scan Catatan"}
            </button>
          </div>
        </section>

        {/* =====================================================
            EXTRACTION RESULT
        ===================================================== */}

        {hasScanned && (
          <section className="space-y-4">
            {/* RESULT HEADER */}

            <div className="flex flex-col gap-4 rounded-2xl border border-[#e3e8e1] bg-white p-4 shadow-[0_1px_2px_rgba(23,34,27,0.02)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929a93]">
                  STEP 02
                </p>

                <h2 className="mt-1 text-sm font-semibold text-[#17221b]">
                  Hasil Extraction
                </h2>

                <p className="mt-1 text-[10px] text-[#929a93]">
                  Periksa hasil AI sebelum dikonfirmasi.
                </p>
              </div>

              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[#e5e9e3] bg-[#fafbf9]">
                <div className="min-w-[75px] border-r border-[#e5e9e3] px-3 py-2.5 text-center">
                  <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                    Worker
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-[#17221b]">
                    {workers.length}
                  </p>
                </div>

                <div className="min-w-[90px] border-r border-[#e5e9e3] px-3 py-2.5 text-center">
                  <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                    Total Berat
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-[#17221b]">
                    {totalWeight.toLocaleString("id-ID")} kg
                  </p>
                </div>

                <div className="min-w-[85px] px-3 py-2.5 text-center">
                  <p className="text-[8px] uppercase tracking-[0.08em] text-[#929a93]">
                    Confirmed
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-[#315f3f]">
                    {confirmedCount}/{workers.length}
                  </p>
                </div>
              </div>
            </div>

            {/* WORKERS */}

            <div className="space-y-3">
              {workers.map((worker, index) => (
                <div
                  key={index}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(23,34,27,0.02)] ${
                    worker.confirmed ? "border-[#d7e8d2]" : "border-[#e3e8e1]"
                  }`}
                >
                  {/* WORKER HEADER */}

                  <div className="flex flex-col gap-3 border-b border-[#eef1ed] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                          worker.confirmed
                            ? "bg-[#eaf3e6] text-[#4d873d]"
                            : "bg-[#f0f3ee] text-[#929a93]"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                          Worker #{index + 1}
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-semibold ${
                            worker.confirmed
                              ? "bg-[#eaf3e6] text-[#4d873d]"
                              : "bg-[#f5f2e8] text-[#9a7b35]"
                          }`}
                        >
                          {worker.confirmed ? "Confirmed" : "Review"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwap(index)}
                      className="inline-flex h-8 w-full items-center justify-center rounded-[9px] border border-[#dfe5dd] px-3 text-[10px] font-medium text-[#687169] transition hover:border-[#b9c7b7] hover:bg-[#f7f9f6] sm:w-auto"
                    >
                      ⇄&nbsp; Swap
                    </button>
                  </div>

                  {/* FIELDS */}

                  <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <div>
                      <label className="mb-1.5 block text-[9px] font-medium text-[#687169]">
                        Nama Worker
                      </label>

                      <input
                        type="text"
                        value={worker.name ?? ""}
                        onChange={(event) =>
                          updateWorker(index, "name", event.target.value)
                        }
                        className="h-9 w-full rounded-[9px] border border-[#dfe5dd] bg-white px-3 text-xs text-[#27322c] outline-none transition placeholder:text-[#a7aea8] focus:border-[#8baa83] focus:ring-2 focus:ring-[#eaf3e6]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[9px] font-medium text-[#687169]">
                        Pieces / Keping
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={worker.pieces ?? ""}
                        onChange={(event) =>
                          updateWorker(index, "pieces", event.target.value)
                        }
                        className="h-9 w-full rounded-[9px] border border-[#dfe5dd] bg-white px-3 text-xs text-[#27322c] outline-none transition focus:border-[#8baa83] focus:ring-2 focus:ring-[#eaf3e6]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[9px] font-medium text-[#687169]">
                        Berat / Kg
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={worker.weightKg ?? ""}
                        onChange={(event) =>
                          updateWorker(index, "weightKg", event.target.value)
                        }
                        className="h-9 w-full rounded-[9px] border border-[#dfe5dd] bg-white px-3 text-xs text-[#27322c] outline-none transition focus:border-[#8baa83] focus:ring-2 focus:ring-[#eaf3e6]"
                      />
                    </div>
                  </div>

                  {/* MATCHES */}

                  <div className="border-t border-[#eef1ed] bg-[#fafbf9] p-4 sm:p-5">
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-[#27322c]">
                        Kandidat Worker
                      </p>

                      <p className="mt-0.5 text-[9px] text-[#929a93]">
                        Pilih worker yang sesuai dengan hasil pembacaan.
                      </p>
                    </div>

                    {worker.matches.length > 0 ? (
                      <div className="grid gap-2">
                        {worker.matches.map((match) => {
                          const selected = worker.selectedWorkerId === match.id;

                          return (
                            <button
                              key={match.id}
                              type="button"
                              onClick={() =>
                                handleSelectWorker(index, match.id)
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? "border-[#a7c29f] bg-[#eef6eb]"
                                  : "border-[#e3e8e1] bg-white hover:border-[#cbd6c8] hover:bg-[#fbfcfa]"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[#27322c]">
                                  {match.name}
                                </p>

                                <p className="mt-0.5 text-[9px] text-[#929a93]">
                                  Match score: {(match.score * 100).toFixed(0)}%
                                </p>
                              </div>

                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-[#5f9f4a]"
                                    : "border-[#cfd7cd]"
                                }`}
                              >
                                {selected && (
                                  <div className="h-2.5 w-2.5 rounded-full bg-[#5f9f4a]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#eadfca] bg-[#fffaf0] p-4">
                        <p className="text-xs font-semibold text-[#735c2b]">
                          Worker belum ditemukan
                        </p>

                        <p className="mt-1 text-[9px] leading-relaxed text-[#927b4b]">
                          Tidak ditemukan worker yang cocok dengan hasil scan.
                          Periksa kembali nama worker sebelum menambahkan worker
                          baru.
                        </p>

                        <button
                          type="button"
                          onClick={() => openNewWorkerModal(index)}
                          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-[9px] bg-[#315f3f] px-4 text-[10px] font-semibold text-white transition hover:bg-[#274f34] sm:w-auto"
                        >
                          + Tambah Worker Baru
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM */}

                  <div className="flex justify-end border-t border-[#eef1ed] px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => handleConfirmWorker(index)}
                      disabled={
                        worker.confirmed ||
                        !worker.name ||
                        worker.pieces === null ||
                        worker.weightKg === null ||
                        !worker.selectedWorkerId
                      }
                      className="inline-flex h-9 w-full items-center justify-center rounded-[9px] bg-[#315f3f] px-4 text-[10px] font-semibold text-white transition hover:bg-[#274f34] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] sm:w-auto"
                    >
                      {worker.confirmed ? "Worker Confirmed" : "Confirm Worker"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* =================================================
                REVIEW STATUS
            ================================================= */}

            {workers.length > 0 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#dce8df] bg-[#f2f7f3] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
                    STATUS REVIEW
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#315f3f]">
                    {allConfirmed
                      ? "Semua worker sudah dikonfirmasi."
                      : `${workers.length - confirmedCount} worker masih perlu diperiksa.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!allConfirmed}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] sm:w-auto sm:min-w-[120px]"
                >
                  Lanjutkan
                </button>
              </div>
            )}

            {/* =================================================
                FINAL REVIEW
            ================================================= */}

            {showFinalReview && finalReview && (
              <section className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
                <div className="border-b border-[#eef1ed] bg-[#f2f7f3] px-4 py-5 sm:px-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
                    STEP 03 · FINAL REVIEW
                  </p>

                  <h2 className="mt-1 text-sm font-semibold text-[#244c31]">
                    Data Siap Disimpan
                  </h2>

                  <p className="mt-1 text-[10px] leading-relaxed text-[#718078]">
                    Pastikan seluruh data worker sudah benar sebelum masuk ke
                    penjualan.
                  </p>
                </div>

                {/* FINAL STATS */}

                <div className="grid grid-cols-2 border-b border-[#eef1ed] sm:grid-cols-4">
                  <div className="border-b border-r border-[#eef1ed] p-4 sm:border-b-0">
                    <p className="text-[9px] text-[#929a93]">Total Worker</p>

                    <p className="mt-1 text-base font-semibold text-[#17221b]">
                      {finalReview.workers.length}
                    </p>
                  </div>

                  <div className="border-b border-[#eef1ed] p-4 sm:border-b-0 sm:border-r">
                    <p className="text-[9px] text-[#929a93]">Total Berat</p>

                    <p className="mt-1 text-base font-semibold text-[#315f3f]">
                      {finalReview.totalWeightKg.toLocaleString("id-ID")} kg
                    </p>
                  </div>

                  <div className="border-r border-[#eef1ed] p-4">
                    <p className="text-[9px] text-[#929a93]">Status</p>

                    <p className="mt-1 text-xs font-semibold text-[#4d873d]">
                      Ready
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[9px] text-[#929a93]">Sale</p>

                    <p className="mt-1 text-xs font-semibold text-[#17221b]">
                      #{saleId}
                    </p>
                  </div>
                </div>

                {/* FINAL TABLE */}

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#eef1ed] bg-[#fafbf9]">
                        <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93] sm:px-5">
                          Worker
                        </th>

                        <th className="px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93]">
                          Pieces
                        </th>

                        <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929a93] sm:px-5">
                          Berat
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {finalReview.workers.map((worker) => (
                        <tr
                          key={worker.workerId}
                          className="border-b border-[#f0f2ef] last:border-b-0"
                        >
                          <td className="px-4 py-3.5 text-xs font-semibold text-[#27322c] sm:px-5">
                            {worker.name}
                          </td>

                          <td className="px-3 py-3.5 text-right text-xs text-[#687169]">
                            {worker.pieces}
                          </td>

                          <td className="px-4 py-3.5 text-right text-xs font-medium text-[#315f3f] sm:px-5">
                            {worker.weightKg.toLocaleString("id-ID")} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FINAL ACTIONS */}

                <div className="flex flex-col-reverse gap-2 border-t border-[#eef1ed] p-4 sm:flex-row sm:justify-end sm:p-5">
                  <button
                    type="button"
                    onClick={() => setShowFinalReview(false)}
                    disabled={isSaving}
                    className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-[#dfe5dd] px-5 text-xs font-medium text-[#687169] transition hover:bg-[#f7f9f6] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Kembali Review
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToSale}
                    disabled={isSaving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] sm:w-auto"
                  >
                    {isSaving && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}

                    {isSaving ? "Menyimpan..." : "Simpan ke Penjualan"}
                  </button>
                </div>
              </section>
            )}
          </section>
        )}

        {/* =====================================================
            NEW WORKER MODAL
        ===================================================== */}

        {showNewWorkerModal && newWorkerIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17221b]/35 px-4 py-6 backdrop-blur-[2px]">
            <div className="w-full max-w-[430px] overflow-hidden rounded-2xl border border-[#e0e5de] bg-white shadow-[0_20px_60px_rgba(23,34,27,0.16)]">
              {/* MODAL HEADER */}

              <div className="flex items-start justify-between border-b border-[#eef1ed] px-5 py-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929a93]">
                    WORKER BARU
                  </p>

                  <h2 className="mt-1 text-sm font-semibold text-[#17221b]">
                    Tambah Worker
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingWorker) {
                      return;
                    }

                    setShowNewWorkerModal(false);
                    setNewWorkerIndex(null);
                  }}
                  disabled={isCreatingWorker}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-[#929a93] transition hover:bg-[#f0f3ee] hover:text-[#27322c] disabled:opacity-50"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>

              {/* MODAL BODY */}

              <div className="px-5 py-5">
                <p className="mb-1.5 text-[9px] font-medium text-[#687169]">
                  Nama hasil scan
                </p>

                <div className="rounded-xl border border-[#e3e8e1] bg-[#f7f8f6] px-4 py-3">
                  <p className="text-xs font-semibold text-[#17221b]">
                    {workers[newWorkerIndex]?.name ?? "-"}
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-[#dce8df] bg-[#f2f7f3] p-3.5">
                  <p className="text-[10px] leading-relaxed text-[#687169]">
                    Worker ini belum terdaftar. Klik{" "}
                    <strong className="font-semibold text-[#315f3f]">
                      Tambah Worker
                    </strong>{" "}
                    untuk membuat worker baru menggunakan nama hasil scan.
                  </p>
                </div>
              </div>

              {/* MODAL ACTIONS */}

              <div className="flex flex-col-reverse gap-2 border-t border-[#eef1ed] px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingWorker) {
                      return;
                    }

                    setShowNewWorkerModal(false);
                    setNewWorkerIndex(null);
                  }}
                  disabled={isCreatingWorker}
                  className="inline-flex h-9 w-full items-center justify-center rounded-[9px] border border-[#dfe5dd] px-4 text-[10px] font-medium text-[#687169] transition hover:bg-[#f7f9f6] disabled:opacity-50 sm:w-auto"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleCreateNewWorker}
                  disabled={isCreatingWorker}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[9px] bg-[#315f3f] px-4 text-[10px] font-semibold text-white transition hover:bg-[#274f34] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] sm:w-auto"
                >
                  {isCreatingWorker && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}

                  {isCreatingWorker ? "Menambahkan..." : "Tambah Worker"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
