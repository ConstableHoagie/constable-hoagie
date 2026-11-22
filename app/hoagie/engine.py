"""Playbooks: what to do with $X at risk level R, over which time frame, and how the
return changes if you do it by hand, with Hoagie's help (hybrid), or fully automated.

Every number here is an estimate with its assumptions written next to it. The point is to
compare plays and methods on the same footing, not to promise anything.

The math, per play:
    expected = stake * (edge * capture[method] - fees[method])
    low/high  = the same with the play's bad-case and good-case edge
  edge     = what the play itself is expected to earn over its period, as a fraction of stake
  capture  = how much of that edge each method actually keeps (slow hands miss prices,
             people skip their weekly buys, bots don't)
  fees     = trading costs as a fraction of stake for that method
Bets with a win/lose outcome use win probability and odds instead of an edge range.
"""
import math
import random
import time

from . import ai, feeds, prefs, store, sports

log = store.log

HORIZONS = {
    "same": "Same day",
    "medium": "48 hours – 4 weeks",
    "long": "4 weeks +",
}
METHODS = ("manual", "hybrid", "auto")
METHOD_LABEL = {"manual": "You do it", "hybrid": "Hoagie helps", "auto": "Fully automatic"}

# ---- the menu ----------------------------------------------------------------------------
# 'menu' is the sub-shop name the play goes by on screen.
PLAYS = {
    "sports_core": {
        "menu": "The Sharp Italian", "emoji": "🏈", "category": "Sports", "horizon": "same",
        "risk": 2, "days": 1, "kind": "bet", "p": 0.535, "odds": -110,
        "venue": "DraftKings Sportsbook (NH's only legal sportsbook)",
        "auto_ok": False,
        "capture": {"manual": 0.80, "hybrid": 1.0},
        "fees": {"manual": 0, "hybrid": 0},
        "why_capture": "Sportsbooks don't allow bots, so it tops out at 'Hoagie helps': he pings you at the right time with the price check. Doing it alone, people often bet late at a worse number.",
        "steps": {
            "manual": ["Read the pick and the 'skip if' line.", "Open the sportsbook app before the game.", "Place it only if the price is at or better than the minimum."],
            "hybrid": ["Hoagie watches the price and pings you when it's time.", "Tap 'Open in app', check the price matches, place the bet.", "Tap 'I placed it' so Hoagie tracks the result."],
        },
        "skip_if": "the price is worse than the minimum, or a key player is ruled out.",
    },
    "dfs_cash": {
        "menu": "The DFS Double-Up Sub", "emoji": "🧢", "category": "DFS", "horizon": "same",
        "risk": 3, "days": 1, "kind": "bet", "p": 0.56, "payout": 1.8,
        "venue": "DraftKings / FanDuel DFS",
        "auto_ok": False,
        "capture": {"manual": 0.85, "hybrid": 1.0},
        "fees": {"manual": 0, "hybrid": 0},
        "why_capture": "Hoagie builds the lineup from your FantasyPros projections and hands you the upload file. DFS sites ban bots, so the last click is yours.",
        "steps": {
            "manual": ["Build a lineup from the projections shown.", "Enter a Double-Up contest (about half the field wins 1.8×)."],
            "hybrid": ["Tap 'Build my lineup' — Hoagie makes the upload CSV.", "On DraftKings: Lineups → Upload Lineups → Upload CSV."],
        },
        "skip_if": "a player in your lineup is announced inactive and you can't swap him.",
    },
    "crypto_day": {
        "menu": "The Bitcoin Hot Pepper", "emoji": "🌶️", "category": "Crypto", "horizon": "same",
        "risk": 4, "days": 1, "kind": "range",
        "edge": {"low": -0.03, "mid": 0.003, "high": 0.02},
        "venue": "Coinbase Advanced",
        "auto_ok": True,
        "capture": {"manual": 0.5, "hybrid": 0.8, "auto": 1.0},
        "fees": {"manual": 0.012, "hybrid": 0.008, "auto": 0.008},
        "why_capture": "Buy low, sell higher inside today's range. Fees are about 1.2% round trip with market orders, about 0.8% with limit orders — at small amounts the fees usually eat the gain.",
        "steps": {
            "manual": ["Buy BTC near the bottom of today's range.", "Sell near the top before the day ends."],
            "hybrid": ["Hoagie suggests a buy price and a sell price.", "You place both as limit orders in Coinbase Advanced."],
            "auto": ["Hoagie places both limit orders through your trade-only Coinbase key.", "He cancels them at day's end if they didn't fill."],
        },
        "skip_if": "BTC is already more than 4% off its morning price (too wild), or the fee eats more than half the target.",
    },
    "crypto_rebalance": {
        "menu": "The 50/50 Half-and-Half", "emoji": "₿", "category": "Crypto", "horizon": "medium",
        "risk": 2, "days": 28, "kind": "range",
        "edge": {"low": -0.08, "mid": 0.005, "high": 0.09},
        "venue": "Coinbase",
        "auto_ok": True,
        "capture": {"manual": 0.8, "hybrid": 0.95, "auto": 1.0},
        "fees": {"manual": 0.0012, "hybrid": 0.0008, "auto": 0.0008},
        "why_capture": "Keep half in BTC and half in USD(C). When BTC runs up you trim; when it drops you add. It's a calm way to hold crypto; the swings are about half of BTC's.",
        "steps": {
            "manual": ["Hold half BTC, half USDC.", "Once a week: if either side is over 55%, trade back to 50/50."],
            "hybrid": ["Hoagie tells you when you've drifted past 55/45 and by how much.", "You make the one trade he lists."],
            "auto": ["Hoagie checks daily and rebalances through your trade-only Coinbase key.", "Your spend limit caps every trade."],
        },
        "skip_if": "you'd need this money within a month.",
    },
    "stock_swing": {
        "menu": "The Two-Week Grinder", "emoji": "📈", "category": "Stocks", "horizon": "medium",
        "risk": 3, "days": 14, "kind": "range",
        "edge": {"low": -0.08, "mid": 0.005, "high": 0.09},
        "venue": "Robinhood (Agentic account)",
        "auto_ok": True,
        "capture": {"manual": 0.8, "hybrid": 0.95, "auto": 1.0},
        "fees": {"manual": 0, "hybrid": 0, "auto": 0},
        "why_capture": "A two-week trade on a stock with news behind it, with a stop-loss. Robinhood's Agentic account lets an AI trade only the money you put in it, with approvals on.",
        "steps": {
            "manual": ["Buy the stock named in the play.", "Set a stop-loss 6% below your price; sell after two weeks or at +8%."],
            "hybrid": ["Hoagie drafts the order with the stop.", "You approve it in Robinhood."],
            "auto": ["Claude places it in your Robinhood Agentic account.", "Robinhood asks you to approve unless you turned approvals off."],
        },
        "skip_if": "earnings are due inside the two weeks (coin flip), or the market is down more than 2% today.",
    },
    "fx_target": {
        "menu": "The Loonie Swap", "emoji": "💱", "category": "FX", "horizon": "medium",
        "risk": 1, "days": 28, "kind": "range",
        "edge": {"low": 0.0, "mid": 0.005, "high": 0.015},
        "venue": "Your bank, Wise, or wherever you convert",
        "auto_ok": False,
        "capture": {"manual": 0.6, "hybrid": 1.0},
        "fees": {"manual": 0, "hybrid": 0},
        "why_capture": "This one saves rather than earns: if you need CAD (or EUR) anyway, convert on a good day instead of a random one. Real currency trading needs a forex broker; PayPal's conversion fees are several percent, so skip it.",
        "steps": {
            "manual": ["Check the rate now and then; convert when it looks good."],
            "hybrid": ["Set your target rate. Hoagie pings you when it's hit.", "Convert that day."],
        },
        "skip_if": "you don't actually need the other currency.",
    },
    "index_dca": {
        "menu": "The Steady Roast Beef", "emoji": "🥩", "category": "Stocks", "horizon": "long",
        "risk": 1, "days": 365, "kind": "range",
        "edge": {"low": -0.20, "mid": 0.07, "high": 0.25},
        "venue": "Robinhood recurring investment",
        "auto_ok": True,
        "capture": {"manual": 0.85, "hybrid": 0.95, "auto": 1.0},
        "fees": {"manual": 0, "hybrid": 0, "auto": 0},
        "why_capture": "Buy a broad index fund every week, no matter what. People doing it by hand skip weeks or stop after a bad month; automatic buying doesn't. Over 10+ years this has been the most reliable grower — any single year can still be down.",
        "steps": {
            "manual": ["Each week, buy the same dollar amount of a broad index fund."],
            "hybrid": ["Hoagie reminds you on payday with the amount."],
            "auto": ["Set up a recurring buy in Robinhood once.", "Hoagie just tracks it."],
        },
        "skip_if": "this is money you'll need in the next year.",
    },
    "btc_dca": {
        "menu": "The Long-Hold Meatball", "emoji": "🧆", "category": "Crypto", "horizon": "long",
        "risk": 3, "days": 365, "kind": "range",
        "edge": {"low": -0.50, "mid": 0.10, "high": 0.80},
        "venue": "Coinbase",
        "auto_ok": True,
        "capture": {"manual": 0.85, "hybrid": 0.95, "auto": 1.0},
        "fees": {"manual": 0.015, "hybrid": 0.006, "auto": 0.004},
        "why_capture": "Small weekly Bitcoin buys. Big swings both ways. Buying in the simple Coinbase app costs more than limit orders in Advanced, which Hoagie can place for you.",
        "steps": {
            "manual": ["Each week, buy a fixed dollar amount of BTC in the Coinbase app."],
            "hybrid": ["Hoagie suggests a limit price each week; you place it in Coinbase Advanced."],
            "auto": ["Hoagie places the weekly limit order through your trade-only key."],
        },
        "skip_if": "a 50% drop would make you sell in a panic.",
    },
    "savings": {
        "menu": "The Bread (Savings)", "emoji": "🍞", "category": "Savings", "horizon": "long",
        "risk": 1, "days": 365, "kind": "range",
        "edge": {"low": 0.025, "mid": 0.035, "high": 0.045},
        "venue": "A high-yield savings account or Treasury bills",
        "auto_ok": True,
        "capture": {"manual": 1.0, "hybrid": 1.0, "auto": 1.0},
        "fees": {"manual": 0, "hybrid": 0, "auto": 0},
        "why_capture": "The bread every other play is measured against. Nearly no risk. Check today's rate at your bank; Hoagie's 2.5–4.5% range is a placeholder.",
        "steps": {
            "manual": ["Move the money to a high-yield savings account."],
            "hybrid": ["Same — Hoagie just tracks it."],
            "auto": ["Set an automatic transfer on payday."],
        },
        "skip_if": "never — this is the safe default.",
    },
}

AMERICAN = lambda o: 1 + (o / 100 if o > 0 else 100 / -o)


# Plain-English "what you actually do" for each play, and where you can do it.
ACTIONS = {
    "sports_core": "Bet ${s} on your sports desk's top pick",
    "dfs_cash": "Enter one ${s} Double-Up contest with Hoagie's lineup",
    "crypto_day": "Buy ${s} of Bitcoin with a limit order; sell at the target or the stop, today",
    "crypto_rebalance": "Put ${s} into a 50/50 cash-and-Bitcoin split; rebalance when it drifts",
    "stock_swing": "Buy ${s} of one watchlist stock and hold about two weeks",
    "fx_target": "Convert ${s} from USD to CAD only when the rate hits your target",
    "index_dca": "Invest ${s} in a total-market index fund on a schedule",
    "btc_dca": "Buy ${s} of Bitcoin on a schedule and hold for a year or more",
    "savings": "Move ${s} into a high-yield savings account or Treasury bills",
}
WHERE_TEXT = {
    "DFS": [{"state": "NH", "ok": True, "text": "DraftKings DFS is allowed in NH (18+)."},
            {"state": "TX", "ok": True, "text": "DraftKings and FanDuel DFS operate in Texas, but its legal status there is disputed. Check first."}],
    "Crypto": [{"state": "Any", "ok": True, "text": "Online (Coinbase). Works from NH and TX."}],
    "Stocks": [{"state": "Any", "ok": True, "text": "Online brokerage. Works anywhere in the US."}],
    "FX": [{"state": "Any", "ok": True, "text": "Your bank or Wise. Works anywhere."}],
    "Savings": [{"state": "Any", "ok": True, "text": "Any online bank, or TreasuryDirect.gov for T-bills. Works anywhere in the US."}],
}


def facts(pid, c):
    """The five things every card leads with: play, where, bet, estimated return, confidence."""
    play = PLAYS[pid]
    r = c["returns"][c["best_method"]]
    action = ACTIONS.get(pid, "Put ${s} into " + play["menu"]).replace("${s}", "$" + _money(c["stake"]))
    if play["kind"] == "bet":
        ret = {"expected": r["expected"], "if_win": r["high"], "if_lose": r["low"],
               "text": "If it wins: +$%.2f. If it loses: -$%.2f. On average: %s." % (r["high"], -r["low"], _signed(r["expected"]))}
        conf = {"word": c["confidence"].split()[0], "pct": round(r["win_chance"] * 100), "text": "%.0f%% win chance" % (r["win_chance"] * 100)}
    else:
        ret = {"expected": r["expected"], "low": r["low"], "high": r["high"],
               "text": "Typical: %s over %s. Range %s to %s." % (_signed(r["expected"]), _period(play["days"]), _signed(r["low"]), _signed(r["high"]))}
        w = c["confidence"].split()[0]
        conf = {"word": w, "pct": None, "text": "" if c["confidence"] == w else c["confidence"][len(w):].strip(" ()")}
    where = sports.where_lines() if play["category"] == "Sports" else WHERE_TEXT.get(play["category"], [{"state": "Any", "ok": True, "text": play["venue"]}])
    return {"play": c["title"] if pid == "sports_core" and c["title"] != play["menu"] else action,
            "venue": play["venue"], "where": where, "bet": c["stake"], "ret": ret, "conf": conf}


def _signed(x):
    return ("+$" if x >= 0 else "-$") + "%.2f" % abs(x)


def methods_for(play):
    return [m for m in METHODS if m in play["capture"]]


def returns(play, stake, p_override=None):
    """Per method: expected, low and high dollar result over the play's period."""
    out = {}
    for m in methods_for(play):
        cap, fee = play["capture"][m], play["fees"][m]
        if play["kind"] == "bet":
            p = p_override or play["p"]
            d = play.get("payout") or AMERICAN(play.get("odds", -110))
            ev_frac = p * (d - 1) - (1 - p)
            # a slower method gets a worse price: model it as keeping less of the edge
            exp = stake * (ev_frac * cap if ev_frac > 0 else ev_frac) - stake * fee
            out[m] = {"expected": round(exp, 2), "low": round(-stake, 2),
                      "high": round(stake * (d - 1), 2), "win_chance": round(p, 3)}
        else:
            e = play["edge"]
            f = lambda x: round(stake * (x * cap if x > 0 else x) - stake * fee, 2)
            out[m] = {"expected": f(e["mid"]), "low": f(e["low"]), "high": f(e["high"])}
        out[m]["fees"] = round(stake * fee, 2)
        out[m]["label"] = METHOD_LABEL[m]
    return out


def confidence_word(play, conf=None):
    if conf:
        return conf
    return {1: "High (low risk)", 2: "Medium", 3: "Medium-low", 4: "Low", 5: "Low"}[play["risk"]]


def card(pid, stake, **extra):
    play = PLAYS[pid]
    r = returns(play, stake, extra.get("p"))
    best = max(r, key=lambda m: r[m]["expected"])
    c = {
        "id": pid, "menu": play["menu"], "emoji": play["emoji"], "category": play["category"],
        "horizon": play["horizon"], "horizon_label": HORIZONS[play["horizon"]],
        "days": play["days"], "venue": play["venue"], "stake": round(stake, 2),
        "returns": r, "best_method": best, "can_automate": play["auto_ok"],
        "automation": "Fully automatic possible" if play["auto_ok"] else "Hoagie helps — you make the last click",
        "how": play["steps"], "why_method": play["why_capture"],
        "skip_if": play["skip_if"], "confidence": confidence_word(play, extra.get("confidence")),
        "title": extra.get("title") or play["menu"],
        "quick_take": extra.get("quick_take") or play["why_capture"].split(". ")[0] + ".",
        "news": extra.get("news") or [],
        "source": extra.get("source", "Hoagie's menu"),
    }
    c["facts"] = facts(pid, c)
    if play["kind"] == "bet":
        c["assumption"] = "Win chance %.0f%%%s. Win: +$%.2f. Lose: −$%.2f." % (
            r[best]["win_chance"] * 100,
            ", at %s" % play["odds"] if "odds" in play else ", pays %.1f×" % play["payout"],
            r[best]["high"], stake)
    else:
        e = play["edge"]
        c["assumption"] = "Over %s: bad case %+.1f%%, typical %+.1f%%, good case %+.1f%% before fees." % (
            _period(play["days"]), e["low"] * 100, e["mid"] * 100, e["high"] * 100)
    return c


def _period(days):
    return {1: "today", 14: "two weeks", 28: "four weeks", 365: "a year"}.get(days, "%d days" % days)


def _news_for(category, stories, n=2):
    tag = {"Sports": "NFL", "DFS": "NFL"}.get(category, category)
    hits = [s for s in stories if tag in s["tags"] or category in s["tags"]]
    return [{"text": s["title"], "link": s["link"], "source": ", ".join(s["sources"])} for s in hits[:n]]


# ---- playbooks -------------------------------------------------------------------------

def playbook(amount, risk, horizons, focus="compare"):
    amount = max(1.0, float(amount))
    risk = max(1, min(5, int(risk)))
    horizons = [h for h in horizons if h in HORIZONS] or ["long"]
    stories = []
    try:
        stories = feeds.news()
    except Exception as e:
        log.info("news for playbook failed: %s", e)
    allowed = [pid for pid, p in PLAYS.items() if p["horizon"] in horizons and p["risk"] <= risk
               and (prefs.betting_on() or pid not in prefs.BET_PLAYS)]
    if not allowed:
        allowed = ["savings"]
    # score: expected return per dollar per day with the best method, nudged toward riskier plays at higher risk
    def score(pid):
        p = PLAYS[pid]
        r = returns(p, 100)
        best = max(v["expected"] for v in r.values())
        return best / max(p["days"], 1) * 365 + p["risk"] * (risk - 2) * 0.5
    ranked = sorted(allowed, key=score, reverse=True)
    # one play per chosen time frame first (so "same day + long term" really gets both), then fill to 3
    chosen = []
    for h in horizons:
        best = next((pid for pid in ranked if PLAYS[pid]["horizon"] == h and pid not in chosen), None)
        if best:
            chosen.append(best)
    for pid in ranked:
        if len(chosen) >= 3:
            break
        if pid not in chosen:
            chosen.append(pid)
    chosen = chosen[:3]
    # split the money: more to calmer plays when risk is low
    weights = [max(0.2, 1.0 - abs(PLAYS[pid]["risk"] - risk) * 0.25) for pid in chosen]
    total_w = sum(weights)
    cards = []
    for pid, w in zip(chosen, weights):
        stake = amount * w / total_w
        cards.append(card(pid, stake, news=_news_for(PLAYS[pid]["category"], stories)))
    totals = {}
    for m in METHODS:
        vals = [c["returns"].get(m) or c["returns"][c["best_method"] if m == "auto" else "manual"] for c in cards]
        totals[m] = {
            "expected": round(sum(v["expected"] for v in vals), 2),
            "low": round(sum(v["low"] for v in vals), 2),
            "high": round(sum(v["high"] for v in vals), 2),
            "note": "" if all(m in c["returns"] for c in cards) else
                    "Some plays can't be fully automatic; those use 'Hoagie helps' in this total.",
        }
    pb = {
        "title": "Playbook: $%s at risk %d" % (_money(amount), risk),
        "made": time.strftime("%a %b %d, %Y · %I:%M %p").replace(" 0", " "),
        "amount": amount, "risk": risk, "horizons": [HORIZONS[h] for h in horizons],
        "cards": cards, "totals": totals,
        "fine_print": FINE_PRINT,
    }
    store.append_history({"type": "playbook", "amount": amount, "risk": risk, "plays": chosen})
    return pb


def _money(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


FINE_PRINT = ("Hoagie's numbers are estimates from the assumptions shown on each card, not promises. "
              "Any play can lose money, and the 'bad case' can happen. Not financial advice; "
              "Constable Hoagie isn't a licensed advisor. Gamble responsibly — if it stops being fun, "
              "call or text 1-800-GAMBLER.")


# ---- today's play -----------------------------------------------------------------------

def todays_play(amount=None, risk=None, engine="auto"):
    s = store.settings()
    amount = float(amount or s.get("daily_budget") or 25)
    risk = int(risk or s.get("risk") or 2)
    stories, px, hub = [], {}, {"connected": False}
    try:
        stories = feeds.news()
    except Exception as e:
        log.info("news failed: %s", e)
    try:
        px = feeds.prices()
    except Exception:
        pass
    try:
        hub = feeds.hub_summary()
    except Exception as e:
        log.info("hub failed: %s", e)

    bet = prefs.betting_on()
    if bet:
        try:
            games = sports.suggestions(risk, amount)
        except Exception as e:
            log.info("games failed: %s", e)
            games = {"games": [], "sources": [], "checked": 0}
    else:
        games = None                       # money-only: no sports bets anywhere
        stories = [s for s in stories if not prefs.BET_TAGS & set(s["tags"])]
        hub = {"connected": False}
    eng = ai.pick_brain(engine if engine in ("auto",) + ai.BRAINS else "auto")
    out = None
    if eng in ai.BRAINS:
        try:
            out = _ai_play(eng, amount, risk, stories, px, hub)
        except Exception as e:
            log.warning("AI play failed, using the menu instead: %s", e)
    out = out or _menu_play(amount, risk, stories, hub)
    out["games"] = games
    return out


def _context(stories, px, hub):
    lines = ["Prices: " + ", ".join("%s $%s" % (k, format(v, ",.0f")) for k, v in px.get("crypto", {}).items())]
    if px.get("fx"):
        lines.append("USD→ " + ", ".join("%s %.4f" % (k, v) for k, v in px["fx"].items()))
    if hub.get("connected"):
        for p in hub.get("picks", []):
            lines.append("Our sports desk's latest %s card (%s): %s" % (p["sport"], p["updated"], "; ".join(p["headlines"][:4])))
    lines.append("Top headlines:")
    for st in stories[:12]:
        lines.append("- [%s] %s (%s) %s" % ("/".join(st["tags"]), st["title"], ", ".join(st["sources"]), st["link"]))
    return "\n".join(lines)


def _ai_play(eng, amount, risk, stories, px, hub):
    menu = "\n".join("- %s: %s (%s, %s, risk %d)" % (pid, p["menu"], p["category"], HORIZONS[p["horizon"]], p["risk"])
                     for pid, p in PLAYS.items() if p["risk"] <= risk and (prefs.betting_on() or pid not in prefs.BET_PLAYS))
    prompt = (
        ai.HOAGIE_VOICE + "\n\nPick ONE play for today for $%s at risk level %d of 5. Choose from this menu only:\n%s\n\n"
        "Use the context below (and web search if you have it) for supporting news. If nothing is worth doing, pick 'savings'.\n"
        "If you pick sports_core, it must come from our sports desk's card when there is one.\n\n%s\n\n"
        "Reply with only JSON: {\"play\": \"<menu id>\", \"title\": \"<6-10 word headline>\", "
        "\"quick_take\": \"<one sentence why>\", \"confidence\": \"High|Medium|Low\", "
        "\"win_chance\": <0-1 or null, only for bets>, "
        "\"news\": [{\"text\": \"<fact>\", \"link\": \"<url>\", \"source\": \"<outlet>\"}]}"
    ) % (_money(amount), risk, menu, _context(stories, px, hub))
    raw = ai.complete(prompt, engine=eng)
    d = ai.json_from(raw)
    pid = d.get("play") if d.get("play") in PLAYS else "savings"
    if pid in prefs.BET_PLAYS and not prefs.betting_on():
        pid = "savings"
    if PLAYS[pid]["risk"] > risk:
        pid = "savings"
    p = d.get("win_chance")
    p = float(p) if isinstance(p, (int, float)) and 0.3 < float(p) < 0.9 else None
    c = card(pid, amount, title=d.get("title"), quick_take=d.get("quick_take"),
             confidence=d.get("confidence"), news=(d.get("news") or [])[:3], p=p,
             source="Picked by %s from today's news" % ("Claude" if eng == "claude" else "Foundry Local"))
    store.append_history({"type": "today", "play": pid, "amount": amount, "risk": risk, "engine": eng, "title": c["title"]})
    return {"play": c, "fine_print": FINE_PRINT, "engine": eng}


def _menu_play(amount, risk, stories, hub):
    pid, title, qt = None, None, None
    if hub.get("connected") and hub.get("picks") and risk >= 2:
        p = hub["picks"][0]
        if p["headlines"]:
            pid, title = "sports_core", p["headlines"][0]
            qt = "From your sports desk's latest %s card (%s). Check the card's minimum price and 'skip if' first." % (p["sport"], p["updated"])
    if not pid:
        pid = {1: "index_dca", 2: "crypto_rebalance", 3: "stock_swing", 4: "crypto_rebalance", 5: "crypto_day"}[risk]
    c = card(pid, amount, title=title, quick_take=qt, news=_news_for(PLAYS[pid]["category"], stories),
             source="Hoagie's menu (connect Claude for picks based on today's news)")
    store.append_history({"type": "today", "play": pid, "amount": amount, "risk": risk, "engine": "menu"})
    return {"play": c, "fine_print": FINE_PRINT, "engine": "menu"}


# ---- lottery ------------------------------------------------------------------------------
# Every combination has exactly the same odds. What Hoagie *can* do: avoid the numbers most
# people pick (birthdays 1-31, patterns), so a win is less likely to be split.
LOTTERY = {
    "NH": {
        "buy": "https://www.nhlottery.com",
        "buy_note": "NH iLottery sells these online if you're physically in New Hampshire.",
        "games": {
            "Powerball": {"main": (5, 69), "bonus": (1, 26), "price": 2},
            "Mega Millions": {"main": (5, 70), "bonus": (1, 24), "price": 5},
            "Tri-State Megabucks": {"main": (5, 41), "bonus": (1, 6), "price": 2},
            "Gimme 5": {"main": (5, 39), "bonus": None, "price": 1},
        },
    },
    "TX": {
        "buy": "https://www.texaslottery.com",
        "buy_note": "Texas made online lottery sales illegal in 2025: take these numbers to a store.",
        "games": {
            "Lotto Texas": {"main": (6, 54), "bonus": None, "price": 1},
            "Texas Two Step": {"main": (4, 35), "bonus": (1, 35), "price": 1},
            "Cash Five": {"main": (5, 35), "bonus": None, "price": 1},
            "Powerball": {"main": (5, 69), "bonus": (1, 26), "price": 2},
            "Mega Millions": {"main": (5, 70), "bonus": (1, 24), "price": 5},
        },
    },
}


def _popular(nums, top):
    nums = sorted(nums)
    low = sum(1 for n in nums if n <= 31)
    diffs = {b - a for a, b in zip(nums, nums[1:])}
    same_decade = len({n // 10 for n in nums}) == 1
    return (top > 31 and low >= len(nums) - 1) or len(diffs) == 1 or same_decade


def lottery(state, game, count=3):
    st = LOTTERY.get(state.upper())
    if not st or game not in st["games"]:
        raise ValueError("unknown game")
    g = st["games"][game]
    k, top = g["main"]
    rng = random.SystemRandom()
    tickets = []
    while len(tickets) < max(1, min(10, int(count))):
        nums = sorted(rng.sample(range(1, top + 1), k))
        if _popular(nums, top):
            continue
        t = {"main": nums}
        if g["bonus"]:
            t["bonus"] = rng.randint(1, g["bonus"][1])
        tickets.append(t)
    combos = math.comb(top, k) * (g["bonus"][1] if g["bonus"] else 1)
    return {
        "state": state.upper(), "game": game, "tickets": tickets,
        "jackpot_odds": "1 in {:,}".format(combos), "price": g["price"],
        "buy": st["buy"], "buy_note": st["buy_note"],
        "honest": "Every combination has exactly the same chance. These picks skip the patterns most "
                  "people play (birthdays, sequences), so if you win you're less likely to split the jackpot. "
                  "On average a lottery ticket returns well under what it costs: play it for fun, with money "
                  "you'd spend on a sandwich.",
        "check": "Game rules change now and then; double-check the number ranges on the official site.",
    }
