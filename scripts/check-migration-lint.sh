#!/usr/bin/env bash
# path: scripts/check-migration-lint.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 - "$ROOT_DIR" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
migration_dir = root / 'migrations'
up_files = sorted(
    path for path in migration_dir.glob('[0-9][0-9][0-9][0-9]_*.sql')
    if not path.name.endswith('_down.sql')
)
if not up_files:
    raise SystemExit('Migration lint failed: no up migrations were found.')

all_sql = '\n'.join(path.read_text(encoding='utf-8') for path in sorted(migration_dir.glob('*.sql')))
create_table = re.compile(
    r'CREATE TABLE IF NOT EXISTS public\.([a-z_][a-z0-9_]*)\s*\(',
    re.IGNORECASE,
)
base_columns = {'id', 'company_id', 'created_at', 'updated_at', 'deleted_at', 'version'}
tables: list[str] = []
for path in up_files:
    name = path.name
    prefix = name[:4]
    if not '0000' <= prefix <= '0099':
        raise SystemExit(f'Migration lint failed: {name} is outside range 0000-0099.')
    down_path = migration_dir / f'{path.stem}_down.sql'
    if not down_path.is_file():
        raise SystemExit(f'Migration lint failed: {name} has no matching down migration.')
    if path.read_text(encoding='utf-8').splitlines()[0] != f'-- path: migrations/{name}':
        raise SystemExit(f'Migration lint failed: {name} has an invalid path comment.')
    if down_path.read_text(encoding='utf-8').splitlines()[0] != f'-- path: migrations/{down_path.name}':
        raise SystemExit(f'Migration lint failed: {down_path.name} has an invalid path comment.')
    sql = path.read_text(encoding='utf-8')
    if not sql.isascii():
        raise SystemExit(f'Migration lint failed: {name} contains non-ASCII source text.')
    if re.search(r'\b(?:real|float\d*|double\s+precision)\b', sql, re.IGNORECASE):
        raise SystemExit(f'Migration lint failed: {name} uses a floating-point SQL type.')
    if re.search(r'ON\s+DELETE\s+CASCADE|DROP\s+[^;]*\bCASCADE\b', sql, re.IGNORECASE):
        raise SystemExit(f'Migration lint failed: {name} uses a cascading delete or drop.')
    for line in sql.splitlines():
        column = re.match(r'^\s*([a-z_][a-z0-9_]*)\s+(.+)$', line, re.IGNORECASE)
        if column is None:
            continue
        column_name, definition = column.groups()
        if re.fullmatch(
            r'(?:amount|balance|cost|discount_value|fee|invoice_total|monthly_price|'
            r'payout_amount|price_[a-z0-9_]+|refund_amount|subtotal|tax_amount|'
            r'total_amount|yearly_price)',
            column_name,
            re.IGNORECASE,
        ) and not re.match(r'^numeric\s*\(\s*18\s*,\s*4\s*\)', definition, re.IGNORECASE):
            raise SystemExit(
                f'Migration lint failed: {name} money column {column_name} is not numeric(18,4).'
            )

for match in create_table.finditer(all_sql):
    table = match.group(1).lower()
    tail = all_sql[match.end():]
    end = re.search(r'^\s*\);\s*$', tail, re.MULTILINE)
    if end is None:
        raise SystemExit(f'Migration lint failed: could not parse table {table}.')
    block = tail[:end.start()]
    columns = {
        column.group(1).lower()
        for column in re.finditer(r'^\s*([a-z_][a-z0-9_]*)\s+', block, re.MULTILINE)
    }
    missing = sorted(base_columns - columns)
    if missing:
        raise SystemExit(f'Migration lint failed: {table} lacks base columns: {", ".join(missing)}.')
    if table not in tables:
        tables.append(table)

trigger_pattern = re.compile(
    r'CREATE\s+TRIGGER\s+([a-z_][a-z0-9_]*)\s+.*?\bON\s+public\.([a-z_][a-z0-9_]*)',
    re.IGNORECASE | re.DOTALL,
)
triggers = [(name.lower(), table.lower()) for name, table in trigger_pattern.findall(all_sql)]
for table in tables:
    checks = (
        (rf'ALTER TABLE public\.{table}\s+ENABLE ROW LEVEL SECURITY', 'row-level security'),
        (rf'ALTER TABLE public\.{table}\s+FORCE ROW LEVEL SECURITY', 'forced row-level security'),
        (rf'CREATE POLICY policy_{table}_default_deny\b', 'default-deny policy'),
        (rf'CREATE INDEX IF NOT EXISTS idx_{table}_company_id\b', 'company_id index'),
        (rf'CREATE INDEX IF NOT EXISTS idx_{table}_created_at\b', 'created_at index'),
    )
    for pattern, description in checks:
        if re.search(pattern, all_sql, re.IGNORECASE) is None:
            raise SystemExit(f'Migration lint failed: {table} has no {description}.')
    if not any(table_name == table and 'audit' in trigger_name for trigger_name, table_name in triggers):
        raise SystemExit(f'Migration lint failed: {table} has no audit-named trigger.')

print(
    f'Migration lint passed: {len(up_files)} up migration(s), '
    f'{len(tables)} application table(s), and matching down files.'
)
PY
