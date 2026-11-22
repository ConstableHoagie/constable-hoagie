"""Where Constable Hoagie keeps its settings, secrets, logs and history.

Data lives in %LOCALAPPDATA%\\ConstableHoagie on Windows (~/.constable-hoagie elsewhere).
Secrets (API keys) go to Windows Credential Manager through the `keyring` package when it
is installed (setup installs it). Without keyring they fall back to secrets.json in the data
folder, and the Connect counter says so.
"""
import json
import re
import logging
import os
import threading
import time
from pathlib import Path

APP = "ConstableHoagie"

if os.name == "nt":
    DATA = Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP
else:
    DATA = Path.home() / ".constable-hoagie"
DATA.mkdir(parents=True, exist_ok=True)
(DATA / "logs").mkdir(exist_ok=True)
(DATA / "cache").mkdir(exist_ok=True)
(DATA / "uploads").mkdir(exist_ok=True)

LOG_FILE = DATA / "logs" / "hoagie.log"
logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("hoagie")

_lock = threading.Lock()

DEFAULT_SETTINGS = {
    "hub_path": "",            # Gambling hub folder (read-only). Empty = not connected.
    "ask_engine": "auto",      # auto | claude | tavily | brave | foundry
    "claude_path": "",         # blank = find "claude" on PATH
    "claude_model": "",        # blank = auto (quick questions: haiku; the rest: account default)
    "foundry_url": "",         # blank = auto-detect Foundry Local
    "home_state": "NH",
    "risk": 2,                 # 1 (careful) .. 5 (spicy)
    "daily_budget": 25,
    "feeds": [
        {"name": "ESPN NFL", "url": "https://www.espn.com/espn/rss/nfl/news", "tags": ["NFL"]},
        {"name": "ESPN NHL", "url": "https://www.espn.com/espn/rss/nhl/news", "tags": ["NHL"]},
        {"name": "ESPN NBA", "url": "https://www.espn.com/espn/rss/nba/news", "tags": ["NBA"]},
        {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "tags": ["Crypto"]},
        {"name": "CNBC Markets", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "tags": ["Stocks"]},
        {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex", "tags": ["Stocks"]},
        {"name": "FXStreet", "url": "https://www.fxstreet.com/rss/news", "tags": ["FX"]},
    ],
    "onboarded": False,
    "share_tab_with_guests": False,  # private sharing: guests don't see your holdings unless you say so
    "allowed_origins": [],            # extra web addresses allowed to call the app (Share Online sets this)
    "owner_emails": [],               # emails allowed through the Cloudflare login wall (for reference)
    "require_login_local": False,     # True = the login screen shows on this PC too
    "online_host": "",                # e.g. beta.constablehoagie.com (Share Online sets this)
    "bet_states": ["NH", "TX"],
    "snaptrade_optin": None,
    "ai_default": "auto",             # claude | openai | gemini | agent | groq | openrouter | foundry | auto
    "ai_models": {},                  # chosen model per provider (blank = Hoagie picks)
    "agent_url": "",                  # your own OpenAI-compatible agent, e.g. http://localhost:11434/v1
    "ai_set": False,
    "sleeper_user": "",
    "local_tier": "",
    "autopatch_on": False,            # send scrubbed error reports to GitHub (or the owner's website)
    "autopatch_threshold": 3,         # a new error must repeat this many times in 24 h before Claude sees it
    "autopatch_daily_cap": 3,         # at most this many issues a day
    "autopatch_report_to": "",        # friends' copies forward here (default: the owner's website)
    "github_repo": "",                # owner/repo (defaults to app/version.json "repo")                 # "zerocool" on an admin's own PC (set by app/seed/zerocool.flag)               # Sleeper fantasy username (public, read-only)                  # picked a brain during setup          # asked during install: True/False (None = not asked)       # states shown on every bet's "Where" line
    "smtp_provider": "", "smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_from": "",   # daily email sending (password in the secure store)
}


def _read(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except Exception as e:  # corrupt file: keep a copy, start fresh
        log.warning("could not read %s: %s", path, e)
        try:
            path.rename(path.with_suffix(".broken-%d" % int(time.time())))
        except Exception:
            pass
        return default


def _write(path, data):
    tmp = path.with_suffix(".part")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    tmp.replace(path)


def settings():
    with _lock:
        s = dict(DEFAULT_SETTINGS)
        s.update(_read(DATA / "settings.json", {}))
        return s


def save_settings(changes):
    with _lock:
        s = dict(DEFAULT_SETTINGS)
        s.update(_read(DATA / "settings.json", {}))
        for k, v in changes.items():
            if k in DEFAULT_SETTINGS:
                s[k] = v
        _write(DATA / "settings.json", s)
        return s


# ---- secrets -------------------------------------------------------------------------

SECRET_NAMES = {
    "fantasypros": "FantasyPros API key",
    "tavily": "Tavily search key",
    "brave": "Brave Search key",
    "oddsapi": "The Odds API key",
    "smtp": "Email sending password (app password or SMTP key)",
    "fred": "FRED (St. Louis Fed) API key",
    "github_token": "GitHub token (autopatcher)",
    "openai": "OpenAI (GPT) API key",
    "gemini": "Google Gemini API key",
    "groq": "Groq API key",
    "openrouter": "OpenRouter API key",
    "agent": "Your agent's API key (optional)",
    "kalshi_key_id": "Kalshi API key ID",
    "kalshi_private_key": "Kalshi private key",
    "finnhub": "Finnhub API key",
    "coinbase_key_name": "Coinbase API key name",
    "coinbase_private_key": "Coinbase API private key",
}

try:
    import keyring  # type: ignore
    _HAS_KEYRING = True
except Exception:
    keyring = None
    _HAS_KEYRING = False


def secure_store():
    return "Windows Credential Manager" if _HAS_KEYRING else "a local file (install keyring for better protection)"


def _allowed(name):
    """Fixed names, plus per-person bank links and per-broker keys (kept out of the generic /api/secret route)."""
    return name in SECRET_NAMES or bool(re.match(r"^(simplefin|broker|notify):[a-z0-9_:.-]{1,80}$", name or ""))


def get_secret(name):
    if not _allowed(name):
        return ""
    if _HAS_KEYRING:
        try:
            return keyring.get_password(APP, name) or ""
        except Exception as e:
            log.warning("keyring read failed: %s", e)
    return _read(DATA / "secrets.json", {}).get(name, "")


def set_secret(name, value):
    if not _allowed(name):
        raise ValueError("unknown secret")
    value = (value or "").strip()
    if _HAS_KEYRING:
        try:
            if value:
                keyring.set_password(APP, name, value)
            else:
                try:
                    keyring.delete_password(APP, name)
                except Exception:
                    pass
            return
        except Exception as e:
            log.warning("keyring write failed, using file: %s", e)
    with _lock:
        s = _read(DATA / "secrets.json", {})
        if value:
            s[name] = value
        else:
            s.pop(name, None)
        _write(DATA / "secrets.json", s)


def has_secret(name):
    return bool(get_secret(name))


# ---- small json stores -----------------------------------------------------------------

def load(name, default):
    with _lock:
        return _read(DATA / (name + ".json"), default)


def save(name, data):
    with _lock:
        _write(DATA / (name + ".json"), data)


def append_history(record):
    record = dict(record, at=time.strftime("%Y-%m-%d %H:%M:%S"))
    with _lock:
        with open(DATA / "plays.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")


def cache_get(key, max_age):
    p = DATA / "cache" / (key + ".json")
    try:
        if time.time() - p.stat().st_mtime < max_age:
            return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None


def cache_put(key, data):
    p = DATA / "cache" / (key + ".json")
    try:
        _write(p, data)
    except Exception as e:
        log.warning("cache write failed: %s", e)
