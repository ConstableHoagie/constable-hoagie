// ZeroCool's The Gibson (admin panel), first-sign-in welcome (briefcase + download), and the password change prompt.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, LOOK */

let ADMIN_CHAT = [];

PANELS.admin = async (body, arg = {}) => {
  if (!STATUS.admin) { body.innerHTML = `<h2>🕶 Admin</h2><p class="lead">Zero Cool access only.</p>`; return; }
  body.innerHTML = `<p class="tiny">Opening the vault…</p>`;
  let d;
  try { d = await api("/api/admin"); } catch (e) { body.innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
  const tab = arg.tab || "overview";
  body.innerHTML = `<h2>🕶 ZeroCool's The Gibson</h2>
    <p class="lead">${esc(d.project)} v${esc(d.version)} · Zero Cool admins only</p>
    <div class="toggle-row" id="ad-tabs">${[["overview", "📋 Overview"], ["sections", "🧩 Sections & effort"], ["people", "👥 People & links"], ["autopatch", "🛠 Autopatch"], ["media", "🎞 Media"], ["chat", "💬 Ask Claude"], ["download", "💼 Download"]]
      .map(([k, l]) => `<button class="toggle ${k === tab ? "on" : ""}" data-t="${k}">${l}</button>`).join("")}</div>
    <div id="ad-pane"></div>`;
  const pane = $("#ad-pane", body);
  const tabs = {
    overview: () => {
      pane.innerHTML = `<div class="dgrid">
          <div class="dcard"><h4>Started</h4><div class="big sm">${esc(d.start_date)}</div></div>
          <div class="dcard"><h4>Revisions</h4><div class="big">${d.revisions.length}</div><div class="tiny">now v${esc(d.version)}</div></div>
          <div class="dcard"><h4>Time spent</h4><div class="tiny">${esc(d.time_spent)}</div></div></div>
        <h3>Revisions</h3><div class="ad-revs">${d.revisions.map(r => `<div><b>v${esc(r.v)}</b> <span class="tiny">${esc(r.date)}</span> · ${esc(r.what)}</div>`).join("")}</div>
        <h3>Working with Claude: overall tips</h3><ul>${d.overall_tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
        <p class="fine">${esc(d.estimate_note)}</p>`;
    },
    sections: () => {
      pane.innerHTML = `<p class="tiny">Each part of the project, the goal it serves, the share of Claude's build effort it took, and how much faster it could have gone, with prompts for next time. ${esc(d.estimate_note)}</p>
        ${d.sections.map(s => `<div class="ad-sec">
          <div class="ad-sec-h"><b>${esc(s.name)}</b><span class="pill grey">${esc(s.category)}</span></div>
          <div class="tiny"><b>Goal:</b> ${esc(s.goal)} · <b>Includes:</b> ${esc(s.includes)}</div>
          <div class="ad-bars"><span>Claude effort</span><span class="fit"><i style="width:${s.effort * 4}%"></i></span><b>${s.effort}%</b>
            <span>Could have saved</span><span class="fit save"><i style="width:${s.could_save}%"></i></span><b>~${s.could_save}%</b></div>
          <div class="tiny"><b>Use Claude better next time:</b><ul>${s.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div></div>`).join("")}`;
    },
    people: () => {
      pane.innerHTML = `<p class="tiny"><b>Zero Cool</b> = god-mode admin (everything, plus this panel). <b>Regular</b> = the shop without keys, settings or admin. A personal sign-in link signs that person straight in; it works like a password, so make a new one (which kills the old) if it leaks.</p>
        ${d.people.map(p => `<div class="ad-person"><b>${esc(p.name)}</b>
          <select data-tier="${esc(p.name)}"><option ${p.tier === "Zero Cool" ? "selected" : ""}>Zero Cool</option><option ${p.tier === "Regular" ? "selected" : ""}>Regular</option></select>
          <span class="tiny">${p.link ? "link made " + esc(p.link) : "no link"}${p.welcomed ? " · first visit " + esc(p.welcomed) : " · hasn't visited yet"}${p.changed ? " · password changed " + esc(p.changed) : ""}</span>
          <label class="tiny"><input type="checkbox" data-bv="${esc(p.name)}" ${p.bet_view ? "checked" : ""}> 🏈 Sports tab</label>
          <button class="btn" data-link="${esc(p.name)}">🔗 New sign-in link</button>${p.link ? `<button class="btn" data-revoke="${esc(p.name)}">Revoke link</button>` : ""}
          <div class="ad-linkout" id="lo-${esc(p.name.toLowerCase())}"></div></div>`).join("") || `<p class="tiny">No accounts yet. Add them at the Connect counter.</p>`}`;
      $$("[data-tier]", pane).forEach(sel => sel.onchange = async () => { try { await api("/api/admin/tier", { user: sel.dataset.tier, tier: sel.value }); toast(sel.dataset.tier + " is now " + sel.value); } catch (e) { toast(e.message); } });
      $$("[data-link]", pane).forEach(b => b.onclick = async () => {
        const r = await api("/api/admin/link", { user: b.dataset.link });
        const web = "https://beta.constablehoagie.com" + r.path, here = d.base_url + r.path;
        $("#lo-" + b.dataset.link.toLowerCase(), pane).innerHTML = `<div class="conn done tiny">Website: <code>${esc(web)}</code> <button class="btn" data-copy="${esc(web)}">Copy</button><br>
          This address: <code>${esc(here)}</code> <button class="btn" data-copy="${esc(here)}">Copy</button><br>Shown once. The old link stopped working.</div>`;
        $$("[data-copy]", pane).forEach(c => c.onclick = () => navigator.clipboard.writeText(c.dataset.copy).then(() => toast("Copied")));
      });
      $$("[data-bv]", pane).forEach(c => c.onchange = async () => { await api("/api/admin/prefs", { user: c.dataset.bv, bet_view: c.checked }); toast("Sports tab " + (c.checked ? "on" : "off") + " for " + c.dataset.bv); });
      $$("[data-revoke]", pane).forEach(b => b.onclick = async () => { await api("/api/admin/revoke", { user: b.dataset.revoke }); toast("Link revoked"); openPanel("admin", { tab: "people" }); });
    },
    autopatch: async () => {
      pane.innerHTML = `<p class="tiny">Checking GitHub…</p>`;
      let a;
      try { a = await api("/api/admin/autopatch"); } catch (e) { pane.innerHTML = `<p class="neg">${esc(e.message)}</p>`; return; }
      const c = a.config, k = a.check || {}, n = a.notify;
      const step = (ok, t, d) => `<div class="ap-step ${ok ? "ok" : ""}"><b>${ok ? "✅" : "⬜"} ${t}</b><div class="tiny">${d}</div></div>`;
      pane.innerHTML = `<p class="tiny">When a <b>new</b> error keeps happening (${c.threshold}× in 24 h), the app files a scrubbed GitHub issue (no keys, emails, amounts or personal data). Claude drafts the smallest fix plus a test in GitHub Actions; if the tests pass you get a pull request to approve here. Approving merges it and publishes a release, and every install updates within ~6 hours (one-click Roll back). At most ${c.daily_cap} reports a day.</p>
        <h3>🧑‍⚖️ Claude's fixes waiting for you</h3>
        ${a.pulls_error ? `<p class="neg tiny">${esc(a.pulls_error)}</p>` : ""}
        ${a.pulls.length ? a.pulls.map(p => `<div class="ap-pr"><div><b>#${p.number} ${esc(p.title)}</b> ${p.hold ? `<span class="pill" style="background:#d93f0b;color:#fff">⚠️ protected files</span>` : ""}<div class="tiny">${esc(p.created)} · <a href="${esc(p.url)}" target="_blank" rel="noopener">review the diff on GitHub ↗</a></div>
            <details><summary class="tiny">Claude's summary</summary><pre class="snip">${esc(p.body)}</pre></details></div>
            <div class="row"><button class="btn go" data-ok="${p.number}">✅ Approve &amp; release</button><button class="btn" data-no="${p.number}">❌ Reject</button></div></div>`).join("")
          : `<p class="tiny">Nothing waiting. 🥪</p>`}
        <h3>🔔 My notifications</h3>
        <div class="conn"><p class="tiny">Your own stream: get a heads-up when a bug goes to Claude, when Claude drafts a fix, and when a fix is released.</p>
          <label class="row tiny"><input type="checkbox" id="nf-em" ${n.email_on ? "checked" : ""}> Email me at <input type="email" id="nf-addr" value="${esc(n.email)}" placeholder="you@example.com" style="flex:1"></label>
          <label class="row tiny"><input type="checkbox" id="nf-dc" ${n.discord_on ? "checked" : ""}> Post to my Discord channel ${n.discord_set ? "(webhook saved ✔)" : ""} <input type="password" id="nf-hook" placeholder="${n.discord_set ? "paste a new webhook to replace" : "https://discord.com/api/webhooks/…"}" style="flex:1"></label>
          <div class="row tiny">${[["bug", "🐞 bug sent to Claude"], ["fix", "🛠 fix ready"], ["released", "✅ released"]].map(([v, l]) => `<label><input type="checkbox" data-ev="${v}" ${n.events.includes(v) ? "checked" : ""}> ${l}</label>`).join(" ")}</div>
          <div class="row"><button class="btn go" id="nf-save">Save</button><button class="btn" id="nf-test">Send a test</button><span id="nf-msg" class="tiny"></span></div>
          <p class="fine">Discord: Server settings › Integrations › Webhooks › New webhook › Copy URL. Email uses the shop's Gmail/Brevo setup from the Email counter.</p></div>
        <h3>⚙ Setup</h3>
        ${step(!!k.repo, "1. GitHub repo", k.repo ? `Using <code>${esc(k.repo)}</code>${k.private === false ? " · public: reports are scrubbed, but consider a private repo" : ""}` : "Run Publish Update once (it creates the repo), or type owner/name below.")}
        ${step(a.workflows, "2. Workflows in the repo", "<code>.github/workflows/autopatch.yml</code>, <code>release.yml</code> and <code>tests.yml</code> ship with the app; Publish Update pushes them.")}
        ${step(false, "3. Connect Claude to the repo (once)", "In a terminal in the project folder: <code>claude</code> then <code>/install-github-app</code>. Pick the subscription token. Or add a repo secret <code>CLAUDE_CODE_OAUTH_TOKEN</code> (from <code>claude setup-token</code>) or <code>ANTHROPIC_API_KEY</code>.")}
        ${step(k.token && k.reachable, "4. GitHub token for the app", k.reachable ? "Connected ✔" : (k.error ? esc(k.error) : "Fine-grained token for this repo: Issues, Pull requests and Contents read/write, plus Variables read/write. github.com › Settings › Developer settings › Fine-grained tokens."))}
        ${step(c.on, "5. Turn on error reports", c.on ? "On" : "Off")}
        <div class="conn"><div class="row"><input type="text" id="ap-repo" value="${esc(c.repo || "")}" placeholder="owner/constable-hoagie" style="flex:1"><input type="password" id="ap-tok" placeholder="${k.token ? "token saved (paste to replace)" : "github_pat_…"}" style="flex:1"></div>
          <div class="row tiny"><label><input type="checkbox" id="ap-on" ${c.on ? "checked" : ""}> Send error reports</label>
            <label>Repeat threshold <input type="number" id="ap-th" min="1" max="20" value="${c.threshold}" style="width:60px"></label>
            <label title="Small (≤60 lines, ≤4 files), passing fixes that don't touch logins, keys, trading, the updater or setup merge and release on their own. Reports from other people's copies always wait."><input type="checkbox" id="ap-am" ${k.automerge ? "checked" : ""}> Auto-release small, low-risk fixes</label></div>
          <div class="row"><button class="btn go" id="ap-save">Save setup</button><span id="ap-msg" class="tiny"></span></div></div>
        <h3>🐞 Recent errors (${a.filed_today} sent today)</h3>
        <div class="tiny">${a.errors.length ? a.errors.map(e => `<div class="ap-err"><b>${esc(e.kind)}</b> · ${esc((e.message || "").slice(0, 140))} <span class="pill grey">×${e.count}</span>
          ${e.issue && e.issue.url ? `<a href="${esc(e.issue.url)}" target="_blank" rel="noopener">issue #${e.issue.number}</a>` : e.issue && e.issue.forwarded ? "sent to the owner's shop" : e.held ? esc(e.held) : e.error ? `<span class="neg">${esc(e.error)}</span>` : "watching"} <span class="tiny">last ${esc(e.last || "")}</span></div>`).join("") : "No errors recorded. Nice."}</div>`;
      const say2 = (id, t) => { $(id, pane).textContent = t; };
      $$("[data-ok]", pane).forEach(b => b.onclick = async () => { if (!confirm("Merge #" + b.dataset.ok + " and release it to everyone?")) return;
        try { const r = await api("/api/admin/autopatch/approve", { number: +b.dataset.ok }); toast(r.merged ? "Merged. Releasing now 🚀" : (r.message || "Couldn't merge")); tabs.autopatch(); } catch (e) { toast(e.message); } });
      $$("[data-no]", pane).forEach(b => b.onclick = async () => { const why = prompt("Why reject? (optional, goes on the PR)") ?? null; if (why === null) return;
        try { await api("/api/admin/autopatch/reject", { number: +b.dataset.no, reason: why }); toast("Rejected"); tabs.autopatch(); } catch (e) { toast(e.message); } });
      $("#nf-save", pane).onclick = async () => { try {
        const body = { email: $("#nf-addr", pane).value, email_on: $("#nf-em", pane).checked, discord_on: $("#nf-dc", pane).checked, events: $$("[data-ev]", pane).filter(x => x.checked).map(x => x.dataset.ev) };
        if ($("#nf-hook", pane).value.trim()) body.discord_url = $("#nf-hook", pane).value.trim();
        await api("/api/admin/autopatch/notify", body); say2("#nf-msg", "Saved ✔"); } catch (e) { say2("#nf-msg", e.message); } };
      $("#nf-test", pane).onclick = async () => { try { const r = await api("/api/admin/autopatch/notify/test", {}); say2("#nf-msg", "Sent: " + r.sent.join(" + ")); } catch (e) { say2("#nf-msg", e.message); } };
      $("#ap-save", pane).onclick = async () => { try {
        const body = { on: $("#ap-on", pane).checked, repo: $("#ap-repo", pane).value, threshold: +$("#ap-th", pane).value };
        if ($("#ap-tok", pane).value.trim()) body.token = $("#ap-tok", pane).value.trim();
        if (k.reachable || body.token) body.automerge = $("#ap-am", pane).checked;
        await api("/api/admin/autopatch", body); say2("#ap-msg", "Saved ✔"); setTimeout(tabs.autopatch, 600); } catch (e) { say2("#ap-msg", e.message); } };
    },
    media: () => {
      const tiles = [["tv", "▶ Website intro video", "Original look · pause + skip"], ["dark", "🌃 The 3 A.M. Bread Bank Job", "Dark Humor intro"],
        ["case", "💼 The gold briefcase", "Admin first sign-in"], ["g1", "🌻 Alison: Garden day", "Original"], ["g2", "🌙 Alison: Kiwi's war on the garden", "Dark Humor"],
        ["intro", "🥪 Hoagie's welcome", "The shop walkthrough"], ["tour", "🧭 Guided tour", "Practice data"], ["pick", "🎨 Look picker", "Original vs Dark Humor"]];
      pane.innerHTML = `<p class="tiny">Every short, intro and character, plus screenshots of every version. The same library ships in the project download as <code>media/</code> (open <code>media/player.html</code> offline).</p>
        <div class="me-grid">${tiles.map(([k, t, d]) => `<button class="me-tile" data-m="${k}"><b>${t}</b><span>${d}</span></button>`).join("")}</div>
        <div class="row"><a class="btn gold" href="/media/player.html" target="_blank">🎞 Open the full media library</a><a class="btn" href="/api/admin/project.zip">⬇ Project download (includes media/)</a></div>
        <h3>Characters</h3><div class="me-grid">${["hoagie-original", "hoagie-neon", "kiwi", "alison-original", "alison-dark"].map(c => `<a class="me-tile" href="/media/characters/${c}.svg" target="_blank" download><img src="/media/characters/${c}.svg" alt="${c}" style="height:120px;object-fit:contain"><span>${c}.svg</span></a>`).join("")}</div>`;
      const go = {
        tv: () => LOOK.tourVideo(), dark: () => LOOK.intro(), pick: () => LOOK.choose(() => {}),
        case: () => LOOK.briefcase({ title: "It's the whole project.", html: "Download it below, or close the case.", download: "/api/admin/project.zip", laterLabel: "Close the case" }),
        g1: () => SHORTS.garden("original", { closeLabel: "Done" }), g2: () => SHORTS.garden("dark", { closeLabel: "Done" }),
        intro: () => playIntro({ replay: true }), tour: () => startTour(false),
      };
      $$("[data-m]", pane).forEach(b => b.onclick = () => { closePanel(); go[b.dataset.m](); });
    },
    chat: () => {
      pane.innerHTML = `<p class="tiny">Ask Claude anything about the app and how it was built: features, files, decisions, how to change something. It answers from the project notes, CLAUDE.md and the app's own source, using the Claude login on the PC running this shop${STATUS.remote ? " (ConstableHoagie's PC)" : ""}.</p>
        <div id="ad-log" class="ad-log">${ADMIN_CHAT.map(m => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join("") || `<div class="msg them">Hey${STATUS.account ? " " + esc(STATUS.account.name) : ""}! Ask me how anything in Constable Hoagie works or was made. Try: “How does the Bet Tracker get live scores?” or “How do I publish an update?”</div>`}</div>
        <form id="ad-form" class="row"><input id="ad-q" placeholder="Ask about the app…" maxlength="1500" autocomplete="off" style="flex:1"><button class="btn go">Send</button></form>`;
      const log = $("#ad-log", pane); log.scrollTop = log.scrollHeight;
      $("#ad-form", pane).onsubmit = async ev => {
        ev.preventDefault(); const q = $("#ad-q", pane).value.trim(); if (!q) return;
        ADMIN_CHAT.push({ who: "me", text: q }); $("#ad-q", pane).value = "";
        log.innerHTML += `<div class="msg me">${esc(q)}</div><div class="msg them typing">Claude is reading the project…</div>`; log.scrollTop = log.scrollHeight;
        try { const r = await api("/api/admin/chat", { question: q, history: ADMIN_CHAT.slice(0, -1) }); ADMIN_CHAT.push({ who: "them", text: r.answer }); }
        catch (e) { ADMIN_CHAT.push({ who: "them", text: "⚠️ " + e.message }); }
        tabs.chat();
      };
    },
    download: () => {
      pane.innerHTML = `<div class="conn"><h4>💼 The Constable Hoagie Project</h4>
        <p class="tiny">One zip with the animated HTML readme, a plain Markdown readme, the full guide, the Claude project file (CLAUDE.md, with workflows), the docs and build logs, and the whole app source. No accounts, keys, sign-in links or personal data inside.</p>
        <div class="row"><button class="btn gold" id="ad-case">✨ Open the case</button><a class="btn" href="/api/admin/project.zip">⬇ Just download</a></div></div>`;
      $("#ad-case", pane).onclick = () => { closePanel(); playCase(); };
    },
  };
  $$("[data-t]", body).forEach(b => b.onclick = () => { $$("[data-t]", body).forEach(x => x.classList.toggle("on", x === b)); tabs[b.dataset.t](); });
  tabs[tab]();
};

function playCase(done) {
  const who = STATUS.account ? STATUS.account.name : "Zero Cool";
  LOOK.briefcase({
    title: `${who}, it's the whole project.`,
    html: `The app, the website code, the readmes, the Claude project file and every workflow that built it. Download it, unzip it, and double-click <b>Start Constable Hoagie</b> to run your own copy.`,
    download: "/api/admin/project.zip", laterLabel: "Close the case", done,
  });
}

// ---- password change (offered on first sign-in) ----
PANELS.password = (body, arg = {}) => {
  const a = STATUS.account || {};
  body.innerHTML = `<h2>🔑 Change your password?</h2>
    <p class="lead">${a.temp_password ? `You signed in with your personal link. Your current password is <code class="pw">${esc(a.temp_password)}</code>. Keep it, or pick your own now.` : "Pick a new password (10+ characters)."}</p>
    <label class="field">New password<input type="password" id="pw1" autocomplete="new-password"></label>
    <label class="field">Type it again<input type="password" id="pw2" autocomplete="new-password"></label>
    <div id="pw-err" class="tiny neg"></div>
    <div class="row"><button class="btn go" id="pw-go">Change it</button><button class="btn" id="pw-keep">Keep my current password</button></div>
    <p class="fine">Changing it signs you out on other devices. Your sign-in link keeps working until an admin makes a new one.</p>`;
  const done = () => { closePanel(); if (arg.done) arg.done(); };
  $("#pw-go").onclick = async () => {
    const a1 = $("#pw1").value, a2 = $("#pw2").value;
    if (a1 !== a2) { $("#pw-err").textContent = "Those don't match."; return; }
    try { await api("/api/account/password", { new: a1 }); toast("Password changed ✔"); if (STATUS.account) { STATUS.account.temp_password = null; STATUS.account.suggest_change = false; } done(); }
    catch (e) { $("#pw-err").textContent = e.message; }
  };
  $("#pw-keep").onclick = async () => { try { await api("/api/account/skip", {}); } catch (e) { /* ignore */ } done(); };
};

// ---- first sign-in: briefcase (admins) then the password offer ----
async function runWelcome() {
  const a = STATUS.account;
  if (!a) return false;
  const next = () => { if (!STATUS.me.intro_seen && window.firstPass) setTimeout(firstPass, 400); };
  const pw = () => (a.suggest_change ? openPanel("password", { done: next }) : next());
  if (a.first_login) {
    try { await api("/api/account/welcomed", {}); } catch (e) { /* ignore */ }
    if (STATUS.admin) { playCase(pw); return true; }
    say(`Welcome to the shop, ${esc(a.name)}! 🥪`, [], 7000);
  }
  if (a.suggest_change) { pw(); return true; }
  return false;   // nothing shown: the normal first pass carries on
}
window.runWelcome = runWelcome;
window.playCase = playCase;
