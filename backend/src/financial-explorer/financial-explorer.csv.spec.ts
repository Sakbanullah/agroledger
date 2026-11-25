import {
  CSV_COLUMNS,
  csvCell,
  csvHeaderLine,
  csvLineFor,
  CsvRow,
} from './financial-explorer.csv';

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    transactionDate: new Date(2026, 10, 24),
    description: 'Penjualan sawit',
    category: 'HARVEST_SALE',
    type: 'IN',
    amount: 2500000,
    referenceType: 'SALE',
    referenceId: 7,
    farm: { name: 'Kebun A', ownershipType: 'OWN' },
    settlement: null,
    ...overrides,
  };
}

describe('financial explorer CSV', () => {
  it('writes the documented columns', () => {
    expect(csvHeaderLine()).toBe(`${CSV_COLUMNS.join(',')}\r\n`);
    expect(CSV_COLUMNS).toContain('settlement_gross');
    expect(CSV_COLUMNS).toContain('financial_role');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('neutralises formula injection in text values', () => {
    const line = csvLineFor(
      row({ description: '=HYPERLINK("http://x")', category: '+cmd' }),
    );
    expect(line).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(line).toContain("'+cmd");
    expect(csvLineFor(row({ description: '@import' }))).toContain("'@import");
    expect(csvLineFor(row({ description: '-2+3' }))).toContain("'-2+3");
  });

  it('formats stored settlement figures without recalculating', () => {
    const line = csvLineFor(
      row({
        referenceType: 'SETTLEMENT',
        referenceId: 9,
        farm: { name: 'Kebun B', ownershipType: 'OWN' },
        settlement: {
          grossShare: '120000.00',
          kasbonAmount: '20000.00',
          deductionAmount: '20000.00',
          netAmount: '100000.00',
          worker: { name: 'Budi' },
          sale: { farm: { name: 'Kebun B' } },
        },
      }),
    );

    expect(line).toContain(',Budi,Kebun B,120000,120000,20000,100000,OWN');
  });

  it('marks a relative farm harvest sale as passthrough', () => {
    const line = csvLineFor(
      row({ farm: { name: 'Kebun Saudara', ownershipType: 'RELATIVE' } }),
    );

    expect(line.trimEnd().endsWith('PASSTHROUGH')).toBe(true);
  });
});
