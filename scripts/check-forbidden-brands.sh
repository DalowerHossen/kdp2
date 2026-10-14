# path: scripts/check-forbidden-brands.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
forbidden = [
    "bK" + "ash", "Na" + "gad", "G" + "Cash", "Prompt" + "Pay", "Pay" + "Now",
    "U" + "PI", "Ali" + "pay", "We" + "Chat" + " Pay", "Dui" + "tNow", "M" + "oMo",
    "O" + "VO", "Go" + "Pay", "Pay" + "Pay", "Kakao" + "Pay", "Grab" + "Pay",
    "True" + "Money", "D" + "ana", "B" + "oost",
]
excluded_files = {
    "MASTER_PROMPT.md", "FEATURE_LIST.md", "IMPLEMENTATION_PLAN.md", "SPEC_CONFLICTS.md",
    "package-lock.json",
}
excluded_directories = {".git", ".next", "node_modules", "build", "coverage", "dist", "out"}
violations: list[tuple[str, int, str]] = []

for current, directories, files in os.walk(root):
    directories[:] = sorted(entry for entry in directories if entry not in excluded_directories)
    for filename in sorted(files):
        path = Path(current) / filename
        relative = path.relative_to(root).as_posix()
        if relative in excluded_files or relative.startswith("docs/execution/"):
            continue
        try:
            contents = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        folded_contents = contents.casefold()
        for line_number, line in enumerate(folded_contents.splitlines(), start=1):
            for name in forbidden:
                if name.casefold() in line:
                    violations.append((relative, line_number, name))

if violations:
    print("Forbidden partner labels found:", file=sys.stderr)
    for path, line_number, name in violations:
        print(f"- {path}:{line_number}: {name}", file=sys.stderr)
    raise SystemExit(1)

print("Forbidden-brand check passed.")
PY
