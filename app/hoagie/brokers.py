"""Trading connections: a searchable list of platforms, what their APIs allow, and what
Constable Hoagie does with each. Direct connectors: Alpaca, Kraken, Coinbase (read balances;
Alpaca also places paper or live orders with confirmation and limits). SnapTrade (free for
personal use) bridges 20+ more brokerages read-only. Keys live in the PC's secure store.
Owner-only; nothing here can withdraw or transfer money.
"""
import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
import urllib.parse
import urllib.request

from . import store
from .feeds import UA

log = logging.getLogger("hoagie")
CHECKED = "2026-11-21"

# status: "direct" (Hoagie connects itself), "snaptrade" (through SnapTrade), "mcp" (through an AI agent),
#         "planned", "none" (no public API for apps)
PLATFORMS = [
    {"id": "alpaca", "name": "Alpaca", "assets": "US stocks, ETFs, options, crypto", "status": "direct",
     "api": "Official REST + streaming, API key", "read": True, "trade": True, "paper": True,
     "extras": "Commission-free, fractional shares, free paper-trading account",
     "hoagie": "Balances, positions, recent orders → My Tab. Place paper orders freely; live orders need you to switch on live mode, confirm each one, and stay under your per-order cap.",
     "link": "https://app.alpaca.markets/signup", "fields": ["key", "secret"]},
    {"id": "kraken", "name": "Kraken", "assets": "Crypto (spot)", "status": "direct",
     "api": "Official REST + WebSocket, API key (HMAC)", "read": True, "trade": True, "paper": False,
     "extras": "Low fees, many coins, recurring buys in the app",
     "hoagie": "Balances → My Tab and net worth. Use a key with Query Funds only (no trading or withdrawal permission) for now.",
     "link": "https://www.kraken.com/u/security/api", "fields": ["key", "secret"]},
    {"id": "coinbase", "name": "Coinbase (Advanced Trade)", "assets": "Crypto", "status": "direct",
     "api": "Official REST, CDP API key (ES256 or Ed25519)", "read": True, "trade": True, "paper": False,
     "extras": "Recurring buys, staking in the app; portfolios to separate money",
     "hoagie": "Balances → My Tab and net worth. Make a CDP key with View permission only.",
     "link": "https://portal.cdp.coinbase.com/access/api", "fields": ["key_name", "private_key"]},
    {"id": "snaptrade", "name": "SnapTrade (bridge to many brokers, beta)", "assets": "Whatever your brokers hold", "status": "direct",
     "api": "One API for 20+ brokerages; SnapTrade Personal is free for your own accounts (up to 20 connections)", "read": True, "trade": True, "paper": False,
     "extras": "Connect Robinhood, Schwab, Webull, E*TRADE, Vanguard, tastytrade and more through one login page",
     "hoagie": "Read-only: accounts and positions from every connected brokerage → My Tab and net worth.",
     "link": "https://snaptrade.com/personal", "fields": ["client_id", "consumer_key"]},
    {"id": "robinhood", "name": "Robinhood", "assets": "Stocks, ETFs, options, crypto", "status": "snaptrade",
     "api": "No general public API for apps. Agentic Trading (an MCP server for AI agents, separate account); SnapTrade is read-only",
     "read": True, "trade": False, "paper": False, "extras": "Agentic Trading account with trade approvals",
     "hoagie": "Read balances through SnapTrade. To let an AI trade, connect Claude to Robinhood's Agentic Trading MCP yourself (Hoagie never holds those keys).",
     "link": "https://robinhood.com/us/en/agentic-trading/"},
    {"id": "schwab", "name": "Charles Schwab", "assets": "Stocks, ETFs, options, futures", "status": "snaptrade",
     "api": "Official Trader API (OAuth, developer approval needed)", "read": True, "trade": True, "paper": False,
     "extras": "Big full-service broker; approval for API access can take a while",
     "hoagie": "Read through SnapTrade.", "link": "https://developer.schwab.com"},
    {"id": "webull", "name": "Webull", "assets": "Stocks, ETFs, options, crypto", "status": "snaptrade",
     "api": "OpenAPI (application required); SnapTrade read and trade", "read": True, "trade": True, "paper": True,
     "extras": "Paper trading in the app", "hoagie": "Read through SnapTrade.", "link": "https://www.webull.com"},
    {"id": "etrade", "name": "E*TRADE", "assets": "Stocks, ETFs, options", "status": "snaptrade",
     "api": "Official REST (OAuth 1.0a)", "read": True, "trade": True, "paper": False, "extras": "",
     "hoagie": "Read through SnapTrade.", "link": "https://developer.etrade.com"},
    {"id": "tastytrade", "name": "tastytrade", "assets": "Options, futures, stocks, crypto", "status": "snaptrade",
     "api": "Official Open API", "read": True, "trade": True, "paper": True, "extras": "Options-first, sandbox account",
     "hoagie": "Read through SnapTrade.", "link": "https://developer.tastytrade.com"},
    {"id": "public", "name": "Public", "assets": "Stocks, ETFs, options, bonds, crypto", "status": "snaptrade",
     "api": "Official API", "read": True, "trade": True, "paper": False, "extras": "Options rebates",
     "hoagie": "Read through SnapTrade.", "link": "https://public.com"},
    {"id": "ibkr", "name": "Interactive Brokers", "assets": "Everything, worldwide", "status": "snaptrade",
     "api": "TWS API, Web API, FIX (powerful, complex)", "read": True, "trade": True, "paper": True,
     "extras": "Paper account, global markets", "hoagie": "Read-only through SnapTrade.", "link": "https://www.interactivebrokers.com/en/trading/ib-api.php"},
    {"id": "vanguard", "name": "Vanguard", "assets": "Funds, ETFs", "status": "snaptrade",
     "api": "No public trading API; SnapTrade read-only", "read": True, "trade": False, "paper": False, "extras": "",
     "hoagie": "Read through SnapTrade.", "link": "https://investor.vanguard.com"},
    {"id": "tradier", "name": "Tradier", "assets": "Stocks, ETFs, options", "status": "snaptrade",
     "api": "Official REST, sandbox", "read": True, "trade": True, "paper": True, "extras": "Developer-friendly options broker",
     "hoagie": "Read through SnapTrade.", "link": "https://tradier.com"},
    {"id": "moomoo", "name": "moomoo", "assets": "Stocks, ETFs, options", "status": "snaptrade",
     "api": "OpenAPI (runs a local gateway)", "read": True, "trade": True, "paper": True, "extras": "Paper trading",
     "hoagie": "Read through SnapTrade.", "link": "https://www.moomoo.com"},
    {"id": "binanceus", "name": "Binance.US", "assets": "Crypto", "status": "planned",
     "api": "Official REST, API key", "read": True, "trade": True, "paper": False, "extras": "",
     "hoagie": "Planned: balances.", "link": "https://www.binance.us"},
    {"id": "gemini_ex", "name": "Gemini (exchange)", "assets": "Crypto", "status": "planned",
     "api": "Official REST, sandbox", "read": True, "trade": True, "paper": True, "extras": "",
     "hoagie": "Planned: balances.", "link": "https://www.gemini.com"},
    {"id": "oanda", "name": "OANDA", "assets": "Forex (USD/CAD and more)", "status": "planned",
     "api": "Official v20 REST, free practice account", "read": True, "trade": True, "paper": True,
     "extras": "Real FX trading with tight spreads",
     "hoagie": "Planned: practice-account FX for The Loonie Swap play.", "link": "https://www.oanda.com"},
    {"id": "fidelity", "name": "Fidelity", "assets": "Stocks, funds", "status": "none",
     "api": "No public trading API for individuals", "read": False, "trade": False, "paper": False, "extras": "",
     "hoagie": "Type holdings in or drop a screenshot on My Tab.", "link": "https://www.fidelity.com"},
    {"id": "cashapp", "name": "Cash App Investing", "assets": "Stocks, bitcoin", "status": "none",
     "api": "No public API", "read": False, "trade": False, "paper": False, "extras": "",
     "hoagie": "Type holdings in or drop a screenshot.", "link": "https://cash.app"},
    {"id": "paypal", "name": "PayPal / Venmo crypto", "assets": "Crypto", "status": "none",
     "api": "No public API for personal crypto", "read": False, "trade": False, "paper": False, "extras": "",
     "hoagie": "Type holdings in or drop a screenshot.", "link": "https://www.paypal.com"},
]

FEATURES = [
    ("live", "Dashboard: safe money vs inflation (Treasury + BLS, no key)", "Dashboard counter"),
    ("live", "Dashboard: SEC filings for stocks you own (EDGAR, no key)", "Dashboard counter"),
    ("live", "Dashboard: crypto Fear & Greed (no key)", "Dashboard counter"),
    ("live", "Dashboard: Fed rate, 10-yr, yield curve, mortgage, jobs, gas (FRED, free key)", "Dashboard counter"),
    ("live", "Dashboard: earnings dates + company headlines (Finnhub, free key)", "Dashboard counter"),
    ("live", "Balances and positions in My Tab and the net-worth chart", "Alpaca, Kraken, Coinbase, SnapTrade brokers"),
    ("live", "Paper trading (practice money) from Hoagie", "Alpaca"),
    ("live", "Live orders with a per-order cap and a confirm step", "Alpaca"),
    ("next", "Recurring buys run by Hoagie (dollar-cost averaging) inside your limits", "Alpaca, Coinbase, Kraken"),
    ("next", "Rebalance helper: show the trades to get back to your target mix, one tap to place where allowed", "Alpaca, Coinbase"),
    ("next", "Price alerts by email for anything with a live price", "All tracked assets"),
    ("next", "Paper-trade any Today's Play to see how it would have done", "Alpaca paper"),
    ("never", "Withdrawals or transfers", "Hoagie never asks for those permissions"),
]


def _sec(pid, field):
    return "broker:%s:%s" % (pid, field)


def _cfg():
    return store.load("brokers", {"connected": {}, "orders": [], "alpaca_live": False, "max_order_usd": 100})


def catalog():
    c = _cfg()
    out = []
    for p in PLATFORMS:
        q = dict(p)
        q["connected"] = bool(c["connected"].get(p["id"]))
        q["last_sync"] = (c["connected"].get(p["id"]) or {}).get("last_sync")
        out.append(q)
    return {"platforms": out, "features": FEATURES, "checked": CHECKED, "alpaca_live": c["alpaca_live"], "alpaca_paper": c.get("alpaca_paper", True), "max_order_usd": c["max_order_usd"],
            "orders": c["orders"][-15:]}


def save(pid, fields):
    p = next((x for x in PLATFORMS if x["id"] == pid and x.get("fields")), None)
    if not p:
        raise ValueError("Hoagie can't connect to that one directly.")
    for f in p["fields"]:
        if fields.get(f):
            store.set_secret(_sec(pid, f), str(fields[f]).strip())
    if pid == "alpaca":
        c = _cfg()
        c["alpaca_paper"] = fields.get("paper", True) is not False
        store.save("brokers", c)
    if pid == "snaptrade":
        _snap_register()
    return sync(pid)


def remove(pid):
    p = next((x for x in PLATFORMS if x["id"] == pid), None)
    for f in (p or {}).get("fields", []) + ["user_secret"]:
        store.set_secret(_sec(pid, f), "")
    c = _cfg()
    c["connected"].pop(pid, None)
    store.save("brokers", c)
    _set_linked(pid, [])
    return catalog()


def _set_linked(pid, rows):
    data = store.load("linked", {"rows": []})
    data["rows"] = [r for r in data["rows"] if r.get("owner") != "broker:" + pid] + rows
    store.save("linked", data)


def _http(method, url, headers=None, body=None):
    data = json.dumps(body).encode() if body is not None and not isinstance(body, (bytes, str)) else (body.encode() if isinstance(body, str) else body)
    h = {"User-Agent": UA, "Accept": "application/json", **(headers or {})}
    if body is not None and "Content-Type" not in h:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:300]
        raise ValueError("%s said %s: %s" % (urllib.parse.urlsplit(url).hostname, e.code, msg))


def sync(pid):
    fn = {"alpaca": _alpaca, "kraken": _kraken, "coinbase": _coinbase, "snaptrade": _snaptrade}.get(pid)
    if not fn:
        raise ValueError("Nothing to sync for that one.")
    rows, info = fn()
    for r in rows:
        r.update({"linked": True, "owner": "broker:" + pid, "cost": r.get("cost", 0)})
    _set_linked(pid, rows)
    c = _cfg()
    c["connected"][pid] = {"last_sync": time.strftime("%Y-%m-%d %H:%M"), "info": info}
    store.save("brokers", c)
    return {"ok": True, "rows": len(rows), "info": info}


def sync_all():
    for pid in list(_cfg()["connected"].keys()):
        try:
            sync(pid)
        except Exception as e:
            log.info("broker sync %s failed: %s", pid, e)


# ---- Alpaca ---------------------------------------------------------------------------------

def _alpaca_base():
    return "https://paper-api.alpaca.markets" if _cfg().get("alpaca_paper", True) else "https://api.alpaca.markets"


def _alpaca_h():
    k, s = store.get_secret(_sec("alpaca", "key")), store.get_secret(_sec("alpaca", "secret"))
    if not (k and s):
        raise ValueError("Add your Alpaca key and secret first.")
    return {"APCA-API-KEY-ID": k, "APCA-API-SECRET-KEY": s}


def _alpaca():
    h, base = _alpaca_h(), _alpaca_base()
    acct = _http("GET", base + "/v2/account", h)
    pos = _http("GET", base + "/v2/positions", h)
    venue = "Alpaca" + (" (paper)" if "paper" in base else "")
    rows = [{"id": "alpaca-cash", "venue": venue, "asset": "USD", "amount": float(acct.get("cash") or 0), "value": float(acct.get("cash") or 0)}]
    for p in pos:
        sym = p["symbol"].replace("/USD", "").replace("USD", "") if p.get("asset_class") == "crypto" else p["symbol"]
        rows.append({"id": "alpaca-" + p["symbol"], "venue": venue, "asset": sym, "amount": float(p.get("qty") or 0),
                     "value": float(p.get("market_value") or 0), "cost": float(p.get("cost_basis") or 0)})
    if "paper" in base:
        for r in rows:
            r["fixed"] = True        # practice money: shown, but not counted as live-priced
    return rows, {"equity": float(acct.get("equity") or 0), "buying_power": float(acct.get("buying_power") or 0), "paper": "paper" in base}


def alpaca_order(body):
    """Place an order. Paper by default; live only when switched on, confirmed, and under the cap."""
    c = _cfg()
    if not body.get("confirm"):
        raise ValueError("Please confirm the order.")
    sym = str(body.get("symbol", "")).upper().strip()
    if not sym or len(sym) > 12:
        raise ValueError("Enter a symbol, like VOO or BTC/USD.")
    side = "sell" if body.get("side") == "sell" else "buy"
    notional = round(float(body.get("notional") or 0), 2)
    if notional <= 0:
        raise ValueError("Enter a dollar amount.")
    paper = c.get("alpaca_paper", True)
    if not paper:
        if not c.get("alpaca_live"):
            raise ValueError("Live trading is off. Turn it on at the Trading counter first.")
        if notional > float(c.get("max_order_usd") or 100):
            raise ValueError("That's over your per-order cap of $%.0f." % float(c.get("max_order_usd") or 100))
    order = {"symbol": sym, "notional": str(notional), "side": side, "type": "market",
             "time_in_force": "gtc" if "/" in sym else "day"}
    res = _http("POST", _alpaca_base() + "/v2/orders", _alpaca_h(), order)
    c["orders"].append({"at": time.strftime("%Y-%m-%d %H:%M"), "symbol": sym, "side": side, "notional": notional,
                        "paper": paper, "status": res.get("status"), "id": res.get("id")})
    c["orders"] = c["orders"][-200:]
    store.save("brokers", c)
    log.info("alpaca %s order: %s %s $%.2f -> %s", "paper" if paper else "LIVE", side, sym, notional, res.get("status"))
    return {"ok": True, "status": res.get("status"), "paper": paper}


def set_trading(body):
    c = _cfg()
    if "max_order_usd" in body:
        c["max_order_usd"] = max(1, min(10000, float(body["max_order_usd"] or 100)))
    if "alpaca_live" in body:
        if body["alpaca_live"] and body.get("typed") != "LIVE":
            raise ValueError("Type LIVE to switch on real-money orders.")
        c["alpaca_live"] = bool(body["alpaca_live"])
    if "alpaca_paper" in body:
        c["alpaca_paper"] = bool(body["alpaca_paper"])
    store.save("brokers", c)
    return catalog()


# ---- Kraken ---------------------------------------------------------------------------------

KRAKEN_NAMES = {"XXBT": "BTC", "XBT": "BTC", "XETH": "ETH", "ZUSD": "USD", "ZCAD": "CAD", "ZEUR": "EUR", "ZGBP": "GBP", "XXDG": "DOGE",
                "XLTC": "LTC", "XXRP": "XRP", "XXLM": "XLM", "XETC": "ETC"}


def _kraken():
    k, s = store.get_secret(_sec("kraken", "key")), store.get_secret(_sec("kraken", "secret"))
    if not (k and s):
        raise ValueError("Add your Kraken key and secret first.")
    path = "/0/private/Balance"
    nonce = str(int(time.time() * 1000))
    post = urllib.parse.urlencode({"nonce": nonce})
    sha = hashlib.sha256((nonce + post).encode()).digest()
    sig = base64.b64encode(hmac.new(base64.b64decode(s), path.encode() + sha, hashlib.sha512).digest()).decode()
    d = _http("POST", "https://api.kraken.com" + path, {"API-Key": k, "API-Sign": sig, "Content-Type": "application/x-www-form-urlencoded"}, post)
    if d.get("error"):
        raise ValueError("Kraken: " + ", ".join(d["error"]))
    rows = []
    for code, amt in (d.get("result") or {}).items():
        a = float(amt)
        if a <= 0:
            continue
        base_code = code.split(".")[0]
        sym = KRAKEN_NAMES.get(base_code, base_code)
        rows.append({"id": "kraken-" + code, "venue": "Kraken", "asset": sym, "amount": a, "value": 0, "hint": "crypto"})
    return rows, {"assets": len(rows)}


# ---- Coinbase Advanced Trade (CDP key) ------------------------------------------------------

def _b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _coinbase_jwt(method, host, path):
    name, pk = store.get_secret("coinbase_key_name"), store.get_secret("coinbase_private_key")
    name = name or store.get_secret(_sec("coinbase", "key_name"))
    pk = (pk or store.get_secret(_sec("coinbase", "private_key"))).replace("\\n", "\n")
    if not (name and pk):
        raise ValueError("Add your Coinbase key name and private key first.")
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec, ed25519
        from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    except Exception:
        raise ValueError("Coinbase needs the 'cryptography' package. Run Start Constable Hoagie once more to install it.")
    now = int(time.time())
    payload = {"sub": name, "iss": "cdp", "nbf": now, "exp": now + 120, "uri": "%s %s%s" % (method, host, path)}
    if "BEGIN" in pk:
        key = serialization.load_pem_private_key(pk.encode(), password=None)
        header = {"alg": "ES256", "kid": name, "nonce": secrets.token_hex(16), "typ": "JWT"}
        msg = (_b64url(json.dumps(header).encode()) + "." + _b64url(json.dumps(payload).encode())).encode()
        r, s = decode_dss_signature(key.sign(msg, ec.ECDSA(hashes.SHA256())))
        sig = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    else:
        raw = base64.b64decode(pk)
        key = ed25519.Ed25519PrivateKey.from_private_bytes(raw[:32])
        header = {"alg": "EdDSA", "kid": name, "nonce": secrets.token_hex(16), "typ": "JWT"}
        msg = (_b64url(json.dumps(header).encode()) + "." + _b64url(json.dumps(payload).encode())).encode()
        sig = key.sign(msg)
    return msg.decode() + "." + _b64url(sig)


def _coinbase():
    host, path = "api.coinbase.com", "/api/v3/brokerage/accounts"
    d = _http("GET", "https://%s%s?limit=250" % (host, path), {"Authorization": "Bearer " + _coinbase_jwt("GET", host, path)})
    rows = []
    for a in d.get("accounts", []):
        amt = float((a.get("available_balance") or {}).get("value") or 0) + float((a.get("hold") or {}).get("value") or 0)
        if amt <= 0:
            continue
        rows.append({"id": "coinbase-" + a.get("uuid", a.get("currency")), "venue": "Coinbase", "asset": a.get("currency"), "amount": amt, "value": 0, "hint": "crypto"})
    return rows, {"assets": len(rows)}


# ---- SnapTrade (read-only bridge) -----------------------------------------------------------

SNAP = "https://api.snaptrade.com/api/v1"


def _snap_call(method, path, query=None, body=None, user=True):
    cid, ck = store.get_secret(_sec("snaptrade", "client_id")), store.get_secret(_sec("snaptrade", "consumer_key"))
    if not (cid and ck):
        raise ValueError("Add your SnapTrade client ID and consumer key first.")
    q = {"clientId": cid, "timestamp": str(int(time.time()))}
    if user:
        q.update({"userId": _snap_user(), "userSecret": store.get_secret(_sec("snaptrade", "user_secret"))})
    q.update(query or {})
    qs = urllib.parse.urlencode(q)
    sig_obj = {"content": body, "path": "/api/v1" + path, "query": qs}
    sig = base64.b64encode(hmac.new(ck.encode(), json.dumps(sig_obj, separators=(",", ":"), sort_keys=True).encode(), hashlib.sha256).digest()).decode()
    return _http(method, SNAP + path + "?" + qs, {"Signature": sig}, body)


def _snap_user():
    c = _cfg()
    if not c.get("snap_user"):
        c["snap_user"] = "hoagie-" + secrets.token_hex(6)
        store.save("brokers", c)
    return c["snap_user"]


def _snap_register():
    if store.get_secret(_sec("snaptrade", "user_secret")):
        return
    d = _snap_call("POST", "/snapTrade/registerUser", body={"userId": _snap_user()}, user=False)
    store.set_secret(_sec("snaptrade", "user_secret"), d.get("userSecret", ""))


def snap_portal():
    """A link to SnapTrade's own page where you log in to your brokerage (read-only)."""
    d = _snap_call("POST", "/snapTrade/login", body={"connectionType": "read"})
    return {"url": d.get("redirectURI")}


def _snaptrade():
    accts = _snap_call("GET", "/accounts")
    rows = []
    for a in accts or []:
        venue = "%s · %s" % (a.get("institution_name") or "Brokerage", a.get("name") or a.get("number") or "")
        try:
            pos = _snap_call("GET", "/accounts/%s/positions" % a["id"])
        except Exception:
            pos = []
        for p in pos or []:
            sym = (((p.get("symbol") or {}).get("symbol") or {}).get("symbol")) or "?"
            units = float(p.get("units") or 0)
            price = float(p.get("price") or 0)
            rows.append({"id": "snap-%s-%s" % (a["id"], sym), "venue": venue, "asset": sym, "amount": units,
                         "value": round(units * price, 2), "cost": round(units * float(p.get("average_purchase_price") or 0), 2)})
        try:
            bals = _snap_call("GET", "/accounts/%s/balances" % a["id"])
            for b in bals or []:
                cash = float(b.get("cash") or 0)
                if cash:
                    cur = ((b.get("currency") or {}).get("code")) or "USD"
                    rows.append({"id": "snap-%s-cash-%s" % (a["id"], cur), "venue": venue, "asset": cur, "amount": cash, "value": cash})
        except Exception:
            pass
    return rows, {"accounts": len(accts or [])}
