# path: scripts/check-no-test-files.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
ignored_directories = {".git", ".next", "node_modules", "build", "coverage", "dist", "out"}
forbidden_directories = {"tests", "__tests__"}
violations: list[str] = []

for current, directories, files in os.walk(root):
    current_path = Path(current)
    for directory in sorted(directories):
        if directory in forbidden_directories:
            violations.append((current_path / directory).relative_to(root).as_posix())
    directories[:] = sorted(
        directory for directory in directories
        if directory not in ignored_directories and directory not in forbidden_directories
    )
    for filename in sorted(files):
        folded = filename.casefold()
        if ".test." in folded or ".spec." in folded:
            violations.append((current_path / filename).relative_to(root).as_posix())

if violations:
    print("Automated test files and test directories are not permitted:", file=sys.stderr)
    for path in sorted(set(violations)):
        print(f"- {path}", file=sys.stderr)
    raise SystemExit(1)

print("No-test-files check passed.")
PY
