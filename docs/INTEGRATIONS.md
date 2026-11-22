# Integrations & capabilities (v1.4.0)

Works on: Both = app on your PC and the website · App = only on the PC · Website = needs the public address.

## 📈 Trading & Investing

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| [Alpaca](https://alpaca.markets) | Live | Both | API key | Balances, Positions, Paper orders, Live orders (capped) | Hoagie can place practice orders for you; live orders need you to type LIVE, confirm each one, and stay under your cap. |
| [Coinbase (Advanced Trade)](https://www.coinbase.com/developer-platform) | Live | Both | API key (view-only) | Balances, Live prices | Every coin priced live in My Tab and your net-worth line; daily auto-sync. Order support is planned. |
| [Kraken](https://www.kraken.com) | Live | Both | API key (query-only) | Balances, Live prices | Balances in My Tab and net worth without risk: a query-only key can't trade or withdraw. |
| [SnapTrade bridge](https://snaptrade.com/personal) | Beta | Both | Account link (you log in at your broker) | Positions, Cash, 20+ brokers | One free read-only link for Robinhood, Schwab, Webull, E*TRADE, Vanguard, Fidelity, tastytrade, Public, IBKR and more. |
| Screenshot of any app | Live | Both | Screenshot + your AI | Holdings, Balances | Drop a screenshot from any brokerage, crypto or retirement app; your AI reads it into My Tab. |
| Type it in | Live | Both | Manual | Anything with a value | Houses, cars, 401(k)s, cash under the mattress: tracked in net worth with live prices where they exist. |
| [Robinhood Agentic account](https://robinhood.com) | Planned | Both | Robinhood MCP sign-in | Orders with approval | Would let Hoagie suggest and (with your OK) place stock trades inside a separate, capped account. |
| Coinbase / Kraken orders | Planned | Both | API key (trade, no withdraw) | Recurring buys, Rebalance | Recurring buys and rebalancing inside your limits, with the same confirm + cap rules as Alpaca. |

## 🎰 Betting & Fantasy (full menu)

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| [The Odds API](https://the-odds-api.com) | Live | Both | Free API key | Lines from many books, Line shopping, Cricket | Real prices on every bet card; Today's Games flags when one book's price beats the fair line. |
| ESPN scoreboard | Live | Both | No key | Schedules, Live scores, Final scores | Free games list for Today's Games, and live scores beside each open bet in the Bet Tracker. |
| [FantasyPros](https://www.fantasypros.com/api-data/) | Live | Both | Personal API key (MVP/HOF plan) | Projections, Rankings, Player news | Sharper DFS and prop reads, injury news on bet cards, better confidence numbers. |
| [Kalshi (prediction markets)](https://kalshi.com) | Beta | Both | API key + private key | Positions, Cash balance | Open Kalshi positions show up as live bets; your Kalshi cash joins your net worth. Read-only. |
| [Sleeper fantasy](https://sleeper.com) | Live | Both | Username only (no key) | Leagues, Records, This week's matchups | Your fantasy matchups sit beside your bets, scored live. |
| Bet slip screenshot (any sportsbook or DFS) | Live | Both | Screenshot + your AI | Bets, Odds, Stakes, Status | DraftKings, FanDuel, PrizePicks, Underdog, anything: screenshot the slip and it lands in the Bet Tracker. |
| Paste a bet slip | Live | Both | Text | Bets, Odds, Stakes | Paste 'Lakers -3.5 -110 $20 DraftKings' (or a copied slip) and Hoagie fills in the bet. |
| Bet history CSV (Pikkit Pro, Juice Reel, spreadsheets) | Live | Both | CSV file | History, Profit, Record | Bring your whole history in: record, profit and ROI fill in immediately. Export back out anytime. |
| Your sports desk folder | Live | App | Local folder (read-only) | Picks, Ledger | Your own pick pipeline's cards and record show on the board. |
| NH & TX lottery picker | Live | Both | Built in | Random picks, Expected value | Picks that avoid popular patterns (fewer split jackpots) with honest odds. No buying. |
| [SharpSports BetSync](https://sharpsports.io) | Planned | Both | Business API (needs an agreement) | Auto-sync sportsbook accounts, Bet history, Balances | Would auto-sync DraftKings, FanDuel and more like Plaid does for banks. Needs a business deal (the LLC could apply). |
| [API-Sports](https://api-sports.io) | Planned | Both | Free API key (100 calls/day) | More leagues, Live scores, Odds | Extra leagues and global soccer, basketball and NFL data beyond ESPN. |
| DraftKings / FanDuel / BetMGM direct | Not possible | Both | None offered | - | No public API, and their terms ban automation. Use slip screenshots, pasted slips, or a CSV export instead. |

## 🧾 Money Management & Banking

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| [SimpleFIN bank sync](https://beta-bridge.simplefin.org) | Live | Both | Setup token ($1.50/mo, paid by each user) | Balances, Transactions | Bank balances update net worth automatically; spending flows into Costs, auto-sorted. Read-only. |
| Bank CSV import | Live | Both | CSV file | Transactions | Any bank's export: columns detected, duplicates skipped, categories filled in. |
| Costs counter | Live | Both | Built in | Budgets, Trends, CSV export | Every dollar out, sorted into 14 categories, with monthly budgets. |
| Morning email (Gmail or Brevo) | Live | Both | App password / SMTP key | Daily digest | Your play, markets and news in your inbox, built without any AI account. |
| Money Plan, Learn, Give | Live | Both | Built in | Budget split, Lessons, Charity rankings | A step-by-step plan, one-minute lessons, and the charities that do the most per dollar. |
| Plaid | Not planned | Both | Business API | - | Charges the host per connection and needs a company review; SimpleFIN keeps costs with each user instead. |

## 📊 Market & Economic Data

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| [U.S. Treasury FiscalData](https://fiscaldata.treasury.gov) | Live | Both | No key | T-bill & note rates | The safe-money yardstick on your Dashboard. |
| [Bureau of Labor Statistics](https://www.bls.gov/developers/) | Live | Both | No key | Inflation (CPI) | Know whether your cash is growing or shrinking. |
| [SEC EDGAR](https://www.sec.gov) | Live | Both | No key | 10-K, 10-Q, 8-K filings | Official filings for every stock you own. |
| [Crypto Fear & Greed](https://alternative.me/crypto/fear-and-greed-index/) | Live | Both | No key | Market mood | Don't buy at peak hype. |
| [FRED (St. Louis Fed)](https://fredaccount.stlouisfed.org/apikeys) | Live | Both | Free API key | Fed rate, 10-yr, Yield curve, Mortgage, Jobs, Gas | Rates and recession signals in plain English. |
| [Finnhub](https://finnhub.io) | Live | Both | Free API key | Earnings dates, Company news | No surprise earnings swings on stocks you hold. |
| Coinbase, ECB and Stooq prices | Live | Both | No key | Crypto, Currencies, US stocks (delayed) | Live values and the currency wiggle in your net worth. |
| News feeds (RSS) | Live | Both | No key | Markets, Crypto, Sports, Humanitarian | Today's Specials and the News Rail; upbeat filter on money-only. |

## 🧠 AI Brains & Research

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| [Claude](https://claude.ai) | Live | Both | Claude Code login on the PC | Web research, Screenshots, Plays & Playbook, Tour Q&A | Fit 10/10: the smartest brain for the shop. |
| [Gemini](https://aistudio.google.com/apikey) | Live | Both | Free API key | Answers, Screenshots, Plays | Fit 8/10: the best free brain. |
| [GPT (OpenAI)](https://platform.openai.com/api-keys) | Live | Both | API key (paid) | Answers, Screenshots, Plays | Fit 8/10. |
| Your own agent (OpenAI-compatible) | Live | Both | Address + optional key | Answers, Plays, Screenshots if the model can | Fit 5-10, depends on the model: plug in the AI you already use. |
| [Groq](https://console.groq.com/keys) | Live | Both | Free API key | Fast answers, Plays | Fit 6/10. |
| [OpenRouter free models](https://openrouter.ai/keys) | Live | Both | Free API key | Answers, Plays | Fit 6/10. |
| [Ollama / LM Studio](https://ollama.com) | Live | Both | No account (runs on the PC) | Answers, Plays, Private | Fit 5/10: free and private. |
| Foundry Local | Live | Both | No account (runs on the PC) | Answers | Fit 4/10. |
| Chrome built-in AI / WebLLM | Live | Both | No account (runs in your browser) | Ask counter | Fit 3/10: free for every visitor, Ask only. |
| [Tavily search](https://tavily.com) | Live | Both | Free API key | Web search | Fresh articles behind answers and plays. |
| [Brave Search](https://brave.com/search/api/) | Live | Both | API key | Web search | Backup search engine. |

## 🔌 Open Connections (other apps & agents)

| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |
|---|---|---|---|---|---|
| Agent API (read, or read + log) | Live | Both | Personal token | Snapshot, Holdings, Dashboard, Bets, Spending, Add bets/costs | Let ChatGPT actions, n8n, scripts or any AI agent read your Hoagie data and log bets or spending. Local: http://127.0.0.1:8787/agent/v1. Online: https://beta.constablehoagie.com/agent/v1. |
| MCP server (Claude Desktop, Claude Code, Cursor and other MCP apps) | Live | App | Local MCP (stdio) + token | Ask about your money from any MCP app, Log bets | Your assistant gets Hoagie tools: snapshot, dashboard, bets, log a bet, log spending. |
| Webhooks: Zapier, IFTTT, Make, iPhone Shortcuts | Live | Website | Token + POST /agent/v1/hook | Add a bet, Add spending | Tap a Shortcut after a purchase or a bet and it's logged. Cloud tools need the website address (or run on this PC for local tools). |
| CSV and PDF exports | Live | Both | Download | Costs CSV, Bets CSV, Playbook/Money Plan PDF | Take your data to Excel, Google Sheets or your accountant. |
| Screenshot drop | Live | Both | Upload | Holdings, Bet slips | Any app without an API still gets in. |
| [GitHub autopatcher (Claude Code GitHub Action)](https://code.claude.com/docs/en/github-actions) | Live | Both | GitHub token + Claude repo secret | Scrubbed bug reports, Claude-drafted fixes, Admin approval, Auto-release | New errors become scrubbed GitHub issues; Claude drafts a tested fix; a Zero Cool admin approves it in the panel and every install updates. Email/Discord alerts per admin. |
| Discord & email alerts (per admin) | Live | Both | Discord webhook / the shop's email | Bug sent to Claude, Fix ready, Released | Each Zero Cool admin picks their own stream for autopatch news. |
| Demo + guided tour | Live | Both | Built in (simulated data) | 10 personas, Guided tour, Ask Hoagie | Try everything with practice data before connecting anything. |
| Discord play & bet alerts | Planned | Both | Webhook URL | Play alerts, Bet results | Post plays and results to a private channel. |
