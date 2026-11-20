// Framework-free parsing of a provider's model listing. Every real gateway
// shapes this differently, so recognition lives here and stays unit-testable.

export interface ModelOption {
  id: string;
  displayName: string | null;
}

export type ModelListParseResult =
  | { ok: true; models: ModelOption[] }
  | { ok: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Understands `{data:[{id}]}` (OpenAI-compatible), `{models:[{name|id}]}`
 * (Ollama, native Gemini) and a bare array of ids.
 */
export function parseModelList(body: unknown): ModelListParseResult {
  const list = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.data)
      ? body.data
      : isRecord(body) && Array.isArray(body.models)
        ? body.models
        : null;

  if (!list) return { ok: false };

  const seen = new Set<string>();
  const models: ModelOption[] = [];

  for (const entry of list) {
    const parsed = toOption(entry);
    if (!parsed) continue;

    // Native Gemini prefixes names with "models/"; the app stores the bare id.
    const id = parsed.id.replace(/^models\//, '').trim();
    if (!id || seen.has(id)) continue;

    seen.add(id);
    models.push({ id, displayName: parsed.displayName });
  }

  return { ok: true, models };
}

function toOption(entry: unknown): ModelOption | null {
  if (typeof entry === 'string' && entry.trim()) {
    return { id: entry, displayName: null };
  }

  if (!isRecord(entry)) return null;

  const id = [entry.id, entry.name, entry.model].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  if (!id) return null;

  const displayName =
    typeof entry.display_name === 'string'
      ? entry.display_name
      : typeof entry.displayName === 'string'
        ? entry.displayName
        : null;

  return { id, displayName };
}
