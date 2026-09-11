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
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await fetch(
    `${API_URL}/money-transactions/cash-flow/summary?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil cash flow summary");
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

export async function getCommodities() {
  const response = await fetch(`${API_URL}/commodities`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data komoditas");
  }

  return response.json();
}
