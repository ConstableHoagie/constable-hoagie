"""The daily email: built from the shop's own feeds and rules. No Claude, no AI usage.

Each person picks topics, a delivery time, weekdays or every day, and how far back the news
should go (12 hours to a week). The owner sets up sending once (Gmail app password or a free
Brevo SMTP key). Emails go out from this PC, so it has to be on with Hoagie open at that time;
if it was off, the email goes out the next time Hoagie runs that day.
"""
import html
import logging
import smtplib
import ssl
import threading
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import parsedate_to_datetime

from . import engine, feeds, give, prefs, sports, store

log = logging.getLogger("hoagie")

PRESETS = {
    "gmail": {"label": "Gmail (app password)", "host": "smtp.gmail.com", "port": 587,
              "help": "Turn on 2-Step Verification, then make an app password at myaccount.google.com/apppasswords. Free Gmail sends up to about 500 a day."},
    "brevo": {"label": "Brevo (free SMTP key)", "host": "smtp-relay.brevo.com", "port": 587,
              "help": "Free plan: 300 emails a day. In Brevo: SMTP & API → SMTP → generate a key. Your login is shown there too."},
    "other": {"label": "Other SMTP server", "host": "", "port": 587, "help": "Any SMTP server with TLS."},
}
_test_log = {}


# ---- sending setup (owner) ----------------------------------------------------------------

def setup_info():
    s = store.settings()
    return {"presets": PRESETS, "provider": s.get("smtp_provider", ""), "host": s.get("smtp_host", ""),
            "port": s.get("smtp_port", 587), "user": s.get("smtp_user", ""), "from": s.get("smtp_from", ""),
            "has_password": store.has_secret("smtp"), "ready": ready()}


def save_setup(body):
    prov = body.get("provider") if body.get("provider") in PRESETS else "other"
    host = (body.get("host") or PRESETS[prov]["host"]).strip()
    port = int(body.get("port") or PRESETS[prov]["port"])
    if not host or port not in (25, 465, 587, 2525):
        raise ValueError("Check the server and port.")
    user = (body.get("user") or "").strip()
    frm = (body.get("from") or user).strip()
    if frm and not prefs.EMAIL_RE.match(frm):
        raise ValueError("The 'from' address doesn't look right.")
    store.save_settings({"smtp_provider": prov, "smtp_host": host, "smtp_port": port, "smtp_user": user, "smtp_from": frm})
    if body.get("password"):
        store.set_secret("smtp", body["password"])
    return setup_info()


def ready():
    s = store.settings()
    return bool(s.get("smtp_host") and s.get("smtp_user") and s.get("smtp_from") and store.has_secret("smtp"))


def _send(to, subject, text, html_body):
    s = store.settings()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = "Constable Hoagie <%s>" % s["smtp_from"]
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")
    ctx = ssl.create_default_context()
    port = int(s.get("smtp_port", 587))
    if port == 465:
        with smtplib.SMTP_SSL(s["smtp_host"], port, context=ctx, timeout=25) as smtp:
            smtp.login(s["smtp_user"], store.get_secret("smtp"))
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(s["smtp_host"], port, timeout=25) as smtp:
            smtp.starttls(context=ctx)
            smtp.login(s["smtp_user"], store.get_secret("smtp"))
            smtp.send_message(msg)


# ---- building the email (rules only) --------------------------------------------------------

def _when(st):
    raw = st.get("published") or ""
    try:
        d = parsedate_to_datetime(raw)
    except Exception:
        try:
            d = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except Exception:
            return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _recent(stories, tags, hours, n=5):
    cut = datetime.now(timezone.utc) - timedelta(hours=hours)
    out = []
    for s in stories:
        if not set(tags) & set(s["tags"]):
            continue
        w = _when(s)
        if w is not None and w < cut:
            continue
        out.append(s)
        if len(out) >= n:
            break
    return out


def build(key):
    """Returns (subject, text, html, sections) for one person, using only feeds and rules."""
    p = prefs.get(key)
    em = p["email"]
    bet = p["menu"] == "full"
    token = prefs.CURRENT.set({"key": key, "name": key})
    try:
        s = store.settings()
        amount, risk = float(s.get("daily_budget") or 25), int(s.get("risk") or 2)
        try:
            stories = feeds.news()
        except Exception:
            stories = []
        if not bet:
            stories = [x for x in stories if not prefs.BET_TAGS & set(x["tags"])]
        if prefs.bright_on(key):
            stories = feeds.bright(stories)
        elif prefs.upbeat_on(key):
            stories = feeds.uplift([x for x in stories if "Good news" not in x["tags"]])
        hours = int(em.get("window") or 24)
        sections = []
        for t in em["topics"]:
            if prefs.EMAIL_TOPICS.get(t, {}).get("betting") and not bet:
                continue
            if t == "play":
                c = engine._menu_play(amount, risk, stories, {"connected": False})["play"]
                f = c["facts"]
                sections.append(("Today's Play", [
                    ("The play", f["play"]), ("Where", "; ".join(w["text"] for w in f["where"])),
                    ("Bet", "$%.2f" % f["bet"]), ("Est. return", f["ret"]["text"]),
                    ("Confidence", (f["conf"]["word"] + (" · " + f["conf"]["text"] if f["conf"]["text"] else ""))),
                    ("Skip if", c["skip_if"])], None))
            elif t == "markets":
                rows = []
                try:
                    px = feeds.prices()
                    for k, v in (px.get("crypto") or {}).items():
                        rows.append((k, "$" + format(v, ",.0f")))
                    if (px.get("fx") or {}).get("CAD"):
                        rows.append(("USD → CAD", "%.4f" % px["fx"]["CAD"]))
                except Exception:
                    pass
                heads = _recent(stories, ["Stocks", "Crypto", "FX"], hours)
                sections.append(("Markets", rows, heads))
            elif t == "humanitarian":
                sections.append(("Humanitarian news", [], _recent(stories, ["Humanitarian"], hours)))
            elif t == "sports":
                sections.append(("Sports headlines", [], _recent(stories, ["NFL", "NBA", "NHL"], hours)))
            elif t == "give":
                o = give.featured(datetime.now().timetuple().tm_yday)
                sections.append(("A charity worth knowing", [(o["name"], o["program"]), ("Per dollar", o["per_dollar"]),
                                                             ("Why it matters", o["benefit"]), ("Learn more", o["learn"])], None))
            elif t == "games" and bet:
                g = sports.suggestions(risk, amount, limit=3)
                rows = [("%s · %s" % (x["league"], x["matchup"]),
                         "%s @ %s · bet $%.0f · win +$%.2f · %d%% (%s)" % (x["play"], x["price"], x["bet"], x["if_win"], x["confidence_pct"], x["basis"]))
                        for x in g["games"]]
                if rows:
                    rows.append(("Where", "NH: DraftKings only, while in NH (18+). TX: not legal."))
                sections.append(("Today's Games", rows or [("No games", "Nothing fits your risk level in the next day and a half.")], None))
    finally:
        prefs.CURRENT.reset(token)
    day = datetime.now().strftime("%a %b %d")
    subject = "🥪 Your Hoagie daily · %s" % day
    return subject, _text(sections, hours, bet), _html(sections, hours, bet, day), sections


FOOT = ("Built from your feeds by Constable Hoagie's own rules (no AI). Estimates, not promises; not financial advice. "
        "Change topics or turn this off at the Email counter in the app.")
GAMBLE = " Gambling problem? Call or text 1-800-GAMBLER."


def _text(sections, hours, bet):
    out = ["Your Hoagie daily (news from the last %d hours)" % hours, ""]
    for title, rows, heads in sections:
        out.append(title.upper())
        for k, v in rows:
            out.append("  %s: %s" % (k, v))
        for h in heads or []:
            out.append("  • %s (%s) %s" % (h["title"], ", ".join(h["sources"]), h["link"]))
        if not rows and not heads:
            out.append("  Nothing new in this window.")
        out.append("")
    out.append(FOOT + (GAMBLE if bet else ""))
    return "\n".join(out)


def _html(sections, hours, bet, day):
    e = html.escape
    parts = ['<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;color:#2b1d24">',
             '<div style="background:#c8102e;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">'
             '<div style="font-size:22px;font-weight:bold">Constable Hoagie · %s</div>'
             '<div style="font-size:13px;opacity:.9">Protecting &amp; Serving Your Dough · news from the last %d hours</div></div>'
             '<div style="background:#fff8ec;padding:6px 20px 16px;border:1px solid #e7d8bf;border-top:0;border-radius:0 0 12px 12px">' % (e(day), hours)]
    for title, rows, heads in sections:
        parts.append('<h2 style="font-size:17px;margin:18px 0 8px;color:#c8102e">%s</h2>' % e(title))
        if rows:
            parts.append('<table style="width:100%;border-collapse:collapse;font-size:14px">')
            for k, v in rows:
                val = e(str(v))
                if str(v).startswith("https://"):
                    val = '<a href="%s" style="color:#1a6fb3">%s</a>' % (e(v), e(v))
                parts.append('<tr><td style="padding:6px 8px;border-bottom:1px dashed #e0cfb2;font-weight:bold;width:34%%;vertical-align:top">%s</td>'
                             '<td style="padding:6px 8px;border-bottom:1px dashed #e0cfb2">%s</td></tr>' % (e(k), val))
            parts.append('</table>')
        if heads:
            parts.append('<ul style="padding-left:18px;margin:6px 0;font-size:14px">')
            for h in heads:
                parts.append('<li style="margin:6px 0"><a href="%s" style="color:#1a6fb3">%s</a> <span style="color:#7a6a70">· %s</span></li>'
                             % (e(h["link"] or "#"), e(h["title"]), e(", ".join(h["sources"]))))
            parts.append('</ul>')
        if not rows and not heads:
            parts.append('<p style="font-size:14px;color:#7a6a70">Nothing new in this window.</p>')
    parts.append('<p style="font-size:12px;color:#7a6a70;margin-top:18px">%s</p></div></div>' % e(FOOT + (GAMBLE if bet else "")))
    return "".join(parts)


# ---- sending ------------------------------------------------------------------------------

def send_to(key, test=False):
    p = prefs.get(key)
    to = p["email"]["address"]
    if not to:
        raise ValueError("Add your email address first.")
    if not ready():
        raise ValueError("Email sending isn't set up yet. The shop owner sets it up once at the Email counter.")
    if test:
        recent = [t for t in _test_log.get(key, []) if time.time() - t < 3600]
        if len(recent) >= 3:
            raise ValueError("That's 3 test emails this hour. Try again later.")
        _test_log[key] = recent + [time.time()]
    subject, text, body, _ = build(key)
    _send(to, ("[Test] " if test else "") + subject, text, body)
    log.info("daily email sent to %s (%s)%s", key, to.split("@")[-1], " [test]" if test else "")
    return {"ok": True, "to": to}


def _due(em, now):
    if not em.get("on") or not em.get("address"):
        return False
    if em.get("days") == "weekdays" and now.weekday() >= 5:
        return False
    today = now.strftime("%Y-%m-%d")
    return now.strftime("%H:%M") >= em.get("time", "07:00") and not str(em.get("last_sent", "")).startswith(today)


_daily = {"day": ""}


def _daily_jobs():
    """Once a day: refresh connected brokers and save a net-worth snapshot (so the chart fills in)."""
    today = datetime.now().strftime("%Y-%m-%d")
    if _daily["day"] == today:
        return
    _daily["day"] = today
    try:
        from . import brokers, portfolio
        brokers.sync_all()
        portfolio.valued()
    except Exception as e:
        log.info("daily jobs: %s", e)


def _loop():
    time.sleep(20)
    last_poll = 0
    while True:
        if time.time() - last_poll > 7200:          # autopatch: check GitHub for Claude's fixes every 2 hours
            last_poll = time.time()
            try:
                from . import autopatch
                autopatch.poll()
            except Exception:
                pass
        try:
            _daily_jobs()
        except Exception:
            pass
        try:
            if ready():
                now = datetime.now()
                for key, p in prefs.everyone():
                    if _due(p["email"], now):
                        try:
                            send_to(key)
                        except Exception as e:
                            log.warning("daily email for %s failed: %s", key, e)
                        prefs.mark_sent(key, now.strftime("%Y-%m-%d %H:%M"))   # one try a day, so a bad setup can't spam
        except Exception as e:
            log.warning("email scheduler hiccup: %s", e)
        time.sleep(60)


def start():
    threading.Thread(target=_loop, name="hoagie-email", daemon=True).start()
