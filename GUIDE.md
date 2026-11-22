# 🥪 Constable Hoagie
### Protecting & Serving Your Dough

A sub shop on your PC that turns today's news and prices into a few simple money plays.

---

## Start here (3 steps)

1. **Unzip** this folder anywhere you like (Documents is fine).
2. **Double-click `Start Constable Hoagie`.**
   - The first time, a blue window sets things up. It installs Python (Hoagie's engine) if it's missing, adds a desktop icon, and offers to install Claude. Say **Y**.
   - If Windows says *"Windows protected your PC"*: click **More info → Run anyway**.
3. **Your browser opens the shop. Press START (or click the green door).**
   The first time, Hoagie gives you a quick tour (about a minute, skippable), then opens the **📜 Setup Quest**: a checklist you can do in any order, at your own pace. Skip anything; the 📜 button at the top brings it back anytime.

After that, just use the **Constable Hoagie** icon on your desktop.
To close him: double-click **`Stop Constable Hoagie`**.

---

## The three big buttons

| Button | What it does |
|---|---|
| 🥪 **Generate Today's Play** | Hoagie picks **one** thing worth doing today with your daily amount, plus **Today's Games**: up to 5 sports bets |
| 📋 **Build a Playbook** | Pick an amount, a risk level (🌶 to 🌶🌶🌶🌶🌶) and a time frame (same day, 48 hours to 4 weeks, 4 weeks +). You get up to 3 plays |
| 🗺 **Make My Money Plan** | Type in five numbers (pay, bills, savings, debt, its interest rate). Pick a risk level and how hands-on you want to be. You get a monthly split (safety net, debt, investing, fun money), a payday checklist, and a 10-year picture. Saves as PDF |

**Every pick leads with the same five lines:**

| | |
|---|---|
| 🎯 **The play** | Exactly what to do, in one sentence |
| 📍 **Where** | Which site, and whether it's legal where you are (NH and TX shown) |
| 💵 **Bet** | How much |
| 📈 **Est. return** | What you get if it wins, what you lose if it doesn't, and the honest average |
| 🔒 **Confidence** | High / Medium / Low, with the win chance for bets |

Below that: **Skip if** (when to walk away), and a fold-out comparing *you do it*, *Hoagie helps* and *fully automatic*.

### Today's Games (free sports data)

- Prices come from ESPN's free public scoreboard (no key). Leagues: NFL, college football, NBA, college hoops, WNBA, NHL, MLB, MLS, plus soccer (Premier League, Champions League, La Liga, Serie A, Bundesliga).
- Add the free **The Odds API** key at the Connect counter (500 credits a month, no card) to get **cricket** and **💎 price-edge** picks: it compares many sportsbooks and flags when DraftKings pays more than the fair price. Hoagie spends about 3 credits per pull, caches for 12 hours, and stops below 40 credits left.
- **🧭 Market lean** means no edge was found: it's the side that fits your risk level, and the average result is slightly negative (the sportsbook's cut). Hoagie always says which kind a pick is.
- Where: in NH, DraftKings is the only legal sportsbook. In Texas, sports betting isn't legal. You'd have to be physically in a state where it is.

## 🍽 Your menu: money-only or full

The first time anyone opens the shop, Hoagie asks:
- **Money only**: no sports bets, DFS or lottery anywhere: not in Today's Play, playbooks, news, the Ask counter's context, or emails. The Tickets counter disappears.
- **Full menu**: everything, including Today's Games. It needs a tick confirming you're old enough to bet where you live.

Each account picks its own (Doctor Crench's choice doesn't change yours). Change it anytime at **Connect counter → Your menu**.

## 💚 Give

Organizations ranked by how much good a dollar does:
- **#1–4** are GiveWell's top charities, ranked by its estimated cost to save a life.
- **#5** is GiveWell's Top Charities Fund, which splits money among them.
- **#6–7** are GiveDirectly and Direct Relief, measured differently: share of money that reaches people, plus independent ratings.

Every card links to its source, and the donate buttons open the charity's own site; Hoagie never touches the money. Below the list is **humanitarian news** from ReliefWeb (UN OCHA), The New Humanitarian and NPR. Humanitarian stories also get their own tag in the News Rail.

## ✉️ Daily email (no Claude)

At the **Email counter**, each person sets up their own email:
- **Topics:** Today's Play, markets, humanitarian news, a charity worth knowing, sports headlines, and (full menu only) Today's Games.
- **When:** a send time, and every day or weekdays only.
- **How far back the news goes:** 12 hours, 24 hours, 3 days or a week.

The email is built from Hoagie's own feeds and rules, so it never uses Claude.

**One-time setup (owner):** in the same counter, pick
- **Gmail**, with an app password (needs 2-Step Verification; about 500 emails a day), or
- **Brevo**, with a free SMTP key (300 a day).

The password stays in Windows Credential Manager. Emails go out from your PC, so it needs to be on with Hoagie open. If it was off, the email goes out the next time Hoagie runs that day. Use **Send me a test** (up to 3 an hour) to check it works.

## 🎨 Two looks: Original and Neon

- **Neon galactic sub shop:** night city through the window, holo menu boards, glowing counter, neon Hoagie and Kiwi, plus an original lofi / rap-rock / blues-rock / trap mixtape. Right-click the ♪ button to skip a track.
- **Original:** the bubbly daytime shop, with the 8-bit tarantella.
- **Defaults:** the full menu starts in Neon; money-only starts in Original.
- **Switching:** anyone can switch with the 🎨 chip at the top, or at Connect counter → Your menu → Look.

## 📈 Net worth, 🧾 costs, and connected accounts

- **My Tab:** a net-worth chart (30 days, 90 days, 1 year) with a tile per asset showing how its price moved.
  - Live prices: crypto (Coinbase), foreign cash (European Central Bank rates), US stocks and ETFs (Stooq, delayed).
  - Hoagie saves a snapshot daily. Until real history builds up, a dashed line estimates what today's holdings were worth.
- **Costs counter:**
  - Add spending by hand, import a bank CSV, or sync your bank read-only through **SimpleFIN** ($1.50/month or $15/year, paid to them; your bank password never touches Hoagie).
  - Spending is sorted into categories automatically. Set a monthly budget per category.
  - Export a month, or everything, to CSV.
  - Each person's costs are private to their account.
- **Trading counter:**
  - Search a list of 20 platforms and see what each API allows.
  - Connect **Alpaca** (balances plus paper or live orders), **Kraken** and **Coinbase** (balances), or **SnapTrade** (one read-only bridge to Robinhood, Schwab, Webull, E*TRADE, Vanguard and more; beta).
  - Live orders need live mode on (type LIVE), a confirm tick, and to be under your per-order cap.
  - Hoagie never asks for withdrawal permission.
  - The full list is in the "Constable Hoagie: Integrations & Capabilities" doc.

## 🧠 Pick Hoagie's brain (new in 0.9)

Setup now asks which AI writes your plays, answers questions and reads screenshots. Each option shows what it costs, whether it's **free**, whether it needs **no account**, and a **Hoagie fit score** (our estimate of how much of the shop it can use).

| Brain | Cost | Account? | Fit |
|---|---|---|---|
| Claude | Your Claude plan | Yes | 10/10 |
| Gemini | Free tier | Google account | 8/10 |
| GPT (OpenAI) | Pay as you go | Yes | 8/10 |
| Your own agent | Depends | No | 5-10 |
| Groq · OpenRouter free models | Free key | Yes | 6/10 |
| Ollama / LM Studio on this PC | Free | **No** | 5/10 |
| Foundry Local | Free | **No** | 4/10 |
| Chrome built-in AI / WebLLM | Free | **No** | 3/10 (Ask counter only) |

All keys go in Windows Credential Manager, and every AI call is made from your PC.

**Bring your own agent.** Two ways, both at Connect › 🧠 Pick Hoagie's brain:
1. **Your agent is Hoagie's brain.** Point Hoagie at any OpenAI-style address ending in `/v1` (Ollama, LM Studio, LiteLLM, n8n, Flowise, your own server).
2. **Your agent uses Hoagie.** Make a token (Read, or Read + log). Then:
   - MCP apps (Claude Desktop, Claude Code, Cursor): add `setup\hoagie_mcp.py` as an MCP server.
   - Anything else (ChatGPT actions, Zapier, IFTTT, iPhone Shortcuts, scripts): call `/agent/v1/snapshot`, or `POST /agent/v1/hook` to log a bet or a purchase.
   - Tokens can't move money, see keys or change settings.

## 🎟 Bet Tracker (full menu)

- **What it shows:** every open bet with live scores (ESPN, free), your record, profit and ROI, plus a chart of total bets, dollars wagered and potential payout over time.
- **Ways in:**
  - Type it, or paste a slip (`Lakers -3.5 -110 $20 DraftKings`).
  - Drop a screenshot of any sportsbook or DFS app (your AI reads it).
  - Import a CSV (Pikkit Pro export, Juice Reel, spreadsheets).
  - Hit 🎟 Track this bet on Today's Games.
  - Sync Kalshi positions (official API, read-only).
  - Log from your AI agent or a Shortcut.
- **Fantasy:** your Sleeper leagues (username only, no key).
- **Settling:** when a game is final, simple moneyline, spread and total bets get a suggested result for you to confirm.

## 🧩 All integrations

The 🧩 Integrations dock button lists everything by money category:
- 📈 Trading & Investing
- 🎰 Betting & Fantasy
- 🧾 Money Management & Banking
- 📊 Market & Economic Data
- 🧠 AI Brains & Research
- 🔌 Open Connections

Each entry shows its status (Live, Beta, Planned, Not possible), where it works (App, Website or Both), how it connects, and what you get.

## 🧭 Guided tour (before setup)

Right after the welcome, Hoagie offers a 2-minute tour with practice data. It's tailored to your menu:
- **Money-only:** Dashboard, My Tab, Costs, Today's Play, Trading, Integrations and the AI picker.
- **Full menu:** adds Today's Games and the Bet Tracker.

**Questions during the tour:**
- They go to the Claude Code login on your PC.
- Claude answers from the shop's notes, which ship with the app in `app\knowledge\` (project notes, build history) plus this README.
- On your own PC, the owner-only notes (LLC, taxes, plans) are included. Website visitors only get the feature notes.
- Visitors share a daily question budget (300 a day, 25 per tour) so they can't use up your Claude plan.
- With no AI connected, Hoagie quotes the matching notes instead.

When the tour ends, setup carries on: pick a brain, then customize your dashboard, then the Setup Quest. You can replay the tour anytime from the demo's 🧭 Guided tour button.

## 👀 Demo mode

The sign-in screen has **Try the demo**. It opens a fully simulated shop as one of 10 made-up people, each with different apps connected:

| Persona | Highlights |
|---|---|
| Crypto Carla | Coinbase, Kraken, Kalshi |
| Index Ivan | Vanguard via SnapTrade, SimpleFIN |
| Sharp Sam | The Odds API, FantasyPros, slip screenshots |
| Robinhood Rae | Robinhood via SnapTrade, Finnhub, GPT |
| Saver Sofia | Budgets, no-account Ollama |
| Fantasy Frank | Sleeper, PrizePicks, Underdog |
| Euro Elena | Multi-currency, Schwab |
| Agent Andy | Own agent, MCP, Shortcuts, Alpaca |
| Prediction Pat | Kalshi, FRED |
| Retiree Rita | Fidelity, SEC filings, morning email |

- **Every click is different.** Each visit gets a different person, and the numbers shift each time. 🎲 New demo shuffles again.
- **Fully simulated.** Portfolios, net-worth history, spending, bets and live scores are all made up.
- **Kept apart from your shop.** Demo visitors can't see your data, keys or AI plan, and nothing they do is saved.

## 📊 Your Dashboard (new in 0.8)

Right after the welcome tour, Hoagie asks you to **customize your dashboard**: tick the feeds you want. Each one shows **✨ What you get** so you know why it's worth it. Pick **Do it later** and you get the stock dashboard (the free, no-key cards). Change it anytime: 📊 Dashboard › ⚙ Customize.

| Feed | Key? | What it adds |
|---|---|---|
| U.S. Treasury + BLS | none | T-bill rate vs inflation: is your cash growing or shrinking? |
| SEC EDGAR | none | Fresh 10-K / 10-Q / 8-K filings for stocks you own |
| Crypto Fear & Greed | none | The crypto crowd's mood, 0 to 100 |
| FRED (St. Louis Fed) | free | Fed rate, 10-year, yield curve (recession warning), mortgage rates, jobs, gas |
| Finnhub | free | Earnings dates and headlines for your stocks |
| SnapTrade / brokers | free account | Brokerage balances on the dashboard |
| SimpleFIN | $1.50/mo, **paid by each user** | Bank balances and spending |
| The Odds API (full menu) | free | Today's Games price edges |

**Upbeat feed:** on the money-only menu, news, Today's Specials, emails and dashboard headlines lead with encouraging stories (progress, how-to, savings wins) and skip doom headlines. Turn it on or off in ⚙ Customize. Full-menu folks can switch it on too.

**Who pays for bank sync?** Each person pays SimpleFIN for their own connection ($1.50/month or $15/year). The shop (you, the host) pays nothing, and every account links its own token.

## 🔗 SnapTrade at install

The first-time setup asks: *Set up SnapTrade? (y/N)*. Say **y** and it opens SnapTrade Personal (free) so you can make an account, then puts "Link your brokerages" at the top of your Setup Quest. Say **n** and nothing changes; it's always available at the Trading counter.

## 🌃 The full-menu welcome

Pick the full menu and you get your own after-dark tour (neon, 18+), a feature highlight of everything in the shop, and a separate self-paced Setup Quest: bankroll, The Odds API, home state, dashboard, FantasyPros, brokers, bank, email, After Hours. Switch menus later and the tour plays once for the new side.

## 🤖 Free AI for anyone

The Ask counter adds AI that runs from the visitor's own browser, so it never uses your Claude plan:
- **No account:** Chrome's built-in AI, or WebLLM (an in-browser model).
- **Free keys:** Google Gemini, Groq or OpenRouter. Keys stay in that person's browser.

## 🌙 After hours (full menu only)

Every so often Hoagie offers a cold one, some "special" mushrooms (cue an alien from the ceiling tiles, two-headed Kiwi, three-eyed Hoagie), or a smoke break out back with your avatar and Kiwi. Kiwi leaves; she's a cat. It's cartoon gags only. Turn it off, or trigger one, at Connect counter → Your menu.

## 📚 Learn (Hoagie's School)

Two short courses, six one-minute lessons each, with a ⭐ per lesson:
- **Money 101**: budgeting, emergency fund, beating debt, credit scores, taxes, automating savings.
- **Investing 101**: compounding, stocks/bonds/cash, index funds and fees, 401(k)/IRA, risk and time, investing vs. speculating.

## The counters

| Counter | What's there |
|---|---|
| ✏️ Today's Special | At most 3 things worth knowing today |
| 🔔 Ask the Constable | Ask anything. Or just click Hoagie |
| 💼 My Tab | Everything you hold. Type it in, or drop a screenshot and Claude reads it |
| 📰 News Rail | Each story once, tagged with everything it affects |
| 🎟️ Lucky Ticket Counter | NH and TX number picker (honest about the odds) |
| 🔌 Connect Counter | Hook up Claude, Tavily, FantasyPros, your sports desk |
| 🧑‍🍳 Make Your Avatar | Build one or use a photo. They roam, grab subs, pet Kiwi |
| 🩺 Health Inspector | Checks everything and makes a bug report |

**Kiwi:** click her to pet her. Click the red bowl for a treat. 🐾
**Music:** the **♪ ON/OFF** button, top right. The app remembers your choice.

---

## Who answers your questions?

| Option | Cost | Notes |
|---|---|---|
| 🧠 **Claude** | your Claude plan | The smartest. Uses whoever is logged in to Claude Code on this PC. Picks its model automatically: quick questions use the fast one, bigger ones use your plan's best. You can change this at the Connect counter. |
| 🔎 **Tavily search** | free (1,000 searches a month) | Doesn't use your Claude plan. |
| 🦁 **Brave Search** | about $5 of free searches a month | Needs a card on file. |
| 💻 **Free AI on this PC** | free | Microsoft Foundry Local. For friends without Claude. |

**Auto** uses the best one you've connected.

## Your keys are safe

- Keys (FantasyPros, Tavily…) are stored in **Windows Credential Manager** on this PC, never in this folder.
- Hoagie never stores your Claude login. Claude Code handles that itself.
- So you can **zip this folder and give it to a friend**: it has none of your accounts in it. They connect their own.

## Put it online at constablehoagie.com (private beta) 🌐

**First, make accounts** (Share Online won't go live without an Owner account): open Hoagie → **Connect counter → 🔑 User accounts**. Make an **Owner** account for you and a **Guest** account for Doctor Crench.

1. Double-click **`Share Online`**. Press Enter for the domain (constablehoagie.com) and the address (beta).
2. It asks if you also want Cloudflare's emailed-code wall. **Press Enter for No.** Your own sign-in screen is the wall.
3. A browser opens to log Cloudflare in. Click your domain.
4. It goes online and **checks the wall the way a stranger would**: the address must show the Under Construction sign-in, and the shop's data must refuse to answer. If either fails, it takes the shop straight back offline and tells you what to fix.

- Your address: **https://beta.constablehoagie.com**. Send Doctor Crench the address plus his username and password. Nothing to install for him.
- It's online while your PC is on and Hoagie is open; **Start Constable Hoagie** reconnects it automatically.
- To take it offline: run **Share Online** again and type **S**.
- Want a second lock later? Run Share Online again and answer **y**; it walks you through Cloudflare's emailed-code wall (free for up to 50 people).

## User accounts (the Under Construction sign-in) 🔑

Anyone opening the shop from outside your PC sees a bubbly **🚧 Under Construction** screen with a username and password box, and nothing else, until they sign in.

- Make accounts at **Connect counter → 🔑 User accounts**: a username and a password of **10+ characters** (a short phrase is easiest, like `meatball-sub-2026`).
- **Owner** accounts get full access (use one for yourself when you're away from your PC). **Guest** accounts get the guest pass.
- Passwords are stored only as a scrambled fingerprint (never the password itself). Changing someone's password signs them out everywhere.
- Too many wrong tries locks that address out for 5 minutes, and that account for 15. Restarting Hoagie signs everyone out.
- **🚪 Sign out** is at the top right.
- Optional: tick **Also lock the shop on this PC** to need a sign-in at your own computer too. Hoagie won't let you turn this on without an Owner account, so you can't lock yourself out.

## Share privately with Doctor Crench 🔒 (Tailscale alternative)

1. Double-click **`Share Privately`**. The first time, it installs Tailscale (free) and asks you to sign in.
2. It copies your private shop address (it looks like `https://your-pc.something.ts.net`) and opens the Tailscale page where you **invite** Doctor Crench by email.
3. He installs Tailscale on his phone or computer, accepts the invite, and opens the address.

- Only people you invite can open it, and only while your PC is on and Hoagie is open.
- Guests can use the whole shop, but your keys, settings and updates are owner-only. Your holdings (My Tab) stay hidden unless you tick the box at the Connect counter.
- Guests' questions to Hoagie use **your** Claude login.
- To stop sharing: double-click **Share Privately** again and type **S**.
- Tailscale's free plan is for personal, non-commercial use. That's fine for testing; once the LLC is running the business, move to a business-friendly option (the plan doc covers this).

## Updates 🎁

When a new version is out, a **🎁 gift badge** appears at the top. Click it to see what's new, then **Update now**, or ignore it until you're ready.

- Updating keeps your settings, keys, avatars, holdings and Kiwi's treat count.
- The old version is saved. **Health Inspector → Roll back** puts it back.
- Updates come from the official GitHub page and are checked against their fingerprint (SHA-256) before installing.

### Publishing a new version (owner only)

Friends can ignore this part.

1. Make your changes.
2. Double-click **`Publish Update`**.
3. Answer two questions: the version number (press Enter to accept the suggestion), and a few lines of "what's new".

The first run installs Git and the GitHub CLI if needed, signs you in to GitHub, creates the public repo `<your-username>/constable-hoagie`, and points everyone's app at it. Only app files are uploaded; your keys and data never are.

## Something wrong?

1. Click **🩺 Health Inspector** (top right). Each problem has a one-line fix.
2. Still stuck? Click **Make report**. A zip appears on your Desktop with your keys removed. Drop it into a Claude chat and say what happened.

Common fixes:

- **"Claude Code isn't logged in"**: open PowerShell and run `claude auth login`.
- **Shop won't open**: double-click `Stop Constable Hoagie`, then `Start Constable Hoagie`.
- **Redo the setup**: in PowerShell, run `.\setup\hoagie.ps1 -Repair` from this folder.

## What this version does and doesn't do

✅ Reads news, prices, your sports desk and FantasyPros. Builds plays and playbooks. Tracks what you hold.
❌ **It never moves money.** Placing trades through Coinbase and Robinhood (within your limits, with your OK) comes in a later version.

---

*Hoagie's numbers are estimates from the assumptions shown on each card, not promises. Any play can lose money. Not financial advice; Constable Hoagie isn't a licensed advisor. If gambling stops being fun, call or text 1-800-GAMBLER.*
