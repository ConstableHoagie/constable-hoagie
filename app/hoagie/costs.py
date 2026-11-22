"""Cost tracker: where your money goes, per person. Add by hand, import a bank CSV, or sync
read-only from your bank (bank.py). Export to CSV any time.
"""
import csv
import io
import re
import time
import uuid
from datetime import datetime

from . import prefs, store

CATEGORIES = ["Housing", "Groceries", "Dining out", "Transport", "Utilities", "Subscriptions", "Health",
              "Shopping", "Fun", "Betting & lottery", "Debt payments", "Savings & investing", "Income", "Other"]
# Simple keyword rules for auto-categorizing bank and CSV transactions. First match wins.
RULES = [
    ("Income", r"payroll|direct dep|salary|paycheck|deposit from|interest paid"),
    ("Betting & lottery", r"draftkings|fanduel|betmgm|caesars sport|lottery|powerball|mega ?millions|prizepicks|underdog"),
    ("Savings & investing", r"robinhood|coinbase|fidelity|vanguard|schwab|alpaca|kraken|acorns|betterment|wealthfront"),
    ("Groceries", r"market basket|hannaford|shaw'?s|whole foods|trader joe|aldi|kroger|heb\b|safeway|grocery|walmart sup"),
    ("Dining out", r"doordash|uber ?eats|grubhub|mcdonald|starbucks|dunkin|chipotle|pizza|restaurant|cafe|subway|taco|burger"),
    ("Transport", r"shell|exxon|mobil|sunoco|irving|gulf|uber(?! ?eats)|lyft|parking|toll|e-?zpass|gas station"),
    ("Utilities", r"eversource|electric|unitil|water|sewer|comcast|xfinity|verizon|t-mobile|at&t|spectrum|internet"),
    ("Subscriptions", r"netflix|spotify|hulu|disney\\+|youtube|apple\\.com/bill|amazon prime|claude|anthropic|openai|adobe|patreon"),
    ("Housing", r"rent|mortgage|hoa\b|property mgmt|landlord"),
    ("Health", r"pharmacy|cvs|walgreens|doctor|dental|medical|hospital|gym|fitness"),
    ("Debt payments", r"credit card payment|loan payment|navient|sallie mae|capital one pmt|discover pmt|autopay"),
    ("Shopping", r"amazon|target|best buy|home depot|lowe'?s|etsy|ebay|walmart"),
]


def categorize(desc):
    d = (desc or "").lower()
    for cat, pat in RULES:
        if re.search(pat, d):
            return cat
    return "Other"


def _key():
    return re.sub(r"[^a-z0-9_-]", "_", prefs.me()["key"].lower())


def _load():
    return store.load("costs-" + _key(), {"items": [], "budgets": {}})


def _save(d):
    d["items"] = sorted(d["items"], key=lambda x: x["date"], reverse=True)[:20000]
    store.save("costs-" + _key(), d)


def _clean(e, source="manual"):
    date = str(e.get("date") or time.strftime("%Y-%m-%d"))[:10]
    datetime.strptime(date, "%Y-%m-%d")
    amt = round(float(e.get("amount") or 0), 2)
    if not amt:
        raise ValueError("Enter an amount.")
    desc = str(e.get("note") or e.get("description") or "").strip()[:120]
    cat = e.get("category") if e.get("category") in CATEGORIES else categorize(desc)
    return {"id": e.get("id") or uuid.uuid4().hex[:10], "date": date, "amount": amt, "category": cat,
            "note": desc, "source": source}


def add(e):
    d = _load()
    item = _clean(e)
    d["items"] = [i for i in d["items"] if i["id"] != item["id"]] + [item]
    _save(d)
    return item


def delete(item_id):
    d = _load()
    d["items"] = [i for i in d["items"] if i["id"] != item_id]
    _save(d)
    return {"ok": True}


def set_budget(cat, amount):
    d = _load()
    if cat not in CATEGORIES:
        raise ValueError("Unknown category.")
    if amount:
        d["budgets"][cat] = round(float(amount), 2)
    else:
        d["budgets"].pop(cat, None)
    _save(d)
    return d["budgets"]


def merge_bank(txns):
    """Add bank transactions (from bank.py), skipping ones already imported."""
    d = _load()
    have = {i["id"] for i in d["items"]}
    added = 0
    for t in txns:
        tid = "bank-" + str(t["id"])
        if tid in have:
            continue
        try:
            d["items"].append(_clean({"id": tid, "date": t["date"], "amount": -t["amount"], "note": t["description"]}, "bank"))
            added += 1
        except Exception:
            continue
    _save(d)
    return added


def import_csv(text):
    """Bank CSV exports vary; find date, description and amount columns by name."""
    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 2:
        raise ValueError("That CSV looks empty.")
    head = [h.strip().lower() for h in rows[0]]
    def col(*names):
        for n in names:
            for i, h in enumerate(head):
                if n in h:
                    return i
        return None
    ci_date, ci_desc = col("date", "posted"), col("description", "payee", "merchant", "name", "memo")
    ci_amt, ci_debit, ci_credit = col("amount"), col("debit", "withdrawal"), col("credit", "deposit")
    if ci_date is None or (ci_amt is None and ci_debit is None):
        raise ValueError("Couldn't find Date and Amount columns. Columns found: " + ", ".join(rows[0]))
    d = _load()
    added = 0
    # Checking accounts usually show money out as negative; credit cards usually show charges as positive.
    signs = []
    for r in rows[1:]:
        try:
            if ci_amt is not None:
                signs.append(float(re.sub(r"[^0-9.\-]", "", r[ci_amt]) or 0))
        except Exception:
            pass
    charges_positive = sum(1 for s in signs if s > 0) > sum(1 for s in signs if s < 0)
    for r in rows[1:]:
        try:
            raw = r[ci_date].strip()
            dt = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%b %d, %Y"):
                try:
                    dt = datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    pass
            if not dt:
                continue
            num = lambda s: float(re.sub(r"[^0-9.\-]", "", s) or 0)
            if ci_amt is not None:
                amt = num(r[ci_amt])
                spend = amt if charges_positive else -amt
            else:
                spend = num(r[ci_debit]) - (num(r[ci_credit]) if ci_credit is not None else 0)
            desc = r[ci_desc] if ci_desc is not None else ""
            tid = "csv-%s-%s-%.2f" % (dt, re.sub(r"\W", "", desc)[:20], spend)
            if any(i["id"] == tid for i in d["items"]):
                continue
            d["items"].append(_clean({"id": tid, "date": dt, "amount": spend, "note": desc}, "csv"))
            added += 1
        except Exception:
            continue
    _save(d)
    return {"added": added}


def month(ym=None):
    ym = ym or time.strftime("%Y-%m")
    d = _load()
    items = [i for i in d["items"] if i["date"].startswith(ym)]
    spend = [i for i in items if i["amount"] > 0 and i["category"] not in ("Income",)]
    income = -sum(i["amount"] for i in items if i["amount"] < 0)
    by = {}
    for i in spend:
        by[i["category"]] = round(by.get(i["category"], 0) + i["amount"], 2)
    months = sorted({i["date"][:7] for i in d["items"]}, reverse=True)[:24]
    trend = []
    for m in sorted(months)[-6:]:
        trend.append({"month": m, "spent": round(sum(i["amount"] for i in d["items"] if i["date"].startswith(m) and i["amount"] > 0 and i["category"] != "Income"), 2)})
    return {"month": ym, "items": items, "by_category": by, "spent": round(sum(i["amount"] for i in spend), 2),
            "income": round(income, 2), "budgets": d["budgets"], "categories": CATEGORIES, "months": months or [ym], "trend": trend}


def export_csv(ym=None):
    d = _load()
    items = [i for i in d["items"] if not ym or i["date"].startswith(ym)]
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Date", "Amount", "Category", "Note", "Source"])
    for i in sorted(items, key=lambda x: x["date"]):
        w.writerow([i["date"], "%.2f" % i["amount"], i["category"], i["note"], i["source"]])
    return out.getvalue()
