// Constable Hoagie: the shop's front of house.
"use strict";

// ---------- tiny helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
const money = n => (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);
const signed = n => (n > 0 ? "+" : "") + money(n);
const LS = {
  get(k, d) { try { const v = localStorage.getItem("hoagie-" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hoagie-" + k, JSON.stringify(v)); } catch (e) {} },
};
let STATUS = null;

async function api(path, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(path, opt);
  let data = {};
  try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && data.login) { location.href = "/login.html"; throw new Error("Please sign in."); }
  if (!r.ok) throw new Error(data.error || ("Request failed (" + r.status + ")"));
  return data;
}

// ---------- debugger hooks: every screen error is logged and offered as a bug report ----------
function reportClientError(kind, msg, extra) {
  fetch("/api/clientlog", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, msg, extra, page: location.hash }) }).catch(() => {});
}
window.addEventListener("error", e => { reportClientError("error", e.message, (e.filename || "") + ":" + e.lineno); offerBug("Something on the screen hiccuped."); });
window.addEventListener("unhandledrejection", e => { reportClientError("promise", String(e.reason && e.reason.message || e.reason)); });

function toast(msg, actions = [], ms = 6000) {
  const t = $("#toast");
  t.innerHTML = esc(msg) + actions.map((a, i) => ` <button class="btn" data-i="${i}">${esc(a.label)}</button>`).join("");
  t.hidden = false;
  $$("button", t).forEach(b => b.onclick = () => { t.hidden = true; actions[b.dataset.i].do(); });
  clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, ms);
}
function offerBug(msg) { toast(msg + " Want a bug report to send to Claude?", [{ label: "🐞 Make report", do: () => openPanel("health") }], 9000); }

// ---------- entrance ----------
$("#storefront-wrap").innerHTML = ART.storefront;
function enterShop() {
  $("#entrance").hidden = true; $("#shop").hidden = false;
  Music.start(); updateMusicBtn(); Music.blip("coin");
  startShop();
}
$("#enter-btn").onclick = enterShop;
// First visit: Original or Dark Humor? (saved in this browser now, and in the account once the shop loads)
if (window.LOOK && !LOOK.get() && !new URLSearchParams(location.search).get("enter")) {
  LOOK.choose(v => { applyTheme(LOOK.theme(v)); });
}
$(".shop-door").addEventListener("click", enterShop);
$(".shop-door").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") enterShop(); });

// ---------- music ----------
function updateMusicBtn() { $("#music-btn").textContent = Music.muted() ? "♪ OFF" : "♪ ON"; }
$("#music-btn").onclick = () => { Music.setMuted(!Music.muted()); updateMusicBtn(); };
window.addEventListener("hoagie-track", e => { if (!Music.muted() && THEME === "neon") toast("🎧 Now playing: " + e.detail, [{ label: "⏭ Skip", do: () => Music.nextTrack() }], 4500); });
$("#music-btn").title = "Mute / unmute. In the neon shop, right-click to skip the track.";
$("#music-btn").addEventListener("contextmenu", e => { if (THEME === "neon") { e.preventDefault(); Music.nextTrack(); } });

// ---------- Hoagie ----------
// ---------- theme: original or neon ----------
let THEME = "original";
function hoagieArt(opts) { return THEME === "neon" ? ART.NEON.hoagie(opts && opts.eyes3) : ART.toon(ART.HOAGIE); }
function applyTheme(t) {
  THEME = t === "neon" ? "neon" : "original";
  document.body.classList.toggle("theme-neon", THEME === "neon");
  $("#hoagie").innerHTML = hoagieArt();
  if (window.Music && Music.setStyle) Music.setStyle(THEME);
  const chip = $("#theme-chip"); if (chip) chip.innerHTML = `<span class="si">🎨</span><span>${THEME === "neon" ? "Neon" : "Original"}</span>`;
}
async function switchTheme() {
  const next = THEME === "neon" ? "original" : "neon";
  try { await api("/api/me", { theme: next }); } catch (e) { toast(e.message); return; }
  if (window.LOOK) LOOK.set(next === "neon" ? "dark" : "original");
  location.href = "/?enter=1";
}
fetch("/api/me").then(r => r.ok ? r.json() : null).then(m => { if (m && !STATUS) applyTheme(m.theme_eff); }).catch(() => {});
$("#hoagie").innerHTML = hoagieArt();
function say(html, actions = [], ms = 9000) {
  const b = $("#hoagie-bubble"), h = $("#hoagie");
  b.innerHTML = `<span class="who">Constable Hoagie</span>` + html + (actions.length ? `<div class="actions">${actions.map((a, i) => `<button class="btn ${a.cls || ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : "");
  b.hidden = false; h.classList.add("talk", "wave", "happy");
  $$(".actions button", b).forEach(x => x.onclick = () => { b.hidden = true; actions[x.dataset.i].do(); });
  setTimeout(() => h.classList.remove("talk"), 1600);
  setTimeout(() => h.classList.remove("wave", "happy"), 1500);
  clearTimeout(b._h); if (ms) b._h = setTimeout(() => b.hidden = true, ms);
}
$("#hoagie").onclick = () => { Music.blip(); openPanel("ask"); };
const TIPS = [
  "The bread 🍞 is savings. Every play has to beat the bread. That's the rule. I made it up, but it's a good rule.",
  "Kiwi's had four treats today. Allegedly. I didn't see anything. 🐾",
  "Not sure what to do? Hit 'Generate Today's Play'. One thing. That's it. We can do one thing.",
  "Every card has a 'skip if' line. Skipping is a play too. Sometimes the best play is a nap.",
  "Small amounts, big fees? That's like paying for a sub and getting the wrapper. Watch the fees.",
  "Okay, I'm not saying I'm nervous about the market. I'm just... slicing provolone very intensely.",
  "If a deal sounds too good to be true, it's probably a guy named Gary. Don't trust Gary.",
];
setInterval(() => { if (!$("#shop").hidden && $("#panel-backdrop").hidden && Math.random() < .5) say(esc(TIPS[Math.floor(Math.random() * TIPS.length)]), [], 7000); }, 60000);

// ---------- startup: status, self-check, special ----------
// After the welcome (and the optional tour): pick a brain -> customize the dashboard -> Setup Quest
function continueSetup() {
  const toQuest = () => openPanel("quest");
  const toDash = () => (!STATUS.me.dash_set ? openPanel("dashsetup", { done: toQuest }) : toQuest());
  if (!STATUS.me.ai_asked) openPanel("aisetup", { first: true, done: toDash }); else toDash();
}

// First visit for this person (any tier): their own short (if they have one) -> welcome cutscene -> tour -> setup
window.firstPass = firstPass;
function firstPass() {
  const me = STATUS.me;
  if (!me.intro_seen && me.videos === "alison" && window.SHORTS) {
    const look = (window.LOOK && LOOK.get()) || (THEME === "neon" ? "dark" : "original");
    SHORTS.garden(look === "dark" ? "dark" : "original", { offerOther: true, done: () => playIntro() });
  } else playIntro();
}

// ---------- Demo mode: simulated data, a different person every click ----------
const DEMO_APP_NAMES = { coinbase: "Coinbase", kraken: "Kraken", kalshi: "Kalshi", gemini: "Gemini", fng: "Fear & Greed", finnhub: "Finnhub", oddsapi: "The Odds API",
  snaptrade: "SnapTrade", simplefin: "SimpleFIN", claude: "Claude", fred: "FRED", treasury: "Treasury", bls: "BLS", edgar: "SEC EDGAR", fantasypros: "FantasyPros",
  "slip-shot": "Slip screenshots", alpaca: "Alpaca", espn: "ESPN", hub: "Sports desk", openai: "GPT", ollama: "Ollama (no account)", costs: "Costs", "bank-csv": "Bank CSV",
  sleeper: "Sleeper", groq: "Groq", "bet-csv": "Bet CSV", prices: "ECB currency rates", agent: "Own AI agent", "agent-api": "Agent API", mcp: "MCP", webhook: "Shortcuts/webhooks",
  openrouter: "OpenRouter", smtp: "Morning email" };
function demoBanner(d) {
  const b = document.createElement("div"); b.className = "demo-banner";
  b.innerHTML = `<span class="demo-tag">🎭 DEMO ${d.number}/${d.of}</span> <b>${esc(d.persona)}</b> <span class="tiny">${esc(d.blurb)}</span>
    <span class="demo-apps">${d.show.map(x => `<span class="pill grey">${esc(DEMO_APP_NAMES[x] || x)}</span>`).join("")}</span>
    <span class="demo-acts"><button class="btn go" id="demo-tour">🧭 Guided tour</button><button class="btn gold" id="demo-new">🎲 New demo</button><button class="btn" id="demo-exit">Exit demo</button></span>
    <div class="tiny demo-fine">All money, bets, accounts and connections here are simulated. Nothing is saved or sent anywhere.</div>`;
  $("#shop").prepend(b);
  $("#demo-new").onclick = demoShuffle;
  $("#demo-tour").onclick = () => { if (!$("#tour-card")) runTour(); };
  $("#demo-exit").onclick = async () => { await fetch("/api/auth/demo/end", { method: "POST" }); location.href = STATUS.remote ? "/login.html" : "/"; };
}
async function demoShuffle() {
  const r = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (r.ok) location.href = "/?enter=1"; else toast((await r.json()).error || "Couldn't shuffle.");
}

async function startShop() {
  try { STATUS = await api("/api/status"); } catch (e) { offerBug("Hoagie's kitchen didn't answer."); return; }
  { const b = document.createElement("button"); b.className = "stat theme-chip"; b.id = "theme-chip"; b.title = "Switch between the Original and Neon looks";
    b.onclick = switchTheme; $(".hud-stats").appendChild(b); }
  applyTheme(STATUS.me.theme_eff);
  if (window.LOOK && !STATUS.demo) {
    const lk = LOOK.get();
    if (!lk) { LOOK.choose(async v => { try { await api("/api/me", { theme: LOOK.theme(v) }); } catch (e) { /* guest */ } location.href = "/?enter=1"; }); }
    else if (STATUS.me.theme === "auto" && LOOK.theme(lk) !== STATUS.me.theme_eff) {
      try { await api("/api/me", { theme: LOOK.theme(lk) }); location.href = "/?enter=1"; return; } catch (e) { /* guests keep the browser's look */ }
    }
  }
  renderBudgetChip(); bumpStreak(); loadTabTotal();
  if (STATUS.signed_in_as) {
    const b = document.createElement("button"); b.className = "stat"; b.title = "Sign out";
    b.innerHTML = `<span class="si">🚪</span><span>${esc(STATUS.signed_in_as)} · Sign out</span>`;
    b.onclick = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login.html"; };
    $(".hud-stats").appendChild(b);
  }
  if (STATUS.guest) { const g = document.createElement("div"); g.className = "guest-pass";
    g.innerHTML = STATUS.account ? `👋 Signed in as ${esc(STATUS.account.name)} (${esc(STATUS.account.tier)}) · your own feed and settings in 👤 Me`
      : `👀 Guest pass${STATUS.guest_name ? " · " + esc(STATUS.guest_name) : ""} · you're visiting the shop. Settings and keys are owner-only.`; $("#shop").prepend(g); }
  applyMenu();
  document.body.classList.toggle("is-admin", !!STATUS.admin);
  document.body.classList.toggle("bet-view", !!STATUS.me.bet_view);
  if (STATUS.demo) demoBanner(STATUS.demo);
  loadSpecial();
  initScene(); initKiwi(); loadAvatars();
  if (STATUS.demo) { if (window.AFTER && !new URLSearchParams(location.search).get("tour")) AFTER.start(); await selfCheck(); refreshQuest();
    if (new URLSearchParams(location.search).get("tour") === "1") { setTimeout(runTour, 600); return; }
    say(`🎭 Welcome to the demo! You're ${esc(STATUS.demo.persona)}. Everything's simulated, so click anything: ${STATUS.me.betting ? "the 🎟 Bets counter, " : ""}📊 Dashboard, 💼 My Tab, 🧩 Integrations.`,
      [{ label: "🎲 New demo", do: demoShuffle }], 14000);
    return; }
  if (!STATUS.me.menu) await chooseMenu();
  if (window.AFTER) AFTER.start();
  const checks = await selfCheck();
  refreshQuest(); checkUpdate(false);
  if (window.runWelcome && await runWelcome()) return;   // first sign-in: briefcase + password offer
  if (new URLSearchParams(location.search).get("after_tour") === "1") { setTimeout(continueSetup, 500); return; }
  const neonDue = STATUS.me.betting && !LS.get("intro-neon-seen", false);
  if (!STATUS.me.intro_seen || neonDue) {
    setTimeout(firstPass, 700);
  } else if (STATUS.snaptrade_optin === true && !(STATUS.brokers_connected || []).includes("snaptrade") && !LS.get("snap-nudged", false)) {
    LS.set("snap-nudged", true);
    say("You said yes to SnapTrade during install. Want to link your brokerages now? Read-only, I promise.", [{ label: "🔗 Link them", cls: "go", do: () => openPanel("trade") }], 12000);
  } else if (checks.flaws.length) {
    const f = checks.flaws[0];
    say(`Okay, small thing, nobody panic: <b>${esc(f.name)}</b> needs a look. ${esc(f.fix || f.detail)}`,
      [{ label: "Show me", do: () => openPanel("health") }, { label: "🐞 Bug report", do: () => openPanel("health") }], 15000);
  } else {
    say("Morning! Specials are on the board, coffee's on, Kiwi's judging everyone. Want me to pick today's play?", [{ label: "🥪 Yes", cls: "go", do: todaysPlay }], 9000);
  }
}

const OPTIONAL = ["Tavily search", "FantasyPros", "Brave Search", "Gambling hub folder"];
async function selfCheck() {
  const chip = $("#health-chip");
  try {
    const { checks } = await api("/api/checks");
    const haveHelper = STATUS && Object.values(STATUS.engines).some(Boolean);
    const flaws = checks.filter(c => !c.ok && !OPTIONAL.includes(c.name) && !(c.name === "Claude" && haveHelper));
    chip.innerHTML = `<span class="si">🩺</span><span>${flaws.length ? flaws.length + " to fix" : "All good"}</span>`;
    const g = document.querySelector(".grade"); if (g) { g.textContent = flaws.length > 2 ? "C" : flaws.length ? "B" : "A"; g.setAttribute("fill", flaws.length ? "#c8102e" : "#2f6b3a"); }
    chip.classList.toggle("bad", !!flaws.length);
    window.LAST_CHECKS = checks;
    return { checks, flaws };
  } catch (e) {
    chip.innerHTML = `<span class="si">🩺</span><span>Check failed</span>`; chip.classList.add("bad");
    return { checks: [], flaws: [{ name: "Self-check", fix: "The check itself failed. Make a bug report.", detail: e.message }] };
  }
}
$("#health-chip").onclick = () => openPanel("health");

function renderBudgetChip() {
  const s = STATUS.settings;
  $("#budget-chip").innerHTML = `<span class="si">🌶</span><span>$${s.daily_budget} · risk ${s.risk}</span>`;
}
$("#budget-chip").onclick = () => openPanel("budget");

async function loadSpecial() {
  const box = $("#special-list");
  try {
    const d = await api("/api/special");
    if (!d.items.length) { box.innerHTML = `<div class="loading">The news is still in the oven. Try again in a minute.</div>`; return; }
    box.innerHTML = d.items.map(it => `
      <div class="special"><div class="em">${esc(it.emoji)}</div><div>
        <div class="tag">${esc(it.tag)}</div>
        <div class="ttl">${safeUrl(it.link) ? `<a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a>` : esc(it.title)}</div>
        <details><summary>more</summary>${esc(it.line)}<br><span class="tiny">${esc(it.more || "")}</span></details>
      </div></div>`).join("");
  } catch (e) { box.innerHTML = `<div class="loading">Couldn't load the special: ${esc(e.message)}</div>`; }
}

// ---------- panels: one thing at a time ----------
function openPanel(name, arg) {
  $("#panel-backdrop").hidden = false;
  const body = $("#panel-body");
  body.innerHTML = "";
  (PANELS[name] || (() => body.innerHTML = "Coming soon"))(body, arg);
  location.hash = name;
}
let PANEL_LOCKED = false;   // the first-visit menu choice can't be closed until you pick
function closePanel() { if (PANEL_LOCKED) return; $("#panel-backdrop").hidden = true; history.replaceState(null, "", " "); }
$("#panel-close").onclick = closePanel;
$("#panel-backdrop").addEventListener("click", e => { if (e.target.id === "panel-backdrop") closePanel(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });
$$("[data-open]").forEach(b => b.onclick = () => { Music.blip(); openPanel(b.dataset.open); });
$("#today-btn").onclick = todaysPlay;
$("#playbook-btn").onclick = () => openPanel("playbook");
$("#plan-btn").onclick = () => { Music.blip("coin"); openPanel("plan"); };

const PANELS = {};

// ---------- play cards ----------
function methodTile(m, r, best) {
  if (!r) return `<div class="method na"><div class="m-label">${m === "auto" ? "Fully automatic" : m}</div><div class="m-range">Not allowed here: the site bans bots</div></div>`;
  const cls = r.expected >= 0 ? "pos" : "neg";
  return `<div class="method ${m === best ? "best" : ""}">
    <div class="m-label">${esc(r.label)}${m === best ? " ⭐" : ""}</div>
    <div class="m-exp ${cls}">${signed(r.expected)}</div>
    <div class="m-range">likely · range ${signed(r.low)} to ${signed(r.high)}${r.fees ? ` · fees ${money(r.fees)}` : ""}${r.win_chance ? ` · ${(r.win_chance * 100).toFixed(0)}% win chance` : ""}</div>
  </div>`;
}
// The five things every pick leads with, in the same order every time.
function whereHtml(list) {
  return (list || []).map(w => `<div class="w ${w.ok ? "ok" : "no"}"><b>${esc(w.state)}</b> ${w.ok ? "✅" : "🚫"} ${esc(w.text)}</div>`).join("");
}
function ticket(rows) {
  return `<dl class="pick-ticket">${rows.map(([icon, label, html]) => `<div class="t-row"><dt>${icon} ${label}</dt><dd>${html}</dd></div>`).join("")}</dl>`;
}
function confBadge(word, pct) {
  const cls = /high/i.test(word) ? "hi" : /low/i.test(word) ? "lo" : "md";
  return `<span class="conf ${cls}">${esc(word)}${pct != null ? ` · ${pct}%` : ""}</span>`;
}
function playCard(c) {
  const calm = ["Savings", "FX"].includes(c.category) || c.horizon === "long";
  const f = c.facts;
  const methods = ["manual", "hybrid", "auto"].map(m => methodTile(m, c.returns[m], c.best_method)).join("");
  const news = (c.news || []).map(n => `<li>${safeUrl(n.link) ? `<a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.text)}</a>` : esc(n.text)} <span class="tiny">${esc(n.source || "")}</span></li>`).join("");
  const how = Object.entries(c.how).map(([m, steps]) => `<b>${esc({ manual: "You do it", hybrid: "Hoagie helps", auto: "Fully automatic" }[m])}:</b><ol>${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`).join("");
  const r = f.ret;
  return `<article class="play-card ${calm ? "calm" : ""}">
    <div class="pc-top"><span class="pc-menu">${esc(c.emoji)} ${esc(c.menu)} · ${esc(c.horizon_label)}</span></div>
    ${ticket([
      ["🎯", "The play", `<b>${esc(f.play)}</b>`],
      ["📍", "Where", `<div class="tiny">${esc(f.venue)}</div>${whereHtml(f.where)}`],
      ["💵", "Bet", `<b>${money(f.bet)}</b>`],
      ["📈", "Est. return", `<b class="${r.expected >= 0 ? "pos" : "neg"}">${signed(r.expected)} on average</b><div class="tiny">${esc(r.text)}</div>`],
      ["🔒", "Confidence", `${confBadge(f.conf.word, f.conf.pct)} <span class="tiny">${esc(f.conf.text)}</span>`],
    ])}
    <div class="quick">👉 ${esc(c.quick_take)}</div>
    <div class="skip">⚠️ <b>Skip if</b> ${esc(c.skip_if)}</div>
    <details class="more"><summary>Compare: do it yourself, with Hoagie, or automatic</summary>
      <div class="methods">${methods}</div>
      ${news ? `<h4>Why (the news)</h4><ul>${news}</ul>` : ""}
      <h4>How to do it</h4>${how}
      <p><b>Why the methods differ:</b> ${esc(c.why_method)}</p>
      <p><b>Assumptions:</b> ${esc(c.assumption)}</p>
      <p class="tiny">${esc(c.automation)} · ${esc(c.source)}</p>
    </details>
  </article>`;
}
function gameCard(g) {
  const edge = g.basis === "Price edge";
  return `<article class="play-card game">
    <div class="pc-top"><span class="pc-menu">${esc(g.emoji)} ${esc(g.league)} · ${esc(g.matchup)}</span>
      <span class="pill ${edge ? "" : "grey"}" title="${edge ? "A sportsbook is paying more than the fair price" : "No edge found: this is the market's view"}">${edge ? "💎 Price edge" : "🧭 Market lean"}</span></div>
    ${ticket([
      ["🎯", "The play", `<b>${esc(g.play)}</b> <span class="pill grey">${esc(g.price)}</span><div class="tiny">${esc(g.start_label)} · price from ${esc(g.book)}</div>${g.book_note ? `<div class="tiny neg">${esc(g.book_note)}</div>` : ""}`],
      ["📍", "Where", whereHtml(g.where)],
      ["💵", "Bet", `<b>${money(g.bet)}</b>`],
      ["📈", "Est. return", `If it wins: <b class="pos">+${money(g.if_win)}</b> · if it loses: <b class="neg">−${money(g.bet)}</b><div class="tiny">On average: ${signed(g.expected)} (${g.ev_pct >= 0 ? "+" : ""}${g.ev_pct}%)${edge ? "" : ", the sportsbook's cut"}</div>`],
      ["🔒", "Confidence", `${confBadge(g.confidence, g.confidence_pct)} <span class="tiny">the fair chance this side wins</span>`],
    ])}
    <div class="quick">👉 ${esc(g.why)}</div>
    <div class="skip">⚠️ <b>Skip if</b> ${esc(g.skip_if)}</div>
    <p class="tiny">${g.spread ? `Spread ${esc(g.spread)} · ` : ""}${g.total ? `Total ${esc(g.total)} · ` : ""}${esc(g.source)}</p>
    <div class="row"><button class="btn" data-track='${esc(JSON.stringify({ pick: g.play, event: g.matchup, book: g.book, odds: String(g.price).replace(/[^\d+-]/g, ""), stake: g.bet, game_time: g.start || "" }))}'>🎟 Track this bet</button></div>
  </article>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-track]"); if (b && window.trackBet) { try { window.trackBet(JSON.parse(b.dataset.track)); b.disabled = true; b.textContent = "✔ Tracking"; } catch (err) { /* ignore */ } } });
function gamesSection(gm) {
  if (!gm) return "";
  const list = gm.games || [];
  return `<h3 class="sec">🏟 Today's Games <span class="tiny">US sports, soccer and cricket · from ${esc((gm.sources || []).join(" + "))}</span></h3>
    ${list.length ? list.map(gameCard).join("") : `<p class="tiny">No games with posted prices in the next day and a half that fit your risk level${gm.checked ? ` (checked ${gm.checked})` : ""}. Try a different risk level, or check back closer to game time.</p>`}
    <p class="tiny">💎 Price edge = DraftKings is paying more than the fair price from several sportsbooks (needs the free Odds API key). 🧭 Market lean = no edge, just the side that fits your risk level. Both can lose.</p>`;
}
function printDoc(title, html) {
  $("#print-area").innerHTML = `<div class="print-head">🥪 Constable Hoagie · ${esc(title)}</div>${html}`;
  window.print();
}

// ---------- Generate Today's Play ----------
async function todaysPlay() {
  Music.blip("coin");
  openPanel("today");
}
PANELS.today = async (body) => {
  body.innerHTML = `<h2>🥪 Today's Play</h2><p class="lead">Hoagie's slicing today's news and prices… (up to a minute with Claude)</p>`;
  say("On it. Reading the news, checking prices, poking the sports desk. Give me a sec.", [], 6000);
  try {
    const d = await api("/api/play/today", {});
    const c = d.play;
    body.innerHTML = `<h2>🥪 Today's Play</h2>
      <p class="tiny">${esc(c.source)}</p>${playCard(c)}
      ${gamesSection(d.games)}
      <div class="row"><button class="btn go" id="tp-pdf">📄 Save as PDF</button>
        <button class="btn" id="tp-again">🔄 Another one</button>
        <button class="btn primary" id="tp-pb">📋 Build a full playbook</button></div>
      <p class="fine">${esc(d.fine_print)}</p>`;
    LS.set("q-play", true); refreshQuest();
    $("#tp-pdf").onclick = () => printDoc("Today's Play", playCard(c) + gamesSection(d.games) + `<p class="fine">${esc(d.fine_print)}</p>`);
    $("#tp-again").onclick = () => openPanel("today");
    $("#tp-pb").onclick = () => openPanel("playbook");
    say(`Here's one: <b>${esc(c.title)}</b>. The gold star is the best way to do it. I gave it the star. It earned it.`, [], 9000);
  } catch (e) {
    body.innerHTML = `<h2>🥪 Today's Play</h2><p>Hoagie dropped the sandwich: ${esc(e.message)}</p>`;
    offerBug("Today's Play didn't work.");
  }
};

// ---------- Playbook builder ----------
PANELS.playbook = (body) => {
  const s = STATUS.settings;
  let risk = s.risk, horizons = LS.get("horizons", ["same", "medium", "long"]);
  body.innerHTML = `<h2>📋 Build a Playbook</h2>
    <p class="lead">Pick an amount, how spicy, and how long. Hoagie compares doing it yourself, with his help, and fully automatic.</p>
    <div class="row">
      <label class="field">Amount ($)<input type="number" id="pb-amt" min="1" step="1" value="${esc(s.daily_budget)}"></label>
      <div><div class="field" style="font-weight:800;font-size:14px">Risk (🌶 = careful · 🌶🌶🌶🌶🌶 = spicy)</div>
        <div class="risk-dial">${[1, 2, 3, 4, 5].map(n => `<button data-r="${n}" class="${n === risk ? "on" : ""}">${n}</button>`).join("")}</div></div>
    </div>
    <div class="field" style="font-weight:800;font-size:14px;margin-top:8px">How long?</div>
    <div class="toggle-row">${[["same", "⚡ Same day"], ["medium", "🗓 48 hrs – 4 weeks"], ["long", "🌳 4 weeks +"]].map(([k, l]) =>
      `<button class="toggle ${horizons.includes(k) ? "on" : ""}" data-h="${k}">${l}</button>`).join("")}</div>
    <div class="row"><button class="gbtn red" id="pb-go">Make my playbook</button></div>
    <div id="pb-out"></div>`;
  $$(".risk-dial button", body).forEach(b => b.onclick = () => { risk = +b.dataset.r; $$(".risk-dial button", body).forEach(x => x.classList.toggle("on", x === b)); Music.blip(); });
  $$("[data-h]", body).forEach(b => b.onclick = () => {
    const k = b.dataset.h; horizons = horizons.includes(k) ? horizons.filter(x => x !== k) : [...horizons, k];
    b.classList.toggle("on"); LS.set("horizons", horizons); Music.blip();
  });
  $("#pb-go").onclick = async () => {
    const out = $("#pb-out");
    if (!horizons.length) { out.innerHTML = `<p>Pick at least one time frame.</p>`; return; }
    out.innerHTML = `<p class="lead">Building…</p>`;
    try {
      const pb = await api("/api/playbook", { amount: +$("#pb-amt").value || 25, risk, horizons });
      const t = pb.totals;
      const totals = `<div class="totals"><h3 style="margin-top:0">If you did the whole playbook…</h3><div class="methods">
        ${["manual", "hybrid", "auto"].map(m => `<div class="method"><div class="m-label">${{ manual: "You do it", hybrid: "Hoagie helps", auto: "Fully automatic" }[m]}</div>
          <div class="m-exp">${signed(t[m].expected)}</div><div class="m-range">range ${signed(t[m].low)} to ${signed(t[m].high)}</div>
          ${t[m].note ? `<div class="m-range">${esc(t[m].note)}</div>` : ""}</div>`).join("")}</div></div>`;
      const html = `<p class="tiny">${esc(pb.made)} · ${esc(pb.horizons.join(", "))}</p>${totals}${pb.cards.map(playCard).join("")}<p class="fine">${esc(pb.fine_print)}</p>`;
      out.innerHTML = html + `<div class="row"><button class="btn go" id="pb-pdf">📄 Save as PDF</button></div>`;
      $("#pb-pdf").onclick = () => printDoc(pb.title, html);
      Music.blip("coin");
    } catch (e) { out.innerHTML = `<p>Couldn't build it: ${esc(e.message)}</p>`; offerBug("The playbook didn't build."); }
  };
};

// ---------- Ask the Constable ----------
PANELS.ask = (body) => {
  const e = STATUS.engines;
  const shop = [["auto", "✨ Auto", true], ["claude", "🧠 Claude", e.claude], ["tavily", "🔎 Tavily search", e.tavily], ["brave", "🦁 Brave search", e.brave], ["foundry", "💻 Free AI (on the shop PC)", e.foundry]];
  let eng = LS.get("engine", "auto");
  const isFree = id => !!FREE_AI.get(id);
  body.innerHTML = `<h2>🔔 Ask the Constable</h2>
    <p class="lead">Ask anything about money, ${STATUS.me.betting ? "sports, " : ""}or today's news. Hoagie already knows today's headlines and prices.</p>
    <div class="tiny" style="font-weight:800">On the shop</div>
    <div class="engine-pick">${shop.map(([k, l, ok]) => `<button class="toggle ${k === eng ? "on" : ""}" data-e="${k}" ${ok ? "" : "disabled title='Not connected yet: see the Connect counter'"}>${l}${ok ? "" : " ·🔌"}</button>`).join("")}</div>
    <div class="tiny" style="font-weight:800;margin-top:8px">Free AI on your own device <span style="font-weight:600">(never uses the shop's Claude plan; keys stay in this browser)</span></div>
    <div class="engine-pick">${FREE_AI.list.map(p => `<button class="toggle ${p.id === eng ? "on" : ""}" data-e="${p.id}">${p.label}${p.account ? (FREE_AI.key(p.id) ? " ✅" : " ·🔑") : ""}</button>`).join("")}</div>
    <div id="free-setup"></div>
    <textarea id="ask-q" placeholder="e.g. What's moving Bitcoin today?  ·  How do I start an emergency fund?"></textarea>
    <div class="row"><button class="btn primary" id="ask-go">Ask</button></div>
    <div id="ask-out"></div>`;
  const setup = () => {
    const p = FREE_AI.get(eng), box = $("#free-setup", body);
    if (!p) { box.innerHTML = `<p class="tiny">Searches (Tavily, Brave) don't use your Claude plan. Claude picks its own model: quick questions get the fast one, bigger ones your plan's best.</p>`; return; }
    box.innerHTML = `<div class="conn"><h4>${p.label}</h4><p class="tiny">${p.how}</p>${benefitsHtml(p.id)}
      ${p.account ? `<div class="row">${p.link ? `<a class="btn" href="${p.link}" target="_blank" rel="noopener">Get a free key</a>` : ""}
        <input type="password" id="fk" placeholder="${FREE_AI.key(p.id) ? "key saved in this browser" : "paste your free key"}" style="flex:1"><button class="btn go" id="fk-save">Save</button>
        ${FREE_AI.key(p.id) ? `<button class="btn" id="fk-clear">Forget</button>` : ""}</div>
        <div class="row"><label class="field">Model<input type="text" id="fm" value="${esc(FREE_AI.model(p.id))}" placeholder="${p.id === "openrouter" ? "blank = pick a free one" : ""}"></label></div>` : ""}</div>`;
    if ($("#fk-save", box)) $("#fk-save", box).onclick = () => { FREE_AI.setKey(p.id, $("#fk", box).value); FREE_AI.setModel(p.id, $("#fm", box).value); toast("Saved in this browser only."); openPanel("ask"); };
    if ($("#fk-clear", box)) $("#fk-clear", box).onclick = () => { FREE_AI.setKey(p.id, ""); openPanel("ask"); };
    if ($("#fm", box)) $("#fm", box).onchange = ev => FREE_AI.setModel(p.id, ev.target.value);
  };
  setup();
  $$("[data-e]", body).forEach(b => b.onclick = () => { if (b.disabled) return; eng = b.dataset.e; LS.set("engine", eng); $$("[data-e]", body).forEach(x => x.classList.toggle("on", x === b)); setup(); });
  const go = async () => {
    const q = $("#ask-q").value.trim(); if (!q) return;
    const out = $("#ask-out"); out.innerHTML = `<p>Thinking…</p>`;
    say("Ooh. Good question. Hang on, let me look.", [], 4000);
    try {
      if (isFree(eng)) {
        const { system } = await api("/api/ask/context");
        const ans = await FREE_AI.ask(eng, system, q, t => out.innerHTML = `<p class="tiny">${esc(t)}</p>`);
        out.innerHTML = `<div class="answer">${esc(ans)}</div><p class="tiny">Answered by: ${esc(FREE_AI.get(eng).label)}, on your device. Not financial advice.</p>`;
        return;
      }
      const d = await api("/api/ask", { question: q, engine: eng });
      const res = (d.results || []).map(r => `<div class="news-item">${safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener"><b>${esc(r.title)}</b></a>` : `<b>${esc(r.title)}</b>`}<div class="tiny">${esc(r.summary)}</div></div>`).join("");
      out.innerHTML = (d.answer ? `<div class="answer">${esc(d.answer)}</div>` : "") + res +
        `<p class="tiny">Answered by: ${esc(d.engine)}${d.model ? " (" + esc(d.model) + ")" : ""}</p>`;
    } catch (err) { out.innerHTML = `<div class="answer">${esc(err.message)}</div>`; }
  };
  $("#ask-go").onclick = go;
  $("#ask-q").addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); go(); } });
  setTimeout(() => $("#ask-q").focus(), 50);
};

// ---------- My Tab (portfolio) ----------
PANELS.tab = async (body) => {
  body.innerHTML = `<h2>💼 My Tab</h2><p class="lead">Everything you hold, in one place. Type it in, drop a screenshot, or connect a bank or broker (read-only).</p>
    <div class="chart-card"><div class="row" style="justify-content:space-between;align-items:center"><div><div class="tiny">Net worth</div><div class="nw-total" id="nw-total">…</div></div>
      <div class="seg" id="nw-range">${[30, 90, 365].map(d => `<button data-d="${d}" class="${d === 90 ? "on" : ""}">${d === 365 ? "1 yr" : d + " days"}</button>`).join("")}</div></div>
      <div id="nw-chart">Loading the chart…</div><div id="nw-assets" class="asset-tiles"></div><p class="tiny" id="nw-note"></p></div>
    <div id="tab-out">Loading…</div>
    <h3>Add a holding</h3>
    <div class="row">
      <label class="field">Where<input type="text" id="t-venue" placeholder="Coinbase"></label>
      <label class="field">What<input type="text" id="t-asset" placeholder="BTC, VOO, USD"></label>
      <label class="field">How much<input type="number" id="t-amt" step="any" placeholder="0.01"></label>
      <label class="field">You paid ($)<input type="number" id="t-cost" step="any" placeholder="optional"></label>
      <label class="field">Worth now ($)<input type="number" id="t-val" step="any" placeholder="if no live price"></label>
      <button class="btn go" id="t-add">Add</button>
    </div>
    <h3>…or drop a screenshot</h3>
    <div class="row"><input type="file" id="t-shot" accept="image/*"> <input type="text" id="t-shot-venue" placeholder="Which app? (optional)"></div>
    <div id="shot-out" class="tiny"></div>`;
  const draw = async () => {
    const d = await api("/api/portfolio");
    if (d.private) { $("#tab-out").innerHTML = `<p>🔒 The owner's holdings are private to guests.</p>`; return; }
    $("#tab-out").innerHTML = d.rows.length ? `<table class="tab"><tr><th>Where</th><th>What</th><th>Amount</th><th>Worth now</th><th>Gain</th><th></th></tr>
      ${d.rows.map(r => `<tr><td>${esc(r.venue)}${r.linked ? " 🔗" : ""}</td><td>${esc(r.asset)}${r.live ? " 🟢" : ""}</td><td>${esc(r.amount)}</td><td>${money(r.now)}</td>
        <td>${r.gain === null ? "" : signed(r.gain)}</td><td>${r.linked ? "" : `<button class="btn" data-del="${esc(r.id)}">✕</button>`}</td></tr>`).join("")}
      <tr><th colspan="3">Total</th><th>${money(d.total)}</th><th>${d.gain === null ? "" : signed(d.gain)}</th><th></th></tr></table>
      <p class="tiny">🟢 = live price: crypto (Coinbase), foreign cash (European Central Bank rates), US stocks and ETFs (Stooq, delayed). Others use the value you typed. 🔗 = from a connected account.</p>`
      : `<p>Nothing on your tab yet.</p>`;
    $$("[data-del]").forEach(b => b.onclick = async () => { await api("/api/portfolio/delete", { id: b.dataset.del }); draw(); });
  };
  const drawNW = async (days = 90) => {
    try {
      const n = await api("/api/networth?days=" + days);
      if (n.private) { $("#nw-chart").innerHTML = "<p class='tiny'>🔒 Private.</p>"; return; }
      $("#nw-total").textContent = money(n.total);
      CHART.line($("#nw-chart"), [{ name: "Your daily snapshots", points: n.actual }, { name: "Estimate from today's holdings", points: n.estimate, dash: true }], { label: "Net worth, last " + days + " days" });
      $("#nw-assets").innerHTML = n.assets.map(a => `<div class="asset-tile"><div><b>${esc(a.asset)}</b> <span class="tiny">${esc(a.kind)}</span></div>
        <div>${money(a.value)}</div>${CHART.spark(a.prices)}
        <div class="tiny">${a.change_pct === null ? "no live price" : `${a.change_pct >= 0 ? "▲" : "▼"} ${Math.abs(a.change_pct).toFixed(1)}% in ${days === 365 ? "a year" : days + " days"}`}</div></div>`).join("");
      $("#nw-note").textContent = n.note;
    } catch (e) { $("#nw-chart").textContent = e.message; }
  };
  $$("#nw-range button").forEach(b => b.onclick = () => { $$("#nw-range button").forEach(x => x.classList.toggle("on", x === b)); drawNW(+b.dataset.d); });
  draw(); drawNW(90);
  $("#t-add").onclick = async () => {
    await api("/api/portfolio/item", { venue: $("#t-venue").value, asset: $("#t-asset").value, amount: $("#t-amt").value, cost: $("#t-cost").value, value: $("#t-val").value });
    ["#t-asset", "#t-amt", "#t-cost", "#t-val"].forEach(s => $(s).value = ""); draw(); Music.blip("coin");
  };
  $("#t-shot").onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const out = $("#shot-out"); out.textContent = "Reading the screenshot… (Claude, up to a minute)";
    const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    try {
      const d = await api("/api/portfolio/screenshot", { image: data, venue: $("#t-shot-venue").value });
      if (!d.items.length) { out.textContent = d.note || "Couldn't find holdings in that picture."; return; }
      out.innerHTML = `Found ${d.items.length}. Add them?<br>${d.items.map((i, k) => `<label><input type="checkbox" checked data-k="${k}"> ${esc(i.venue)} · ${esc(i.asset)} · ${esc(i.amount)}${i.value ? " · $" + esc(i.value) : ""}</label>`).join("<br>")}
        <div class="row"><button class="btn go" id="shot-add">Add checked</button></div>`;
      $("#shot-add").onclick = async () => {
        for (const cb of $$("[data-k]")) if (cb.checked) await api("/api/portfolio/item", d.items[cb.dataset.k]);
        out.textContent = "Added."; draw();
      };
    } catch (e) { out.textContent = e.message; }
  };
};

// ---------- News rail ----------
PANELS.news = async (body) => {
  body.innerHTML = `<h2>📰 News Rail</h2><p class="lead">Each story shows once, with every tag it touches. 🔴 = could move money today.</p><div class="toggle-row" id="nf"></div><div id="news-out">Loading…</div>`;
  try {
    const { news } = await api("/api/news");
    const tags = ["All", ...new Set(news.flatMap(n => n.tags))];
    let pick = "All";
    const draw = () => {
      $("#nf").innerHTML = tags.map(t => `<button class="toggle ${t === pick ? "on" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
      $$("[data-t]").forEach(b => b.onclick = () => { pick = b.dataset.t; draw(); });
      $("#news-out").innerHTML = news.filter(n => pick === "All" || n.tags.includes(pick)).map(n => `<div class="news-item">
        ${n.tags.map(t => `<span class="tagpill tag-${esc(t)}">${esc(t)}</span>`).join("")} ${n.impact === "high" ? `<span class="impact-high">🔴</span>` : ""}
        <div>${safeUrl(n.link) ? `<a href="${esc(n.link)}" target="_blank" rel="noopener"><b>${esc(n.title)}</b></a>` : `<b>${esc(n.title)}</b>`}</div>
        <div class="tiny">${esc(n.summary)} · ${esc(n.sources.join(", "))}</div></div>`).join("") || "<p>Nothing under that tag right now.</p>";
    };
    draw();
  } catch (e) { $("#news-out").textContent = e.message; }
};

// ---------- Lucky Ticket Counter ----------
PANELS.lotto = async (body) => {
  const games = await api("/api/lottery/games");
  let st = STATUS.settings.home_state in games ? STATUS.settings.home_state : "NH";
  body.innerHTML = `<h2>🎟️ Lucky Ticket Counter</h2>
    <p class="lead">Straight talk: every number has the same odds. Hoagie skips the numbers most people play, so if you hit, you're less likely to split it.</p>
    <div class="toggle-row">${Object.keys(games).map(s => `<button class="toggle ${s === st ? "on" : ""}" data-s="${s}">${s === "NH" ? "🌲 New Hampshire" : "🤠 Texas"}</button>`).join("")}</div>
    <div class="row"><select id="l-game"></select><label class="field">Tickets<input type="number" id="l-n" value="3" min="1" max="10"></label>
      <button class="btn primary" id="l-go">🎲 Pick my numbers</button></div>
    <div id="l-out"></div>`;
  const fill = () => { $("#l-game").innerHTML = games[st].games.map(g => `<option>${esc(g)}</option>`).join(""); };
  fill();
  $$("[data-s]", body).forEach(b => b.onclick = () => { st = b.dataset.s; $$("[data-s]", body).forEach(x => x.classList.toggle("on", x === b)); fill(); });
  $("#l-go").onclick = async () => {
    const d = await api(`/api/lottery?state=${st}&game=${encodeURIComponent($("#l-game").value)}&n=${$("#l-n").value}`);
    Music.blip("treat");
    $("#l-out").innerHTML = d.tickets.map(t => `<div class="ticket">${t.main.map(n => `<span class="ball">${n}</span>`).join("")}${t.bonus ? `<span class="ball bonus">${t.bonus}</span>` : ""}</div>`).join("") +
      `<p><b>Jackpot odds:</b> ${esc(d.jackpot_odds)} per $${esc(d.price)} ticket.</p>
       <p>${esc(d.buy_note)} ${st === "NH" ? `<button class="btn" id="l-buy">Open NH Lottery</button>` : ""}</p>
       <p class="tiny">${esc(d.honest)} ${esc(d.check)}</p>`;
    const b = $("#l-buy"); if (b) b.onclick = () => api("/api/open", { url: d.buy });
  };
};

// ---------- Connect Counter ----------
PANELS.connect = (body) => {
  const s = STATUS.settings, sec = STATUS.secrets, e = STATUS.engines;
  if (STATUS.guest) { body.innerHTML = `<h2>🔌 Connect Counter</h2><p class="lead">You're visiting with a guest pass, so accounts and keys are owner-only. The owner manages them on their PC.</p>`; return; }
  const keyCard = (id, title, emoji, desc, link, linkLabel) => `
    <div class="conn ${sec[id] ? "done" : ""}"><h4>${emoji} ${title} ${sec[id] ? "✅" : ""}</h4><p class="tiny">${desc}</p>${benefitsHtml(id)}
      <div class="row">${link ? `<button class="btn" data-link="${link}">${linkLabel}</button>` : ""}
        <input type="password" placeholder="paste key here" data-key="${id}" style="flex:1"> <button class="btn go" data-save="${id}">Save</button>
        ${sec[id] ? `<button class="btn" data-clear="${id}">Remove</button>` : ""}</div></div>`;
  body.innerHTML = `<h2>🔌 Connect Counter</h2>
    <p class="lead">Hook up what you use. Keys stay on this PC, in ${esc(STATUS.secure_store)}. Everything is optional.</p>
    <div class="row"><button class="btn gold" id="to-ai">🧠 Pick Hoagie's brain / bring your own agent</button><button class="btn" id="to-int">🔌 See all integrations</button></div>
    <div class="conn ${e.claude ? "done" : ""}"><h4>🧠 Claude ${e.claude ? "✅" : ""}</h4>${benefitsHtml("claude")}
      <p class="tiny">Uses whoever is logged in to Claude Code on this PC, so a shared copy uses your friend's own login, never yours.
      ${e.claude ? "" : "To install: open PowerShell and paste the line below, then run <code>claude auth login</code>."}</p>
      ${e.claude ? "" : `<div class="row"><code id="cl-cmd">irm https://claude.ai/install.ps1 | iex</code> <button class="btn" id="cl-copy">Copy</button></div>`}
      <div class="row"><label class="field">Model<select id="cl-model">
        ${[["", "Auto (recommended)"], ["opus", "Opus: smartest"], ["sonnet", "Sonnet: balanced"], ["haiku", "Haiku: fastest, lightest on usage"]].map(([v, l]) => `<option value="${v}" ${s.claude_model === v ? "selected" : ""}>${l}</option>`).join("")}
      </select></label></div></div>
    ${menuCard()}
    ${keyCard("tavily", "Tavily search (free)", "🔎", "1,000 free searches a month, no card. Sign up, copy your key, paste it here.", "https://app.tavily.com", "Get a free key")}
    ${keyCard("fantasypros", "FantasyPros (your HOF plan)", "🏈", "Your plan includes a personal API key: projections, rankings, news. Find it in your FantasyPros account.", "https://www.fantasypros.com/api-data/", "Where's my key?")}
    ${keyCard("brave", "Brave Search", "🦁", "About $5 of free searches a month; needs a card on file. Optional.", "https://brave.com/search/api/", "Get a key")}
    ${keyCard("fred", "FRED economic data (free)", "🏦", "St. Louis Fed's free key: rates, jobs, gas. Powers the Dashboard's rates card.", "https://fredaccount.stlouisfed.org/apikeys", "Get a free key")}
    ${keyCard("finnhub", "Finnhub (free)", "📅", "Free personal key, 60 calls a minute. Powers earnings dates and headlines for your stocks.", "https://finnhub.io/register", "Get a free key")}
    ${keyCard("oddsapi", "The Odds API", "📊", "DraftKings prices for bet cards. Same key your sports desk uses.", "https://the-odds-api.com", "Get a key")}
    <div class="conn ${e.foundry ? "done" : ""}"><h4>💻 Free AI on this PC (Foundry Local) ${e.foundry ? "✅" : ""}</h4>${benefitsHtml("foundry")}
      <p class="tiny">For friends who don't want Claude. Runs a free model on your computer. In PowerShell:</p>
      <div class="row"><code>winget install Microsoft.FoundryLocal</code> then <code>foundry model run phi-4-mini</code></div></div>
    <div class="conn ${s.hub_path ? "done" : ""}"><h4>🏟 Sports desk folder ${s.hub_path ? "✅" : ""}</h4>${benefitsHtml("hub")}
      <p class="tiny">Your Gambling hub folder (Hoagie only reads it). Paste its path, e.g. <code>Z:\\gambling</code>. Leave blank to skip.</p>
      <div class="row"><input type="text" id="hub-path" value="${esc(s.hub_path)}" style="flex:1" placeholder="C:\\path\\to\\gambling"> <button class="btn go" id="hub-save">Save</button></div><div id="hub-res" class="tiny"></div></div>
    <div class="conn"><h4>🔑 User accounts</h4>
      <p class="tiny">Anyone opening the shop from outside this PC sees the Under Construction sign-in and nothing else until they sign in. Make an account for each person (password: 10+ characters). <b>Zero Cool</b> accounts get god-mode admin access (everything, plus the 🕶 Admin tab); <b>Regular</b> accounts get the shop without keys or settings.</p>
      <div id="logins">Loading…</div>
      <div class="row"><input type="text" id="lg-name" placeholder="Username" maxlength="24"><input type="password" id="lg-pass" placeholder="Password (10+)">
        <select id="lg-role"><option value="guest">Regular</option><option value="owner">Zero Cool (admin)</option></select><button class="btn go" id="lg-add">Add</button></div>
      <label class="row"><input type="checkbox" id="lock-local" ${s.require_login_local ? "checked" : ""}> Also lock the shop on this PC (sign in here too)</label></div>
    <div class="conn"><h4>🔒 Private sharing (you + Doctor Crench)</h4>
      <p class="tiny">Easiest: make accounts above, then double-click <b>Share Online</b> for <b>https://beta.constablehoagie.com</b>. Visitors only see the Under Construction sign-in until they log in. Or <b>Share Privately</b> for Tailscale. Guests can use the shop but can't change your keys or settings.</p>
      <label class="row"><input type="checkbox" id="share-tab" ${s.share_tab_with_guests ? "checked" : ""}> Let guests see My Tab (your holdings)</label></div>
    <div class="conn"><h4>📈 Brokerages & crypto</h4><p class="tiny">Alpaca, Coinbase, Kraken and SnapTrade (Robinhood, Schwab, Webull and 20+ more) live at the Trading counter.</p>${benefitsHtml("snaptrade")}<div class="row"><button class="btn go" id="to-trade">Open the Trading counter</button></div></div>`;
  $$("[data-link]", body).forEach(b => b.onclick = () => api("/api/open", { url: b.dataset.link }));
  if ($("#to-trade", body)) $("#to-trade", body).onclick = () => openPanel("trade");
  $("#to-ai", body).onclick = () => openPanel("aisetup");
  $("#to-int", body).onclick = () => openPanel("integrations");
  $$("[data-save]", body).forEach(b => b.onclick = async () => {
    const v = $(`[data-key="${b.dataset.save}"]`, body).value.trim(); if (!v) return;
    await api("/api/secret", { name: b.dataset.save, value: v }); STATUS = await api("/api/status"); refreshQuest(); Music.blip("coin"); openPanel("connect"); toast("Saved. 👍");
  });
  $$("[data-clear]", body).forEach(b => b.onclick = async () => { await api("/api/secret", { name: b.dataset.clear, value: "" }); STATUS = await api("/api/status"); openPanel("connect"); });
  const cc = $("#cl-copy"); if (cc) cc.onclick = () => navigator.clipboard.writeText($("#cl-cmd").textContent).then(() => toast("Copied. Paste it into PowerShell."));
  const drawLogins = async () => {
    const d = await api("/api/auth/users", {});
    $("#logins").innerHTML = d.users.length ? d.users.map(u => `<div class="row"><b>${esc(u.name)}</b> <span class="pill ${u.role === "owner" ? "" : "grey"}">${esc(u.tier || u.role)}</span>
      <span class="tiny">since ${esc(u.created)}</span><button class="btn" data-rmuser="${esc(u.name)}">Remove</button></div>`).join("") : `<p class="tiny">No accounts yet, so nobody can get in from outside.</p>`;
    $$("[data-rmuser]").forEach(b => b.onclick = async () => { if (!confirm("Remove " + b.dataset.rmuser + "'s account?")) return; await api("/api/auth/users", { action: "remove", name: b.dataset.rmuser }); drawLogins(); });
  };
  drawLogins();
  $("#lg-add").onclick = async () => {
    try { await api("/api/auth/users", { action: "add", name: $("#lg-name").value, password: $("#lg-pass").value, role: $("#lg-role").value });
      $("#lg-name").value = ""; $("#lg-pass").value = ""; toast("Account saved. Give them the password privately (text or in person)."); drawLogins(); }
    catch (e) { toast(e.message); }
  };
  $("#lock-local").onchange = async (ev) => {
    if (ev.target.checked && !confirm("Lock the shop on this PC too? Make sure you have an Owner account first, or you'll lock yourself out.")) { ev.target.checked = false; return; }
    await api("/api/settings", { require_login_local: ev.target.checked }); STATUS = await api("/api/status"); toast(ev.target.checked ? "Locked on this PC too." : "This PC opens without signing in.");
  };
  $("#share-tab").onchange = async (ev) => { await api("/api/settings", { share_tab_with_guests: ev.target.checked }); STATUS = await api("/api/status"); toast(ev.target.checked ? "Guests can see My Tab." : "My Tab is private to guests."); };
  $("#cl-model").onchange = async (ev) => { await api("/api/settings", { claude_model: ev.target.value }); STATUS = await api("/api/status"); toast("Model set."); };
  $("#hub-save").onclick = async () => {
    await api("/api/settings", { hub_path: $("#hub-path").value.trim() }); STATUS = await api("/api/status"); refreshQuest();
    const h = await api("/api/hub");
    $("#hub-res").textContent = h.connected ? `Found: ${h.picks.map(p => p.sport).join(", ") || "no picks yet"}` : h.reason;
  };
};

// ---------- Budget & risk ----------
PANELS.budget = (body) => {
  const s = STATUS.settings;
  body.innerHTML = `<h2>💵 Your Daily Amount &amp; Risk</h2>
    <div class="row"><label class="field">Daily amount ($)<input type="number" id="b-amt" value="${esc(s.daily_budget)}" min="1"></label>
      <label class="field">Risk (1 careful – 5 spicy)<input type="number" id="b-risk" value="${esc(s.risk)}" min="1" max="5"></label>
      <label class="field">Home state<select id="b-st"><option ${s.home_state === "NH" ? "selected" : ""}>NH</option><option ${s.home_state === "TX" ? "selected" : ""}>TX</option></select></label></div>
    <button class="btn go" id="b-save">Save</button>
    <p class="tiny">This is what "Generate Today's Play" uses. Hoagie never moves money in this version.</p>`;
  $("#b-save").onclick = async () => {
    await api("/api/settings", { daily_budget: +$("#b-amt").value || 25, risk: Math.max(1, Math.min(5, +$("#b-risk").value || 2)), home_state: $("#b-st").value });
    STATUS = await api("/api/status"); renderBudgetChip(); LS.set("q-budget", true); refreshQuest(); closePanel(); toast("Saved.");
  };
};

// ---------- Health Inspector (debugger) ----------
PANELS.health = async (body) => {
  body.innerHTML = `<h2>🩺 Health Inspector</h2><p class="lead">Running checks…</p>`;
  const { checks, flaws } = await selfCheck();
  body.innerHTML = `<h2>🩺 Health Inspector</h2>
    <p class="lead">${flaws.length ? `${flaws.length} thing(s) to fix. Each has a one-line fix.` : "Everything that matters is working. ✅"}</p>
    ${checks.map(c => `<div class="check"><span class="ic">${c.ok ? "✅" : OPTIONAL.includes(c.name) ? "⚪" : "❌"}</span><div><b>${esc(c.name)}</b>: ${esc(c.detail)}${!c.ok && c.fix ? `<div class="tiny">Fix: ${esc(c.fix)}</div>` : ""}</div></div>`).join("")}
    <div class="row"><button class="btn" id="h-again">🔄 Check again</button> ${STATUS.engines.claude ? `<button class="btn" id="h-diag">🧠 Ask Claude what's wrong</button>` : ""}</div>
    <div id="h-diag-out"></div>
    <h3>🎁 Updates</h3><div id="h-upd" class="tiny">Checking…</div>
    <div class="row"><button class="btn" id="h-upd-check">🔄 Check for updates</button><button class="btn" id="h-rollback" hidden>⏪ Roll back to the last version</button></div>
    <h3>🎬 Replay</h3><div class="row"><button class="btn gold" id="h-intro">▶ Watch the intro again</button><button class="btn" id="h-quest">📜 Setup Quest</button></div>
    <h3>🐞 Make a bug report</h3>
    <p class="tiny">Packs the logs and checks into one zip on your Desktop, with your keys removed. Drop the zip into a Claude chat and say what happened.</p>
    <textarea id="h-note" placeholder="What were you doing when it went wrong? (optional)"></textarea>
    <div class="row"><button class="btn primary" id="h-bug">Make report</button></div><div id="h-bug-out" class="tiny"></div>`;
  $("#h-again").onclick = () => openPanel("health");
  $("#h-intro").onclick = () => { closePanel(); playIntro(); };
  $("#h-quest").onclick = () => openPanel("quest");
  const drawUpd = async (force) => {
    const [inf, c] = await Promise.all([api("/api/update/info"), api("/api/update/check" + (force ? "?force=1" : ""))]);
    $("#h-upd").innerHTML = `You're on <b>v${esc(inf.version)}</b>. ` + (!c.enabled ? esc(c.why) : c.error ? esc(c.error)
      : c.available ? `<b>v${esc(c.latest)} is ready.</b> <button class="btn gold" id="h-upd-go">See what's new</button>` : "That's the newest version. ✅");
    const g = $("#h-upd-go"); if (g) g.onclick = () => openPanel("update");
    $("#h-rollback").hidden = !inf.backups.length;
    if (c.available) showUpdateBadge(c);
  };
  drawUpd(false);
  $("#h-upd-check").onclick = () => { $("#h-upd").textContent = "Checking…"; drawUpd(true); };
  $("#h-rollback").onclick = async () => {
    if (!confirm("Go back to the previous version of Constable Hoagie? (Your settings and data stay.)")) return;
    try { await api("/api/update/rollback", {}); waitForRestart(null); } catch (e) { toast(e.message); }
  };
  const dg = $("#h-diag"); if (dg) dg.onclick = async () => {
    $("#h-diag-out").innerHTML = `<p>Asking Claude…</p>`;
    try { const d = await api("/api/diagnose", {}); $("#h-diag-out").innerHTML = `<div class="answer">${esc(d.answer)}</div>`; }
    catch (e) { $("#h-diag-out").textContent = e.message; }
  };
  $("#h-bug").onclick = async () => {
    const d = await api("/api/bug", { note: $("#h-note").value, state: { hash: location.hash, ua: navigator.userAgent, size: innerWidth + "x" + innerHeight } });
    $("#h-bug-out").innerHTML = `Saved: <code>${esc(d.path)}</code>. Drag it into a Claude chat. 👍`;
  };
};

// ---------- HUD extras: streak + tab total ----------
function bumpStreak() {
  const today = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
  let st = LS.get("streak", { last: "", n: 0 });
  if (st.last !== today) { st = { last: today, n: st.last === y ? st.n + 1 : 1 }; LS.set("streak", st); }
  $("#streak").textContent = st.n + (st.n === 1 ? " day" : " days");
  if (st.n > 1 && st.n % 5 === 0) setTimeout(() => say(`${st.n} days in a row! You're a regular now. I'd give you a punch card but the printer's broken.`, [], 7000), 4000);
}
$("#stat-streak").onclick = () => say("That's how many days in a row you've stopped by. Consistency beats luck. Mostly. Luck is also nice.", [], 7000);
async function loadTabTotal() {
  try { const d = await api("/api/portfolio"); $("#tab-total").textContent = d.rows.length ? money(d.total) : "Add holdings"; } catch (e) {}
}
$("#stat-tab").onclick = () => openPanel("tab");

// ---------- the scene: click things in the shop ----------
function initScene() {
  if ($("#scene-back").innerHTML) return;
  const set = THEME === "neon" ? ART.NEON : ART;
  $("#scene-back").innerHTML = set.sceneBack; $("#scene-front").innerHTML = set.sceneFront;
  $$("#scene .hot").forEach((h, i) => {
    h.querySelector(".bounce")?.style.setProperty("--d", (i * .17) + "s");
    const go = () => { Music.blip(); openPanel(h.dataset.open); };
    h.addEventListener("click", go);
    h.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

// ============================================================================================
// Kiwi: roams, jumps, scratches, chases yarn, naps. Click to pet, click the bowl for a treat.
// ============================================================================================
const kiwi = { el: null, x: 0, busy: false, pets: LS.get("pets", 0), treats: LS.get("treats", 0) };
const wait = ms => new Promise(r => setTimeout(r, ms));
const sceneW = () => $("#scene").clientWidth;
function floorMax(el) { return Math.max(200, sceneW() - el.offsetWidth - 8); }
function initKiwi() {
  if (kiwi.el) return;
  kiwi.el = $("#kiwi"); kiwi.el.innerHTML = ART.kiwi;
  kiwi.x = kiwi.el.offsetLeft; kiwi.el.style.left = kiwi.x + "px";
  $("#scratcher").innerHTML = ART.scratcher; $("#bowl").innerHTML = ART.bowl;
  updateTreats();
  kiwi.el.onclick = petKiwi;
  $("#bowl").onclick = giveTreat;
  setTimeout(kiwiLoop, 1500);
}
function updateTreats() { $("#pet-count").textContent = `🐾 ${kiwi.pets} pets · 🍗 ${kiwi.treats} treats`; }
function float(sym, x, y, cls = "heart") {
  const d = document.createElement("div"); d.className = cls; d.textContent = sym;
  d.style.left = x + "px"; d.style.top = y + "px"; document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
}
function kiwiPos() { const r = kiwi.el.getBoundingClientRect(); return { x: r.left + r.width * .7, y: r.top }; }
function setKiwiState(...cls) { kiwi.el.className = "actor"; cls.forEach(c => c && kiwi.el.classList.add(c)); if (kiwi.faceLeft) kiwi.el.classList.add("face-left"); }
function walkKiwi(x) {
  return new Promise(res => {
    x = Math.max(4, Math.min(floorMax(kiwi.el), x));
    kiwi.faceLeft = x < kiwi.x;
    const dist = Math.abs(x - kiwi.x), secs = Math.max(.35, dist / 160);
    kiwi.el.style.transition = `left ${secs}s linear`;
    setKiwiState("walking"); kiwi.el.style.left = x + "px"; kiwi.x = x;
    setTimeout(() => { setKiwiState(); res(); }, secs * 1000);
  });
}
async function kiwiLoop() {
  if (!kiwi.busy && !document.hidden && $("#panel-backdrop").hidden !== null) {
    kiwi.busy = true;
    const r = Math.random();
    try {
      if (r < .34) await walkKiwi(Math.random() * floorMax(kiwi.el));
      else if (r < .48) { setKiwiState("jump"); await wait(780); setKiwiState(); }
      else if (r < .6) { const sc = $("#scratcher"); await walkKiwi(sc.offsetLeft + sc.offsetWidth * .55); kiwi.faceLeft = true; setKiwiState("scratch"); await wait(2200); setKiwiState(); }
      else if (r < .72) await chaseYarn();
      else if (r < .86) { setKiwiState("loaf"); await wait(4000); setKiwiState(); }
      else { setKiwiState("loaf", "sleep"); for (let i = 0; i < 3; i++) { const p = kiwiPos(); float("💤", p.x, p.y - 10, "zzz"); await wait(1500); } setKiwiState(); }
    } catch (e) {}
    kiwi.busy = false;
  }
  setTimeout(kiwiLoop, 2500 + Math.random() * 4000);
}
async function chaseYarn() {
  const y = $("#yarn"), to = Math.random() * floorMax(kiwi.el);
  y.hidden = false; y.style.transition = "none"; y.style.left = kiwi.x + kiwi.el.offsetWidth + "px";
  await wait(50); y.style.transition = ""; y.style.left = to + "px";
  await walkKiwi(to - kiwi.el.offsetWidth * .5); setKiwiState("jump"); await wait(760); setKiwiState(); y.hidden = true;
}
function petKiwi() {
  kiwi.pets++; LS.set("pets", kiwi.pets); updateTreats(); Music.blip("purr"); if (kiwi.pets === 1) refreshQuest();
  setKiwiState("petted"); setTimeout(() => setKiwiState(), 720);
  const p = kiwiPos(); for (let i = 0; i < 4; i++) setTimeout(() => float(["💕", "❤️", "💖"][i % 3], p.x - 30 + Math.random() * 50, p.y), i * 140);
  if (kiwi.pets % 10 === 0) say(`Kiwi's been petted ${kiwi.pets} times. She's pretending not to care. She cares.`, [], 6000);
}
async function giveTreat() {
  if (kiwi.treating) return; kiwi.treating = true;
  kiwi.treats++; LS.set("treats", kiwi.treats); updateTreats(); Music.blip("treat");
  const b = $("#bowl"), br = b.getBoundingClientRect(); float("🍗", br.left + br.width / 2, br.top - 10, "crumb");
  kiwi.busy = true; await walkKiwi(b.offsetLeft + b.offsetWidth * .6); kiwi.faceLeft = true; setKiwiState("scratch"); await wait(1300); setKiwiState();
  const p = kiwiPos(); float("😋", p.x, p.y - 10); kiwi.busy = false; kiwi.treating = false;
}

// ============================================================================================
// Avatars: a game-style character creator. They roam, grab a sub, pet Kiwi.
// ============================================================================================
const SKIN = ["#fbe0c8", "#f2c4a0", "#e0a678", "#c4875a", "#99613b", "#6b4126", "#4a2c1a"];
const HAIRC = ["#1d1716", "#3b2a20", "#6b4226", "#a8682f", "#e0b860", "#c2412a", "#9a9a9a", "#ece6da", "#5aa0e8", "#e86fb0"];
const OUTFIT = ["#e8384f", "#3f9a5c", "#3fa9f5", "#ffd23f", "#7c4dbf", "#1d1b22", "#f4f1e8", "#f08a3c"];
const OPTS = {
  hair: [["bald", "Bald & shiny"], ["short", "Short"], ["spiky", "Spiky"], ["long", "Long"], ["curly", "Curly"], ["bun", "Bun"]],
  beard: [["none", "Clean"], ["stubble", "Stubble"], ["short", "Short beard"], ["full", "Full beard"]],
  glasses: [[false, "No glasses"], [true, "Round glasses"]],
  hat: [["none", "No hat"], ["cap", "Ball cap"], ["beanie", "Beanie"], ["chef", "Chef hat"], ["constable", "Constable helmet"]],
  top: [["tee", "T-shirt"], ["tank", "Tank top"], ["hoodie", "Hoodie"]],
  apron: [[true, "Deli apron"], [false, "No apron"]],
  tattoos: [[false, "No tattoos"], [true, "Tattoo sleeves"]],
  legs: [["shorts", "Shorts"], ["pants", "Pants"]],
};
let AVATARS = [];
async function loadAvatars() {
  try { AVATARS = (await api("/api/avatars")).avatars || []; } catch (e) { AVATARS = []; }
  $$(".walker").forEach(e => e.remove());
  AVATARS.forEach(spawnAvatar);
  if (STATUS && STATUS.me && STATUS.me.avatar === "alison") spawnAvatar(THEME === "neon" ? ART.ALISON_DARK : ART.ALISON);
}
function spawnAvatar(a) {
  const el = document.createElement("div"); el.className = "walker"; el.title = a.name || "a regular";
  el.innerHTML = `<div class="fig">${ART.toon(a)}</div><div class="nm">${esc(a.name || "")}</div>`;
  const layer = $("#floor-layer"); layer.appendChild(el);
  let x = sceneW() * (.3 + Math.random() * .55); el.style.left = x + "px";
  el.onclick = () => { const r = el.getBoundingClientRect(); float("👋", r.left + r.width / 2, r.top); Music.blip(); };
  const walk = to => new Promise(res => {
    to = Math.max(sceneW() * .2, Math.min(floorMax(el), to)); const d = Math.abs(to - x), secs = Math.max(.5, d / 110);
    el.style.transition = `left ${secs}s linear`; el.querySelector(".fig").style.transform = to < x ? "scaleX(-1)" : "";
    el.classList.add("walking"); el.style.left = to + "px"; x = to;
    setTimeout(() => { el.classList.remove("walking"); res(); }, secs * 1000);
  });
  const go = async () => {
    if (!document.body.contains(el)) return;
    const r = Math.random(), top = () => el.getBoundingClientRect();
    if (r < .4) await walk(Math.random() * floorMax(el));
    else if (r < .7) { await walk(sceneW() * .5); float("🥪", top().left + 20, top().top, "crumb"); await wait(1200); float("😋", top().left + 20, top().top); }
    else { await walk(kiwi.x + kiwi.el.offsetWidth); const p = kiwiPos(); float("💕", p.x, p.y); Music.blip("purr"); setKiwiState("petted"); setTimeout(() => setKiwiState(), 720); await wait(1400); }
    setTimeout(go, 3000 + Math.random() * 6000);
  };
  setTimeout(go, 1000 + Math.random() * 3000);
}
async function shrinkPhoto(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = 200;
  c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2 * .5, s, s, 0, 0, 200, 200);
  return c.toDataURL("image/jpeg", .85);
}
PANELS.avatar = (body) => {
  let a = { id: Math.random().toString(36).slice(2, 8), name: "", skin: SKIN[1], hair: "short", hairC: HAIRC[1], beard: "none", glasses: false, hat: "none",
            top: "tee", topC: OUTFIT[0], apron: false, tattoos: false, legs: "pants", legC: "#2d3a5a", shoeC: "#f4f1e8", photo: "" };
  let tab = "look";
  const picker = (key, label) => {
    const list = OPTS[key], i = list.findIndex(([v]) => String(v) === String(a[key]));
    return `<div class="picker-label">${label}</div><div class="picker"><button class="arrow" data-step="${key}" data-d="-1">◀</button>
      <div class="val">${esc(list[Math.max(0, i)][1])}</div><button class="arrow" data-step="${key}" data-d="1">▶</button></div>`;
  };
  const swatch = (key, list, label) => `<div class="picker-label">${label}</div><div class="swatches">${list.map(c => `<button data-sw="${key}" data-v="${c}" class="${a[key] === c ? "on" : ""}" style="background:${c}" aria-label="${label} ${c}"></button>`).join("")}</div>`;
  const tabs = { look: "🙂 Look", hair: "💇 Hair", outfit: "👕 Outfit", photo: "📷 Photo" };
  const draw = () => {
    const panes = {
      look: swatch("skin", SKIN, "Skin tone") + picker("glasses", "Glasses") + picker("beard", "Facial hair"),
      hair: picker("hair", "Hairstyle") + swatch("hairC", HAIRC, "Hair colour") + picker("hat", "Hat"),
      outfit: picker("top", "Top") + swatch("topC", OUTFIT, "Top colour") + picker("apron", "Apron") + picker("tattoos", "Arms")
        + picker("legs", "Bottoms") + swatch("legC", ["#2d3a5a", "#1d1b22", "#6b4a2f", "#8a8f99", "#3f9a5c"], "Bottoms colour"),
      photo: `<p class="lead">Use your own face! Hoagie gives it a cel-shaded filter so it fits the shop. It stays on this PC.</p>
        <div class="row"><label class="btn gold">📷 Choose a photo<input type="file" id="av-photo" accept="image/*" hidden></label>${a.photo ? `<button class="btn" id="av-nophoto">Remove photo</button>` : ""}</div>`,
    };
    body.innerHTML = `<h2>🧑‍🍳 Make Your Avatar</h2>
      <div class="creator">
        <div class="stage"><div class="nameplate">${esc(a.name || "New regular")}</div><div class="spin">${ART.toon(a)}</div><div class="pedestal"></div></div>
        <div>
          <label class="field">Name<input type="text" id="av-name" value="${esc(a.name)}" maxlength="16" placeholder="What do we call you?"></label>
          <div class="tabs" style="margin-top:12px">${Object.entries(tabs).map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div>
          ${panes[tab]}
          <div class="row" style="margin-top:14px"><button class="gbtn sm gold" id="av-rand">🎲 Surprise me</button><button class="gbtn sm green" id="av-save">✅ Send into the shop</button></div>
        </div>
      </div>
      ${AVATARS.length ? `<h3>Your regulars (${AVATARS.length}/6)</h3><div class="regulars">${AVATARS.map((x, i) => `<div class="reg">${ART.toon(x)}<div class="tiny">${esc(x.name || "")}</div><button class="btn" data-rm="${i}">✕</button></div>`).join("")}</div>` : ""}`;
    const keepName = () => { const n = $("#av-name"); if (n) a.name = n.value; };
    $("#av-name").oninput = e => { a.name = e.target.value; $(".nameplate", body).textContent = a.name || "New regular"; };
    $$("[data-tab]", body).forEach(b => b.onclick = () => { keepName(); tab = b.dataset.tab; draw(); });
    $$("[data-step]", body).forEach(b => b.onclick = () => { keepName(); const k = b.dataset.step, list = OPTS[k];
      const i = list.findIndex(([v]) => String(v) === String(a[k])); a[k] = list[(i + +b.dataset.d + list.length) % list.length][0]; Music.blip(); draw(); });
    $$("[data-sw]", body).forEach(b => b.onclick = () => { keepName(); a[b.dataset.sw] = b.dataset.v; Music.blip(); draw(); });
    const ph = $("#av-photo"); if (ph) ph.onchange = async ev => { if (ev.target.files[0]) { keepName(); a.photo = await shrinkPhoto(ev.target.files[0]); draw(); } };
    const np = $("#av-nophoto"); if (np) np.onclick = () => { a.photo = ""; draw(); };
    $("#av-rand").onclick = () => { keepName(); const pick = l => l[Math.floor(Math.random() * l.length)];
      Object.assign(a, { skin: pick(SKIN), hairC: pick(HAIRC), topC: pick(OUTFIT) });
      Object.keys(OPTS).forEach(k => a[k] = pick(OPTS[k])[0]); Music.blip("coin"); draw(); };
    $("#av-save").onclick = async () => {
      keepName(); a.beardC = a.hairC;
      AVATARS = [...AVATARS, a].slice(-6); await api("/api/avatars", { avatars: AVATARS }); await loadAvatars(); refreshQuest(); closePanel();
      say(`${esc(a.name || "Your avatar")} just walked in! Somebody get them a sub. Not that one. That one's mine.`, [], 7000); Music.blip("coin");
    };
    $$("[data-rm]", body).forEach(b => b.onclick = async () => { AVATARS.splice(+b.dataset.rm, 1); await api("/api/avatars", { avatars: AVATARS }); loadAvatars(); draw(); });
  };
  draw();
};

// ============================================================================================
// Updates (GitHub Releases): a gift badge when a new version is out; you choose when.
// ============================================================================================
let UPDATE = null;
function showUpdateBadge(c) {
  UPDATE = c; const b = $("#update-badge"); b.hidden = false;
  b.querySelector("span:last-child").textContent = "v" + c.latest + " ready";
}
async function checkUpdate(force) {
  try { const c = await api("/api/update/check" + (force ? "?force=1" : "")); if (c.available) {
    showUpdateBadge(c); setTimeout(() => say(`Psst. A new version of me is out (v${esc(c.latest)}). Fresh bread! Click the 🎁 up top whenever you like.`, [], 9000), 9000); } } catch (e) {}
}
$("#update-badge").onclick = () => openPanel("update");
PANELS.update = async (body) => {
  body.innerHTML = `<h2>🎁 New version!</h2><p class="lead">Checking…</p>`;
  let c = UPDATE;
  try { c = await api("/api/update/check?force=1"); } catch (e) {}
  if (!c || !c.available) { body.innerHTML = `<h2>🎁 Updates</h2><p class="lead">${c && c.error ? esc(c.error) : "You're on the newest version. ✅"}</p>`; return; }
  body.innerHTML = `<h2>🎁 Version ${esc(c.latest)} is ready</h2>
    <p class="lead">You have v${esc(c.current)}. Your settings, keys, avatars and Kiwi's treat count all stay put.</p>
    <div class="notes">${esc(c.notes || "Small fixes and improvements.")}</div>
    <p class="tiny">${esc(c.size_mb)} MB · checked against its fingerprint (SHA-256) before installing · the old version is kept so you can roll back.</p>
    <div class="row"><button class="gbtn green" id="u-go">⬇ Update now</button><button class="btn" id="u-later">Later</button></div><div id="u-out"></div>`;
  $("#u-later").onclick = closePanel;
  $("#u-go").onclick = async () => {
    $("#u-go").disabled = true;
    $("#u-out").innerHTML = `<p class="lead">Downloading and checking… 🥖</p><div class="bar"><div style="width:30%"></div></div>`;
    try { await api("/api/update/apply", {}); waitForRestart(c.latest); }
    catch (e) { $("#u-out").innerHTML = `<div class="answer">${esc(e.message)}</div>`; $("#u-go").disabled = false; }
  };
};
function waitForRestart(want) {
  openPanel("restarting");
  const t0 = Date.now(), bar = () => $("#r-bar");
  const tick = async () => {
    const pct = Math.min(95, 20 + (Date.now() - t0) / 900); if (bar()) bar().style.width = pct + "%";
    try { const st = await (await fetch("/api/status")).json(); if (!want || st.version === want) { location.href = "/?enter=1"; return; } } catch (e) {}
    if (Date.now() - t0 > 120000) { $("#r-msg").textContent = "This is taking a while. If the shop doesn't come back, double-click Start Constable Hoagie."; return; }
    setTimeout(tick, 1500);
  };
  setTimeout(tick, 3000);
}
PANELS.restarting = (body) => {
  body.innerHTML = `<h2>🔧 Hoagie's remodeling the shop</h2><p class="lead" id="r-msg">Swapping in the new version. Back in a few seconds; this page reloads by itself.</p>
    <div class="bar"><div id="r-bar" style="width:20%"></div></div>`;
};

// ============================================================================================
// Setup Quest: a self-paced checklist. Do steps in any order, skip any, come back anytime.
// ============================================================================================
const Q_SNAP = { id: "snap", icon: "🔗", title: "Link your brokerages (SnapTrade)", desc: "Free and read-only: Robinhood, Schwab, Webull, E*TRADE, Vanguard and more show up in My Tab.",
  done: () => (STATUS.brokers_connected || []).includes("snaptrade"), go: () => openPanel("trade") };
const Q_DASH = { id: "dash", icon: "📊", title: "Customize your dashboard", desc: "Pick your free money feeds: inflation vs safe yield, SEC filings, rates, earnings.",
  done: () => !!(STATUS.me && STATUS.me.dash_set), go: () => openPanel("dashsetup") };
const Q_AI = { id: "ai", icon: "🧠", title: "Pick Hoagie's brain", desc: "Claude, Gemini, GPT, free and no-account options, or your own agent. Scored by how well each uses the shop.",
  done: () => !!(STATUS.settings && STATUS.settings.ai_set) || ["claude", "openai", "gemini", "agent", "groq", "openrouter"].some(k => STATUS.engines[k]), go: () => openPanel("aisetup") };
const Q_BANK = { id: "bank", icon: "🏧", title: "Sync your bank (optional)", desc: "SimpleFIN reads balances and spending, read-only. $1.50/mo, paid by you, not the shop.",
  done: () => !!STATUS.bank_connected, go: () => openPanel("costs") };
const Q_EMAIL = { id: "email", icon: "✉️", title: "Get a morning email", desc: "Your play, markets and news, no AI account needed.",
  done: () => !!(STATUS.me && STATUS.me.email && STATUS.me.email.on), go: () => openPanel("email") };
const QUESTS_MONEY = [
  { id: "budget", icon: "💵", title: "Set your daily amount & risk", desc: "How much on a normal day, and how spicy.", done: () => LS.get("q-budget", false), go: () => openPanel("budget") },
  Q_AI, Q_DASH,
  { id: "search", icon: "🔎", title: "Add free search (Tavily)", desc: "1,000 free searches a month. Two minutes.", done: () => STATUS.secrets.tavily, go: () => openPanel("connect") },
  Q_SNAP, Q_BANK, Q_EMAIL,
  { id: "avatar", icon: "🧑‍🍳", title: "Make your avatar", desc: "Hang out in the shop with Kiwi.", done: () => AVATARS.length > 0, go: () => openPanel("avatar") },
  { id: "play", icon: "🥪", title: "Generate your first play", desc: "One button. One play. See how it works.", done: () => LS.get("q-play", false), go: () => openPanel("today") },
  { id: "kiwi", icon: "🐾", title: "Pet Kiwi", desc: "She's on the floor. Click her. It's important.", done: () => kiwi.pets > 0, go: () => { closePanel(); say("She's down on the floor. Click her! Gently. She bites the stock market, not people.", [], 7000); } },
];
// The full (betting) menu gets its own after-dark checklist
const QUESTS_FULL = [
  { id: "budget", icon: "🎚", title: "Set your bankroll & risk", desc: "Your normal daily amount and how wild it gets. Hoagie sizes every play off this.", done: () => LS.get("q-budget", false), go: () => openPanel("budget") },
  { id: "odds", icon: "🎯", title: "Plug in The Odds API (free key)", desc: "Live lines from the books so Today's Games can spot price edges.", done: () => STATUS.secrets.oddsapi, go: () => openPanel("connect") },
  { id: "state", icon: "🗺", title: "Set your home state", desc: "So lottery numbers and legal-betting notes match where you live.", done: () => !!STATUS.settings.home_state && LS.get("q-state", false), go: () => { LS.set("q-state", true); openPanel("lotto"); } },
  Q_DASH,
  { id: "fp", icon: "🏈", title: "Connect FantasyPros", desc: "Projections and player news for DFS and props.", done: () => STATUS.secrets.fantasypros, go: () => openPanel("connect") },
  Q_AI,
  { id: "bet", icon: "🎟", title: "Log your first bet", desc: "Type it, paste the slip, or drop a screenshot. Live scores show up beside it.", done: () => LS.get("q-bet", false), go: () => openPanel("bets") },
  Q_SNAP, Q_BANK, Q_EMAIL,
  { id: "after", icon: "🍄", title: "Tune After Hours", desc: "Beer runs, mushroom trips and smoke breaks: on, off, or less often.", done: () => LS.get("q-after", false), go: () => { LS.set("q-after", true); openPanel("connect"); } },
  { id: "play", icon: "🃏", title: "Pull your first play", desc: "One button. Read the odds, the risk and three ways to run it.", done: () => LS.get("q-play", false), go: () => openPanel("today") },
  { id: "kiwi", icon: "🐾", title: "Pet Kiwi", desc: "She's glowing under the blacklight. Click her.", done: () => kiwi.pets > 0, go: () => { closePanel(); say("She's on the floor. Click her. She bit a bookie once.", [], 7000); } },
];
function questList() {
  const full = !!(STATUS && STATUS.me && STATUS.me.betting);
  const list = (full ? QUESTS_FULL : QUESTS_MONEY).slice();
  if (STATUS && STATUS.snaptrade_optin === true) { const i = list.indexOf(Q_SNAP); list.splice(i, 1); list.splice(1, 0, { ...Q_SNAP, desc: "You said yes during install. " + Q_SNAP.desc }); }
  return list;
}
function questState() {
  const skip = LS.get("q-skip", []);
  return questList().map(q => ({ ...q, isDone: !!(STATUS && q.done()), isSkipped: skip.includes(q.id) }));
}
function refreshQuest() {
  if (!STATUS) return;
  const st = questState(), done = st.filter(q => q.isDone).length, settled = st.filter(q => q.isDone || q.isSkipped).length;
  const chip = $("#quest-chip"); chip.hidden = settled === st.length;
  $("#quest-n").textContent = `Setup ${done}/${st.length}`;
  if (settled === st.length && !LS.get("q-celebrated", false) && STATUS.onboarded) {
    LS.set("q-celebrated", true);
    say("Setup quest complete! 🎉 You're officially a regular. I'd throw a parade but the budget's tight. Here's a virtual pickle. 🥒", [], 9000);
    const r = $("#hoagie").getBoundingClientRect(); for (let i = 0; i < 8; i++) setTimeout(() => float(["🎉", "⭐", "🥪", "🥒"][i % 4], r.left + Math.random() * 160, r.top), i * 120);
  }
}
$("#quest-chip").onclick = () => openPanel("quest");
PANELS.quest = (body) => {
  const st = questState(), done = st.filter(q => q.isDone).length;
  body.innerHTML = `<h2>📜 Setup Quest</h2>
    <p class="lead">Go at your own pace: any order, skip anything, come back anytime from the 📜 up top.</p>
    <div class="stars">${"⭐".repeat(done)}${"☆".repeat(st.length - done)}</div>
    ${st.map(q => `<div class="quest ${q.isDone ? "done" : q.isSkipped ? "skipped" : ""}"><div class="qi">${q.isDone ? "✔" : q.icon}</div>
      <div><div class="qt">${esc(q.title)}</div><div class="qd">${q.isDone ? "Done!" : q.isSkipped ? "Skipped. You can still do it later." : esc(q.desc)}</div></div>
      <div class="qa">${q.isDone ? "" : `<button class="btn gold" data-go="${q.id}">Do it</button>`}
        ${q.isDone ? "" : `<button class="btn" data-skip="${q.id}">${q.isSkipped ? "Unskip" : "Skip"}</button>`}</div></div>`).join("")}
    <div class="row"><button class="btn" id="q-close">I'll finish later</button></div>`;
  $$("[data-go]", body).forEach(b => b.onclick = () => questList().find(q => q.id === b.dataset.go).go());
  $$("[data-skip]", body).forEach(b => b.onclick = () => {
    let sk = LS.get("q-skip", []); sk = sk.includes(b.dataset.skip) ? sk.filter(x => x !== b.dataset.skip) : [...sk, b.dataset.skip];
    LS.set("q-skip", sk); refreshQuest(); openPanel("quest");
  });
  $("#q-close").onclick = closePanel;
};

// ============================================================================================
// First-launch intro: a little cutscene with a spotlight tour of the shop.
// ============================================================================================
const INTRO = [
  { t: null, x: "Oh hey! You found the shop. I'm Constable Hoagie. I protect and serve... your dough. Mostly the serving part. Sometimes sandwiches." },
  { t: null, x: "Here's the deal: every morning I read the news, check prices, and turn it all into a few simple money moves. Small bites. No homework." },
  { t: "#today-btn", x: "This big red button? One play for today. Just one. It shows what to do, how sure I am, and what it could earn three ways: you do it, I help, or it runs itself." },
  { t: '.hot[data-open="playbook"]', x: "Got a bigger plan? The Playbook Menu builds up to three plays for any amount, risk level and time frame. Save it as a PDF, stick it on the fridge." },
  { t: '.hot[data-open="ask"]', x: "Ring the bell, or just click me, to ask anything. I'll use Claude, a free search, or free on-PC AI. Whatever you've got." },
  { t: '.hot[data-open="tab"]', x: "The register is My Tab: everything you own, all in one spot. Drop a screenshot from any app and I'll read it for you." },
  { t: '.hot[data-open="lotto"]', x: "The lucky ticket machine picks New Hampshire and Texas numbers. Honest heads-up: nobody can make numbers more likely to win. I just help you not split the jackpot." },
  { t: "#kiwi", x: "And that's Kiwi. She's in charge. Pet her for good luck. Treats are in the red bowl. She will pretend she didn't see you." },
  { t: "#health-chip", x: "If anything breaks, the Health Inspector up here tells you the fix in one line, and can pack up a bug report for Claude." },
  { t: null, x: "Quick heads-up: the website is this same shop, served from the owner's PC. A few things only work in the app on your own PC: the Claude Code brain, free on-PC AI, your sports desk folder, the MCP connection for Claude Desktop, and installing updates." },
  { t: null, x: "One promise: I never move your money on my own. You're the boss. Every number's an estimate, and I'll always show you the risk." },
  { t: null, x: "Ready? Let's set up the shop. One step at a time, at your pace. Skip anything you want. Even the pickles." },
];
// The full menu gets its own after-dark tour: neon, grown-up, a little rowdy.
const INTRO_NEON = [
  { t: null, x: "Well, well. Full menu. Welcome to the back room, boss. Lights are neon, music's loud, and the odds are always honest. 18+ only, 21+ where your state says so." },
  { t: "#today-btn", x: "This glowing button pulls tonight's play: one move, how sure I am, the risk, and what it could pay three ways: you run it, I help, or it runs itself." },
  { t: null, x: "Inside that same panel: Today's Games. I line up prices across the books and flag where one's off. A price edge, not a sure thing. There's no such thing as a lock." },
  { t: '.hot[data-open="lotto"]', x: "The lucky ticket machine spits out NH and Texas numbers. Nobody can make numbers more likely to win; I just help you not split the jackpot." },
  { t: '.dock-btn[data-open="bets"]', x: "The Bet Tracker: every open bet with live scores, your record and profit. Type it, paste the slip, drop a screenshot, or sync Kalshi." },
  { t: '.dock-btn[data-open="dash"]', x: "Your Dashboard: free feeds on rates, inflation, filings and earnings. Next you'll pick your AI co-pilot and what goes on the dashboard." },
  { t: '.dock-btn[data-open="trade"]', x: "The Trading counter: link brokers with SnapTrade, Alpaca, Kraken or Coinbase. Practice money by default; live orders need you to type LIVE and stay under your cap." },
  { t: '.dock-btn[data-open="tab"]', x: "My Tab tracks everything you own, plus a net-worth line that wiggles with every currency you hold." },
  { t: '.dock-btn[data-open="costs"]', x: "Costs counter: every dollar out, sorted for you. Sync the bank with SimpleFIN or drop a CSV. Export anytime." },
  { t: '.dock-btn[data-open="email"]', x: "Want it in your inbox? Morning email with your play, the games and the markets. No AI account needed." },
  { t: "#theme-chip", x: "Not feeling the neon? Tap the 🎨 to flip back to the classic sub shop. Your call, always." },
  { t: "#kiwi", x: "Kiwi works the night shift too. And around here... I might offer you a cold one or something stranger. After Hours can be turned off at Your menu." },
  { t: null, x: "Heads-up: the website is this same shop running off the owner's PC, so it's only up when that PC is. Some things only work in the app on your own PC: the Claude Code brain, free on-PC AI, the sports desk folder, MCP for Claude Desktop, and updates." },
  { t: null, x: "House rules: I never move your money on my own, I always show the risk, and if it stops being fun, call or text 1-800-GAMBLER. Now let's build your setup, at your pace." },
];
function playIntro(opts = {}) {
  const neon = !!(STATUS && STATUS.me && STATUS.me.betting);
  const SCRIPT = neon ? INTRO_NEON : INTRO;
  if (!neon) { const k = INTRO.findIndex(s => /lotto/.test(s.t || "")); if (k >= 0) INTRO.splice(k, 1); }
  $("#intro").classList.toggle("neon-intro", neon);
  const box = $("#intro"), spot = $("#spot"), txt = $("#dlg-text"), face = $("#dlg-face");
  face.innerHTML = hoagieArt(); box.hidden = false; kiwi.busy = true;  // Kiwi holds still for her close-up
  let i = 0, typing = null, full = "";
  let track = null;
  const place = sel => {
    clearInterval(track);
    const el = sel && document.querySelector(sel);
    if (!el) { spot.classList.add("full"); return; }
    const r0 = el.getBoundingClientRect();
    if (r0.top < 70 || r0.bottom > innerHeight - 230) el.scrollIntoView({ block: "center" });   // instant, so we measure the settled spot
    const fit = () => { const r = el.getBoundingClientRect(), pad = 12; spot.classList.remove("full");
      Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" }); };
    requestAnimationFrame(fit);
    track = setInterval(fit, 200);   // follows things that move (Kiwi) or resize
  };
  const type = () => {
    clearInterval(typing); full = SCRIPT[i].x; let n = 0; face.classList.add("talk");
    typing = setInterval(() => { n++; txt.innerHTML = esc(full.slice(0, n)) + '<span class="cursor"></span>'; if (n % 4 === 0) Music.blip("tick");
      if (n >= full.length) { clearInterval(typing); typing = null; face.classList.remove("talk"); } }, 24);
  };
  const show = () => { $("#dlg-step").textContent = `${i + 1} / ${SCRIPT.length}`; $("#dlg-next").textContent = i === SCRIPT.length - 1 ? "Let's set up ▶" : "Next ▶"; place(SCRIPT[i].t); type(); };
  const finish = async () => {
    clearInterval(typing); clearInterval(track); box.hidden = true; document.removeEventListener("keydown", keys); kiwi.busy = false;
    if (neon) LS.set("intro-neon-seen", true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (opts.replay || STATUS.demo) return;
    if (!STATUS.onboarded) { try { await api("/api/settings", { onboarded: true }); } catch (e) { /* guests can't */ } STATUS.onboarded = true; }
    if (!STATUS.me.intro_seen) { try { await api("/api/me", { flags: { intro_seen: true } }); } catch (e) { /* ignore */ } STATUS.me.intro_seen = true; }
    refreshQuest();
    // first pass for every account: the practice-data tour plays by itself (skippable), then brain -> dashboard -> checklist
    if (!STATUS.me.tour_seen) { try { await api("/api/me", { flags: { tour_seen: true } }); } catch (e) { /* ignore */ } STATUS.me.tour_seen = true; startTour(true); }
    else continueSetup();
  };
  const next = () => { if (typing) { clearInterval(typing); typing = null; face.classList.remove("talk"); txt.textContent = full; return; }
    Music.blip(); if (++i >= SCRIPT.length) finish(); else show(); };
  const keys = e => { if (["Enter", " ", "ArrowRight"].includes(e.key)) { e.preventDefault(); next(); } if (e.key === "Escape") finish(); };
  $("#dlg-next").onclick = next; $("#dlg-skip").onclick = finish; document.addEventListener("keydown", keys);
  const jump = +new URLSearchParams(location.search).get("introstep"); if (jump) i = Math.min(jump, SCRIPT.length - 1);  // for testing
  show();
}

// open straight into the shop with ?enter=1 (used by the launcher's "skip the door" option and for testing)
{
  const qs = new URLSearchParams(location.search);
  if (qs.get("enter") === "1") { enterShop(); if (qs.get("panel")) setTimeout(() => openPanel(qs.get("panel")), 400);
    const ah = qs.get("ah"); if (["beer", "shrooms", "smoke"].includes(ah)) setTimeout(() => window.AFTER && AFTER.on() && AFTER[ah](), 1500); }   // for testing
}
