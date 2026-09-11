"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FilePenLine,
  Loader2,
  Sprout,
} from "lucide-react";

interface Farm {
  id: number;
  name: string;
  location: string | null;
}

interface Commodity {
  id: number;
  name: string;
  unit: string;
}

type InputMethod = "manual" | "scan";

export default function SaleNew() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  const [farmId, setFarmId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");

  const [inputMethod, setInputMethod] = useState<InputMethod>("manual");

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
        console.error(err);

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

      if (inputMethod === "scan") {
        router.push(`/settlement/sale/${data.id}/scan`);
      } else {
        router.push(`/settlement/sale/${data.id}/manual`);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Gagal membuat draft penjualan.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (loadingData) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <button
          type="button"
          onClick={() => router.push("/settlement")}
          disabled={isCreating}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Penjualan
        </button>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE8D8] bg-[#F1F6EF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3F7635]">
            <Sprout className="h-3.5 w-3.5" />
            Penjualan
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-text-primary sm:text-3xl">
            Penjualan Baru
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Buat draft transaksi, lalu pilih cara memasukkan data hasil
            penjualan.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-[12px] border border-[#E8C5C0] bg-[#FFF3F1] px-4 py-3 text-sm font-medium text-[#B5473A]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="rounded-[14px] border border-border bg-white">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-xs font-bold text-[#3F7635]">
                  01
                </div>

                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Informasi Penjualan
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Tentukan kebun, komoditas, dan tanggal transaksi.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="farm"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Kebun
                </label>

                <select
                  id="farm"
                  value={farmId}
                  onChange={(event) => setFarmId(event.target.value)}
                  disabled={isCreating}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
                >
                  <option value="">Pilih kebun</option>

                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                      {farm.location ? ` · ${farm.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="commodity"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Komoditas
                </label>

                <select
                  id="commodity"
                  value={commodityId}
                  onChange={(event) => setCommodityId(event.target.value)}
                  disabled={isCreating}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
                >
                  <option value="">Pilih komoditas</option>

                  {commodities.map((commodity) => (
                    <option key={commodity.id} value={commodity.id}>
                      {commodity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="saleDate"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Tanggal Penjualan
                </label>

                <input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  disabled={isCreating}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Catatan
                  <span className="ml-1 font-normal text-text-muted">
                    (opsional)
                  </span>
                </label>

                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan"
                  disabled={isCreating}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#9FBA96] focus:ring-2 focus:ring-[#E6EFE2] disabled:cursor-not-allowed disabled:bg-[#F7F8F6]"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[14px] border border-border bg-white">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF3E7] text-xs font-bold text-[#3F7635]">
                  02
                </div>

                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Cara Input Data
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-text-secondary">
                    Pilih bagaimana data worker akan dimasukkan ke penjualan
                    ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setInputMethod("manual")}
                disabled={isCreating}
                className={`group relative rounded-[14px] border p-5 text-left transition ${
                  inputMethod === "manual"
                    ? "border-[#9FBA96] bg-[#F4F8F2] ring-2 ring-[#E6EFE2]"
                    : "border-border bg-white hover:border-[#C5D5C0] hover:bg-[#FAFBF9]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {inputMethod === "manual" && (
                  <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#3F7635] text-[11px] font-bold text-white">
                    ✓
                  </div>
                )}

                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[11px] ${
                    inputMethod === "manual"
                      ? "bg-[#DDEBD9] text-[#3F7635]"
                      : "bg-[#F2F4F1] text-text-secondary"
                  }`}
                >
                  <FilePenLine className="h-5 w-5" />
                </div>

                <h3 className="text-[15px] font-semibold text-text-primary">
                  Input Manual
                </h3>

                <p className="mt-1.5 max-w-sm text-sm leading-5 text-text-secondary">
                  Masukkan worker, jumlah keping, dan berat secara manual.
                </p>

                <div className="mt-4 text-xs font-semibold text-[#3F7635]">
                  Cocok jika data sudah tersedia
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInputMethod("scan")}
                disabled={isCreating}
                className={`group relative rounded-[14px] border p-5 text-left transition ${
                  inputMethod === "scan"
                    ? "border-[#9FBA96] bg-[#F4F8F2] ring-2 ring-[#E6EFE2]"
                    : "border-border bg-white hover:border-[#C5D5C0] hover:bg-[#FAFBF9]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {inputMethod === "scan" && (
                  <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#3F7635] text-[11px] font-bold text-white">
                    ✓
                  </div>
                )}

                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[11px] ${
                    inputMethod === "scan"
                      ? "bg-[#DDEBD9] text-[#3F7635]"
                      : "bg-[#F2F4F1] text-text-secondary"
                  }`}
                >
                  <Camera className="h-5 w-5" />
                </div>

                <h3 className="text-[15px] font-semibold text-text-primary">
                  Scan Catatan
                </h3>

                <p className="mt-1.5 max-w-sm text-sm leading-5 text-text-secondary">
                  Upload foto catatan dan biarkan sistem membaca data worker
                  secara otomatis.
                </p>

                <div className="mt-4 text-xs font-semibold text-[#3F7635]">
                  Dibantu AI Vision
                </div>
              </button>
            </div>
          </section>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-text-muted">
              Draft penjualan akan dibuat terlebih dahulu sebelum data worker
              dimasukkan.
            </p>

            <button
              type="submit"
              disabled={isCreating || !farmId || !commodityId || !saleDate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#17221B] px-5 text-sm font-semibold text-white transition hover:bg-[#26352B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuat Penjualan...
                </>
              ) : (
                <>
                  Lanjutkan
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
