const API_URL = "http://localhost:3001";

export async function getDashboardSummary() {
  const response = await fetch(`${API_URL}/reports/dashboard`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data dashboard");
  }

  return response.json();
}

export async function createMoneyTransaction(data: {
  type: "IN" | "OUT";
  category:
    | "OPERASIONAL"
    | "WARUNG"
    | "PERTANIAN"
    | "TRANSPORTASI"
    | "PERAWATAN"
    | "LAINNYA";
  amount: number;
  transactionDate: string;
  description?: string;
}) {
  const response = await fetch(`${API_URL}/money-transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(error || "Gagal membuat transaksi");
  }

  return response.json();
}

export async function getMoneyTransactions() {
  const response = await fetch(`${API_URL}/money-transactions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil transaksi");
  }

  return response.json();
}

export async function getMoneyTransaction(id: number) {
  const response = await fetch(`${API_URL}/money-transactions/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil detail transaksi");
  }

  return response.json();
}

export async function getCashFlow(
  startDate: string,
  endDate: string,
  period: "daily" | "weekly" | "monthly" = "daily",
) {
  const params = new URLSearchParams({
    startDate,
    endDate,
    period,
  });

  const response = await fetch(
    `${API_URL}/money-transactions/cash-flow?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil data cash flow");
  }

  return response.json();
}

export async function getCashFlowSummary(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });

  const response = await fetch(`${API_URL}/money-transactions/cash-flow/summary?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil cash flow summary");
  }

  return response.json();
}

export async function getSalesSummary(
  startDate: string,
  endDate: string,
) {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await fetch(`${API_URL}/reports/sales?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil ringkasan penjualan");
  }

  return response.json();
}

export async function getSettlements() {
  const response = await fetch(`${API_URL}/settlements`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil settlement");
  }

  return response.json();
}

export async function getFinanceSummary(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });

  const response = await fetch(`${API_URL}/reports/finance?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil ringkasan finansial");
  }

  return response.json();
}

export async function getSettlementSummary(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });

  const response = await fetch(`${API_URL}/reports/settlements?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil ringkasan settlement");
  }

  return response.json();
}

export async function getHarvests() {
  const response = await fetch(`${API_URL}/harvests`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data panen");
  }

  return response.json();
}

export async function createHarvest(data: {
  farmId: number;
  commodityId: number;
  harvestDate: string;
  weightKg: number;
}) {
  const response = await fetch(`${API_URL}/harvests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(error || "Gagal membuat data panen");
  }

  return response.json();
}

export async function updateHarvest(
  id: number,
  data: {
    farmId?: number;
    commodityId?: number;
    harvestDate?: string;
    weightKg?: number;
  },
) {
  const response = await fetch(`${API_URL}/harvests/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(error || "Gagal memperbarui data panen");
  }

  return response.json();
}

export async function deleteHarvest(id: number) {
  const response = await fetch(`${API_URL}/harvests/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(error || "Gagal menghapus data panen");
  }

  return response.json();
}

export async function getFarms() {
  const response = await fetch(`${API_URL}/farms`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data kebun");
  }

  return response.json();
}

export async function getOwnerSettlements() {
  const response = await fetch(`${API_URL}/owner-settlements`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Gagal mengambil data pembayaran pemilik");
  }
  return response.json();
}

export async function getOwnerSettlement(id: number) {
  const response = await fetch(`${API_URL}/owner-settlements/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Gagal mengambil detail pembayaran pemilik");
  }
  return response.json();
}

export async function payOwnerSettlement(id: number, amount: number) {
  const response = await fetch(`${API_URL}/owner-settlements/${id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Gagal memproses pembayaran pemilik",
    );
  }
  return response.json();
}

export async function getFarm(id: number) {
  const response = await fetch(`${API_URL}/farms/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data kebun");
  }

  return response.json();
}

export async function createFarm(data: {
  name: string;
  location?: string;
  ownershipType?: "OWN" | "RELATIVE";
  ownerId?: number;
}) {
  const response = await fetch(`${API_URL}/farms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Gagal menambahkan ladang.",
    );
  }

  return response.json();
}

export async function deleteFarm(id: number) {
  const response = await fetch(`${API_URL}/farms/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Ladang tidak dapat dihapus.",
    );
  }

  return response.json();
}

export async function getCommodities() {
  const response = await fetch(`${API_URL}/commodities`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data komoditas");
  }

  return response.json();
}

export async function getPeople() {
  const response = await fetch(`${API_URL}/people`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data person");
  }

  return response.json();
}

export async function getPerson(id: number) {
  const response = await fetch(`${API_URL}/people/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil detail person");
  }

  return response.json();
}

export async function createPerson(data: { name: string; phone?: string; type?: string }) {
  const response = await fetch(`${API_URL}/people`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Gagal membuat person",
    );
  }

  return response.json();
}

export async function updatePerson(
  id: number,
  data: { name?: string; phone?: string; type?: string },
) {
  const response = await fetch(`${API_URL}/people/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Gagal memperbarui person",
    );
  }

  return response.json();
}

export async function deletePerson(id: number) {
  const response = await fetch(`${API_URL}/people/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      Array.isArray(error?.message)
        ? error.message.join(", ")
        : error?.message || "Person tidak dapat dihapus",
    );
  }

  return response.json();
}

export async function getSettings() {
  const response = await fetch(`${API_URL}/settings`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Gagal mengambil settings");
  }
  return response.json();
}

export async function updateSetting(key: string, value: number) {
  const response = await fetch(`${API_URL}/settings/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Gagal mengubah settings");
  }
  return response.json();
}

export async function scanRubberNote(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/ai/scan/rubber-note`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Gagal melakukan scan catatan.");
  }

  return data;
}

// ---------------------------------------------------------------------------
// LLM providers
// ---------------------------------------------------------------------------

export type LlmProtocol = "openai" | "gemini";

export interface LlmModelPayload {
  id: string;
  displayName?: string | null;
  params?: Record<string, unknown> | null;
}

export interface LlmProviderPayload {
  name: string;
  protocol: LlmProtocol;
  baseUrl: string;
  apiKey?: string | null;
  customHeaders?: Record<string, string> | null;
  timeoutMs?: number;
  enabled?: boolean;
  models: LlmModelPayload[];
  defaultModelId?: string | null;
}

export interface LlmProviderView {
  id: number;
  name: string;
  protocol: string;
  baseUrl: string;
  hasApiKey: boolean;
  customHeaders: Record<string, string> | null;
  timeoutMs: number;
  enabled: boolean;
  isActive: boolean;
  models: Array<{
    id: string;
    displayName: string | null;
    params: Record<string, unknown> | null;
    isDefault: boolean;
  }>;
  lastTestStatus: string | null;
  lastTestAt: string | null;
  lastTestMessage: string | null;
}

export interface LlmTestResult {
  ok: boolean;
  modelId: string | null;
  message: string;
}

export interface AiConfigView {
  source: "database" | "environment";
  providerName: string | null;
  protocol: string;
  baseURL: string;
  model: string;
  hasApiKey: boolean;
}

/** Reads the backend error body rather than assuming a plain string. */
async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message;
    return new Error(message || fallback);
  } catch {
    return new Error(fallback);
  }
}

async function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  fallback = "Permintaan gagal",
) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await readError(response, fallback);
  }

  return response.json();
}

export async function getLlmProviders(): Promise<LlmProviderView[]> {
  return jsonRequest(
    `${API_URL}/llm/providers`,
    "GET",
    undefined,
    "Gagal mengambil provider LLM",
  );
}

export async function createLlmProvider(data: LlmProviderPayload) {
  return jsonRequest(`${API_URL}/llm/providers`, "POST", data);
}

export async function updateLlmProvider(id: number, data: LlmProviderPayload) {
  return jsonRequest(`${API_URL}/llm/providers/${id}`, "PATCH", data);
}

export async function deleteLlmProvider(
  id: number,
  replacementProviderId?: number | null,
) {
  const query = replacementProviderId
    ? `?replacementProviderId=${replacementProviderId}`
    : "";

  return jsonRequest(
    `${API_URL}/llm/providers/${id}${query}`,
    "DELETE",
    undefined,
    "Gagal menghapus provider",
  );
}

export async function activateLlmProvider(id: number, modelId?: string | null) {
  return jsonRequest(`${API_URL}/llm/providers/${id}/activate`, "POST", {
    modelId: modelId ?? null,
  });
}

/** Tests a saved provider. Never returns key material. */
export async function testLlmProvider(
  id: number,
  modelId?: string | null,
): Promise<{ results: LlmTestResult[]; provider: LlmProviderView | null }> {
  return jsonRequest(`${API_URL}/llm/providers/${id}/test`, "POST", {
    modelId: modelId ?? null,
  });
}

/** Tests the form's current values without saving anything. */
export async function testUnsavedLlmProvider(
  data: Pick<
    LlmProviderPayload,
    "protocol" | "baseUrl" | "apiKey" | "customHeaders" | "timeoutMs"
  > & { modelIds: string[] },
): Promise<{ results: LlmTestResult[] }> {
  return jsonRequest(`${API_URL}/llm/providers/test`, "POST", data);
}

export async function getAiConfig(): Promise<AiConfigView> {
  return jsonRequest(
    `${API_URL}/ai/config`,
    "GET",
    undefined,
    "Gagal mengambil konfigurasi AI",
  );
}
