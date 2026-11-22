"""Helper for "Setup Everything.cmd". Talks to Hoagie's data folder directly, so it works
whether or not the server is running and whether or not "lock on this PC" is on.

  python setup_tool.py accounts            make sure DoctorCrench, ConstableHoagie and AliJoon exist
  python setup_tool.py adduser NAME TIER   create a missing account (password read from stdin)
  python setup_tool.py links [all|NAME..]  make fresh sign-in links (old ones stop working)
  python setup_tool.py zerocool            make you the Zero Cool admin on this PC
  python setup_tool.py autopatch REPO      turn on the autopatcher (GitHub token read from stdin)
  python setup_tool.py notify USER         save that admin's alert stream (JSON read from stdin)

Every command prints one line of JSON. Nothing here goes over the network.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
sys.path.insert(0, str(APP))

from hoagie import auth, store, autopatch  # noqa: E402

SEED_DIR = APP / "seed"
WANTED = {  # key: (display name, tier, prefs for that person)
    "constablehoagie": ("ConstableHoagie", "owner", {}),
    "doctorcrench": ("DoctorCrench", "owner", {}),
    "alijoon": ("AliJoon", "guest", {"menu": "money", "bet_view": True, "videos": "alison",
                                     "avatar": "alison", "feed": "bright"}),
}
SITE = "https://beta.constablehoagie.com"
LOCAL = "http://127.0.0.1:8787"


def out(obj, code=0):
    print(json.dumps(obj))
    sys.exit(code)


def _seed():
    for name in ("accounts.json", "accounts.applied"):
        p = SEED_DIR / name
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                pass
    return None


def accounts():
    """Add any of the three people who are missing, from the private seed if it's here."""
    have = auth.users()
    added = []
    seed = _seed()
    if seed:
        u = dict(have)
        for k, rec in seed.get("users", {}).items():
            if k not in u:
                u[k] = rec
                added.append(rec.get("display", k))
        store.save("users", u)
        links = store.load("login_links", {"links": {}})
        for h, v in seed.get("links", {}).items():
            if v.get("user") in u and not any(x["user"] == v["user"] for x in links["links"].values()):
                links["links"][h] = v
        store.save("login_links", links)
        pr = store.load("prefs", {})
        for k, v in seed.get("prefs", {}).items():
            pr.setdefault(k, v)
        store.save("prefs", pr)
        # the server would otherwise apply (and rename) the seed again at its next start; harmless, but tidy up
        s = SEED_DIR / "accounts.json"
        if s.exists():
            try:
                s.replace(s.with_suffix(".applied"))
            except Exception:
                pass
    have = auth.users()
    missing = [WANTED[k][0] for k in WANTED if k not in have]
    present = [WANTED[k][0] for k in WANTED if k in have]
    out({"present": present, "added": added, "missing": missing, "seed": bool(seed),
         "links": auth.link_status()})


def adduser(name, tier):
    k = name.strip().lower()
    pw = sys.stdin.readline().rstrip("\r\n")
    disp, role, pref = WANTED.get(k, (name.strip(), tier, {}))
    try:
        auth.add_user(disp, pw, tier or role)
    except ValueError as e:
        out({"ok": False, "error": str(e)}, 1)
    if pref:
        pr = store.load("prefs", {})
        pr.setdefault("acct:" + k, dict(pref))
        store.save("prefs", pr)
    out({"ok": True, "user": disp, "tier": auth.tier(auth.users()[k]["role"])})


def links(names):
    have = auth.users()
    if not names or names == ["all"]:
        names = [k for k in WANTED if k in have]
    res = {}
    for n in names:
        k = n.strip().lower()
        if k not in have:
            continue
        tok = auth.make_link(k)
        res[have[k].get("display", k)] = {"site": "%s/auth/link/%s" % (SITE, tok), "pc": "%s/auth/link/%s" % (LOCAL, tok)}
    out({"ok": True, "links": res})


def zerocool():
    store.save_settings({"local_tier": "zerocool"})
    flag = SEED_DIR / "zerocool.flag"
    try:
        SEED_DIR.mkdir(exist_ok=True)
        flag.write_text("This PC belongs to a Zero Cool admin.\n", encoding="utf-8")
    except Exception:
        pass
    out({"ok": True})


def autopatch_on(repo):
    tok = sys.stdin.readline().strip()
    if "/" not in repo:
        out({"ok": False, "error": "repo should look like owner/name"}, 1)
    store.save_settings({"github_repo": repo, "autopatch_on": True})
    if tok:
        store.set_secret("github_token", tok)
    out({"ok": True, "repo": repo, "token_saved": bool(tok)})


def notify(user):
    try:
        body = json.loads(sys.stdin.read() or "{}")
        res = autopatch.save_notify(user.strip().lower(), body)
    except ValueError as e:
        out({"ok": False, "error": str(e)}, 1)
    out({"ok": True, "notify": res})


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        out({"error": __doc__}, 2)
    cmd = a[0]
    if cmd == "accounts":
        accounts()
    elif cmd == "adduser" and len(a) >= 2:
        adduser(a[1], a[2] if len(a) > 2 else "")
    elif cmd == "links":
        links(a[1:])
    elif cmd == "zerocool":
        zerocool()
    elif cmd == "autopatch" and len(a) == 2:
        autopatch_on(a[1])
    elif cmd == "notify" and len(a) == 2:
        notify(a[1])
    else:
        out({"error": "unknown command"}, 2)
