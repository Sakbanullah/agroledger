"use client";

import { ChangeEvent, useEffect, useState } from "react";

import styles from "./RubberNoteScan.module.css";

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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
        selectedWorkerId:
          worker.matches.length > 0 ? worker.matches[0].id : null,
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

  const handleConfirmWorker = (index: number) => {
    setWorkers((current) =>
      current.map((worker, workerIndex) => {
        if (workerIndex !== index) {
          return worker;
        }

        if (!worker.name) {
          return worker;
        }

        if (worker.pieces === null || worker.weightKg === null) {
          return worker;
        }

        if (!worker.selectedWorkerId) {
          return worker;
        }

        return {
          ...worker,
          confirmed: true,
        };
      }),
    );
  };

  const totalWeight = workers.reduce(
    (total, worker) => total + (worker.weightKg ?? 0),
    0,
  );

  const confirmedCount = workers.filter((worker) => worker.confirmed).length;

  const allConfirmed = workers.length > 0 && confirmedCount === workers.length;

  const handleContinue = () => {
    if (!allConfirmed) {
      return;
    }

    const workerIds = workers.map((worker) => worker.selectedWorkerId);

    const uniqueWorkerIds = new Set(workerIds);

    if (uniqueWorkerIds.size !== workerIds.length) {
      setError("Worker yang sama tidak boleh dipilih lebih dari satu kali.");

      return;
    }

    const confirmedWorkers = workers.map((worker) => {
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

    setFinalReview({
      workers: confirmedWorkers,
      totalWeightKg,
    });

    setShowFinalReview(true);
    setError(null);
  };

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

      setShowFinalReview(false);

      setWorkers([]);
      setFinalReview(null);
      setHasScanned(false);

      setSaveSuccess(
        `Berhasil menyimpan ${data.workers.length} worker dengan total berat ${Number(
          data.totalWeightKg,
        ).toLocaleString("id-ID")} kg.`,
      );
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
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.saleLabel}>Sale #{saleId}</div>

          <h1 className={styles.title}>Scan Catatan Karet</h1>

          <p className={styles.subtitle}>
            Upload catatan penjualan karet untuk membaca data pekerja secara
            otomatis.
          </p>
        </div>

        {/* Upload */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Upload Catatan</h2>

            <p className={styles.sectionDescription}>
              JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>
          </div>

          <div className={styles.uploadGrid}>
            <div>
              <label htmlFor="rubber-note-file" className={styles.uploadBox}>
                <div className={styles.uploadIcon}>📷</div>

                <div className={styles.uploadName}>
                  {file ? file.name : "Pilih foto catatan"}
                </div>

                <div className={styles.uploadHint}>
                  Klik untuk memilih gambar
                </div>
              </label>

              <input
                id="rubber-note-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
            </div>

            <div className={styles.previewBox}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview catatan karet"
                  className={styles.previewImage}
                />
              ) : (
                <div className={styles.previewEmpty}>
                  Preview foto akan muncul di sini
                </div>
              )}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {saveSuccess && (
            <div className={styles.successMessage}>{saveSuccess}</div>
          )}

          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={handleScan}
              disabled={!file || isScanning}
              className={styles.primaryButton}
            >
              {isScanning ? "Sedang membaca..." : "Scan Catatan"}
            </button>
          </div>
        </section>

        {/* Extraction Result */}
        {hasScanned && (
          <section className={styles.resultSection}>
            {/* Result Header */}
            <div className={styles.resultHeader}>
              <div>
                <h2 className={styles.resultTitle}>Hasil Extraction</h2>

                <p className={styles.resultDescription}>
                  Periksa hasil AI sebelum dikonfirmasi.
                </p>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Worker</span>

                  <span className={styles.statValue}>{workers.length}</span>
                </div>

                <div className={styles.stat}>
                  <span className={styles.statLabel}>Total Berat</span>

                  <span className={styles.statValue}>
                    {totalWeight.toLocaleString("id-ID")} kg
                  </span>
                </div>

                <div className={styles.stat}>
                  <span className={styles.statLabel}>Confirmed</span>

                  <span className={styles.statValue}>
                    {confirmedCount}/{workers.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Workers */}
            <div className={styles.workerList}>
              {workers.map((worker, index) => (
                <div
                  key={index}
                  className={`${styles.workerCard} ${
                    worker.confirmed ? styles.workerConfirmed : ""
                  }`}
                >
                  {/* Worker Header */}
                  <div className={styles.workerHeader}>
                    <div>
                      <div className={styles.workerNumber}>
                        Worker #{index + 1}
                      </div>

                      <div
                        className={
                          worker.confirmed
                            ? styles.statusConfirmed
                            : styles.statusReview
                        }
                      >
                        {worker.confirmed ? "Confirmed" : "Review"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwap(index)}
                      className={styles.secondaryButton}
                    >
                      ⇄ Swap
                    </button>
                  </div>

                  {/* Fields */}
                  <div className={styles.fieldGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Nama Worker</label>

                      <input
                        type="text"
                        value={worker.name ?? ""}
                        onChange={(event) =>
                          updateWorker(index, "name", event.target.value)
                        }
                        className={styles.input}
                      />
                    </div>

                    <div>
                      <label className={styles.fieldLabel}>
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
                        className={styles.input}
                      />
                    </div>

                    <div>
                      <label className={styles.fieldLabel}>Berat / Kg</label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={worker.weightKg ?? ""}
                        onChange={(event) =>
                          updateWorker(index, "weightKg", event.target.value)
                        }
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Matches */}
                  <div className={styles.matchSection}>
                    <div className={styles.matchHeader}>
                      <div>
                        <div className={styles.matchTitle}>Kandidat Worker</div>

                        <div className={styles.matchDescription}>
                          Pilih worker yang sesuai dengan hasil pembacaan.
                        </div>
                      </div>
                    </div>

                    {worker.matches.length > 0 ? (
                      <div className={styles.matchList}>
                        {worker.matches.map((match) => {
                          const selected = worker.selectedWorkerId === match.id;

                          return (
                            <button
                              key={match.id}
                              type="button"
                              onClick={() =>
                                handleSelectWorker(index, match.id)
                              }
                              className={`${styles.matchItem} ${
                                selected ? styles.matchSelected : ""
                              }`}
                            >
                              <div>
                                <div className={styles.matchName}>
                                  {match.name}
                                </div>

                                <div className={styles.matchScore}>
                                  Match score: {(match.score * 100).toFixed(0)}%
                                </div>
                              </div>

                              <div
                                className={`${styles.radio} ${
                                  selected ? styles.radioSelected : ""
                                }`}
                              >
                                {selected && (
                                  <div className={styles.radioDot} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.noMatch}>
                        <div className={styles.noMatchTitle}>
                          Worker belum ditemukan
                        </div>

                        <div className={styles.noMatchText}>
                          Periksa nama hasil scan. Jika benar-benar worker baru,
                          nanti kita tambahkan flow konfirmasi worker baru.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Worker */}
                  <div className={styles.confirmRow}>
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
                      className={styles.primaryButton}
                    >
                      {worker.confirmed ? "Worker Confirmed" : "Confirm Worker"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Status */}
            {workers.length > 0 && (
              <div className={styles.reviewStatus}>
                <div>
                  <div className={styles.reviewStatusTitle}>Status Review</div>

                  <div className={styles.reviewStatusText}>
                    {allConfirmed
                      ? "Semua worker sudah dikonfirmasi."
                      : `${workers.length - confirmedCount} worker masih perlu diperiksa.`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!allConfirmed}
                  className={styles.successButton}
                >
                  Lanjutkan
                </button>
              </div>
            )}

            {/* Final Review */}
            {showFinalReview && finalReview && (
              <section className={styles.finalReview}>
                <div className={styles.finalHeader}>
                  <div className={styles.finalEyebrow}>Final Review</div>

                  <h2 className={styles.finalTitle}>Data Siap Disimpan</h2>

                  <p className={styles.finalDescription}>
                    Pastikan seluruh data worker sudah benar sebelum masuk ke
                    penjualan.
                  </p>
                </div>

                {/* Summary */}
                <div className={styles.finalStats}>
                  <div className={styles.finalStat}>
                    <span className={styles.statLabel}>Total Worker</span>

                    <span className={styles.finalStatValue}>
                      {finalReview.workers.length}
                    </span>
                  </div>

                  <div className={styles.finalStat}>
                    <span className={styles.statLabel}>Total Berat</span>

                    <span className={styles.finalStatValue}>
                      {finalReview.totalWeightKg.toLocaleString("id-ID")} kg
                    </span>
                  </div>
                </div>

                {/* Final Worker Table */}
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <div>Worker</div>

                    <div>Pieces</div>

                    <div>Berat</div>
                  </div>

                  {finalReview.workers.map((worker) => (
                    <div key={worker.workerId} className={styles.tableRow}>
                      <div className={styles.tableWorker}>{worker.name}</div>

                      <div className={styles.tableNumber}>{worker.pieces}</div>

                      <div className={styles.tableNumber}>
                        {worker.weightKg.toLocaleString("id-ID")} kg
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Actions */}
                <div className={styles.finalActions}>
                  <button
                    type="button"
                    onClick={() => setShowFinalReview(false)}
                    disabled={isSaving}
                    className={styles.secondaryButton}
                  >
                    Kembali Review
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToSale}
                    disabled={isSaving}
                    className={styles.successButton}
                  >
                    {isSaving ? "Menyimpan..." : "Simpan ke Penjualan"}
                  </button>
                </div>
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
