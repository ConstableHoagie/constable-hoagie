// The Dashboard counter (free money insights) and "Customize your dashboard" (asked during setup).
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, CHART, refreshQuest */

const DASH_HOW = {
  "":        { badge: "Free · no key", cls: "" },
  fred:      { badge: "Free key · 1 min", cls: "gold", key: "fred", link: "https://fredaccount.stlouisfed.org/apikeys", hint: "Sign up, then 'Request API Key'. 32 letters/numbers." },
  finnhub:   { badge: "Free key · 1 min", cls: "gold", key: "finnhub", link: "https://finnhub.io/register", hint: "Sign up; your key is on the dashboard." },
  broker:    { badge: "Free account", cls: "grey", panel: "trade", hint: "SnapTrade links Robinhood, Schwab, Webull and more (read-only)." },
  simplefin: { badge: "$1.50/mo, paid by you", cls: "grey", panel: "costs", hint: "SimpleFIN Bridge reads balances and transactions. Read-only." },
  oddsapi:   { badge: "Free key", cls: "gold", key: "oddsapi", link: "https://the-odds-api.com/", hint: "500 free requests a month." },
};

// which connection's "What you get" to show beside each card
const CARD_SRC = { safe: "treasury", networth: "", costs: "", filings: "edgar", mood: "fng", rates: "fred", earnings: "finnhub", brokers: "snaptrade", bank: "simplefin", games: "oddsapi" };

function dashConnected(needs) {
  if (!needs) return true;
  if (needs === "broker") return (STATUS.brokers_connected || []).length > 0;
  if (needs === "simplefin") return !!STATUS.bank_connected;
  return !!(STATUS.secrets || {})[needs];
}

async function saveKey(name, value) {
  const r = await api("/api/secret", { name, value });
  STATUS.secrets[name] = r.has;
  return r.has;
}

// ---------------- Customize your dashboard ----------------
PANELS.dashsetup = (body, arg = {}) => {
  const me = STATUS.me, neon = me.betting, owner = !STATUS.guest;
  const picked = new Set(me.dash);
  body.innerHTML = `<h2>${neon ? "🛸 Build your control panel" : "📊 Customize your dashboard"}</h2>
    <p class="lead">${neon ? "Pick the feeds you want piped into your screen. Free stuff is pre-loaded; keys take a minute." : "Pick what shows up on your Dashboard. The free ones work right now. Add a key later if you want more."}</p>
    <div class="dash-pick">${me.dash_all.map(c => { const h = DASH_HOW[c.needs] || DASH_HOW[""], on = dashConnected(c.needs);
      return `<div class="dash-row">
        <label><input type="checkbox" data-card="${c.id}" ${picked.has(c.id) ? "checked" : ""}> <b>${esc(c.title)}</b></label>
        <span class="pill ${h.cls}">${on && c.needs ? "Connected ✔" : esc(h.badge)}</span>
        <div class="dash-gets">${benefitsHtml(CARD_SRC[c.id])}</div>
        ${!on && h.key && owner ? `<div class="dash-key"><input type="password" placeholder="Paste ${esc(c.needs)} key (stored in Windows Credential Manager)" data-key="${h.key}">
            <button class="btn" data-savekey="${h.key}">Save</button> <a href="${h.link}" target="_blank" rel="noopener">Get a free key ↗</a><div class="tiny">${esc(h.hint)}</div></div>` : ""}
        ${!on && h.panel ? `<div class="tiny">${esc(h.hint)} You can link it from the Setup Quest after this.</div>` : ""}
      </div>`; }).join("")}</div>
    <label class="toggle-line"><input type="checkbox" id="ds-upbeat" ${me.upbeat ? "checked" : ""}> 🌤 <b>Upbeat feed</b>: lead with encouraging money news and skip doom-scroll headlines${neon ? "" : " (recommended)"}</label>
    <div id="ds-err" class="tiny neg"></div>
    <div class="row"><button class="gbtn ${neon ? "red" : "green"}" id="ds-save">Save my dashboard</button>
      <button class="btn" id="ds-later">Do it later (use the stock dashboard)</button></div>
    <p class="fine">Nothing here can move money. Keys stay on this PC. Only ticker symbols you already hold are sent (for filings and earnings).</p>`;
  $$("[data-savekey]", body).forEach(b => b.onclick = async () => {
    const inp = $(`[data-key="${b.dataset.savekey}"]`, body);
    if (!inp.value.trim()) return;
    try { const ok = await saveKey(b.dataset.savekey, inp.value.trim()); inp.value = ""; Music.blip("coin");
      b.closest(".dash-key").outerHTML = ok ? `<div class="tiny pos">Saved ✔</div>` : `<div class="tiny neg">Didn't save.</div>`;
      refreshQuest();
    } catch (e) { $("#ds-err", body).textContent = e.message; }
  });
  const finish = async (dash) => {
    try {
      STATUS.me = await api("/api/me", { dash, upbeat: $("#ds-upbeat", body).checked });
      refreshQuest(); closePanel();
      say(dash === "stock" ? "Stock dashboard it is. The good free stuff, no keys. Customize anytime from the Dashboard counter." : "Dashboard's dialed in. It's under 📊 Dashboard in the dock.", [], 7000);
      if (arg.done) arg.done(); else openPanel("dash");
    } catch (e) { $("#ds-err", body).textContent = e.message; }
  };
  $("#ds-save").onclick = () => finish({ cards: $$("[data-card]", body).filter(x => x.checked).map(x => x.dataset.card) });
  $("#ds-later").onclick = () => finish("stock");
};

// ---------------- The Dashboard ----------------
const dmoney = n => CHART.money(n || 0);
function edgeHtml(e) {
  const ic = { good: "🟢", meh: "🟡", warn: "🟠", tip: "💡", info: "📌" }[e.tone] || "📌";
  return `<div class="edge">${ic} ${esc(e.text)}</div>`;
}

PANELS.dash = async (body) => {
  const me = STATUS.me, cards = me.dash;
  body.innerHTML = `<h2>📊 My Dashboard</h2><p class="lead">Free public data, boiled down. ${me.upbeat ? "🌤 Upbeat feed is on." : ""}</p>
    <div class="row"><button class="btn" id="d-custom">⚙ Customize</button> <button class="btn" id="d-refresh">↻ Refresh</button></div>
    <div id="d-body"><p class="tiny">Pulling the numbers…</p></div>`;
  $("#d-custom").onclick = () => openPanel("dashsetup");
  const draw = async (force) => {
    let d;
    try { d = await api("/api/insights" + (force ? "?force=1" : "")); } catch (e) { $("#d-body", body).innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
    const out = [];
    if (d.edges.length) out.push(`<div class="dcard wide"><h4>🥪 Hoagie's take</h4>${d.edges.map(edgeHtml).join("")}<p class="fine">Education, not advice. Every number's from a public source.</p></div>`);
    for (const c of cards) {
      if (c === "safe") out.push(`<div class="dcard"><h4>🛡 Safe money vs inflation</h4>
        <div class="big">${d.bills != null ? d.bills.toFixed(2) + "%" : "–"}</div><div class="tiny">T-bills pay (Treasury, ${esc(d.treasury_date || "")})</div>
        <div class="big sm">${d.cpi != null ? "+" + d.cpi.toFixed(1) + "%" : "–"}</div><div class="tiny">Prices vs a year ago (BLS, ${esc(d.cpi_month || "")})</div></div>`);
      if (c === "mood" && d.fng) out.push(`<div class="dcard"><h4>🌡 Crypto mood</h4><div class="big">${d.fng.value}</div><div class="meter"><i style="width:${d.fng.value}%"></i></div><div class="tiny">${esc(d.fng.label)} · 0 = panic, 100 = greed</div></div>`);
      if (c === "networth") out.push(`<div class="dcard wide"><h4>💼 Net worth, 30 days</h4><div id="d-nw"></div></div>`);
      if (c === "costs") out.push(`<div class="dcard"><h4>🧾 This month</h4><div id="d-costs" class="tiny">…</div></div>`);
      if (c === "filings") { const rows = Object.entries(d.holdings).filter(([, h]) => (h.filings || []).length);
        out.push(`<div class="dcard wide"><h4>📄 Filings for stocks you own</h4>${rows.length ? rows.map(([s, h]) => `<div><b>${esc(s)}</b> ${h.filings.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.what)} (${esc(f.date)})</a>`).join(" · ")}</div>`).join("")
          : `<p class="tiny">${d.stocks.length ? "No recent filings." : "Add a stock to My Tab (or link a broker) and its SEC filings show up here."}</p>`}</div>`); }
      if (c === "rates") out.push(`<div class="dcard wide"><h4>🏦 Rates, jobs & gas</h4>${d.needs.fred ? `<p class="tiny">Needs a free FRED key. <button class="btn" data-go="dashsetup">Add it</button></p>`
          : `<div class="kv">${d.fred.map(f => `<div title="${esc(f.help)}"><span>${esc(f.label)}</span><b>${f.suffix.trim() === "$/gal" ? "$" + f.value.toFixed(2) : f.value.toFixed(2) + f.suffix}</b></div>`).join("")}</div>`}</div>`);
      if (c === "earnings") { const rows = Object.entries(d.holdings).filter(([, h]) => h.earnings || (h.news || []).length);
        out.push(`<div class="dcard wide"><h4>📅 Earnings & headlines</h4>${d.needs.finnhub ? `<p class="tiny">Needs a free Finnhub key. <button class="btn" data-go="dashsetup">Add it</button></p>`
          : rows.length ? rows.map(([s, h]) => `<div><b>${esc(s)}</b> ${h.earnings ? `reports ${esc(h.earnings.date)} ${esc(h.earnings.when)}` : ""}
              ${(h.news || []).map(n => `<div class="tiny">· <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a></div>`).join("")}</div>`).join("") : `<p class="tiny">Nothing coming up for your stocks.</p>`}</div>`); }
      if (c === "brokers") out.push(`<div class="dcard"><h4>📈 Brokerages</h4><p class="tiny">${(STATUS.brokers_connected || []).length ? "Linked: " + esc(STATUS.brokers_connected.join(", ")) : "Nothing linked yet."}</p><button class="btn" data-go="trade">Trading counter</button></div>`);
      if (c === "bank") out.push(`<div class="dcard"><h4>🏧 Bank</h4><p class="tiny" id="d-bank">…</p><button class="btn" data-go="costs">Costs counter</button></div>`);
      if (c === "games" && me.betting) out.push(`<div class="dcard"><h4>🏈 Today's Games</h4><p class="tiny">Price edges across books for the next day and a half.</p><button class="btn" data-go="today">Open the board</button></div>`);
    }
    out.push(`<details class="dcard wide"><summary>Where this comes from</summary>${d.sources.map(s => `<div class="tiny"><b>${esc(s.name)}</b> ${s.key ? "(free key)" : "(no key)"}: ${esc(s.what)} <a href="${esc(s.url)}" target="_blank" rel="noopener">↗</a></div>`).join("")}
      <div class="tiny">Checked ${esc(d.checked)}${d.errors.length ? ` · couldn't reach: ${esc(d.errors.join(", "))}` : ""}</div></details>`);
    $("#d-body", body).innerHTML = `<div class="dgrid">${out.join("")}</div>`;
    $$("[data-go]", body).forEach(b => b.onclick = () => openPanel(b.dataset.go));
    if ($("#d-nw", body)) api("/api/networth?days=30").then(n => CHART.line($("#d-nw", body), [{ name: "Real", points: n.actual }, { name: "Estimate", points: n.estimate, dash: true }], { height: 170 })).catch(() => {});
    if ($("#d-costs", body)) api("/api/costs").then(m => { const top = Object.entries(m.by_category).filter(([k]) => k !== "Income").sort((a, b) => b[1] - a[1])[0];
      $("#d-costs", body).innerHTML = `<div class="big sm">${dmoney(m.spent)}</div>spent${m.income ? ` · ${dmoney(m.income)} in` : ""}${top ? `<br>Biggest: ${esc(top[0])} ${dmoney(top[1])}` : ""}${m.income > m.spent ? "<br>🟢 You're spending less than you make. That's the whole game." : ""}`; }).catch(() => {});
    if ($("#d-bank", body)) api("/api/bank").then(b => { $("#d-bank", body).textContent = b.connected ? `Linked · last sync ${b.last_sync || "pending"}` : "Not linked. SimpleFIN is $1.50/mo, paid by you."; }).catch(() => {});
  };
  $("#d-refresh").onclick = () => draw(true);
  draw(false);
};
