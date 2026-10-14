#!/usr/bin/env bash
# path: scripts/check-migration-lint.sh
# Guards X3/X9/X10/X12 (Rules 9-11): static lint over migrations/.
# Runtime equivalents execute in scripts/verify-db.mjs against PGlite.
set -euo pipefail
cd "$(dirname "$0")/.."

violations=0
fail() { echo "migration-lint: $1"; violations=$((violations + 1)); }

ups=$(ls migrations/*.sql 2>/dev/null | grep -v '_down\.sql$' || true)

for f in $ups; do
  base=$(basename "$f")
  name="${base%.sql}"

  # 1. every up migration has a _down twin
  [ -f "migrations/${name}_down.sql" ] || fail "$base: missing migrations/${name}_down.sql"

  # 2. line 1 path comment
  first=$(head -n 1 "$f")
  [ "$first" = "-- path: $f" ] || fail "$base: line 1 must be '-- path: $f'"

  # 3. forbidden money column types anywhere in the file
  if grep -nEi '\b(float4?|float8|double precision|real)\b' "$f" >/dev/null; then
    fail "$base: float/double/real column type is forbidden (use numeric(18,4))"
  fi
  # bare numeric without precision/scale
  if grep -noEi 'numeric[[:space:]]*(not null|default|null|,|\))' "$f" >/dev/null; then
    fail "$base: bare numeric without (18,4) precision and scale"
  fi
  # numeric with anything other than (18,4)
  if grep -noEi 'numeric\([0-9]+,[0-9]+\)' "$f" | grep -v 'numeric(18,4)' >/dev/null; then
    fail "$base: numeric precision/scale other than (18,4)"
  fi

  # 4. idempotency: tables created with IF NOT EXISTS
  if grep -nE 'create table +(?!if not exists)' -P "$f" >/dev/null 2>&1; then
    fail "$base: CREATE TABLE without IF NOT EXISTS"
  fi

  # 5. every created table is followed by apply_base_rls + standard triggers
  tables=$(grep -oE 'create table if not exists [a-z_0-9\.]+' "$f" | awk '{print $NF}' || true)
  for t in $tables; do
    short="${t#public.}"
    grep -q "apply_base_rls('public.${short}')" "$f" \
      || fail "$base: table $short created without apply_base_rls"
    case "$short" in
      audit_logs | audit_log_hash_chain | _migration_ledger) ;;
      *)
        grep -q "attach_standard_triggers('public.${short}')" "$f" \
          || fail "$base: table $short created without attach_standard_triggers"
        ;;
    esac
  done

  # 6. FKs use ON DELETE RESTRICT (never CASCADE). Statements may span lines;
  # split on ';' (safe: DO/function bodies contain no REFERENCES clauses).
  while IFS= read -r stmt; do
    lower=$(printf '%s' "$stmt" | tr '[:upper:]' '[:lower:]')
    case "$lower" in
      *references*)
        case "$lower" in
          *'on delete restrict'*) ;;
          *) fail "$base: foreign key without ON DELETE RESTRICT: $(printf '%s' "$stmt" | tr -s ' ' | cut -c1-120)" ;;
        esac
        ;;
    esac
  done < <(awk 'BEGIN{RS=";"} {gsub(/\n/," "); printf "%s%s", $0, RS}' "$f")
done

# 7. unique indexes must be partial (WHERE ...) so soft-deleted rows can be
#    re-created. Statement-aware (index definitions may span lines).
#    _migration_ledger has no deleted_at column and is exempt by design.
for f in $ups; do
  base=$(basename "$f")
  while IFS= read -r stmt; do
    case "$stmt" in
      *'create unique index'*)
        case "$stmt" in
          *' where '*|*_migration_ledger*) ;;
          *) fail "$base: non-partial unique index: $(printf '%s' "$stmt" | tr -s ' ' | cut -c1-120)" ;;
        esac
        ;;
    esac
  done < <(awk 'BEGIN{RS=";"} {gsub(/\n/," "); printf "%s%s", $0, RS}' "$f")
done

if [ "$violations" -gt 0 ]; then
  echo "migration-lint: FAILED ($violations issue(s))"
  exit 1
fi
echo "migration-lint: OK ($(echo "$ups" | wc -w | tr -d ' ') migrations)"
