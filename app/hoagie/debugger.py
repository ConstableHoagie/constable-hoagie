"""The Health Inspector: checks that everything Hoagie needs is working, and packs a bug
report (logs, settings, what went wrong) into one zip you can drop into a Claude chat.
Secrets are scrubbed from everything that goes in the zip.
"""
import json
import os
import platform
import re
import sys
import time
import zipfile
from pathlib import Path

from . import ai, feeds, store

from . import updater  # noqa: E402
VERSION = updater.info()["version"]
log = store.log
CLIENT_LOG = store.DATA / "logs" / "client.log"


def client_error(entry):
    try:
        from . import autopatch
        autopatch.capture("browser", entry.get("msg") or entry.get("message") or "", entry.get("stack") or "", entry.get("where") or entry.get("url") or "")
    except Exception:
        pass
    line = json.dumps({"at": time.strftime("%Y-%m-%d %H:%M:%S"), **{k: str(v)[:2000] for k, v in entry.items()}})
    with open(CLIENT_LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def checks():
    out = []

    def add(name, ok, detail, fix=""):
        out.append({"name": name, "ok": bool(ok), "detail": detail, "fix": fix})

    add("Hoagie's engine (Python)", True, "Python %s on %s" % (platform.python_version(), platform.system()))
    try:
        feeds.http_get("https://api.coinbase.com/v2/prices/BTC-USD/spot", timeout=8)
        add("Internet", True, "Online")
    except Exception as e:
        add("Internet", False, str(e)[:120], "Check your Wi-Fi or VPN.")
    cs = ai.claude_status()
    add("Claude", cs["ok"], cs.get("version") or cs.get("why", ""),
        "" if cs["ok"] else "Connect counter → Claude → Install, then run 'claude auth login'.")
    for key, label in (("tavily", "Tavily search"), ("fantasypros", "FantasyPros"), ("brave", "Brave Search")):
        add(label, store.has_secret(key), "Key saved" if store.has_secret(key) else "Not connected (optional)",
            "" if store.has_secret(key) else "Connect counter → %s." % label)
    hub = feeds.hub_summary()
    add("Gambling hub folder", hub["connected"], "Reading %d sport(s)" % len(hub.get("picks", [])) if hub["connected"] else hub["reason"],
        "" if hub["connected"] else "Connect counter → Sports desk folder (optional).")
    bad = []
    for f in store.settings().get("feeds", []):
        try:
            feeds.http_get(f["url"], timeout=8)
        except Exception:
            bad.append(f["name"])
    add("News feeds", not bad, "All feeds answering" if not bad else "Not answering: " + ", ".join(bad),
        "" if not bad else "Usually temporary. If it lasts, a feed moved: report a bug.")
    add("Key storage", "Credential" in store.secure_store(), store.secure_store(),
        "" if "Credential" in store.secure_store() else "Re-run setup to install keyring.")
    return out


def _tail(path, n=400):
    try:
        lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(lines[-n:])
    except FileNotFoundError:
        return ""


def _scrub(text):
    for name in store.SECRET_NAMES:
        v = store.get_secret(name)
        if v and len(v) > 4:
            text = text.replace(v, "[%s removed]" % name)
    text = re.sub(r"(?i)(api[_-]?key|token|secret|password)(\"?\s*[:=]\s*\"?)[^\s\",]+", r"\1\2[removed]", text)
    return text


def report(note="", client_state=None):
    stamp = time.strftime("%Y%m%d-%H%M%S")
    desktop = Path.home() / "Desktop"
    folder = desktop if desktop.is_dir() else store.DATA
    path = folder / ("ConstableHoagie-bug-%s.zip" % stamp)
    s = store.settings()
    summary = {
        "version": VERSION, "when": stamp, "python": sys.version, "os": platform.platform(),
        "note": note, "engines": ai.engines(), "secure_store": store.secure_store(),
        "settings": {k: v for k, v in s.items() if k != "feeds"}, "feeds": [f["name"] for f in s.get("feeds", [])],
        "client_state": client_state or {},
    }
    try:
        summary["checks"] = checks()
    except Exception as e:
        summary["checks_error"] = str(e)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("README.txt", "Constable Hoagie bug report.\nDrop this zip into a Claude chat and say what went wrong.\n"
                                 "Your API keys were removed before zipping.\n\nYour note: %s\n" % note)
        z.writestr("summary.json", _scrub(json.dumps(summary, indent=2)))
        z.writestr("hoagie.log", _scrub(_tail(store.LOG_FILE)))
        z.writestr("client.log", _scrub(_tail(CLIENT_LOG)))
        z.writestr("recent-plays.jsonl", _scrub(_tail(store.DATA / "plays.jsonl", 50)))
    log.info("bug report written to %s", path)
    if os.name == "nt":
        try:
            os.startfile(str(folder))  # show it in Explorer
        except Exception:
            pass
    return str(path)


def diagnose_with_claude():
    text = "Checks:\n" + json.dumps(checks(), indent=1) + "\n\nRecent log:\n" + _scrub(_tail(store.LOG_FILE, 120)) + \
           "\n\nRecent screen errors:\n" + _scrub(_tail(CLIENT_LOG, 40))
    prompt = (ai.HOAGIE_VOICE + "\n\nYou're also the app's mechanic. Here are the app's health checks and logs. "
              "Say in plain words what's wrong (if anything) and the single next step to fix it. "
              "Max 5 short lines.\n\n" + text[:12000])
    return ai.ask_claude(prompt, allow_web=False)
