#!/usr/bin/env bash
# path: scripts/check-money-types.sh
# Guard X2 (Rule 2): a JavaScript/TypeScript `number` must never carry money.
# Scans lib/, services/, app/api/ for monetary identifiers typed as number.
set -euo pipefail
cd "$(dirname "$0")/.."

MONEY_WORDS='amount|total|subtotal|tax|fee|balance|price|rate_value|net|gross'
violations=0

scan_dirs=(lib services app/api)
files=$(find "${scan_dirs[@]}" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null || true)

for f in $files; do
  # identifier ending in a money word, explicitly typed as number:
  #   amount: number  |  totalAmount: number  (case-insensitive suffix match)
  hits=$(grep -nEi "([a-zA-Z_]*(${MONEY_WORDS}))[[:space:]]*:[[:space:]]*number([^a-zA-Z0-9_]|$)" "$f" || true)
  if [ -n "$hits" ]; then
    echo "money-types: monetary identifier typed as number in $f:"
    echo "$hits" | head -5
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "money-types: FAILED ($violations file(s))"
  exit 1
fi
echo "money-types: OK ($(echo "$files" | wc -w | tr -d ' ') files scanned)"
