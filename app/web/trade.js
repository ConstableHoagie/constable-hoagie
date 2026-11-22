// Trading counter: search platforms, see what each can do, connect, and (Alpaca) place orders.
/* global PANELS, $, $$, esc, money, api, toast, Music, STATUS, openPanel */
const STATUS_LABEL = { direct: "✅ Hoagie connects", snaptrade: "🔗 Via SnapTrade", mcp: "🤖 Via an AI agent", planned: "🛠 Planned", none: "🚫 No public API" };

PANELS.trade = async (body) => {
  body.innerHTML = `<h2>📈 Trading Counter</h2>
    <p class="lead">Connect the places you invest. Hoagie pulls balances into My Tab, and can place orders where the platform allows, always inside your limits.</p>
    <input type="text" id="br-q" placeholder="Search: Robinhood, Schwab, crypto, options, paper…" style="width:100%">
    <div id="br-out">Loading…</div>`;
  let d;
  try { d = await api("/api/brokers"); } catch (e) { $("#br-out", body).textContent = e.message; return; }
  const owner = !STATUS.guest;
  const card = p => `<article class="broker ${p.connected ? "on" : ""}">
      <div class="br-head"><b>${esc(p.name)}</b><span class="pill grey">${STATUS_LABEL[p.status] || ""}</span>${p.connected ? `<span class="pill">Connected</span>` : ""}</div>
      <div class="tiny">${esc(p.assets)}</div>
      <div class="br-caps">${[["Read", p.read], ["Trade", p.trade], ["Paper", p.paper]].map(([l, v]) => `<span class="${v ? "yes" : "no"}">${v ? "✓" : "✕"} ${l}</span>`).join("")}</div>
      <p class="tiny"><b>API:</b> ${esc(p.api)}${p.extras ? `<br><b>Extras:</b> ${esc(p.extras)}` : ""}</p>
      <p><b>With Hoagie:</b> ${esc(p.hoagie)}</p>${benefitsHtml(p.id, p.status)}
      <div class="row">${p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">Open ${esc(p.name.split(" ")[0])}</a>` : ""}
        ${owner && p.fields ? `<button class="btn go" data-con="${p.id}">${p.connected ? "Update keys" : "Connect"}</button>` : ""}
        ${owner && p.connected ? `<button class="btn" data-sync="${p.id}">🔄 Sync</button><button class="btn" data-rm="${p.id}">Disconnect</button>` : ""}
        ${owner && p.id === "snaptrade" && p.connected ? `<button class="btn primary" id="snap-portal">➕ Link a brokerage</button>` : ""}</div>
      ${p.last_sync ? `<p class="tiny">Last sync ${esc(p.last_sync)}</p>` : ""}
      <div class="br-form" id="form-${p.id}"></div>
    </article>`;
  const draw = () => {
    const q = ($("#br-q", body).value || "").toLowerCase().trim();
    const hits = d.platforms.filter(p => !q || (p.name + " " + p.assets + " " + p.api + " " + p.extras + " " + STATUS_LABEL[p.status]).toLowerCase().includes(q));
    const alp = d.platforms.find(p => p.id === "alpaca");
    $("#br-out", body).innerHTML = `
      ${hits.length ? hits.map(card).join("") : `<div class="conn"><h4>Not on the list yet</h4><p class="tiny">"${esc(q)}" isn't listed. Many brokers can be reached through <b>SnapTrade</b> (search "snaptrade"). If it's not there, type holdings in on My Tab or drop a screenshot.</p></div>`}
      ${owner && alp && alp.connected ? `<div class="conn"><h4>🧾 Order ticket: Alpaca ${d.alpaca_paper ? "(paper)" : "(live account)"}</h4>
        <p class="tiny">Market order by dollar amount. Paper mode uses practice money. Live orders need live mode on, a confirm tick, and stay under your cap of <b>$${esc(d.max_order_usd)}</b>.</p>
        <div class="row"><label class="field">Symbol<input type="text" id="o-sym" placeholder="VOO or BTC/USD" maxlength="12"></label>
          <label class="field">Buy / sell<select id="o-side"><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
          <label class="field">Dollars<input type="number" id="o-usd" min="1" step="1" placeholder="25"></label></div>
        <label class="row"><input type="checkbox" id="o-ok"> I've checked this order and want to place it</label>
        <div class="row"><button class="btn primary" id="o-go">Place order</button></div><div id="o-msg" class="tiny"></div>
        <details><summary class="tiny">Trading settings</summary>
          <div class="row"><label class="field">Per-order cap ($)<input type="number" id="o-cap" value="${esc(d.max_order_usd)}" min="1"></label><button class="btn" id="o-capsave">Save cap</button></div>
          <div class="row"><label class="row"><input type="checkbox" id="o-paper" ${d.alpaca_paper ? "checked" : ""}> Use paper (practice) account</label></div>
          <div class="row"><label class="field">Live real-money orders<input type="text" id="o-live" placeholder="type LIVE to switch on"></label>
            <button class="btn" id="o-liveon">${d.alpaca_live ? "Switch live OFF" : "Switch live ON"}</button></div>
          <p class="tiny">Live mode is ${d.alpaca_live ? "<b>ON</b>" : "off"}.</p>
        </details>
        ${d.orders.length ? `<h4>Recent orders</h4>${d.orders.slice().reverse().map(o => `<div class="tiny">${esc(o.at)} · ${o.paper ? "paper" : "<b>LIVE</b>"} · ${esc(o.side)} ${esc(o.symbol)} ${money(o.notional)} → ${esc(o.status || "")}</div>`).join("")}` : ""}
      </div>` : ""}
      <h3 class="sec">What Hoagie can do with your connections</h3>
      ${d.features.map(([s, what, where]) => `<div class="feat"><span class="pill ${s === "live" ? "" : "grey"}">${{ live: "Live now", next: "Next up", never: "Never" }[s]}</span> <b>${esc(what)}</b> <span class="tiny">· ${esc(where)}</span></div>`).join("")}
      <p class="fine">List checked ${esc(d.checked)}; platforms change their APIs, so Hoagie shows what each one currently allows. Hoagie never asks for withdrawal or transfer permissions. Not financial advice.</p>`;
    bind();
  };
  const bind = () => {
    $$("[data-con]", body).forEach(b => b.onclick = () => {
      const p = d.platforms.find(x => x.id === b.dataset.con), f = $("#form-" + p.id, body);
      const label = { key: "API key", secret: "API secret", key_name: "Key name (organizations/…/apiKeys/…)", private_key: "Private key", client_id: "Client ID", consumer_key: "Consumer key" };
      f.innerHTML = `<div class="row">${p.fields.map(k => `<label class="field" style="flex:1">${label[k] || k}${k === "private_key" ? `<textarea data-f="${k}" rows="3" placeholder="-----BEGIN EC PRIVATE KEY----- …"></textarea>` : `<input type="password" data-f="${k}">`}</label>`).join("")}</div>
        ${p.id === "alpaca" ? `<label class="row"><input type="checkbox" id="f-paper" checked> These are paper (practice) keys</label>` : ""}
        <p class="tiny">Keys go to this PC's secure store, never into a file or the shared app. Use the smallest permission the platform offers (view/read only, no withdrawals).</p>
        <div class="row"><button class="btn go" id="f-save">Save & sync</button></div><div class="tiny" id="f-msg"></div>`;
      $("#f-save", f).onclick = async () => {
        const fields = {}; $$("[data-f]", f).forEach(i => fields[i.dataset.f] = i.value);
        if ($("#f-paper", f)) fields.paper = $("#f-paper", f).checked;
        $("#f-msg", f).textContent = "Connecting…";
        try { const r = await api("/api/brokers/save", { id: p.id, fields }); toast(`Connected: ${r.rows} holdings synced.`); Music.blip("coin"); openPanel("trade"); }
        catch (e) { $("#f-msg", f).textContent = e.message; }
      };
    });
    $$("[data-sync]", body).forEach(b => b.onclick = async () => { try { const r = await api("/api/brokers/sync", { id: b.dataset.sync }); toast(`Synced ${r.rows} holdings.`); openPanel("trade"); } catch (e) { toast(e.message); } });
    $$("[data-rm]", body).forEach(b => b.onclick = async () => { await api("/api/brokers/remove", { id: b.dataset.rm }); openPanel("trade"); });
    if ($("#snap-portal", body)) $("#snap-portal", body).onclick = async () => { try { const r = await api("/api/brokers/portal", {}); window.open(r.url, "_blank", "noopener"); toast("Log in to your brokerage on SnapTrade's page, then press Sync here."); } catch (e) { toast(e.message); } };
    if ($("#o-go", body)) {
      $("#o-go", body).onclick = async () => {
        const m = $("#o-msg", body);
        try { const r = await api("/api/brokers/order", { symbol: $("#o-sym", body).value, side: $("#o-side", body).value, notional: +$("#o-usd", body).value, confirm: $("#o-ok", body).checked });
          m.textContent = `${r.paper ? "Paper" : "LIVE"} order sent: ${r.status}.`; Music.blip("coin"); setTimeout(() => openPanel("trade"), 1200); }
        catch (e) { m.textContent = e.message; }
      };
      $("#o-capsave", body).onclick = async () => { d = await api("/api/brokers/settings", { max_order_usd: +$("#o-cap", body).value }); toast("Cap saved."); };
      $("#o-paper", body).onchange = async ev => { await api("/api/brokers/settings", { alpaca_paper: ev.target.checked }); toast(ev.target.checked ? "Paper account. Sync with paper keys." : "Live account. Sync with live keys."); };
      $("#o-liveon", body).onclick = async () => { try { d = await api("/api/brokers/settings", { alpaca_live: !d.alpaca_live, typed: $("#o-live", body).value }); draw(); } catch (e) { toast(e.message); } };
    }
  };
  $("#br-q", body).oninput = draw;
  draw();
};
