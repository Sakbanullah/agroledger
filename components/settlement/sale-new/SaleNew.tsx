"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./SaleNew.module.css";

interface Farm {
  id: number;
  name: string;
  location: string;
}

interface Commodity {
  id: number;
  name: string;
  unit: string;
}

export default function SaleNew() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  const [farmId, setFarmId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setError("");

        const [farmsResponse, commoditiesResponse] =
          await Promise.all([
            fetch("http://localhost:3001/farms"),
            fetch("http://localhost:3001/commodities"),
          ]);

        const farmsData = await farmsResponse.json();
        const commoditiesData =
          await commoditiesResponse.json();

        if (!farmsResponse.ok) {
          throw new Error(
            farmsData.message ||
              "Gagal mengambil data kebun.",
          );
        }

        if (!commoditiesResponse.ok) {
          throw new Error(
            commoditiesData.message ||
              "Gagal mengambil data komoditas.",
          );
        }

        setFarms(farmsData);
        setCommodities(commoditiesData);

        if (farmsData.length > 0) {
          setFarmId(String(farmsData[0].id));
        }

        if (commoditiesData.length > 0) {
          setCommodityId(
            String(commoditiesData[0].id),
          );
        }

        const today = new Date();
        const localDate = new Date(
          today.getTime() -
            today.getTimezoneOffset() * 60000,
        )
          .toISOString()
          .split("T")[0];

        setSaleDate(localDate);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data.",
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!farmId) {
      setError("Kebun wajib dipilih.");
      return;
    }

    if (!commodityId) {
      setError("Komoditas wajib dipilih.");
      return;
    }

    if (!saleDate) {
      setError("Tanggal penjualan wajib diisi.");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:3001/sales",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            farmId: Number(farmId),
            commodityId: Number(commodityId),
            saleDate,
            status: "PENDING",
            ...(notes.trim() && {
              notes: notes.trim(),
            }),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message ||
                "Gagal membuat penjualan.",
        );
      }

      router.push(
        `/settlement/sale/${data.id}/scan`,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat draft penjualan.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (loadingData) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            Memuat data...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        <button
          type="button"
          className={styles.backButton}
          onClick={() =>
            router.push("/settlement")
          }
        >
          ← Kembali ke Penjualan
        </button>

        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              PENJUALAN
            </div>

            <h1>Penjualan Baru</h1>

            <p>
              Buat draft transaksi untuk mulai
              mencatat hasil penjualan.
            </p>
          </div>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>
                01
              </span>

              <div>
                <h2>Informasi Penjualan</h2>

                <p>
                  Tentukan kebun, komoditas, dan
                  tanggal transaksi.
                </p>
              </div>
            </div>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="farm">
                  Kebun
                </label>

                <select
                  id="farm"
                  value={farmId}
                  onChange={(event) =>
                    setFarmId(event.target.value)
                  }
                  disabled={isCreating}
                >
                  <option value="">
                    Pilih kebun
                  </option>

                  {farms.map((farm) => (
                    <option
                      key={farm.id}
                      value={farm.id}
                    >
                      {farm.name} · {farm.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="commodity">
                  Komoditas
                </label>

                <select
                  id="commodity"
                  value={commodityId}
                  onChange={(event) =>
                    setCommodityId(
                      event.target.value,
                    )
                  }
                  disabled={isCreating}
                >
                  <option value="">
                    Pilih komoditas
                  </option>

                  {commodities.map((commodity) => (
                    <option
                      key={commodity.id}
                      value={commodity.id}
                    >
                      {commodity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="saleDate">
                  Tanggal Penjualan
                </label>

                <input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(event) =>
                    setSaleDate(event.target.value)
                  }
                  disabled={isCreating}
                />
              </div>

              <div className={styles.fieldFull}>
                <label htmlFor="notes">
                  Catatan
                  <span>Opsional</span>
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Tambahkan catatan jika diperlukan..."
                  rows={4}
                  disabled={isCreating}
                />
              </div>
            </div>
          </section>

          <section className={styles.infoBox}>
            <div className={styles.infoIcon}>
              i
            </div>

            <div>
              <strong>
                Ini akan dibuat sebagai draft
              </strong>

              <p>
                Harga dan total berat belum perlu
                diisi sekarang. Untuk karet, berat
                akan dikumpulkan dari data masing-masing
                worker setelah draft dibuat.
              </p>
            </div>
          </section>

          {error && (
            <div className={styles.error}>
              <strong>Gagal</strong>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() =>
                router.push("/settlement")
              }
              disabled={isCreating}
            >
              Batal
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                isCreating ||
                !farmId ||
                !commodityId ||
                !saleDate
              }
            >
              {isCreating
                ? "Membuat Draft..."
                : "Buat Draft Penjualan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}