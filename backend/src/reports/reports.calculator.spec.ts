import {
  computeSaleGross,
  computeSaleOwnIncome,
  isSawitCommodity,
  parseDecimal,
} from './reports.calculator';

describe('parseDecimal', () => {
  it('parses string "2000" to 2000', () => {
    expect(parseDecimal('2000')).toBe(2000);
  });

  it('parses number 500 to 500', () => {
    expect(parseDecimal(500)).toBe(500);
  });

  it('parses number 0.25 to 0.25', () => {
    expect(parseDecimal(0.25)).toBe(0.25);
  });

  it('returns 0 for null', () => {
    expect(parseDecimal(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseDecimal(undefined)).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseDecimal('not a number')).toBe(0);
  });
});

describe('isSawitCommodity', () => {
  it('recognizes "Sawit"', () => {
    expect(isSawitCommodity('Sawit')).toBe(true);
  });

  it('recognizes "sawit" (lowercase)', () => {
    expect(isSawitCommodity('sawit')).toBe(true);
  });

  it('recognizes " sawit " (with spaces)', () => {
    expect(isSawitCommodity(' sawit ')).toBe(true);
  });

  it('recognizes name containing "sawit"', () => {
    expect(isSawitCommodity('Sawit Karet')).toBe(true);
  });

  it('does not recognize "Karet"', () => {
    expect(isSawitCommodity('Karet')).toBe(false);
  });

  it('does not recognize "KERTAS"', () => {
    expect(isSawitCommodity('KERTAS')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSawitCommodity('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSawitCommodity(undefined)).toBe(false);
  });
});

describe('computeSaleGross', () => {
  it('gross = weight x price', () => {
    const result = computeSaleGross({
      totalWeightKg: '1000',
      pricePerKg: 2500,
    });
    expect(result).toBe(2500000);
  });

  it('handles string weight with string price', () => {
    const result = computeSaleGross({
      totalWeightKg: '1500',
      pricePerKg: '2000',
    });
    expect(result).toBe(3000000);
  });

  it('returns 0 when weight is missing', () => {
    expect(computeSaleGross({ pricePerKg: 3000 })).toBe(0);
  });

  it('returns 0 when price is missing', () => {
    expect(computeSaleGross({ totalWeightKg: '500' })).toBe(0);
  });

  it('returns 0 when both are missing', () => {
    expect(computeSaleGross({})).toBe(0);
  });
});

describe('computeSaleOwnIncome', () => {
  it('Sawit + OWN: ownIncome = gross, commissionIncome = 0', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: 'OWN',
      commodity: { name: 'Sawit' },
    });
    expect(result.gross).toBe(2500000);
    expect(result.ownIncome).toBe(2500000);
    expect(result.commissionIncome).toBe(0);
  });

  it('Sawit + RELATIVE without commission: ownIncome = 0, commissionIncome = 0', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: 'RELATIVE',
      commissionAmount: 0,
      commodity: { name: 'Sawit' },
      farm: { ownershipType: 'RELATIVE' },
    });
    expect(result.gross).toBe(2500000);
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('Sawit + RELATIVE with commission: ownIncome = commission, commissionIncome = commission', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: 'RELATIVE',
      commissionAmount: 500000,
      commodity: { name: 'Sawit' },
      farm: { ownershipType: 'RELATIVE' },
    });
    expect(result.gross).toBe(2500000);
    expect(result.ownIncome).toBe(500000);
    expect(result.commissionIncome).toBe(500000);
  });

  it('Sawit + RELATIVE, commissionAmount parsed from string', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '2000',
      pricePerKg: 2500,
      ownershipType: 'RELATIVE',
      commissionAmount: '400000',
      commodity: { name: 'Sawit' },
      farm: { ownershipType: 'RELATIVE' },
    });
    expect(result.gross).toBe(5000000);
    expect(result.ownIncome).toBe(400000);
    expect(result.commissionIncome).toBe(400000);
  });

  it('Karet + OWN: commissionIncome = 0, ownIncome = 0 (non-Sawit path)', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '500',
      pricePerKg: 8000,
      ownershipType: 'OWN',
      commodity: { name: 'Karet' },
    });
    expect(result.gross).toBe(4000000);
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('Karet + RELATIVE with commissionAmount: commissionIncome still 0 (non-Sawit path)', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '500',
      pricePerKg: 8000,
      ownershipType: 'RELATIVE',
      commissionAmount: 300000,
      commodity: { name: 'Karet' },
      farm: { ownershipType: 'RELATIVE' },
    });
    expect(result.gross).toBe(4000000);
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('ownershipType null falls back to farm.ownershipType = OWN', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: null,
      farm: { ownershipType: 'OWN' },
      commodity: { name: 'Sawit' },
    });
    expect(result.ownIncome).toBe(2500000);
    expect(result.commissionIncome).toBe(0);
  });

  it('ownershipType null falls back to farm.ownershipType = RELATIVE with commission', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: null,
      farm: { ownershipType: 'RELATIVE' },
      commissionAmount: 300000,
      commodity: { name: 'Sawit' },
    });
    expect(result.ownIncome).toBe(300000);
    expect(result.commissionIncome).toBe(300000);
  });

  it('ownershipType undefined falls back to farm.ownershipType = OWN', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      farm: { ownershipType: 'OWN' },
      commodity: { name: 'Sawit' },
    });
    expect(result.ownIncome).toBe(2500000);
    expect(result.commissionIncome).toBe(0);
  });

  it('ownershipType undefined falls back to farm.ownershipType = RELATIVE with commission', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      farm: { ownershipType: 'RELATIVE' },
      commissionAmount: 250000,
      commodity: { name: 'Sawit' },
    });
    expect(result.ownIncome).toBe(250000);
    expect(result.commissionIncome).toBe(250000);
  });

  it('no ownership anywhere: ownIncome = 0, commissionIncome = 0', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      commodity: { name: 'Sawit' },
    });
    expect(result.gross).toBe(2500000);
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('non-Sawit commodity name: commissionIncome = 0 despite commissionAmount', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      commodity: { name: 'GPA' },
      ownershipType: 'RELATIVE',
      commissionAmount: 500000,
    });
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('missing commodity: treated as non-Sawit, commissionIncome = 0', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: '1000',
      pricePerKg: 2500,
      ownershipType: 'RELATIVE',
      commissionAmount: 500000,
    });
    expect(result.ownIncome).toBe(0);
    expect(result.commissionIncome).toBe(0);
  });

  it('parses weight and price (including whitespace string) before calculation', () => {
    const result = computeSaleOwnIncome({
      totalWeightKg: ' 2000 ',
      pricePerKg: '3000',
      ownershipType: 'OWN',
      commodity: { name: 'Sawit' },
    });
    expect(result.gross).toBe(6000000);
    expect(result.ownIncome).toBe(6000000);
    expect(result.commissionIncome).toBe(0);
  });
});
