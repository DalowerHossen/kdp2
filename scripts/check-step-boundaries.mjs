#!/usr/bin/env node
// path: scripts/check-step-boundaries.mjs
// Playbook section 4.2 enforcer: a step may create/edit only paths it owns.
// Usage: node scripts/check-step-boundaries.mjs --step 07 [--base <ref>]
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ownership = JSON.parse(readFileSync('docs/execution/ownership.json', 'utf8'));

const args = process.argv.slice(2);
const stepIdx = args.indexOf('--step');
const step = stepIdx >= 0 ? args[stepIdx + 1] : process.env.STEP ?? null;
const baseIdx = args.indexOf('--base');
let base = baseIdx >= 0 ? args[baseIdx + 1] : null;

if (step === null) {
  console.log('boundaries: no --step given and STEP env unset; skipping (integration context)');
  process.exit(0);
}
if (step === '00') {
  console.log('boundaries: step 00 owns everything this wave; pass');
  process.exit(0);
}

function refExists(ref) {
  try {
    execSync(`git rev-parse --verify --quiet ${ref}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (base === null) {
  for (const candidate of ['foundation-v1', 'origin/integration', 'integration', 'HEAD']) {
    if (refExists(candidate)) {
      base = candidate;
      break;
    }
  }
}

function changedPaths() {
  const tracked = base !== null && base !== 'HEAD'
    ? execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })
    : '';
  const working = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
  const staged = execSync('git diff --name-only --cached', { encoding: 'utf8' });
  const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' });
  const all = new Set();
  for (const block of [tracked, working, staged, untracked]) {
    for (const line of block.split('\n')) {
      const p = line.trim();
      if (p !== '') all.add(p);
    }
  }
  return [...all].sort();
}

function parseRange(pattern) {
  // migrations/0000_*.sql-0099_*.sql  =>  [prefixA, prefixB, from, to]
  const m = /^migrations\/(\d{4})_\*\.sql-(\d{4})_\*\.sql$/.exec(pattern);
  if (!m) return null;
  return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };
}

function matches(path, pattern) {
  const range = parseRange(pattern);
  if (range !== null) {
    const m = /^migrations\/(\d{4})_.*\.sql$/.exec(path);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return n >= range.from && n <= range.to;
  }
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return path === prefix.slice(0, -1) || path.startsWith(prefix);
  }
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix + '/') && !path.slice(prefix.length + 1).includes('/');
  }
  return path === pattern;
}

function ownerOf(path) {
  const overrides = ownership.$specificity_overrides ?? [];
  const hit = overrides.find((o) => matches(path, o.pattern));
  const keys = Object.keys(ownership).filter((k) => /^\d+$/.test(k));
  const owners = [];
  for (const k of keys) {
    for (const pattern of ownership[k]) {
      if (matches(path, pattern)) owners.push(k);
    }
  }
  // Specificity: deepest matching owner wins (mirrors FILE_OWNERSHIP.md rule 1),
  // with explicit table first.
  if (hit !== undefined) return hit.owner;
  if (owners.length === 0) return null;
  // The step lists are disjoint except for the recorded overrides; if several
  // match, the single-step result is ambiguous unless it is the override case.
  return owners[owners.length - 1];
}

const paths = changedPaths();
const violations = [];

for (const p of paths) {
  const isIntegrator = ownership.integrator.some((pattern) => matches(p, pattern));
  if (isIntegrator) {
    violations.push(`${p}  (integrator-owned; request changes via integrator/requests/step-${step}.json)`);
    continue;
  }
  const owner = ownerOf(p);
  if (owner === null) {
    violations.push(`${p}  (unowned path; no step may create it)`);
  } else if (owner !== step) {
    violations.push(`${p}  (owned by STEP_${owner})`);
  }
}

if (violations.length > 0) {
  console.error(`boundaries: FAILED for step ${step} (base: ${base ?? 'none'}):`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(`boundaries: OK for step ${step} (${paths.length} changed path(s), base: ${base ?? 'none'})`);
