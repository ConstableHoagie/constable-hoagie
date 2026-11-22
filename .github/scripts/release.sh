#!/usr/bin/env bash
# Bump the patch version, build the same zip layout as setup/publish.ps1, attach SHA-256, create the GitHub release.
set -euo pipefail
NOTE="${1:-autopatch}"
NEW=$(python3 - <<'PY'
import json
p = "app/version.json"; v = json.load(open(p))
a, b, c = (int(x) for x in v["version"].split("."))
v["version"] = "%d.%d.%d" % (a, b, c + 1)
json.dump(v, open(p, "w")); print(v["version"])
PY
)
git config user.name "constable-hoagie-autopatch"
git config user.email "autopatch@users.noreply.github.com"
git add app/version.json
git commit -m "Release v$NEW [skip release]"
git push
STAGE="$(mktemp -d)"
IN="${STAGE:?}/ConstableHoagie"
mkdir -p "${IN:?}"
for p in app setup README.md README.html GUIDE.md CLAUDE.md docs "Start Constable Hoagie.cmd" "Stop Constable Hoagie.cmd" "Publish Update.cmd" "Setup Everything.cmd" "Share Privately.cmd" "Share Online.cmd" .gitignore; do
  if [ -e "$p" ]; then cp -r "$p" "${IN:?}/"; fi
done
# owner-only seed and the private media library never ship in a release
rm -rf "${IN:?}/app/seed" "${IN:?}/media"
find "${IN:?}" -name __pycache__ -type d -prune -exec rm -rf {} +
mkdir -p dist
ZIP="dist/ConstableHoagie-$NEW.zip"
(cd "${STAGE:?}" && zip -qr - ConstableHoagie) > "$ZIP"
HASH=$(sha256sum "$ZIP" | cut -d' ' -f1)
printf "%s  ConstableHoagie-%s.zip" "$HASH" "$NEW" > "$ZIP.sha256"
gh release create "v$NEW" "$ZIP" "$ZIP.sha256" --title "Constable Hoagie v$NEW" --notes "🛠 ${NOTE}

Released automatically after the tests passed. Every install updates within a few hours; Roll back is one click in the Health Inspector."
echo "Released v$NEW"
