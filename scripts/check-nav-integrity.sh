#!/usr/bin/env bash
# path: scripts/check-nav-integrity.sh
# Guard X20 (Rule 20): config/nav-map.ts is the single navigation source.
#  - every nav module href must point to an existing page route in app/
#  - every routed page under (dashboard)/(admin)/(client-portal) must be
#    registered in a nav module (utility + public pages exempt via the
#    exception list with reasons)
set -euo pipefail
cd "$(dirname "$0")/.."

violations=0

# Routes from the filesystem: app/(group)/x/y/page.tsx -> /x/y ; groups and
# [dynamic] segments preserved as-is.
routes=$(
  find app -type f \( -name 'page.tsx' -o -name 'page.ts' \) | while read -r p; do
    r="${p#app/}"
    r="${r%/page.tsx}"
    r="${r%/page.ts}"
    r=$(echo "$r" | sed -E 's/\([^/]+\)\///g')
    # a group segment that remains alone was the group's own home page
    r=$(echo "$r" | sed -E 's/^\([^/]+\)$//')
    [ -z "$r" ] && r="/" || r="/$r"
    echo "$r"
  done | sort -u
)

# Hrefs from nav modules.
hrefs=$(
  if ls config/nav/*.nav.ts >/dev/null 2>&1; then
    grep -hoE "href: '[^']+'" config/nav/*.nav.ts | sed -E "s/href: '//; s/'//" | sort -u
  fi
)

# Hard-coded foundation exceptions (shell index pages registered to no menu
# yet; STEP_01/STEP_10 absorb them into real nav trees).
exceptions=$'/\n/dashboard\n/admin'

# 1. dead nav links
for h in $hrefs; do
  if ! echo "$routes" | grep -qx "$h"; then
    echo "nav-integrity: nav entry has no matching page route: $h"
    violations=$((violations + 1))
  fi
done

# 2. unregistered app routes (private shells only)
for r in $routes; do
  case "$r" in
    /|/dashboard|/admin) ;; # exceptions above, handled by grep below
  esac
  if echo "$exceptions" | grep -qx "$r"; then
    continue
  fi
  case "$r" in
    /_*) continue ;; # next internals
  esac
  if ! echo "$hrefs" | grep -qx "$r"; then
    # public routes are exempt: marketing surface governed by STEP_01's nav
    echo "nav-integrity: page route not present in any nav module: $r"
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "nav-integrity: FAILED ($violations issue(s))"
  exit 1
fi
echo "nav-integrity: OK ($(echo "$routes" | grep -c . | tr -d ' ') routes, $(echo "$hrefs" | grep -c . | tr -d ' ') nav entries)"
