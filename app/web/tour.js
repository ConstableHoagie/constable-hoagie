// Guided tour: Hoagie walks you through the shop with simulated practice data, before you connect anything.
// Works on both menus. Ask questions at any step: answers come from the shop's notes via the owner's Claude.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, hoagieArt */

const TOUR_COMMON_START = [
  { panel: null, title: "Practice money only", x: "Welcome to the guided tour! Everything you'll see is <b>practice data</b> for a made-up person, so poke at anything. Nothing's connected, nothing's saved. Ask me questions any time in the box below." },
  { panel: "dash", title: "📊 Your Dashboard", x: "Free public data boiled down: safe-money rates vs inflation, SEC filings and earnings for stocks you own, crypto mood. The 🥪 Hoagie's take box turns it into plain-English tips." },
  { panel: "tab", title: "💼 My Tab", x: "Everything you own in one place. Connected accounts show 🔗, prices update live, and the net-worth line shows how currencies and markets move your total. Drop a screenshot of any app and I'll read it in." },
  { panel: "costs", title: "🧾 Costs", x: "Where the money goes. Bank sync with SimpleFIN (each person pays their own $1.50 a month), CSV import, or type it. Budgets per category and a 6-month trend. Export any time." },
];
const TOUR_BETTING = [
  { panel: "today", title: "🥪 Today's Play + Games", x: "One button, one play. On the full menu you also get Today's Games: 💎 price edges when a book pays more than the fair price, 🧭 market leans when it doesn't. Hit 🎟 Track this bet to log one." },
  { panel: "bets", title: "🎟 Bet Tracker", x: "Every open bet with live scores, your record, profit and ROI, plus the chart of total bets, dollars wagered and potential payout. Bets come in by typing, pasted slips, screenshots, CSV, Kalshi, or your AI agent." },
];
const TOUR_MONEY = [
  { panel: "today", title: "🥪 Today's Play", x: "One button, one money move for today: what to do, how sure I am, the risk, and three ways to run it. The upbeat feed keeps the news encouraging." },
];
const TOUR_COMMON_END = [
  { panel: "trade", title: "📈 Trading", x: "Link Alpaca, Coinbase, Kraken, or 20+ brokers through SnapTrade. Read-only by default; live orders always need your OK and a cap. Each card shows ✨ What you get." },
  { panel: "integrations", title: "🧩 All integrations", x: "Every app I connect to, by money category: where it works (App, Website or Both), how it connects, and why it's worth it." },
  { panel: "aisetup", title: "🧠 Your AI brain", x: "Next up in your real setup: pick my brain. Free and no-account options are marked, each with a fit score. You can even plug in an AI agent you already use." },
  { panel: null, title: "📱 App vs website", x: "Heads-up: the website is this same shop, served from the owner's PC, so it's only up while that PC is on. A few things <b>only work in the app on your own PC</b>: the Claude Code brain and free on-PC AI (Ollama, Foundry), your sports desk folder, the MCP connection for Claude Desktop and Cursor, and installing updates. Everything else works in both. The 🧩 Integrations list marks each one App, Website or Both." },
  { panel: null, title: "That's the tour!", x: "Ready to set up your own shop? Your real data starts empty and private. Everything you just saw was practice." },
];

function tourSteps() {
  const bet = !!(STATUS && STATUS.me && STATUS.me.betting);
  return [...TOUR_COMMON_START, ...(bet ? TOUR_BETTING : TOUR_MONEY), ...TOUR_COMMON_END];
}

function runTour() {
  const steps = tourSteps();
  let i = 0;
  const card = document.createElement("div");
  card.id = "tour-card";
  card.innerHTML = `<div class="tc-face">${hoagieArt()}</div>
    <div class="tc-body"><div class="tc-top"><b id="tc-title"></b><span class="tiny" id="tc-n"></span></div>
      <div id="tc-text"></div>
      <form id="tc-ask" class="row"><input id="tc-q" placeholder="Ask Hoagie about this…" maxlength="300" autocomplete="off"><button class="btn">Ask</button></form>
      <div id="tc-a" class="tiny"></div>
      <div class="row tc-nav"><button class="btn" id="tc-back">◀ Back</button><button class="btn go" id="tc-next">Next ▶</button><button class="btn" id="tc-end">End tour</button></div></div>`;
  document.body.appendChild(card);
  const show = () => {
    const s = steps[i];
    $("#tc-title").textContent = s.title; $("#tc-n").textContent = `${i + 1} / ${steps.length}`;
    $("#tc-text").innerHTML = s.x; $("#tc-a").textContent = "";
    $("#tc-back").disabled = i === 0; $("#tc-next").textContent = i === steps.length - 1 ? (LS.get("tour-from-setup", false) ? "Set up my shop ▶" : "Finish ✔") : "Next ▶";
    if (s.panel) openPanel(s.panel); else closePanel();
    Music.blip("tick");
  };
  const finish = async () => {
    card.remove(); closePanel(); LS.set("tour-done", true);
    if (STATUS.demo && STATUS.demo.tour) {      // a guided tour: hand the person back to their own shop
      const fromSetup = LS.get("tour-from-setup", false);
      LS.set("tour-from-setup", false);
      await fetch("/api/auth/demo/end", { method: "POST" });
      location.href = fromSetup ? "/?enter=1&after_tour=1" : "/?enter=1";
    } else {
      say("Hope that helped! Hit 🎲 New demo to meet someone else, or Exit demo to head back.", [], 8000);
    }
  };
  $("#tc-next").onclick = () => { if (++i >= steps.length) finish(); else show(); };
  $("#tc-back").onclick = () => { if (i > 0) { i--; show(); } };
  $("#tc-end").onclick = finish;
  $("#tc-ask").onsubmit = async ev => {
    ev.preventDefault(); const q = $("#tc-q").value.trim(); if (!q) return;
    $("#tc-a").innerHTML = "<i>Hoagie's thinking…</i>";
    try { const r = await api("/api/tour/ask", { question: q, step: steps[i].title });
      $("#tc-a").innerHTML = `<b>Hoagie:</b> ${esc(r.answer)}${r.engine === "notes" ? ` <span class="tiny">(from the shop notes; no AI connected)</span>` : ""}`; $("#tc-q").value = ""; }
    catch (e) { $("#tc-a").innerHTML = `<span class="neg">${esc(e.message)}</span>`; }
  };
  show();
}

// Asked right after the welcome, before connecting anything
PANELS.tourprompt = (body, arg = {}) => {
  const bet = STATUS.me.betting;
  body.innerHTML = `<h2>${bet ? "🧭 Take the tour first?" : "🧭 Want a quick tour?"}</h2>
    <p class="lead">Before you connect anything, I can walk you through the Dashboard, My Tab, Costs${bet ? ", Today's Games and the Bet Tracker" : " and Today's Play"}, filled with <b>practice data</b> so you can see the whole thing working. About 2 minutes, and you can ask me questions along the way.</p>
    <div class="row"><button class="gbtn ${bet ? "red" : "green"}" id="tp-go">🧭 Take the tour</button><button class="btn" id="tp-skip">Skip, set up now</button></div>
    <p class="fine">The practice data is simulated. Your real shop stays empty and private until you connect your own accounts.</p>`;
  $("#tp-go").onclick = async () => {
    LS.set("tour-from-setup", true);
    const r = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menu: STATUS.me.menu, tour: true }) });
    if (r.ok) location.href = "/?enter=1&tour=1"; else { LS.set("tour-from-setup", false); toast("The tour isn't available right now."); if (arg.done) arg.done(); }
  };
  $("#tp-skip").onclick = () => { LS.set("tour-done", true); closePanel(); if (arg.done) arg.done(); };
};
// start the practice-data tour (first pass: fromSetup = true, so setup continues afterwards)
async function startTour(fromSetup) {
  LS.set("tour-from-setup", !!fromSetup);
  const menu = STATUS.me.betting ? "full" : "money";
  const r = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menu, tour: true }) });
  if (r.ok) location.href = "/?enter=1&tour=1";
  else { LS.set("tour-from-setup", false); toast("The tour isn't available right now."); if (fromSetup) continueSetup(); }
}
window.runTour = runTour;
window.startTour = startTour;
