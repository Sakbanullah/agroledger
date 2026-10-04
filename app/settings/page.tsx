"use client";

import { useEffect, useState, FormEvent } from "react";
import { Loader2, Check, Settings as SettingsIcon } from "lucide-react";
import { getSettings, updateSetting } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSettings();
        if (!cancelled)
          setValue(String(data.defaultSawitRelativeCommission ?? 200));
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Gagal memuat settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const num = Number(value);
    if (value.trim() === "" || isNaN(num) || num < 0) {
      setError("Nilai komisi harus berupa angka >= 0.");
      setSuccess("");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      setSuccess("");
      const res = await updateSetting("defaultSawitRelativeCommission", num);
      setValue(String(res.defaultSawitRelativeCommission ?? num));
      setSuccess("Komisi default berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              System
            </p>

            <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-text-primary sm:text-[30px]">
              Settings
            </h1>

            <p className="mt-1.5 text-[12px] text-text-secondary">
              Konfigurasi aturan bisnis AgroLedger.
            </p>
          </div>
        </header>

        <section className="overflow-hidden rounded-[14px] border border-border bg-surface">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
              Business Rules
            </p>

            <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
              Default Komisi Sawit RELATIVE
            </h2>

            <p className="mt-1 text-[11px] text-text-secondary">
              Komisi default per kilogram untuk kebun Sawit dengan kepemilikan
              RELATIVE (milik saudara) bila tidak ada override pada transaksi.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Loader2 size={15} className="animate-spin" />
                Memuat settings...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-soft text-success">
                    <SettingsIcon size={17} />
                  </div>

                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                      Default Commission
                    </p>

                    <p className="mt-0.5 text-[12px] font-semibold text-text-primary">
                      Rp {value || "0"} / kg
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 max-w-xs">
                <label className="mb-1 block text-[10px] font-semibold text-text-secondary">
                  Nilai komisi (Rp/kg)
                </label>

                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setSuccess("");
                  }}
                  className="h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-border"
                />
              </div>

              {error && (
                <div className="mt-4 rounded-[10px] bg-danger-soft px-4 py-3 text-[11px] text-danger">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-[10px] bg-surface-soft px-4 py-3 text-[11px] text-success">
                  {success}
                </div>
              )}

              <div className="mt-5 flex justify-end border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-surface px-4 text-[12px] font-medium text-white transition hover:bg-surface-soft disabled:opacity-60 active:scale-[0.99]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
