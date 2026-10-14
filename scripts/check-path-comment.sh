# path: scripts/check-path-comment.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
ignored_directories = {".git", ".next", "node_modules", "build", "coverage", "dist", "out"}
violations: list[tuple[str, str]] = []
checked = 0

for current, directories, files in os.walk(root):
    directories[:] = sorted(entry for entry in directories if entry not in ignored_directories)
    for filename in sorted(files):
        path = Path(current) / filename
        suffix = path.suffix.lower()
        if suffix not in {".ts", ".tsx", ".sql"} or path.name == "next-env.d.ts":
            continue
        relative = path.relative_to(root).as_posix()
        prefix = "-- path:" if suffix == ".sql" else "// path:"
        expected = f"{prefix} {relative}"
        try:
            with path.open("r", encoding="utf-8") as source:
                actual = source.readline().rstrip("\r\n")
        except (OSError, UnicodeError) as error:
            violations.append((relative, str(error)))
            continue
        checked += 1
        if actual != expected:
            violations.append((relative, f"expected '{expected}' on line 1, found '{actual}'"))

if violations:
    print("Path comment check failed:", file=sys.stderr)
    for path, reason in violations:
        print(f"- {path}: {reason}", file=sys.stderr)
    raise SystemExit(1)

print(f"Path comment check passed for {checked} TypeScript and SQL file(s).")
PY
