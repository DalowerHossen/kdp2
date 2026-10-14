#!/usr/bin/env node
// path: scripts/build-feature-manifest.mjs
// Batch 7: generates docs/feature-manifest.json from FEATURE_LIST.md.
//  - canonical ids: regions A/B/D keep printed id; region C (lines 4277-4445,
//    printed 3451-3608) maps to printed + 579 => 4030-4187 (decision C2).
//  - step assignment: feature LINE ranges from docs/execution/STEP_FEATURES.md.
//  - FEATURE_LIST.md is never edited (decision C4).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SOURCE = 'FEATURE_LIST.md';
const TARGET = 'docs/feature-manifest.json';

const STEP_RANGES = [
  ['01', 1, 552], ['02', 553, 618], ['03', 619, 781], ['04', 782, 909],
  ['05', 910, 1076], ['06', 1077, 1666], ['07', 1667, 2124], ['08', 2125, 2508],
  ['09', 2509, 2879], ['10', 2880, 3452], ['11', 3453, 3769], ['12', 3770, 4094],
  ['13', 4095, 4276], ['14', 4277, 4445], ['15', 4446, 4912],
];
const EXPECTED_COUNTS = {
  '01': 450, '02': 40, '03': 133, '04': 109, '05': 145, '06': 499, '07': 390,
  '08': 325, '09': 323, '10': 499, '11': 264, '12': 273, '13': 158, '14': 158,
  '15': 421,
};
// Nearest spec part per IMPLEMENTATION_PLAN.md section 4 (approximation;
// section letter + line number is the precise anchor).
const STEP_TO_PART = {
  '01': 1, '02': 2, '03': 2, '04': 2, '05': 3, '06': 3, '07': 4,
  '08': 5, '09': 6, '10': 7, '11': 8, '12': 9, '13': 9, '14': 10, '15': 11,
};

function regionFor(line) {
  if (line <= 4094) return 'A';
  if (line <= 4276) return 'B';
  if (line <= 4445) return 'C';
  return 'D';
}

function stepFor(line) {
  for (const [step, from, to] of STEP_RANGES) {
    if (line >= from && line <= to) return step;
  }
  return null;
}

function slugify(text, id, used) {
  const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => !['the', 'and', 'for', 'with', 'per', 'any', 'all', 'sub'].includes(t));
  let slug = tokens.slice(0, 6).join('-');
  if (slug.length < 4) slug = `feature-${id}`;
  let candidate = slug;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

const raw = readFileSync(SOURCE, 'utf8');
const lines = raw.split('\n');

const records = [];
const usedSlugs = new Set();
let topSection = null;
let subSection = null;

lines.forEach((text, idx) => {
  const lineNo = idx + 1;
  const top = /^([A-Z])\.\s+(.+)$/.exec(text);
  if (top) {
    topSection = `${top[1]}`;
    return;
  }
  const sub = /^([A-Z][0-9]+)\.\s+(.+)$/.exec(text);
  if (sub) {
    subSection = sub[1];
    return;
  }
  const m = /^([0-9]+)\.\s+(.*\S)\s*$/.exec(text);
  if (!m) return;

  const printedId = Number(m[1]);
  const body = m[2];
  const region = regionFor(lineNo);
  const id = region === 'C' ? printedId + 579 : printedId;
  const step = stepFor(lineNo);
  if (step === null) {
    console.error(`manifest: line ${lineNo} (id ${printedId}) is outside every step range`);
    process.exit(1);
  }
  const asciiHint = (body.match(/\(([^()]*)\)/)?.[1] ?? (body.match(/[a-zA-Z][a-zA-Z0-9 ./+@-]{4,}/)?.[0] ?? '')).trim();

  records.push({
    id,
    printedId,
    region,
    line: lineNo,
    section: topSection,
    subsection: subSection,
    part: STEP_TO_PART[step],
    step,
    slug: slugify(body, id, usedSlugs),
    textBn: body,
    enHint: asciiHint.length >= 4 ? asciiHint : null,
    implemented: false,
    implementedBy: null,
    implementedAt: null,
  });
});

// --- validation ------------------------------------------------------------
const failures = [];

if (records.length !== 4187) failures.push(`expected 4187 features, parsed ${records.length}`);

const ids = new Set();
for (const r of records) {
  if (ids.has(r.id)) failures.push(`duplicate canonical id ${r.id} (line ${r.line})`);
  ids.add(r.id);
}

const perStep = {};
for (const r of records) perStep[r.step] = (perStep[r.step] ?? 0) + 1;
for (const [step, expected] of Object.entries(EXPECTED_COUNTS)) {
  const actual = perStep[step] ?? 0;
  if (actual !== expected) failures.push(`step ${step}: expected ${expected}, got ${actual}`);
}

const printedSeen = new Map();
for (const r of records) printedSeen.set(r.printedId, (printedSeen.get(r.printedId) ?? 0) + 1);
const duplicatedPrinted = [...printedSeen.entries()].filter(([, n]) => n === 2).map(([id]) => id);
if (duplicatedPrinted.length !== 158 || !duplicatedPrinted.every((id) => id >= 3451 && id <= 3608)) {
  failures.push(`printed ids appearing twice must be exactly 3451..3608; got ${duplicatedPrinted.length} ids`);
}

const renumbered = records.filter((r) => r.region === 'C').map((r) => `${r.printedId}->${r.id}`);

if (failures.length > 0) {
  for (const f of failures) console.error(`manifest: FAIL: ${f}`);
  process.exit(1);
}

const output = {
  generatedFrom: SOURCE,
  decision: 'C2: region C printed ids +579; FEATURE_LIST.md untouched (C4)',
  count: records.length,
  perStep: Object.fromEntries(Object.entries(perStep).sort(([a], [b]) => a.localeCompare(b))),
  records,
};

if (process.argv.includes('--check')) {
  if (!existsSync(TARGET)) {
    console.error(`feature-coverage: ${TARGET} missing; run node scripts/build-feature-manifest.mjs`);
    process.exit(1);
  }
  const existing = JSON.parse(readFileSync(TARGET, 'utf8'));
  const a = JSON.stringify(existing.records);
  const b = JSON.stringify(output.records);
  if (a !== b) {
    console.error('feature-manifest: docs/feature-manifest.json is stale; re-run the generator');
    process.exit(1);
  }
  console.log(`feature-manifest: OK (${records.length} records, per-step counts verified)`);
} else {
  writeFileSync(TARGET+'.tmp', JSON.stringify(output, null, 2) + '\n');
  const { renameSync } = await import('node:fs');
  renameSync(TARGET + '.tmp', TARGET);
  console.log(`manifest: wrote ${TARGET}`);
  console.log(`manifest: ${records.length} records`);
  console.log(`manifest: renumber map applied to region C (${renumbered.length} entries), e.g. ${renumbered.slice(0, 3).join(', ')}`);
  console.log('manifest: per-step counts:');
  for (const [step, count] of Object.entries(perStep).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  step ${step}: ${count}`);
  }
  console.log(`manifest: printed ids appearing twice: ${duplicatedPrinted.length} (3451..3608, expected)`);
}
