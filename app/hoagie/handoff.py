"""Admin (Zero Cool) helpers: project stats for the admin panel and the downloadable project zip."""
import io
import json
import time
import zipfile
from pathlib import Path

from . import auth, store

APP = Path(__file__).resolve().parent.parent
ROOT = APP.parent
SKIP_DIRS = {"__pycache__", ".git", "dist", "node_modules"}
SKIP_FILES = {"accounts.json", "accounts.applied", "zerocool.flag"}


def overview(base_url=""):
    d = json.loads((APP / "knowledge" / "admin.json").read_text(encoding="utf-8"))
    try:
        from . import updater
        d["version"] = updater.info()["version"]
    except Exception:
        d["version"] = "?"
    links = auth.link_status()
    from . import prefs
    d["people"] = [dict(u, link=links.get(u["name"].lower()), bet_view=bool(prefs.get("acct:" + u["name"].lower()).get("bet_view")),
                        menu=prefs.get("acct:" + u["name"].lower()).get("menu")) for u in auth.list_users()]
    d["base_url"] = base_url
    return d


def project_zip():
    """Everything DoctorCrench needs: readmes, the full app (source), the Claude project file and the docs.
    Never includes accounts, sign-in links, keys or anyone's data (those live outside this folder)."""
    buf = io.BytesIO()
    top = "ConstableHoagie-Project/"
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(ROOT.rglob("*")):
            rel = p.relative_to(ROOT)
            if any(part in SKIP_DIRS for part in rel.parts) or p.is_dir():
                continue
            if p.name in SKIP_FILES or p.suffix in (".zip", ".pyc", ".log"):
                continue
            z.write(p, top + rel.as_posix())
        # the recipient's own copy is a Zero Cool install too
        z.writestr(top + "app/seed/zerocool.flag", "This install belongs to a Zero Cool admin. Remove this file from copies you share with friends.\n")
        z.writestr(top + "WHATS-IN-THE-CASE.txt",
                   "Constable Hoagie project, packed %s\n\n"
                   "README.html  - the quick, animated guide (open in a browser)\n"
                   "README.md    - the same, plain text\n"
                   "GUIDE.md     - the full user guide\n"
                   "CLAUDE.md    - the Claude project file: what this is, how it's built, workflows\n"
                   "docs/        - project notes, build logs, integrations catalog\n"
                   "media/       - the media library: player.html (every short), character SVGs, screenshots of every version\n"
                   "app/         - the whole app (Python server + web files), the same code that runs the website\n"
                   "setup/       - launcher, updater, publisher, sharing scripts, MCP server\n\n"
                   "To run it: double-click 'Start Constable Hoagie.cmd'.\n" % time.strftime("%Y-%m-%d"))
    return buf.getvalue()
