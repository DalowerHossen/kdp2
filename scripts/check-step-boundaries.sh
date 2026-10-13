# path: scripts/check-step-boundaries.sh
set -euo pipefail

step="${STEP_NUMBER:-}"
while (($# > 0)); do
  case "$1" in
    --step)
      if (($# < 2)); then
        printf '%s\n' 'Missing value for --step.' >&2
        exit 2
      fi
      step="$2"
      shift 2
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$step" ]]; then
  branch="$(git branch --show-current)"
  if [[ "$branch" =~ (^|/)step-([0-9]{2})(-|$) ]]; then
    step="${BASH_REMATCH[2]}"
  else
    step="00"
  fi
fi

if [[ ! "$step" =~ ^[0-9]{2}$ ]]; then
  printf 'Invalid step number: %s\n' "$step" >&2
  exit 2
fi

ownership_file="docs/execution/ownership.json"
if [[ ! -f "$ownership_file" ]]; then
  printf 'Ownership map not found: %s\n' "$ownership_file" >&2
  exit 2
fi

base_ref="${STEP_BASE_REF:-}"
if [[ -z "$base_ref" ]]; then
  if [[ "$step" == "00" ]]; then
    candidates=(foundation-v1 0a71ce351a9f54b2b41da721564a34f775249e7e)
  elif ((10#$step < 6)); then
    candidates=(foundation-v1)
  else
    candidates=(foundation-v2)
  fi
else
  candidates=("$base_ref")
fi

base_ref=""
for candidate in "${candidates[@]}"; do
  if git rev-parse --verify --quiet "$candidate^{commit}" >/dev/null; then
    base_ref="$candidate"
    break
  fi
done

if [[ -z "$base_ref" ]]; then
  printf '%s\n' 'Cannot resolve the assigned foundation tag; set STEP_BASE_REF to the branch base.' >&2
  exit 2
fi

python3 - "$step" "$ownership_file" "$base_ref" <<'PY'
import json
import re
import subprocess
import sys
from pathlib import Path

step, ownership_path, base_ref = sys.argv[1:]


def run_git(args: list[str]) -> bytes:
    result = subprocess.run(["git", *args], check=True, stdout=subprocess.PIPE)
    return result.stdout


def glob_regex(pattern: str) -> re.Pattern[str]:
    pieces: list[str] = []
    index = 0
    while index < len(pattern):
        char = pattern[index]
        if char == "*":
            if index + 1 < len(pattern) and pattern[index + 1] == "*":
                pieces.append(".*")
                index += 2
                continue
            pieces.append("[^/]*")
        elif char == "?":
            pieces.append("[^/]")
        else:
            pieces.append(re.escape(char))
        index += 1
    return re.compile("^" + "".join(pieces) + "$")


def pattern_specificity(pattern: str) -> int:
    return len(pattern.replace("**", "").replace("*", "").replace("?", ""))


def matches(path: str, pattern: str) -> bool:
    return glob_regex(pattern).fullmatch(path) is not None


try:
    ownership = json.loads(Path(ownership_path).read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    print(f"Cannot read ownership map: {error}", file=sys.stderr)
    raise SystemExit(2)

base_sha = run_git(["rev-parse", "--verify", f"{base_ref}^{{commit}}"]).decode().strip()
changed_bytes = run_git(["diff", "--name-only", "-z", base_sha, "--"])
untracked_bytes = run_git(["ls-files", "--others", "--exclude-standard", "-z"])
changed_paths = {
    item.decode("utf-8", errors="surrogateescape")
    for item in changed_bytes.split(b"\0") + untracked_bytes.split(b"\0")
    if item
}


def migration_owner(path: str) -> str | None:
    match = re.fullmatch(r"migrations/(\d{4})_[^/]+\.sql", path)
    if match is None:
        return None
    number = int(match.group(1))
    for owner, bounds in ownership["migrationRanges"].items():
        if bounds[0] <= number <= bounds[1]:
            return owner
    return "unowned"


def resolve_owner(path: str) -> str | None:
    if path in ownership["step00Paths"]:
        return "00"

    migration_step = migration_owner(path)
    if migration_step is not None:
        return migration_step

    candidates: list[tuple[int, str]] = []
    for owner, patterns in ownership["steps"].items():
        for pattern in patterns:
            if matches(path, pattern):
                candidates.append((pattern_specificity(pattern), owner))
    for pattern in ownership["integratorPaths"]:
        if matches(path, pattern):
            candidates.append((pattern_specificity(pattern), "integrator"))

    if not candidates:
        return None

    greatest_specificity = max(item[0] for item in candidates)
    owners = {owner for specificity, owner in candidates if specificity == greatest_specificity}
    if len(owners) != 1:
        return "ambiguous"
    return next(iter(owners))


protected = set(ownership["protectedPaths"])
exceptions = set(ownership["step00TemporaryExceptions"])
violations: list[tuple[str, str]] = []

for path in sorted(changed_paths):
    try:
        path.encode("ascii")
    except UnicodeEncodeError:
        violations.append((path, "non-ASCII path"))
        continue

    if path in protected:
        violations.append((path, "protected source specification"))
        continue

    owner = resolve_owner(path)
    if step == "00":
        if path.startswith("migrations/") and owner != "00":
            violations.append((path, "outside migration range 0000-0099"))
        elif owner not in (None, "00", "integrator") and path not in exceptions:
            violations.append((path, f"owned by step {owner}"))
    elif owner != step:
        violations.append((path, f"owned by {owner or 'no step'}"))

if violations:
    print(f"Boundary check failed for STEP_{step} against {base_sha}:", file=sys.stderr)
    for path, reason in violations:
        print(f"- {path}: {reason}", file=sys.stderr)
    raise SystemExit(1)

print(f"Boundary check passed for STEP_{step}: {len(changed_paths)} path(s) checked against {base_sha}.")
PY
