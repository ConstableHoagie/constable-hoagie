"""Shop logins: a name + passcode for everyone who visits from outside this PC.

- Passcodes are never stored, only a salted PBKDF2 hash (200,000 rounds).
- A successful login gets a random session cookie (HttpOnly, SameSite=Strict, Secure on https),
  good for 7 days or until you clock out. Sessions live in memory, so restarting Hoagie logs
  everyone out.
- Five wrong passcodes from one address locks that address out for 5 minutes.
- Tiers: "Zero Cool" (stored as "owner": god-mode admin, full access) or "Regular" (stored as "guest").
"""
import hashlib
import hmac
import secrets
import threading
import time

from . import store

log = store.log
_lock = threading.Lock()
_sessions = {}          # token -> {"name", "role", "exp"}
_fails = {}             # address -> [count, first_fail_time]
_acct_fails = {}        # account -> [count, first_fail_time] (stops slow guessing from many addresses)
ACCT_MAX, ACCT_LOCK = 10, 900
_DUMMY_SALT = secrets.token_hex(16)
SESSION_DAYS = 7
MAX_FAILS, LOCK_SECS = 5, 300
ROLES = ("guest", "owner")


def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), 200_000).hex()


def users():
    return store.load("users", {})


def list_users():
    return [{"name": u.get("display", n), "role": u["role"], "tier": tier(u["role"]), "created": u.get("created", ""),
             "welcomed": u.get("welcomed", ""), "changed": u.get("changed", "")} for n, u in sorted(users().items())]


def add_user(name, passcode, role="guest"):
    name = (name or "").strip()
    if not (1 <= len(name) <= 24) or not name.replace(" ", "").replace("-", "").replace("_", "").isalnum():
        raise ValueError("Use a username of 1–24 letters or numbers.")
    if len(passcode or "") < 10:
        raise ValueError("Passwords need at least 10 characters (the shop is reachable from the internet).")
    role = TIER_ALIASES.get(str(role).lower(), role)
    if role not in ROLES:
        raise ValueError("Unknown role.")
    salt = secrets.token_hex(16)
    u = users()
    u[name.lower()] = {"display": name, "salt": salt, "hash": _hash(passcode, salt), "role": role,
                       "created": time.strftime("%Y-%m-%d")}
    store.save("users", u)
    _drop_sessions(name.lower())  # a changed passcode signs that person out everywhere
    log.info("login added/updated for %s (%s)", name, role)
    return {"ok": True}


def remove_user(name):
    u = users()
    u.pop((name or "").strip().lower(), None)
    store.save("users", u)
    _drop_sessions((name or "").strip().lower())
    return {"ok": True}


def _drop_sessions(key):
    with _lock:
        for t in [t for t, s in _sessions.items() if s["key"] == key]:
            _sessions.pop(t, None)


def login(name, passcode, addr):
    now = time.time()
    key = (name or "").strip().lower()
    with _lock:
        for table, lim, secs in ((_fails, MAX_FAILS, LOCK_SECS), (_acct_fails, ACCT_MAX, ACCT_LOCK)):
            c = table.get(addr if table is _fails else key)
            if c and c[0] >= lim and now - c[1] < secs:
                raise PermissionError("Too many tries. Wait a few minutes and try again.")
    u = users().get(key)
    # always do the slow hash, so a wrong username takes as long as a wrong password
    got = _hash(passcode or "", u["salt"] if u else _DUMMY_SALT)
    ok = bool(u) and hmac.compare_digest(u["hash"], got)
    if not ok:
        with _lock:
            for table, k, secs in ((_fails, addr, LOCK_SECS), (_acct_fails, key, ACCT_LOCK)):
                c = table.get(k)
                if not c or now - c[1] >= secs:
                    c = [0, now]
                c[0] += 1
                table[k] = c
        log.info("failed login for %r from %s", name, addr)
        raise PermissionError("That username and password don't match.")
    token = secrets.token_urlsafe(32)
    with _lock:
        _fails.pop(addr, None)
        _acct_fails.pop(key, None)
        _sessions[token] = {"key": key, "name": u.get("display", name), "role": u["role"], "exp": now + SESSION_DAYS * 86400}
    log.info("login: %s (%s) from %s", u.get("display", name), u["role"], addr)
    return token, _sessions[token]


def session(token):
    if not token:
        return None
    with _lock:
        s = _sessions.get(token)
        if s and s["exp"] > time.time():
            return s
        _sessions.pop(token, None)
    return None


def logout(token):
    with _lock:
        _sessions.pop(token, None)


# ---- access tiers ------------------------------------------------------------------------------
# Stored roles stay "guest" / "owner" so older installs keep working; people see the tier names.
TIERS = {"guest": "Regular", "owner": "Zero Cool"}
TIER_ALIASES = {"regular": "guest", "zerocool": "owner", "zero cool": "owner", "guest": "guest", "owner": "owner"}


def tier(role):
    return TIERS.get(role, "Regular")


def set_role(name, role):
    role = TIER_ALIASES.get(str(role).lower(), None)
    if not role:
        raise ValueError("Unknown tier.")
    u = users()
    k = (name or "").strip().lower()
    if k not in u:
        raise ValueError("No such user.")
    u[k]["role"] = role
    store.save("users", u)
    _drop_sessions(k)
    return {"ok": True}


# ---- personal sign-in links (one per person; a link is as good as a password, so it can be revoked) ----

def _thash(tok):
    return hashlib.sha256(tok.encode()).hexdigest()


def make_link(name):
    k = (name or "").strip().lower()
    if k not in users():
        raise ValueError("No such user.")
    tok = secrets.token_urlsafe(32)
    d = store.load("login_links", {"links": {}})
    d["links"] = {h: v for h, v in d["links"].items() if v["user"] != k}   # one live link per person
    d["links"][_thash(tok)] = {"user": k, "created": time.strftime("%Y-%m-%d")}
    store.save("login_links", d)
    return tok


def revoke_links(name):
    k = (name or "").strip().lower()
    d = store.load("login_links", {"links": {}})
    d["links"] = {h: v for h, v in d["links"].items() if v["user"] != k}
    store.save("login_links", d)
    return {"ok": True}


def link_status():
    d = store.load("login_links", {"links": {}})
    return {v["user"]: v["created"] for v in d["links"].values()}


def link_login(tok, addr):
    now = time.time()
    with _lock:
        c = _fails.get(addr)
        if c and c[0] >= MAX_FAILS and now - c[1] < LOCK_SECS:
            raise PermissionError("Too many tries. Wait a few minutes and try again.")
    d = store.load("login_links", {"links": {}})
    rec = d["links"].get(_thash(tok or ""))
    u = users().get(rec["user"]) if rec else None
    if not u:
        with _lock:
            c = _fails.get(addr)
            if not c or now - c[1] >= LOCK_SECS:
                c = [0, now]
            c[0] += 1
            _fails[addr] = c
        time.sleep(0.4)
        raise PermissionError("That sign-in link isn't valid anymore. Ask the shop owner for a new one.")
    token = secrets.token_urlsafe(32)
    with _lock:
        _fails.pop(addr, None)
        _sessions[token] = {"key": rec["user"], "name": u.get("display", rec["user"]), "role": u["role"], "exp": now + SESSION_DAYS * 86400}
    log.info("link sign-in: %s from %s", u.get("display"), addr)
    return token, _sessions[token]


# ---- your own account ---------------------------------------------------------------------------

def account(key):
    u = users().get(key or "")
    if not u:
        return None
    return {"name": u.get("display", key), "tier": tier(u["role"]), "first_login": not u.get("welcomed"),
            "suggest_change": bool(u.get("suggest_change")), "temp_password": u.get("temp_password") if u.get("suggest_change") else None}


def mark_welcomed(key):
    u = users()
    if key in u:
        u[key]["welcomed"] = time.strftime("%Y-%m-%d")
        store.save("users", u)


def change_password(key, new, keep_token=None):
    if len(new or "") < 10:
        raise ValueError("Passwords need at least 10 characters.")
    u = users()
    if key not in u:
        raise ValueError("No such user.")
    salt = secrets.token_hex(16)
    u[key].update({"salt": salt, "hash": _hash(new, salt), "suggest_change": False, "changed": time.strftime("%Y-%m-%d")})
    u[key].pop("temp_password", None)
    store.save("users", u)
    with _lock:   # sign out everywhere else, keep this browser signed in
        for t in [t for t, s in _sessions.items() if s["key"] == key and t != keep_token]:
            _sessions.pop(t, None)
    return {"ok": True}


def skip_change(key):
    u = users()
    if key in u:
        u[key]["suggest_change"] = False
        u[key].pop("temp_password", None)
        store.save("users", u)
    return {"ok": True}


# ---- first-run seed (owner's install only; never published) --------------------------------------

def apply_seed(path):
    """app/seed/accounts.json: pre-hashed accounts and sign-in link hashes. Added once, then renamed."""
    import json
    from pathlib import Path
    p = Path(path)
    if not p.exists():
        return
    try:
        seed = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        log.warning("seed unreadable: %s", e)
        return
    u = users()
    for k, rec in seed.get("users", {}).items():
        if k not in u:
            u[k] = rec
            log.info("seeded account %s (%s)", rec.get("display"), tier(rec.get("role")))
    store.save("users", u)
    d = store.load("login_links", {"links": {}})
    for h, v in seed.get("links", {}).items():
        if v.get("user") in u and not any(x["user"] == v["user"] for x in d["links"].values()):
            d["links"][h] = v
    store.save("login_links", d)
    pr = store.load("prefs", {})
    for k, v in seed.get("prefs", {}).items():
        if k not in pr:
            pr[k] = v
    store.save("prefs", pr)
    try:
        p.rename(p.with_suffix(".applied"))
    except Exception:
        pass
