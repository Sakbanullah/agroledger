/**
 * Prints the settlement backfill preview for the running backend.
 *
 * Read-only: it calls GET /settlements/migration-preview, which only selects,
 * and writes nothing to the database.
 *
 * Usage: node scripts/preview-settlement-backfill.js [baseUrl]
 */
const baseUrl = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '');

(async () => {
  const response = await fetch(`${baseUrl}/settlements/migration-preview`);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const preview = await response.json();

  if (preview.readOnly !== true) {
    throw new Error('preview is not marked read-only; refusing to trust it');
  }

  process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
