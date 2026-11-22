"""Gathering: news headlines (one story, many tags), prices, the Gambling hub, FantasyPros.

Everything here is read-only and cached, so the app is quick and stays inside API limits
(FantasyPros allows 100 calls a day).
"""
import csv
import html
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import store

log = store.log
UA = "ConstableHoagie/1.0 (+personal dashboard)"


def http_get(url, headers=None, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def http_json(url, headers=None, data=None, timeout=20):
    h = {"User-Agent": UA, "Accept": "application/json", **(headers or {})}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, headers=h, data=body)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


# ---- news -------------------------------------------------------------------------------

# Words that tie a story to a category. A story gets every tag it matches, so one item can
# be NFL + Stocks (say, a sportsbook company's earnings) and is shown once.
TAG_WORDS = {
    "NFL": r"\bnfl\b|quarterback|touchdown|super bowl|\bqb\b",
    "NHL": r"\bnhl\b|hockey|goalie|stanley cup",
    "NBA": r"\bnba\b|basketball",
    "Betting": r"sportsbook|betting|odds|draftkings|fanduel|wager|spread",
    "Crypto": r"bitcoin|\bbtc\b|ethereum|crypto|coinbase|stablecoin|\betf\b.*bitcoin",
    "Stocks": r"stock|shares|nasdaq|s&p|dow|earnings|ipo|wall street|fed\b|federal reserve",
    "Humanitarian": r"humanitarian|refugee|famine|displaced|ocha\b|unicef|world food programme|\bwfp\b|cholera|aid workers?|relief (effort|agenc|work)|earthquake|cyclone|flood(s|ing)?\b",
    "FX": r"dollar|\busd\b|\bcad\b|loonie|euro|yen|forex|currency|exchange rate|bank of canada|rate cut|rate hike|inflation|cpi",
}
HIGH_IMPACT = r"rate (cut|hike|decision)|federal reserve|fomc|cpi|inflation|jobs report|ruled out|out for the season|injur|suspend|crash|plunge|soar|surge|record high|bankrupt|sec\b|lawsuit|ban"


def _text(el, name):
    x = el.find(name)
    return (x.text or "").strip() if x is not None and x.text else ""


def _clean(s):
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    return re.sub(r"\s+", " ", s).strip()


def _fetch_feed(feed):
    try:
        raw = http_get(feed["url"])
        root = ET.fromstring(raw)
    except Exception as e:
        log.info("feed %s failed: %s", feed.get("name"), e)
        return []
    items = []
    for it in root.iter("item"):
        title = _clean(_text(it, "title"))
        if not title:
            continue
        items.append({
            "title": title,
            "link": _text(it, "link"),
            "summary": _clean(_text(it, "description"))[:280],
            "source": feed.get("name", ""),
            "seed_tags": feed.get("tags", []),
            "published": _text(it, "pubDate"),
        })
    for it in root.iter("{http://www.w3.org/2005/Atom}entry"):
        title = _clean(_text(it, "{http://www.w3.org/2005/Atom}title"))
        link_el = it.find("{http://www.w3.org/2005/Atom}link")
        items.append({
            "title": title,
            "link": link_el.get("href") if link_el is not None else "",
            "summary": _clean(_text(it, "{http://www.w3.org/2005/Atom}summary"))[:280],
            "source": feed.get("name", ""),
            "seed_tags": feed.get("tags", []),
            "published": _text(it, "{http://www.w3.org/2005/Atom}updated"),
        })
    return items[:25]


def _norm_title(t):
    return " ".join(sorted(set(re.findall(r"[a-z0-9]{4,}", t.lower()))))


# Always included (on top of the feeds in settings), so older installs get them too.
BUILTIN_FEEDS = [
    {"name": "Good News Network", "url": "https://www.goodnewsnetwork.org/feed/", "tags": ["Good news"]},
    {"name": "Positive News", "url": "https://www.positive.news/feed/", "tags": ["Good news"]},
    {"name": "ReliefWeb (UN OCHA)", "url": "https://reliefweb.int/headlines/rss.xml", "tags": ["Humanitarian"]},
    {"name": "The New Humanitarian", "url": "https://www.thenewhumanitarian.org/rss/all.xml", "tags": ["Humanitarian"]},
    {"name": "NPR: humanitarian groups", "url": "https://feeds.npr.org/617590380/rss.xml", "tags": ["Humanitarian"]},
]


NEG_WORDS = re.compile(r"\b(crash\w*|plung\w+|plummet\w*|collaps\w+|tumbl\w+|slump\w*|sell-?offs?|panic\w*|fears?|recession\w*|bankrupt\w*|"
                       r"layoffs?|laid off|fraud\w*|scams?|defaults?|crisis|turmoil|rout\w*|bloodbath|wiped? out|loss(es)?|sinks?|sank|"
                       r"slid(es)?|slides?|warns?|warning|tank(s|ed)?|meltdown|bear market|war|killed|dead|deaths?|lawsuit|sued|shutdown|"
                       r"worst|plunge|losing|bust|scandal|chaos|struggl\w+|downgrad\w+|cuts? jobs)\b", re.I)
POS_WORDS = re.compile(r"\b(gains?|ris(e|es|ing)|rose|rall(y|ies|ied)|surg\w+|record high|grow\w*|boost\w*|beats?|sav(e|es|ing|ings)|"
                       r"raises?|wins?|won|rebound\w*|recover\w*|strong\w*|jump\w*|climb\w*|hir(e|es|ing)|opportunit\w+|tips?|"
                       r"how to|build(s|ing)? wealth|invest(ing|ors?)?|dividends?|upgrad\w+|soar\w*|best|milestone|improv\w+|"
                       r"cheaper|lower (prices|rates)|rate cut|bonus|retire(ment)?|budget(ing)?|first-time|affordab\w+|easier)\b", re.I)


def tone(text):
    """Rough headline mood: + encouraging, - scary. Simple word counts; good enough to sort a feed."""
    return len(POS_WORDS.findall(text)) - 1.5 * len(NEG_WORDS.findall(text))


def uplift(stories, n=None):
    """The encouraging cut for money-only folks: drop the doom, lead with progress and how-to."""
    keep = [s for s in stories if s.get("tone", tone(s.get("title", "") + " " + s.get("summary", ""))) > -1]
    keep.sort(key=lambda s: -s.get("tone", 0))
    return keep[:n] if n else keep


FIN_UP = re.compile(r"\b(outlook|growth|opportunit\w+|dividends?|record high|rall(y|ies)|rebound\w*|invest(ing|ment)?s?|savings?|rate cuts?|cheaper|"
                    r"raises?|hiring|earnings beat|upgrade\w*|bull\w*|index funds?|compound\w*|retire\w*)\b", re.I)
AHEAD = re.compile(r"\b(launch\w*|opening|opens|coming|festival|new (park|bridge|school|library|cure|vaccine)|breakthrough|record|first[- ]ever|celebrat\w+|wins?|rescued?|restored?|saved)\b", re.I)
AID = re.compile(r"\b(aid|relief|donat\w+|volunteer\w*|rebuild\w*|vaccin\w+|clean water|reunited|recover\w*|support|helps?|delivered)\b", re.I)


def bright(stories, n=None):
    """The 'bright' feed: lots of good news, humanitarian progress, upbeat money outlooks and things to look forward to."""
    out = []
    for st in stories:
        text = st.get("title", "") + " " + st.get("summary", "")
        t = st.get("tone", tone(text))
        tags = set(st.get("tags", []))
        good, hum = "Good news" in tags, "Humanitarian" in tags
        aid = bool(AID.search(text))
        score = t + (3 if good else 0) + (3.5 if hum and aid else -2 if hum else 0) + 2 * min(2, len(FIN_UP.findall(text))) + min(2, len(AHEAD.findall(text)))
        if score > 0 or good or (hum and aid and t > -4):
            out.append(dict(st, _score=round(score, 1)))
    out.sort(key=lambda s: -s["_score"])
    return out[:n] if n else out


def news(force=False):
    cached = None if force else store.cache_get("news", 20 * 60)
    if cached is not None:
        return cached
    feeds = list(store.settings().get("feeds", []))
    have = {x.get("url") for x in feeds}
    feeds += [b for b in BUILTIN_FEEDS if b["url"] not in have]
    with ThreadPoolExecutor(max_workers=8) as ex:
        batches = list(ex.map(_fetch_feed, feeds))
    stories = {}
    for batch in batches:
        for it in batch:
            text = (it["title"] + " " + it["summary"]).lower()
            tags = set(it["seed_tags"])
            for tag, pat in TAG_WORDS.items():
                if re.search(pat, text):
                    tags.add(tag)
            key = _norm_title(it["title"])
            # merge near-duplicates: same link, or same set of long words
            dup = next((k for k, s in stories.items() if s["link"] == it["link"] or k == key), None)
            if dup:
                stories[dup]["tags"] = sorted(set(stories[dup]["tags"]) | tags)
                if it["source"] not in stories[dup]["sources"]:
                    stories[dup]["sources"].append(it["source"])
                continue
            impact = "high" if re.search(HIGH_IMPACT, text) else ("medium" if len(tags) > 1 else "low")
            stories[key] = {
                "title": it["title"], "link": it["link"], "summary": it["summary"],
                "sources": [it["source"]], "tags": sorted(tags), "impact": impact,
                "published": it["published"], "tone": tone(it["title"] + " " + it["summary"]),
            }
    order = {"high": 0, "medium": 1, "low": 2}
    ranked = sorted(stories.values(), key=lambda s: (order[s["impact"]], -len(s["tags"])))
    out = ranked[:60]
    extra = [s for s in ranked[60:] if "Humanitarian" in s["tags"]][:8]
    out += extra
    store.cache_put("news", out)
    return out


# ---- prices -----------------------------------------------------------------------------

def prices(force=False):
    cached = None if force else store.cache_get("prices", 5 * 60)
    if cached is not None:
        return cached
    out = {"crypto": {}, "fx": {}, "as_of": time.strftime("%I:%M %p").lstrip("0")}
    for sym in ("BTC", "ETH", "SOL"):
        try:
            d = http_json("https://api.coinbase.com/v2/prices/%s-USD/spot" % sym)
            out["crypto"][sym] = float(d["data"]["amount"])
        except Exception as e:
            log.info("price %s failed: %s", sym, e)
    try:
        d = http_json("https://api.frankfurter.app/latest?from=USD&to=CAD,EUR,GBP,JPY")
        out["fx"] = d.get("rates", {})
        out["fx_date"] = d.get("date")
    except Exception as e:
        log.info("fx failed: %s", e)
    # yesterday's FX, for a simple "moved" arrow
    try:
        y = http_json("https://api.frankfurter.app/%s?from=USD&to=CAD,EUR,GBP,JPY" %
                      time.strftime("%Y-%m-%d", time.localtime(time.time() - 3 * 86400)))
        out["fx_prev"] = y.get("rates", {})
    except Exception:
        pass
    if out["crypto"] or out["fx"]:
        store.cache_put("prices", out)
    return out


# ---- Gambling hub (read-only) ----------------------------------------------------------

def _hub_roots(hub):
    """The hub keeps NFL at its root and other sports under sports/<sport>/."""
    roots = [("NFL", hub)]
    sports = hub / "sports"
    if sports.is_dir():
        for d in sorted(sports.iterdir()):
            if d.is_dir():
                roots.append((d.name.upper(), d))
    return roots


def hub_summary():
    path = store.settings().get("hub_path", "").strip()
    if not path:
        return {"connected": False, "reason": "No hub folder set yet."}
    hub = Path(path)
    if not hub.is_dir():
        return {"connected": False, "reason": "Can't find that folder: %s" % path}
    picks, ledgers = [], []
    for sport, root in _hub_roots(hub):
        pdir = root / "reports" / "picks"
        if pdir.is_dir():
            finals = sorted(pdir.glob("*-picks-final.md"), key=lambda p: p.stat().st_mtime, reverse=True)
            if finals:
                f = finals[0]
                text = f.read_text(encoding="utf-8", errors="replace")
                heads = [h.strip("# ").strip() for h in re.findall(r"^#{2,3} .+$", text, re.M)]
                heads = [h for h in heads if not re.search(r"resolution|summary|notes|ledger|sizing|policy|no bet|pass", h, re.I)]
                picks.append({
                    "sport": sport, "file": f.name,
                    "updated": time.strftime("%a %b %d %I:%M %p", time.localtime(f.stat().st_mtime)),
                    "headlines": heads[:6],
                })
        led = root / "ledger" / "results.csv"
        if led.is_file():
            ledgers.append(_ledger_stats(sport, led))
    return {"connected": True, "picks": picks, "ledgers": [l for l in ledgers if l]}


def _ledger_stats(sport, path):
    try:
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            rows = list(csv.DictReader(f))
    except Exception as e:
        return {"sport": sport, "error": str(e)}
    if not rows:
        return {"sport": sport, "bets": 0}
    cols = {c.lower(): c for c in rows[0].keys()}
    res_col = next((cols[c] for c in cols if c in ("result", "outcome", "status")), None)
    pl_col = next((cols[c] for c in cols if any(w in c for w in ("profit", "net", "units_won", "pl"))), None)
    w = sum(1 for r in rows if res_col and r[res_col].strip().lower().startswith("w"))
    l = sum(1 for r in rows if res_col and r[res_col].strip().lower().startswith("l"))
    pend = sum(1 for r in rows if res_col and r[res_col].strip().lower().startswith("pend"))
    units = 0.0
    if pl_col:
        for r in rows:
            try:
                units += float(str(r[pl_col]).replace("u", "").strip() or 0)
            except ValueError:
                pass
    return {"sport": sport, "wins": w, "losses": l, "pending": pend,
            "units": round(units, 3) if pl_col else None}


# ---- FantasyPros (your HOF key; 100 calls a day, so cache hard) -------------------------

def fantasypros_news(sport="nfl"):
    key = store.get_secret("fantasypros")
    if not key:
        return None
    ck = "fp-news-" + sport
    cached = store.cache_get(ck, 60 * 60)
    if cached is not None:
        return cached
    for url in ("https://api.fantasypros.com/public/v2/json/%s/news" % sport,
                "https://api.fantasypros.com/v2/json/%s/news" % sport):
        try:
            d = http_json(url, headers={"x-api-key": key})
            items = d.get("items") or d.get("news") or d.get("players") or []
            out = [{"title": _clean(i.get("title") or i.get("headline") or ""),
                    "summary": _clean(i.get("desc") or i.get("description") or i.get("impact") or "")[:240],
                    "link": i.get("link") or i.get("url") or ""} for i in items[:15]]
            store.cache_put(ck, out)
            return out
        except Exception as e:
            log.info("fantasypros %s failed: %s", url, e)
    return []


# ---- web search -------------------------------------------------------------------------

def tavily_search(q, n=5):
    key = store.get_secret("tavily")
    if not key:
        raise RuntimeError("Tavily isn't connected yet. Add a free key at the Connect counter.")
    d = http_json("https://api.tavily.com/search",
                  headers={"Authorization": "Bearer " + key},
                  data={"query": q, "max_results": n, "include_answer": True, "search_depth": "basic"})
    return {"answer": d.get("answer") or "",
            "results": [{"title": r.get("title"), "link": r.get("url"), "summary": (r.get("content") or "")[:300]}
                        for r in d.get("results", [])]}


def brave_search(q, n=5):
    key = store.get_secret("brave")
    if not key:
        raise RuntimeError("Brave Search isn't connected yet. Add a key at the Connect counter.")
    d = http_json("https://api.search.brave.com/res/v1/web/search?count=%d&q=%s" % (n, urllib.parse.quote(q)),
                  headers={"X-Subscription-Token": key})
    res = d.get("web", {}).get("results", [])
    return {"answer": "", "results": [{"title": r.get("title"), "link": r.get("url"),
                                       "summary": _clean(r.get("description", ""))[:300]} for r in res]}
