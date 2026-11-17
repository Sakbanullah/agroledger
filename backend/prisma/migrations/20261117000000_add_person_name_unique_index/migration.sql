-- Prevent duplicate Person names: case-insensitive, ignoring surrounding
-- whitespace. MariaDB expression index, so no generated column / table rewrite.
--
-- Deliberately NOT created by `prisma migrate dev` (Prisma cannot express
-- expression indexes). A future migrate dev may therefore consider dropping
-- it; keep this migration as the source of truth.
--
-- If this migration fails because duplicate names already exist, resolve the
-- duplicates first (this strips whitespace only; it never deletes persons):
--   SELECT id, name FROM Person WHERE name <> TRIM(name);
--   SELECT LOWER(TRIM(name)), COUNT(*) FROM Person GROUP BY 1 HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX `Person_name_normalized_key`
  ON `Person` ((LOWER(TRIM(`name`)) COLLATE utf8mb4_unicode_ci));
