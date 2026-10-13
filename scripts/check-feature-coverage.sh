# path: scripts/check-feature-coverage.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" "$@" <<'PY'
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
require_complete = "--require-complete" in sys.argv[2:]
manifest_path = root / "docs" / "feature-manifest.json"
expected_counts = {
    "01": 450, "02": 40, "03": 133, "04": 109, "05": 145,
    "06": 499, "07": 390, "08": 325, "09": 323, "10": 499,
    "11": 264, "12": 273, "13": 158, "14": 158, "15": 421,
}
expected_total = 4187

if not manifest_path.is_file():
    print("Feature manifest is missing: docs/feature-manifest.json", file=sys.stderr)
    raise SystemExit(2)

try:
    records = json.loads(manifest_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    print(f"Cannot read feature manifest: {error}", file=sys.stderr)
    raise SystemExit(2)

if not isinstance(records, list):
    print("Feature manifest must be a JSON array.", file=sys.stderr)
    raise SystemExit(1)
if len(records) != expected_total:
    print(f"Expected {expected_total} feature records, found {len(records)}.", file=sys.stderr)
    raise SystemExit(1)

ids: set[int] = set()
lines: set[int] = set()
counts = {step: 0 for step in expected_counts}
implemented_count = 0
renumbered_printed_ids: list[int] = []
slug_pattern = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
required_fields = {"id", "printedId", "region", "line", "slug", "text", "step", "part", "implemented"}

for index, record in enumerate(records):
    if not isinstance(record, dict):
        print(f"Feature record {index} is not an object.", file=sys.stderr)
        raise SystemExit(1)
    missing = required_fields - record.keys()
    if missing:
        print(f"Feature record {index} is missing fields: {', '.join(sorted(missing))}.", file=sys.stderr)
        raise SystemExit(1)

    feature_id = record["id"]
    printed_id = record["printedId"]
    line = record["line"]
    step = record["step"]
    region = record["region"]
    if not isinstance(feature_id, int) or feature_id in ids:
        print(f"Feature record {index} has an invalid or duplicate canonical ID.", file=sys.stderr)
        raise SystemExit(1)
    if not isinstance(printed_id, int) or not isinstance(line, int) or line in lines:
        print(f"Feature record {index} has an invalid or duplicate source location.", file=sys.stderr)
        raise SystemExit(1)
    if step not in expected_counts:
        print(f"Feature {feature_id} has an invalid owner step: {step!r}.", file=sys.stderr)
        raise SystemExit(1)
    if region not in {"A", "B", "C", "D"}:
        print(f"Feature {feature_id} has an invalid source region: {region!r}.", file=sys.stderr)
        raise SystemExit(1)
    if not isinstance(record["slug"], str) or not slug_pattern.fullmatch(record["slug"]):
        print(f"Feature {feature_id} has an invalid English slug.", file=sys.stderr)
        raise SystemExit(1)
    if not isinstance(record["text"], str) or not record["text"].isascii():
        print(f"Feature {feature_id} must have an ASCII English summary.", file=sys.stderr)
        raise SystemExit(1)
    if not isinstance(record["part"], int) or not 1 <= record["part"] <= 11:
        print(f"Feature {feature_id} has an invalid part number.", file=sys.stderr)
        raise SystemExit(1)
    if not isinstance(record["implemented"], bool):
        print(f"Feature {feature_id} must have a boolean implementation status.", file=sys.stderr)
        raise SystemExit(1)

    expected_id = printed_id + 579 if region == "C" else printed_id
    if feature_id != expected_id:
        print(f"Feature {feature_id} has an incorrect canonical ID for region {region}.", file=sys.stderr)
        raise SystemExit(1)
    if region == "C":
        renumbered_printed_ids.append(printed_id)

    ids.add(feature_id)
    lines.add(line)
    counts[step] += 1
    implemented_count += int(record["implemented"])

if ids != set(range(1, expected_total + 1)):
    print("Canonical feature IDs must cover the range 1 through 4187 exactly once.", file=sys.stderr)
    raise SystemExit(1)
if counts != expected_counts:
    print(f"Feature allocation counts do not match the ledger: {counts}.", file=sys.stderr)
    raise SystemExit(1)
if sorted(renumbered_printed_ids) != list(range(3451, 3609)):
    print("Region C must contain the printed IDs 3451 through 3608 exactly once.", file=sys.stderr)
    raise SystemExit(1)
if require_complete and implemented_count != expected_total:
    print(f"Only {implemented_count} of {expected_total} features are marked implemented.", file=sys.stderr)
    raise SystemExit(1)

print(f"Feature allocation passed: {len(records)} records across 15 steps; {implemented_count} marked implemented.")
for step in sorted(expected_counts):
    print(f"- STEP_{step}: {counts[step]} features")
PY
