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
