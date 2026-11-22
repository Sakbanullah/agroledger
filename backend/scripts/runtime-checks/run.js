/**
 * Compiles the checked services to CommonJS and runs the runtime checks that
 * the Jest setup cannot execute (Jest loads @nestjs/common as ESM).
 *
 * No database, no HTTP: every Prisma client used by the checks is a mock.
 *
 * Usage: node scripts/runtime-checks/run.js
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(__dirname, '.build');
const tsconfig = path.join(__dirname, 'tsconfig.check.json');

fs.rmSync(outDir, { recursive: true, force: true });

execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules/typescript/bin/tsc'),
    '-p',
    tsconfig,
  ],
  { cwd: root, stdio: 'inherit' },
);

const checks = [
  './credit-reference.check.js',
  './worker-settlement-guard.check.js',
  './reconciliation-audit.check.js',
  './lock-order.check.js',
  './settlement-response.check.js',
  './pay-response.check.js',
  './reconciliation-cancelled-sale.check.js',
];

(async () => {
  for (const check of checks) {
    const modulePath = path.join(outDir, 'scripts/runtime-checks', check);
    const module = require(modulePath);

    for (const [name, fn] of Object.entries(module)) {
      if (typeof fn === 'function' && name.startsWith('check')) {
        await fn();
      }
    }
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  process.stdout.write('\nruntime checks passed\n');
})().catch((error) => {
  console.error(error);
  fs.rmSync(outDir, { recursive: true, force: true });
  process.exit(1);
});
