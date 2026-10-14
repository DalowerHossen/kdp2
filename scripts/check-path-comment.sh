#!/usr/bin/env bash
# path: scripts/check-path-comment.sh
# Guard X4 (Rule 8): line 1 of every source file is a path comment equal to
# the file's real location. Shebang (#!) scripts carry the path comment on
# line 2 instead.
#   .ts/.tsx/.mjs  -> // path: <path>
#   .sql           -> -- path: <path>
set -euo pipefail
cd "$(dirname "$0")/.."

violations=0
check_file() {
  local f="$1" prefix="$2"
  local first expected line_no
  first=$(head -n 1 "$f")
  line_no=1
  if [[ "$first" == '#!'* ]]; then
    first=$(sed -n '2p' "$f")
    line_no=2
  fi
  expected="${prefix} path: ${f}"
  if [ "$first" != "$expected" ]; then
    echo "path-comment: $f: line $line_no is '$first', expected '$expected'"
    violations=$((violations + 1))
  fi
}

while IFS= read -r f; do
  case "$f" in
    *next-env.d.ts) continue ;;
    *.sql) check_file "$f" "--" ;;
    *) check_file "$f" "//" ;;
  esac
done < <(find app components lib services config migrations scripts netlify types \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' -o -name '*.sql' \) 2>/dev/null)

for f in middleware.ts tailwind.config.ts postcss.config.ts; do
  [ -f "$f" ] && check_file "$f" "//"
done

if [ "$violations" -gt 0 ]; then
  echo "path-comment: FAILED ($violations file(s))"
  exit 1
fi
echo "path-comment: OK"
