"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import {
  activateLlmProvider,
  createLlmProvider,
  deleteLlmProvider,
  getLlmProviders,
  testLlmProvider,
  testUnsavedLlmProvider,
  updateLlmProvider,
  type LlmProtocol,
  type LlmProviderPayload,
  type LlmProviderView,
  type LlmTestResult,
} from "@/lib/api";

const PROTOCOLS: Array<{ value: LlmProtocol; label: string; hint: string }> = [
  {
    value: "openai",
    label: "OpenAI-compatible",
    hint: "9Router, OpenRouter, OpenAI, DeepSeek, Qwen, endpoint self-hosted",
  },
  { value: "gemini", label: "Google Gemini", hint: "API native Gemini" },
];

const PRESETS: Array<{ label: string; protocol: LlmProtocol; baseUrl: string }> = [
  { label: "9Router", protocol: "openai", baseUrl: "https://api.9router.ai/v1" },
  { label: "OpenRouter", protocol: "openai", baseUrl: "https://openrouter.ai/api/v1" },
  { label: "OpenAI", protocol: "openai", baseUrl: "https://api.openai.com/v1" },
  { label: "DeepSeek", protocol: "openai", baseUrl: "https://api.deepseek.com/v1" },
  { label: "Qwen", protocol: "openai", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" },
  { label: "Gemini", protocol: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  { label: "Ollama (lokal)", protocol: "openai", baseUrl: "http://localhost:11434/v1" },
];

interface ModelRow {
  id: string;
  displayName: string;
}

interface FormState {
  id: number | null;
  name: string;
  protocol: LlmProtocol;
  baseUrl: string;
  apiKey: string;
  keyTouched: boolean;
  hasStoredKey: boolean;
  timeoutMs: number;
  enabled: boolean;
  models: ModelRow[];
  defaultModelId: string;
}

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  protocol: "openai",
  baseUrl: "",
  apiKey: "",
  keyTouched: false,
  hasStoredKey: false,
  timeoutMs: 60000,
  enabled: true,
  models: [{ id: "", displayName: "" }],
  defaultModelId: "",
});

function toForm(provider: LlmProviderView): FormState {
  return {
    id: provider.id,
    name: provider.name,
    protocol: (provider.protocol as LlmProtocol) ?? "openai",
    baseUrl: provider.baseUrl,
    apiKey: "",
    keyTouched: false,
    hasStoredKey: provider.hasApiKey,
    timeoutMs: provider.timeoutMs,
    enabled: provider.enabled,
    models: provider.models.length
      ? provider.models.map((m) => ({ id: m.id, displayName: m.displayName ?? "" }))
      : [{ id: "", displayName: "" }],
    defaultModelId: provider.models.find((m) => m.isDefault)?.id ?? "",
  };
}

const inputClass =
  "h-10 w-full rounded-[9px] border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-border";

const labelClass = "mb-1 block text-[10px] font-semibold text-text-secondary";

export default function LlmProvidersSection() {
  const [providers, setProviders] = useState<LlmProviderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<LlmTestResult[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setProviders(await getLlmProviders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat provider LLM.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getLlmProviders();
        if (!cancelled) setProviders(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Gagal memuat provider LLM.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flash = (message: string) => {
    setSuccess(message);
    setError("");
  };

  const update = (patch: Partial<FormState>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const buildPayload = (): LlmProviderPayload => {
    if (!form) throw new Error("Form tidak aktif");

    const models = form.models
      .map((m) => ({
        id: m.id.trim(),
        displayName: m.displayName.trim() || null,
      }))
      .filter((m) => m.id);

    const payload: LlmProviderPayload = {
      name: form.name.trim(),
      protocol: form.protocol,
      baseUrl: form.baseUrl.trim(),
      customHeaders: null,
      timeoutMs: form.timeoutMs,
      enabled: form.enabled,
      models,
      defaultModelId: form.defaultModelId || models[0]?.id || null,
    };

    // Omitted key = keep the stored one. Only send when the user typed something
    // or explicitly cleared it on an existing provider.
    if (form.keyTouched) {
      payload.apiKey = form.apiKey.trim() ? form.apiKey.trim() : null;
    } else if (!form.id) {
      payload.apiKey = form.apiKey.trim() || null;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!form) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = buildPayload();

      if (form.id) {
        await updateLlmProvider(form.id, payload);
        flash("Provider diperbarui.");
      } else {
        await createLlmProvider(payload);
        flash("Provider ditambahkan.");
      }

      setForm(null);
      setTestResults(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan provider.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form) return;

    try {
      setTesting(true);
      setError("");
      setTestResults(null);

      const payload = buildPayload();
      const modelIds = payload.models.map((m) => m.id);

      if (modelIds.length === 0) {
        setError("Isi minimal satu Model ID sebelum mengetes.");
        return;
      }

      // Saved provider with an untouched key: test what is stored, so the
      // connection can be verified without re-entering the secret.
      if (form.id && !form.keyTouched) {
        const response = await testLlmProvider(form.id, modelIds[0]);
        setTestResults(response.results);
        if (response.provider) {
          setProviders((current) =>
            current.map((p) => (p.id === response.provider!.id ? response.provider! : p)),
          );
        }
        return;
      }

      const response = await testUnsavedLlmProvider({
        protocol: payload.protocol,
        baseUrl: payload.baseUrl,
        apiKey: payload.apiKey ?? form.apiKey.trim() ?? null,
        customHeaders: null,
        timeoutMs: payload.timeoutMs,
        modelIds,
      });

      setTestResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tes koneksi gagal.");
    } finally {
      setTesting(false);
    }
  };

  const handleActivate = async (provider: LlmProviderView) => {
    try {
      setBusyId(provider.id);
      setError("");
      await activateLlmProvider(
        provider.id,
        provider.models.find((m) => m.isDefault)?.id ?? provider.models[0]?.id,
      );
      flash(`"${provider.name}" dijadikan provider default.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan provider.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (provider: LlmProviderView) => {
    const replacement = providers.find((p) => p.id !== provider.id && p.enabled);

    if (
      !window.confirm(
        provider.isActive
          ? `Hapus "${provider.name}"? Provider ini sedang aktif.` +
              (replacement
                ? ` "${replacement.name}" akan dijadikan default.`
                : " Tidak ada provider aktif setelah ini (kembali ke konfigurasi env).")
          : `Hapus "${provider.name}"?`,
      )
    ) {
      return;
    }

    try {
      setBusyId(provider.id);
      setError("");
      await deleteLlmProvider(
        provider.id,
        provider.isActive && replacement ? replacement.id : null,
      );
      flash("Provider dihapus.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus provider.");
    } finally {
      setBusyId(null);
    }
  };

  const applyPreset = (label: string) => {
    const preset = PRESETS.find((p) => p.label === label);
    if (!preset || !form) return;
    update({ protocol: preset.protocol, baseUrl: preset.baseUrl });
  };

  return (
    <section className="mt-6 overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
            AI / LLM Providers
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
            Koneksi Model Bahasa
          </h2>
          <p className="mt-1 text-[11px] text-text-secondary">
            Atur provider LLM sendiri, uji koneksi, dan pilih default tanpa
            mengubah kode atau environment variable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(emptyForm());
            setTestResults(null);
            setError("");
            setSuccess("");
          }}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-border px-3 text-[12px] font-medium text-text-primary transition hover:bg-surface-soft"
        >
          <Plus size={14} /> Tambah Provider
        </button>
      </div>

      {loading && (
        <div className="flex min-h-[120px] items-center justify-center">
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 size={15} className="animate-spin" /> Memuat provider...
          </div>
        </div>
      )}

      {!loading && providers.length === 0 && !form && (
        <div className="px-4 py-6 text-[12px] text-text-secondary sm:px-5">
          Belum ada provider. Selama belum ada yang aktif, fitur AI memakai
          konfigurasi environment.
        </div>
      )}

      {!loading && providers.length > 0 && (
        <ul className="divide-y divide-border">
          {providers.map((provider) => (
            <li key={provider.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-text-primary">
                      {provider.name}
                    </span>

                    {provider.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-medium text-success">
                        <Star size={10} /> Default
                      </span>
                    )}

                    {!provider.enabled && (
                      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-medium text-text-muted">
                        Disabled
                      </span>
                    )}

                    <StatusDot provider={provider} />
                  </div>

                  <p className="mt-1 truncate text-[11px] text-text-secondary">
                    {provider.protocol} · {provider.baseUrl}
                  </p>

                  <p className="mt-1 text-[11px] text-text-muted">
                    {provider.models.length} model
                    {provider.models.length > 0 &&
                      `: ${provider.models.map((m) => m.id).join(", ")}`}
                    {provider.hasApiKey ? " · API key tersimpan" : " · tanpa API key"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === provider.id || provider.isActive || !provider.enabled}
                    onClick={() => handleActivate(provider)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-border px-2.5 text-[11px] font-medium text-text-primary transition hover:bg-surface-soft disabled:opacity-50"
                  >
                    {busyId === provider.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Star size={12} />
                    )}
                    Jadikan default
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm(toForm(provider));
                      setTestResults(null);
                      setError("");
                      setSuccess("");
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-border px-2.5 text-[11px] font-medium text-text-primary transition hover:bg-surface-soft"
                  >
                    <Pencil size={12} /> Edit
                  </button>

                  <button
                    type="button"
                    disabled={busyId === provider.id}
                    onClick={() => handleDelete(provider)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-border px-2.5 text-[11px] font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <h3 className="text-[13px] font-semibold text-text-primary">
            {form.id ? `Edit: ${form.name}` : "Provider baru"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nama provider</label>
              <input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="9Router utama"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Preset (opsional)</label>
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => applyPreset(e.target.value)}
                  className={`${inputClass} appearance-none pr-8`}
                >
                  <option value="">Pilih preset untuk mengisi Base URL...</option>
                  {PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.label}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Protokol</label>
              <div className="relative">
                <select
                  value={form.protocol}
                  onChange={(e) =>
                    update({ protocol: e.target.value as LlmProtocol })
                  }
                  className={`${inputClass} appearance-none pr-8`}
                >
                  {PROTOCOLS.map((protocol) => (
                    <option key={protocol.value} value={protocol.value}>
                      {protocol.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                {PROTOCOLS.find((p) => p.value === form.protocol)?.hint}
              </p>
            </div>

            <div>
              <label className={labelClass}>Base URL</label>
              <input
                value={form.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder="https://api.9router.ai/v1"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>API key</label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  update({ apiKey: e.target.value, keyTouched: true })
                }
                placeholder={
                  form.hasStoredKey
                    ? "Tersimpan — kosongkan untuk mempertahankan"
                    : "Kosongkan bila endpoint tidak butuh autentikasi"
                }
                className={inputClass}
              />
              {form.hasStoredKey && (
                <p className="mt-1 text-[10px] text-text-muted">
                  API key tidak pernah dikirim balik oleh server. Biarkan kosong
                  agar nilai lama tetap dipakai.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Timeout (ms)</label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={form.timeoutMs}
                onChange={(e) => update({ timeoutMs: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Model</label>
              <button
                type="button"
                onClick={() =>
                  update({ models: [...form.models, { id: "", displayName: "" }] })
                }
                className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-border px-2 text-[11px] text-text-primary transition hover:bg-surface-soft"
              >
                <Plus size={11} /> Tambah model
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {form.models.map((model, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={model.id}
                    onChange={(e) => {
                      const models = [...form.models];
                      models[index] = { ...model, id: e.target.value };
                      update({ models });
                    }}
                    placeholder="Model ID (mis. gpt-5.5)"
                    className={inputClass}
                  />

                  <input
                    value={model.displayName}
                    onChange={(e) => {
                      const models = [...form.models];
                      models[index] = { ...model, displayName: e.target.value };
                      update({ models });
                    }}
                    placeholder="Nama tampilan (opsional)"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    disabled={form.models.length === 1}
                    onClick={() =>
                      update({
                        models: form.models.filter((_, i) => i !== index),
                      })
                    }
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9px] border border-border px-3 text-[11px] text-danger transition hover:bg-danger-soft disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {form.models.filter((m) => m.id.trim()).length > 1 && (
              <div className="mt-3 max-w-xs">
                <label className={labelClass}>Model default</label>
                <select
                  value={form.defaultModelId}
                  onChange={(e) => update({ defaultModelId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Model pertama</option>
                  {form.models
                    .filter((m) => m.id.trim())
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-[11px] text-text-secondary">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Provider aktif (enabled)
          </label>

          {testResults && (
            <div className="mt-4 space-y-2">
              {testResults.map((result) => (
                <div
                  key={`${result.modelId}-${result.message}`}
                  className={`rounded-[10px] px-3 py-2 text-[11px] ${
                    result.ok
                      ? "bg-surface-soft text-success"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  <span className="font-semibold">
                    {result.ok ? "Terhubung" : "Gagal"}
                    {result.modelId ? ` · ${result.modelId}` : ""}:
                  </span>{" "}
                  {result.message}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              disabled={testing || saving}
              onClick={handleTest}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border px-4 text-[12px] font-medium text-text-primary transition hover:bg-surface-soft disabled:opacity-60"
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Menguji...
                </>
              ) : (
                <>
                  <Plug size={14} /> Test Connection
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  setTestResults(null);
                  setError("");
                }}
                className="inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-[12px] text-text-secondary transition hover:bg-surface-soft"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={saving || testing}
                onClick={handleSave}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-surface px-4 text-[12px] font-medium text-white transition hover:bg-surface-soft disabled:opacity-60"
              >
                {saving ? (
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
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mb-4 mt-4 flex items-start gap-2 rounded-[10px] bg-danger-soft px-4 py-3 text-[11px] text-danger sm:mx-5">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mx-4 mb-4 mt-4 rounded-[10px] bg-surface-soft px-4 py-3 text-[11px] text-success sm:mx-5">
          {success}
        </div>
      )}
    </section>
  );
}

/** A saved provider is never shown as connected: only a real test says so. */
function StatusDot({ provider }: { provider: LlmProviderView }) {
  if (!provider.lastTestStatus) {
    return (
      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-muted">
        Belum diuji
      </span>
    );
  }

  const ok = provider.lastTestStatus === "OK";
  const when = provider.lastTestAt
    ? new Date(provider.lastTestAt).toLocaleString("id-ID")
    : "";

  return (
    <span
      title={provider.lastTestMessage ?? undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
        ok ? "bg-surface-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {ok ? "Terhubung" : "Gagal uji"}
      {when && ` · ${when}`}
    </span>
  );
}
