#!/usr/bin/env node
// path: scripts/verify.mjs
// Runs every guard script and reports exactly what ran and what each returned.
// `npm run verify` is the single pre-merge gate (playbook section 6).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [
  ['tokens:check', 'node', ['scripts/build-design-tokens.mjs', '--check']],
  ['english-only', 'bash', ['scripts/check-english-only.sh']],
  ['money-types', 'bash', ['scripts/check-money-types.sh']],
  ['path-comment', 'bash', ['scripts/check-path-comment.sh']],
  ['forbidden-tokens', 'bash', ['scripts/check-forbidden-tokens.sh']],
  ['no-test-files', 'bash', ['scripts/check-no-test-files.sh']],
  ['forbidden-brands', 'bash', ['scripts/check-forbidden-brands.sh']],
  ['migration-lint', 'bash', ['scripts/check-migration-lint.sh']],
  ['nav-integrity', 'bash', ['scripts/check-nav-integrity.sh']],
  ['feature-coverage', 'bash', ['scripts/check-feature-coverage.sh']],
];

function detectStep() {
  if (process.env.STEP !== undefined && process.env.STEP !== '') return process.env.STEP;
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const m = /^kd\/step-(\d{2})-/.exec(branch);
    if (m) return m[1];
  } catch {
    /* no git context */
  }
  return null;
}

const results = [];
let failed = 0;

for (const [name, cmd, args] of checks) {
  const started = Date.now();
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  const status = res.status ?? 1;
  results.push({ name, status, ms: Date.now() - started });
  if (status !== 0) failed += 1;
}

// Boundary check: needs a step identity. Derived from branch (kd/step-NN-*)
// or STEP env; skipped with an explicit note in integration/Step-00 contexts.
const step = detectStep();
if (step === null) {
  results.push({ name: 'step-boundaries', status: 'skipped (no step identity)', ms: 0 });
} else {
  const started = Date.now();
  const res = spawnSync('bash', ['scripts/check-step-boundaries.sh', '--step', step], { stdio: 'inherit' });
  const status = res.status ?? 1;
  results.push({ name: 'step-boundaries', status, ms: Date.now() - started });
  if (status !== 0) failed += 1;
}

console.log('');
console.log('verify: summary');
for (const r of results) {
  console.log(`  ${String(r.status).padStart(26)} ${r.name.padEnd(20)} ${r.ms}ms`);
}
if (failed > 0) {
  console.error(`verify: FAILED (${failed} guard(s) red)`);
  process.exit(1);
}
console.log(`verify: OK (${results.length} guards executed or explicitly skipped)`);
