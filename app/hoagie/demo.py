"""Demo mode: a fully simulated shop for anyone who clicks "Try the demo" on the sign-in screen.

Every number here is made up. Ten personas, each with a different mix of connected apps, so every
click shows off a different side of Constable Hoagie. Demo sessions never read or write the real
shop's data, keys, or AI plan: every API call is answered here, and changes live only in the
visitor's session (gone when it ends).
"""
import copy
import csv
import io
import random
import secrets
import threading
import time
from datetime import date, datetime, timedelta, timezone

from . import ai, tour, bets as betmod, brokers, costs as costmod, engine, feeds, give, insights, integrations, prefs, sports, store

log = store.log
_lock = threading.Lock()
_sessions = {}          # demo key -> state
_last = {}              # address -> last persona index (so the next click shows a different one)
_starts = {}            # address -> recent demo start times (rate limit)
MAX_SESSIONS = 400
DEMO_HOURS = 3

PRICES = {"BTC": 91500, "ETH": 3150, "SOL": 168, "DOGE": 0.18, "ADA": 0.62, "VTI": 312, "VXUS": 66, "BND": 72, "VOO": 575, "QQQ": 515,
          "AAPL": 238, "NVDA": 182, "TSLA": 342, "MSFT": 455, "AMZN": 226, "GOOGL": 196, "SCHD": 28, "O": 57, "JNJ": 158, "KO": 70,
          "SGOV": 100.5, "USD": 1, "EUR": 1.08, "GBP": 1.27, "CAD": 0.72, "MXN": 0.055}
CRYPTO = {"BTC", "ETH", "SOL", "DOGE", "ADA"}
FIAT = {"USD", "EUR", "GBP", "CAD", "MXN"}

# Each persona: who they are, what's connected, what they hold, how they spend and bet.
PERSONAS = [
    {"name": "Crypto Carla", "menu": "full", "theme": "neon", "brain": "gemini",
     "blurb": "Crypto-first: Coinbase and Kraken balances priced live, Kalshi prediction markets in the Bet Tracker.",
     "hold": [("Coinbase", "BTC", 0.42, 1), ("Coinbase", "ETH", 3.1, 1), ("Kraken", "SOL", 48, 1), ("Kraken", "DOGE", 9000, 1), ("Kalshi", "USD", 640, 1), ("Ally HYSA", "USD", 4200, 0)],
     "brokers": ["coinbase", "kraken"], "keys": ["gemini", "oddsapi", "kalshi_key_id", "kalshi_private_key", "finnhub"], "bank": False,
     "income": 5200, "spend": 3900, "bets": ("kalshi", ["Kalshi", "DraftKings"], ["kalshi", "screenshot"]), "dash": ["safe", "mood", "networth", "earnings", "games"],
     "show": ["coinbase", "kraken", "kalshi", "gemini", "fng", "finnhub", "oddsapi"]},
    {"name": "Index Ivan", "menu": "money", "theme": "original", "brain": "claude",
     "blurb": "Set-and-forget investor: Vanguard through SnapTrade, bank synced with SimpleFIN, the upbeat news feed on.",
     "hold": [("Vanguard", "VTI", 220, 1), ("Vanguard", "VXUS", 300, 1), ("Vanguard", "BND", 180, 1), ("Chase", "USD", 8600, 1), ("Marcus HYSA", "USD", 15000, 0)],
     "brokers": ["snaptrade"], "keys": ["fred", "tavily"], "bank": True,
     "income": 6400, "spend": 4100, "bets": None, "dash": ["safe", "networth", "costs", "rates", "filings", "brokers", "bank"],
     "show": ["snaptrade", "simplefin", "claude", "fred", "treasury", "bls", "edgar"]},
    {"name": "Sharp Sam", "menu": "full", "theme": "neon", "brain": "claude",
     "blurb": "Sports bettor: The Odds API price edges, FantasyPros, DraftKings and FanDuel slips read from screenshots, Alpaca paper trading.",
     "hold": [("Alpaca (paper)", "SPY-PAPER", 1, 0), ("Alpaca", "USD", 2500, 1), ("Alpaca", "NVDA", 12, 1), ("DraftKings", "USD", 820, 0), ("FanDuel", "USD", 410, 0)],
     "brokers": ["alpaca"], "keys": ["oddsapi", "fantasypros", "tavily"], "bank": False, "hub": True,
     "income": 4800, "spend": 3600, "bets": ("sharp", ["DraftKings", "FanDuel", "BetMGM", "Caesars"], ["screenshot", "text", "today_play", "hub"]),
     "dash": ["games", "networth", "costs", "mood"], "show": ["oddsapi", "fantasypros", "slip-shot", "alpaca", "espn", "hub", "claude"]},
    {"name": "Robinhood Rae", "menu": "full", "theme": "neon", "brain": "openai",
     "blurb": "Growth stocks on Robinhood via SnapTrade, earnings radar from Finnhub, GPT as the brain, a few PrizePicks entries.",
     "hold": [("Robinhood", "TSLA", 14, 1), ("Robinhood", "NVDA", 40, 1), ("Robinhood", "AAPL", 22, 1), ("Robinhood", "USD", 1300, 1), ("Robinhood", "BTC", 0.05, 1)],
     "brokers": ["snaptrade"], "keys": ["openai", "finnhub", "fred"], "bank": True,
     "income": 5600, "spend": 4700, "bets": ("dfs", ["PrizePicks", "Underdog"], ["screenshot", "text"]), "dash": ["earnings", "filings", "networth", "rates", "costs", "games"],
     "show": ["snaptrade", "finnhub", "edgar", "openai", "slip-shot", "fred"]},
    {"name": "Saver Sofia", "menu": "money", "theme": "original", "brain": "ollama",
     "blurb": "Budget builder: SimpleFIN bank sync, budgets in Costs, T-bills beating inflation, a free no-account AI on her PC (Ollama).",
     "hold": [("Credit union", "USD", 3400, 1), ("Ally HYSA", "USD", 11800, 1), ("TreasuryDirect", "SGOV", 60, 0), ("401(k)", "VOO", 18, 0)],
     "brokers": [], "keys": [], "bank": True, "agent_url": "http://localhost:11434/v1",
     "income": 4100, "spend": 3050, "bets": None, "dash": ["safe", "costs", "bank", "networth"],
     "show": ["simplefin", "ollama", "treasury", "bls", "costs", "bank-csv"]},
    {"name": "Fantasy Frank", "menu": "full", "theme": "neon", "brain": "groq",
     "blurb": "Fantasy football nut: Sleeper leagues live beside his bets, Underdog and PrizePicks slips, free Groq brain.",
     "hold": [("Webull", "QQQ", 9, 1), ("Webull", "USD", 600, 1), ("Underdog", "USD", 150, 0), ("Checking", "USD", 2100, 0)],
     "brokers": ["snaptrade"], "keys": ["groq", "fantasypros", "oddsapi"], "bank": False, "sleeper": True,
     "income": 3900, "spend": 3400, "bets": ("dfs", ["Underdog", "PrizePicks", "Sleeper", "FanDuel"], ["screenshot", "text", "csv"]), "dash": ["games", "networth", "costs"],
     "show": ["sleeper", "fantasypros", "groq", "slip-shot", "bet-csv", "snaptrade"]},
    {"name": "Euro Elena", "menu": "money", "theme": "neon", "brain": "gemini",
     "blurb": "Lives between currencies: EUR, GBP and USD cash with ECB rates wiggling her net worth, Schwab via SnapTrade, neon look on a money-only menu.",
     "hold": [("Wise", "EUR", 9200, 1), ("Wise", "GBP", 3100, 1), ("Schwab", "SCHD", 260, 1), ("Schwab", "MSFT", 15, 1), ("Chase", "USD", 2600, 1)],
     "brokers": ["snaptrade"], "keys": ["gemini", "fred"], "bank": True,
     "income": 5900, "spend": 4300, "bets": None, "dash": ["networth", "safe", "rates", "filings", "costs"],
     "show": ["prices", "snaptrade", "gemini", "fred", "simplefin"]},
    {"name": "Agent Andy", "menu": "full", "theme": "neon", "brain": "agent",
     "blurb": "Brings his own AI agent: it logs bets and spending through the Agent API and iPhone Shortcuts, and chats with Hoagie over MCP. Alpaca live trading with a cap.",
     "hold": [("Alpaca", "USD", 5200, 1), ("Alpaca", "AMZN", 20, 1), ("Alpaca", "GOOGL", 25, 1), ("Coinbase", "ETH", 2.2, 1), ("Bank", "USD", 4100, 1)],
     "brokers": ["alpaca", "coinbase"], "keys": ["agent", "finnhub", "oddsapi"], "bank": True, "agent_url": "https://agent.example.com/v1",
     "income": 7200, "spend": 5100, "bets": ("casual", ["FanDuel", "DraftKings", "ESPN Bet"], ["agent", "webhook", "text"]), "dash": ["networth", "earnings", "costs", "games", "brokers"],
     "show": ["agent", "agent-api", "mcp", "webhook", "alpaca", "coinbase"]},
    {"name": "Prediction Pat", "menu": "full", "theme": "original", "brain": "openrouter",
     "blurb": "Prediction markets and macro: Kalshi positions, FRED yield curve, crypto mood, a free OpenRouter model. Classic look on the full menu.",
     "hold": [("Kalshi", "USD", 1900, 1), ("Coinbase", "BTC", 0.12, 1), ("Coinbase", "SOL", 30, 1), ("Fidelity", "VTI", 60, 1)],
     "brokers": ["coinbase", "snaptrade"], "keys": ["openrouter", "kalshi_key_id", "kalshi_private_key", "fred"], "bank": False,
     "income": 6100, "spend": 4400, "bets": ("kalshi", ["Kalshi"], ["kalshi"]), "dash": ["rates", "mood", "safe", "networth", "games"],
     "show": ["kalshi", "fred", "fng", "openrouter", "coinbase"]},
    {"name": "Retiree Rita", "menu": "money", "theme": "original", "brain": "claude",
     "blurb": "Dividend retiree: Fidelity through SnapTrade, SEC filings and earnings for her stocks, morning email digest, upbeat feed.",
     "hold": [("Fidelity", "JNJ", 120, 1), ("Fidelity", "KO", 300, 1), ("Fidelity", "O", 400, 1), ("Fidelity", "BND", 500, 1), ("Bank", "USD", 22000, 1)],
     "brokers": ["snaptrade"], "keys": ["finnhub", "smtp", "tavily"], "bank": True, "email": True,
     "income": 4500, "spend": 3700, "bets": None, "dash": ["filings", "earnings", "safe", "networth", "bank", "costs"],
     "show": ["snaptrade", "edgar", "finnhub", "smtp", "claude", "simplefin"]},
]

TEAMS = {
    "NFL": ["Chiefs", "Bills", "Eagles", "Lions", "Ravens", "49ers", "Cowboys", "Packers", "Bengals", "Dolphins"],
    "NBA": ["Celtics", "Lakers", "Nuggets", "Knicks", "Thunder", "Bucks", "Warriors", "Suns", "Heat", "Cavaliers"],
    "NHL": ["Bruins", "Rangers", "Oilers", "Panthers", "Avalanche", "Maple Leafs", "Stars", "Devils"],
    "College Football": ["Georgia", "Ohio State", "Michigan", "Texas", "Oregon", "Alabama"],
}
PROPS = ["Over 24.5 pts", "Over 6.5 ast", "Over 74.5 rec yds", "Anytime TD", "Over 1.5 TD passes", "Over 9.5 reb", "Over 0.5 goals", "Under 3.5 shots"]
PLAYERS = ["J. Allen", "P. Mahomes", "J. Tatum", "N. Jokic", "S. Gilgeous-Alexander", "C. McDavid", "J. Chase", "A. St. Brown", "L. Doncic", "J. Brunson"]
KALSHI = ["Fed cuts rates in Dec", "CPI above 3.0% in Nov", "BTC above $100k by Dec 31", "Unemployment ≥ 4.5% in Dec", "S&P 500 up this week", "Gas under $3 by Jan"]


# ---- sessions --------------------------------------------------------------------------------

def start(addr, avoid=None, menu=None, tour=False):
    """New demo session with a persona different from this visitor's last one."""
    with _lock:
        now = time.time()
        for k in [k for k, v in _sessions.items() if v["exp"] < now]:
            _sessions.pop(k, None)
        if len(_sessions) >= MAX_SESSIONS:
            for k in sorted(_sessions, key=lambda k: _sessions[k]["exp"])[:50]:
                _sessions.pop(k, None)
        last = avoid if avoid is not None else _last.get(addr)
        pool = [i for i in range(len(PERSONAS)) if i != last and (menu not in ("money", "full") or PERSONAS[i]["menu"] == menu)]
        if menu in ("money", "full"):   # the setup tour: personas that show off the most
            rich = [i for i in pool if PERSONAS[i]["name"] in ("Sharp Sam", "Agent Andy", "Robinhood Rae", "Index Ivan", "Retiree Rita", "Euro Elena")]
            pool = rich or pool
        idx = random.choice(pool)
        _last[addr] = idx
        recent = [t for t in _starts.get(addr, []) if now - t < 600]
        if len(recent) >= 30:
            raise PermissionError("That's a lot of demos! Give it a few minutes.")
        _starts[addr] = recent + [now]
        key = "demo-" + secrets.token_urlsafe(18)
        seed = random.randrange(1 << 30)
        st = _build(idx, seed)
        st.update({"key": key, "exp": now + DEMO_HOURS * 3600, "tour": bool(tour)})
        _sessions[key] = st
        prefs.DEMO["demo:" + key] = st["prefs"]
        return key, st


def end(key):
    with _lock:
        _sessions.pop(key, None)
        prefs.DEMO.pop("demo:" + key, None)


def get(key):
    st = _sessions.get(key)
    return st if st and st["exp"] > time.time() else None


# ---- building one simulated person -----------------------------------------------------------

def _walk(rng, n, start, vol):
    v, out = start, []
    for _ in range(n):
        v *= 1 + rng.gauss(0.0005, vol)
        out.append(v)
    return out


def _build(idx, seed):
    rng = random.Random(seed)
    p = copy.deepcopy(PERSONAS[idx])
    today = date.today()
    # holdings, with a little wiggle so every visit differs
    rows = []
    for venue, asset, amt, linked in p["hold"]:
        amt = round(amt * rng.uniform(0.75, 1.3), 4 if asset in CRYPTO else 2)
        price = PRICES.get(asset, 0)
        kind = "crypto" if asset in CRYPTO else "cash" if asset in FIAT else "other" if asset.endswith("PAPER") else "stock"
        now = round(amt * price, 2) if price else round(rng.uniform(4000, 12000), 2)
        cost = round(now * rng.uniform(0.7, 1.1), 2) if kind in ("crypto", "stock") else 0
        rows.append({"id": "d%d" % len(rows), "venue": venue, "asset": asset.replace("-PAPER", ""), "amount": amt, "cost": cost, "value": now, "now": now,
                     "live": kind != "cash" and price > 0, "kind": kind, "gain": round(now - cost, 2) if cost else None, "linked": bool(linked),
                     "updated": today.isoformat()})
    total = round(sum(r["now"] for r in rows), 2)
    # 365 days of net worth
    hist = _walk(rng, 365, total * rng.uniform(0.72, 0.9), 0.006 + (0.01 if any(r["kind"] == "crypto" for r in rows) else 0))
    scale = total / hist[-1]
    days = [(today - timedelta(days=364 - i)).isoformat() for i in range(365)]
    nw = [{"date": d, "total": round(v * scale, 2)} for d, v in zip(days, hist)]
    assets = []
    merged = {}
    for r in rows:
        if r["asset"] in merged:
            merged[r["asset"]]["now"] += r["now"]
            continue
        merged[r["asset"]] = dict(r)
    for r in merged.values():
        series = _walk(rng, 30, 1.0, 0.025 if r["kind"] == "crypto" else 0.01 if r["kind"] == "stock" else 0.003 if r["asset"] in ("EUR", "GBP") else 0)
        assets.append({"asset": r["asset"], "kind": r["kind"], "value": r["now"],
                       "prices": [[i, round(x * PRICES.get(r["asset"], 1), 4)] for i, x in enumerate(series)] if r["live"] or r["asset"] in ("EUR", "GBP") else [],
                       "change_pct": round((series[-1] / series[0] - 1) * 100, 1) if (r["live"] or r["asset"] in ("EUR", "GBP")) else None})
    # spending: this month + 6 months of trend
    cats = [("Housing", .32), ("Groceries", .12), ("Dining out", .07), ("Transport", .08), ("Utilities", .05), ("Subscriptions", .03),
            ("Health", .04), ("Shopping", .07), ("Fun", .05), ("Debt payments", .06), ("Savings & investing", .11)]
    if p["bets"]:
        cats.append(("Betting & lottery", .03))
    notes = {"Housing": ["Rent", "Mortgage"], "Groceries": ["Market Basket", "Hannaford", "Trader Joe's"], "Dining out": ["Pizza night", "Coffee", "Sub shop"],
             "Transport": ["Gas", "Car insurance", "Parking"], "Utilities": ["Electric", "Internet", "Phone"], "Subscriptions": ["Streaming", "Music", "Cloud storage"],
             "Health": ["Pharmacy", "Gym"], "Shopping": ["Amazon", "Target"], "Fun": ["Concert", "Movies"], "Debt payments": ["Card payment", "Student loan"],
             "Savings & investing": ["Transfer to savings", "Roth IRA"], "Betting & lottery": ["DraftKings deposit", "Lottery"]}
    spend = p["spend"] * rng.uniform(0.85, 1.1)
    items = []
    dom = today.day
    for c, share in cats:
        amt_total = spend * share * min(1, dom / 30 + 0.25)
        k = max(1, int(rng.uniform(1, 6)) if c not in ("Housing",) else 1)
        for _ in range(k):
            items.append({"id": "c%d" % len(items), "date": today.replace(day=rng.randint(1, max(1, dom))).isoformat(), "amount": round(amt_total / k, 2),
                          "category": c, "note": rng.choice(notes[c]), "source": "bank" if p["bank"] else rng.choice(["manual", "csv"])})
    items.append({"id": "c-inc", "date": today.replace(day=1).isoformat(), "amount": -round(p["income"], 2), "category": "Income", "note": "Payroll", "source": "bank" if p["bank"] else "manual"})
    budgets = {c: round(p["spend"] * s * 1.05) for c, s in cats[:6]}
    trend = [{"month": (today.replace(day=1) - timedelta(days=30 * i)).strftime("%Y-%m"), "spent": round(p["spend"] * rng.uniform(0.85, 1.12), 2)} for i in range(5, -1, -1)]
    # bets
    bets = _bets(rng, p) if p["bets"] else []
    menu = p["menu"]
    pp = copy.deepcopy(prefs.DEFAULT)
    pp.update({"menu": menu, "theme": p["theme"], "dash": {"cards": p["dash"]}, "upbeat": None})
    pp["email"].update({"on": bool(p.get("email")), "address": "demo@example.com" if p.get("email") else ""})
    return {"idx": idx, "seed": seed, "p": p, "rows": rows, "nw": nw, "assets": assets, "costs": items, "budgets": budgets, "trend": trend,
            "bets": bets, "prefs": pp, "pos": {"bills": round(rng.uniform(3.6, 4.4), 2), "cpi": round(rng.uniform(2.3, 3.4), 1),
                                                "fng": rng.randint(12, 88), "curve": round(rng.uniform(-0.4, 0.8), 2)}}


def _bets(rng, p):
    style, books, sources = p["bets"]
    today = date.today()
    out = []
    n_settled = rng.randint(22, 55)
    for i in range(n_settled + rng.randint(3, 7)):
        open_ = i >= n_settled
        placed = today - timedelta(days=0 if open_ else rng.randint(1, 75))
        league = rng.choice(list(TEAMS))
        a, b = rng.sample(TEAMS[league], 2)
        if style == "kalshi" and (books == ["Kalshi"] or rng.random() < .6):
            q = rng.choice(KALSHI)
            side = rng.choice(["YES", "NO"])
            price = rng.randint(18, 82)
            qty = rng.randint(10, 120)
            stake = round(qty * price / 100, 2)
            bet = {"book": "Kalshi", "market": "prediction", "pick": "%s: %s @ %d¢ x%d" % (q, side, price, qty), "event": q,
                   "odds": int(round((100 - price) / price * 100)) if price < 50 else -int(round(price / (100 - price) * 100)),
                   "stake": stake, "to_win": round(qty - stake, 2), "source": "kalshi"}
        elif style == "dfs" and rng.random() < .65:
            legs = rng.randint(2, 5)
            picks = ", ".join("%s %s" % (rng.choice(PLAYERS), rng.choice(PROPS)) for _ in range(legs))
            stake = float(rng.choice([5, 10, 10, 20, 25]))
            mult = {2: 3, 3: 5, 4: 10, 5: 20}[legs]
            bet = {"book": rng.choice([x for x in books if x in ("PrizePicks", "Underdog", "Sleeper")] or books), "market": "dfs",
                   "pick": "%d-pick: %s" % (legs, picks), "event": league, "odds": (mult - 1) * 100, "stake": stake, "to_win": stake * (mult - 1)}
        else:
            kind = rng.choice(["spread", "spread", "total", "moneyline", "prop"] + (["parlay"] if style == "casual" else []))
            odds = rng.choice([-110, -110, -115, -105, +100, -120, +130, +150, -150, +210])
            if kind == "spread":
                pick = "%s %+.1f" % (a, rng.choice([-7.5, -3.5, -2.5, +3.5, +6.5, -1.5, +1.5]))
            elif kind == "total":
                pick = "%s/%s %s %.1f" % (a, b, rng.choice(["Over", "Under"]), rng.choice([44.5, 47.5, 220.5, 6.5, 51.5]))
            elif kind == "moneyline":
                pick = "%s ML" % a
            elif kind == "prop":
                pick = "%s %s" % (rng.choice(PLAYERS), rng.choice(PROPS))
            else:
                pick = "3-leg parlay: %s ML, %s ML, %s ML" % (a, rng.choice(TEAMS[league]), rng.choice(TEAMS["NBA"]))
                odds = rng.choice([+450, +600, +595])
            stake = float(rng.choice([10, 20, 25, 25, 50, 50, 100] if style == "sharp" else [5, 10, 10, 20, 25]))
            bet = {"book": rng.choice(books), "market": kind, "pick": pick, "event": "%s vs %s" % (a, b), "odds": odds, "stake": stake}
        bet.setdefault("source", rng.choice(sources))
        bet["placed"] = placed.isoformat()
        b = betmod.clean(bet, bet["source"])
        if open_:
            st = rng.choice(["in", "in", "pre", "post"])
            sa, sb = rng.randint(0, 31), rng.randint(0, 31)
            b["live"] = {"state": st, "detail": {"in": rng.choice(["Q3 6:12", "2nd 8:40", "P2 11:03", "Q4 2:05"]), "pre": "Tonight 8:15 PM", "post": "Final"}[st],
                         "score": "%s %s · %s %s" % (a[:3].upper(), sa if st != "pre" else "", b["event"].split(" vs ")[-1][:3].upper() if " vs " in b["event"] else "OPP", sb if st != "pre" else "")}
            if st == "post" and b["market"] in ("spread", "moneyline", "total"):
                b["suggest"] = rng.choice(["won", "lost"])
        else:
            win_p = 0.53 if style == "sharp" else 0.5 if style != "dfs" else 0.33
            r = rng.random()
            b["status"] = "won" if r < win_p else "push" if r < win_p + 0.03 else "lost"
            b["payout"] = round(b["stake"] + b["to_win"], 2) if b["status"] == "won" else b["stake"] if b["status"] == "push" else 0
        out.append(b)
    return out


# ---- the shop's API, simulated ---------------------------------------------------------------

def _me(st):
    p = st["prefs"]
    eff = p["theme"] if p["theme"] in ("original", "neon") else ("neon" if p["menu"] == "full" else "original")
    full = p["menu"] == "full"
    return {"menu": p["menu"], "theme": p["theme"], "theme_eff": eff, "betting": full, "email": p["email"], "topics": prefs.EMAIL_TOPICS,
            "windows": prefs.WINDOWS, "upbeat": prefs.upbeat_on("demo:" + st["key"]), "upbeat_pref": p.get("upbeat"), "dash_set": True,
            "intro_seen": True, "tour_seen": True, "ai_asked": True, "bet_view": False, "videos": "", "avatar": "",
            "dash": prefs.dash_cards(p), "dash_all": [{"id": c, "title": v[0], "needs": v[1]} for c, v in prefs.DASH_CARDS.items() if v[2] == "all" or full]}


def _engines(p):
    e = {k: False for k in ("claude", "openai", "gemini", "agent", "groq", "openrouter", "tavily", "brave", "foundry")}
    b = p["brain"]
    e["agent" if b == "ollama" else b] = True
    for k in p["keys"]:
        if k in e:
            e[k] = True
    return e


def _status(st, remote):
    p = st["p"]
    secrets_ = {k: (k in p["keys"]) for k in store.SECRET_NAMES}
    return {"version": _version(), "onboarded": True,
            "engines": _engines(p), "engine_in_use": "agent" if p["brain"] == "ollama" else p["brain"], "secrets": secrets_,
            "secure_store": "Windows Credential Manager (demo: nothing is stored)",
            "settings": {"ai_default": "agent" if p["brain"] == "ollama" else p["brain"], "agent_url": p.get("agent_url", ""), "ai_set": True,
                         "sleeper_user": "demo_frank" if p.get("sleeper") else "", "hub_path": "Z:\\gambling" if p.get("hub") else "", "ask_engine": "auto",
                         "home_state": "NH", "risk": 3 if p["menu"] == "full" else 2, "daily_budget": 25, "claude_path": "", "claude_model": "",
                         "foundry_url": "", "share_tab_with_guests": True, "require_login_local": False},
            "hub": bool(p.get("hub")), "snaptrade_optin": "snaptrade" in p["brokers"], "bank_connected": p["bank"], "brokers_connected": p["brokers"],
            "guest": False, "guest_name": "", "signed_in_as": "", "remote": remote, "me": _me(st),
            "demo": {"persona": p["name"], "blurb": p["blurb"], "number": st["idx"] + 1, "of": len(PERSONAS), "show": p["show"], "tour": bool(st.get("tour"))}}


def _version():
    try:
        from . import updater
        return updater.info()["version"]
    except Exception:
        return "demo"


def _portfolio(st):
    rows = st["rows"]
    total = round(sum(r["now"] for r in rows), 2)
    cost = round(sum(r["cost"] for r in rows), 2)
    return {"rows": rows, "total": total, "cost": cost, "gain": round(total - cost, 2) if cost else None, "demo": True}


def _networth(st, days):
    days = days if days in (30, 90, 365) else 30
    nw = st["nw"][-days:]
    actual = nw[-min(days, 21):]
    return {"total": nw[-1]["total"], "actual": actual, "estimate": nw, "assets": st["assets"], "days": days,
            "note": "Demo: every number here is simulated. Solid line = daily snapshots; dashed = estimate from today's holdings."}


def _costs(st):
    items = st["costs"]
    spend = [i for i in items if i["amount"] > 0]
    by = {}
    for i in spend:
        by[i["category"]] = round(by.get(i["category"], 0) + i["amount"], 2)
    ym = date.today().strftime("%Y-%m")
    return {"month": ym, "items": sorted(items, key=lambda x: x["date"], reverse=True), "by_category": by, "spent": round(sum(i["amount"] for i in spend), 2),
            "income": round(-sum(i["amount"] for i in items if i["amount"] < 0), 2), "budgets": st["budgets"], "categories": costmod.CATEGORIES,
            "months": [t["month"] for t in reversed(st["trend"])], "trend": st["trend"]}


def _bank(st):
    if not st["p"]["bank"]:
        return {"connected": False, "signup": "https://beta-bridge.simplefin.org", "last_sync": None, "accounts": [], "errors": []}
    acc = [{"org": r["venue"], "name": "Checking" if i == 0 else "Savings", "balance": r["now"], "currency": "USD"}
           for i, r in enumerate([r for r in st["rows"] if r["kind"] == "cash" and r["asset"] == "USD"][:3])]
    return {"connected": True, "signup": "https://beta-bridge.simplefin.org", "last_sync": datetime.now().strftime("%Y-%m-%d %H:%M"), "accounts": acc, "errors": []}


def _brokers(st):
    c = brokers.catalog()
    out = []
    for pl in brokers.PLATFORMS:
        q = dict(pl)
        q["connected"] = pl["id"] in st["p"]["brokers"]
        q["last_sync"] = datetime.now().strftime("%Y-%m-%d %H:%M") if q["connected"] else None
        out.append(q)
    return {"platforms": out, "features": c["features"], "checked": c["checked"], "alpaca_live": st["p"]["name"] == "Agent Andy",
            "alpaca_paper": st["p"]["name"] != "Agent Andy", "max_order_usd": 100, "orders": [], "demo": True}


def _insights(st, upbeat):
    p, pos, rng = st["p"], st["pos"], random.Random(st["seed"] + 7)
    stocks = [r["asset"] for r in st["rows"] if r["kind"] == "stock"]
    c = {"bills": pos["bills"], "notes": round(pos["bills"] - 0.6, 2), "treasury_date": (date.today().replace(day=1) - timedelta(days=1)).isoformat(),
         "cpi": pos["cpi"], "cpi_month": (date.today().replace(day=1) - timedelta(days=20)).strftime("%B %Y"),
         "fng": {"value": pos["fng"], "label": "Extreme Fear" if pos["fng"] < 25 else "Fear" if pos["fng"] < 45 else "Neutral" if pos["fng"] < 56 else "Greed" if pos["fng"] < 76 else "Extreme Greed"},
         "holdings": {}, "fred": [], "finnhub": {}}
    for s in stocks[:8]:
        c["holdings"][s] = {"filings": [{"form": f, "date": (date.today() - timedelta(days=rng.randint(3, 80))).isoformat(),
                                         "what": {"10-K": "Annual report", "10-Q": "Quarterly report", "8-K": "Big news filing"}[f],
                                         "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=%s&type=%s" % (s, f)}
                                        for f in rng.sample(["10-Q", "8-K", "10-K"], 2)]}
    if "fred" in p["keys"]:
        c["fred"] = [{"id": i, "label": l, "value": v, "suffix": sfx, "date": date.today().isoformat(), "help": h} for (i, l, _u, sfx, h), v in
                     zip(insights.FRED_SERIES, [round(rng.uniform(3.6, 4.4), 2), round(rng.uniform(3.9, 4.6), 2), pos["curve"], round(rng.uniform(5.8, 6.9), 2),
                                                round(rng.uniform(3.9, 4.6), 1), round(rng.uniform(2.9, 3.4), 2)])]
    if "finnhub" in p["keys"]:
        heads = ["%s raises dividend as revenue grows", "%s beats estimates; shares climb", "Analysts upgrade %s on strong demand", "%s announces buyback", "%s shares slide after guidance cut"]
        for s in stocks[:8]:
            c["finnhub"][s] = {"earnings": {"date": (date.today() + timedelta(days=rng.randint(2, 28))).isoformat(), "when": rng.choice(["before the open", "after the close"]), "eps_est": None},
                               "news": [{"title": h % s, "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=%s" % s, "source": "Demo wire"} for h in rng.sample(heads, 2)]}
            c["holdings"].setdefault(s, {}).update(c["finnhub"][s])
    c["edges"] = insights._edges(c)
    c["needs"] = {"fred": "fred" not in p["keys"], "finnhub": "finnhub" not in p["keys"]}
    c["sources"] = [{"id": i, "name": n, "key": k, "what": w, "url": u} for i, n, k, w, u in insights.SOURCES]
    c["errors"], c["stocks"], c["checked"] = [], stocks, datetime.now().strftime("%b %d, %I:%M %p") + " (simulated)"
    if upbeat:
        for row in c["holdings"].values():
            row["news"] = [n for n in row.get("news", []) if feeds.tone(n["title"]) > -1]
        for e in c["edges"]:
            if e["tone"] == "warn":
                e["tone"] = "tip"
                e["text"] += " Every dollar you set aside still counts. Keep going."
    return c


def _integrations(st):
    d = integrations.catalog()
    have = set(st["p"]["show"]) | set(st["p"]["brokers"]) | ({"simplefin"} if st["p"]["bank"] else set())
    for i in d["items"]:
        i["connected"] = i["id"] in have
        i["demo_highlight"] = i["id"] in st["p"]["show"]
    return d


def _guide(st):
    g = {"brains": [], "default": "agent" if st["p"]["brain"] == "ollama" else st["p"]["brain"], "in_use": st["p"]["brain"],
         "agent_url": st["p"].get("agent_url", ""), "models": {}}
    e = _engines(st["p"])
    for b in ai.BRAIN_GUIDE:
        r = dict(b)
        r["ready"] = bool(e.get(b["id"])) or (b["id"] == "ollama" and st["p"]["brain"] == "ollama")
        g["brains"].append(r)
    return g


def _special(st):
    p, pos = st["p"], st["pos"]
    total = sum(r["now"] for r in st["rows"])
    first = st["nw"][-30]["total"]
    items = [{"emoji": "🎭", "tag": "Demo", "title": "You're touring the shop as %s" % p["name"], "line": p["blurb"],
              "more": "Everything is simulated. Click 🎲 New demo up top to meet someone else."},
             {"emoji": "💼", "tag": "Net worth", "title": "%s, %s%.1f%% this month" % (CHARTMONEY(total), "+" if total >= first else "−", abs(total / first - 1) * 100),
              "line": "Across %d accounts: %s." % (len(st["rows"]), ", ".join(sorted({r["venue"] for r in st["rows"]})[:4])), "more": "Simulated balances."},
             {"emoji": "🛡", "tag": "Safe money", "title": "T-bills %.2f%% vs prices +%.1f%%" % (pos["bills"], pos["cpi"]),
              "line": "Cash in T-bills or a high-yield account is %s inflation." % ("beating" if pos["bills"] > pos["cpi"] else "trailing"), "more": "Simulated Treasury and BLS figures."}]
    return {"items": items, "news": [], "prices": {}, "hub": {}}


def CHARTMONEY(n):
    return "$" + format(round(n), ",")


def _sim_games(st):
    rng = random.Random(st["seed"] + 3)
    games = []
    now = datetime.now(timezone.utc)
    for league, emoji in (("NFL", "🏈"), ("NBA", "🏀"), ("NHL", "🏒")):
        a, b = rng.sample(TEAMS[league], 2)
        h = rng.choice([-180, -150, -130, -115, +105, +120])
        aw = -h + rng.choice([-25, -15, -10, 0]) if h < 0 else -h - rng.choice([10, 20])
        books = {}
        for bk in ("DraftKings", "FanDuel", "BetMGM", "Caesars"):
            books[bk] = {"home": h + rng.choice([-10, -5, 0, 0, 5, 10]), "away": aw + rng.choice([-10, -5, 0, 0, 5, 15])}
            for k in ("home", "away"):
                if -100 < books[bk][k] < 100:
                    books[bk][k] = 100 if books[bk][k] >= 0 else -100
        games.append({"league": league, "emoji": emoji, "sport": "x", "start": (now + timedelta(hours=rng.randint(2, 30))).isoformat(),
                      "home": a, "away": b, "books": books, "spread": "%s %+.1f" % (a, rng.choice([-3.5, -5.5, -1.5])), "total": rng.choice([44.5, 221.5, 6.5]),
                      "source": "Simulated lines (demo)"})
    picks = []
    for g in games:
        try:
            s = sports._suggest(g, int(st["prefs"].get("risk", 3) or 3), 25.0)
        except Exception:
            s = None
        if s:
            picks.append({k: v for k, v in s.items() if not k.startswith("_")})
    return {"games": picks, "sources": ["Simulated demo lines"], "checked": datetime.now().strftime("%I:%M %p")}


def _ask(st, q):
    p = st["p"]
    total = sum(r["now"] for r in st["rows"])
    top = max(st["rows"], key=lambda r: r["now"])
    return {"engine": p["brain"], "model": "demo",
            "answer": ("🎭 Demo answer (simulated, no AI was used): %s's net worth is about %s, mostly %s at %s. "
                       "With a real brain connected (Claude, Gemini, GPT, your own agent or a free one), Hoagie would answer “%s” using today's news "
                       "and these numbers.") % (p["name"], CHARTMONEY(total), top["asset"], top["venue"], q[:120])}


def _context(st):
    p = st["p"]
    lines = ["DEMO DATA (simulated) for %s." % p["name"], "Holdings: " + "; ".join("%s %s at %s = $%s" % (r["amount"], r["asset"], r["venue"], format(round(r["now"]), ","))
                                                                                  for r in st["rows"])]
    m = _costs(st)
    lines.append("Spending this month: $%s; income $%s." % (format(round(m["spent"]), ","), format(round(m["income"]), ",")))
    if st["bets"]:
        b = betmod.board(live=False, items=st["bets"])["summary"]
        lines.append("Bets: %d open, $%s at risk; record %s; profit $%s." % (b["open_count"], b["at_risk"], b["record"], b["profit"]))
    return {"system": ai.HOAGIE_VOICE, "context": "\n".join(lines)}


def _csv(rows, cols):
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    return out.getvalue()


NOTE = {"ok": True, "demo": True, "note": "Demo mode: nothing is saved or connected. Install Constable Hoagie to use your own accounts."}


def route(method, path, q, body, key, remote=False):
    """Answer every API call for a demo session. Unknown calls get a harmless empty answer, never real data."""
    st = get(key)
    if not st:
        raise PermissionError("Demo ended. Start a new one from the sign-in page.")
    prefs.CURRENT.set({"key": "demo:" + key, "name": st["p"]["name"], "role": "demo"})
    one = lambda k, d="": (q.get(k) or [d])[0]
    full = st["prefs"]["menu"] == "full"
    if method == "GET":
        if path == "/api/status":
            return _status(st, remote)
        if path == "/api/me":
            return _me(st)
        if path == "/api/special":
            return _special(st)
        if path == "/api/news":
            try:
                news = feeds.news()                      # public headlines, not personal
            except Exception:
                news = []
            if not full:
                news = [s for s in news if not prefs.BET_TAGS & set(s["tags"])]
            up = prefs.upbeat_on("demo:" + key)
            return {"news": feeds.uplift(news) if up else news, "upbeat": up}
        if path == "/api/portfolio":
            return _portfolio(st)
        if path == "/api/networth":
            try:
                return _networth(st, int(one("days", "30")))
            except ValueError:
                return _networth(st, 30)
        if path == "/api/costs":
            return _costs(st)
        if path == "/api/costs/export.csv":
            return {"__csv__": _csv(st["costs"], ["date", "amount", "category", "note", "source"]), "name": "demo-costs.csv"}
        if path == "/api/bank":
            return _bank(st)
        if path == "/api/brokers":
            return _brokers(st)
        if path == "/api/insights":
            return _insights(st, prefs.upbeat_on("demo:" + key))
        if path == "/api/integrations":
            return _integrations(st)
        if path == "/api/ai/guide":
            return _guide(st)
        if path == "/api/agent/tokens":
            return {"tokens": [{"id": "demo1", "name": "Claude Desktop (MCP)", "scope": "read", "created": "2026-11-01", "last_used": date.today().isoformat()},
                               {"id": "demo2", "name": "iPhone Shortcut", "scope": "log", "created": "2026-11-10", "last_used": date.today().isoformat()}]
                    if st["p"]["name"] == "Agent Andy" else []}
        if path == "/api/bets":
            return betmod.board(live=False, items=st["bets"]) if full else {"off": True}
        if path == "/api/bets/export.csv":
            return {"__csv__": _csv(st["bets"], ["placed", "book", "event", "pick", "market", "odds", "stake", "to_win", "status", "payout", "source"]), "name": "demo-bets.csv"}
        if path == "/api/sleeper":
            return {"user": "demo_frank", "season": str(date.today().year), "week": 12,
                    "leagues": [{"name": "Dynasty Degenerates", "record": "8-3", "points": 112.4, "opp_points": 98.1},
                                {"name": "Office League", "record": "6-5", "points": 87.9, "opp_points": 104.6}]} if st["p"].get("sleeper") else {"leagues": []}
        if path == "/api/lottery/games":
            return {s: {"games": list(v["games"].keys()), "note": v["buy_note"]} for s, v in engine.LOTTERY.items()}
        if path == "/api/give":
            return give.counter()
        if path == "/api/checks":
            return {"checks": [{"name": n, "ok": True, "detail": d, "fix": ""} for n, d in
                               (("Hoagie's engine (Python)", "Demo"), ("Internet", "Online"), ("Claude", "Demo brain"), ("Secure key storage", "Demo: nothing stored"))]}
        if path == "/api/hub":
            return {"connected": bool(st["p"].get("hub")), "picks": []}
        if path == "/api/avatars":
            return {"avatars": []}
        if path == "/api/update/check":
            return {"enabled": False, "current": _version()}
        if path == "/api/update/info":
            return {"version": _version()}
        if path == "/api/email/setup":
            return {"configured": bool(st["p"].get("email")), "provider": "gmail" if st["p"].get("email") else "", "demo": True}
        if path == "/api/ask/context":
            return _context(st)
        return {"demo": True}
    # ---- POST: session-only changes, simulated results
    if path == "/api/me":
        pp = st["prefs"]
        if body.get("menu") in ("money", "full"):
            pp["menu"] = body["menu"]
        if body.get("theme") in ("auto", "original", "neon"):
            pp["theme"] = body["theme"]
        if "upbeat" in body:
            pp["upbeat"] = None if body["upbeat"] is None else bool(body["upbeat"])
        if body.get("dash") == "stock":
            pp["dash"] = {"cards": None}
        elif isinstance(body.get("dash"), dict):
            pp["dash"] = {"cards": [c for c in body["dash"].get("cards", []) if c in prefs.DASH_CARDS]}
        if isinstance(body.get("email"), dict):
            pp["email"].update({k: v for k, v in body["email"].items() if k in pp["email"]})
        return _me(st)
    if path == "/api/play/today":
        try:
            stories = feeds.news()
        except Exception:
            stories = []
        if not full:
            stories = [s for s in stories if not prefs.BET_TAGS & set(s["tags"])]
        out = engine._menu_play(float(body.get("amount") or 25), int(body.get("risk") or 2), stories, {"connected": False})
        out["games"] = _sim_games(st) if full else None
        out["demo"] = True
        return out
    if path == "/api/playbook":
        return engine.playbook(body.get("amount", 25), body.get("risk", 2), body.get("horizons", ["long"]))
    if path == "/api/ask":
        return _ask(st, body.get("question", ""))
    if path.startswith("/api/bets"):
        if path == "/api/bets/add":
            b = betmod.clean(body, body.get("source") if body.get("source") in betmod.SOURCES else "manual")
            st["bets"].append(b)
            return b
        if path == "/api/bets/update":
            for i, x in enumerate(st["bets"]):
                if x["id"] == body.get("id"):
                    ch = body.get("changes") or {}
                    x = dict(x, **{k: v for k, v in ch.items() if k in x})
                    if ch.get("status") == "won":
                        x["payout"] = round(x["stake"] + x["to_win"], 2)
                    elif ch.get("status") in ("push", "void"):
                        x["payout"] = x["stake"]
                    elif ch.get("status") == "lost":
                        x["payout"] = 0
                    x.pop("live", None); x.pop("suggest", None)
                    st["bets"][i] = x
                    return x
            raise ValueError("Bet not found.")
        if path == "/api/bets/delete":
            st["bets"] = [x for x in st["bets"] if x["id"] != body.get("id")]
            return {"ok": True}
        if path == "/api/bets/parse":
            return {"items": betmod.parse_text(body.get("text", ""))}
        if path == "/api/bets/screenshot":
            rng = random.Random()
            a, b = rng.sample(TEAMS["NFL"], 2)
            return {"items": [{"book": "DraftKings", "event": "%s vs %s" % (a, b), "pick": "%s -3.5" % a, "market": "spread", "odds": -110, "stake": 25, "status": "open"}],
                    "demo": "Simulated read: in the real app your AI reads the slip."}
        if path == "/api/bets/import":
            return {"added": 0, "skipped": 0, "note": NOTE["note"]}
        if path == "/api/bets/kalshi":
            return {"positions": sum(1 for x in st["bets"] if x["source"] == "kalshi" and x["status"] == "open")}
        if path == "/api/bets/sleeper":
            return route("GET", "/api/sleeper", {}, {}, key, remote)
    if path == "/api/costs/add":
        e = costmod._clean(body)
        st["costs"].append(e)
        return e
    if path == "/api/costs/delete":
        st["costs"] = [c for c in st["costs"] if c["id"] != body.get("id")]
        return {"ok": True}
    if path == "/api/portfolio/item":
        r = {"id": "u%d" % len(st["rows"]), "venue": body.get("venue") or "Other", "asset": (body.get("asset") or "CASH").upper(),
             "amount": float(body.get("amount") or 0), "cost": float(body.get("cost") or 0), "value": float(body.get("value") or 0)}
        r.update({"now": r["value"] or r["amount"] * PRICES.get(r["asset"], 1), "live": r["asset"] in PRICES, "kind": "other", "gain": None, "linked": False})
        st["rows"].append(r)
        return r
    if path == "/api/portfolio/delete":
        st["rows"] = [r for r in st["rows"] if r["id"] != body.get("id")]
        return {"ok": True}
    if path == "/api/secret":
        return {"ok": True, "has": True, "demo": True}
    if path == "/api/ai/test":
        return {"ok": True, "engine": st["p"]["brain"], "answer": "Hey there! I'm Constable Hoagie. (Demo reply: no AI was called.)", "seconds": 0.4, "model": "demo"}
    if path == "/api/ai/models":
        return {"models": ["demo-model-small", "demo-model-large"]}
    if path in ("/api/ai/setup",):
        return _guide(st)
    if path == "/api/agent/tokens":
        return {"token": "hoagie_demo_" + secrets.token_hex(6), "name": body.get("name") or "My agent", "scope": body.get("scope", "read"),
                "note": "Demo token: it doesn't work anywhere. In the real app this is your agent's key."}
    if path == "/api/clientlog":
        return {"ok": True}
    if path == "/api/tour/ask":
        return tour.ask(body.get("question", ""), body.get("step", ""), owner=not remote, session=key, demo_name=st["p"]["name"])
    return dict(NOTE)
