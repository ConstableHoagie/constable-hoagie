# Constable Hoagie: project notes (features and build history)

Constable Hoagie is a Windows, locally hosted web app for easy financial growth. It's built for an ADHD brain: impact over completeness, small bites, one thing at a time, a one-line Quick Take first and details folded away. It runs on the owner's PC at http://127.0.0.1:8787. The private beta website, beta.constablehoagie.com, is the same app served from that PC through a Cloudflare Tunnel, so the website only works while the PC is on.

## Look and characters
- An original Italian sub shop, inspired by the owner's first job at a sub shop in Portsmouth, NH. No real shop names or logos.
- Constable Hoagie: a cartoon of the owner. Bald, full beard, round glasses, tattoo sleeves, black tank top, deli apron, constable helmet. Tagline: "Protecting & Serving Your Dough".
- Kiwi: a tortoiseshell cat with green eyes. She roams the shop; you can pet her and give treats.
- Two looks:
  - Original: a bubbly, cel-shaded daytime shop.
  - Neon: a galactic sub shop at night.
  - The full (betting) menu defaults to Neon and money-only defaults to Original. The 🎨 chip switches either way.
- Music:
  - Original: an 8-bit tarantella.
  - Neon: four original hip hop / rap-rock / bluesy / trap lofi tracks with a Skip button.

## Menus
- Money only:
  - Saving, investing, the Money Plan, Learn, Give, the Dashboard, Costs and news.
  - No betting, DFS or lottery anywhere; it's removed on the server side.
  - The upbeat news filter is on by default.
- Full menu (18+, 21+ in most states): everything above, plus:
  - Today's Games, sports bet cards and DFS.
  - Lottery picks (NH and TX).
  - The Bet Tracker.
  - After Hours:
    - Hoagie offers a beer, "special" mushrooms with trip oddities, or a smoke break out back with Kiwi.
    - It can be turned off at Your menu.
- Each person picks a menu on their first visit and can change it at Connect › Your menu.

## Counters (screens)
- **Today's Play**
  - One play for today: what to do, where, how much, the estimated return if it wins / if it loses / on average, and confidence.
  - Each play shows three ways to run it: you do it, Hoagie helps, or autopilot.
  - Full menu: up to 5 Today's Games bet cards.
    - 💎 Price edge = a book pays more than the fair price.
    - 🧭 Market lean = no edge.
- **Playbook:** up to three plays for any amount, risk level and time frame. PDF export.
- **Money Plan:**
  - A monthly split in stages: safety net, then high-interest debt, then investing, plus capped fun money.
  - Timelines, a payday checklist and a 10-year picture.
- **My Tab:**
  - Everything you own, with live prices (Coinbase crypto, ECB currencies, Stooq stocks) and a net-worth chart (30d/90d/1y).
  - Screenshot reading. Connected accounts show 🔗.
- **Costs:**
  - Spending by hand, bank CSV import, or SimpleFIN bank sync; 14 categories; budgets; CSV export.
  - SimpleFIN costs $1.50/mo or $15/yr, paid by each user, never by the host.
- **Dashboard:**
  - Free data cards: T-bills vs inflation (Treasury + BLS), SEC EDGAR filings, crypto Fear & Greed, FRED (Fed rate, 10-yr, yield curve, mortgage, jobs, gas), Finnhub (earnings dates, company news).
  - "Hoagie's take" tips. Education, not advice.
- **Trading:**
  - 20 platforms with read/trade/paper flags.
  - Alpaca: balances, plus paper and live orders. Live orders need you to type LIVE, a confirm tick and a per-order cap (default $100).
  - Coinbase and Kraken: balances.
  - SnapTrade: a read-only bridge to Robinhood, Schwab, Webull, E*TRADE, Vanguard, Fidelity and more. The installer offers it as an optional step.
- **Bet Tracker (full menu):**
  - Open bets with live ESPN scores; record, profit and ROI.
  - A chart of total bets, dollars wagered and potential payout over time.
  - Ways in: type, paste a slip, screenshot, CSV (Pikkit Pro / Juice Reel), Track this bet, Kalshi sync (read-only), AI agent / Shortcut.
  - Sleeper fantasy leagues.
  - Suggested results for simple bets once the game is final.
- **Ask:** whichever brain is picked; free in-browser AI for visitors.
- **Learn:** Money 101 and Investing 101 in one-minute lessons.
- **Give:**
  - GiveWell top charities ranked by cost to save a life, plus GiveDirectly and Direct Relief.
  - Humanitarian news.
- **Email:** a morning digest built without AI, sent through Gmail or Brevo.
- **Lottery:** NH/TX number picks that avoid popular patterns (fewer split jackpots), with honest odds. No buying.
- **Health Inspector:** a self-check, one-line fixes and a bug report with secrets removed.
- **Integrations (🧩):**
  - Everything by category: Trading & Investing, Betting & Fantasy, Money Management & Banking, Market & Economic Data, AI Brains & Research, Open Connections.
  - Each entry shows status, where it works (App / Website / Both) and how it connects.

## AI brains (pick one at setup)
- Fit scores (our estimate of how much of the shop each can use):

| Brain | Fit | Cost |
|---|---|---|
| Claude | 10 | The owner's Claude Code login |
| Gemini | 8 | Free key |
| GPT | 8 | Paid key |
| Your own agent | 5-10 | Any OpenAI-style address ending in /v1 |
| Groq | 6 | Free key |
| OpenRouter free models | 6 | Free key |
| Ollama / LM Studio | 5 | Free, no account |
| Foundry Local | 4 | Free, no account |
| Chrome built-in AI / WebLLM | 3 | Free, no account (Ask only) |

- Keys live in Windows Credential Manager, and calls run from the PC.
- **Bring your own agent:**
  - It can be Hoagie's brain.
  - Or it can use Hoagie through the Agent API (tokens: Read, or Read + log), the bundled MCP server (setup/hoagie_mcp.py) for Claude Desktop, Claude Code or Cursor, or webhooks / iPhone Shortcuts.
  - Tokens never move money or see keys.

## Safety promises
- Hoagie never moves money on its own.
- Live trading needs explicit confirmation and caps. No withdrawal permissions, ever.
- Sportsbooks can't be automated (no API, and their terms ban it), so bets are tracked, never placed.
- Every number is an estimate; not financial advice.
- Problem gambling help: 1-800-GAMBLER.

## Accounts, sharing and the demo
- In-app sign-in (Under Construction screen) with Owner and Guest roles; lockouts after bad tries.
- Share Online puts the shop at beta.constablehoagie.com.
- **Try the demo** on the sign-in screen opens a fully simulated shop as one of 10 personas, each with different connected apps.
  - Nothing is real or saved. 🎲 New demo shuffles.
  - The guided tour uses the same practice data and runs before setup on both menus.

## Looks, access and admin (v1.0)
- First visit asks for a look: **Original** (light, family-friendly) or **Dark Humor** (18+, neon, edgy jokes; no nudity).
  - The pick is saved in the browser (localStorage + cookie) and in the account.
  - Dark Humor plays an original 25-second neon "3 A.M. Bread Bank Job" short, then shows a neon, grown-up Under Construction sign-in.
- **Access tiers:** Regular and Zero Cool (god-mode admin). ConstableHoagie and DoctorCrench are Zero Cool.
- **Personal sign-in links** (/auth/link/...), revocable in The Gibson › People & links.
- **🕶 Admin tab (Zero Cool only):**
  - Revisions, start date, time spent.
  - Each project section with its goal, Claude effort share, possible savings and prompt tips.
  - People & tiers, sign-in links.
  - Ask Claude about the app (uses the shop PC's Claude login).
  - Project download.
- **First sign-in for an admin:** a gold-briefcase short that opens into the project download, then an offer to change the password (showing the current one).
- **Some features only work in the app on your own PC:** the Claude Code brain, free on-PC AI, the sports desk folder, MCP for Claude Desktop, and installing updates. The website is the same shop served from the owner's PC.

## People and first visits (v1.1)
- **Every person's first visit**, at any tier, plays once:
  1. The look picker.
  2. A personal short, if they have one.
  3. Hoagie's welcome.
  4. The guided tour with practice data.
  5. The AI question.
  6. Customize the dashboard.
- After that nothing auto-plays. Everything can be replayed from **👤 Me**.
- **The website:** first-time visitors see a pausable, skippable intro video (Original look) before the Under Construction sign-in. A "▶ Watch the intro" button stays on the sign-in page.
- **Alison (AliJoon):**
  - Regular tier, money-only feed with a **🏈 Sports tab** (games + Bet Tracker).
  - A "bright side" news feed: good news, humanitarian progress, upbeat money outlooks, things to look forward to, smart-money ideas.
  - Her own avatar in both looks.
  - Two garden shorts with Kiwi: Original "Kiwi Helps", and Dark Humor "Kiwi's War on the Garden".
- **Admins can switch the Sports tab per person:** The Gibson › People & links.

## Autopatcher (v1.3)
- New errors that keep repeating become scrubbed GitHub issues, with no personal data.
- Claude drafts the smallest fix plus a test in GitHub Actions, and the tests must pass.
- A Zero Cool admin approves it in 🕶 The Gibson › 🛠 Autopatch (or on GitHub), and a release goes out automatically. Every install updates within ~6 hours, with one-click rollback.
- Each admin can get email and/or Discord alerts.
- Optional auto-release for small, low-risk fixes.

## Build history
- **0.1:** shop, characters, Today's Play, Playbook, My Tab, Ask, lottery, Health Inspector, one-click launcher.
- **0.2:** cel-shaded game look.
- **0.3:** auto-updates from GitHub Releases, intro cutscene, Setup Quest.
- **0.4:** private beta online, Cloudflare Tunnel, in-app accounts.
- **0.5:** clearer pick cards, Today's Games, Learn, Money Plan.
- **0.6:** money-only vs full menu, Give, humanitarian news, daily email.
- **0.7:** Neon theme, net-worth chart, Costs, SimpleFIN, Trading counter, free AI, After Hours.
- **0.8:**
  - SnapTrade prompt during install.
  - Neon 18+ welcome tour and a separate setup checklist for the full menu.
  - Customize your Dashboard (stock dashboard if skipped).
  - Free data feeds, upbeat news filter, "✨ What you get" on every connection.
- **0.9:**
  - Pick Hoagie's brain (free / no-account options with fit scores), bring your own agent, Agent API, MCP server, webhooks.
  - Bet Tracker with charts, Kalshi and Sleeper.
  - All Integrations by category.
  - Demo mode with 10 personas; a guided tour before setup.
- **1.0:**
  - Original / Dark Humor picker and neon adult sign-in.
  - Zero Cool tier, admin panel and Ask Claude.
  - Sign-in links, briefcase download, password offer.
  - CLAUDE.md, HTML/MD readmes.
- **1.1:**
  - Alison's account and shorts.
  - First pass for everyone; 👤 Me replays.
  - Website intro video.
  - Bright-side feed, Sports tab.
- **1.2:** more flowers; private media library.
- **1.3:** GitHub autopatcher, per-admin email/Discord alerts, CLAUDE.md reworked.
