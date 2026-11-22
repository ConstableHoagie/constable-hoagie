// Bet Tracker (full menu): open bets with live scores, history, and four ways in: type, paste, screenshot, CSV.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, CHART, refreshQuest */

const BET_SRC_ICON = { manual: "✍️", text: "📋", screenshot: "📸", csv: "📄", kalshi: "📊", today_play: "🥪", hub: "🏟", agent: "🤖", webhook: "🔗" };
const odd = o => o == null ? "–" : (o > 0 ? "+" + o : String(o));
const usd = n => CHART.money(n || 0);

function betRow(b, open) {
  const live = b.live ? `<div class="bet-live ${b.live.state === "in" ? "in" : ""}">${b.live.state === "in" ? "🔴 LIVE" : b.live.state === "post" ? "🏁" : "🕒"} ${esc(b.live.score)} · ${esc(b.live.detail)}</div>` : "";
  const sug = b.suggest ? `<div class="tiny">Looks like a <b>${esc(b.suggest)}</b>. <button class="btn" data-settle="${b.id}" data-to="${b.suggest}">Confirm</button></div>` : "";
  return `<div class="bet ${b.status}">
    <div class="bet-main"><span class="bet-src" title="${esc(b.source)}">${BET_SRC_ICON[b.source] || "•"}</span>
      <div><b>${esc(b.pick)}</b> <span class="pill grey">${esc(b.market)}</span>${b.event && b.event !== b.pick ? `<div class="tiny">${esc(b.event)}</div>` : ""}
      <div class="tiny">${esc(b.book)} · ${esc(b.placed)} · odds ${odd(b.odds)}</div>${live}${sug}</div></div>
    <div class="bet-money"><div>${usd(b.stake)}</div><div class="tiny">${open ? "to win " + usd(b.to_win) : b.status === "won" ? `<span class="pos">+${usd(b.payout - b.stake)}</span>` : b.status === "lost" ? `<span class="neg">−${usd(b.stake)}</span>` : esc(b.status)}</div></div>
    <div class="bet-act">${open ? `<select data-st="${b.id}"><option value="">Settle…</option><option value="won">Won</option><option value="lost">Lost</option><option value="push">Push</option><option value="cashed">Cashed out</option><option value="void">Void</option></select>` : ""}
      <button class="btn" data-del="${b.id}" title="Delete">🗑</button></div></div>`;
}

// bets placed per day: one hue, thin bars, 2px gaps, a hover title on each bar
function betBars(tl) {
  const W = 720, H = 90, P = 22, n = tl.length, max = Math.max(...tl.map(t => t.day_bets), 1), bw = Math.max(2, (W - P * 2) / n - 2);
  const c = CHART.ink();
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Bets placed per day">
    ${tl.map((t, i) => { const h = (t.day_bets / max) * (H - P - 6), x = P + i * ((W - P * 2) / n);
      return `<rect x="${x.toFixed(1)}" y="${(H - P - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${c.line}"><title>${esc(t.date)}: ${t.day_bets} bet${t.day_bets > 1 ? "s" : ""}</title></rect>`; }).join("")}
    <text x="${P}" y="${H - 6}" font-size="11" fill="${c.text}">${esc(tl[0].date.slice(5))}</text>
    <text x="${W - P}" y="${H - 6}" font-size="11" fill="${c.text}" text-anchor="end">${esc(tl[n - 1].date.slice(5))} · bets per day (max ${max})</text></svg>`;
}

PANELS.bets = async (body) => {
  if (!STATUS.me.betting && !STATUS.me.bet_view) { body.innerHTML = `<h2>🎟 Bet Tracker</h2><p class="lead">Part of the full menu. Switch at Connect › Your menu.</p>`; return; }
  body.innerHTML = `<h2>🎟 Bet Tracker</h2><p class="tiny">Loading your action…</p>`;
  let d;
  try { d = await api("/api/bets"); } catch (e) { body.innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
  const s = d.summary, owner = !STATUS.guest;
  body.innerHTML = `<h2>🎟 Bet Tracker</h2>
    <p class="lead">Every bet in one place: live scores on open bets, your record and profit on the rest. Hoagie never places bets for you.</p>
    <div class="dgrid">
      <div class="dcard"><h4>Open</h4><div class="big">${s.open_count}</div><div class="tiny">${usd(s.at_risk)} at risk · could win ${usd(s.could_win)}</div></div>
      <div class="dcard"><h4>Record</h4><div class="big">${esc(s.record)}</div><div class="tiny">${s.win_rate != null ? s.win_rate + "% wins" : "No settled bets yet"}</div></div>
      <div class="dcard"><h4>Profit</h4><div class="big ${s.profit >= 0 ? "pos" : "neg"}">${s.profit >= 0 ? "+" : "−"}${usd(Math.abs(s.profit))}</div><div class="tiny">${s.roi != null ? "ROI " + s.roi + "%" : ""}</div></div>
    </div>
    <div class="dcard wide bt-charts"><h4>📈 Your action over time</h4>
      <div class="bt-totals"><span><b>${d.total_bets}</b> total bets</span><span><b>${usd(d.total_staked)}</b> wagered</span><span><b>${usd(s.at_risk + s.could_win)}</b> potential payout on open bets</span></div>
      <div class="bt-expo" title="Open bets: what's at risk vs what they could win">${s.at_risk + s.could_win > 0 ? `<i class="risk" style="width:${(s.at_risk / (s.at_risk + s.could_win) * 100).toFixed(1)}%"></i><i class="win" style="width:${(s.could_win / (s.at_risk + s.could_win) * 100).toFixed(1)}%"></i>` : ""}</div>
      <div class="tiny bt-expo-l"><span>▮ At risk ${usd(s.at_risk)}</span><span>▮ Could win ${usd(s.could_win)}</span></div>
      <div id="bt-line"></div><div id="bt-bars"></div></div>
    <div class="toggle-row" id="bt-tabs"><button class="toggle on" data-t="add">➕ Add a bet</button><button class="toggle" data-t="connect">🔗 Connected sources</button><button class="toggle" data-t="fantasy">🏈 Fantasy</button></div>
    <div id="bt-pane"></div>
    <h3>🔴 Active & live (${d.open.length})</h3>
    <div class="bets">${d.open.length ? d.open.map(b => betRow(b, true)).join("") : `<p class="tiny">No open bets. Add one above, or track Today's Play.</p>`}</div>
    <h3>📚 Settled</h3>
    <div class="bets">${d.settled.length ? d.settled.slice(0, 50).map(b => betRow(b, false)).join("") : `<p class="tiny">Nothing settled yet.</p>`}</div>
    <div class="row"><a class="btn" href="/api/bets/export.csv">⬇ Export CSV</a> <button class="btn" id="bt-refresh">↻ Refresh live scores</button></div>
    <p class="fine">Live scores: ESPN's free scoreboard, matched by team name; results are suggestions you confirm. If betting stops being fun, call or text 1-800-GAMBLER.</p>`;

  if (d.timeline.length > 1) {
    CHART.line($("#bt-line", body), [{ name: "Total wagered", points: d.timeline.map(t => ({ date: t.date, total: t.staked })) },
      { name: "Paid back + still possible", points: d.timeline.map(t => ({ date: t.date, total: t.potential })), dash: true }], { height: 190, label: "Bets over time" });
    $("#bt-bars", body).innerHTML = betBars(d.timeline);
  } else { $("#bt-line", body).innerHTML = `<p class="tiny">Log a few bets and your running totals chart in here.</p>`; }
  const pane = $("#bt-pane", body);
  const panes = {
    add: () => {
      pane.innerHTML = `<div class="conn">
        <div class="toggle-row" id="bt-how"><button class="toggle on" data-h="type">✍️ Type</button><button class="toggle" data-h="paste">📋 Paste a slip</button><button class="toggle" data-h="shot">📸 Screenshot</button><button class="toggle" data-h="csv">📄 CSV</button></div>
        <div id="bt-how-pane"></div><div id="bt-msg" class="tiny"></div><div id="bt-review"></div></div>`;
      const hp = $("#bt-how-pane", pane);
      const how = {
        type: () => { hp.innerHTML = `<div class="bt-form">
            <label class="field">Pick<input id="f-pick" placeholder="Lakers -3.5"></label>
            <label class="field">Game / event<input id="f-event" placeholder="Lakers vs Celtics"></label>
            <label class="field">Book<select id="f-book">${d.books.map(b => `<option>${esc(b)}</option>`).join("")}</select></label>
            <label class="field">Type<select id="f-market">${d.markets.map(m => `<option>${esc(m)}</option>`).join("")}</select></label>
            <label class="field">Odds<input id="f-odds" placeholder="-110" inputmode="numeric"></label>
            <label class="field">Stake $<input id="f-stake" placeholder="20" inputmode="decimal"></label></div>
            <div class="row"><button class="btn go" id="f-add">Add bet</button></div>`;
          $("#f-add", hp).onclick = async () => { try {
            await api("/api/bets/add", { pick: $("#f-pick", hp).value, event: $("#f-event", hp).value, book: $("#f-book", hp).value, market: $("#f-market", hp).value,
              odds: $("#f-odds", hp).value, stake: $("#f-stake", hp).value, source: "manual" });
            Music.blip("coin"); LS.set("q-bet", true); openPanel("bets"); } catch (e) { $("#bt-msg", pane).textContent = e.message; } }; },
        paste: () => { hp.innerHTML = `<textarea id="p-text" rows="4" placeholder="One bet per line, e.g.\nLakers -3.5 -110 $20 DraftKings\nChiefs ML +130 $10 FanDuel\nOr paste a whole copied bet slip."></textarea>
            <div class="row"><button class="btn go" id="p-read">Read it</button> <label class="tiny"><input type="checkbox" id="p-ai"> Use my AI for messy slips</label></div>`;
          $("#p-read", hp).onclick = async () => { $("#bt-msg", pane).textContent = "Reading…";
            try { const r = await api("/api/bets/parse", { text: $("#p-text", hp).value, ai: $("#p-ai", hp).checked }); review(r.items, "text"); }
            catch (e) { $("#bt-msg", pane).textContent = e.message; } }; },
        shot: () => { hp.innerHTML = `<div class="drop" id="s-drop">📸 Drop a bet slip screenshot here, paste it (Ctrl+V), or <label class="linkish"><input type="file" id="s-file" accept="image/*" hidden>pick a file</label></div>
            <p class="tiny">Works with any sportsbook, DFS or prediction-market app. Your AI reads it (Claude, GPT, Gemini or a vision-capable agent).</p>`;
          const go = async f => { if (!f) return; $("#bt-msg", pane).textContent = "Reading the slip…";
            const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
            try { const r = await api("/api/bets/screenshot", { image: data }); review(r.items, "screenshot"); } catch (e) { $("#bt-msg", pane).textContent = e.message; } };
          $("#s-file", hp).onchange = e => go(e.target.files[0]);
          const dz = $("#s-drop", hp); dz.ondragover = e => { e.preventDefault(); dz.classList.add("over"); }; dz.ondragleave = () => dz.classList.remove("over");
          dz.ondrop = e => { e.preventDefault(); dz.classList.remove("over"); go(e.dataTransfer.files[0]); };
          document.onpaste = e => { if (!$("#s-drop")) return; const it = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith("image/")); if (it) go(it.getAsFile()); }; },
        csv: () => { hp.innerHTML = `<p class="tiny">Bet history from Pikkit Pro's export, Juice Reel, or any spreadsheet (columns are matched by name: date, sportsbook, pick/selection, odds, stake, status, payout).</p>
            <input type="file" id="c-file" accept=".csv,text/csv">`;
          $("#c-file", hp).onchange = async e => { const f = e.target.files[0]; if (!f) return;
            try { const r = await api("/api/bets/import", { csv: await f.text() }); $("#bt-msg", pane).textContent = `Added ${r.added}, skipped ${r.skipped} (duplicates or blank).`; LS.set("q-bet", true); setTimeout(() => openPanel("bets"), 900); }
            catch (err) { $("#bt-msg", pane).textContent = err.message; } }; },
      };
      $$("[data-h]", pane).forEach(b => b.onclick = () => { $$("[data-h]", pane).forEach(x => x.classList.toggle("on", x === b)); $("#bt-review", pane).innerHTML = ""; how[b.dataset.h](); });
      how.type();
      function review(items, source) {
        $("#bt-msg", pane).textContent = items.length ? `Found ${items.length}. Check them, then save.` : "Couldn't find a bet in that. Try the Type tab.";
        $("#bt-review", pane).innerHTML = items.map((b, i) => `<div class="bt-form rv" data-i="${i}">
          <label class="field">Pick<input data-k="pick" value="${esc(b.pick || "")}"></label><label class="field">Event<input data-k="event" value="${esc(b.event || "")}"></label>
          <label class="field">Book<input data-k="book" value="${esc(b.book || "")}"></label><label class="field">Odds<input data-k="odds" value="${b.odds ?? ""}"></label>
          <label class="field">Stake<input data-k="stake" value="${b.stake ?? ""}"></label><label class="field">Status<input data-k="status" value="${esc(b.status || "open")}"></label></div>`).join("")
          + (items.length ? `<div class="row"><button class="btn go" id="rv-save">Save ${items.length} bet${items.length > 1 ? "s" : ""}</button></div>` : "");
        if (!items.length) return;
        $("#rv-save", pane).onclick = async () => {
          for (const row of $$(".rv", pane)) { const b = { ...items[+row.dataset.i], source };
            $$("[data-k]", row).forEach(inp => b[inp.dataset.k] = inp.value);
            try { await api("/api/bets/add", b); } catch (e) { $("#bt-msg", pane).textContent = e.message; return; } }
          Music.blip("coin"); LS.set("q-bet", true); openPanel("bets"); };
      }
    },
    connect: () => {
      pane.innerHTML = `<div class="conn"><h4>📊 Kalshi ${d.kalshi ? "✅" : ""}</h4>${benefitsHtml("kalshi")}
        ${owner ? `<p class="tiny">Kalshi › Account › API Keys › Create key. Paste the Key ID and the private key file's text (it starts with -----BEGIN). Read-only in Hoagie.</p>
        <div class="row"><input type="text" id="k-id" placeholder="Key ID"><textarea id="k-pem" rows="2" placeholder="-----BEGIN PRIVATE KEY-----" style="flex:1"></textarea>
        <button class="btn go" id="k-save">Save</button>${d.kalshi ? `<button class="btn" id="k-sync">🔄 Sync</button>` : ""}</div>` : ""}<div id="k-msg" class="tiny"></div></div>
        <div class="conn"><h4>📸 Any sportsbook or DFS app</h4>${benefitsHtml("slip-shot")}<p class="tiny">DraftKings, FanDuel and the rest have no public API (and ban automation), so screenshots, pasted slips and CSV exports are the way in.</p></div>
        <div class="conn"><h4>🥪 Today's Play & your sports desk</h4><p class="tiny">Hit “Track this bet” on any bet card in Today's Play.</p></div>
        <div class="conn"><h4>🤖 Your AI agent & Shortcuts</h4>${benefitsHtml("agent-api")}<button class="btn" id="to-agent">Set up a token</button></div>
        <div class="conn"><h4>🔜 SharpSports BetSync</h4><p class="tiny">Automatic sportsbook syncing needs a business agreement with SharpSports; the LLC could apply later.</p></div>`;
      $("#to-agent", pane).onclick = () => openPanel("aisetup");
      if ($("#k-save", pane)) $("#k-save", pane).onclick = async () => { try {
        if ($("#k-id", pane).value.trim()) await api("/api/secret", { name: "kalshi_key_id", value: $("#k-id", pane).value.trim() });
        if ($("#k-pem", pane).value.trim()) await api("/api/secret", { name: "kalshi_private_key", value: $("#k-pem", pane).value.trim() });
        const r = await api("/api/bets/kalshi", {}); $("#k-msg", pane).textContent = `Synced ${r.positions} open positions.`; setTimeout(() => openPanel("bets"), 900);
      } catch (e) { $("#k-msg", pane).textContent = e.message; } };
      if ($("#k-sync", pane)) $("#k-sync", pane).onclick = async () => { try { const r = await api("/api/bets/kalshi", {}); $("#k-msg", pane).textContent = `Synced ${r.positions} open positions.`; setTimeout(() => openPanel("bets"), 900); } catch (e) { $("#k-msg", pane).textContent = e.message; } };
    },
    fantasy: async () => {
      pane.innerHTML = `<div class="conn"><h4>🏈 Sleeper</h4>${benefitsHtml("sleeper")}
        <div class="row"><input type="text" id="sl-user" value="${esc(d.sleeper_user || "")}" placeholder="Your Sleeper username"><button class="btn go" id="sl-go">Show my leagues</button></div><div id="sl-out" class="tiny"></div></div>`;
      const show = async (save) => { $("#sl-out", pane).textContent = "Checking Sleeper…";
        try { const r = save ? await api("/api/bets/sleeper", { user: $("#sl-user", pane).value }) : await api("/api/sleeper");
          $("#sl-out", pane).innerHTML = r.leagues && r.leagues.length ? `<b>${esc(r.user || "")}</b> · week ${esc(String(r.week || ""))}` + r.leagues.map(l => `<div>🏆 <b>${esc(l.name)}</b> (${esc(l.record)}): ${l.points ?? 0} vs ${l.opp_points ?? 0}</div>`).join("") : "No leagues found for this season.";
        } catch (e) { $("#sl-out", pane).textContent = e.message; } };
      $("#sl-go", pane).onclick = () => show(true);
      if (d.sleeper_user) show(false);
    },
  };
  $$("[data-t]", body).forEach(b => b.onclick = () => { $$("[data-t]", body).forEach(x => x.classList.toggle("on", x === b)); panes[b.dataset.t](); });
  panes.add();
  $$("[data-st]", body).forEach(sel => sel.onchange = async () => { if (!sel.value) return; await api("/api/bets/update", { id: sel.dataset.st, changes: { status: sel.value } }); Music.blip("coin"); openPanel("bets"); });
  $$("[data-settle]", body).forEach(b => b.onclick = async () => { await api("/api/bets/update", { id: b.dataset.settle, changes: { status: b.dataset.to } }); openPanel("bets"); });
  $$("[data-del]", body).forEach(b => b.onclick = async () => { await api("/api/bets/delete", { id: b.dataset.del }); openPanel("bets"); });
  $("#bt-refresh", body).onclick = () => openPanel("bets");
};

// "Track this bet" from Today's Play bet cards
window.trackBet = async (b) => {
  try { await api("/api/bets/add", { ...b, source: "today_play" }); LS.set("q-bet", true); toast("Tracking it in the Bet Tracker 🎟", [{ label: "Open", do: () => openPanel("bets") }]); }
  catch (e) { toast(e.message); }
};
