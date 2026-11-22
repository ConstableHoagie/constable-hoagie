"""Constable Hoagie MCP server: lets Claude Desktop, Claude Code, Cursor or any MCP app use your shop.

It talks to the Hoagie running on this PC (or your website) with a personal token from the Connect
counter. Standard library only. Read tools always work; the two "log" tools need a read + log token.

Claude Desktop / Cursor config (mcpServers):
  "constable-hoagie": {
    "command": "python",
    "args": ["C:\\\\path\\\\to\\\\ConstableHoagie\\\\setup\\\\hoagie_mcp.py"],
    "env": {"HOAGIE_TOKEN": "hoagie_...", "HOAGIE_URL": "http://127.0.0.1:8787"}
  }
Claude Code:  claude mcp add constable-hoagie -e HOAGIE_TOKEN=hoagie_... -- python <path>\\hoagie_mcp.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("HOAGIE_URL", "http://127.0.0.1:8787").rstrip("/")
TOKEN = os.environ.get("HOAGIE_TOKEN", "")
VERSION = "0.9.0"

TOOLS = [
    {"name": "hoagie_snapshot", "description": "Net worth, holdings, this month's spending, open bets and today's money tips from Constable Hoagie.",
     "inputSchema": {"type": "object", "properties": {}}, "path": ("GET", "/snapshot")},
    {"name": "hoagie_dashboard", "description": "Free market data: T-bill rate vs inflation, Fed/FRED rates, SEC filings and earnings for held stocks, crypto mood.",
     "inputSchema": {"type": "object", "properties": {}}, "path": ("GET", "/dashboard")},
    {"name": "hoagie_bets", "description": "Open and settled bets with live scores, record, profit and ROI (full menu only).",
     "inputSchema": {"type": "object", "properties": {}}, "path": ("GET", "/bets")},
    {"name": "hoagie_spending", "description": "This month's spending by category, income and budgets.",
     "inputSchema": {"type": "object", "properties": {}}, "path": ("GET", "/spending")},
    {"name": "hoagie_log_bet", "description": "Add a bet to the Bet Tracker. Either 'text' (e.g. 'Lakers -3.5 -110 $20 DraftKings') or fields.",
     "inputSchema": {"type": "object", "properties": {
         "text": {"type": "string"}, "pick": {"type": "string"}, "event": {"type": "string"}, "book": {"type": "string"},
         "odds": {"type": "integer", "description": "American odds, e.g. -110 or 150"}, "stake": {"type": "number"},
         "market": {"type": "string", "enum": ["moneyline", "spread", "total", "prop", "parlay", "future", "prediction", "dfs", "other"]}}},
     "path": ("POST", "/bets")},
    {"name": "hoagie_log_spending", "description": "Add a spending entry to the Costs counter.",
     "inputSchema": {"type": "object", "required": ["amount"], "properties": {
         "amount": {"type": "number"}, "note": {"type": "string"}, "date": {"type": "string", "description": "YYYY-MM-DD"},
         "category": {"type": "string"}}},
     "path": ("POST", "/spending")},
]


def call(method, path, body=None):
    data = json.dumps(body or {}).encode() if method == "POST" else None
    req = urllib.request.Request(URL + "/agent/v1" + path, data=data, method=method,
                                 headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json", "User-Agent": "hoagie-mcp/" + VERSION})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8")), False
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8")), True
        except Exception:
            return {"error": "HTTP %s" % e.code}, True
    except Exception as e:
        return {"error": "Can't reach Constable Hoagie at %s (%s). Is it open?" % (URL, e)}, True


def reply(mid, result=None, error=None):
    msg = {"jsonrpc": "2.0", "id": mid}
    if error:
        msg["error"] = error
    else:
        msg["result"] = result
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            continue
        mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
        if mid is None:          # notifications (e.g. notifications/initialized) need no answer
            continue
        if method == "initialize":
            reply(mid, {"protocolVersion": params.get("protocolVersion", "2025-06-18"),
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "constable-hoagie", "version": VERSION},
                        "instructions": "Constable Hoagie is the user's personal money app. Use these tools to read their finances and bets; "
                                        "never claim to move money. Numbers are estimates; not financial advice."})
        elif method == "ping":
            reply(mid, {})
        elif method == "tools/list":
            reply(mid, {"tools": [{k: v for k, v in t.items() if k != "path"} for t in TOOLS]})
        elif method == "tools/call":
            t = next((x for x in TOOLS if x["name"] == params.get("name")), None)
            if not t:
                reply(mid, error={"code": -32602, "message": "Unknown tool"})
                continue
            if not TOKEN:
                reply(mid, {"content": [{"type": "text", "text": "Set HOAGIE_TOKEN (make one at Hoagie's Connect counter > Your own agent)."}], "isError": True})
                continue
            verb, path = t["path"]
            data, bad = call(verb, path, params.get("arguments") or {})
            reply(mid, {"content": [{"type": "text", "text": json.dumps(data, indent=1)[:60000]}], "isError": bad})
        else:
            reply(mid, error={"code": -32601, "message": "Method not found"})


if __name__ == "__main__":
    main()
