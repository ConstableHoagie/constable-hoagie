"""Per-person choices: menu (money-only or full), theme, and the daily email.

Each signed-in account has its own; whoever uses the shop on this PC without signing in is "_local".
The server sets CURRENT at the start of every request, so the engine can ask "is betting on for
this person?" without passing the user around.
"""
import contextvars
import copy
import re

from . import store

CURRENT = contextvars.ContextVar("hoagie_me", default=None)

BET_PLAYS = {"sports_core", "dfs_cash"}       # plays that are gambling
BET_TAGS = {"Betting"}                        # news tags hidden in money-only mode

EMAIL_TOPICS = {
    "play": {"label": "Today's Play", "betting": False},
    "markets": {"label": "Markets: prices + money headlines", "betting": False},
    "humanitarian": {"label": "Humanitarian news", "betting": False},
    "give": {"label": "A charity worth knowing", "betting": False},
    "sports": {"label": "Sports headlines", "betting": False},
    "games": {"label": "Today's Games (bet suggestions)", "betting": True},
}
WINDOWS = {12: "Last 12 hours", 24: "Last 24 hours", 72: "Last 3 days", 168: "Last week"}

DEFAULT = {
    "menu": None,          # None = not chosen yet (the shop asks); "money" or "full"
    "theme": "auto",       # "auto" (neon with the full menu, original with money-only), "original" or "neon"
    "upbeat": None,        # None = auto (on for money-only): filter news toward encouraging stories
    "dash": None,          # None = not set up yet; else {"cards": [...]} (the Dashboard counter)
    "intro_seen": False,   # first pass: the welcome cutscene played for this person
    "tour_seen": False,    # first pass: the practice-data tour played for this person
    "ai_asked": False,     # first pass: asked about an AI brain / their own agent
    "bet_view": False,     # money-only feed, but a 🏈 Sports tab with games + the Bet Tracker
    "videos": "",          # personal shorts (e.g. "alison")
    "avatar": "",          # preset character (e.g. "alison")
    "feed": "",            # "bright" = good news, humanitarian progress, upbeat money outlooks, smart-money ideas
    "email": {"on": False, "address": "", "topics": ["play", "markets"], "time": "07:00",
              "days": "daily", "window": 24, "last_sent": ""},
}
EMAIL_RE = re.compile(r"^[^@\s<>\"']{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$")


def me():
    return CURRENT.get() or {"key": "_local", "name": "You"}


def _all():
    return store.load("prefs", {})


DEMO = {}   # demo sessions' simulated prefs, keyed "demo:<session>" (never saved)


def get(key=None):
    key = key or me()["key"]
    if key.startswith("demo:"):
        d = copy.deepcopy(DEFAULT)
        d.update(copy.deepcopy(DEMO.get(key, {})))
        return d
    p = copy.deepcopy(DEFAULT)
    saved = _all().get(key, {})
    p.update({k: v for k, v in saved.items() if k != "email"})
    p["email"].update(saved.get("email", {}))
    return p


# Dashboard cards: id -> (title, needs, menu) ; needs = which connection feeds it ("" = free, no key)
DASH_CARDS = {
    "safe":     ("Safe money vs inflation", "", "all"),
    "networth": ("Net worth trend", "", "all"),
    "costs":    ("This month's spending", "", "all"),
    "filings":  ("Filings for stocks you own (SEC)", "", "all"),
    "mood":     ("Crypto mood (Fear & Greed)", "", "all"),
    "rates":    ("Rates, jobs & gas (FRED)", "fred", "all"),
    "earnings": ("Earnings dates & headlines (Finnhub)", "finnhub", "all"),
    "brokers":  ("Brokerage balances (SnapTrade / direct)", "broker", "all"),
    "bank":     ("Bank balances (SimpleFIN)", "simplefin", "all"),
    "games":    ("Today's Games price edges (The Odds API)", "oddsapi", "full"),
}
DASH_STOCK = ["safe", "networth", "costs", "filings", "mood"]


def dash_cards(p):
    full = p["menu"] == "full"
    ok = [c for c, v in DASH_CARDS.items() if v[2] == "all" or full]
    if p.get("dash") and isinstance(p["dash"].get("cards"), list):
        return [c for c in p["dash"]["cards"] if c in ok]
    return DASH_STOCK + (["games"] if full else [])


def bright_on(key=None):
    return get(key).get("feed") == "bright"


def upbeat_on(key=None):
    p = get(key)
    if p.get("feed") == "bright":
        return True
    return p["menu"] != "full" if p.get("upbeat") is None else bool(p["upbeat"])


def bets_allowed(key=None):
    """Full menu, or a money-only feed with the 🏈 Sports tab switched on."""
    p = get(key)
    return p["menu"] == "full" or bool(p.get("bet_view"))


def admin_set(key, changes):
    """Admin-only per-person switches (Sports tab, personal shorts, preset avatar)."""
    data = _all()
    p = data.setdefault(key, {})
    for f in ("bet_view",):
        if f in changes:
            p[f] = bool(changes[f])
    for f in ("videos", "avatar", "menu", "feed"):
        if f in changes and (f != "menu" or changes[f] in ("money", "full")):
            p[f] = changes[f]
    store.save("prefs", data)
    return get(key)


def betting_on(key=None):
    return get(key)["menu"] == "full"


def update(changes, key=None):
    key = key or me()["key"]
    if key.startswith("demo:"):
        raise PermissionError("Demo mode: nothing is saved.")
    p = get(key)
    if "menu" in changes:
        if changes["menu"] not in ("money", "full"):
            raise ValueError("Pick money-only or the full menu.")
        if changes["menu"] == "full" and not changes.get("age_ok"):
            raise ValueError("Please confirm you're old enough to bet where you live.")
        p["menu"] = changes["menu"]
    if "theme" in changes:
        if changes["theme"] not in ("auto", "original", "neon"):
            raise ValueError("Unknown theme.")
        p["theme"] = changes["theme"]
    if isinstance(changes.get("flags"), dict):
        for f in ("intro_seen", "tour_seen", "ai_asked"):
            if f in changes["flags"]:
                p[f] = bool(changes["flags"][f])
    if "upbeat" in changes:
        p["upbeat"] = None if changes["upbeat"] is None else bool(changes["upbeat"])
    if "dash" in changes:
        d = changes["dash"]
        if d == "stock":
            p["dash"] = {"cards": None, "stock": True}
        elif isinstance(d, dict) and isinstance(d.get("cards"), list):
            p["dash"] = {"cards": [c for c in d["cards"] if c in DASH_CARDS][:12]}
        else:
            raise ValueError("Unknown dashboard choice.")
    e = changes.get("email")
    if isinstance(e, dict):
        em = p["email"]
        if "address" in e:
            addr = str(e["address"]).strip()
            if addr and not EMAIL_RE.match(addr):
                raise ValueError("That email address doesn't look right.")
            em["address"] = addr
        if "on" in e:
            em["on"] = bool(e["on"]) and bool(em["address"])
            if e["on"] and not em["address"]:
                raise ValueError("Add your email address first.")
        if "topics" in e:
            em["topics"] = [t for t in e["topics"] if t in EMAIL_TOPICS][:6]
        if "time" in e:
            if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", str(e["time"])):
                raise ValueError("Pick a time like 07:00.")
            em["time"] = e["time"]
        if "days" in e:
            em["days"] = "weekdays" if e["days"] == "weekdays" else "daily"
        if "window" in e:
            w = int(e["window"])
            em["window"] = w if w in WINDOWS else 24
    data = _all()
    saved = {k: v for k, v in p.items()}
    data[key] = saved
    store.save("prefs", data)
    return p


def mark_sent(key, stamp):
    data = _all()
    data.setdefault(key, {}).setdefault("email", {})["last_sent"] = stamp
    store.save("prefs", data)


def everyone():
    """(key, prefs) for every person who has saved anything."""
    return [(k, get(k)) for k in _all().keys()]


def public(key=None):
    """What the browser needs to know about this person."""
    p = get(key)
    eff = p["theme"] if p["theme"] in ("original", "neon") else ("neon" if p["menu"] == "full" else "original")
    full = p["menu"] == "full"
    return {"menu": p["menu"], "theme": p["theme"], "theme_eff": eff, "betting": full, "email": p["email"],
            "topics": EMAIL_TOPICS, "windows": WINDOWS,
            "upbeat": upbeat_on(key), "upbeat_pref": p.get("upbeat"),
            "intro_seen": bool(p.get("intro_seen")), "tour_seen": bool(p.get("tour_seen")), "ai_asked": bool(p.get("ai_asked")),
            "bet_view": bool(p.get("bet_view")) and not full, "videos": p.get("videos") or "", "avatar": p.get("avatar") or "", "feed": p.get("feed") or "",
            "dash_set": bool(p.get("dash")), "dash": dash_cards(p),
            "dash_all": [{"id": c, "title": v[0], "needs": v[1]} for c, v in DASH_CARDS.items() if v[2] == "all" or full]}
