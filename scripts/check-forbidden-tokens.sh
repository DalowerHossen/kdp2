# path: scripts/check-forbidden-tokens.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
tokens = ["TO" + "DO", "FIX" + "ME", "Coming" + " " + "Soon", "lor" + "em", "place" + "holder"]
excluded_files = {
    "MASTER_PROMPT.md", "FEATURE_LIST.md", "IMPLEMENTATION_PLAN.md", "SPEC_CONFLICTS.md",
    "AGENT_BRIEFING.md", "package-lock.json",
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
        for line_number, line in enumerate(contents.splitlines(), start=1):
            folded = line.casefold()
            for token in tokens:
                if token.casefold() in folded:
                    violations.append((relative, line_number, token))

if violations:
    print("Forbidden template or unfinished-work token found:", file=sys.stderr)
    for path, line_number, token in violations:
        print(f"- {path}:{line_number}: {token}", file=sys.stderr)
    raise SystemExit(1)

print("Forbidden-token check passed.")
PY
