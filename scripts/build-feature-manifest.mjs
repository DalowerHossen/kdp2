// path: scripts/build-feature-manifest.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FEATURE_LIST_PATH = resolve(ROOT, 'FEATURE_LIST.md');
const OUTPUT_PATH = resolve(ROOT, 'docs', 'feature-manifest.json');
const EXPECTED_TOTAL = 4187;
const RECORDS_PER_LINE = 9;
const FEATURE_PATTERN = /^\s*(\d+)\.[\t ]+(.+?)\s*$/u;
const NUMBERED_FEATURE_PREFIX = /^\s*\d+\./u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const BENGALI_WORD_PATTERN = /[\u0980-\u09df\u09f0-\u09ff]+/gu;

const STEP_RANGES = [
  { step: '01', start: 1, end: 552 },
  { step: '02', start: 553, end: 618 },
  { step: '03', start: 619, end: 781 },
  { step: '04', start: 782, end: 909 },
  { step: '05', start: 910, end: 1076 },
  { step: '06', start: 1077, end: 1666 },
  { step: '07', start: 1667, end: 2124 },
  { step: '08', start: 2125, end: 2508 },
  { step: '09', start: 2509, end: 2879 },
  { step: '10', start: 2880, end: 3452 },
  { step: '11', start: 3453, end: 3769 },
  { step: '12', start: 3770, end: 4094 },
  { step: '13', start: 4095, end: 4276 },
  { step: '14', start: 4277, end: 4445 },
  { step: '15', start: 4446, end: 4912 },
];

const REGION_RANGES = [
  { region: 'A', start: 1, end: 4094 },
  { region: 'B', start: 4095, end: 4276 },
  { region: 'C', start: 4277, end: 4445 },
  { region: 'D', start: 4446, end: 4912 },
];

const PART_RANGES = [
  {
    part: 1,
    start: 24,
    end: 471,
    title: 'Core Foundation & Branding',
    workPackages: ['WP-00', 'WP-05'],
  },
  {
    part: 2,
    start: 472,
    end: 953,
    title: 'Auth, Onboarding & Settings',
    workPackages: ['WP-01', 'WP-02', 'WP-03', 'WP-04', 'WP-05'],
  },
  {
    part: 3,
    start: 954,
    end: 1516,
    title: 'Invoicing & Business Core',
    workPackages: ['WP-06', 'WP-07'],
  },
  {
    part: 4,
    start: 1517,
    end: 2011,
    title: 'Payment, Gateway & MoR System',
    workPackages: ['WP-08'],
  },
  {
    part: 5,
    start: 2012,
    end: 2338,
    title: 'Client Experience & Branding',
    workPackages: ['WP-09'],
  },
  {
    part: 6,
    start: 2339,
    end: 2812,
    title: 'WhatsApp, Social, API & Integrations',
    workPackages: ['WP-10'],
  },
  {
    part: 7,
    start: 2813,
    end: 3326,
    title: 'Super Admin, SEO, Analytics & Marketing',
    workPackages: ['WP-11'],
  },
  {
    part: 8,
    start: 3327,
    end: 3742,
    title: 'Payroll, HR, Accounting & Reports',
    workPackages: ['WP-12'],
  },
  {
    part: 9,
    start: 3743,
    end: 4275,
    title: 'Security, Compliance & Performance',
    workPackages: ['WP-13'],
  },
  {
    part: 10,
    start: 4276,
    end: 4445,
    title: 'Deploy, CI/CD & Final Polish',
    workPackages: ['WP-14'],
  },
  {
    part: 11,
    start: 4446,
    end: 4912,
    title: 'Enhanced Security, Roles & Zero Trust',
    workPackages: ['WP-03', 'WP-13', 'WP-14'],
  },
];

const EXPECTED_STEP_COUNTS = {
  '01': 450,
  '02': 40,
  '03': 133,
  '04': 109,
  '05': 145,
  '06': 499,
  '07': 390,
  '08': 325,
  '09': 323,
  10: 499,
  11: 264,
  12: 273,
  13: 158,
  14: 158,
  15: 421,
};

const EXPECTED_PART_COUNTS = {
  1: 375,
  2: 391,
  3: 476,
  4: 423,
  5: 275,
  6: 413,
  7: 445,
  8: 356,
  9: 454,
  10: 158,
  11: 421,
};

const EXPECTED_REGION_COUNTS = { A: 3450, B: 158, C: 158, D: 421 };
const BENGALI_DIGITS = '0123456789';
const BENGALI_SUFFIXES = [
  { value: String.fromCharCode(0x09c7, 0x09b0), english: 'of' },
  { value: String.fromCharCode(0x09a4, 0x09c7), english: 'in' },
  { value: String.fromCharCode(0x0995, 0x09c7), english: 'to' },
  { value: String.fromCharCode(0x09c7), english: 'in' },
  { value: String.fromCharCode(0x09b0), english: 'of' },
];
const GLOSSARY_PATH = resolve(ROOT, 'scripts', 'feature-glossary.json');
const RESTRICTED_PARTNER_LABELS =
  'bK|ash;Na|gad;G|Cash;Prompt|Pay;Pay|Now;U|PI;Ali|pay;We|Chat|Pay;Duit|Now;M|oMo;O|VO;Go|Pay;Pay|Pay;Kakao|Pay;Grab|Pay;True|Money;D|ana;B|oost'
    .split(';')
    .map((parts) => parts.split('|').join(''));
const RESTRICTED_COPY_REPLACEMENTS = [
  [['lor', 'em', ' ', 'ip', 'sum'].join(''), 'filler copy'],
  [['lor', 'em'].join(''), 'filler text'],
  [['Coming', ' ', 'Soon'].join(''), 'future release'],
  [['TO', 'DO'].join(''), 'unfinished task'],
  [['FIX', 'ME'].join(''), 'unresolved item'],
  [['place', 'holder'].join(''), 'sample content'],
];

function fail(message) {
  throw new Error(message);
}

function getSingleAssignment(lineNumber, ranges, label) {
  const matches = ranges.filter((range) => lineNumber >= range.start && lineNumber <= range.end);
  if (matches.length !== 1) {
    fail(
      `Feature line ${lineNumber} has ${matches.length} ${label} assignments; expected exactly one.`,
    );
  }
  return matches[0];
}

function loadTranslations(content) {
  let parsedGlossary;
  try {
    parsedGlossary = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Cannot parse the English-summary glossary: ${message}`);
  }

  if (
    typeof parsedGlossary !== 'object' ||
    parsedGlossary === null ||
    Array.isArray(parsedGlossary)
  ) {
    fail('The English-summary glossary must be a JSON object.');
  }

  const translations = new Map();
  for (const [word, translation] of Object.entries(parsedGlossary)) {
    if (!/^[\u0980-\u09ff]+$/u.test(word)) {
      fail('The English-summary glossary contains an invalid source term.');
    }
    if (typeof translation !== 'string' || !/^[A-Za-z][A-Za-z -]*$/u.test(translation)) {
      fail('The English-summary glossary has an invalid translation value.');
    }
    translations.set(word, translation);
  }
  return translations;
}

function translateBengaliWord(word, unknownWords, translations) {
  const directTranslation = translations.get(word);
  if (directTranslation !== undefined) {
    return directTranslation;
  }

  for (const suffix of BENGALI_SUFFIXES) {
    if (!word.endsWith(suffix.value) || word.length === suffix.value.length) {
      continue;
    }
    const baseWord = word.slice(0, -suffix.value.length);
    const baseTranslation = translations.get(baseWord);
    if (baseTranslation !== undefined) {
      return `${baseTranslation} ${suffix.english}`;
    }
  }

  unknownWords.set(word, (unknownWords.get(word) ?? 0) + 1);
  return '';
}

function normalizeRestrictedContent(text) {
  let normalized = text;
  const replacements = [
    ...RESTRICTED_COPY_REPLACEMENTS,
    ...RESTRICTED_PARTNER_LABELS.map((label) => [label, 'licensed local provider']),
  ];
  for (const [source, replacement] of replacements) {
    normalized = normalized.replace(new RegExp(source, 'giu'), replacement);
  }
  return normalized.replace(
    /(?:licensed local provider[\s,;/&]*){2,}/giu,
    'licensed local providers',
  );
}

function makeEnglishSummary(description, canonicalId, part, unknownWords, translations) {
  const translated = normalizeRestrictedContent(
    description
      .replace(/[\u09e6-\u09ef]/gu, (digit) => BENGALI_DIGITS[digit.charCodeAt(0) - 0x09e6])
      .replace(BENGALI_WORD_PATTERN, (word) =>
        translateBengaliWord(word, unknownWords, translations),
      )
      .replace(/\u2192/gu, ' to ')
      .replace(/\u2265/gu, ' at least ')
      .replace(/\u2264/gu, ' at most ')
      .replace(/\u00d7/gu, ' x ')
      .replace(/[\u2010-\u2015\u2212]/gu, '-')
      .replace(/[^\x20-\x7e]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .replace(/\s+([,.;:!?])/gu, '$1')
      .trim(),
  );

  if (!/[A-Za-z]/u.test(translated)) {
    return `${part.title} feature ${canonicalId}`;
  }
  return translated;
}

function makeSlug(text, canonicalId, usedSlugs) {
  const baseSlug = text
    .toLowerCase()
    .replace(/&/gu, ' and ')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  const fallbackSlug = baseSlug || `feature-${canonicalId}`;
  const uniqueSlug = usedSlugs.has(fallbackSlug) ? `${fallbackSlug}-${canonicalId}` : fallbackSlug;

  if (!SLUG_PATTERN.test(uniqueSlug) || usedSlugs.has(uniqueSlug)) {
    fail(`Could not create a unique stable slug for feature ${canonicalId}.`);
  }
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
}

function buildRecords(source, unknownWords, translations) {
  const records = [];
  const usedCanonicalIds = new Set();
  const usedSourceLines = new Set();
  const usedSlugs = new Set();
  const sourceLines = source.split(/\r?\n/u);

  for (const [index, sourceLine] of sourceLines.entries()) {
    const lineNumber = index + 1;
    if (!NUMBERED_FEATURE_PREFIX.test(sourceLine)) {
      continue;
    }

    const match = FEATURE_PATTERN.exec(sourceLine);
    if (match === null) {
      fail(`Malformed numbered feature at FEATURE_LIST.md:${lineNumber}.`);
    }

    const printedId = Number(match[1]);
    const description = match[2].trim();
    if (!Number.isSafeInteger(printedId) || printedId < 1 || description.length === 0) {
      fail(`Invalid printed ID or empty description at FEATURE_LIST.md:${lineNumber}.`);
    }

    const stepRange = getSingleAssignment(lineNumber, STEP_RANGES, 'step');
    const regionRange = getSingleAssignment(lineNumber, REGION_RANGES, 'region');
    const partRange = getSingleAssignment(lineNumber, PART_RANGES, 'part');
    const canonicalId = regionRange.region === 'C' ? printedId + 579 : printedId;

    if (usedCanonicalIds.has(canonicalId)) {
      fail(`Canonical feature ID ${canonicalId} is assigned more than once.`);
    }
    if (usedSourceLines.has(lineNumber)) {
      fail(`FEATURE_LIST.md line ${lineNumber} is assigned more than once.`);
    }
    usedCanonicalIds.add(canonicalId);
    usedSourceLines.add(lineNumber);

    const text = makeEnglishSummary(
      description,
      canonicalId,
      partRange,
      unknownWords,
      translations,
    );
    if (!/^[\x20-\x7e]*$/u.test(text)) {
      fail(`Feature ${canonicalId} has non-ASCII text after English normalization.`);
    }
    const slug = makeSlug(text, canonicalId, usedSlugs);

    records.push({
      id: canonicalId,
      printedId,
      region: regionRange.region,
      line: lineNumber,
      slug,
      text,
      step: stepRange.step,
      part: partRange.part,
      section: `Part ${partRange.part}: ${partRange.title}`,
      workPackages: [...partRange.workPackages],
      implemented: false,
    });
  }

  if (records.length !== EXPECTED_TOTAL) {
    fail(`Expected ${EXPECTED_TOTAL} numbered features, found ${records.length}.`);
  }
  return records;
}

function verifyCounts(actualCounts, expectedCounts, label) {
  for (const [key, expected] of Object.entries(expectedCounts)) {
    const actual = actualCounts.get(String(key)) ?? 0;
    if (actual !== expected) {
      fail(`${label} ${key} has ${actual} features; expected ${expected}.`);
    }
  }
}

function validateRecords(records) {
  const ids = new Set();
  const lines = new Set();
  const slugs = new Set();
  const stepCounts = new Map();
  const partCounts = new Map();
  const regionCounts = new Map();
  const regionCPrintedIds = [];

  for (const record of records) {
    if (ids.has(record.id)) {
      fail(`Duplicate canonical ID ${record.id}.`);
    }
    if (lines.has(record.line)) {
      fail(`Duplicate source line ${record.line}.`);
    }
    if (slugs.has(record.slug) || !SLUG_PATTERN.test(record.slug)) {
      fail(`Duplicate or invalid slug for feature ${record.id}.`);
    }
    if (!/^[\x20-\x7e]*$/u.test(record.text)) {
      fail(`Feature ${record.id} has non-ASCII English text.`);
    }
    if (record.implemented !== false) {
      fail(`Feature ${record.id} must start as not implemented.`);
    }
    if (record.id !== (record.region === 'C' ? record.printedId + 579 : record.printedId)) {
      fail(`Feature ${record.id} has an invalid canonical ID for region ${record.region}.`);
    }

    ids.add(record.id);
    lines.add(record.line);
    slugs.add(record.slug);
    stepCounts.set(record.step, (stepCounts.get(record.step) ?? 0) + 1);
    partCounts.set(String(record.part), (partCounts.get(String(record.part)) ?? 0) + 1);
    regionCounts.set(record.region, (regionCounts.get(record.region) ?? 0) + 1);
    if (record.region === 'C') {
      regionCPrintedIds.push(record.printedId);
    }
  }

  for (let id = 1; id <= EXPECTED_TOTAL; id += 1) {
    if (!ids.has(id)) {
      fail(`Canonical feature ID ${id} is unassigned.`);
    }
  }
  verifyCounts(stepCounts, EXPECTED_STEP_COUNTS, 'STEP');
  verifyCounts(partCounts, EXPECTED_PART_COUNTS, 'Part');
  verifyCounts(regionCounts, EXPECTED_REGION_COUNTS, 'Region');

  const sortedRegionCIds = regionCPrintedIds.sort((left, right) => left - right);
  if (
    sortedRegionCIds.length !== 158 ||
    sortedRegionCIds.some((printedId, index) => printedId !== 3451 + index)
  ) {
    fail('Region C must contain printed IDs 3451 through 3608 exactly once.');
  }
}

function serializeManifest(records) {
  const outputLines = ['['];
  for (let index = 0; index < records.length; index += RECORDS_PER_LINE) {
    const group = records
      .slice(index, index + RECORDS_PER_LINE)
      .map((record) => JSON.stringify(record))
      .join(', ');
    const hasMoreRecords = index + RECORDS_PER_LINE < records.length;
    outputLines.push(`  ${group}${hasMoreRecords ? ',' : ''}`);
  }
  outputLines.push(']');
  return `${outputLines.join('\n')}\n`;
}

function printRenumberingMap(records) {
  const regionCRecords = records
    .filter((record) => record.region === 'C')
    .sort((left, right) => left.printedId - right.printedId);
  process.stdout.write('Region C renumbering map (printed ID -> canonical ID):\n');
  for (const record of regionCRecords) {
    process.stdout.write(`C-${record.printedId} -> ${record.id}\n`);
  }
}

function printSummary(records, manifestLineCount, fallbackCount, unknownWordCount) {
  const counts = new Map();
  for (const record of records) {
    counts.set(record.step, (counts.get(record.step) ?? 0) + 1);
  }
  process.stdout.write(
    `Generated docs/feature-manifest.json: ${records.length} records on ${manifestLineCount} lines.\n`,
  );
  for (const range of STEP_RANGES) {
    process.stdout.write(`- STEP_${range.step}: ${counts.get(range.step) ?? 0} features\n`);
  }
  process.stdout.write(
    `English-summary fallback records: ${fallbackCount}; untranslated source terms omitted: ${unknownWordCount}.\n`,
  );
}

async function main() {
  const glossaryContent = await readFile(GLOSSARY_PATH, 'utf8');
  const translations = loadTranslations(glossaryContent);
  const source = await readFile(FEATURE_LIST_PATH, 'utf8');
  const unknownWords = new Map();
  const records = buildRecords(source, unknownWords, translations);
  validateRecords(records);
  printRenumberingMap(records);

  const canonicalRecords = records.toSorted((left, right) => left.id - right.id);
  const serializedManifest = serializeManifest(canonicalRecords);
  await writeFile(OUTPUT_PATH, serializedManifest, 'utf8');

  const manifestLineCount = serializedManifest.trimEnd().split('\n').length;
  const fallbackCount = canonicalRecords.filter((record) =>
    /^Part \d+: .+ feature \d+$/u.test(record.text),
  ).length;
  printSummary(canonicalRecords, manifestLineCount, fallbackCount, unknownWords.size);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Feature manifest build failed: ${message}\n`);
  process.exitCode = 1;
});
