// "What you get" for every connection: the plain-English payoff, shown on the Connect counter,
// the Trading counter, the Costs counter and "Customize your dashboard". One list, so every screen agrees.
/* global esc */
const BENEFITS = {
  // --- brains & search ---
  claude: { tag: "Smartest answers", gets: ["Today's Play and the Playbook read the actual news, not just rules", "Ask anything about your money in plain English", "Reads screenshots of any app into My Tab"] },
  tavily: { tag: "Free web search", gets: ["Answers cite fresh articles from today", "Better 'why' behind every play", "1,000 free searches a month"] },
  brave: { tag: "Backup search", gets: ["A second search engine when Tavily runs out", "Independent index, privacy-friendly"] },
  foundry: { tag: "Free AI, no account", gets: ["A small AI model running on your own PC", "Works offline; nothing leaves your computer"] },
  chrome: { tag: "Free, no account", gets: ["Uses the AI built into Chrome, right on your PC", "Nothing to sign up for; private by design"] },
  webllm: { tag: "Free, no account", gets: ["Downloads a small model into your browser once", "Then answers offline, nothing leaves your PC"] },
  gemini: { tag: "Free AI key", gets: ["Google's Gemini answers your questions in the Ask panel", "Generous free daily limit"] },
  groq: { tag: "Free, very fast AI", gets: ["Near-instant answers from open models", "Free tier, no card"] },
  openrouter: { tag: "Pick any model", gets: ["One key, dozens of models (several free)", "Swap brains without new accounts"] },
  // --- sports (full menu) ---
  fantasypros: { tag: "Pro projections", gets: ["Player projections and expert rankings for DFS and props", "Injury and depth-chart news on every bet card", "Sharper confidence numbers on Today's Play"] },
  oddsapi: { tag: "Live sportsbook lines", gets: ["Real prices from the books on every bet card", "Today's Games spots when one book's price is off (the edge)", "Line movement so you don't bet a stale number"] },
  hub: { tag: "Your own picks", gets: ["Your sports desk's picks and ledger show on the board", "Win/loss record by sport, read-only"] },
  // --- money data (everyone) ---
  fred: { tag: "Fed data", gets: ["Fed rate, 10-year yield and the recession-warning yield curve", "Mortgage rates: know when a refinance is worth a quote", "Unemployment and gas prices, updated automatically"] },
  finnhub: { tag: "Earnings radar", gets: ["Earnings dates for stocks you own, so big swings aren't a surprise", "Company headlines for your holdings (upbeat-filtered on money-only)"] },
  treasury: { gets: ["What T-bills pay right now: the 'safe money' yardstick"] },
  bls: { gets: ["Official inflation, so you know if cash is shrinking"] },
  edgar: { gets: ["Annual, quarterly and big-news filings for every stock you hold, straight from the SEC"] },
  fng: { gets: ["The crypto crowd's mood in one number, so you don't buy at peak hype"] },
  simplefin: { tag: "Real bank data", gets: ["Balances update in My Tab and your net-worth line automatically", "Transactions flow into the Costs counter, auto-sorted", "Read-only: nobody can move money through it. $1.50/mo, paid by you"] },
  smtp: { tag: "Morning email", gets: ["Your play, markets and news in your inbox before work", "No AI account needed"] },
  kalshi: { tag: "Prediction markets", gets: ["Open Kalshi positions appear as live bets in the Bet Tracker", "Your Kalshi cash joins My Tab and net worth", "Read-only in Hoagie: it can't trade"] },
  sleeper: { tag: "No key needed", gets: ["Your fantasy leagues, record and this week's score beside your bets", "Just your username: Sleeper's API is public and read-only"] },
  "slip-shot": { tag: "Any app", gets: ["Screenshot any slip (DraftKings, FanDuel, PrizePicks, Underdog…) and it's tracked", "Your AI reads book, pick, odds, stake and status"] },
  "agent-api": { tag: "Your agent + Hoagie", gets: ["Your AI agent or Shortcut can read your snapshot, dashboard and bets", "A read + log token lets it add bets and spending", "Never moves money, never sees keys"] },
  // --- brokers ---
  alpaca: { tag: "Trade automation", gets: ["Live balances and positions in My Tab and net worth", "Hoagie can place orders for you: practice money by default", "Live orders only after you type LIVE, confirm each one, and stay under your cap"] },
  coinbase: { tag: "Crypto, real-time", gets: ["Every coin you hold, priced live, in My Tab and net worth", "Auto-sync daily plus a one-tap refresh", "The API supports trading; Hoagie keeps it read-only for now (view-only key recommended)"] },
  kraken: { tag: "Crypto, real-time", gets: ["Balances priced live in My Tab and net worth", "Daily auto-sync; use a query-only key so nothing can trade or withdraw"] },
  snaptrade: { tag: "20+ brokers, one link", gets: ["Robinhood, Schwab, Webull, E*TRADE, Vanguard, Fidelity and more in one free, read-only connection", "Positions and cash sync into My Tab, net worth and the Dashboard's filings & earnings", "You log in at your broker; Hoagie never sees that password"] },
};
const BROKER_STATUS_GETS = {
  snaptrade: "Balances and positions sync into My Tab and net worth through SnapTrade (read-only).",
  planned: "On the list: no public API yet, so add it by hand or with a screenshot in My Tab for now.",
  none: "No API for personal accounts. Add balances by hand or drop a screenshot into My Tab.",
};

function benefitsHtml(id, fallbackStatus) {
  const b = BENEFITS[id];
  if (!b) return fallbackStatus && BROKER_STATUS_GETS[fallbackStatus] ? `<div class="gets"><b>✨ What you get:</b> ${esc(BROKER_STATUS_GETS[fallbackStatus])}</div>` : "";
  return `<div class="gets"><b>✨ What you get</b>${b.tag ? ` <span class="pill grey">${esc(b.tag)}</span>` : ""}<ul>${b.gets.map(g => `<li>${esc(g)}</li>`).join("")}</ul></div>`;
}
window.BENEFITS = BENEFITS; window.benefitsHtml = benefitsHtml;
