// Your menu (money-only vs full), the Give counter, and the Email counter.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, PANEL_LOCKED */

// ---------- Your menu ----------
function applyMenu() {
  const bet = !!(STATUS && STATUS.me && STATUS.me.betting);
  document.body.classList.toggle("money-only", !bet);
}

function menuChoiceHtml(current) {
  return `<div class="menu-pick">
    <div class="menu-opt ${current === "money" ? "on" : ""}">
      <b>🥪 Money only</b>
      <span>Saving, investing, the Money Plan, Learn, Give and news. <b>No sports betting, DFS or lottery</b> anywhere in the shop or your emails.</span>
      <button class="gbtn green" data-menu="money">Keep it money-only</button>
    </div>
    <div class="menu-opt full ${current === "full" ? "on" : ""}">
      <b>🎰 Full menu</b>
      <span>Everything in Money only, plus Today's Games, sports bet suggestions, DFS and lottery picks. Adults only: 18+ in NH, 21+ in most states.</span>
      <label class="age"><input type="checkbox" id="age-ok"> I'm old enough to bet where I live</label>
      <button class="gbtn red" data-menu="full">Give me the full menu</button>
    </div>
  </div>`;
}

async function setMenu(menu, ageOk) {
  STATUS.me = await api("/api/me", { menu, age_ok: ageOk });
  applyMenu();
  loadSpecial();
}

function chooseMenu() {
  return new Promise(resolve => {
    openPanel("menu", { first: true, done: resolve });
  });
}

PANELS.menu = (body, arg = {}) => {
  const first = !!arg.first;
  PANEL_LOCKED = first;
  $("#panel-close").hidden = first;
  body.innerHTML = `<h2>${first ? "Welcome in! What's on your menu?" : "🍽 Your menu"}</h2>
    <p class="lead">${first ? "Pick once. You can change it anytime at Connect counter › Your menu." : "Switch anytime. It only changes your own view and emails."}</p>
    ${menuChoiceHtml(STATUS.me.menu)}
    <div id="menu-err" class="tiny neg"></div>
    <p class="fine">Gambling should stay fun. If it stops being fun, call or text 1-800-GAMBLER.</p>`;
  $$("[data-menu]", body).forEach(b => b.onclick = async () => {
    const m = b.dataset.menu;
    try {
      await setMenu(m, $("#age-ok", body).checked);
      Music.blip("coin");
      if (STATUS.me.theme_eff !== THEME) { location.href = "/?enter=1"; return; }   // the look follows the menu (unless you picked one)
      PANEL_LOCKED = false; $("#panel-close").hidden = false;
      closePanel();
      say(m === "full" ? "Full menu it is. Sports, numbers, the works. I'll still tell you the honest odds." : "Money only. No betting stuff anywhere. Just the good bread.", [], 6000);
      if (arg.done) arg.done();
      else if (m === "full" && !LS.get("intro-neon-seen", false)) setTimeout(playIntro, 900);   // switched later: give them the after-dark tour
      refreshQuest();
    } catch (e) { $("#menu-err", body).textContent = e.message; }
  });
};

function menuCard() {
  const m = (STATUS.me || {}).menu;
  return `<div class="conn"><h4>🍽 Your menu: ${m === "full" ? "Full (includes sports betting)" : "Money only"}</h4>
    <p class="tiny">Money only hides sports bets, DFS and lottery everywhere, including your emails. Each person picks their own.</p>
    <div class="row"><button class="btn" id="menu-change">Change my menu</button></div>
    <h4>🎨 Look</h4>
    <div class="seg">${[["auto", "Match my menu"], ["original", "Original shop"], ["neon", "Neon galactic"]].map(([k, l]) => `<button data-theme="${k}" class="${(STATUS.me || {}).theme === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <p class="tiny">"Match my menu" = neon with the full menu, original with money-only. The 🎨 chip at the top flips it anytime.</p>
    ${m === "full" ? `<h4>🌙 After hours</h4><label class="row"><input type="checkbox" id="ah-toggle" ${LS.get("afterhours", true) ? "checked" : ""}> Hoagie sometimes offers a cold one, "special" mushrooms, or a smoke break out back (cartoon gags)</label>
      <div class="row"><button class="btn" data-ah="beer">🍺 Beer now</button><button class="btn" data-ah="shrooms">🍄 Mushrooms now</button><button class="btn" data-ah="smoke">🌙 Smoke break now</button></div>` : ""}</div>`;
}
document.addEventListener("click", async e => {
  if (!e.target) return;
  if (e.target.id === "menu-change") openPanel("menu");
  if (e.target.id === "ah-toggle") { LS.set("afterhours", e.target.checked); toast(e.target.checked ? "After hours: on." : "After hours: off."); }
  if (e.target.dataset && e.target.dataset.ah && window.AFTER) { closePanel(); setTimeout(() => AFTER[e.target.dataset.ah](), 300); }
  const t = e.target.dataset && e.target.dataset.theme;
  if (t) { try { await api("/api/me", { theme: t }); location.href = "/?enter=1&panel=connect"; } catch (err) { toast(err.message); } }
});

// ---------- Give counter ----------
PANELS.give = async (body) => {
  body.innerHTML = `<h2>💚 Give Counter</h2><p class="lead">Where a donation does the most good, ranked. Plus what's happening in the world right now.</p><div id="give-out">Loading…</div>`;
  try {
    const d = await api("/api/give");
    const card = o => `<article class="give-card ${o.cost_per_life ? "" : "alt"}">
      <div class="g-rank">#${o.rank}</div>
      <div class="g-body">
        <div class="g-name">${esc(o.name)}</div>
        <div class="tiny">${esc(o.program)}</div>
        <dl class="pick-ticket">
          <div class="t-row"><dt>💵 Per dollar</dt><dd>${esc(o.per_dollar)}</dd></div>
          ${o.cost_per_life ? `<div class="t-row"><dt>❤️ Cost to save a life</dt><dd><b>about $${o.cost_per_life.toLocaleString()}</b> <span class="tiny">${esc(o.measure)}</span></dd></div>` : `<div class="t-row"><dt>📏 Measured by</dt><dd>${esc(o.measure)}</dd></div>`}
          <div class="t-row"><dt>🌍 The good it does</dt><dd>${esc(o.benefit)}</dd></div>
        </dl>
        <div class="row"><a class="btn go" href="${esc(o.donate)}" target="_blank" rel="noopener">Donate on their site</a>
          <a class="btn" href="${esc(o.learn)}" target="_blank" rel="noopener">Learn more</a>
          <a class="tiny" href="${esc(o.source)}" target="_blank" rel="noopener">source</a></div>
      </div></article>`;
    const news = (d.news || []).map(n => `<div class="news-item"><span class="tagpill tag-Humanitarian">Humanitarian</span>
      <div><a href="${esc(n.link)}" target="_blank" rel="noopener"><b>${esc(n.title)}</b></a></div><div class="tiny">${esc(n.summary)} · ${esc(n.sources.join(", "))}</div></div>`).join("");
    $("#give-out", body).innerHTML = `
      <p class="tiny">${esc(d.method)}</p>
      ${d.orgs.map(card).join("")}
      <p class="fine">${esc(d.tax_note)}</p>
      <h3 class="sec">🌍 Humanitarian news</h3>
      ${news || `<p class="tiny">No humanitarian headlines loaded yet. They come from ReliefWeb (UN OCHA), The New Humanitarian and NPR.</p>`}`;
  } catch (e) { $("#give-out", body).textContent = e.message; }
};

// ---------- Email counter ----------
PANELS.email = async (body) => {
  body.innerHTML = `<h2>✉️ Email Counter</h2><p class="lead">A short daily email with the topics you pick. Built from Hoagie's own feeds and rules, so it never uses Claude.</p><div id="em-out">Loading…</div>`;
  let me, setup;
  try { [me, setup] = await Promise.all([api("/api/me"), api("/api/email/setup")]); } catch (e) { $("#em-out", body).textContent = e.message; return; }
  const em = me.email;
  const topics = Object.entries(me.topics).filter(([, t]) => me.betting || !t.betting);
  const owner = !STATUS.guest;
  $("#em-out", body).innerHTML = `
    ${!setup.ready ? `<div class="skip">📮 Sending isn't set up yet. ${owner ? "Set it up once below (free with Gmail or Brevo)." : "The shop owner sets it up once on their PC."}</div>` : ""}
    <div class="conn">
      <h4>Your daily email</h4>
      <div class="row"><label class="field" style="flex:1">Your email<input type="email" id="em-addr" value="${esc(em.address)}" placeholder="you@example.com"></label></div>
      <div class="field" style="font-weight:800">Topics</div>
      <div class="toggle-row">${topics.map(([k, t]) => `<label class="toggle ${em.topics.includes(k) ? "on" : ""}"><input type="checkbox" data-topic="${k}" ${em.topics.includes(k) ? "checked" : ""} style="display:none">${esc(t.label)}</label>`).join("")}</div>
      <div class="row">
        <label class="field">Send at<input type="time" id="em-time" value="${esc(em.time)}"></label>
        <label class="field">Days<select id="em-days"><option value="daily" ${em.days === "daily" ? "selected" : ""}>Every day</option><option value="weekdays" ${em.days === "weekdays" ? "selected" : ""}>Weekdays</option></select></label>
        <label class="field">News from<select id="em-win">${Object.entries(me.windows).map(([h, l]) => `<option value="${h}" ${+h === em.window ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      </div>
      <label class="row"><input type="checkbox" id="em-on" ${em.on ? "checked" : ""}> Send me this every ${em.days === "weekdays" ? "weekday" : "day"}</label>
      <div class="row"><button class="btn go" id="em-save">Save</button><button class="btn" id="em-prev">👀 Preview</button><button class="btn" id="em-test" ${setup.ready ? "" : "disabled"}>📨 Send me a test</button></div>
      <div id="em-msg" class="tiny"></div>
      <p class="tiny">Emails go out from the shop owner's PC, so it needs to be on with Hoagie open. ${em.last_sent ? "Last sent: " + esc(em.last_sent) + "." : ""}</p>
    </div>
    <div id="em-preview"></div>
    ${owner ? `<details class="conn" ${setup.ready ? "" : "open"}><summary><b>📮 Sending setup (owner, once)</b> ${setup.ready ? "✅" : ""}</summary>
      <div class="row"><label class="field">Service<select id="sm-prov">${Object.entries(setup.presets).map(([k, p]) => `<option value="${k}" ${setup.provider === k ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select></label></div>
      <p class="tiny" id="sm-help"></p>
      <div class="row">
        <label class="field">Server<input id="sm-host" value="${esc(setup.host)}"></label>
        <label class="field">Port<input id="sm-port" type="number" value="${esc(setup.port)}" style="width:90px"></label>
      </div>
      <div class="row">
        <label class="field">Login<input id="sm-user" value="${esc(setup.user)}" placeholder="you@gmail.com"></label>
        <label class="field">From address<input id="sm-from" value="${esc(setup.from)}" placeholder="you@gmail.com"></label>
        <label class="field">Password / key<input id="sm-pass" type="password" placeholder="${setup.has_password ? "saved (leave blank to keep)" : "app password or SMTP key"}"></label>
      </div>
      <p class="tiny">The password is kept in this PC's secure store, never in a file or the shared app.</p>
      <div class="row"><button class="btn go" id="sm-save">Save sending setup</button></div><div id="sm-msg" class="tiny"></div>
    </details>` : ""}`;
  $$("[data-topic]", body).forEach(cb => cb.onchange = () => cb.parentElement.classList.toggle("on", cb.checked));
  const collect = () => ({ email: {
    address: $("#em-addr", body).value.trim(), topics: $$("[data-topic]", body).filter(c => c.checked).map(c => c.dataset.topic),
    time: $("#em-time", body).value || "07:00", days: $("#em-days", body).value, window: +$("#em-win", body).value, on: $("#em-on", body).checked } });
  const msg = (t, bad) => { const m = $("#em-msg", body); m.textContent = t; m.className = "tiny " + (bad ? "neg" : "pos"); };
  $("#em-save", body).onclick = async () => {
    try { STATUS.me = await api("/api/me", collect()); msg(STATUS.me.email.on ? `Saved. Next email around ${STATUS.me.email.time}.` : "Saved (daily email is off)."); Music.blip("coin"); }
    catch (e) { msg(e.message, true); }
  };
  $("#em-prev", body).onclick = async () => {
    try { await api("/api/me", collect()); const p = await api("/api/email/preview");
      $("#em-preview", body).innerHTML = `<div class="conn"><h4>Preview: ${esc(p.subject)}</h4><iframe sandbox="" style="width:100%;height:520px;border:0;background:#fff;border-radius:12px" srcdoc="${esc(p.html)}"></iframe></div>`; }
    catch (e) { msg(e.message, true); }
  };
  $("#em-test", body).onclick = async () => {
    try { await api("/api/me", collect()); const r = await api("/api/me/test-email", {}); msg("Sent to " + r.to + ". Check your inbox (and spam, the first time)."); }
    catch (e) { msg(e.message, true); }
  };
  if (owner) {
    const help = () => { const p = setup.presets[$("#sm-prov", body).value]; $("#sm-help", body).textContent = p.help;
      if (p.host && !$("#sm-host", body).value) { $("#sm-host", body).value = p.host; $("#sm-port", body).value = p.port; } };
    $("#sm-prov", body).onchange = () => { $("#sm-host", body).value = ""; help(); };
    help();
    $("#sm-save", body).onclick = async () => {
      try {
        setup = await api("/api/email/setup", { provider: $("#sm-prov", body).value, host: $("#sm-host", body).value, port: +$("#sm-port", body).value,
          user: $("#sm-user", body).value, from: $("#sm-from", body).value, password: $("#sm-pass", body).value });
        $("#sm-msg", body).textContent = setup.ready ? "Saved. Use 'Send me a test' to check it works. ✅" : "Saved, but something's still missing (server, login, from address or password).";
        $("#em-test", body).disabled = !setup.ready;
      } catch (e) { $("#sm-msg", body).textContent = e.message; }
    };
  }
};

// ---------- Costs counter: where the money goes ----------
PANELS.costs = async (body, arg) => {
  let ym = (arg && arg.month) || new Date().toISOString().slice(0, 7);
  body.innerHTML = `<h2>🧾 Cost Tracker</h2><p class="lead">Every dollar in and out, sorted for you. Type it, import your bank's CSV, or sync your bank read-only.</p><div id="c-out">Loading…</div>`;
  const draw = async () => {
    let d, b;
    try { [d, b] = await Promise.all([api("/api/costs?month=" + ym), api("/api/bank")]); } catch (e) { $("#c-out", body).textContent = e.message; return; }
    const cats = Object.entries(d.by_category).sort((x, y) => y[1] - x[1]);
    const top = Math.max(1, ...cats.map(c => Math.max(c[1], d.budgets[c[0]] || 0)));
    const trendMax = Math.max(1, ...d.trend.map(t => t.spent));
    $("#c-out", body).innerHTML = `
      <div class="row" style="align-items:center;justify-content:space-between">
        <label class="field">Month<select id="c-month">${[...new Set([ym, ...d.months])].sort().reverse().map(m => `<option ${m === ym ? "selected" : ""}>${m}</option>`).join("")}</select></label>
        <div class="row"><a class="btn" href="/api/costs/export.csv?month=${esc(ym)}" download>⬇ Export ${esc(ym)} (CSV)</a><a class="btn" href="/api/costs/export.csv" download>⬇ Export everything</a></div>
      </div>
      <div class="chart-card">
        <div class="row" style="gap:28px"><div><div class="tiny">Spent</div><div class="nw-total">${money(d.spent)}</div></div><div><div class="tiny">Money in</div><div class="nw-total">${money(d.income)}</div></div>
          <div><div class="tiny">Left over</div><div class="nw-total ${d.income - d.spent >= 0 ? "pos" : "neg"}">${money(d.income - d.spent)}</div></div></div>
        <h4>By category</h4>
        ${cats.length ? `<div class="cat-bars">${cats.map(([c, v]) => { const bud = d.budgets[c]; const over = bud && v > bud;
          return `<div class="cat-row"><span class="cat-name">${esc(c)}</span><span class="cat-track"><span class="cat-fill" style="width:${(v / top * 100).toFixed(1)}%"></span>${bud ? `<span class="cat-budget" style="left:${(bud / top * 100).toFixed(1)}%" title="Budget ${money(bud)}"></span>` : ""}</span>
            <span class="cat-val">${money(v)}${bud ? ` <span class="tiny ${over ? "neg" : ""}">of ${money(bud)}${over ? " · over" : ""}</span>` : ""}</span></div>`; }).join("")}</div>` : `<p class="tiny">Nothing spent this month yet.</p>`}
        ${d.trend.length > 1 ? `<h4>Last ${d.trend.length} months</h4><div class="trend">${d.trend.map(t => `<div class="tr-col" title="${esc(t.month)}: ${money(t.spent)}"><span class="tr-bar" style="height:${(t.spent / trendMax * 90).toFixed(0)}px"></span><span class="tiny">${esc(t.month.slice(5))}</span></div>`).join("")}</div>` : ""}
      </div>
      <div class="conn"><h4>➕ Add</h4>
        <div class="row">
          <label class="field">Date<input type="date" id="c-date" value="${new Date().toISOString().slice(0, 10)}"></label>
          <label class="field">Amount ($)<input type="number" id="c-amt" step="0.01" placeholder="12.50"></label>
          <label class="field">Category<select id="c-cat">${d.categories.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
          <label class="field" style="flex:1">Note<input type="text" id="c-note" placeholder="Pizza night"></label>
          <button class="btn go" id="c-add">Add</button></div>
        <label class="row tiny"><input type="checkbox" id="c-in"> This is money coming in (pay, refund)</label>
        <div class="row"><label class="field">Set a monthly budget for<select id="c-bcat">${d.categories.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
          <label class="field">$<input type="number" id="c-bamt" step="1" placeholder="300"></label><button class="btn" id="c-bset">Save budget</button></div>
      </div>
      <div class="conn"><h4>📥 Import a bank CSV</h4><p class="tiny">Download a CSV from your bank or card site, then drop it here. Hoagie finds the date, description and amount, sorts each one, and skips duplicates.</p>
        <input type="file" id="c-csv" accept=".csv,text/csv"> <span id="c-csv-msg" class="tiny"></span></div>
      <div class="conn ${b.connected ? "done" : ""}"><h4>🏦 Bank sync (read-only) ${b.connected ? "✅" : ""}</h4>${benefitsHtml("simplefin")}
        <p class="tiny">Uses <b>SimpleFIN</b>: you connect your bank on their site, so your bank password never touches Hoagie. Hoagie only ever sees balances and transactions; it can't move money. Revoke anytime at SimpleFIN. SimpleFIN charges $1.50/month or $15/year.</p>
        ${b.connected ? `<div class="row"><button class="btn go" id="b-sync">🔄 Sync now</button><button class="btn" id="b-off">Disconnect</button></div>
          <p class="tiny">Last sync: ${esc(b.last_sync || "never")}</p>${b.accounts.map(a => `<div class="tiny">• ${esc(a.org)} · ${esc(a.name)}: <b>${money(a.balance)}</b> ${esc(a.currency)}</div>`).join("")}
          ${b.errors.length ? `<p class="tiny neg">${b.errors.map(esc).join("<br>")}</p>` : ""}`
        : `<ol class="tiny"><li><a href="${esc(b.signup)}" target="_blank" rel="noopener">Open SimpleFIN Bridge</a>, connect your bank, and create a <b>Setup Token</b>.</li><li>Paste it below. It works once, then Hoagie keeps a private read-only link in this PC's secure store.</li></ol>
          <div class="row"><input type="password" id="b-tok" placeholder="Paste Setup Token" style="flex:1"><button class="btn go" id="b-con">Connect</button></div>`}
        <div id="b-msg" class="tiny"></div></div>
      <h3>${esc(ym)} entries</h3>
      ${d.items.length ? `<table class="tab"><tr><th>Date</th><th>Note</th><th>Category</th><th>Amount</th><th></th></tr>${d.items.map(i => `<tr><td>${esc(i.date)}</td><td>${esc(i.note)}${i.source !== "manual" ? ` <span class="tiny">${esc(i.source)}</span>` : ""}</td><td>${esc(i.category)}</td><td class="${i.amount < 0 ? "pos" : ""}">${i.amount < 0 ? "+" + money(-i.amount) : money(i.amount)}</td><td><button class="btn" data-cdel="${esc(i.id)}">✕</button></td></tr>`).join("")}</table>` : `<p class="tiny">No entries this month.</p>`}
      <p class="fine">Your cost tracker is private to your account. Not financial advice.</p>`;
    $("#c-month", body).onchange = e => { ym = e.target.value; draw(); };
    $("#c-add", body).onclick = async () => {
      const amt = +$("#c-amt", body).value; if (!amt) return;
      try { await api("/api/costs/add", { date: $("#c-date", body).value, amount: $("#c-in", body).checked ? -Math.abs(amt) : Math.abs(amt), category: $("#c-in", body).checked ? "Income" : $("#c-cat", body).value, note: $("#c-note", body).value }); Music.blip("coin"); draw(); } catch (e) { toast(e.message); }
    };
    $("#c-bset", body).onclick = async () => { await api("/api/costs/budget", { category: $("#c-bcat", body).value, amount: +$("#c-bamt", body).value }); draw(); };
    $("#c-csv", body).onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const text = await f.text();
      try { const r = await api("/api/costs/import", { csv: text }); $("#c-csv-msg", body).textContent = `Imported ${r.added} new entries.`; setTimeout(draw, 800); }
      catch (e) { $("#c-csv-msg", body).textContent = e.message; }
    };
    $$("[data-cdel]", body).forEach(x => x.onclick = async () => { await api("/api/costs/delete", { id: x.dataset.cdel }); draw(); });
    const bmsg = t => $("#b-msg", body).textContent = t;
    if ($("#b-con", body)) $("#b-con", body).onclick = async () => { bmsg("Connecting…"); try { const r = await api("/api/bank/connect", { token: $("#b-tok", body).value }); bmsg(`Connected ${r.accounts.length} account(s), ${r.added} new transactions.`); draw(); } catch (e) { bmsg(e.message); } };
    if ($("#b-sync", body)) $("#b-sync", body).onclick = async () => { bmsg("Syncing…"); try { const r = await api("/api/bank/sync", {}); bmsg(`${r.added} new transactions.`); draw(); } catch (e) { bmsg(e.message); } };
    if ($("#b-off", body)) $("#b-off", body).onclick = async () => { await api("/api/bank/disconnect", {}); draw(); };
  };
  draw();
};
