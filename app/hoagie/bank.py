"""Read-only bank sync through SimpleFIN (https://www.simplefin.org).

Why SimpleFIN: you connect your bank on SimpleFIN's site (your bank password never touches
Hoagie), then paste a one-time Setup Token here. Hoagie trades it for a private read-only
link, kept in this PC's secure store. All Hoagie can ever see is balances and transactions:
it can't move money, and you can revoke it anytime from SimpleFIN.
SimpleFIN Bridge costs $1.50/month or $15/year per person, paid to SimpleFIN.
"""
import base64
import json
import logging
import re
import time
import urllib.parse
import urllib.request

from . import costs, prefs, store
from .feeds import UA

log = logging.getLogger("hoagie")
ALLOWED = re.compile(r"^https://([a-z0-9-]+\.)*simplefin\.org(/|$)")
SIGNUP = "https://bridge.simplefin.org/simplefin/create"


def _secret_name(key=None):
    key = re.sub(r"[^a-z0-9_-]", "_", (key or prefs.me()["key"]).lower())
    return "simplefin:" + key


def status():
    st = store.load("bank-" + _secret_name().split(":")[1], {})
    return {"connected": store.has_secret(_secret_name()), "signup": SIGNUP, "last_sync": st.get("last_sync"),
            "accounts": st.get("accounts", []), "errors": st.get("errors", [])}


def connect(setup_token):
    tok = re.sub(r"\s", "", setup_token or "")
    try:
        claim = base64.b64decode(tok + "=" * (-len(tok) % 4)).decode()
    except Exception:
        raise ValueError("That doesn't look like a SimpleFIN Setup Token.")
    if not ALLOWED.match(claim):
        raise ValueError("That token doesn't point to SimpleFIN, so Hoagie won't use it.")
    req = urllib.request.Request(claim, data=b"", method="POST", headers={"User-Agent": UA, "Content-Length": "0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            access = r.read().decode().strip()
    except Exception as e:
        raise ValueError("SimpleFIN didn't accept the token (each token works once): %s" % e)
    if not ALLOWED.match(re.sub(r"//[^@/]+@", "//", access)):
        raise ValueError("SimpleFIN sent back an unexpected address.")
    store.set_secret(_secret_name(), access)
    return sync()


def disconnect():
    store.set_secret(_secret_name(), "")
    key = _secret_name().split(":")[1]
    store.save("bank-" + key, {})
    _set_linked(key, [])
    return {"ok": True}


def _get(access, path, params):
    u = urllib.parse.urlsplit(access)
    auth = base64.b64encode(("%s:%s" % (urllib.parse.unquote(u.username or ""), urllib.parse.unquote(u.password or ""))).encode()).decode()
    url = "%s://%s%s%s?%s" % (u.scheme, u.hostname, (":%d" % u.port) if u.port else "", u.path.rstrip("/") + path, urllib.parse.urlencode(params))
    req = urllib.request.Request(url, headers={"Authorization": "Basic " + auth, "User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode())


def _set_linked(key, rows):
    """Bank balances show up in My Tab and net worth (owner's PC only)."""
    data = store.load("linked", {"rows": []})
    data["rows"] = [r for r in data["rows"] if r.get("owner") != "bank:" + key] + rows
    store.save("linked", data)


def sync(days=60):
    access = store.get_secret(_secret_name())
    if not access:
        raise ValueError("No bank connected yet.")
    key = _secret_name().split(":")[1]
    d = _get(access, "/accounts", {"start-date": int(time.time() - days * 86400), "pending": 1})
    accounts, txns, rows = [], [], []
    for a in d.get("accounts", []):
        bal = float(a.get("balance") or 0)
        org = (a.get("org") or {}).get("name") or (a.get("org") or {}).get("domain") or "Bank"
        accounts.append({"name": a.get("name", "Account"), "org": org, "balance": round(bal, 2), "currency": a.get("currency", "USD")})
        cur = a.get("currency", "USD")
        rows.append({"id": "bank-" + str(a.get("id")), "venue": "%s · %s" % (org, a.get("name", "")), "asset": cur if len(cur) <= 5 else "USD",
                     "amount": bal, "cost": 0, "value": bal, "linked": True, "owner": "bank:" + key, "fixed": cur not in ("USD",) and len(cur) > 5})
        for t in a.get("transactions", []):
            if t.get("pending"):
                continue
            txns.append({"id": t.get("id"), "date": time.strftime("%Y-%m-%d", time.localtime(int(t.get("posted") or time.time()))),
                         "amount": float(t.get("amount") or 0), "description": t.get("description") or t.get("payee") or ""})
    added = costs.merge_bank(txns)
    me = prefs.me()
    if me["key"] == "_local" or me.get("role") == "owner":   # only the owner's own bank feeds the shop's net worth
        _set_linked(key, rows)
    st = {"last_sync": time.strftime("%Y-%m-%d %H:%M"), "accounts": accounts, "errors": d.get("errors", [])[:5]}
    store.save("bank-" + key, st)
    log.info("bank sync: %d accounts, %d new transactions", len(accounts), added)
    return dict(status(), added=added)
