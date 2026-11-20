"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Sale {
  id: number;
  totalWeightKg: string | number | null;
  saleDate: string;
  commissionRatePerKg: string | number | null;
  commodity: { name: string };
}

export default function CommissionPage() {
  const { saleId } = useParams() as { saleId: string };
  const id = Number(saleId);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [commissionRate, setCommissionRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Set once the backend confirms: the sale is COMPLETED after this save.
  const [saved, setSaved] = useState<{
    rate: number;
    commission: number;
    ownerShare: number;
  } | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:3001/sales/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Gagal mengambil data penjualan.");
        }

        setSale(data);
        setCommissionRate(data.commissionRatePerKg?.toString() ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  const handleSave = async () => {
    const rate = Number(commissionRate);

    if (!rate || rate <= 0) {
      setSaveError("Rate komisi harus lebih dari 0.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`http://localhost:3001/sales/${id}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRatePerKg: rate }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan komisi.");
      }

      // Komisi tersimpan, OwnerSettlement dibuat, dan penjualan Sawit
      // langsung selesai (tidak ada settlement worker untuk Sawit).
      const ownerShare = Number(data.ownerShareAmount ?? 0);
      const commission = Number(data.commissionAmount ?? 0);

      setSaved({ rate, commission, ownerShare });
      setSale(data);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data penjualan...
        </div>
      </main>
    );
  }

  if (error || !sale) {
    return (
      <main className="min-h-screen bg-background p-5">
        <Link
          href={`/settlement/sale/${saleId}/confirm`}
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Kembali
        </Link>

        <p className="mt-5 rounded-2xl border border-border bg-surface p-5 text-xs text-danger">
          {error || "Penjualan tidak ditemukan."}
        </p>
      </main>
    );
  }

  const gross =
    sale.totalWeightKg !== null ? Number(sale.totalWeightKg) : 0;
  const rate = Number(commissionRate) || 0;
  const commissionAmount = gross * rate;

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-5 sm:px-5 lg:px-7">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href={`/settlement/sale/${saleId}/confirm`}
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Kembali ke konfirmasi
        </Link>

        {saved ? (
          <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-success">
              PENJUALAN SELESAI
            </p>
            <h1 className="mt-1 text-lg font-semibold text-text-primary">
              Penjualan #{sale.id} sudah selesai
            </h1>
            <p className="mt-1 text-xs text-text-secondary">
              Sawit tidak memakai worker, jadi tidak ada layar settlement atau
              check. Komisi berikut sudah masuk kas kebun sendiri.
            </p>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-soft px-4 py-3 text-xs">
              <dt className="text-text-muted">Rate komisi</dt>
              <dd className="font-semibold text-text-primary">
                Rp{new Intl.NumberFormat("id-ID").format(saved.rate)}/kg
              </dd>

              <dt className="text-text-muted">Komisi</dt>
              <dd className="font-semibold text-success">
                Rp{new Intl.NumberFormat("id-ID").format(saved.commission)}
              </dd>

              <dt className="text-text-muted">Bagian pemilik</dt>
              <dd className="text-text-primary">
                Rp{new Intl.NumberFormat("id-ID").format(saved.ownerShare)}
              </dd>
            </dl>

            <p className="mt-2 text-[10px] text-text-muted">
              Bagian pemilik masih tercatat sebagai kewajiban yang harus
              dibayarkan lewat Pembayaran Pemilik.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/owner-settlement"
                className="inline-flex h-10 items-center rounded-[10px] border border-border bg-surface px-4 text-xs font-medium text-text-primary transition hover:bg-surface-soft"
              >
                Pembayaran Pemilik
              </Link>

              <Link
                href="/settlement"
                className="inline-flex h-10 items-center rounded-[10px] border border-border-strong px-4 text-xs font-medium text-text-secondary transition hover:bg-surface-soft"
              >
                Kembali ke Penjualan
              </Link>
            </div>
          </section>
        ) : (
        <>
        <header className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            KOMISI SAWIT · MILIK SAUDARA
          </p>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            Tentukan Komisi
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Sale #{sale.id} · {sale.totalWeightKg ?? 0} kg
          </p>
        </header>

        <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <label
            htmlFor="commissionRate"
            className="mb-1.5 block text-[10px] font-medium text-[#4c574f]"
          >
            Rate Komisi (Rp/kg)
          </label>

          <input
            id="commissionRate"
            type="number"
            min="0"
            value={commissionRate}
            onChange={(event) => setCommissionRate(event.target.value)}
            disabled={saving}
            placeholder="Default Rp200/kg"
            className="h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-agro-primary focus:ring-2 focus:ring-success-soft disabled:cursor-not-allowed disabled:bg-surface-muted"
          />

          <p className="mt-1.5 text-[9px] text-text-muted">
            Kosongkan untuk memakai rate default Rp200/kg.
          </p>

          {commissionAmount > 0 && (
            <p className="mt-3 text-xs text-text-primary">
              {gross} kg × Rp{rate}/kg ={" "}
              <span className="font-semibold">
                Rp{new Intl.NumberFormat("id-ID").format(commissionAmount)}
              </span>
            </p>
          )}

          {saveError && (
            <p className="mt-3 rounded-xl border border-border bg-danger-soft px-3 py-2 text-[11px] text-danger">
              {saveError}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-agro-primary px-5 text-xs font-medium text-white transition hover:bg-agro-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan & Selesaikan
          </button>
        </section>
        </>
        )}
      </div>
    </main>
  );
}
