"""Open doors for other apps: the Agent API (your AI agent reads Hoagie), MCP, and webhooks.

Every call needs a personal token the owner makes at the Connect counter. Tokens are shown once and
stored only as a SHA-256 hash. Two scopes:
  read  -> snapshot, holdings, dashboard, bets, spending summary
  log   -> read + add a bet or a spending entry (for agents, Zapier/IFTTT, iPhone Shortcuts)
Nothing here can move money, change settings, or see keys.
"""
import hashlib
import hmac
import secrets
import time

from . import bets, costs, insights, portfolio, prefs, store

log = store.log
_fails = {}


def _all():
    return store.load("agent_tokens", {"tokens": []})


def _h(tok):
    return hashlib.sha256(tok.encode()).hexdigest()


def make(name, scope="read"):
    if scope not in ("read", "log"):
        raise ValueError("Scope is read or log.")
    name = (name or "My agent").strip()[:40]
    tok = "hoagie_" + secrets.token_urlsafe(32)
    d = _all()
    d["tokens"].append({"id": secrets.token_hex(4), "name": name, "scope": scope, "hash": _h(tok),
                        "created": time.strftime("%Y-%m-%d"), "last_used": ""})
    store.save("agent_tokens", d)
    return {"token": tok, "name": name, "scope": scope, "note": "Copy it now. Hoagie only keeps a scrambled copy and can't show it again."}


def listing():
    return {"tokens": [{k: v for k, v in t.items() if k != "hash"} for t in _all()["tokens"]]}


def revoke(tid):
    d = _all()
    d["tokens"] = [t for t in d["tokens"] if t["id"] != tid]
    store.save("agent_tokens", d)
    return listing()


def check(auth_header, addr):
    """Returns the token record, or raises PermissionError. Slows down guessing."""
    now = time.time()
    f = _fails.get(addr, [])
    f = [t for t in f if now - t < 600]
    if len(f) >= 10:
        raise PermissionError("Too many bad tokens. Try again in a few minutes.")
    tok = (auth_header or "").replace("Bearer ", "", 1).strip()
    hv = _h(tok) if tok else ""
    d = _all()
    for t in d["tokens"]:
        if tok and hmac.compare_digest(t["hash"], hv):
            if t.get("last_used") != time.strftime("%Y-%m-%d"):
                t["last_used"] = time.strftime("%Y-%m-%d")
                store.save("agent_tokens", d)
            _fails.pop(addr, None)
            return t
    f.append(now)
    _fails[addr] = f
    time.sleep(0.4)
    raise PermissionError("Missing or wrong token.")


def handle(method, path, body, tok):
    """Paths under /agent/v1/. Runs as the shop owner's data."""
    prefs.CURRENT.set({"key": "_local", "name": "Agent: " + tok["name"], "role": "agent"})
    p = path[len("/agent/v1"):] or "/"
    if method == "GET":
        if p in ("/", "/snapshot"):
            v = portfolio.valued(snapshot=False)
            b = bets.board(live=False) if prefs.betting_on() else None
            m = costs.month()
            return {"app": "Constable Hoagie", "as_of": time.strftime("%Y-%m-%d %H:%M"),
                    "net_worth": v["total"], "holdings": [{k: r.get(k) for k in ("venue", "asset", "amount", "now", "gain")} for r in v["rows"]],
                    "spending_this_month": {"spent": m["spent"], "income": m["income"], "by_category": m["by_category"]},
                    "open_bets": b["open"] if b else None, "bet_summary": b["summary"] if b else None,
                    "tips": insights.insights(upbeat=prefs.upbeat_on()).get("edges", [])}
        if p == "/holdings":
            return portfolio.valued(snapshot=False)
        if p == "/dashboard":
            return insights.insights(upbeat=prefs.upbeat_on())
        if p == "/bets":
            if not prefs.betting_on():
                return {"error": "Betting is off on this menu."}
            return bets.board(live=True)
        if p == "/spending":
            return costs.month()
        return None
    if method == "POST":
        if tok["scope"] != "log":
            raise PermissionError("This token is read-only. Make a 'read + log' token to add things.")
        kind = body.get("type") or ("bet" if p == "/bets" else "cost" if p == "/spending" else "")
        if p in ("/bets", "/hook") and kind == "bet":
            src = "webhook" if p == "/hook" else "agent"
            if body.get("text") and not body.get("pick"):
                return {"added": [bets.add(dict(b, source=src), src) for b in bets.parse_text(body["text"])]}
            return {"added": [bets.add(body, src)]}
        if p in ("/spending", "/hook") and kind == "cost":
            return {"added": costs.add({"date": body.get("date"), "amount": body.get("amount"), "note": body.get("note") or body.get("what") or body.get("description", ""),
                                        "category": body.get("category")})}
        raise ValueError("POST /agent/v1/bets, /agent/v1/spending, or /agent/v1/hook with type 'bet' or 'cost'.")
    return None
