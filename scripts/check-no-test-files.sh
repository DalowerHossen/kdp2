#!/usr/bin/env bash
# path: scripts/check-no-test-files.sh
# Guard X8 (Rule 4): no automated test files exist anywhere in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."

found=$(find . \
  -path './node_modules' -prune -o \
  -path './.next' -prune -o \
  -path './.git' -prune -o \
  \( -type f \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.test.js' \
    -o -name '*.spec.ts' -o -name '*.spec.tsx' -o -name '*.spec.js' \) -print \) \
  -o \( -type d \( -name 'tests' -o -name '__tests__' \) -print \))

if [ -n "$found" ]; then
  echo "no-test-files: forbidden test artifacts found:"
  echo "$found"
  exit 1
fi
echo "no-test-files: OK"
