"""Constable Hoagie's kitchen: a small local web server at http://127.0.0.1:8787.

Only this computer can reach it (it listens on 127.0.0.1). Run with:  python server.py
The launcher (Start Constable Hoagie.cmd) does this for you and opens the browser.
"""
import json
import re
import mimetypes
import os
import sys
import threading
import traceback
import time
import webbrowser
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).parent))

from hoagie import autopatch, sports, agentapi, bets, demo, handoff, tour, integrations, insights, ai, auth, bank, brokers, costs, debugger, digest, engine, feeds, give, portfolio, prefs, store, updater  # noqa: E402

PORT = int(os.environ.get("HOAGIE_PORT", "8787"))
PUBLIC_FILES = {"login.html", "app.css", "art.js", "art-neon.js", "look.js"}  # all a signed-out visitor can load
# Things a guest (someone visiting through private sharing) can't do: change your keys or settings,
# update or roll back the app, open pages on your PC, or write files to your desktop.
OWNER_ONLY = {"/api/ai/setup", "/api/agent/tokens", "/api/agent/revoke", "/api/bets/kalshi", "/api/brokers/save", "/api/brokers/sync", "/api/brokers/remove", "/api/brokers/order", "/api/brokers/settings", "/api/brokers/portal", "/api/email/setup", "/api/auth/users", "/api/secret", "/api/settings", "/api/update/apply", "/api/update/rollback", "/api/open",
              "/api/bug", "/api/diagnose", "/api/portfolio/item", "/api/portfolio/delete", "/api/portfolio/screenshot"}
WEB = Path(__file__).parent / "web"
log = store.log


def status():
    s = store.settings()
    eng = ai.engines()
    return {
        "version": debugger.VERSION,
        "onboarded": s.get("onboarded"),
        "engines": eng,
        "engine_in_use": ai.pick_engine(s.get("ask_engine", "auto")),
        "secrets": {k: store.has_secret(k) for k in store.SECRET_NAMES},
        "secure_store": store.secure_store(),
        "settings": {k: s.get(k) for k in ("ai_default", "agent_url", "ai_set", "sleeper_user", "hub_path", "ask_engine", "home_state", "risk", "daily_budget", "claude_path", "claude_model", "foundry_url", "share_tab_with_guests", "require_login_local")},
        "hub": bool(s.get("hub_path")),
        "snaptrade_optin": s.get("snaptrade_optin"),
        "bank_connected": bool(bank.status().get("connected")),
        "brokers_connected": sorted(store.load("brokers", {"connected": {}}).get("connected", {}).keys()),
    }


def special():
    """Today's Special: at most three bite-size things worth knowing."""
    items = []
    try:
        stories = feeds.news()
        if prefs.bright_on():
            stories = feeds.bright(stories)
        else:
            stories = [x for x in stories if "Good news" not in x["tags"]]
            if prefs.upbeat_on():
                stories = feeds.uplift(stories)
    except Exception as e:
        log.info("special news failed: %s", e)
        stories = []
    px = {}
    try:
        px = feeds.prices()
    except Exception:
        pass
    hub = {}
    try:
        hub = feeds.hub_summary()
    except Exception:
        pass
    if hub.get("connected") and hub.get("picks") and prefs.betting_on():
        p = hub["picks"][0]
        if p["headlines"]:
            items.append({"emoji": "🏈", "tag": p["sport"], "title": "Your sports desk has a %s card" % p["sport"],
                          "line": p["headlines"][0], "more": "Updated %s · %s" % (p["updated"], p["file"])})
    if not prefs.betting_on():
        stories = [s for s in stories if not prefs.BET_TAGS & set(s["tags"])]
        hub = {}
    top = [st for st in stories if st["impact"] == "high"][:3] or stories[:3]
    for st in top:
        if len(items) >= 2:
            break
        items.append({"emoji": "📰", "tag": " · ".join(st["tags"][:3]) or "News", "title": st["title"],
                      "line": st["summary"][:160], "link": st["link"], "more": "From " + ", ".join(st["sources"])})
    if px.get("crypto") or px.get("fx"):
        bits = ["BTC $%s" % format(px["crypto"]["BTC"], ",.0f")] if "BTC" in px.get("crypto", {}) else []
        cad = px.get("fx", {}).get("CAD")
        if cad:
            prev = px.get("fx_prev", {}).get("CAD")
            arrow = "" if not prev else (" ▲" if cad > prev else " ▼" if cad < prev else "")
            bits.append("$1 = %.4f CAD%s" % (cad, arrow))
        items.append({"emoji": "💵", "tag": "Prices", "title": " · ".join(bits) or "Prices", "line": "As of %s" % px.get("as_of", ""),
                      "more": "Crypto from Coinbase's public price feed; currency from the European Central Bank (via Frankfurter)."})
    return {"items": items[:3], "news": stories[:30], "prices": px, "hub": hub}


class Handler(BaseHTTPRequestHandler):
    server_version = "ConstableHoagie"

    def log_message(self, fmt, *args):
        pass  # keep the console quiet; errors go to the log file

    # ---- helpers
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        # safety headers on every answer: no framing, no type guessing, no referrer leaks, no indexing
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        super().end_headers()

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        # strangers can send a sign-in and nothing big; signed-in people can upload screenshots
        limit = 16 * 1024 if self._need_login() else 15 * 1024 * 1024
        if n > limit:
            raise ValueError("too large")
        if not n:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8"))

    # ---- who's calling: you on this PC, or a visitor coming in through Share Online / Share Privately
    def _remote(self):
        """Arrived through Tailscale or a Cloudflare tunnel (or any non-local address) = remote."""
        h = self.headers
        if h.get("Tailscale-User-Login") or h.get("X-Forwarded-For") or h.get("Cf-Connecting-Ip") or h.get("Cf-Access-Authenticated-User-Email"):
            return True
        host = (h.get("Host") or "").split(":")[0].lower()
        return host not in ("127.0.0.1", "localhost", "")

    def _token(self):
        c = SimpleCookie()
        try:
            c.load(self.headers.get("Cookie") or "")
        except Exception:
            return ""
        return c["hoagie_session"].value if "hoagie_session" in c else ""

    def _session(self):
        return auth.session(self._token())

    def _demo(self):
        """A visitor touring the simulated demo shop (cookie set by 'Try the demo')."""
        c = SimpleCookie()
        try:
            c.load(self.headers.get("Cookie") or "")
        except Exception:
            return None
        k = c["hoagie_demo"].value if "hoagie_demo" in c else ""
        return k if k and demo.get(k) else None

    def _need_login(self):
        """Everyone from outside this PC signs in first (and you too, if you turned on 'lock on this PC')."""
        locked = self._remote() or store.settings().get("require_login_local")
        return bool(locked) and not self._session() and not self._demo()

    def _guest(self):
        """Remote visitors get the guest pass unless they signed in with an owner login."""
        if not self._remote():
            return False
        s = self._session()
        return not (s and s["role"] == "owner")

    def _addr(self):
        h = self.headers
        return h.get("Cf-Connecting-Ip") or (h.get("X-Forwarded-For") or "").split(",")[0].strip() or self.client_address[0]

    def _cookie_header(self, token, max_age):
        secure = "; Secure" if self._remote() else ""
        return "hoagie_session=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d%s" % (token, max_age, secure)

    def _origin_ok(self):
        """Only pages from this app may call the API (blocks other websites in your browser).
        Same-site pages are fine: local, the same host the request came to, or a private-sharing address."""
        origin = self.headers.get("Origin")
        if origin in (None, "http://127.0.0.1:%d" % PORT, "http://localhost:%d" % PORT):
            return True
        o = urlparse(origin)
        if o.netloc and o.netloc == (self.headers.get("X-Forwarded-Host") or self.headers.get("Host")):
            return True
        if self.headers.get("Tailscale-User-Login") and o.scheme == "https" and o.hostname and o.hostname.endswith(".ts.net"):
            return True
        return origin in store.settings().get("allowed_origins", [])

    # ---- routes
    def _agent(self, method):
        """/agent/v1/*: other apps and AI agents, with a personal token (no cookies, no browser)."""
        url = urlparse(self.path)
        try:
            tok = agentapi.check(self.headers.get("Authorization"), self._addr())
        except PermissionError as e:
            return self._send(401, {"error": str(e)})
        try:
            body = {}
            if method == "POST":
                n = int(self.headers.get("Content-Length") or 0)
                if n > 64 * 1024:
                    return self._send(413, {"error": "too large"})
                body = json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
            res = agentapi.handle(method, url.path, body, tok)
            return self._send(200 if res is not None else 404, res if res is not None else {"error": "unknown"})
        except PermissionError as e:
            return self._send(403, {"error": str(e)})
        except Exception as e:
            log.info("agent %s %s failed: %s", method, url.path, e)
            return self._send(400, {"error": str(e)})

    def do_GET(self):
        url = urlparse(self.path)
        if url.path.startswith("/agent/v1"):
            return self._agent("GET")
        if url.path.startswith("/auth/link/"):
            try:
                token, sess = auth.link_login(url.path.rsplit("/", 1)[-1], self._addr())
            except PermissionError as e:
                return self._send(403, ("<!doctype html><meta charset=utf-8><title>Link expired</title><body style='font-family:system-ui;padding:40px'>"
                                        "<h2>🔒 %s</h2><p><a href='/login.html'>Go to the sign-in page</a></p>" % e).encode(), "text/html; charset=utf-8")
            self.send_response(302)
            self.send_header("Set-Cookie", self._cookie_header(token, auth.SESSION_DAYS * 86400))
            self.send_header("Set-Cookie", "hoagie_demo=; Path=/; Max-Age=0")
            self.send_header("Location", "/?enter=1&welcome=1")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        if self._need_login():
            # Signed out: only the login page and what it needs; every feature stays hidden.
            if url.path == "/api/auth/status":
                return self._send(200, {"signed_in": False, "has_logins": bool(auth.users())})
            if url.path.startswith("/api/"):
                return self._send(401, {"error": "Please sign in.", "login": True})
            if url.path.lstrip("/") not in PUBLIC_FILES:
                url = urlparse("/login.html")
        if url.path.startswith("/media/"):
            return self._media(url.path)
        if url.path.startswith("/api/"):
            return self._api("GET", url.path, parse_qs(url.query), {})
        path = WEB / (url.path.lstrip("/") or "index.html")
        try:
            path = path.resolve()
            if WEB.resolve() not in path.parents and path != WEB.resolve() / "index.html":
                raise FileNotFoundError
            data = path.read_bytes()
        except Exception:
            return self._send(404, b"not found", "text/plain")
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript",):
            ctype += "; charset=utf-8"
        self._send(200, data, ctype)

    def do_POST(self):
        url = urlparse(self.path)
        if url.path.startswith("/agent/v1") and not self.headers.get("Cookie"):
            return self._agent("POST")
        if url.path == "/report":
            try:
                n = int(self.headers.get("Content-Length") or 0)
                if n > 8 * 1024:
                    return self._send(413, {"error": "too large"})
                return self._send(200, autopatch.receive_remote(json.loads(self.rfile.read(n) or b"{}"), self._addr()))
            except PermissionError as e:
                return self._send(429, {"error": str(e)})
            except Exception:
                return self._send(400, {"error": "bad report"})
        if not self._origin_ok():
            return self._send(403, {"error": "not allowed"})
        if url.path in ("/api/auth/login", "/api/auth/logout"):
            return self._auth(url.path)
        if url.path in ("/api/auth/demo", "/api/auth/demo/end"):
            return self._demo_auth(url.path)
        _dk = self._demo()
        if _dk and (not self._session() or (demo.get(_dk) or {}).get("tour")):
            try:
                body = self._body()
            except Exception:
                return self._send(400, {"error": "bad request"})
            return self._api("POST", url.path, parse_qs(url.query), body)
        if self._need_login():
            return self._send(401, {"error": "Please sign in.", "login": True})
        if self._guest() and url.path in OWNER_ONLY:
            return self._send(403, {"error": "That's owner-only. Ask the shop owner to change it on their PC."})
        try:
            body = self._body()
        except Exception:
            return self._send(400, {"error": "bad request"})
        self._api("POST", url.path, parse_qs(url.query), body)

    def _media(self, path):
        """The private media library (media/ next to app/): Zero Cool admins only."""
        sess = self._session()
        admin = (sess and sess["role"] == "owner") or (not sess and not self._remote() and store.settings().get("local_tier") == "zerocool")
        if not admin:
            return self._send(403, b"Zero Cool access only.", "text/plain")
        root = (Path(__file__).parent.parent / "media").resolve()
        try:
            f = (root / path[len("/media/"):]).resolve()
            if root not in f.parents or not f.is_file():
                raise FileNotFoundError
            data = f.read_bytes()
        except Exception:
            return self._send(404, b"not found", "text/plain")
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        if ctype.startswith("text/"):
            ctype += "; charset=utf-8"
        self._send(200, data, ctype)

    def _demo_auth(self, path):
        old = self._demo()
        try:
            body = self._body()
        except Exception:
            body = {}
        if path == "/api/auth/demo/end":
            if old:
                demo.end(old)
            hdr, data = "hoagie_demo=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0", {"ok": True}
        else:
            try:
                prev = demo.get(old)["idx"] if old else None
                if old:
                    demo.end(old)
                key, st = demo.start(self._addr(), avoid=prev, menu=body.get("menu"), tour=bool(body.get("tour")))
            except PermissionError as e:
                return self._send(429, {"error": str(e)})
            secure = "; Secure" if self._remote() else ""
            hdr = "hoagie_demo=%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d%s" % (key, demo.DEMO_HOURS * 3600, secure)
            data = {"ok": True, "persona": st["p"]["name"], "blurb": st["p"]["blurb"]}
        raw = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Set-Cookie", hdr)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _auth(self, path):
        try:
            body = self._body()
        except Exception:
            return self._send(400, {"error": "bad request"})
        if path == "/api/auth/logout":
            auth.logout(self._token())
            data = json.dumps({"ok": True}).encode()
            self.send_response(200)
            self.send_header("Set-Cookie", self._cookie_header("", 0))
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        try:
            token, sess = auth.login(body.get("username", body.get("name", "")), body.get("password", body.get("passcode", "")), self._addr())
        except PermissionError as e:
            return self._send(401, {"error": str(e)})
        data = json.dumps({"ok": True, "name": sess["name"], "role": sess["role"]}).encode()
        self.send_response(200)
        self.send_header("Set-Cookie", self._cookie_header(token, auth.SESSION_DAYS * 86400))
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _api(self, method, path, q, body):
        sess = self._session()
        dk = self._demo()
        if dk and sess and not (demo.get(dk) or {}).get("tour"):
            dk = None                      # signed-in people only see demo data during a guided tour
        if dk:
            try:
                res = demo.route(method, path, q, body, dk, remote=self._remote())
                if isinstance(res, dict) and "__csv__" in res:
                    data = res["__csv__"].encode("utf-8-sig")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/csv; charset=utf-8")
                    self.send_header("Content-Disposition", 'attachment; filename="%s"' % re.sub(r"[^A-Za-z0-9._-]", "", res["name"]))
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
                return self._send(200, res)
            except PermissionError as e:
                return self._send(401, {"error": str(e), "login": True})
            except Exception as e:
                log.info("demo %s %s: %s", method, path, e)
                return self._send(400, {"error": str(e)})
        local_admin = not sess and not self._remote() and store.settings().get("local_tier") == "zerocool"
        prefs.CURRENT.set({"key": "acct:" + sess["key"], "name": sess["name"], "role": sess["role"], "user": sess["key"], "admin": sess["role"] == "owner"} if sess
                          else {"key": "_local", "name": "You", "role": "owner", "user": "", "admin": local_admin})
        admin = prefs.me().get("admin")
        try:
            if path.startswith("/api/admin") and not admin:
                return self._send(403, {"error": "Zero Cool access only."})
            if path == "/api/admin/project.zip":
                data = handoff.project_zip()
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Disposition", 'attachment; filename="ConstableHoagie-Project-%s.zip"' % debugger.VERSION)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            if path == "/api/account/password" and method == "POST":
                if not sess:
                    raise ValueError("Sign in first.")
                return self._send(200, auth.change_password(sess["key"], body.get("new", ""), keep_token=self._token()))
            if path == "/api/admin" and method == "GET":
                host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host") or "127.0.0.1:%d" % PORT
                scheme = "https" if self._remote() and not host.startswith("127.") else "http"
                return self._send(200, handoff.overview("%s://%s" % (scheme, host)))
        except Exception as e:
            return self._send(400, {"error": str(e)})
        try:
            guest = self._guest()
            if guest and method == "GET" and path == "/api/networth" and not store.settings().get("share_tab_with_guests"):
                return self._send(200, {"private": True, "actual": [], "estimate": [], "assets": [], "total": 0})
            if guest and method == "GET" and path == "/api/portfolio" and not store.settings().get("share_tab_with_guests"):
                return self._send(200, {"rows": [], "total": 0, "cost": 0, "gain": None, "private": True})
            res = route(method, path, q, body)
            if path == "/api/status" and isinstance(res, dict):
                res["guest"] = guest
                sess = self._session()
                res["guest_name"] = (sess or {}).get("name") or self.headers.get("Tailscale-User-Name") or ""
                res["signed_in_as"] = (sess or {}).get("name", "")
                res["remote"] = self._remote()
                res["me"] = prefs.public()
                res["tier"] = auth.tier(sess["role"]) if sess else ("Zero Cool" if prefs.me().get("admin") else "Owner (this PC)")
                res["admin"] = bool(prefs.me().get("admin"))
                res["account"] = auth.account(sess["key"]) if sess else None
            if res is None:
                return self._send(404, {"error": "unknown"})
            if isinstance(res, dict) and "__csv__" in res:
                data = res["__csv__"].encode("utf-8-sig")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="%s"' % re.sub(r"[^A-Za-z0-9._-]", "", res["name"]))
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            self._send(200, res)
        except Exception as e:
            tb = traceback.format_exc()
            log.error("%s %s failed: %s\n%s", method, path, e, tb)
            if not isinstance(e, (ValueError, PermissionError)):      # user mistakes aren't bugs
                try:
                    autopatch.capture("server", "%s: %s" % (type(e).__name__, e), tb, "%s %s" % (method, path))
                except Exception:
                    pass
            self._send(500, {"error": str(e)})


def route(method, path, q, body):
    one = lambda k, d="": (q.get(k) or [d])[0]
    if method == "GET":
        if path == "/api/status":
            return status()
        if path == "/api/special":
            return special()
        if path == "/api/news":
            news = feeds.news(force=one("force") == "1")
            if not prefs.betting_on():
                news = [s for s in news if not prefs.BET_TAGS & set(s["tags"])]
            up = prefs.upbeat_on()
            if prefs.bright_on() and one("all") != "1":
                return {"news": feeds.bright(news), "upbeat": True, "bright": True}
            news = [s for s in news if "Good news" not in s["tags"]]
            if up and one("all") != "1":
                news = feeds.uplift(news)
            return {"news": news, "upbeat": up}
        if path == "/api/me":
            return prefs.public()
        if path == "/api/ask/context":
            # For free AI that runs in the visitor's own browser: the same voice and context Claude gets.
            ctx = ""
            try:
                sp = special()
                ctx = engine._context(sp["news"], sp["prices"], sp["hub"])
            except Exception:
                pass
            rules = ai.HOAGIE_VOICE + (" Never suggest sports bets, DFS or lottery: this person chose the money-only menu."
                                       if not prefs.betting_on() else "") + " You are not a licensed advisor; say so briefly when giving money guidance."
            return {"system": rules + "\n\nToday's context:\n" + ctx[:6000]}
        if path == "/api/give":
            return give.counter()
        if path == "/api/email/setup":
            return digest.setup_info()
        if path == "/api/email/preview":
            subject, text, body, _ = digest.build(prefs.me()["key"])
            return {"subject": subject, "html": body}
        if path == "/api/portfolio":
            return portfolio.valued()
        if path == "/api/costs":
            return costs.month(one("month") or None)
        if path == "/api/costs/export.csv":
            return {"__csv__": costs.export_csv(one("month") or None), "name": "hoagie-costs-%s.csv" % (one("month") or "all")}
        if path == "/api/brokers":
            return brokers.catalog()
        if path == "/api/bank":
            return bank.status()
        if path == "/api/ai/guide":
            return ai.brain_guide()
        if path == "/api/integrations":
            return integrations.catalog()
        if path == "/api/agent/tokens":
            return agentapi.listing()
        if path == "/api/admin/autopatch":
            out = autopatch.status()
            out["check"] = autopatch.check()
            out["notify"] = autopatch.my_notify(prefs.me().get("user"))
            try:
                out["pulls"] = autopatch.pulls() if out["check"].get("reachable") else []
            except Exception as e:
                out["pulls"], out["pulls_error"] = [], str(e)[:200]
            out["workflows"] = (Path(__file__).parent.parent / ".github" / "workflows" / "autopatch.yml").exists()
            return out
        if path == "/api/sports":
            if not prefs.bets_allowed():
                return {"off": True}
            st = store.settings()
            return sports.suggestions(int(st.get("risk") or 2), float(st.get("daily_budget") or 25))
        if path == "/api/bets":
            if not prefs.bets_allowed():
                return {"off": True}
            return bets.board(live=one("live", "1") == "1")
        if path == "/api/bets/export.csv":
            return {"__csv__": bets.export_csv(), "name": "hoagie-bets.csv"}
        if path == "/api/sleeper":
            return bets.sleeper(one("user") or None)
        if path == "/api/insights":
            return insights.insights(force=one("force") == "1", upbeat=prefs.upbeat_on())
        if path == "/api/networth":
            return portfolio.networth(int(one("days", "90")))
        if path.startswith("/api/lottery") and not prefs.betting_on():
            return {"hidden": True, "error": "Lottery is off on the money-only menu. Switch at Connect counter › Your menu."}
        if path == "/api/lottery":
            return engine.lottery(one("state", "NH"), one("game", "Powerball"), int(one("n", "3")))
        if path == "/api/lottery/games":
            return {st: {"games": list(v["games"].keys()), "note": v["buy_note"]} for st, v in engine.LOTTERY.items()}
        if path == "/api/checks":
            return {"checks": debugger.checks()}
        if path == "/api/hub":
            return feeds.hub_summary()
        if path == "/api/avatars":
            return store.load("avatars", {"avatars": []})
        if path == "/api/update/check":
            try:
                return updater.check(force=one("force") == "1")
            except Exception as e:
                return {"enabled": True, "error": "Couldn't reach GitHub: %s" % e, "current": updater.info()["version"]}
        if path == "/api/update/info":
            return updater.info()
        if path == "/api/menu":
            return {"plays": {k: {"menu": v["menu"], "emoji": v["emoji"], "category": v["category"],
                                  "horizon": engine.HORIZONS[v["horizon"]], "risk": v["risk"]} for k, v in engine.PLAYS.items()}}
        return None
    # POST
    if path == "/api/me":
        return prefs.public() if prefs.update(body) else None
    if path == "/api/costs/add":
        return costs.add(body)
    if path == "/api/costs/delete":
        return costs.delete(body.get("id"))
    if path == "/api/costs/budget":
        return {"budgets": costs.set_budget(body.get("category"), body.get("amount"))}
    if path == "/api/costs/import":
        if len(body.get("csv", "")) > 3_000_000:
            raise ValueError("That file is too big (3 MB max).")
        return costs.import_csv(body.get("csv", ""))
    if path == "/api/brokers/save":
        return brokers.save(body.get("id"), body.get("fields") or {})
    if path == "/api/brokers/sync":
        return brokers.sync(body.get("id"))
    if path == "/api/brokers/remove":
        return brokers.remove(body.get("id"))
    if path == "/api/brokers/order":
        return brokers.alpaca_order(body)
    if path == "/api/brokers/settings":
        return brokers.set_trading(body)
    if path == "/api/brokers/portal":
        return brokers.snap_portal()
    if path == "/api/bank/connect":
        return bank.connect(body.get("token", ""))
    if path == "/api/bank/sync":
        return bank.sync()
    if path == "/api/bank/disconnect":
        return bank.disconnect()
    if path == "/api/me/test-email":
        if body.get("address") is not None:
            prefs.update({"email": {"address": body.get("address")}})
        return digest.send_to(prefs.me()["key"], test=True)
    if path == "/api/email/setup":
        return digest.save_setup(body)
    if path == "/api/play/today":
        return engine.todays_play(body.get("amount"), body.get("risk"), body.get("engine", "auto"))
    if path == "/api/playbook":
        return engine.playbook(body.get("amount", 25), body.get("risk", 2), body.get("horizons", ["long"]))
    if path == "/api/ask":
        ctx = ""
        if body.get("with_context", True):
            try:
                sp = special()
                ctx = engine._context(sp["news"], sp["prices"], sp["hub"])
            except Exception:
                pass
        return ai.ask(body.get("question", ""), body.get("engine", "auto"), ctx)
    if path == "/api/ai/setup":
        ch = {}
        if "default" in body:
            if body["default"] not in ("auto",) + ai.BRAINS:
                raise ValueError("Unknown AI.")
            ch["ai_default"] = body["default"]
        if "agent_url" in body:
            ch["agent_url"] = ai.check_agent_url(body["agent_url"]) if body["agent_url"] else ""
        if "model" in body and body.get("provider") in ai.COMPAT:
            m = dict(store.settings().get("ai_models") or {}); m[body["provider"]] = str(body["model"])[:80]; ch["ai_models"] = m
        if body.get("done"):
            ch["ai_set"] = True
        store.save_settings(ch)
        return ai.brain_guide()
    if path == "/api/admin/link":
        tok = auth.make_link(body.get("user"))
        return {"token": tok, "path": "/auth/link/" + tok}
    if path == "/api/admin/revoke":
        return auth.revoke_links(body.get("user"))
    if path == "/api/admin/tier":
        return auth.set_role(body.get("user"), body.get("tier"))
    if path == "/api/admin/autopatch":
        me = prefs.me()
        ch = {}
        if "on" in body:
            ch["autopatch_on"] = bool(body["on"])
        if body.get("repo") is not None:
            r = str(body["repo"]).strip()
            if r and not re.match(r"^[\w.-]+/[\w.-]+$", r):
                raise ValueError("Repo looks like owner/name.")
            ch["github_repo"] = r
        if "threshold" in body:
            ch["autopatch_threshold"] = max(1, min(20, int(body["threshold"])))
        if ch:
            store.save_settings(ch)
        if body.get("token"):
            store.set_secret("github_token", str(body["token"]).strip())
        if "automerge" in body:
            autopatch.set_automerge(bool(body["automerge"]))
        return {"ok": True}
    if path == "/api/admin/autopatch/approve":
        return autopatch.approve(int(body.get("number")), prefs.me().get("user") or "ConstableHoagie")
    if path == "/api/admin/autopatch/reject":
        return autopatch.reject(int(body.get("number")), prefs.me().get("user") or "ConstableHoagie", body.get("reason", ""))
    if path == "/api/admin/autopatch/notify":
        return autopatch.save_notify(prefs.me().get("user"), body)
    if path == "/api/admin/autopatch/notify/test":
        return autopatch.test_notify(prefs.me().get("user"))
    if path == "/api/admin/prefs":
        u = str(body.get("user", "")).strip().lower()
        if u not in auth.users():
            raise ValueError("No such user.")
        prefs.admin_set("acct:" + u, body)
        return {"ok": True}
    if path == "/api/admin/chat":
        return tour.chat(body.get("question", ""), body.get("history") or [])
    if path == "/api/account/skip":
        u = prefs.me().get("user")
        return auth.skip_change(u) if u else {"ok": True}
    if path == "/api/account/welcomed":
        u = prefs.me().get("user")
        if u:
            auth.mark_welcomed(u)
        return {"ok": True}
    if path == "/api/tour/ask":
        me = prefs.me()
        return tour.ask(body.get("question", ""), body.get("step", ""), owner=me.get("role") == "owner", session=me.get("key", "local"))
    if path == "/api/ai/test":
        prov = body.get("provider") or ai.pick_brain()
        t0 = time.time()
        ans = ai.complete("Say hi to the shop in one short sentence, as Constable Hoagie.", engine=prov, timeout=60)
        return {"ok": True, "engine": prov, "answer": ans[:300], "seconds": round(time.time() - t0, 1),
                "model": ai.compat_model(prov) if prov in ai.COMPAT else None}
    if path == "/api/ai/models":
        return {"models": ai.compat_models(body.get("provider"))}
    if path == "/api/agent/tokens":
        return agentapi.make(body.get("name"), body.get("scope", "read"))
    if path == "/api/agent/revoke":
        return agentapi.revoke(body.get("id"))
    if path.startswith("/api/bets"):
        if not prefs.bets_allowed():
            raise ValueError("Bet Tracker is part of the full menu.")
        if path == "/api/bets/add":
            return bets.add(body, body.get("source") if body.get("source") in ("manual", "text", "screenshot", "today_play", "hub") else "manual")
        if path == "/api/bets/update":
            return bets.update(body.get("id"), body.get("changes") or {})
        if path == "/api/bets/delete":
            bets.delete(body.get("id")); return {"ok": True}
        if path == "/api/bets/parse":
            items = bets.parse_text(body.get("text", ""))
            if body.get("ai") or (not items or not all(i["confident"] for i in items)) and ai.pick_brain() != "none" and body.get("ai") is not False:
                try:
                    items = [dict(i, confident=True) for i in bets.read_text_ai(body.get("text", ""))]
                except Exception as e:
                    log.info("AI slip read failed: %s", e)
            return {"items": items}
        if path == "/api/bets/screenshot":
            return {"items": bets.read_screenshot(body.get("image", ""))}
        if path == "/api/bets/import":
            return bets.import_csv(body.get("csv", ""))
        if path == "/api/bets/kalshi":
            return bets.kalshi_sync()
        if path == "/api/bets/sleeper":
            store.save_settings({"sleeper_user": str(body.get("user", "")).strip()[:40]})
            return bets.sleeper()
    if path == "/api/settings":
        if body.get("require_login_local") and not any(u["role"] == "owner" for u in auth.list_users()):
            raise ValueError("Make an Owner account first, or you'd lock yourself out.")
        return store.save_settings(body)
    if path == "/api/secret":
        if body.get("name") not in store.SECRET_NAMES:
            raise ValueError("unknown secret")
        store.set_secret(body.get("name"), body.get("value", ""))
        return {"ok": True, "has": store.has_secret(body.get("name"))}
    if path == "/api/portfolio/item":
        return portfolio.save_item(body)
    if path == "/api/portfolio/delete":
        portfolio.delete_item(body.get("id"))
        return {"ok": True}
    if path == "/api/portfolio/screenshot":
        return portfolio.read_screenshot(body.get("image"), body.get("venue", ""))
    if path == "/api/avatars":
        av = body.get("avatars", [])[:6]
        for a in av:  # photos are shrunk in the browser; refuse anything huge
            if len(str(a.get("photo", ""))) > 200_000:
                a["photo"] = ""
        store.save("avatars", {"avatars": av})
        return {"ok": True}
    if path == "/api/update/apply":
        return updater.apply()
    if path == "/api/update/rollback":
        return updater.rollback()
    if path == "/api/auth/users":
        act = body.get("action")
        if act == "add":
            return auth.add_user(body.get("name"), body.get("password", body.get("passcode")), body.get("role", "guest"))
        if act == "remove":
            return auth.remove_user(body.get("name"))
        return {"users": auth.list_users()}
    if path == "/api/clientlog":
        debugger.client_error(body)
        return {"ok": True}
    if path == "/api/bug":
        return {"path": debugger.report(body.get("note", ""), body.get("state"))}
    if path == "/api/diagnose":
        return {"answer": debugger.diagnose_with_claude()}
    if path == "/api/open":
        # open an official link (sportsbook, lottery, signup page) in the default browser
        u = body.get("url", "")
        if u.startswith("https://"):
            webbrowser.open(u)
        return {"ok": True}
    return None


def main():
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print("Constable Hoagie is already open — opening your browser.")
        webbrowser.open("http://127.0.0.1:%d" % PORT)
        return
    log.info("Constable Hoagie %s starting on port %d", debugger.VERSION, PORT)
    seed = Path(__file__).parent / "seed"
    auth.apply_seed(seed / "accounts.json")
    if (seed / "zerocool.flag").exists() and store.settings().get("local_tier") != "zerocool":
        store.save_settings({"local_tier": "zerocool"})
    (store.DATA / "server.pid").write_text(str(os.getpid()))
    print("Constable Hoagie is open at http://127.0.0.1:%d  (close this window to stop him)" % PORT)
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open("http://127.0.0.1:%d" % PORT)).start()
    # warm the news cache in the background so the first screen is fast
    threading.Thread(target=lambda: (feeds.news(), feeds.prices()), daemon=True).start()
    digest.start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
