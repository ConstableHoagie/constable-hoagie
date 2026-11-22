"""The Insights counter: free public data that turns into plain-English money edges.

Every source here is free. Some need no key at all (Treasury, BLS, SEC EDGAR, crypto Fear & Greed);
two need a free key you paste once at the Connect counter (FRED, Finnhub). Nothing here can move money,
and nothing about you is sent anywhere except the ticker symbols you already hold (for filings/earnings).
"""
import datetime as dt
import json
import re
import urllib.parse

from . import feeds, portfolio, store

log = store.log

# (id, name, needs key?, what it adds, signup link)
SOURCES = [
    ("treasury", "U.S. Treasury FiscalData", False, "What T-bills and Treasury notes pay right now: the 'safe money' yardstick.", "https://fiscaldata.treasury.gov/api-documentation/"),
    ("bls", "Bureau of Labor Statistics", False, "Inflation (CPI) straight from the source, so you can see if your cash is shrinking.", "https://www.bls.gov/developers/"),
    ("edgar", "SEC EDGAR", False, "Fresh 10-K, 10-Q and 8-K filings for stocks you own. The official paper trail.", "https://www.sec.gov/search-filings/edgar-application-programming-interfaces"),
    ("fng", "Crypto Fear & Greed (alternative.me)", False, "One number for the crypto crowd's mood, 0 (panic) to 100 (greed).", "https://alternative.me/crypto/fear-and-greed-index/"),
    ("fred", "FRED (St. Louis Fed)", True, "Fed rate, 10-year yield, recession warning (yield curve), mortgage rates, unemployment, gas prices.", "https://fredaccount.stlouisfed.org/apikeys"),
    ("finnhub", "Finnhub", True, "Earnings dates and company headlines for your stocks (free: 60 calls/min, personal use).", "https://finnhub.io/register"),
]

FRED_SERIES = [
    # id, label, units param, suffix, help
    ("FEDFUNDS", "Fed funds rate", None, "%", "What banks charge each other overnight. Savings and loan rates follow it."),
    ("DGS10", "10-year Treasury", None, "%", "The rate mortgages and long loans key off."),
    ("T10Y2Y", "Yield curve (10y minus 2y)", None, " pts", "Below zero has come before most U.S. recessions."),
    ("MORTGAGE30US", "30-year mortgage", None, "%", "Average new 30-year fixed rate (Freddie Mac)."),
    ("UNRATE", "Unemployment", None, "%", "Share of people looking for work."),
    ("GASREGW", "Gas, regular", None, " $/gal", "U.S. average pump price, weekly."),
]


def _ua():
    """SEC asks automated tools to say who they are with a contact address."""
    s = store.settings()
    contact = s.get("smtp_from") or (s.get("owner_emails") or [""])[0] or "hello@constablehoagie.com"
    return "Constable Hoagie personal dashboard %s" % contact


def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


# ---- keyless sources --------------------------------------------------------------------------

def treasury():
    url = ("https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates"
           "?sort=-record_date&page%5Bsize%5D=20&fields=record_date,security_desc,avg_interest_rate_amt")
    d = feeds.http_json(url)
    rows = d.get("data", [])
    if not rows:
        return {}
    latest = rows[0]["record_date"]
    out = {"date": latest}
    for r in rows:
        if r["record_date"] != latest:
            continue
        if r["security_desc"] == "Treasury Bills":
            out["bills"] = _num(r["avg_interest_rate_amt"])
        elif r["security_desc"] == "Treasury Notes":
            out["notes"] = _num(r["avg_interest_rate_amt"])
    return out


def cpi():
    """Year-over-year CPI from BLS's keyless public API (v1)."""
    d = feeds.http_json("https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0")
    data = d["Results"]["series"][0]["data"]
    by = {(r["year"], r["period"]): _num(r["value"]) for r in data if r["period"].startswith("M") and r["period"] != "M13"}
    top = data[0]
    now = by.get((top["year"], top["period"]))
    prev = by.get((str(int(top["year"]) - 1), top["period"]))
    if not now or not prev:
        return {}
    return {"yoy": round((now / prev - 1) * 100, 1), "month": "%s %s" % (top["periodName"], top["year"])}


def fear_greed():
    d = feeds.http_json("https://api.alternative.me/fng/?limit=1")
    r = d["data"][0]
    return {"value": int(r["value"]), "label": r["value_classification"]}


_TICKERS = None


def _cik(symbol):
    global _TICKERS
    if _TICKERS is None:
        m = store.cache_get("sec-tickers", 7 * 86400)
        if not m:
            raw = feeds.http_json("https://www.sec.gov/files/company_tickers.json", headers={"User-Agent": _ua()})
            m = {v["ticker"].upper(): int(v["cik_str"]) for v in raw.values()}
            store.cache_put("sec-tickers", m)
        _TICKERS = m
    return _TICKERS.get(symbol.upper())


def filings(symbol, n=3):
    cik = _cik(symbol)
    if not cik:
        return []
    d = feeds.http_json("https://data.sec.gov/submissions/CIK%010d.json" % cik, headers={"User-Agent": _ua()})
    rec = d.get("filings", {}).get("recent", {})
    out = []
    for i, form in enumerate(rec.get("form", [])):
        if form not in ("10-K", "10-Q", "8-K"):
            continue
        acc = rec["accessionNumber"][i]
        doc = rec["primaryDocument"][i]
        out.append({"form": form, "date": rec["filingDate"][i],
                    "what": {"10-K": "Annual report", "10-Q": "Quarterly report", "8-K": "Big news filing"}[form],
                    "url": "https://www.sec.gov/Archives/edgar/data/%d/%s/%s" % (cik, acc.replace("-", ""), doc)})
        if len(out) >= n:
            break
    return out


# ---- free-key sources -------------------------------------------------------------------------

def fred(key):
    out = []
    for sid, label, units, suffix, help_ in FRED_SERIES:
        q = {"series_id": sid, "api_key": key, "file_type": "json", "sort_order": "desc", "limit": 10}
        if units:
            q["units"] = units
        try:
            d = feeds.http_json("https://api.stlouisfed.org/fred/series/observations?" + urllib.parse.urlencode(q))
            obs = [o for o in d.get("observations", []) if o.get("value") not in (".", None)]
            if obs:
                out.append({"id": sid, "label": label, "value": _num(obs[0]["value"]), "suffix": suffix, "date": obs[0]["date"], "help": help_})
        except Exception as e:
            log.info("fred %s failed: %s", sid, e)
    return out


def finnhub(key, symbols):
    today = dt.date.today()
    out = {}
    for s in symbols[:8]:
        row = {"earnings": None, "news": []}
        try:
            q = urllib.parse.urlencode({"from": today.isoformat(), "to": (today + dt.timedelta(days=30)).isoformat(), "symbol": s, "token": key})
            cal = feeds.http_json("https://finnhub.io/api/v1/calendar/earnings?" + q).get("earningsCalendar", [])
            if cal:
                e = sorted(cal, key=lambda x: x.get("date", ""))[0]
                row["earnings"] = {"date": e.get("date"), "when": {"bmo": "before the open", "amc": "after the close"}.get(e.get("hour"), ""), "eps_est": e.get("epsEstimate")}
            q = urllib.parse.urlencode({"symbol": s, "from": (today - dt.timedelta(days=5)).isoformat(), "to": today.isoformat(), "token": key})
            news = feeds.http_json("https://finnhub.io/api/v1/company-news?" + q)
            row["news"] = [{"title": n.get("headline", "")[:140], "url": n.get("url"), "source": n.get("source")} for n in news[:3]]
        except Exception as e:
            log.info("finnhub %s failed: %s", s, e)
        out[s] = row
    return out


# ---- putting it together ----------------------------------------------------------------------

def _stocks():
    items = portfolio.holdings()["items"] + portfolio.linked_rows()
    seen = []
    for i in items:
        a = str(i.get("asset", "")).upper()
        if re.fullmatch(r"[A-Z.]{1,6}", a) and portfolio.kind(a, i.get("hint")) == "stock" and a not in seen:
            seen.append(a)
    return seen


def _edges(c):
    """Plain-language takeaways. Education, not advice."""
    tips = []
    bills, infl = c.get("bills"), c.get("cpi")
    if bills is not None and infl is not None:
        real = round(bills - infl, 1)
        if real >= 0.5:
            tips.append(("good", "Safe money is beating inflation by about %.1f points (T-bills ~%.1f%% vs prices +%.1f%%). Cash in a high-yield savings account or T-bills is quietly growing." % (real, bills, infl)))
        elif real > -0.5:
            tips.append(("meh", "Safe money is roughly treading water against inflation (T-bills ~%.1f%% vs prices +%.1f%%)." % (bills, infl)))
        else:
            tips.append(("warn", "Prices are rising faster than safe money pays (+%.1f%% vs ~%.1f%%). Cash sitting in plain checking is losing value." % (infl, bills)))
    for f in c.get("fred", []):
        if f["id"] == "T10Y2Y" and f["value"] is not None and f["value"] < 0:
            tips.append(("warn", "The yield curve is upside down (%.2f). That has shown up before most recessions, though the timing varies a lot. A topped-up emergency fund is the classic move." % f["value"]))
        if f["id"] == "MORTGAGE30US" and f["value"] is not None:
            tips.append(("info", "New 30-year mortgages average %.2f%%. If yours is a point or more above that, a refinance quote could be worth a look." % f["value"]))
    fg = c.get("fng")
    if fg:
        if fg["value"] <= 25:
            tips.append(("info", "Crypto mood: %s (%d). Crowds are scared. Some long-term buyers like these stretches; prices can still fall further." % (fg["label"], fg["value"])))
        elif fg["value"] >= 75:
            tips.append(("info", "Crypto mood: %s (%d). Crowds are greedy. Big swings tend to follow; don't chase." % (fg["label"], fg["value"])))
    soon = dt.date.today() + dt.timedelta(days=7)
    for s, row in (c.get("finnhub") or {}).items():
        e = row.get("earnings")
        if e and e.get("date") and e["date"] <= soon.isoformat():
            when = (" " + e["when"]) if e.get("when") else ""
            tips.append(("info", "%s reports earnings %s%s. Expect a bigger-than-usual price move that day." % (s, e["date"], when)))
    return [{"tone": t, "text": x} for t, x in tips]


def insights(force=False, upbeat=False):
    c = _insights(force)
    if upbeat:
        c = json.loads(json.dumps(c))
        for row in c["holdings"].values():
            if row.get("news"):
                row["news"] = [n for n in row["news"] if feeds.tone(n["title"]) > -1]
        for e in c["edges"]:
            if e["tone"] == "warn":
                e["tone"] = "tip"
                e["text"] += " Every dollar you set aside still counts. Keep going."
    return c


def _insights(force=False):
    key = "insights-" + (store.has_secret("fred") and "f" or "") + (store.has_secret("finnhub") and "h" or "")
    if not force:
        hit = store.cache_get(key, 1800)
        if hit:
            return hit
    c, errors = {}, []

    def grab(name, fn):
        try:
            return fn()
        except Exception as e:
            log.info("insights %s failed: %s", name, e)
            errors.append(name)
            return None

    t = grab("treasury", treasury) or {}
    c["bills"], c["notes"], c["treasury_date"] = t.get("bills"), t.get("notes"), t.get("date")
    p = grab("bls", cpi) or {}
    c["cpi"], c["cpi_month"] = p.get("yoy"), p.get("month")
    c["fng"] = grab("fng", fear_greed)
    stocks = _stocks()
    c["holdings"] = {}
    for s in stocks[:8]:
        c["holdings"][s] = {"filings": grab("edgar", lambda s=s: filings(s)) or []}
    fk = store.get_secret("fred")
    c["fred"] = (grab("fred", lambda: fred(fk)) or []) if fk else []
    hk = store.get_secret("finnhub")
    c["finnhub"] = (grab("finnhub", lambda: finnhub(hk, stocks)) or {}) if hk and stocks else {}
    for s, row in c["finnhub"].items():
        c["holdings"].setdefault(s, {}).update(row)
    c["edges"] = _edges(c)
    c["needs"] = {"fred": not fk, "finnhub": not hk}
    c["sources"] = [{"id": i, "name": n, "key": k, "what": w, "url": u} for i, n, k, w, u in SOURCES]
    c["errors"] = sorted(set(errors))
    c["stocks"] = stocks
    c["checked"] = dt.datetime.now().strftime("%b %d, %I:%M %p")
    store.cache_put(key, c)
    return c
