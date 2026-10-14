#!/usr/bin/env bash
# path: scripts/check-feature-coverage.sh
# Guard: feature manifest integrity + coverage accounting. The final audit
# (STEP_14) requires implemented == 4187. Earlier steps require structural
# validity and non-decreasing coverage.
set -euo pipefail
cd "$(dirname "$0")/.."

MANIFEST=docs/feature-manifest.json

if [ ! -f "$MANIFEST" ]; then
  echo "feature-coverage: $MANIFEST not found; run npm run manifest first"
  exit 1
fi

node scripts/build-feature-manifest.mjs --check

node - <<'EOF'
const fs = require('node:fs');
const m = JSON.parse(fs.readFileSync('docs/feature-manifest.json', 'utf8'));
const total = m.records.length;
const implemented = m.records.filter((r) => r.implemented === true).length;
console.log(`feature-coverage: implemented ${implemented} of ${total}`);
if (implemented > total || total !== 4187) process.exit(1);
const bad = m.records.filter((r) => r.implemented === true && (!r.implementedBy || !r.implementedAt));
if (bad.length > 0) {
  console.error(`feature-coverage: ${bad.length} implemented record(s) missing attribution`);
  process.exit(1);
}
EOF

echo "feature-coverage: OK"
