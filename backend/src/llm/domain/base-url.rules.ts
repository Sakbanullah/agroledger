// Pure rules only: no DNS, no sockets, no fetch. Resolution and connection
// enforcement live in infrastructure/guarded-transport.ts.

// Loopback is deliberately absent: a local-only app legitimately talks to
// http://127.0.0.1:11434 (Ollama) and similar. What must never be a target is
// link-local metadata, the unspecified address, multicast and reserved ranges.
const BLOCKED_V4_PREFIXES = ['0.', '169.254.', '224.', '240.'];

// ponytail: string prefixes, not a full CIDR table. Covers what an operator can
// plausibly type; swap in a real parser if a finer policy is ever needed.
const BLOCKED_V6_PREFIXES = ['fe80:', 'ff0'];

export function isBlockedAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (!normalized) return true;

  if (normalized.includes(':')) {
    return BLOCKED_V6_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  }

  return BLOCKED_V4_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isLoopbackOrPrivateHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  if (host.includes(':')) {
    return (
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd')
    );
  }

  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) {
    return false;
  }

  const [a, b] = parts.map(Number);

  if (a === 127 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

export interface BaseUrlPolicyOptions {
  allowInsecure: boolean;
}

/**
 * Returns an error message, or null when the URL is acceptable.
 * Rejects embedded credentials, non-http(s) schemes, blocked hosts, and
 * insecure http to anything that is not a local/private endpoint.
 */
export function validateBaseUrlSyntax(
  rawUrl: string,
  options: BaseUrlPolicyOptions,
): string | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return 'Base URL tidak valid';
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'Base URL harus menggunakan http atau https';
  }

  if (url.username || url.password) {
    return 'Base URL tidak boleh memuat kredensial';
  }

  if (isBlockedAddress(url.hostname)) {
    return `Host ${url.hostname} tidak diizinkan sebagai Base URL`;
  }

  if (url.protocol === 'http:') {
    if (!isLoopbackOrPrivateHost(url.hostname)) {
      return 'Base URL http hanya diizinkan untuk host lokal/privat';
    }

    if (!options.allowInsecure) {
      return 'Endpoint http memerlukan LLM_ALLOW_INSECURE_URLS=true';
    }
  }

  return null;
}

export function allowInsecureFromEnv(value: string | undefined): boolean {
  return value === 'true';
}
