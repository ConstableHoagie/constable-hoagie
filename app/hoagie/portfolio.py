"""My Tab: what you hold, across every account, in one place.

Phase 1 is read-only and fills in three ways:
  1. type a holding in (venue, what, how much, what you paid);
  2. drop a screenshot of any dashboard: Claude reads the holdings off it;
  3. live prices for crypto from Coinbase's public price feed.
Connected-account syncing (Coinbase view key, Robinhood) comes in a later phase.
"""
import base64
import re
import time
import uuid

from . import ai, feeds, store

log = store.log


def holdings():
    return store.load("portfolio", {"items": []})


def save_item(item):
    pf = holdings()
    item = {
        "id": item.get("id") or uuid.uuid4().hex[:8],
        "venue": str(item.get("venue", "")).strip()[:40] or "Other",
        "asset": str(item.get("asset", "")).strip()[:30].upper() or "CASH",
        "amount": float(item.get("amount") or 0),
        "cost": float(item.get("cost") or 0),
        "value": float(item.get("value") or 0),  # manual value for things without a live price
        "updated": time.strftime("%Y-%m-%d"),
    }
    pf["items"] = [i for i in pf["items"] if i["id"] != item["id"]] + [item]
    store.save("portfolio", pf)
    return item


def delete_item(item_id):
    pf = holdings()
    pf["items"] = [i for i in pf["items"] if i["id"] != item_id]
    store.save("portfolio", pf)


# ---- live prices for anything trackable ---------------------------------------------------
FIAT = {"CAD", "EUR", "GBP", "JPY", "AUD", "CHF", "MXN", "CNY", "INR", "SEK", "NOK", "NZD", "HKD", "SGD", "KRW", "BRL", "ZAR", "PLN", "DKK"}
CASHLIKE = {"USD", "CASH", "USDC", "USDT", "DAI"}
CRYPTO = {"BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "LTC", "AVAX", "DOT", "LINK", "MATIC", "SHIB", "BCH", "XLM", "ATOM", "UNI", "AAVE", "PEPE"}


def kind(asset, hint=None):
    a = asset.upper()
    if hint == "crypto" and a not in CASHLIKE and a not in FIAT:
        return "crypto"
    if a in CASHLIKE:
        return "cash"
    if a in FIAT:
        return "fiat"
    if a in CRYPTO:
        return "crypto"
    if re.fullmatch(r"[A-Z]{1,5}(\.[A-Z])?", a):
        return "stock"
    return "other"


def _spot(asset, k=None):
    """Today's USD price for one asset, cached 5 minutes. None if it can't be tracked."""
    k = k or kind(asset)
    if k == "cash":
        return 1.0
    ck = "px-%s" % asset.replace(".", "_")
    hit = store.cache_get(ck, 300)
    if hit is not None:
        return hit or None
    price = None
    try:
        if k == "crypto":
            price = float(feeds.http_json("https://api.coinbase.com/v2/prices/%s-USD/spot" % asset)["data"]["amount"])
        elif k == "fiat":
            rate = feeds.http_json("https://api.frankfurter.app/latest?from=USD&to=%s" % asset)["rates"][asset]
            price = 1.0 / float(rate)
        elif k == "stock":
            raw = feeds.http_get("https://stooq.com/q/l/?s=%s.us&f=sd2t2ohlcv&h&e=csv" % asset.lower()).decode()
            close = raw.strip().splitlines()[-1].split(",")[6]
            price = float(close) if close not in ("N/D", "") else None
    except Exception as e:
        log.info("price for %s failed: %s", asset, e)
    store.cache_put(ck, price or 0)
    return price


def valued(snapshot=True):
    pf = holdings()
    rows, total, cost = [], 0.0, 0.0
    for i in pf["items"] + linked_rows():
        k = kind(i["asset"], i.get("hint"))
        live = _spot(i["asset"], k) if k != "other" and not i.get("fixed") else None
        if live:
            val = i["amount"] * live
        else:
            val = i.get("value") or i["amount"]
        rows.append(dict(i, now=round(val, 2), live=bool(live) and k != "cash", kind=k,
                         gain=round(val - i["cost"], 2) if i.get("cost") else None))
        total += val
        cost += i.get("cost") or 0
    out = {"rows": rows, "total": round(total, 2), "cost": round(cost, 2),
           "gain": round(total - cost, 2) if cost else None}
    if snapshot and rows:
        _snapshot(out)
    return out


def linked_rows():
    """Balances from connected accounts (bank sync, brokers). Read-only, refreshed by their own modules."""
    return store.load("linked", {"rows": []}).get("rows", [])


# ---- net worth history ---------------------------------------------------------------------

def _snapshot(v):
    h = store.load("networth", {"days": {}})
    day = time.strftime("%Y-%m-%d")
    by = {}
    for r in v["rows"]:
        by[r["asset"]] = round(by.get(r["asset"], 0) + r["now"], 2)
    h["days"][day] = {"total": v["total"], "by": by}
    keep = sorted(h["days"])[-1100:]
    h["days"] = {d: h["days"][d] for d in keep}
    store.save("networth", h)


def _history(asset, days):
    """[(YYYY-MM-DD, usd_price)] for the last `days` days. Cached 6 hours."""
    k = kind(asset)
    if k == "cash":
        return []
    ck = "hist-%s-%d" % (asset.replace(".", "_"), days)
    hit = store.cache_get(ck, 6 * 3600)
    if hit is not None:
        return hit
    out = []
    try:
        if k == "crypto":
            rows = feeds.http_json("https://api.exchange.coinbase.com/products/%s-USD/candles?granularity=86400" % asset)
            out = sorted((time.strftime("%Y-%m-%d", time.gmtime(r[0])), float(r[4])) for r in rows)[-days:]
        elif k == "fiat":
            start = time.strftime("%Y-%m-%d", time.localtime(time.time() - days * 86400))
            d = feeds.http_json("https://api.frankfurter.app/%s..?from=USD&to=%s" % (start, asset))
            out = sorted((day, 1.0 / float(r[asset])) for day, r in d.get("rates", {}).items())
        elif k == "stock":
            raw = feeds.http_get("https://stooq.com/q/d/l/?s=%s.us&i=d" % asset.lower()).decode()
            lines = raw.strip().splitlines()[1:]
            out = [(ln.split(",")[0], float(ln.split(",")[4])) for ln in lines[-days:] if ln.count(",") >= 4]
    except Exception as e:
        log.info("history for %s failed: %s", asset, e)
    store.cache_put(ck, out)
    return out


def networth(days=90):
    """Actual daily snapshots, plus an estimate of what today's holdings were worth each day
    (so the chart isn't empty on day one), plus how each tracked asset moved."""
    days = max(7, min(int(days), 365))
    v = valued()
    snaps = store.load("networth", {"days": {}})["days"]
    cut = time.strftime("%Y-%m-%d", time.localtime(time.time() - days * 86400))
    actual = [{"date": d, "total": s["total"]} for d, s in sorted(snaps.items()) if d >= cut]
    # group holdings by asset
    amounts = {}
    for r in v["rows"]:
        a = amounts.setdefault(r["asset"], {"amount": 0.0, "now": 0.0, "fixed": 0.0})
        if r["live"] or r["kind"] == "cash":
            a["amount"] += r["amount"]
        else:
            a["fixed"] += r["now"]
        a["now"] += r["now"]
    assets, series = [], {}
    for asset, a in amounts.items():
        hist = _history(asset, days) if a["amount"] and kind(asset) not in ("cash", "other") else []
        if hist:
            first, last = hist[0][1], hist[-1][1]
            assets.append({"asset": asset, "kind": kind(asset), "value": round(a["now"], 2), "prices": hist,
                           "change_pct": round((last - first) / first * 100, 2) if first else None, "price": last})
            for d, p in hist:
                series[d] = series.get(d, 0) + a["amount"] * p
        else:
            assets.append({"asset": asset, "kind": kind(asset), "value": round(a["now"], 2), "prices": [], "change_pct": None})
    steady = sum(a["now"] for asset, a in amounts.items() if not any(x["asset"] == asset and x["prices"] for x in assets))
    estimate = [{"date": d, "total": round(t + steady, 2)} for d, t in sorted(series.items()) if d >= cut]
    assets.sort(key=lambda x: -x["value"])
    return {"total": v["total"], "actual": actual, "estimate": estimate, "assets": assets, "days": days,
            "note": "Solid line: your real daily snapshots. Dashed: what today's holdings would have been worth on each day."}


def read_screenshot(data_url, venue_hint=""):
    m = re.match(r"data:image/(png|jpe?g|webp);base64,(.+)", data_url or "", re.S)
    if not m:
        raise ValueError("That doesn't look like an image.")
    ext = "jpg" if m.group(1).startswith("jp") else m.group(1)
    path = store.DATA / "uploads" / ("shot-%s.%s" % (time.strftime("%Y%m%d-%H%M%S"), ext))
    path.write_bytes(base64.b64decode(m.group(2)))
    if ai.pick_brain() not in ("claude", "openai", "gemini", "agent"):
        return {"saved": str(path), "items": [],
                "note": "Saved. Reading screenshots needs Claude, GPT, Gemini or your own agent; connect one at the Connect counter, or type the holdings in."}
    prompt = (
        "Read the investment/betting dashboard screenshot at {path}\n"
        "List every holding or balance you can see. Venue hint: %s.\n"
        "Reply with only JSON: [{\"venue\": \"...\", \"asset\": \"ticker or USD\", \"amount\": number (units held, or dollars for cash), "
        "\"value\": number (current dollar value if shown, else 0), \"cost\": number (cost basis if shown, else 0)}]"
    ) % (venue_hint or "unknown",)
    raw = ai.read_image(data_url, path, prompt)
    items = ai.json_from(raw)
    if isinstance(items, dict):
        items = items.get("items", [])
    return {"saved": str(path), "items": items[:30]}
