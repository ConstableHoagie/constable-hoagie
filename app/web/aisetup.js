// "Pick Hoagie's brain" (setup step + Connect counter), bring-your-own-agent walkthrough, and All Integrations.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, benefitsHtml, refreshQuest */

const KEYED = { gemini: "gemini", openai: "openai", groq: "groq", openrouter: "openrouter" };
const KEY_LINKS = { gemini: "https://aistudio.google.com/apikey", openai: "https://platform.openai.com/api-keys", groq: "https://console.groq.com/keys", openrouter: "https://openrouter.ai/keys" };
const LOCAL_AGENTS = [["Ollama", "http://localhost:11434/v1"], ["LM Studio", "http://localhost:1234/v1"], ["Jan", "http://localhost:1337/v1"]];

function fitBar(n) {
  return `<span class="fit" title="Hoagie fit score: how much of the shop this brain can use (our estimate)"><i style="width:${n * 10}%"></i></span><b class="fit-n">${n}/10</b>`;
}

PANELS.aisetup = async (body, arg = {}) => {
  const owner = !STATUS.guest, neon = STATUS.me.betting;
  body.innerHTML = `<p class="tiny">Loading the brains…</p>`;
  let g;
  try { g = await api("/api/ai/guide"); } catch (e) { body.innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
  const def = g.default;
  body.innerHTML = `<h2>${neon ? "🧠 Pick your co-pilot" : "🧠 Pick Hoagie's brain"}</h2>
    <p class="lead">This AI writes your plays, answers questions and reads screenshots. <b>Free</b> and <b>No account</b> options are marked. The <b>Hoagie fit score</b> is our estimate of how much of the shop it can use: live news, screenshots, solid plays.</p>
    ${owner ? "" : `<div class="conn tiny">🔑 Your shop admin connects the AI keys, so Hoagie's brain here is <b>${esc(g.in_use || "the shop's")}</b>. You can still use a free, no-account AI in your own browser from the Ask counter, or bring your own agent: ask an admin for a token, then follow “Bring your own agent” below.</div>`}
    <div class="ai-filter toggle-row"><button class="toggle on" data-f="all">All</button><button class="toggle" data-f="free">💸 Free</button><button class="toggle" data-f="noacct">🙅 No account</button></div>
    <div class="brains">${g.brains.map(b => `<div class="brain ${b.ready ? "ready" : ""} ${def === b.id ? "picked" : ""}" data-id="${b.id}" data-free="${b.free ? 1 : 0}" data-noacct="${b.account ? 0 : 1}">
      <div class="brain-head"><b>${esc(b.name)}</b>
        ${b.free ? `<span class="pill">💸 Free</span>` : ""}${!b.account ? `<span class="pill gold">🙅 No account</span>` : ""}${b.ready ? `<span class="pill">Connected ✔</span>` : ""}
        <span class="brain-fit">${fitBar(b.score)}</span></div>
      <div class="tiny">${esc(b.cost)}</div>
      <ul class="tiny">${b.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
      <div class="tiny"><b>How:</b> ${esc(b.how)}</div>
      ${owner ? brainControls(b, g) : ""}
    </div>`).join("")}</div>
    <div class="row" ${owner ? "" : "hidden"}><label class="field">Default brain <select id="ai-def">
      <option value="auto" ${def === "auto" ? "selected" : ""}>Auto: best one connected</option>
      ${g.brains.filter(b => !["chrome", "ollama"].includes(b.id)).map(b => `<option value="${b.id}" ${def === b.id ? "selected" : ""}>${esc(b.name)}</option>`).join("")}
    </select></label> <button class="btn" id="ai-test">▶ Test it</button> <span id="ai-res" class="tiny"></span></div>
    ${byoAgentHtml(g)}
    <div id="ai-err" class="tiny neg"></div>
    ${arg.first ? `<div class="row"><button class="gbtn ${neon ? "red" : "green"}" id="ai-next">Next: customize my dashboard ▶</button><button class="btn" id="ai-later">Decide later</button></div>` : ""}`;
  // filters
  $$("[data-f]", body).forEach(b => b.onclick = () => { $$("[data-f]", body).forEach(x => x.classList.toggle("on", x === b));
    $$(".brain", body).forEach(c => { c.hidden = b.dataset.f === "free" ? c.dataset.free !== "1" : b.dataset.f === "noacct" ? c.dataset.noacct !== "1" : false; }); });
  wireBrain(body, g);
  wireAgent(body);
  $("#ai-def", body).onchange = async e => { await api("/api/ai/setup", { default: e.target.value }); Music.blip("coin"); toast("Default brain saved"); };
  $("#ai-test", body).onclick = async () => { $("#ai-res", body).textContent = "Asking…";
    try { const r = await api("/api/ai/test", { provider: $("#ai-def", body).value === "auto" ? "" : $("#ai-def", body).value });
      $("#ai-res", body).innerHTML = `✔ ${esc(r.engine)}${r.model ? " · " + esc(r.model) : ""} in ${r.seconds}s: “${esc(r.answer)}”`; }
    catch (e) { $("#ai-res", body).innerHTML = `<span class="neg">${esc(e.message)}</span>`; } };
  const done = async () => { try { await api("/api/me", { flags: { ai_asked: true } }); STATUS.me.ai_asked = true; } catch (e) { /* demo */ }
    if (owner) { try { await api("/api/ai/setup", { done: true }); STATUS.settings.ai_set = true; } catch (e) { /* ignore */ } }
    refreshQuest(); closePanel(); if (arg.done) arg.done(); };
  if ($("#ai-next", body)) $("#ai-next", body).onclick = done;
  if ($("#ai-later", body)) $("#ai-later", body).onclick = done;
};

function brainControls(b, g) {
  if (KEYED[b.id]) return `<div class="row"><input type="password" placeholder="${b.ready ? "key saved (paste to replace)" : "paste your key"}" data-bkey="${b.id}" style="flex:1">
      <button class="btn go" data-bsave="${b.id}">Save</button> <a href="${KEY_LINKS[b.id]}" target="_blank" rel="noopener">Get a key ↗</a>
      ${b.ready ? `<button class="btn" data-bmodels="${b.id}">Models</button><select data-bmodel="${b.id}" hidden></select>` : ""}</div>`;
  if (b.id === "ollama") return `<div class="row">${LOCAL_AGENTS.map(([n, u]) => `<button class="btn" data-local="${u}">Use ${n}</button>`).join("")}</div>`;
  if (b.id === "claude" && !b.ready) return `<div class="row"><code>irm https://claude.ai/install.ps1 | iex</code> then <code>claude auth login</code></div>`;
  if (b.id === "agent") return `<div class="tiny">Set it up in “Bring your own agent” below.</div>`;
  if (b.id === "chrome") return `<div class="row"><button class="btn" data-go="ask">Open the Ask counter</button></div>`;
  return "";
}

function wireBrain(body, g) {
  $$("[data-bsave]", body).forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.bsave, v = $(`[data-bkey="${id}"]`, body).value.trim(); if (!v) return;
    try { await api("/api/secret", { name: KEYED[id], value: v }); await api("/api/ai/setup", { default: id }); Music.blip("coin");
      toast("Saved. " + id + " is now Hoagie's brain."); openPanel("aisetup", { first: !STATUS.settings.ai_set }); }
    catch (e) { $("#ai-err", body).textContent = e.message; }
  });
  $$("[data-bmodels]", body).forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.bmodels, sel = $(`[data-bmodel="${id}"]`, body);
    try { const r = await api("/api/ai/models", { provider: id }); const cur = (g.models || {})[id] || "";
      sel.innerHTML = `<option value="">Hoagie picks</option>` + r.models.map(m => `<option ${m === cur ? "selected" : ""}>${esc(m)}</option>`).join(""); sel.hidden = false;
      sel.onchange = () => api("/api/ai/setup", { provider: id, model: sel.value }).then(() => toast("Model saved")); }
    catch (e) { $("#ai-err", body).textContent = e.message; }
  });
  $$("[data-local]", body).forEach(btn => btn.onclick = async () => {
    try { await api("/api/ai/setup", { agent_url: btn.dataset.local, default: "agent" }); toast("Pointed at " + btn.dataset.local); openPanel("aisetup", { first: !STATUS.settings.ai_set }); }
    catch (e) { $("#ai-err", body).textContent = e.message; }
  });
  $$("[data-go]", body).forEach(b => b.onclick = () => openPanel(b.dataset.go));
}

// ---------- Bring your own agent ----------
function byoAgentHtml(g) {
  const base = STATUS.remote ? location.origin : "http://127.0.0.1:8787";
  return `<details class="conn byo" ${g.default === "agent" ? "open" : ""}><summary><b>🤝 Bring your own agent</b>: plug the AI you already use into Constable Hoagie</summary>
    <p class="tiny"><b>Why bother?</b> Your agent already knows you and your tools. Plugged in, it gets Hoagie's live data (net worth, spending, bets, Treasury/FRED/SEC feeds) and Hoagie gets your agent's brain. No copy-pasting between apps, one place for the numbers, and your agent can log bets or spending for you.</p>
    <h4>Way 1 · Your agent is Hoagie's brain</h4>
    <ol class="tiny"><li>Your agent needs an OpenAI-style address ending in <code>/v1</code>: Ollama, LM Studio, LiteLLM, vLLM, n8n, Flowise, Azure OpenAI, or your own server.</li>
      <li>Paste it below (plus a key if it needs one), press Save, then Test.</li>
      <li>Today's Play, the Playbook, Ask and screenshot reading now use it.</li></ol>
    ${!STATUS.guest ? `<div class="row"><input type="text" id="ag-url" value="${esc(g.agent_url || "")}" placeholder="http://localhost:11434/v1" style="flex:2">
      <input type="password" id="ag-key" placeholder="key (optional)" style="flex:1"><button class="btn go" id="ag-save">Save</button></div>` : ""}
    <h4>Way 2 · Your agent uses Hoagie (Agent API + MCP)</h4>
    <ol class="tiny"><li>Make a token below. <b>Read</b> lets it look; <b>Read + log</b> also lets it add bets and spending. It can never move money, see keys or change settings.</li>
      <li><b>Claude Desktop, Cursor and other MCP apps:</b> add the bundled <code>setup\\hoagie_mcp.py</code> as an MCP server (snippet below). <b>Claude Code:</b> <code>claude mcp add constable-hoagie -e HOAGIE_TOKEN=… -- python setup\\hoagie_mcp.py</code></li>
      <li><b>ChatGPT actions, n8n, Zapier, IFTTT, iPhone Shortcuts, scripts:</b> call <code>${esc(base)}/agent/v1/snapshot</code> with the header <code>Authorization: Bearer &lt;token&gt;</code>. To log something: <code>POST /agent/v1/hook</code> with <code>{"type":"bet","text":"Lakers -3.5 -110 $20 DraftKings"}</code> or <code>{"type":"cost","amount":12.5,"note":"lunch"}</code>.</li>
      <li>Cloud services need the website address (Share Online on); tools on this PC can use <code>http://127.0.0.1:8787</code>.</li></ol>
    ${!STATUS.guest ? `<div class="row"><input type="text" id="tk-name" placeholder="Token name, e.g. Claude Desktop" maxlength="40"><select id="tk-scope"><option value="read">Read</option><option value="log">Read + log</option></select><button class="btn go" id="tk-make">Make token</button></div>
      <div id="tk-out"></div><div id="tk-list" class="tiny"></div>` : `<p class="tiny">Tokens are owner-only.</p>`}
    <pre class="snip">{
  "mcpServers": {
    "constable-hoagie": {
      "command": "python",
      "args": ["C:\\\\path\\\\to\\\\ConstableHoagie\\\\setup\\\\hoagie_mcp.py"],
      "env": { "HOAGIE_TOKEN": "hoagie_…", "HOAGIE_URL": "http://127.0.0.1:8787" }
    }
  }
}</pre></details>`;
}

async function wireAgent(body) {
  if (STATUS.guest) return;
  const list = async () => { try { const r = await api("/api/agent/tokens");
    $("#tk-list", body).innerHTML = r.tokens.length ? r.tokens.map(t => `<div>🔑 <b>${esc(t.name)}</b> · ${t.scope === "log" ? "read + log" : "read"} · made ${esc(t.created)}${t.last_used ? " · used " + esc(t.last_used) : ""} <button class="btn" data-rev="${t.id}">Revoke</button></div>`).join("") : "No tokens yet.";
    $$("[data-rev]", body).forEach(b => b.onclick = async () => { await api("/api/agent/revoke", { id: b.dataset.rev }); list(); }); } catch (e) { /* ignore */ } };
  list();
  $("#tk-make", body).onclick = async () => {
    try { const r = await api("/api/agent/tokens", { name: $("#tk-name", body).value, scope: $("#tk-scope", body).value });
      $("#tk-out", body).innerHTML = `<div class="conn done"><b>${esc(r.name)}</b>: <code id="tk-val">${esc(r.token)}</code> <button class="btn" id="tk-copy">Copy</button><div class="tiny">${esc(r.note)}</div></div>`;
      $("#tk-copy", body).onclick = () => navigator.clipboard.writeText(r.token).then(() => toast("Copied"));
      list(); } catch (e) { $("#ai-err", body).textContent = e.message; }
  };
  $("#ag-save", body).onclick = async () => {
    try { const k = $("#ag-key", body).value.trim(); if (k) await api("/api/secret", { name: "agent", value: k });
      await api("/api/ai/setup", { agent_url: $("#ag-url", body).value.trim(), default: "agent" }); Music.blip("coin"); toast("Your agent is plugged in. Hit Test.");
      $("#ai-def", body).value = "agent"; } catch (e) { $("#ai-err", body).textContent = e.message; }
  };
}

// ---------- All integrations (both themes) ----------
PANELS.integrations = async (body) => {
  body.innerHTML = `<p class="tiny">Loading…</p>`;
  const d = await api("/api/integrations");
  const bet = STATUS.me.betting;
  const cats = d.categories.filter(c => bet || c.id !== "betting");
  let cat = "all", q = "";
  body.innerHTML = `<h2>🔌 All integrations</h2>
    <p class="lead">Everything Constable Hoagie connects to, by money category: where it works, how it connects, and what you get.</p>
    <div class="tiny">${Object.entries(d.legend).map(([k, v]) => `<span class="pill grey">${esc(k)}</span> ${esc(v)}`).join(" &nbsp; ")}</div>
    <div class="toggle-row" id="ic-cats"><button class="toggle on" data-c="all">All</button>${cats.map(c => `<button class="toggle" data-c="${c.id}">${esc(c.name)}</button>`).join("")}</div>
    <input type="search" id="ic-q" placeholder="Search: Coinbase, screenshot, free, no key…" style="width:100%">
    <div id="ic-list"></div>`;
  const draw = () => {
    const items = d.items.filter(i => (bet || i.cat !== "betting") && (cat === "all" || i.cat === cat) &&
      (!q || (i.name + i.conn + i.benefit + i.caps.join(" ") + i.status + i.where).toLowerCase().includes(q)));
    $("#ic-list", body).innerHTML = cats.filter(c => items.some(i => i.cat === c.id)).map(c => `<h3>${esc(c.name)}</h3>
      <div class="ic-table"><div class="ic-row ic-h"><span>Integration</span><span>Status</span><span>Works on</span><span>Connection</span><span>What you get</span></div>
      ${items.filter(i => i.cat === c.id).map(i => `<div class="ic-row ${i.connected ? "on" : ""}">
        <span><b>${esc(i.name)}</b>${i.connected ? " ✅" : ""}${i.caps.length ? `<div class="tiny">${i.caps.map(esc).join(" · ")}</div>` : ""}</span>
        <span><span class="pill ${i.status === "Live" ? "" : i.status === "Beta" ? "gold" : "grey"}">${esc(i.status)}</span></span>
        <span>${esc(i.where)}</span><span class="tiny">${esc(i.conn)}</span>
        <span class="tiny">${esc(i.benefit)}${i.link ? ` <a href="${esc(i.link)}" target="_blank" rel="noopener">↗</a>` : ""}</span></div>`).join("")}</div>`).join("") || `<p class="tiny">Nothing matches.</p>`;
  };
  $$("[data-c]", body).forEach(b => b.onclick = () => { cat = b.dataset.c; $$("[data-c]", body).forEach(x => x.classList.toggle("on", x === b)); draw(); });
  $("#ic-q", body).oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  draw();
};
