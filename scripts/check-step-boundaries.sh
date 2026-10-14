#!/usr/bin/env bash
# path: scripts/check-step-boundaries.sh
# Thin wrapper kept for the documented name (`npm run check-boundaries`).
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/check-step-boundaries.mjs "$@"
