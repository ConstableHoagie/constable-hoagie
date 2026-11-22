// First-visit look picker (Original vs Dark Humor), the Dark Humor intro short, and the gold-briefcase short.
// Shared by the sign-in page and the shop. All art, jokes and music here are original.
/* global ART */
(function () {
  const KEY = "hoagie-look";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `
  .lk-ov{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(10,4,24,.72);backdrop-filter:blur(4px);padding:16px;font-family:Nunito,Inter,system-ui,sans-serif}
  .lk-box{width:min(860px,96vw);display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .lk-h{grid-column:1/-1;text-align:center;color:#fff;font:900 30px/1.1 Nunito,system-ui;margin:0 0 4px;text-shadow:0 3px 0 #000}
  .lk-sub{grid-column:1/-1;text-align:center;color:#e8e2ff;margin:0 0 6px;font-weight:700}
  .lk-card{border-radius:24px;padding:18px;cursor:pointer;border:4px solid #2b1d14;transition:transform .15s;display:flex;flex-direction:column;gap:8px;text-align:left}
  .lk-card:hover{transform:translateY(-4px) rotate(-.5deg)}
  .lk-card .art{height:170px;display:flex;align-items:flex-end;justify-content:center;gap:8px}.lk-card .art svg{height:100%;width:auto}
  .lk-card b{font:900 24px Nunito,system-ui}.lk-card span{font-weight:700;font-size:15px}
  .lk-orig{background:linear-gradient(#bfe6ff,#fff3dc);color:#2b1d14}
  .lk-dark{background:radial-gradient(circle at 30% 20%,#3a136b,#0d0620 70%);color:#f3eaff;border-color:#ff3df2;box-shadow:0 0 24px rgba(255,61,242,.5)}
  .lk-dark b{color:#3df5ff;text-shadow:0 0 10px rgba(61,245,255,.7)}
  .lk-btn{margin-top:auto;border-radius:14px;padding:10px;font:900 18px Nunito,system-ui;text-align:center;border:3px solid currentColor}
  .lk-fine{grid-column:1/-1;text-align:center;color:#cfc6ef;font-size:13px}
  @media(max-width:700px){.lk-box{grid-template-columns:1fr}.lk-card .art{height:110px}}
  .sh{position:fixed;inset:0;z-index:210;background:#05010d;overflow:hidden;color:#e9fff7;font-family:"Courier New",monospace}
  .sh .skip{position:absolute;right:16px;top:14px;z-index:5;background:rgba(255,255,255,.08);color:#fff;border:2px solid #ff3df2;border-radius:12px;padding:8px 14px;font:800 15px Nunito,system-ui;cursor:pointer}
  .sh .beat{position:absolute;inset:0;opacity:0;transition:opacity .6s;display:grid;place-items:center}.sh .beat.on{opacity:1}
  .sh .term{font-size:clamp(16px,2.4vw,26px);line-height:1.6;color:#39ff9c;text-shadow:0 0 8px rgba(57,255,156,.7);white-space:pre;min-width:min(720px,90vw)}
  .sh .city{position:absolute;inset:auto 0 0 0;height:55%;background:repeating-linear-gradient(90deg,#120a2a 0 40px,#0a0518 40px 46px);
    mask:linear-gradient(transparent,#000 30%);animation:pan 18s linear infinite}
  .sh .city::after{content:"";position:absolute;inset:0;background:radial-gradient(2px 2px at 20% 30%,#ffd84a,transparent),radial-gradient(2px 2px at 60% 50%,#3df5ff,transparent),radial-gradient(2px 2px at 80% 20%,#ff3df2,transparent);background-size:120px 90px}
  @keyframes pan{to{background-position:-460px 0}}
  .sh .rig{position:relative;display:flex;align-items:flex-end;gap:2vw;height:62vh}
  .sh .rig .hg{height:100%}.sh .rig .hg svg{height:100%;width:auto;filter:drop-shadow(0 0 18px rgba(61,245,255,.5))}
  .sh .crt{width:min(420px,40vw);aspect-ratio:4/3;background:#020a06;border:10px solid #2a2140;border-radius:18px;box-shadow:0 0 40px rgba(57,255,156,.45),inset 0 0 40px rgba(57,255,156,.25);
    padding:14px;font-size:clamp(11px,1.4vw,17px);color:#39ff9c;overflow:hidden;white-space:pre-wrap;position:relative}
  .sh .crt::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(transparent 0 3px,rgba(0,0,0,.25) 3px 4px);pointer-events:none}
  .sh .kw{position:absolute;bottom:4vh;right:8vw;height:18vh;transition:transform 1.2s}.sh .kw svg{height:100%;width:auto}
  .sh .cap{position:absolute;left:50%;bottom:6vh;transform:translateX(-50%);width:min(820px,92vw);text-align:center;font:900 clamp(18px,2.6vw,30px)/1.25 Nunito,system-ui;color:#fff;text-shadow:0 0 12px #ff3df2,0 3px 0 #000}
  .sh .title{text-align:center;font:900 clamp(34px,6vw,76px)/1 Nunito,system-ui;color:#3df5ff;text-shadow:0 0 18px #3df5ff,0 0 40px #ff3df2}
  .sh .title small{display:block;margin-top:14px;font:800 clamp(14px,2vw,20px) Nunito,system-ui;color:#f3eaff;text-shadow:none}
  .sh .glitch{animation:glitch .25s steps(2) infinite}@keyframes glitch{50%{transform:translate(2px,-1px) skewX(4deg);filter:hue-rotate(60deg)}}
  .bc-light{position:absolute;inset:0;background:radial-gradient(circle at 50% 62%,rgba(255,216,74,.0),transparent 40%);transition:background 1.4s}
  .bc-light.open{background:radial-gradient(circle at 50% 60%,rgba(255,216,74,.85),rgba(255,160,0,.25) 30%,transparent 62%)}
  .bc-case{position:absolute;left:50%;bottom:18vh;transform:translateX(-50%);width:min(380px,60vw)}
  .bc-lid{transform-origin:50% 100%;transition:transform 1.2s cubic-bezier(.3,1.4,.5,1)}.bc-case.open .bc-lid{transform:rotateX(70deg) translateY(-6px) scaleY(.35)}
  .bc-face{position:absolute;left:8vw;bottom:10vh;height:46vh;transition:filter 1.4s}.bc-face svg{height:100%;width:auto}.bc-face.gold{filter:sepia(1) saturate(4) brightness(1.15) drop-shadow(0 0 30px #ffd84a)}
  .bc-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.6);opacity:0;transition:all .8s;width:min(520px,92vw);background:#140b2a;border:3px solid #ffd84a;border-radius:22px;
    padding:22px;color:#f3eaff;font-family:Nunito,system-ui;box-shadow:0 0 40px rgba(255,216,74,.6);text-align:center}
  .bc-card.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
  .bc-card h2{margin:0 0 6px;color:#ffd84a;font:900 28px Nunito,system-ui}.bc-card a,.bc-card button{display:inline-block;margin:8px 4px 0;padding:12px 18px;border-radius:14px;font:900 17px Nunito,system-ui;cursor:pointer;text-decoration:none}
  .bc-card .dl{background:#ffd84a;color:#140b2a;border:0}.bc-card .later{background:transparent;color:#f3eaff;border:2px solid #6d5aa8}
  `;
  function addCss() { if (document.getElementById("lk-css")) return; const s = document.createElement("style"); s.id = "lk-css"; s.textContent = css; document.head.appendChild(s); }
  function get() {
    let v = null; try { v = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (!v) { const m = document.cookie.match(/(?:^|; )hoagie_look=(original|dark)/); v = m ? m[1] : null; }
    return v === "original" || v === "dark" ? v : null;
  }
  function set(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ }
    document.cookie = "hoagie_look=" + v + "; Path=/; Max-Age=31536000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }
  const hoagie = () => (ART.NEON && ART.NEON.hoagie ? ART.NEON.hoagie() : ART.toon(ART.HOAGIE));

  // ---------- tiny synth (original) ----------
  let ac = null;
  function synth(kind) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + 0.05, out = ac.createGain(); out.gain.value = 0.18; out.connect(ac.destination);
      const note = (f, t, d, type = "sawtooth", g = 0.25) => { const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.value = f;
        v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(v); v.connect(out); o.start(t); o.stop(t + d + 0.02); };
      const kick = t => { const o = ac.createOscillator(), v = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        v.gain.setValueAtTime(0.9, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(v); v.connect(out); o.start(t); o.stop(t + 0.22); };
      if (kind === "heist") {          // 132 bpm, minor arpeggio + four-on-the-floor, ~24 s
        const step = 60 / 132 / 4, arp = [220, 261.6, 329.6, 392, 329.6, 261.6, 196, 246.9];
        for (let i = 0; i < 24 / step; i++) { const t = t0 + i * step; note(arp[i % 8] * (i % 64 < 32 ? 1 : 0.89), t, step * 0.9, "sawtooth", 0.12); if (i % 4 === 0) kick(t); if (i % 16 === 8) note(110, t, step * 6, "square", 0.08); }
      } else if (kind === "case") {    // latch clicks, then a warm swell
        note(1800, t0, 0.04, "square", 0.3); note(1700, t0 + 0.25, 0.04, "square", 0.3);
        [261.6, 329.6, 392, 523.2].forEach((f, i) => note(f, t0 + 1.1 + i * 0.08, 3.2, "triangle", 0.16));
      }
      return out;
    } catch (e) { return null; }
  }
  function hush(g) { try { if (g) { g.gain.setTargetAtTime(0, ac.currentTime, 0.2); } } catch (e) { /* ignore */ } }

  // ---------- Dark Humor intro: "The 3 A.M. Bread Bank Job" (original) ----------
  function intro(done) {
    addCss();
    const el = document.createElement("div"); el.className = "sh";
    el.innerHTML = `<button class="skip">Skip ▶▶</button>
      <div class="beat b1"><div class="term" id="sh-t1"></div></div>
      <div class="beat b2"><div class="city"></div><div class="rig"><div class="hg">${hoagie()}</div><div class="crt" id="sh-crt"></div></div>
        <div class="kw" id="sh-kw">${ART.kiwi || ""}</div><div class="cap" id="sh-cap"></div></div>
      <div class="beat b3"><div class="title glitch">CONSTABLE HOAGIE<small>DARK HUMOR EDITION · 18+<br>Edgy jokes, betting talk, beer runs and questionable cats. No nudity. Just numbers.</small></div></div>`;
    document.body.appendChild(el);
    const g = synth("heist"), timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const beat = n => el.querySelectorAll(".beat").forEach((b, i) => b.classList.toggle("on", i === n - 1));
    const typeInto = (node, text, speed = 28) => { let i = 0; const iv = setInterval(() => { node.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(iv); }, speed); timers.push(iv); };
    const end = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); hush(g); el.remove(); if (done) done(); };
    el.querySelector(".skip").onclick = end;
    beat(1);
    typeInto(el.querySelector("#sh-t1"), "> CONSTABLE HOAGIE // NIGHT SHIFT\n> 03:00 AM. Coffee: cold. Morals: flexible.\n> TARGET ........ FIRST NATIONAL BANK OF BREAD\n> OBJECTIVE ..... protect & serve your dough\n> METHOD ........ extremely legal (probably)");
    at(6200, () => { beat(2); typeInto(el.querySelector("#sh-crt"), "LOGIN: hoagie\nPASSWORD: ********\n> password123 ........ DENIED\n> sandwich ........... DENIED\n> extra_pickles ...... DENIED\n", 22); });
    at(8600, () => { el.querySelector("#sh-cap").textContent = "\"I've cracked tougher crusts than this.\""; });
    at(11400, () => { const k = el.querySelector("#sh-kw"); k.style.transform = "translateX(-32vw)"; el.querySelector("#sh-cap").textContent = "*Kiwi walks across the keyboard*"; });
    at(13200, () => { el.querySelector("#sh-crt").textContent += "> kkkkkkkkkkkkkkkkk;;;;'''\n\n   ACCESS GRANTED\n   welcome back, KIWI"; el.querySelector("#sh-crt").classList.add("glitch"); });
    at(14600, () => { el.querySelector("#sh-cap").textContent = "The cat has more clearance than you. She will not be explaining how."; });
    at(17600, () => { el.querySelector("#sh-cap").textContent = "\"We're in. Nobody panic. Especially the stock market.\""; });
    at(20200, () => beat(3));
    at(24500, end);
  }

  // ---------- The gold briefcase (original) ----------
  function briefcase(opts) {
    addCss();
    const el = document.createElement("div"); el.className = "sh";
    el.innerHTML = `<button class="skip">Skip ▶▶</button><div class="bc-light" id="bc-l"></div>
      <div class="bc-face" id="bc-f">${hoagie()}</div>
      <svg class="bc-case" id="bc-c" viewBox="0 0 300 200" aria-hidden="true">
        <rect x="20" y="70" width="260" height="120" rx="14" fill="#2b1d14" stroke="#000" stroke-width="5"/>
        <rect x="30" y="80" width="240" height="100" rx="10" fill="#3a2a1c"/>
        <g class="bc-lid"><rect x="20" y="40" width="260" height="40" rx="12" fill="#3b2a1c" stroke="#000" stroke-width="5"/>
          <rect x="120" y="22" width="60" height="22" rx="8" fill="none" stroke="#000" stroke-width="7"/>
          <rect x="60" y="66" width="22" height="14" rx="3" fill="#ffd84a" stroke="#000" stroke-width="3"/><rect x="218" y="66" width="22" height="14" rx="3" fill="#ffd84a" stroke="#000" stroke-width="3"/></g>
      </svg>
      <div class="cap" id="bc-cap">So... what's in the case?</div>
      <div class="bc-card" id="bc-card"><h2>${esc(opts.title || "It's everything.")}</h2><p>${opts.html || ""}</p>
        ${opts.download ? `<a class="dl" href="${esc(opts.download)}" download>⬇ Download the Constable Hoagie Project</a>` : ""}
        <button class="later" id="bc-later">${esc(opts.laterLabel || "Later")}</button></div>`;
    document.body.appendChild(el);
    const g = synth("case"), timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const end = () => { timers.forEach(clearTimeout); hush(g); el.remove(); if (opts.done) opts.done(); };
    el.querySelector(".skip").onclick = () => { timers.forEach(clearTimeout); show(); };
    const show = () => { el.querySelector("#bc-card").classList.add("on"); el.querySelector("#bc-cap").textContent = ""; el.querySelector("#bc-c").style.opacity = ".25"; };
    at(1100, () => { el.querySelector("#bc-c").classList.add("open"); el.querySelector("#bc-l").classList.add("open"); el.querySelector("#bc-f").classList.add("gold"); });
    at(2600, () => { el.querySelector("#bc-cap").textContent = "*golden glow intensifies*"; });
    at(4600, () => { el.querySelector("#bc-cap").textContent = "\"Oh. Oh, that's beautiful.\""; });
    at(6600, show);
    el.querySelector("#bc-later").onclick = end;
    el.querySelectorAll(".dl").forEach(a => a.addEventListener("click", () => setTimeout(end, 800)));
  }

  // ---------- the picker ----------
  function choose(done) {
    addCss();
    const ov = document.createElement("div"); ov.className = "lk-ov";
    ov.innerHTML = `<div class="lk-box"><h2 class="lk-h">Pick your shop</h2><p class="lk-sub">Same money tools either way. Change it anytime with the 🎨 button.</p>
      <div class="lk-card lk-orig" data-v="original"><div class="art">${ART.toon(ART.HOAGIE)}${ART.kiwi || ""}</div><b>🥪 Original</b>
        <span>Light, fluffy and friendly. Bright colors, gentle jokes, family-friendly. Great for kids and anyone who likes their sandwiches wholesome.</span><div class="lk-btn">Keep it sunny</div></div>
      <div class="lk-card lk-dark" data-v="dark"><div class="art">${hoagie()}</div><b>🌃 Dark Humor (18+)</b>
        <span>Mature humor for grown-ups: edgy jokes, betting talk, beer runs and a cat with a criminal record. No nudity, just numbers and bad decisions.</span><div class="lk-btn">Lights off, jokes on</div></div>
      <p class="lk-fine">Your pick is saved in this browser and, once you sign in, in your account.</p></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll("[data-v]").forEach(c => c.onclick = () => {
      const v = c.dataset.v; set(v); ov.remove();
      if (v === "dark") intro(() => done && done(v)); else if (done) done(v);
    });
  }
  // ---------- the public intro video: an Original-look tour of the shop (pause + skip) ----------
  const TVKEY = "hoagie-intro-video-seen";
  function tourVideo(done) {
    addCss();
    const el = document.createElement("div"); el.className = "sh tv";
    const toon = ART.toon(ART.HOAGIE), kiwi = ART.kiwi || "";
    const card = (inner) => `<div class="tv-card">${inner}</div>`;
    const scenes = [
      { d: 4500, t: "Welcome to Constable Hoagie: a sub shop that protects and serves your dough.", h: `<div class="tv-store">${ART.storefront || ""}</div>` },
      { d: 4500, t: "Every morning I read the news and serve up ONE simple money move. Small bites, no homework.",
        h: card(`<b>🥪 Today's Play</b><div class="tv-row">🎯 Put $25 into a high-yield savings account</div><div class="tv-row">📈 Est. return: +$1.10 / year · 🔒 Confidence: High</div>`) },
      { d: 4500, t: "My Tab: everything you own in one place, with a net-worth line that moves with the markets.",
        h: card(`<b>💼 My Tab</b><svg viewBox="0 0 300 110" class="tv-line"><path d="M10 95 C 60 80, 90 88, 130 60 S 210 40, 290 18" fill="none" stroke="#2380c7" stroke-width="5" stroke-linecap="round"/></svg>`) },
      { d: 4000, t: "Costs: where the money goes, sorted for you. Budgets that actually make sense.",
        h: card(`<b>🧾 Costs</b>${[["Housing", 80], ["Groceries", 45], ["Fun", 25], ["Saving", 55]].map(([n, w]) => `<div class="tv-bar"><span>${n}</span><i style="--w:${w}%"></i></div>`).join("")}`) },
      { d: 4000, t: "Dashboard: free public data (rates, inflation, filings) turned into plain English.",
        h: card(`<b>📊 Dashboard</b><div class="tv-row">🛡 T-bills 4.1% vs prices +2.8%: your cash is growing</div><div class="tv-row">📄 New quarterly report for a stock you own</div>`) },
      { d: 4000, t: "Into sports? Grown-ups can turn on the full menu: price edges and a Bet Tracker. Or keep it money-only.",
        h: card(`<b>🎟 Bet Tracker <small>(18+, optional)</small></b><div class="tv-row">Open: 3 · Record 27-20 · Profit +$465</div>`) },
      { d: 4500, t: "Connect the apps you already use, or none at all. Some things only work in the app on your PC; the 🧩 list says which.",
        h: card(`<b>🔌 Integrations</b><div class="tv-chips">${["Coinbase", "SnapTrade", "SimpleFIN", "FRED", "The Odds API", "Claude", "Gemini", "Your own AI"].map(c => `<span>${c}</span>`).join("")}</div>`) },
      { d: 4000, t: "And that's Kiwi. She's in charge. Pick your look and sign in!", h: `<div class="tv-kiwi">${kiwi}</div>` },
    ];
    el.innerHTML = `<style>
      .sh.tv{background:linear-gradient(#bfe6ff,#fff3dc);color:#2b1d14}
      .tv .tv-stage{position:absolute;inset:8% 6% 22% 34%;display:grid;place-items:center}
      .tv .hg{position:absolute;left:4%;bottom:6%;height:62%;animation:tvbob 2.4s ease-in-out infinite}.tv .hg svg{height:100%;width:auto}
      @keyframes tvbob{50%{transform:translateY(-6px)}}
      .tv .cap{color:#2b1d14;text-shadow:0 2px 0 #fff;bottom:7%}
      .tv-card{background:#fffaf0;border:4px solid #2b1d14;border-radius:22px;padding:18px 22px;box-shadow:0 8px 0 #2b1d14;width:min(520px,56vw);font:800 18px Nunito,system-ui;animation:tvpop .4s cubic-bezier(.2,1.5,.4,1)}
      .tv-card b{font:900 24px Nunito,system-ui;display:block;margin-bottom:8px}.tv-row{margin:6px 0}
      @keyframes tvpop{from{transform:scale(.7);opacity:0}}
      .tv-line{width:100%;height:auto}.tv-line path{stroke-dasharray:420;stroke-dashoffset:420;animation:tvdraw 2.4s ease forwards}@keyframes tvdraw{to{stroke-dashoffset:0}}
      .tv-bar{display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:center;margin:6px 0}.tv-bar i{height:14px;border-radius:7px;background:#2380c7;width:0;animation:tvgrow 1.4s ease forwards}@keyframes tvgrow{to{width:var(--w)}}
      .tv-chips{display:flex;flex-wrap:wrap;gap:6px}.tv-chips span{border:2px solid #2b1d14;border-radius:12px;padding:3px 10px;background:#fff;animation:tvpop .4s both}
      .tv-store{width:min(640px,58vw)}.tv-store svg{width:100%;height:auto}.tv-kiwi{height:40vh}.tv-kiwi svg{height:100%;width:auto}
      .tv .ctl{position:absolute;right:16px;top:14px;z-index:5;display:flex;gap:8px}.tv .ctl button{background:#fffaf0;color:#2b1d14;border:3px solid #2b1d14;border-radius:12px;padding:8px 14px;font:900 15px Nunito,system-ui;cursor:pointer}
      .tv .prog{position:absolute;left:0;bottom:0;height:6px;background:#c8102e;width:0}
      .tv.paused *{animation-play-state:paused!important}
      @media(max-width:700px){.tv .tv-stage{inset:8% 4% 30% 4%}.tv .hg{height:30%;left:2%;bottom:14%}.tv-card{width:88vw;font-size:15px}}
    </style>
    <div class="ctl"><button id="tv-pause">❚❚ Pause</button><button id="tv-skip">Skip ▶▶</button></div>
    <div class="hg">${toon}</div><div class="tv-stage" id="tv-stage"></div><div class="cap" id="tv-cap"></div><div class="prog" id="tv-prog"></div>`;
    document.body.appendChild(el);
    const total = scenes.reduce((a, s) => a + s.d, 0);
    let t = 0, idx = -1, paused = false, last = performance.now(), raf = 0, ended = false;
    const show = i => { idx = i; el.querySelector("#tv-stage").innerHTML = scenes[i].h; el.querySelector("#tv-cap").textContent = scenes[i].t; };
    const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); try { localStorage.setItem(TVKEY, "1"); } catch (e) { /* ignore */ } el.remove(); if (done) done(); };
    const tick = now => {
      if (!paused) t += now - last;
      last = now;
      let acc = 0, i = 0; while (i < scenes.length && t >= acc + scenes[i].d) { acc += scenes[i].d; i++; }
      if (i >= scenes.length) return end();
      if (i !== idx) show(i);
      el.querySelector("#tv-prog").style.width = (t / total * 100) + "%";
      raf = requestAnimationFrame(tick);
    };
    el.querySelector("#tv-pause").onclick = () => { paused = !paused; el.classList.toggle("paused", paused); el.querySelector("#tv-pause").textContent = paused ? "▶ Play" : "❚❚ Pause"; };
    el.querySelector("#tv-skip").onclick = end;
    document.addEventListener("keydown", function k(e) { if (ended) return document.removeEventListener("keydown", k); if (e.key === " ") { e.preventDefault(); el.querySelector("#tv-pause").click(); } if (e.key === "Escape") end(); });
    raf = requestAnimationFrame(tick);
  }
  const tourVideoSeen = () => { try { return !!localStorage.getItem(TVKEY); } catch (e) { return false; } };

  window.LOOK = { tourVideo, tourVideoSeen, get, set, choose, intro, briefcase, theme: v => (v === "dark" ? "neon" : "original") };
})();
