"""GitHub autopatcher: errors in → scrubbed GitHub issue → Claude drafts a fix (GitHub Action) → tests → PR → a Zero Cool
admin approves in The Gibson (or on GitHub) → the release workflow publishes → every install auto-updates.

Low usage by design: identical errors are grouped by fingerprint; an issue is only filed when a NEW error repeats
(default 3 times in 24 h), at most 3 issues a day; nothing personal leaves the PC (scrubbed twice).
Friends' copies (no GitHub token) forward scrubbed reports to the owner's website, which files the issue.
"""
import hashlib
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from . import auth, prefs, store

log = store.log
_lock = threading.Lock()
_remote_hits = {}
API = "https://api.github.com"
DEFAULT_REPORT_TO = "https://beta.constablehoagie.com"
LABEL = "autopatch"


# ---- settings -----------------------------------------------------------------------------------

def cfg():
    s = store.settings()
    try:
        from . import updater
        repo = s.get("github_repo") or updater.info().get("repo", "")
    except Exception:
        repo = s.get("github_repo", "")
    return {"on": bool(s.get("autopatch_on")), "repo": repo, "threshold": int(s.get("autopatch_threshold") or 3),
            "daily_cap": int(s.get("autopatch_daily_cap") or 3), "report_to": s.get("autopatch_report_to") or DEFAULT_REPORT_TO,
            "token": store.has_secret("github_token")}


# ---- scrubbing (nothing personal leaves the PC) ----------------------------------------------------

SCRUB = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "<email>"),
    (re.compile(r"(?i)(bearer|token|key|secret|password|passcode|authorization)[\"'=: ]+\S+"), r"\1=<redacted>"),
    (re.compile(r"\b(hoagie_|sk-|ghp_|github_pat_|xox[bp]-)[\w-]{8,}"), "<token>"),
    (re.compile(r"\b[A-Za-z0-9_-]{32,}\b"), "<long-id>"),
    (re.compile(r"(?i)([A-Z]:\\Users\\)[^\\\s]+"), r"\1<user>"),
    (re.compile(r"(/home/|/Users/)[^/\s]+"), r"\1<user>"),
    (re.compile(r"\$\s?\d[\d,]*(\.\d+)?"), "$<amount>"),
    (re.compile(r"\b\d{5,}\b"), "<number>"),
    (re.compile(r"(https?://[^\s?\"']+)\?[^\s\"']*"), r"\1?<query>"),
    (re.compile(r"\b(\d{1,3}\.){3}\d{1,3}\b"), "<ip>"),
]


def scrub(text, limit=4000):
    t = str(text or "")
    for rx, rep in SCRUB:
        t = rx.sub(rep, t)
    return t[:limit]


def fingerprint(kind, message, trace=""):
    frames = re.findall(r'File "([^"]+)", line (\d+)', trace or "") or re.findall(r"(\w+\.js):(\d+)", trace or "")
    top = "%s:%s" % (frames[-1][0].replace("\\", "/").split("/")[-1], frames[-1][1]) if frames else ""
    norm = re.sub(r"\d+", "#", scrub(message, 300)).lower()
    return hashlib.sha1(("%s|%s|%s" % (kind, norm, top)).encode()).hexdigest()[:12]


# ---- capture -------------------------------------------------------------------------------------

def capture(kind, message, trace="", where="", source="local", version=None):
    """Record an error. Files a GitHub issue (or forwards to the owner's website) when a new error keeps repeating."""
    c = cfg()
    if not c["on"]:
        return None
    if version is None:
        try:
            from . import updater
            version = updater.info()["version"]
        except Exception:
            version = "?"
    fp = fingerprint(kind, message, trace)
    now = time.time()
    with _lock:
        d = store.load("autopatch", {"errors": {}, "filed": [], "seen_prs": [], "inbox": []})
        e = d["errors"].setdefault(fp, {"kind": kind, "count": 0, "hits": [], "first": time.strftime("%Y-%m-%d %H:%M"),
                                        "message": scrub(message, 400), "trace": scrub(trace), "where": scrub(where, 200),
                                        "version": version, "source": source, "issue": None})
        e["count"] += 1
        e["last"] = time.strftime("%Y-%m-%d %H:%M")
        e["hits"] = [h for h in e["hits"] if now - h < 86400] + [now]
        due = not e["issue"] and len(e["hits"]) >= c["threshold"]
        d["filed"] = [t for t in d["filed"] if now - t < 86400]
        if due and len(d["filed"]) >= c["daily_cap"]:
            due = False
            e["held"] = "daily cap reached"
        if due:
            e["issue"] = "pending"
            d["filed"].append(now)
        store.save("autopatch", d)
    if due:
        threading.Thread(target=_file, args=(fp,), daemon=True).start()
    return fp


def _file(fp):
    d = store.load("autopatch", {"errors": {}})
    e = d["errors"].get(fp)
    if not e:
        return
    try:
        if store.has_secret("github_token") and cfg()["repo"]:
            num, url = open_issue(fp, e)
            e["issue"] = {"number": num, "url": url}
        else:
            forward(fp, e)
            e["issue"] = {"forwarded": True}
    except Exception as ex:
        log.warning("autopatch: couldn't file %s: %s", fp, ex)
        e["issue"] = None
        e["error"] = str(ex)[:200]
    with _lock:
        d2 = store.load("autopatch", {"errors": {}})
        d2["errors"][fp] = e
        store.save("autopatch", d2)


# ---- GitHub --------------------------------------------------------------------------------------

def _gh(method, path, body=None, timeout=20):
    tok = store.get_secret("github_token")
    if not tok:
        raise RuntimeError("Add a GitHub token in The Gibson › 🛠 Autopatch first.")
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + tok, "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ConstableHoagie-autopatch"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
        return json.loads(raw) if raw else {}


def open_issue(fp, e):
    repo = cfg()["repo"]
    title = "autopatch: %s: %s" % (e["kind"], e["message"].splitlines()[0][:90] if e["message"] else "error")
    body = ("**Reported automatically by Constable Hoagie** (scrubbed: no keys, emails, amounts or personal data).\n\n"
            "| | |\n|---|---|\n| Fingerprint | `%s` |\n| Kind | %s |\n| Version | %s |\n| Seen | %d times (first %s, last %s) |\n| Where | %s |\n| Source | %s |\n\n"
            "**Message**\n```\n%s\n```\n**Trace**\n```\n%s\n```\n\n"
            "Claude: follow CLAUDE.md › Autopatcher. Smallest safe fix plus a regression test in `dev/tests/`." % (
                fp, e["kind"], e["version"], e["count"], e["first"], e.get("last", ""), e["where"] or "-", e["source"], e["message"], e["trace"] or "(none)"))
    r = _gh("POST", "/repos/%s/issues" % repo, {"title": title, "body": body, "labels": [LABEL, "bug"]})
    log.info("autopatch: filed issue #%s for %s", r.get("number"), fp)
    notify_admins("🐞 New bug sent to Claude: #%s" % r.get("number"), "%s\n%s" % (title, r.get("html_url")), r.get("html_url"))
    return r.get("number"), r.get("html_url")


def forward(fp, e):
    """Friends' copies: send the scrubbed report to the owner's website, which files the issue."""
    url = cfg()["report_to"].rstrip("/") + "/report"
    data = json.dumps({k: e.get(k) for k in ("kind", "message", "trace", "where", "version")}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json", "User-Agent": "ConstableHoagie-report"})
    urllib.request.urlopen(req, timeout=15).read()


def receive_remote(body, addr):
    """POST /report from other copies. Public, so tightly limited: 20 reports/day per address, 4 KB each."""
    now = time.time()
    hits = [t for t in _remote_hits.get(addr, []) if now - t < 86400]
    if len(hits) >= 20:
        raise PermissionError("Too many reports.")
    _remote_hits[addr] = hits + [now]
    return {"ok": True, "fp": capture(str(body.get("kind", "remote"))[:40], scrub(body.get("message"), 400), scrub(body.get("trace")),
                                       scrub(body.get("where"), 200), source="another copy", version=str(body.get("version", "?"))[:20])}


def pulls():
    repo = cfg()["repo"]
    out = []
    for p in _gh("GET", "/repos/%s/pulls?state=open&per_page=30" % repo):
        labels = [l["name"] for l in p.get("labels", [])]
        if LABEL not in labels and not p.get("head", {}).get("ref", "").startswith("autopatch/"):
            continue
        out.append({"number": p["number"], "title": p["title"], "url": p["html_url"], "created": p["created_at"][:16].replace("T", " "),
                    "hold": "hold" in labels, "body": (p.get("body") or "")[:3000], "branch": p["head"]["ref"]})
    return out


def approve(number, who):
    repo = cfg()["repo"]
    _gh("POST", "/repos/%s/issues/%s/comments" % (repo, number), {"body": "✅ Approved in the Constable Hoagie admin panel by **%s**. Releasing." % who})
    r = _gh("PUT", "/repos/%s/pulls/%s/merge" % (repo, number), {"merge_method": "squash"})
    notify_admins("✅ Patch #%s approved by %s" % (number, who), "Merged. The release workflow is publishing it now; every install updates within ~6 hours.")
    return {"merged": bool(r.get("merged")), "message": r.get("message", "")}


def reject(number, who, reason=""):
    repo = cfg()["repo"]
    _gh("POST", "/repos/%s/issues/%s/comments" % (repo, number), {"body": "❌ Rejected in the admin panel by **%s**.%s" % (who, (" Reason: " + reason[:500]) if reason else "")})
    _gh("PATCH", "/repos/%s/pulls/%s" % (repo, number), {"state": "closed"})
    return {"ok": True}


def set_automerge(on):
    repo = cfg()["repo"]
    body = {"name": "AUTOMERGE", "value": "true" if on else "false"}
    try:
        _gh("PATCH", "/repos/%s/actions/variables/AUTOMERGE" % repo, body)
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        _gh("POST", "/repos/%s/actions/variables" % repo, body)
    return {"ok": True, "automerge": on}


def check():
    c = cfg()
    out = {"repo": c["repo"], "token": c["token"], "on": c["on"]}
    if c["token"] and c["repo"]:
        try:
            r = _gh("GET", "/repos/%s" % c["repo"])
            out.update(reachable=True, private=r.get("private"), default_branch=r.get("default_branch"))
            try:
                v = _gh("GET", "/repos/%s/actions/variables/AUTOMERGE" % c["repo"])
                out["automerge"] = v.get("value") == "true"
            except Exception:
                out["automerge"] = False
        except Exception as e:
            out.update(reachable=False, error=str(e)[:200])
    return out


def poll():
    """Every couple of hours: new Claude PRs → notify every Zero Cool admin who asked for it."""
    c = cfg()
    if not (c["on"] and c["token"] and c["repo"]):
        return
    try:
        prs = pulls()
    except Exception as e:
        log.info("autopatch poll failed: %s", e)
        return
    d = store.load("autopatch", {"errors": {}, "filed": [], "seen_prs": [], "inbox": []})
    new = [p for p in prs if p["number"] not in d.get("seen_prs", [])]
    for p in new:
        d.setdefault("seen_prs", []).append(p["number"])
        d.setdefault("inbox", []).insert(0, {"at": time.strftime("%Y-%m-%d %H:%M"), "text": "Claude proposed a fix: #%d %s" % (p["number"], p["title"]), "url": p["url"]})
        notify_admins("🛠 Claude drafted a fix: #%d" % p["number"],
                      "%s\n%s\n\nApprove or reject it in The Gibson › 🛠 Autopatch, or review it on GitHub.%s" % (
                          p["title"], p["url"], "\n⚠️ Touches protected files: needs a careful look." if p["hold"] else ""), p["url"])
    d["inbox"] = d.get("inbox", [])[:50]
    store.save("autopatch", d)


def status():
    d = store.load("autopatch", {"errors": {}, "filed": [], "seen_prs": [], "inbox": []})
    errs = sorted(({"fp": k, **{x: v.get(x) for x in ("kind", "message", "count", "first", "last", "issue", "source", "version", "held", "error")}}
                   for k, v in d["errors"].items()), key=lambda e: e.get("last") or "", reverse=True)[:40]
    return {"config": cfg(), "errors": errs, "inbox": d.get("inbox", [])[:20], "filed_today": len([t for t in d.get("filed", []) if time.time() - t < 86400])}


# ---- per-admin notification streams (email and/or Discord) ----------------------------------------

DISCORD = re.compile(r"^https://(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)/api/webhooks/\d+/[\w-]+$")


def my_notify(user):
    p = prefs.get("acct:" + user) if user else prefs.get("_local")
    n = p.get("notify") or {}
    return {"email": n.get("email", ""), "email_on": bool(n.get("email_on")), "discord_on": bool(n.get("discord_on")),
            "discord_set": store.has_secret("notify:%s" % (user or "_local")), "events": n.get("events", ["fix", "bug", "released"])}


def save_notify(user, body):
    key = "acct:" + user if user else "_local"
    data = store.load("prefs", {})
    p = data.setdefault(key, {})
    n = p.setdefault("notify", {})
    if "email" in body:
        em = str(body["email"]).strip()
        if em and not prefs.EMAIL_RE.match(em):
            raise ValueError("That email address doesn't look right.")
        n["email"] = em
    for f in ("email_on", "discord_on"):
        if f in body:
            n[f] = bool(body[f])
    if isinstance(body.get("events"), list):
        n["events"] = [e for e in body["events"] if e in ("fix", "bug", "released")]
    if body.get("discord_url") is not None:
        url = str(body["discord_url"]).strip()
        if url and not DISCORD.match(url):
            raise ValueError("Paste a Discord webhook link (Server settings › Integrations › Webhooks › Copy URL).")
        store.set_secret("notify:%s" % (user or "_local"), url)
        n["discord_on"] = bool(url)
    store.save("prefs", data)
    return my_notify(user)


def _event(subject):
    return "fix" if "drafted" in subject or "proposed" in subject else "released" if "approved" in subject or "released" in subject.lower() else "bug"


def notify_admins(subject, text, url=None):
    """Send to every Zero Cool admin's own stream: their email and/or their Discord webhook."""
    from . import digest
    ev = _event(subject)
    people = [("", None)] + [(u["name"].lower(), u) for u in auth.list_users() if u["role"] == "owner"]
    for user, _u in people:
        n = my_notify(user)
        if ev not in n["events"]:
            continue
        if n["email_on"] and n["email"] and digest.ready():
            try:
                html = "<p>%s</p>%s" % (text.replace("\n", "<br>"), ('<p><a href="%s">Open on GitHub</a></p>' % url) if url else "")
                digest._send(n["email"], "Constable Hoagie · " + subject, text, html)
            except Exception as e:
                log.info("autopatch email to %s failed: %s", user or "owner", e)
        hook = store.get_secret("notify:%s" % (user or "_local")) if n["discord_on"] else ""
        if hook:
            try:
                req = urllib.request.Request(hook, method="POST", headers={"Content-Type": "application/json", "User-Agent": "ConstableHoagie"},
                                             data=json.dumps({"username": "Constable Hoagie", "content": ("**%s**\n%s" % (subject, text))[:1900]}).encode())
                urllib.request.urlopen(req, timeout=15).read()
            except Exception as e:
                log.info("autopatch discord to %s failed: %s", user or "owner", e)


def test_notify(user):
    n = my_notify(user)
    sent = []
    from . import digest
    if n["email_on"] and n["email"]:
        if not digest.ready():
            raise RuntimeError("Email sending isn't set up yet (Email counter › owner setup).")
        digest._send(n["email"], "Constable Hoagie · test notification", "This is how autopatch notices will look.", "<p>This is how autopatch notices will look. 🥪</p>")
        sent.append("email")
    hook = store.get_secret("notify:%s" % (user or "_local")) if n["discord_on"] else ""
    if hook:
        req = urllib.request.Request(hook, method="POST", headers={"Content-Type": "application/json", "User-Agent": "ConstableHoagie"},
                                     data=json.dumps({"username": "Constable Hoagie", "content": "🥪 Test: autopatch notices will show up here."}).encode())
        urllib.request.urlopen(req, timeout=15).read()
        sent.append("discord")
    if not sent:
        raise ValueError("Turn on email or Discord first.")
    return {"sent": sent}
