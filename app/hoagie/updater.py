"""Updates from GitHub Releases (free for public repos).

  check()    asks GitHub for the newest release of the repo named in app/version.json
  apply()    downloads that release's zip, checks its SHA-256, unpacks it to a staging
             folder, then hands over to setup/update.ps1, which waits for this server to
             stop, backs up the current version, copies the new one in and restarts Hoagie
  rollback() hands the newest backup to the same script

Your settings, avatars, holdings and keys live outside the app folder, so updates never
touch them. Only the app's own files are replaced.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.request
import zipfile
from pathlib import Path

from . import store

log = store.log
APP_DIR = Path(__file__).resolve().parent.parent      # .../ConstableHoagie/app
INSTALL = APP_DIR.parent                              # .../ConstableHoagie
UPD = store.DATA / "updates"
BACKUPS = store.DATA / "backups"
ALLOWED_HOSTS = ("github.com", "api.github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com")


def info():
    try:
        v = json.loads((APP_DIR / "version.json").read_text(encoding="utf-8-sig"))
    except Exception:
        v = {"version": "0.0.0", "repo": ""}
    backups = sorted([p.name for p in BACKUPS.glob("*") if p.is_dir()], reverse=True) if BACKUPS.exists() else []
    return {"version": v.get("version", "0.0.0"), "repo": v.get("repo", ""), "asset_prefix": v.get("asset_prefix", "ConstableHoagie-"),
            "backups": backups, "install": str(INSTALL)}


def _ver(s):
    nums = [int(x) for x in re.findall(r"\d+", s or "")[:3]]
    return tuple(nums + [0] * (3 - len(nums)))


def _get(url, accept="application/vnd.github+json", timeout=20):
    host = re.sub(r"^https://([^/]+)/.*$", r"\1", url)
    if not url.startswith("https://") or not any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS):
        raise RuntimeError("refusing to download from %s" % host)
    req = urllib.request.Request(url, headers={"User-Agent": "ConstableHoagie-updater", "Accept": accept})
    return urllib.request.urlopen(req, timeout=timeout)


def check(force=False):
    i = info()
    if not i["repo"]:
        return {"enabled": False, "current": i["version"],
                "why": "Updates aren't set up yet. The first time you run 'Publish Update', this switches on."}
    cached = None if force else store.cache_get("update-check", 6 * 3600)
    if cached and cached.get("repo") == i["repo"] and cached.get("current") == i["version"]:
        return cached
    with _get("https://api.github.com/repos/%s/releases/latest" % i["repo"]) as r:
        rel = json.loads(r.read().decode("utf-8"))
    latest = (rel.get("tag_name") or "").lstrip("v")
    assets = rel.get("assets", [])
    zip_a = next((a for a in assets if a["name"].startswith(i["asset_prefix"]) and a["name"].endswith(".zip")), None)
    sha_a = next((a for a in assets if a["name"].endswith(".sha256")), None)
    out = {
        "enabled": True, "repo": i["repo"], "current": i["version"], "latest": latest,
        "available": bool(zip_a) and _ver(latest) > _ver(i["version"]),
        "notes": (rel.get("body") or "").strip()[:4000], "published": rel.get("published_at", ""),
        "zip_url": zip_a["browser_download_url"] if zip_a else "", "sha_url": sha_a["browser_download_url"] if sha_a else "",
        "size_mb": round(zip_a["size"] / 1e6, 1) if zip_a else 0, "page": rel.get("html_url", ""),
    }
    store.cache_put("update-check", out)
    return out


def _safe_extract(zpath, dest):
    dest = Path(dest).resolve()
    with zipfile.ZipFile(zpath) as z:
        for m in z.infolist():
            target = (dest / m.filename).resolve()
            if dest != target and dest not in target.parents:
                raise RuntimeError("bad path in update zip: %s" % m.filename)
        z.extractall(dest)


def _find_root(staging):
    """The zip holds a ConstableHoagie/ folder; find the folder that has app/server.py."""
    for cand in [staging] + [p for p in staging.rglob("*") if p.is_dir()][:50]:
        if (cand / "app" / "server.py").is_file() and (cand / "setup").is_dir():
            return cand
    raise RuntimeError("the update zip doesn't look like Constable Hoagie")


def _handoff(args):
    ps1 = INSTALL / "setup" / "update.ps1"
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", str(ps1),
           "-ServerPid", str(os.getpid()), "-Install", str(INSTALL)] + args
    flags = 0
    if os.name == "nt":
        flags = 0x00000008 | 0x00000200 | 0x08000000  # DETACHED_PROCESS | NEW_PROCESS_GROUP | NO_WINDOW
    subprocess.Popen(cmd, creationflags=flags, close_fds=True)
    log.info("handed over to update.ps1 %s", args)
    # give the browser a moment to receive our answer, then stop so files can be replaced
    threading.Timer(1.5, lambda: os._exit(0)).start()


def apply():
    if os.name != "nt":
        raise RuntimeError("Updating in place works on Windows. On other systems, download the new zip from the release page.")
    c = check(force=True)
    if not c.get("available"):
        raise RuntimeError("You're already on the newest version.")
    if not c.get("sha_url"):
        raise RuntimeError("This release has no checksum file, so Hoagie won't install it. (Re-publish with the Publish Update script.)")
    shutil.rmtree(UPD, ignore_errors=True)
    UPD.mkdir(parents=True)
    zpath = UPD / ("v%s.zip" % c["latest"])
    h = hashlib.sha256()
    with _get(c["zip_url"], accept="application/octet-stream", timeout=120) as r, open(zpath, "wb") as f:
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            h.update(chunk)
            f.write(chunk)
    with _get(c["sha_url"], accept="application/octet-stream") as r:
        want = r.read().decode("utf-8", "replace").split()[0].strip().lower()
    if h.hexdigest().lower() != want:
        raise RuntimeError("The download didn't match its checksum (it may be damaged). Nothing was changed; try again later.")
    staging = UPD / "staging"
    _safe_extract(zpath, staging)
    root = _find_root(staging)
    log.info("update v%s verified and staged at %s", c["latest"], root)
    store.append_history({"type": "update", "from": c["current"], "to": c["latest"]})
    _handoff(["-Staged", str(root), "-OldVersion", c["current"]])
    return {"ok": True, "to": c["latest"]}


def rollback():
    if os.name != "nt":
        raise RuntimeError("Roll back works on Windows.")
    i = info()
    if not i["backups"]:
        raise RuntimeError("There's no earlier version saved yet.")
    _handoff(["-Rollback", str(BACKUPS / i["backups"][0])])
    return {"ok": True, "to": i["backups"][0]}
