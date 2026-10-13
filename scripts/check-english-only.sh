# path: scripts/check-english-only.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
scan_roots = [
    "app", "components", "lib", "services", "config", "migrations", "scripts",
    ".github", ".husky",
]
root_files = ["middleware.ts", "tailwind.config.ts", "postcss.config.ts", "next.config.mjs"]
ignored_directories = {".git", ".next", "node_modules", "build", "coverage", "dist", "out"}
violations: list[tuple[str, int]] = []

for name in scan_roots:
    base = root / name
    if not base.is_dir():
        continue
    for current, directories, files in os.walk(base):
        directories[:] = sorted(entry for entry in directories if entry not in ignored_directories)
        for filename in sorted(files):
            path = Path(current) / filename
            try:
                contents = path.read_bytes()
            except OSError as error:
                print(f"Cannot read {path.relative_to(root)}: {error}", file=sys.stderr)
                raise SystemExit(2)
            if b"\0" in contents:
                continue
            for line_number, line in enumerate(contents.splitlines(), start=1):
                if any(byte > 0x7F for byte in line):
                    violations.append((path.relative_to(root).as_posix(), line_number))

for name in root_files:
    path = root / name
    if not path.is_file():
        continue
    for line_number, line in enumerate(path.read_bytes().splitlines(), start=1):
        if any(byte > 0x7F for byte in line):
            violations.append((name, line_number))

if violations:
    print("Non-ASCII source content is not permitted:", file=sys.stderr)
    for path, line_number in violations:
        print(f"- {path}:{line_number}", file=sys.stderr)
    raise SystemExit(1)

print("English-only source check passed.")
PY
