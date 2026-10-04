"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const id = Number(saleId);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [commissionRate, setCommissionRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

      // Komisi tersimpan + OwnerSettlement dibuat di backend.
      router.push("/owner-settlement");
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
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-surface px-5 text-xs font-medium text-white transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan & Lanjut
          </button>
        </section>
      </div>
    </main>
  );
}
