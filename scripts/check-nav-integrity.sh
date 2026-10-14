# path: scripts/check-nav-integrity.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python3 - "$root" <<'PY'
import os
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
app_root = root / "app"
nav_root = root / "config" / "nav"
nav_map = root / "config" / "nav-map.ts"
route_files: list[tuple[str, str]] = []
registered: set[str] = set()
href_values: set[str] = set()
route_pattern = re.compile(r"\b(?:href|route|path)\s*:\s*(['\"])(.*?)\1")


def normalized_route(value: str) -> str:
    path = value.split("?", 1)[0].split("#", 1)[0]
    if not path.startswith("/"):
        return path
    pieces: list[str] = []
    for piece in path.strip("/").split("/"):
        if not piece:
            continue
        if piece.startswith(":"):
            name = piece[1:].rstrip("*")
            pieces.append(f"[{name}]" if name else piece)
        else:
            pieces.append(piece)
    return "/" + "/".join(pieces) if pieces else "/"


def app_route(file_path: Path) -> tuple[str, str]:
    relative = file_path.relative_to(app_root)
    pieces = list(relative.parts[:-1])
    route_pieces: list[str] = []
    for piece in pieces:
        if piece.startswith("(") and piece.endswith(")"):
            continue
        if piece.startswith("@") or piece.startswith("_"):
            continue
        route_pieces.append(piece)
    route = "/" + "/".join(route_pieces) if route_pieces else "/"
    return normalized_route(route), relative.as_posix()


if app_root.is_dir():
    for current, directories, files in os.walk(app_root):
        directories[:] = sorted(
            entry for entry in directories
            if entry not in {"api", "_components", "_lib"} and not entry.startswith("@")
        )
        if "page.tsx" in files or "page.ts" in files:
            filename = "page.tsx" if "page.tsx" in files else "page.ts"
            route, file_name = app_route(Path(current) / filename)
            route_files.append((route, file_name))

nav_sources: list[Path] = []
if nav_map.is_file():
    nav_sources.append(nav_map)
if nav_root.is_dir():
    nav_sources.extend(sorted(nav_root.rglob("*.ts")))

for source in nav_sources:
    try:
        content = source.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        print(f"Cannot read navigation source {source.relative_to(root)}: {error}", file=sys.stderr)
        raise SystemExit(2)
    for match in route_pattern.finditer(content):
        route = normalized_route(match.group(2))
        if route.startswith("/"):
            registered.add(route)
            if match.group(0).lstrip().startswith("href"):
                href_values.add(route)

if route_files and not nav_map.is_file():
    print("Route pages exist, but config/nav-map.ts is missing.", file=sys.stderr)
    raise SystemExit(1)

known_later_routes = {
    "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/2fa",
}
missing_registrations = [
    (route, filename)
    for route, filename in route_files
    if route not in registered and route not in known_later_routes
]

missing_targets: list[str] = []
for route in sorted(href_values):
    matching = [filename for app_route_value, filename in route_files if app_route_value == route]
    if matching:
        continue
    if route in known_later_routes:
        continue
    if route == "/" and not route_files:
        continue
    missing_targets.append(route)

if missing_registrations or missing_targets:
    print("Navigation integrity check failed:", file=sys.stderr)
    for route, filename in missing_registrations:
        print(f"- Unregistered route {route} from app/{filename}", file=sys.stderr)
    for route in missing_targets:
        print(f"- Navigation link has no matching page: {route}", file=sys.stderr)
    raise SystemExit(1)

print(
    f"Navigation integrity check passed: {len(route_files)} page route(s), "
    f"{len(registered)} registered path(s), and {len(href_values)} link target(s)."
)
PY
