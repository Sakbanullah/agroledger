"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

        const [farmsResponse, commoditiesResponse] = await Promise.all([
          fetch("http://localhost:3001/farms"),
          fetch("http://localhost:3001/commodities"),
        ]);

        const farmsData = await farmsResponse.json();
        const commoditiesData = await commoditiesResponse.json();

        if (!farmsResponse.ok) {
          throw new Error(farmsData.message || "Gagal mengambil data kebun.");
        }

        if (!commoditiesResponse.ok) {
          throw new Error(
            commoditiesData.message || "Gagal mengambil data komoditas.",
          );
        }

        setFarms(farmsData);
        setCommodities(commoditiesData);

        if (farmsData.length > 0) {
          setFarmId(String(farmsData[0].id));
        }

        if (commoditiesData.length > 0) {
          setCommodityId(String(commoditiesData[0].id));
        }

        const today = new Date();

        const localDate = new Date(
          today.getTime() - today.getTimezoneOffset() * 60000,
        )
          .toISOString()
          .split("T")[0];

        setSaleDate(localDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengambil data.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      const response = await fetch("http://localhost:3001/sales", {
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Gagal membuat penjualan.",
        );
      }

      router.push(`/settlement/sale/${data.id}/scan`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat draft penjualan.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingData) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#dfe6dc] border-t-[#5f9f4a]" />

            <p className="text-xs text-[#929a93]">Memuat data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        {/* =================================================
            BACK
        ================================================== */}

        <button
          type="button"
          onClick={() => router.push("/settlement")}
          disabled={isCreating}
          className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-[#687169] transition hover:text-[#315f3f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-sm">←</span>
          Kembali ke Penjualan
        </button>

        {/* =================================================
            HEADER
        ================================================== */}

        <header className="mb-7">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#929a93]">
            PENJUALAN
          </p>

          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#17221b]">
            Penjualan Baru
          </h1>

          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#687169]">
            Buat draft transaksi untuk mulai mencatat hasil penjualan.
          </p>
        </header>

        {/* =================================================
            FORM
        ================================================== */}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* =================================================
              INFORMATION
          ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white shadow-[0_1px_2px_rgba(23,34,27,0.02)]">
            {/* SECTION HEADER */}

            <div className="flex items-start gap-3.5 border-b border-[#eef1ed] px-4 py-4 sm:px-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#eaf3e6] text-[9px] font-semibold tracking-[0.05em] text-[#4d873d]">
                01
              </span>

              <div>
                <h2 className="text-sm font-semibold text-[#17221b]">
                  Informasi Penjualan
                </h2>

                <p className="mt-1 text-[10px] leading-relaxed text-[#929a93]">
                  Tentukan kebun, komoditas, dan tanggal transaksi.
                </p>
              </div>
            </div>

            {/* FIELDS */}

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {/* FARM */}

              <div>
                <label
                  htmlFor="farm"
                  className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
                >
                  Kebun
                </label>

                <select
                  id="farm"
                  value={farmId}
                  onChange={(event) => setFarmId(event.target.value)}
                  disabled={isCreating}
                  className="h-10 w-full appearance-none rounded-[10px] border border-[#dfe5dc] bg-white px-3 text-xs text-[#17221b] outline-none transition focus:border-[#8fbd82] focus:ring-2 focus:ring-[#eaf3e6] disabled:cursor-not-allowed disabled:bg-[#f7f8f6]"
                >
                  <option value="">Pilih kebun</option>

                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} · {farm.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* COMMODITY */}

              <div>
                <label
                  htmlFor="commodity"
                  className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
                >
                  Komoditas
                </label>

                <select
                  id="commodity"
                  value={commodityId}
                  onChange={(event) => setCommodityId(event.target.value)}
                  disabled={isCreating}
                  className="h-10 w-full appearance-none rounded-[10px] border border-[#dfe5dc] bg-white px-3 text-xs text-[#17221b] outline-none transition focus:border-[#8fbd82] focus:ring-2 focus:ring-[#eaf3e6] disabled:cursor-not-allowed disabled:bg-[#f7f8f6]"
                >
                  <option value="">Pilih komoditas</option>

                  {commodities.map((commodity) => (
                    <option key={commodity.id} value={commodity.id}>
                      {commodity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE */}

              <div>
                <label
                  htmlFor="saleDate"
                  className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
                >
                  Tanggal Penjualan
                </label>

                <input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  disabled={isCreating}
                  className="h-10 w-full rounded-[10px] border border-[#dfe5dc] bg-white px-3 text-xs text-[#17221b] outline-none transition focus:border-[#8fbd82] focus:ring-2 focus:ring-[#eaf3e6] disabled:cursor-not-allowed disabled:bg-[#f7f8f6]"
                />
              </div>

              {/* NOTES */}

              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="notes"
                    className="text-[10px] font-medium text-[#4c574f]"
                  >
                    Catatan
                  </label>

                  <span className="text-[9px] text-[#a1a8a2]">Opsional</span>
                </div>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  rows={4}
                  disabled={isCreating}
                  className="w-full resize-none rounded-[10px] border border-[#dfe5dc] bg-white px-3 py-2.5 text-xs leading-relaxed text-[#17221b] outline-none transition placeholder:text-[#b0b6b0] focus:border-[#8fbd82] focus:ring-2 focus:ring-[#eaf3e6] disabled:cursor-not-allowed disabled:bg-[#f7f8f6]"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              INFORMATION BOX
          ================================================== */}

          <section className="flex items-start gap-3 rounded-2xl border border-[#dfe9dc] bg-[#f4f8f2] p-4 sm:p-5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3e6] text-[11px] font-semibold text-[#4d873d]">
              i
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#315f3f]">
                Draft penjualan
              </p>

              <p className="mt-1 text-[10px] leading-relaxed text-[#687169]">
                Harga dan total berat belum perlu diisi sekarang. Untuk karet,
                berat akan dikumpulkan dari data masing-masing worker setelah
                draft dibuat.
              </p>
            </div>
          </section>

          {/* =================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#f0d4d4] bg-[#fffafa] p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faeaea] text-xs font-semibold text-[#c85c5c]">
                !
              </div>

              <div>
                <p className="text-xs font-semibold text-[#a04444]">
                  Gagal membuat draft
                </p>

                <p className="mt-0.5 text-[10px] leading-relaxed text-[#a04444]">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/settlement")}
              disabled={isCreating}
              className="h-10 w-full rounded-[10px] border border-[#dfe5dc] bg-white px-5 text-xs font-medium text-[#687169] transition hover:border-[#cfd8cc] hover:bg-[#f8faf7] hover:text-[#315f3f] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isCreating || !farmId || !commodityId || !saleDate}
              className="h-10 w-full rounded-[10px] bg-[#315f3f] px-5 text-xs font-semibold text-white transition hover:bg-[#274f34] hover:shadow-[0_6px_16px_rgba(49,95,63,0.18)] disabled:cursor-not-allowed disabled:bg-[#b7c2b8] disabled:shadow-none sm:w-auto sm:min-w-[190px]"
            >
              {isCreating ? "Membuat Draft..." : "Buat Draft Penjualan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
