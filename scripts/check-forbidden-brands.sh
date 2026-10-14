#!/usr/bin/env bash
# path: scripts/check-forbidden-brands.sh
# Guard X18 (Rule 5): local payment partner brand names never appear in code,
# UI, data or docs-as-code. Generic names only:
#   "Global Payout Partners" / "Local Payment Methods via Licensed Partners"
# Escape hatch: a comment containing 'brand-allow <reason>' on the same line.
set -euo pipefail
cd "$(dirname "$0")/.."

brands=(
  'bkash' 'nagad' 'gcash' 'promptpay' 'paynow' '\bupi\b' 'alipay' 'wechat[ -]?pay'
  'duitnow' '\bmomo\b' '\bovo\b' 'gopay' 'paypay' 'kakaopay' 'grabpay'
  'truemoney' '\bdana\b' '\bboost\b'
)
pattern=$(IFS='|'; echo "${brands[*]}")

violations=0
# Scope: application source + authored markdown. The four planning documents
# are inputs that legitimately define the ban list itself.
code_files=$(find app components lib services config migrations scripts netlify types \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' -o -name '*.sql' -o -name '*.css' -o -name '*.json' \) \
  2>/dev/null)
md_files=$(find . -type f -name '*.md' \
  -not -path './node_modules/*' -not -path './.next/*' \
  -not -path './FEATURE_LIST.md' -not -path './MASTER_PROMPT.md' \
  -not -path './CHAT_PROMPTS.md' -not -path './AGENT_BRIEFING.md' 2>/dev/null)
files="$code_files $md_files"

for f in $files; do
  case "$f" in
    scripts/check-forbidden-brands.sh) continue ;;
  esac
  # Case-insensitive, brand phrases; honor inline brand-allow markers.
  hits=$(grep -nEi "$pattern" "$f" | grep -vi 'brand-allow' || true)
  if [ -n "$hits" ]; then
    echo "forbidden-brands: $f:"
    echo "$hits" | head -5
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "forbidden-brands: FAILED ($violations file(s)). Use the generic partner names from Rule 5."
  exit 1
fi
echo "forbidden-brands: OK"
