"""Bet Tracker: every open and settled bet in one place (full menu only).

Bets come from: typing or pasting a bet slip, a screenshot of any sportsbook/DFS app, a CSV export
(Pikkit Pro, Juice Reel, spreadsheets), Today's Play / the sports desk, Kalshi (prediction markets, API),
your own AI agent (Agent API / MCP), and webhooks (Zapier, IFTTT, iPhone Shortcuts).
Live scores come from ESPN's free scoreboard. Hoagie never places a bet at a sportsbook.
"""
import base64
import csv
import io
import re
import time
import uuid
from datetime import datetime, timedelta

from . import ai, prefs, store
from .feeds import http_json

log = store.log

STATUSES = ("open", "won", "lost", "push", "void", "cashed")
MARKETS = ("moneyline", "spread", "total", "prop", "parlay", "future", "prediction", "dfs", "other")
BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet", "theScore", "Fanatics", "BetRivers", "Hard Rock", "bet365",
         "PrizePicks", "Underdog", "Sleeper", "Kalshi", "Polymarket", "Fliff", "Novig", "Bovada", "Pinnacle", "Other"]
SOURCES = {"manual": "Typed in", "text": "Pasted slip", "screenshot": "Screenshot", "csv": "CSV import", "kalshi": "Kalshi API",
           "today_play": "Today's Play", "hub": "Sports desk", "agent": "Your AI agent", "webhook": "Webhook / Shortcut"}


def _key():
    return "bets-" + prefs.me()["key"].replace(":", "-")


def _load():
    return store.load(_key(), {"items": []})


def _save(d):
    store.save(_key(), d)


def to_win(stake, odds):
    try:
        o, s = float(odds), float(stake)
    except (TypeError, ValueError):
        return 0.0
    if o >= 100:
        return round(s * o / 100, 2)
    if o <= -100:
        return round(s * 100 / -o, 2)
    if 1 < o < 100:                     # decimal odds (e.g. 1.91)
        return round(s * (o - 1), 2)
    return 0.0


def clean(b, source="manual"):
    odds = b.get("odds")
    try:
        f = float(str(odds).replace("+", "")) if odds not in (None, "") else None
        if f is not None and 1 < f < 100 and f != int(f) or (f is not None and 1 < f < 30 and f == int(f) and str(odds).count(".")):
            f = (f - 1) * 100 if f >= 2 else -100 / (f - 1)      # decimal odds -> American
        odds = int(round(f)) if f is not None and abs(f) >= 100 else None
    except ValueError:
        odds = None
    stake = round(float(b.get("stake") or 0), 2)
    out = {
        "id": b.get("id") or uuid.uuid4().hex[:10],
        "placed": str(b.get("placed") or time.strftime("%Y-%m-%d"))[:10],
        "book": str(b.get("book") or "Other")[:30],
        "sport": str(b.get("sport") or "")[:30],
        "event": str(b.get("event") or "")[:120],
        "pick": str(b.get("pick") or "")[:160],
        "market": b.get("market") if b.get("market") in MARKETS else guess_market(str(b.get("pick", ""))),
        "odds": odds,
        "stake": stake,
        "to_win": round(float(b.get("to_win") or 0), 2) or to_win(stake, odds),
        "status": b.get("status") if b.get("status") in STATUSES else "open",
        "payout": round(float(b.get("payout") or 0), 2),
        "game_time": str(b.get("game_time") or "")[:25],
        "source": b.get("source") if b.get("source") in SOURCES else source,
        "notes": str(b.get("notes") or "")[:300],
        "ext_id": str(b.get("ext_id") or "")[:80],
    }
    if not out["pick"] and not out["event"]:
        raise ValueError("A bet needs at least a pick (what you bet on).")
    return out


def guess_market(t):
    t = t.lower()
    if re.search(r"\bparlay|\bsgp\b|\b\d+-leg", t):
        return "parlay"
    if re.search(r"\b(over|under)\b|\b[ou]\s?\d+(\.\d)?\b", t):
        return "total"
    if re.search(r"\b(pts|points|rebounds|reb|assists|ast|yards|yds|tds?|touchdown|strikeouts|hits|shots|goals?|anytime)\b", t):
        return "prop"
    if re.search(r"\b(ml|moneyline|to win)\b", t):
        return "moneyline"
    if re.search(r"[a-z][a-z .']+\s[+-]\d{1,2}(\.5)?\b", t):
        return "spread"
    if re.search(r"\b(yes|no)\b.*\b(kalshi|polymarket)\b|\bwill\b", t):
        return "prediction"
    if re.search(r"\b(mvp|champion|futures?|win the)\b", t):
        return "future"
    return "other"


# ---- add / change ------------------------------------------------------------------------------

def add(b, source="manual"):
    d = _load()
    item = clean(b, source)
    if item["ext_id"] and any(x.get("ext_id") == item["ext_id"] for x in d["items"]):
        return next(x for x in d["items"] if x.get("ext_id") == item["ext_id"])
    d["items"].append(item)
    _save(d)
    return item


def update(bid, changes):
    d = _load()
    for i, x in enumerate(d["items"]):
        if x["id"] == bid:
            merged = dict(x, **{k: v for k, v in changes.items() if k in x and k != "id"})
            if "stake" in changes or "odds" in changes:
                merged["to_win"] = to_win(merged["stake"], merged["odds"])
            if changes.get("status") == "won" and not changes.get("payout"):
                merged["payout"] = round(merged["stake"] + merged["to_win"], 2)
            if changes.get("status") in ("push", "void") and not changes.get("payout"):
                merged["payout"] = merged["stake"]
            if changes.get("status") == "lost":
                merged["payout"] = 0
            d["items"][i] = clean(merged, x["source"])
            _save(d)
            return d["items"][i]
    raise ValueError("Bet not found.")


def delete(bid):
    d = _load()
    d["items"] = [x for x in d["items"] if x["id"] != bid]
    _save(d)


# ---- reading slips: text, screenshots, CSV -------------------------------------------------------

_ODDS = re.compile(r"(?<![\d.])([+-]\d{3,4})(?![\d.])")
_STAKE = re.compile(r"(?:\$\s?(\d+(?:\.\d{1,2})?)|(?:risk|stake|wager|bet)\s*:?\s*\$?(\d+(?:\.\d{1,2})?))", re.I)


def parse_text(text):
    """Turn pasted lines like 'Lakers -3.5 -110 $20 DraftKings' into bets. One bet per line."""
    out = []
    for line in [l.strip() for l in (text or "").splitlines() if l.strip()][:30]:
        o = _ODDS.search(line)
        s = _STAKE.search(line)
        book = next((bk for bk in BOOKS if bk.lower() in line.lower()), "")
        pick = line
        for m in (o, s):
            if m:
                pick = pick.replace(m.group(0), " ")
        if book:
            pick = re.sub(re.escape(book), " ", pick, flags=re.I)
        pick = re.sub(r"\s{2,}", " ", pick).strip(" -,@|")
        if len(pick) < 3:
            continue
        out.append({"pick": pick, "odds": int(o.group(1)) if o else None,
                    "stake": float(s.group(1) or s.group(2)) if s else 0, "book": book or "Other",
                    "market": guess_market(line), "confident": bool(o and s)})
    return out


SLIP_PROMPT = (
    "Read the sportsbook / DFS / prediction-market bet slip in {path}. List every bet you can see. "
    "Reply with only JSON: [{\"book\": \"...\", \"sport\": \"...\", \"event\": \"Team A vs Team B\", \"pick\": \"what was bet\", "
    "\"market\": \"moneyline|spread|total|prop|parlay|future|prediction|dfs|other\", \"odds\": American odds integer or null, "
    "\"stake\": number, \"to_win\": number or 0, \"status\": \"open|won|lost|push|void|cashed\", \"game_time\": \"ISO time or ''\"}]"
)


def read_text_ai(text):
    raw = ai.complete(SLIP_PROMPT.replace("in {path}", "below") + "\n\nSlip text:\n" + text[:6000],
                      system="You extract bets from betting slips precisely and reply with JSON only.")
    items = ai.json_from(raw)
    return items.get("bets", items.get("items", [])) if isinstance(items, dict) else items


def read_screenshot(data_url):
    m = re.match(r"data:image/(png|jpe?g|webp);base64,(.+)", data_url or "", re.S)
    if not m:
        raise ValueError("That doesn't look like an image.")
    ext = "jpg" if m.group(1).startswith("jp") else m.group(1)
    path = store.DATA / "uploads" / ("slip-%s.%s" % (time.strftime("%Y%m%d-%H%M%S"), ext))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(base64.b64decode(m.group(2)))
    raw = ai.read_image(data_url, path, SLIP_PROMPT)
    items = ai.json_from(raw)
    if isinstance(items, dict):
        items = items.get("bets", items.get("items", []))
    return items[:20]


def import_csv(text):
    """Bet exports from Pikkit Pro, Juice Reel, Action, or any spreadsheet. Columns are matched by name."""
    rows = list(csv.DictReader(io.StringIO(text.lstrip("﻿"))))
    if not rows:
        raise ValueError("No rows found in that file.")
    cols = {c.lower().strip(): c for c in rows[0].keys() if c}

    def col(*names):
        for n in names:
            for lc, orig in cols.items():
                if n in lc:
                    return orig
        return None
    c = {"placed": col("placed", "date", "time_placed", "created"), "book": col("sportsbook", "book", "site"),
         "sport": col("sport", "league"), "event": col("event", "game", "match"), "pick": col("pick", "selection", "bet_info", "description", "bet"),
         "odds": col("odds", "price"), "stake": col("stake", "amount", "risk", "wager"), "to_win": col("to_win", "potential", "to win"),
         "status": col("status", "result", "outcome"), "payout": col("payout", "return", "profit")}
    if not c["pick"]:
        raise ValueError("Couldn't find a column for the pick (selection/description).")
    added = skipped = 0
    have = {(x["placed"], x["pick"], x["stake"]) for x in _load()["items"]}
    for r in rows[:2000]:
        g = lambda k: (r.get(c[k]) or "").strip() if c[k] else ""
        st = g("status").lower()
        status = "won" if st.startswith(("w", "settled_win")) else "lost" if st.startswith(("l", "settled_loss")) else \
            "push" if st.startswith("p") else "void" if st.startswith(("v", "c")) and "cash" not in st else "cashed" if "cash" in st else "open"
        try:
            b = clean({"placed": g("placed")[:10], "book": g("book"), "sport": g("sport"), "event": g("event"), "pick": g("pick"),
                       "odds": g("odds") or None, "stake": re.sub(r"[^\d.]", "", g("stake")) or 0,
                       "to_win": re.sub(r"[^\d.]", "", g("to_win")) or 0, "status": status,
                       "payout": re.sub(r"[^\d.]", "", g("payout")) or 0}, "csv")
        except ValueError:
            skipped += 1
            continue
        if (b["placed"], b["pick"], b["stake"]) in have:
            skipped += 1
            continue
        d = _load(); d["items"].append(b); _save(d)
        have.add((b["placed"], b["pick"], b["stake"]))
        added += 1
    return {"added": added, "skipped": skipped}


# ---- live scores (ESPN, free) --------------------------------------------------------------------

LIVE_LEAGUES = [("football", "nfl"), ("football", "college-football"), ("basketball", "nba"), ("basketball", "mens-college-basketball"),
                ("basketball", "wnba"), ("hockey", "nhl"), ("baseball", "mlb"), ("soccer", "usa.1"), ("soccer", "eng.1")]


def _scoreboard(sport, league):
    ck = "live-%s-%s" % (league, time.strftime("%Y%m%d"))
    hit = store.cache_get(ck, 60)
    if hit is not None:
        return hit
    games = []
    try:
        d = http_json("https://site.api.espn.com/apis/site/v2/sports/%s/%s/scoreboard" % (sport, league), timeout=8)
        for ev in d.get("events", []):
            comp = ev["competitions"][0]
            st = comp.get("status", {}).get("type", {})
            teams = []
            for t in comp["competitors"]:
                tm = t.get("team", {})
                teams.append({"name": tm.get("displayName", ""), "short": tm.get("shortDisplayName", ""), "abbr": tm.get("abbreviation", ""),
                              "score": t.get("score"), "home": t.get("homeAway") == "home", "winner": t.get("winner")})
            games.append({"league": league, "state": st.get("state"), "detail": st.get("shortDetail") or st.get("detail", ""),
                          "start": ev.get("date"), "teams": teams})
    except Exception as e:
        log.info("live scoreboard %s failed: %s", league, e)
    store.cache_put(ck, games)
    return games


def _words(t):
    return set(re.findall(r"[a-z]{3,}", t.lower())) - {"the", "over", "under", "and", "win", "spread", "total", "points", "game"}


def _match(bet, games):
    words = _words(bet["pick"] + " " + bet["event"])
    best, score = None, 0
    for g in games:
        n = sum(1 for t in g["teams"] if (_words(t["short"]) | {t["abbr"].lower()}) & words)
        if n > score:
            best, score = g, n
    return best if score else None


def _suggest(bet, g):
    """When a game is final, suggest a result for simple moneyline / spread / total bets (you confirm)."""
    if g["state"] != "post" or bet["market"] not in ("moneyline", "spread", "total"):
        return None
    try:
        a, b = g["teams"]
        sa, sb = float(a["score"]), float(b["score"])
    except Exception:
        return None
    p = bet["pick"].lower()
    if bet["market"] == "total":
        m = re.search(r"\b(over|under|o|u)\s?(\d+(\.\d)?)", p)
        if not m:
            return None
        line, tot = float(m.group(2)), sa + sb
        if tot == line:
            return "push"
        return "won" if (tot > line) == m.group(1).startswith("o") else "lost"
    side = next((t for t in (a, b) if (_words(t["short"]) | {t["abbr"].lower()}) & _words(p)), None)
    if not side:
        return None
    mine, theirs = (sa, sb) if side is a else (sb, sa)
    spread = 0.0
    if bet["market"] == "spread":
        m = re.search(r"([+-]\d{1,2}(\.5)?)\b", p.replace(str(bet.get("odds") or "~"), ""))
        if not m:
            return None
        spread = float(m.group(1))
    diff = mine + spread - theirs
    return "push" if diff == 0 else ("won" if diff > 0 else "lost")


def timeline(items):
    """Running totals by day: how many bets, dollars wagered, and dollars back (paid out + still possible)."""
    by = {}
    for x in items:
        d = by.setdefault(x["placed"], {"bets": 0, "staked": 0.0, "potential": 0.0})
        d["bets"] += 1
        d["staked"] += x["stake"]
        d["potential"] += (x["stake"] + x["to_win"]) if x["status"] == "open" else x["payout"]
    out, n, st, po = [], 0, 0.0, 0.0
    for day in sorted(by):
        n += by[day]["bets"]; st += by[day]["staked"]; po += by[day]["potential"]
        out.append({"date": day, "day_bets": by[day]["bets"], "bets": n, "staked": round(st, 2), "potential": round(po, 2)})
    return out[-120:]


def board(live=True, items=None):
    items = sorted(items if items is not None else _load()["items"], key=lambda x: (x["status"] != "open", x["placed"]), reverse=False)
    open_ = [x for x in items if x["status"] == "open"]
    if live and open_:
        games = []
        for sport, league in LIVE_LEAGUES:
            games += _scoreboard(sport, league)
        for b in open_:
            g = _match(b, games)
            if g:
                b["live"] = {"detail": g["detail"], "state": g["state"],
                             "score": " · ".join("%s %s" % (t["abbr"] or t["short"], t["score"] if t["score"] is not None else "") for t in g["teams"])}
                b["suggest"] = _suggest(b, g)
    settled = [x for x in items if x["status"] != "open"]
    staked = sum(x["stake"] for x in settled if x["status"] not in ("void",))
    returned = sum(x["payout"] for x in settled if x["status"] not in ("void",))
    wins = sum(1 for x in settled if x["status"] == "won")
    losses = sum(1 for x in settled if x["status"] == "lost")
    return {
        "open": open_, "settled": list(reversed(settled))[:200],
        "summary": {"open_count": len(open_), "at_risk": round(sum(x["stake"] for x in open_), 2),
                    "could_win": round(sum(x["to_win"] for x in open_), 2),
                    "profit": round(returned - staked, 2), "roi": round((returned - staked) / staked * 100, 1) if staked else None,
                    "record": "%d-%d" % (wins, losses), "win_rate": round(wins / (wins + losses) * 100) if wins + losses else None},
        "timeline": timeline(items),
        "total_bets": len(items), "total_staked": round(sum(x["stake"] for x in items), 2),
        "books": BOOKS, "markets": MARKETS, "sources": SOURCES,
        "kalshi": store.has_secret("kalshi_key_id") and store.has_secret("kalshi_private_key"),
        "sleeper_user": store.settings().get("sleeper_user", ""),
    }


def export_csv():
    out = io.StringIO()
    cols = ["placed", "book", "sport", "event", "pick", "market", "odds", "stake", "to_win", "status", "payout", "source", "notes"]
    w = csv.DictWriter(out, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for x in _load()["items"]:
        w.writerow(x)
    return out.getvalue()


# ---- Kalshi (CFTC-regulated prediction markets; official API, read-only here) ---------------------

KALSHI_BASE = "https://external-api.kalshi.com"
KALSHI_PATH = "/trade-api/v2"


def _kalshi_headers(method, path):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519, padding, rsa
    key_id = store.get_secret("kalshi_key_id")
    pem = store.get_secret("kalshi_private_key")
    if not key_id or not pem:
        raise RuntimeError("Add your Kalshi API key ID and private key first.")
    pk = serialization.load_pem_private_key(pem.encode(), password=None)
    ts = str(int(time.time() * 1000))
    msg = (ts + method + path.split("?")[0]).encode()
    if isinstance(pk, ed25519.Ed25519PrivateKey):
        sig = pk.sign(msg)
    elif isinstance(pk, rsa.RSAPrivateKey):
        sig = pk.sign(msg, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH), hashes.SHA256())
    else:
        raise RuntimeError("Kalshi keys are RSA or Ed25519 PEM files.")
    return {"KALSHI-ACCESS-KEY": key_id, "KALSHI-ACCESS-TIMESTAMP": ts, "KALSHI-ACCESS-SIGNATURE": base64.b64encode(sig).decode()}


def _kalshi_get(endpoint):
    path = KALSHI_PATH + endpoint
    return http_json(KALSHI_BASE + path, headers=_kalshi_headers("GET", path))


def kalshi_sync():
    """Open Kalshi positions become open bets; your cash balance goes to My Tab."""
    pos = _kalshi_get("/portfolio/positions?count_filter=position&limit=200")
    n = 0
    for p in pos.get("market_positions", []):
        qty = p.get("position") or p.get("position_fp") or 0
        try:
            qty = float(qty)
        except (TypeError, ValueError):
            qty = 0
        if not qty:
            continue
        exposure = p.get("market_exposure_dollars") or (p.get("market_exposure", 0) / 100.0)
        add({"book": "Kalshi", "market": "prediction", "pick": "%s %s x%d" % (p.get("ticker", ""), "YES" if qty > 0 else "NO", abs(qty)),
             "event": p.get("ticker", ""), "stake": float(exposure or 0), "to_win": max(0.0, abs(qty) * 1.0 - float(exposure or 0)),
             "ext_id": "kalshi-" + p.get("ticker", ""), "notes": "Synced from Kalshi"}, "kalshi")
        n += 1
    try:
        bal = _kalshi_get("/portfolio/balance")
        cash = float(bal.get("balance_dollars") or bal.get("balance", 0) / 100.0)
        linked = store.load("linked", {"rows": []})
        linked["rows"] = [r for r in linked["rows"] if r.get("id") != "kalshi-cash"] + [
            {"id": "kalshi-cash", "venue": "Kalshi", "asset": "USD", "amount": cash, "value": cash, "cost": 0, "fixed": True, "hint": "cash"}]
        store.save("linked", linked)
    except Exception as e:
        log.info("kalshi balance failed: %s", e)
    return {"positions": n}


# ---- Sleeper (fantasy; free, read-only, no key) ------------------------------------------------

def sleeper(username=None):
    u = (username or store.settings().get("sleeper_user") or "").strip()
    if not u:
        return {"leagues": []}
    ck = "sleeper-" + re.sub(r"[^a-z0-9_]", "", u.lower())
    hit = store.cache_get(ck, 15 * 60)
    if hit is not None:
        return hit
    base = "https://api.sleeper.app/v1"
    user = http_json("%s/user/%s" % (base, u))
    if not user or not user.get("user_id"):
        raise ValueError("No Sleeper user called %s." % u)
    state = http_json(base + "/state/nfl")
    season, week = state.get("season"), state.get("display_week") or state.get("week") or 1
    out = {"user": user.get("display_name"), "season": season, "week": week, "leagues": []}
    for lg in http_json("%s/user/%s/leagues/nfl/%s" % (base, user["user_id"], season))[:6]:
        try:
            rosters = http_json("%s/league/%s/rosters" % (base, lg["league_id"]))
            mine = next((r for r in rosters if r.get("owner_id") == user["user_id"]), None)
            if not mine:
                continue
            ups = http_json("%s/league/%s/matchups/%s" % (base, lg["league_id"], week))
            me = next((m for m in ups if m.get("roster_id") == mine["roster_id"]), {})
            opp = next((m for m in ups if m.get("matchup_id") and m.get("matchup_id") == me.get("matchup_id") and m.get("roster_id") != mine["roster_id"]), {})
            st = mine.get("settings", {})
            out["leagues"].append({"name": lg.get("name"), "record": "%s-%s" % (st.get("wins", 0), st.get("losses", 0)),
                                   "points": me.get("points"), "opp_points": opp.get("points")})
        except Exception as e:
            log.info("sleeper league failed: %s", e)
    store.cache_put(ck, out)
    return out
