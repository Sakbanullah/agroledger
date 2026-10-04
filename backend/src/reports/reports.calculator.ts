export type DecimalValue = string | number | { toString(): string } | null | undefined;

export function parseDecimal(val: DecimalValue): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isNaN(num) ? 0 : num;
}

export function isSawitCommodity(commodityName?: string): boolean {
  if (!commodityName) return false;
  return commodityName.trim().toLowerCase().includes('sawit');
}

export function computeSaleGross(sale: {
  totalWeightKg?: DecimalValue;
  pricePerKg?: DecimalValue;
}): number {
  const weight = parseDecimal(sale.totalWeightKg);
  const price = parseDecimal(sale.pricePerKg);
  return weight * price;
}

export function computeSaleOwnIncome(sale: {
  ownershipType?: string | null;
  commissionAmount?: DecimalValue;
  totalWeightKg?: DecimalValue;
  pricePerKg?: DecimalValue;
  commodity?: { name?: string };
  farm?: { ownershipType?: string | null };
}): { gross: number; ownIncome: number; commissionIncome: number } {
  const gross = computeSaleGross(sale);
  const commodityName = sale.commodity?.name ?? '';
  const isSawit = isSawitCommodity(commodityName);
  const ownership = sale.ownershipType ?? sale.farm?.ownershipType ?? null;

  let ownIncome = 0;
  let commissionIncome = 0;

  if (isSawit) {
    if (ownership === 'OWN') {
      ownIncome = gross;
    } else if (ownership === 'RELATIVE') {
      const commission = parseDecimal(sale.commissionAmount);
      ownIncome = commission;
      commissionIncome = commission;
    }
  } else {
    // Karet: no commission, no specific new income formula -> ownIncome = 0 here
    // (Karet revenue is tracked via gross sales / worker settlements separately)
    ownIncome = 0;
  }

  return {
    gross,
    ownIncome,
    commissionIncome,
  };
}
