#!/usr/bin/env bash
# path: scripts/check-english-only.sh
# Guard X1 (Rule 1): no non-ASCII characters in application source.
# The two spec documents (FEATURE_LIST.md, MASTER_PROMPT.md) and docs/ are
# intentionally out of scope (decision C4).
set -euo pipefail
cd "$(dirname "$0")/.."

targets=(app components lib services config migrations scripts netlify types .husky)
pattern_files=$(find "${targets[@]}" -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' \
     -o -name '*.sql' -o -name '*.json' -o -name '*.svg' -o -name '*.toml' \) \
  -not -path '*/node_modules/*' 2>/dev/null || true)
extra_files=(middleware.ts package.json netlify.toml .env.example .editorconfig components.json)

violations=0
for f in $pattern_files ${extra_files[*]}; do
  [ -f "$f" ] || continue
  # Skip generated file produced from design tokens (it is generated from JSON,
  # which is ASCII-checked at its own source).
  if LC_ALL=C grep -nP '[^\x00-\x7F]' "$f" >/dev/null 2>&1; then
    echo "english-only: NON-ASCII content in $f:"
    LC_ALL=C grep -nP '[^\x00-\x7F]' "$f" | head -5
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "english-only: FAILED ($violations file(s))"
  exit 1
fi
echo "english-only: OK ($(echo "$pattern_files" | wc -w | tr -d ' ') files scanned)"
