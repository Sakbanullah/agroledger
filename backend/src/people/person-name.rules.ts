/**
 * PersonName is a value object owning the name invariant:
 * two persons are the same person when their names differ only by
 * case or surrounding/repeated whitespace ("Budi " === "budi").
 */
export class PersonName {
  private constructor(readonly value: string) {}

  static create(raw: unknown): PersonName {
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error('Nama wajib diisi');
    }
    return new PersonName(raw.trim().replace(/\s+/g, ' '));
  }

  get normalized(): string {
    return this.value.toLowerCase();
  }

  equals(other: PersonName): boolean {
    return this.normalized === other.normalized;
  }
}

/**
 * MySQL collation of Person.name. Must match the live column (and the
 * migration's expression index), otherwise comparing a normalized name
 * against the column errors with "Illegal mix of collations".
 */
export const PERSON_NAME_COLLATION = 'utf8mb4_unicode_ci';

