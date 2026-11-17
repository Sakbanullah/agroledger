import { PersonName } from './person-name.rules';

describe('PersonName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(PersonName.create('  Budi   Santoso ').value).toBe('Budi Santoso');
  });

  it('treats case-only and whitespace-only differences as the same name', () => {
    const a = PersonName.create('Budi Santoso');
    expect(a.equals(PersonName.create('budi santoso'))).toBe(true);
    expect(a.equals(PersonName.create('BUDI  SANTOSO '))).toBe(true);
  });

  it('keeps genuinely different names apart', () => {
    expect(
      PersonName.create('Budi').equals(PersonName.create('Budiman')),
    ).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(() => PersonName.create('   ')).toThrow('Nama wajib diisi');
  });
});
