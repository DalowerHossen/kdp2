#!/usr/bin/env bash
# path: scripts/check-forbidden-tokens.sh
# Guard X7 (Rule 7): no unfinished-work markers anywhere in shipped source.
set -euo pipefail
cd "$(dirname "$0")/.."

pattern='TODO|FIXME|XXX|HACK|coming[[:space:]]+soon|lorem[[:space:]]+ipsum|placeholder'
violations=0

files=$(find app components lib services config migrations scripts netlify types \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' -o -name '*.sql' -o -name '*.css' \) \
  2>/dev/null)

for f in $files; do
  case "$f" in
    scripts/check-forbidden-tokens.sh) continue ;;
  esac
  hits=$(grep -nEi "$pattern" "$f" | grep -vi 'guard-allow' || true)
  if [ -n "$hits" ]; then
    echo "forbidden-tokens: $f:"
    echo "$hits" | head -5
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "forbidden-tokens: FAILED ($violations file(s))"
  exit 1
fi
echo "forbidden-tokens: OK"
