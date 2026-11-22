"""Today's games and bet suggestions, from free sources.

Sources (both free):
  * ESPN's public scoreboard feed (no key). US leagues + soccer. Usually carries one
    sportsbook's line (often DraftKings) for games that haven't started.
  * The Odds API (free key, 500 credits a month). Many sportsbooks at once, plus cricket.
    Used sparingly: one credit per league per pull, cached for 12 hours, and it stops
    when fewer than 40 credits are left.

Outside US sports are limited to soccer and cricket, as asked.

How a suggestion is made (no magic, and the card says which kind it is):
  * "Price edge": with several sportsbooks, Hoagie strips the books' cut to get a fair
    win chance, then checks whether one book pays MORE than that fair chance is worth.
    That's the only kind of bet with a positive expected return.
  * "Market lean": with one sportsbook, there's no edge to find. Hoagie picks the side
    that fits your risk level (favorites when careful, underdogs when spicy) and shows
    the honest expected return, which is slightly negative (the book's cut).
"""
import json
import logging
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from . import store
from .feeds import UA, http_json

log = logging.getLogger("hoagie")

# label, ESPN sport, ESPN league, Odds API key, emoji
LEAGUES = [
    ("NFL", "football", "nfl", "americanfootball_nfl", "🏈"),
    ("College Football", "football", "college-football", "americanfootball_ncaaf", "🏈"),
    ("NBA", "basketball", "nba", "basketball_nba", "🏀"),
    ("College Hoops", "basketball", "mens-college-basketball", "basketball_ncaab", "🏀"),
    ("WNBA", "basketball", "wnba", "basketball_wnba", "🏀"),
    ("NHL", "hockey", "nhl", "icehockey_nhl", "🏒"),
    ("MLB", "baseball", "mlb", "baseball_mlb", "⚾"),
    ("MLS", "soccer", "usa.1", "soccer_usa_mls", "⚽"),
    ("Premier League", "soccer", "eng.1", "soccer_epl", "⚽"),
    ("Champions League", "soccer", "uefa.champions", "soccer_uefa_champs_league", "⚽"),
    ("La Liga", "soccer", "esp.1", "soccer_spain_la_liga", "⚽"),
    ("Serie A", "soccer", "ita.1", "soccer_italy_serie_a", "⚽"),
    ("Bundesliga", "soccer", "ger.1", "soccer_germany_bundesliga", "⚽"),
]
ODDS_BASE = "https://api.the-odds-api.com/v4"
ODDS_CACHE = 12 * 3600
ODDS_FLOOR = 40          # stop spending credits below this
ODDS_LEAGUES_PER_PULL = 3

# Where you can legally place it. Sources: NH Lottery (DraftKings is NH's only licensed
# sportsbook); Texas has no legal sportsbook (Penal Code 47.02).
WHERE = {
    "NH": {"book": "DraftKings Sportsbook", "link": "https://sportsbook.draftkings.com",
           "rule": "DraftKings is NH's only legal sportsbook. You must be physically in NH (or another legal state) when you place it. 18+ in NH."},
    "TX": {"book": None, "link": None,
           "rule": "Not legal in Texas. Only if you're physically in a state where it's legal (for example Louisiana, Arkansas or Kansas; 21+ there)."},
}
OTHER_STATE = "Only at a sportsbook licensed where you're physically standing. Check that state's rules first."


def where_lines():
    s = store.settings()
    states = [s.get("home_state") or "NH"] + [x for x in (s.get("bet_states") or ["NH", "TX"]) if x != s.get("home_state")]
    out = []
    for st in states:
        w = WHERE.get(st)
        out.append({"state": st, "ok": bool(w and w["book"]), "book": (w or {}).get("book"),
                    "link": (w or {}).get("link"), "text": (w or {}).get("rule", OTHER_STATE)})
    return out


# ---- odds math ----------------------------------------------------------------------------

def dec(american):
    a = float(american)
    return 1 + (a / 100 if a > 0 else 100 / -a)


def fair(prices):
    """Strip the sportsbook's cut: implied chances scaled to add up to 100%."""
    imp = {k: 1 / dec(v) for k, v in prices.items() if v not in (None, "")}
    tot = sum(imp.values())
    return {k: v / tot for k, v in imp.items()} if tot else {}


def american_str(a):
    a = int(round(float(a)))
    return "+%d" % a if a > 0 else str(a)


# ---- ESPN (free, no key) --------------------------------------------------------------------

def _num(x):
    try:
        if isinstance(x, dict):
            x = (x.get("close") or x.get("current") or x.get("open") or {}).get("odds") or x.get("odds")
        return float(str(x).replace("EVEN", "100").replace("+", ""))
    except Exception:
        return None


def _espn_league(label, sport, league, emoji, day):
    ck = "espn-%s-%s" % (league, day)
    cached = store.cache_get(ck, 30 * 60)
    if cached is not None:
        return cached
    url = "https://site.api.espn.com/apis/site/v2/sports/%s/%s/scoreboard?dates=%s" % (sport, league, day)
    games = []
    try:
        d = http_json(url, timeout=10)
    except Exception as e:
        log.info("espn %s failed: %s", league, e)
        return []
    for ev in d.get("events", []):
        try:
            comp = ev["competitions"][0]
            if comp.get("status", {}).get("type", {}).get("state") != "pre":
                continue
            teams = {c["homeAway"]: c["team"].get("displayName") or c["team"].get("name") for c in comp["competitors"]}
            o = (comp.get("odds") or [{}])[0]
            ml = o.get("moneyline") or {}
            home = _num((o.get("homeTeamOdds") or {}).get("moneyLine")) or _num(ml.get("home"))
            away = _num((o.get("awayTeamOdds") or {}).get("moneyLine")) or _num(ml.get("away"))
            draw = _num((o.get("drawOdds") or {}).get("moneyLine")) or _num(ml.get("draw"))
            if home is None or away is None:
                continue
            prices = {"home": home, "away": away}
            if sport == "soccer" and draw is not None:
                prices["draw"] = draw
            games.append({
                "league": label, "emoji": emoji, "sport": sport, "start": ev.get("date"),
                "home": teams.get("home"), "away": teams.get("away"),
                "books": {(o.get("provider") or {}).get("name") or "Sportsbook": prices},
                "spread": o.get("details"), "total": o.get("overUnder"),
                "source": "ESPN scoreboard",
            })
        except Exception:
            continue
    store.cache_put(ck, games)
    return games


# ---- The Odds API (free key, many books, cricket) ---------------------------------------------

def _odds_get(path, **params):
    key = store.get_secret("oddsapi")
    if not key:
        return None, None
    params["apiKey"] = key
    url = "%s/%s?%s" % (ODDS_BASE, path, urllib.parse.urlencode(params))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        left = r.headers.get("x-requests-remaining")
        return json.loads(r.read().decode()), (int(float(left)) if left else None)


def _credits_ok():
    left = store.cache_get("odds-left", 31 * 86400)
    return left is None or left >= ODDS_FLOOR


def _cricket_keys():
    ck = store.cache_get("odds-sports", 24 * 3600)
    if ck is not None:
        return ck
    try:
        d, _ = _odds_get("sports")          # listing sports costs no credits
    except Exception as e:
        log.info("odds sports list failed: %s", e)
        return []
    keys = [(s["key"], s.get("title") or s["key"]) for s in (d or []) if s.get("key", "").startswith("cricket_") and s.get("active")]
    store.cache_put("odds-sports", keys)
    return keys


def _odds_league(key, label, emoji):
    ck = "odds-%s" % key
    cached = store.cache_get(ck, ODDS_CACHE)
    if cached is not None:
        return cached
    if not _credits_ok():
        return []
    try:
        d, left = _odds_get("sports/%s/odds" % key, regions="us,uk", markets="h2h", oddsFormat="american") if "cricket" in key \
            else _odds_get("sports/%s/odds" % key, regions="us", markets="h2h", oddsFormat="american")
    except Exception as e:
        log.info("odds %s failed: %s", key, e)
        return []
    if left is not None:
        store.cache_put("odds-left", left)
    games, soon = [], datetime.now(timezone.utc) + timedelta(hours=36)
    for ev in d or []:
        try:
            start = datetime.fromisoformat(ev["commence_time"].replace("Z", "+00:00"))
            if start > soon or start < datetime.now(timezone.utc):
                continue
            books = {}
            for b in ev.get("bookmakers", []):
                mk = next((m for m in b.get("markets", []) if m["key"] == "h2h"), None)
                if not mk:
                    continue
                p = {}
                for oc in mk["outcomes"]:
                    side = "home" if oc["name"] == ev["home_team"] else "away" if oc["name"] == ev["away_team"] else "draw"
                    p[side] = oc["price"]
                if "home" in p and "away" in p:
                    books[b.get("title") or b.get("key")] = p
            if books:
                games.append({"league": label, "emoji": emoji, "sport": "cricket" if "cricket" in key else key.split("_")[0],
                              "start": ev["commence_time"], "home": ev["home_team"], "away": ev["away_team"],
                              "books": books, "source": "The Odds API (%d sportsbooks)" % len(books)})
        except Exception:
            continue
    store.cache_put(ck, games)
    return games


# ---- picking ----------------------------------------------------------------------------------

UNIT = {1: 0.05, 2: 0.10, 3: 0.15, 4: 0.20, 5: 0.25}   # share of the daily budget per bet
TARGET = {1: (0.62, 0.80), 2: (0.58, 0.75), 3: (0.48, 0.62), 4: (0.36, 0.50), 5: (0.28, 0.45)}


def _team(g, side):
    return {"home": g["home"], "away": g["away"], "draw": "Draw"}[side]


def _suggest(g, risk, budget):
    books = g["books"]
    fairs = [fair(p) for p in books.values()]
    sides = list(fairs[0].keys())
    p_fair = {s: sum(f.get(s, 0) for f in fairs) / len(fairs) for s in sides}
    # Only count prices you can actually take: in NH that's DraftKings alone.
    book = (WHERE.get(store.settings().get("home_state") or "NH") or {}).get("book") or ""
    usable = {b: p for b, p in books.items() if book and book.split()[0].lower() in b.lower()} or books
    best = {}
    for s in sides:
        bk, pr = max(((b, p[s]) for b, p in usable.items() if p.get(s) is not None), key=lambda x: dec(x[1]))
        best[s] = (bk, pr, p_fair[s] * dec(pr) - 1)
    stake = max(1.0, round(budget * UNIT.get(risk, 0.1)))
    value = [s for s in sides if len(books) >= 3 and best[s][2] > 0.01 and 0.2 < p_fair[s] < 0.85]
    if value:
        side = max(value, key=lambda s: best[s][2])
        basis = "Price edge"
        why = ("%s pays %s, better than the %d-sportsbook average says %s is worth. "
               "That gap is the edge; it's small and it can still lose." % (best[side][0], american_str(best[side][1]), len(books), _team(g, side)))
    else:
        lo, hi = TARGET.get(risk, (0.5, 0.7))
        mid = (lo + hi) / 2
        side = min((s for s in sides if s != "draw"), key=lambda s: abs(p_fair[s] - mid))
        if not (lo - 0.08 <= p_fair[side] <= hi + 0.08):
            return None
        basis = "Market lean"
        why = ("No sportsbook is paying above the fair price, so there's no edge here. "
               "This is the side the market gives about a %.0f%% chance, which fits risk level %d." % (p_fair[side] * 100, risk))
    bk, pr, ev = best[side]
    d = dec(pr)
    p = p_fair[side]
    word = "High" if p >= 0.65 else "Medium" if p >= 0.5 else "Low"
    try:
        start = datetime.fromisoformat(g["start"].replace("Z", "+00:00"))
        start_label = start.astimezone().strftime("%a %I:%M %p").replace(" 0", " ")
    except Exception:
        start, start_label = None, ""
    pick = _team(g, side)
    play = ("%s to win (moneyline) vs %s" % (pick, g["away"] if side == "home" else g["home"])) if side != "draw" \
        else "Draw: %s vs %s ends level" % (g["away"], g["home"])
    return {
        "kind": "game", "league": g["league"], "emoji": g["emoji"],
        "matchup": "%s at %s" % (g["away"], g["home"]), "start": g["start"], "start_label": start_label,
        "play": play, "price": american_str(pr), "book": bk,
        "book_note": "" if not book or book.split()[0].lower() in bk.lower() else "Price is from %s. Check %s's price before you bet." % (bk, book.split()[0]), "basis": basis, "why": why,
        "where": where_lines(), "bet": stake,
        "if_win": round(stake * (d - 1), 2), "if_lose": -stake, "expected": round(stake * ev, 2), "ev_pct": round(ev * 100, 1),
        "confidence_pct": round(p * 100), "confidence": word,
        "spread": g.get("spread"), "total": g.get("total"),
        "skip_if": "the price drops below %s, or a key player is ruled out before the game." % american_str(pr),
        "source": g["source"], "_ev": ev, "_fit": abs(p - sum(TARGET.get(risk, (0.5, 0.7))) / 2),
    }


def suggestions(risk=2, budget=25, limit=5):
    """Up to `limit` game bets for the next ~36 hours. Never raises."""
    now = datetime.now()
    days = [now.strftime("%Y%m%d"), (now + timedelta(days=1)).strftime("%Y%m%d")]
    games, errors = [], 0
    for label, sport, league, _key, emoji in LEAGUES:
        for day in days:
            try:
                games += _espn_league(label, sport, league, emoji, day)
            except Exception:
                errors += 1
    # Line-shop the busiest leagues and add cricket, if there's a free Odds API key.
    sources = ["ESPN scoreboard (free)"]
    if store.get_secret("oddsapi"):
        busy = {}
        for g in games:
            busy[g["league"]] = busy.get(g["league"], 0) + 1
        pulls = [l for l in LEAGUES if l[0] in busy]
        pulls.sort(key=lambda l: -busy[l[0]])
        multi = []
        for label, _s, _l, key, emoji in pulls[:ODDS_LEAGUES_PER_PULL]:
            multi += _odds_league(key, label, emoji)
        for key, title in _cricket_keys()[:2]:
            multi += _odds_league(key, title, "🏏")
        uniq = {}
        for m in multi:                    # the same game can show up twice; keep the fuller one
            k = (m["home"], m["away"])
            if k not in uniq or len(m["books"]) > len(uniq[k]["books"]):
                uniq[k] = m
        multi = list(uniq.values())
        if multi:
            sources.append("The Odds API (free key)")
            seen = {(m["home"], m["away"]) for m in multi}
            games = [g for g in games if (g["home"], g["away"]) not in seen] + multi
    else:
        sources.append("add a free Odds API key at the Connect counter for cricket and price-edge picks")
    soon = datetime.now(timezone.utc) + timedelta(hours=36)
    picks = []
    for g in games:
        try:
            st = datetime.fromisoformat(g["start"].replace("Z", "+00:00"))
            if st > soon:
                continue
        except Exception:
            pass
        s = _suggest(g, int(risk), float(budget))
        if s:
            picks.append(s)
    picks.sort(key=lambda s: (s["basis"] != "Price edge", -s["_ev"] if s["basis"] == "Price edge" else s["_fit"]))
    out, per_league = [], {}
    for s in picks:                       # variety: at most 2 per league
        if per_league.get(s["league"], 0) >= 2:
            continue
        per_league[s["league"]] = per_league.get(s["league"], 0) + 1
        out.append({k: v for k, v in s.items() if not k.startswith("_")})
        if len(out) >= limit:
            break
    return {"games": out, "sources": sources, "checked": len(games),
            "credits_left": store.cache_get("odds-left", 31 * 86400)}
