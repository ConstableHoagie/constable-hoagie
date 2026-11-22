"""Every integration Constable Hoagie supports or plans, grouped by money category.

where:  "Both"    = works in the app on your PC (http://127.0.0.1:8787) and on the website (beta.constablehoagie.com).
        "App"     = only on the PC itself.
        "Website" = needs the public website address (cloud services can't reach your PC directly).
        The website is the same shop served from your PC, so it only answers while the PC is on.
status: Live, Beta (works, still being polished), Planned, Not possible (and why).
"""
from . import ai, bank, brokers, store

CATEGORIES = [
    ("trading", "📈 Trading & Investing"),
    ("betting", "🎰 Betting & Fantasy (full menu)"),
    ("money", "🧾 Money Management & Banking"),
    ("data", "📊 Market & Economic Data"),
    ("ai", "🧠 AI Brains & Research"),
    ("open", "🔌 Open Connections (other apps & agents)"),
]

# (id, category, name, status, where, connection, capabilities, what Hoagie does with it / benefit, link)
CATALOG = [
    # ---- trading & investing
    ("alpaca", "trading", "Alpaca", "Live", "Both", "API key", ["Balances", "Positions", "Paper orders", "Live orders (capped)"],
     "Hoagie can place practice orders for you; live orders need you to type LIVE, confirm each one, and stay under your cap.", "https://alpaca.markets"),
    ("coinbase", "trading", "Coinbase (Advanced Trade)", "Live", "Both", "API key (view-only)", ["Balances", "Live prices"],
     "Every coin priced live in My Tab and your net-worth line; daily auto-sync. Order support is planned.", "https://www.coinbase.com/developer-platform"),
    ("kraken", "trading", "Kraken", "Live", "Both", "API key (query-only)", ["Balances", "Live prices"],
     "Balances in My Tab and net worth without risk: a query-only key can't trade or withdraw.", "https://www.kraken.com"),
    ("snaptrade", "trading", "SnapTrade bridge", "Beta", "Both", "Account link (you log in at your broker)", ["Positions", "Cash", "20+ brokers"],
     "One free read-only link for Robinhood, Schwab, Webull, E*TRADE, Vanguard, Fidelity, tastytrade, Public, IBKR and more.", "https://snaptrade.com/personal"),
    ("shot-hold", "trading", "Screenshot of any app", "Live", "Both", "Screenshot + your AI", ["Holdings", "Balances"],
     "Drop a screenshot from any brokerage, crypto or retirement app; your AI reads it into My Tab.", ""),
    ("manual-hold", "trading", "Type it in", "Live", "Both", "Manual", ["Anything with a value"],
     "Houses, cars, 401(k)s, cash under the mattress: tracked in net worth with live prices where they exist.", ""),
    ("rh-agentic", "trading", "Robinhood Agentic account", "Planned", "Both", "Robinhood MCP sign-in", ["Orders with approval"],
     "Would let Hoagie suggest and (with your OK) place stock trades inside a separate, capped account.", "https://robinhood.com"),
    ("crypto-orders", "trading", "Coinbase / Kraken orders", "Planned", "Both", "API key (trade, no withdraw)", ["Recurring buys", "Rebalance"],
     "Recurring buys and rebalancing inside your limits, with the same confirm + cap rules as Alpaca.", ""),

    # ---- betting & fantasy
    ("oddsapi", "betting", "The Odds API", "Live", "Both", "Free API key", ["Lines from many books", "Line shopping", "Cricket"],
     "Real prices on every bet card; Today's Games flags when one book's price beats the fair line.", "https://the-odds-api.com"),
    ("espn", "betting", "ESPN scoreboard", "Live", "Both", "No key", ["Schedules", "Live scores", "Final scores"],
     "Free games list for Today's Games, and live scores beside each open bet in the Bet Tracker.", ""),
    ("fantasypros", "betting", "FantasyPros", "Live", "Both", "Personal API key (MVP/HOF plan)", ["Projections", "Rankings", "Player news"],
     "Sharper DFS and prop reads, injury news on bet cards, better confidence numbers.", "https://www.fantasypros.com/api-data/"),
    ("kalshi", "betting", "Kalshi (prediction markets)", "Beta", "Both", "API key + private key", ["Positions", "Cash balance"],
     "Open Kalshi positions show up as live bets; your Kalshi cash joins your net worth. Read-only.", "https://kalshi.com"),
    ("sleeper", "betting", "Sleeper fantasy", "Live", "Both", "Username only (no key)", ["Leagues", "Records", "This week's matchups"],
     "Your fantasy matchups sit beside your bets, scored live.", "https://sleeper.com"),
    ("slip-shot", "betting", "Bet slip screenshot (any sportsbook or DFS)", "Live", "Both", "Screenshot + your AI", ["Bets", "Odds", "Stakes", "Status"],
     "DraftKings, FanDuel, PrizePicks, Underdog, anything: screenshot the slip and it lands in the Bet Tracker.", ""),
    ("slip-text", "betting", "Paste a bet slip", "Live", "Both", "Text", ["Bets", "Odds", "Stakes"],
     "Paste 'Lakers -3.5 -110 $20 DraftKings' (or a copied slip) and Hoagie fills in the bet.", ""),
    ("bet-csv", "betting", "Bet history CSV (Pikkit Pro, Juice Reel, spreadsheets)", "Live", "Both", "CSV file", ["History", "Profit", "Record"],
     "Bring your whole history in: record, profit and ROI fill in immediately. Export back out anytime.", ""),
    ("hub", "betting", "Your sports desk folder", "Live", "App", "Local folder (read-only)", ["Picks", "Ledger"],
     "Your own pick pipeline's cards and record show on the board.", ""),
    ("lottery", "betting", "NH & TX lottery picker", "Live", "Both", "Built in", ["Random picks", "Expected value"],
     "Picks that avoid popular patterns (fewer split jackpots) with honest odds. No buying.", ""),
    ("sharpsports", "betting", "SharpSports BetSync", "Planned", "Both", "Business API (needs an agreement)", ["Auto-sync sportsbook accounts", "Bet history", "Balances"],
     "Would auto-sync DraftKings, FanDuel and more like Plaid does for banks. Needs a business deal (the LLC could apply).", "https://sharpsports.io"),
    ("apisports", "betting", "API-Sports", "Planned", "Both", "Free API key (100 calls/day)", ["More leagues", "Live scores", "Odds"],
     "Extra leagues and global soccer, basketball and NFL data beyond ESPN.", "https://api-sports.io"),
    ("books-direct", "betting", "DraftKings / FanDuel / BetMGM direct", "Not possible", "Both", "None offered", [],
     "No public API, and their terms ban automation. Use slip screenshots, pasted slips, or a CSV export instead.", ""),

    # ---- money management & banking
    ("simplefin", "money", "SimpleFIN bank sync", "Live", "Both", "Setup token ($1.50/mo, paid by each user)", ["Balances", "Transactions"],
     "Bank balances update net worth automatically; spending flows into Costs, auto-sorted. Read-only.", "https://beta-bridge.simplefin.org"),
    ("bank-csv", "money", "Bank CSV import", "Live", "Both", "CSV file", ["Transactions"],
     "Any bank's export: columns detected, duplicates skipped, categories filled in.", ""),
    ("costs", "money", "Costs counter", "Live", "Both", "Built in", ["Budgets", "Trends", "CSV export"],
     "Every dollar out, sorted into 14 categories, with monthly budgets.", ""),
    ("smtp", "money", "Morning email (Gmail or Brevo)", "Live", "Both", "App password / SMTP key", ["Daily digest"],
     "Your play, markets and news in your inbox, built without any AI account.", ""),
    ("moneyplan", "money", "Money Plan, Learn, Give", "Live", "Both", "Built in", ["Budget split", "Lessons", "Charity rankings"],
     "A step-by-step plan, one-minute lessons, and the charities that do the most per dollar.", ""),
    ("plaid", "money", "Plaid", "Not planned", "Both", "Business API", [],
     "Charges the host per connection and needs a company review; SimpleFIN keeps costs with each user instead.", ""),

    # ---- market & economic data
    ("treasury", "data", "U.S. Treasury FiscalData", "Live", "Both", "No key", ["T-bill & note rates"], "The safe-money yardstick on your Dashboard.", "https://fiscaldata.treasury.gov"),
    ("bls", "data", "Bureau of Labor Statistics", "Live", "Both", "No key", ["Inflation (CPI)"], "Know whether your cash is growing or shrinking.", "https://www.bls.gov/developers/"),
    ("edgar", "data", "SEC EDGAR", "Live", "Both", "No key", ["10-K", "10-Q", "8-K filings"], "Official filings for every stock you own.", "https://www.sec.gov"),
    ("fng", "data", "Crypto Fear & Greed", "Live", "Both", "No key", ["Market mood"], "Don't buy at peak hype.", "https://alternative.me/crypto/fear-and-greed-index/"),
    ("fred", "data", "FRED (St. Louis Fed)", "Live", "Both", "Free API key", ["Fed rate", "10-yr", "Yield curve", "Mortgage", "Jobs", "Gas"], "Rates and recession signals in plain English.", "https://fredaccount.stlouisfed.org/apikeys"),
    ("finnhub", "data", "Finnhub", "Live", "Both", "Free API key", ["Earnings dates", "Company news"], "No surprise earnings swings on stocks you hold.", "https://finnhub.io"),
    ("prices", "data", "Coinbase, ECB and Stooq prices", "Live", "Both", "No key", ["Crypto", "Currencies", "US stocks (delayed)"], "Live values and the currency wiggle in your net worth.", ""),
    ("news", "data", "News feeds (RSS)", "Live", "Both", "No key", ["Markets", "Crypto", "Sports", "Humanitarian"], "Today's Specials and the News Rail; upbeat filter on money-only.", ""),

    # ---- AI brains & research
    ("claude", "ai", "Claude", "Live", "Both", "Claude Code login on the PC", ["Web research", "Screenshots", "Plays & Playbook", "Tour Q&A"], "Fit 10/10: the smartest brain for the shop.", "https://claude.ai"),
    ("gemini", "ai", "Gemini", "Live", "Both", "Free API key", ["Answers", "Screenshots", "Plays"], "Fit 8/10: the best free brain.", "https://aistudio.google.com/apikey"),
    ("openai", "ai", "GPT (OpenAI)", "Live", "Both", "API key (paid)", ["Answers", "Screenshots", "Plays"], "Fit 8/10.", "https://platform.openai.com/api-keys"),
    ("agent", "ai", "Your own agent (OpenAI-compatible)", "Live", "Both", "Address + optional key", ["Answers", "Plays", "Screenshots if the model can"], "Fit 5-10, depends on the model: plug in the AI you already use.", ""),
    ("groq", "ai", "Groq", "Live", "Both", "Free API key", ["Fast answers", "Plays"], "Fit 6/10.", "https://console.groq.com/keys"),
    ("openrouter", "ai", "OpenRouter free models", "Live", "Both", "Free API key", ["Answers", "Plays"], "Fit 6/10.", "https://openrouter.ai/keys"),
    ("ollama", "ai", "Ollama / LM Studio", "Live", "Both", "No account (runs on the PC)", ["Answers", "Plays", "Private"], "Fit 5/10: free and private.", "https://ollama.com"),
    ("foundry", "ai", "Foundry Local", "Live", "Both", "No account (runs on the PC)", ["Answers"], "Fit 4/10.", ""),
    ("chrome-ai", "ai", "Chrome built-in AI / WebLLM", "Live", "Both", "No account (runs in your browser)", ["Ask counter"], "Fit 3/10: free for every visitor, Ask only.", ""),
    ("tavily", "ai", "Tavily search", "Live", "Both", "Free API key", ["Web search"], "Fresh articles behind answers and plays.", "https://tavily.com"),
    ("brave", "ai", "Brave Search", "Live", "Both", "API key", ["Web search"], "Backup search engine.", "https://brave.com/search/api/"),

    # ---- open connections
    ("agent-api", "open", "Agent API (read, or read + log)", "Live", "Both", "Personal token", ["Snapshot", "Holdings", "Dashboard", "Bets", "Spending", "Add bets/costs"],
     "Let ChatGPT actions, n8n, scripts or any AI agent read your Hoagie data and log bets or spending. Local: http://127.0.0.1:8787/agent/v1. Online: https://beta.constablehoagie.com/agent/v1.", ""),
    ("mcp", "open", "MCP server (Claude Desktop, Claude Code, Cursor and other MCP apps)", "Live", "App", "Local MCP (stdio) + token", ["Ask about your money from any MCP app", "Log bets"],
     "Your assistant gets Hoagie tools: snapshot, dashboard, bets, log a bet, log spending.", ""),
    ("webhook", "open", "Webhooks: Zapier, IFTTT, Make, iPhone Shortcuts", "Live", "Website", "Token + POST /agent/v1/hook", ["Add a bet", "Add spending"],
     "Tap a Shortcut after a purchase or a bet and it's logged. Cloud tools need the website address (or run on this PC for local tools).", ""),
    ("exports", "open", "CSV and PDF exports", "Live", "Both", "Download", ["Costs CSV", "Bets CSV", "Playbook/Money Plan PDF"], "Take your data to Excel, Google Sheets or your accountant.", ""),
    ("shots-in", "open", "Screenshot drop", "Live", "Both", "Upload", ["Holdings", "Bet slips"], "Any app without an API still gets in.", ""),
    ("autopatch", "open", "GitHub autopatcher (Claude Code GitHub Action)", "Live", "Both", "GitHub token + Claude repo secret", ["Scrubbed bug reports", "Claude-drafted fixes", "Admin approval", "Auto-release"],
     "New errors become scrubbed GitHub issues; Claude drafts a tested fix; a Zero Cool admin approves it in the panel and every install updates. Email/Discord alerts per admin.", "https://code.claude.com/docs/en/github-actions"),
    ("discord-alerts", "open", "Discord & email alerts (per admin)", "Live", "Both", "Discord webhook / the shop's email", ["Bug sent to Claude", "Fix ready", "Released"],
     "Each Zero Cool admin picks their own stream for autopatch news.", ""),
    ("demo", "open", "Demo + guided tour", "Live", "Both", "Built in (simulated data)", ["10 personas", "Guided tour", "Ask Hoagie"],
     "Try everything with practice data before connecting anything.", ""),
    ("discord", "open", "Discord play & bet alerts", "Planned", "Both", "Webhook URL", ["Play alerts", "Bet results"], "Post plays and results to a private channel.", ""),
]


def catalog():
    st_conn = {}
    try:
        e = ai.engines()
        st_conn.update({k: v for k, v in e.items()})
    except Exception:
        pass
    sec = {k: store.has_secret(k) for k in store.SECRET_NAMES}
    con = {p["id"] for p in brokers.catalog()["platforms"] if p["connected"]}
    s = store.settings()
    connected = {
        "alpaca": "alpaca" in con, "coinbase": "coinbase" in con, "kraken": "kraken" in con, "snaptrade": "snaptrade" in con,
        "oddsapi": sec.get("oddsapi"), "fantasypros": sec.get("fantasypros"), "kalshi": sec.get("kalshi_key_id"),
        "sleeper": bool(s.get("sleeper_user")), "hub": bool(s.get("hub_path")), "simplefin": bank.status().get("connected"),
        "smtp": sec.get("smtp"), "fred": sec.get("fred"), "finnhub": sec.get("finnhub"), "tavily": sec.get("tavily"), "brave": sec.get("brave"),
        "ollama": "11434" in (s.get("agent_url") or "") or ":1234" in (s.get("agent_url") or ""),
    }
    for k in ("claude", "gemini", "openai", "agent", "groq", "openrouter", "foundry"):
        connected[k] = st_conn.get(k)
    items = [{"id": i, "cat": c, "name": n, "status": stt, "where": w, "conn": cn, "caps": caps, "benefit": b, "link": l,
              "connected": bool(connected.get(i))} for i, c, n, stt, w, cn, caps, b, l in CATALOG]
    return {"categories": [{"id": a, "name": b} for a, b in CATEGORIES], "items": items,
            "legend": {"Both": "In the app on your PC and on the website", "App": "Only on the PC", "Website": "Needs the website address (PC must be on)"}}
