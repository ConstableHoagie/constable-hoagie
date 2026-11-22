// 👤 Me: your account, your look, replays of every intro/tour/short.  🏈 Sports: games + Bet Tracker for money-only feeds.
/* global PANELS, $, $$, esc, LS, say, Music, toast, api, STATUS, openPanel, closePanel, LOOK, SHORTS, THEME, playIntro, startTour, switchTheme, gameCard */

PANELS.me = (body) => {
  const a = STATUS.account, me = STATUS.me;
  body.innerHTML = `<h2>👤 ${a ? esc(a.name) : "Me"}</h2>
    <p class="lead">${a ? `Tier: <b>${esc(a.tier)}</b>` : `Tier: <b>${esc(STATUS.tier || "Owner (this PC)")}</b>`} · Look: <b>${THEME === "neon" ? "Dark Humor" : "Original"}</b>
      · Feed: <b>${me.feed === "bright" ? "Bright side (good news first)" : me.betting ? "Full menu" : "Money only"}${me.bet_view ? " + 🏈 Sports tab" : ""}</b></p>
    <h3>🎬 Watch again</h3>
    <div class="me-grid">
      ${me.videos === "alison" ? `<button class="me-tile" data-v="g-orig"><b>🌻 Garden day</b><span>Original · Kiwi helps</span></button>
        <button class="me-tile" data-v="g-dark"><b>🌙 Kiwi's war on the garden</b><span>Dark Humor</span></button>` : ""}
      <button class="me-tile" data-v="intro"><b>🥪 Hoagie's welcome</b><span>The shop walkthrough</span></button>
      <button class="me-tile" data-v="tour"><b>🧭 Guided tour</b><span>With practice data</span></button>
      <button class="me-tile" data-v="video"><b>▶ Website intro video</b><span>Original look</span></button>
      <button class="me-tile" data-v="dark"><b>🌃 Dark Humor intro</b><span>The 3 A.M. Bread Bank Job</span></button>
    </div>
    <h3>⚙ Settings</h3>
    <div class="row"><button class="btn" id="me-look">🎨 Switch to ${THEME === "neon" ? "Original" : "Dark Humor"}</button>
      ${a ? `<button class="btn" id="me-pw">🔑 Change password</button>` : ""}<button class="btn" id="me-ai">🧠 AI brain / my own agent</button><button class="btn" id="me-dash">📊 Customize dashboard</button></div>
    <p class="fine">Nothing here replays by itself: the intro and tour only play automatically on your very first visit.</p>`;
  const act = {
    "g-orig": () => { closePanel(); SHORTS.garden("original", { closeLabel: "Done" }); },
    "g-dark": () => { closePanel(); SHORTS.garden("dark", { closeLabel: "Done" }); },
    intro: () => { closePanel(); playIntro({ replay: true }); },
    tour: () => { closePanel(); startTour(false); },
    video: () => { closePanel(); LOOK.tourVideo(); },
    dark: () => { closePanel(); LOOK.intro(); },
  };
  $$("[data-v]", body).forEach(b => b.onclick = () => act[b.dataset.v]());
  $("#me-look", body).onclick = switchTheme;
  if ($("#me-pw", body)) $("#me-pw", body).onclick = () => openPanel("password", {});
  $("#me-ai", body).onclick = () => openPanel("aisetup");
  $("#me-dash", body).onclick = () => openPanel("dashsetup");
};

PANELS.sports = async (body) => {
  body.innerHTML = `<h2>🏈 Sports</h2><p class="tiny">Loading today's games…</p>`;
  let d;
  try { d = await api("/api/sports"); } catch (e) { body.innerHTML = `<h2>🏈 Sports</h2><p class="neg">${esc(e.message)}</p>`; return; }
  if (d.off) { body.innerHTML = `<h2>🏈 Sports</h2><p class="lead">The Sports tab isn't switched on for your account.</p>`; return; }
  const list = d.games || [];
  body.innerHTML = `<h2>🏈 Sports</h2>
    <p class="lead">Your feed stays money-only; this tab is where the sports betting info lives. Games with posted prices for the next day and a half, plus your Bet Tracker.</p>
    <div class="row"><button class="btn gold" id="sp-bets">🎟 Open my Bet Tracker</button></div>
    ${list.length ? list.map(gameCard).join("") : `<p class="tiny">No games with posted prices right now. Check back closer to game time.</p>`}
    <p class="fine">💎 Price edge = a sportsbook paying more than the fair price. 🧭 Market lean = no edge. Both can lose. If betting stops being fun, call or text 1-800-GAMBLER.</p>`;
  $("#sp-bets", body).onclick = () => openPanel("bets");
};
