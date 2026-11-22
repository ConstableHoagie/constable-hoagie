// Alison's garden shorts (original art): one family-friendly, one Dark Humor. Kiwi helps. Badly.
/* global ART, LOOK */
(function () {
  const css = `
  .gd{position:fixed;inset:0;z-index:215;overflow:hidden;font-family:Nunito,system-ui,sans-serif}
  .gd.day{background:linear-gradient(#8fd3ff,#d9f2ff 55%,#bfe6a8 56%,#8cc46c)}
  .gd.night{background:radial-gradient(circle at 70% 10%,#2a1660,#0d0622 55%,#090416)}
  .gd .skip{position:absolute;right:16px;top:14px;z-index:9;background:rgba(0,0,0,.35);color:#fff;border:2px solid #fff;border-radius:12px;padding:8px 14px;font:800 15px Nunito,system-ui;cursor:pointer}
  .gd svg.porch{position:absolute;inset:auto 0 0 0;width:100%;height:78%}
  .gd .who{position:absolute;bottom:9%;height:42%;transition:left 1.4s ease-in-out,transform .5s}.gd .who svg{height:100%;width:auto}
  .gd .al{left:28%}.gd .kw{left:62%;height:16%;bottom:9%;transition:left 1s,bottom .6s,transform .4s}
  .gd .cap{position:absolute;left:50%;top:9%;transform:translateX(-50%);width:min(840px,92vw);text-align:center;font:900 clamp(18px,2.6vw,30px)/1.25 Nunito,system-ui;color:#2b1d14;text-shadow:0 2px 0 #fff;transition:opacity .3s}
  .gd.night .cap{color:#fff;text-shadow:0 0 12px #ff3df2,0 3px 0 #000}
  .gd .say{position:absolute;max-width:300px;background:#fff;color:#170a2e;border:3px solid #000;border-radius:18px;padding:8px 12px;font-weight:800;opacity:0;transition:opacity .3s}.gd .say.on{opacity:1}
  .gd .pot{position:absolute;transition:all .9s cubic-bezier(.5,0,.8,.6)}
  .gd .bfly{position:absolute;font-size:34px;animation:fly 3s ease-in-out infinite}@keyframes fly{50%{transform:translate(60px,-40px) rotate(15deg)}}
  .gd .water{position:absolute;width:6px;height:6px;border-radius:50%;background:#5ab4ff;animation:drip .7s linear infinite}@keyframes drip{to{transform:translate(40px,90px);opacity:0}}
  .gd .end{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.55);opacity:0;transition:opacity .6s;pointer-events:none}
  .gd .end.on{opacity:1;pointer-events:auto}.gd .end div{background:#fffaf0;color:#2b1d14;border:4px solid #2b1d14;border-radius:22px;padding:22px 26px;text-align:center;max-width:min(560px,92vw);font:800 18px Nunito,system-ui}
  .gd.night .end div{background:#140b2a;color:#f3eaff;border-color:#ff3df2;box-shadow:0 0 30px rgba(255,61,242,.5)}
  .gd .end h2{margin:0 0 8px;font:900 28px Nunito,system-ui}.gd .end button{margin:10px 6px 0;padding:10px 16px;border-radius:14px;font:900 16px Nunito,system-ui;cursor:pointer;border:3px solid currentColor;background:transparent;color:inherit}
  .gd .end button.go{background:#2e9d55;color:#fff;border-color:#2e9d55}.gd.night .end button.go{background:#ff3df2;border-color:#ff3df2;color:#12061f}
  .gd .shake{animation:shk .35s 3}@keyframes shk{25%{transform:translateX(-6px) rotate(-2deg)}75%{transform:translateX(6px) rotate(2deg)}}
  .gd .glow svg{filter:drop-shadow(0 0 14px #b8ff4a) drop-shadow(0 0 30px #ff3df2)}`;
  function addCss() { if (document.getElementById("gd-css")) return; const s = document.createElement("style"); s.id = "gd-css"; s.textContent = css; document.head.appendChild(s); }

  // porch + garden, drawn from the photos: railing, hanging baskets, string lights, yellow yarrow, purple delphinium, the smoker
  function porch(night) {
    const bulbs = Array.from({ length: 12 }, (_, i) => `<circle cx="${60 + i * 100}" cy="${70 + (i % 2) * 10}" r="9" fill="${night ? "#ffe9a8" : "#fff8e0"}" ${night ? 'filter="url(#gb)"' : ""}/>`).join("");
    const mush = night ? Array.from({ length: 6 }, (_, i) => `<g transform="translate(${820 + i * 60},${96 + (i % 2) * 8})"><path d="M-10 0 q10 -16 20 0z" fill="#ff5a3c" filter="url(#gb)"/><rect x="-3" y="0" width="6" height="8" fill="#ffe"/></g>`).join("") : "";
    return `<svg class="porch" viewBox="0 0 1280 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><filter id="gb"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="0" y="0" width="1280" height="40" fill="${night ? "#d9d4e8" : "#f2efe6"}"/><path d="M0 40 h1280" stroke="#2b1d14" stroke-width="5"/>
      <path d="M40 60 q600 50 1200 0" stroke="#2b1d14" stroke-width="3" fill="none"/>${bulbs}${mush}
      <rect x="120" y="40" width="34" height="380" fill="#6f8fa3" stroke="#2b1d14" stroke-width="4"/><rect x="1080" y="40" width="34" height="380" fill="#6f8fa3" stroke="#2b1d14" stroke-width="4"/>
      ${[260, 520, 760].map((x, i) => `<path d="M${x} 40 v60" stroke="#2b1d14" stroke-width="3"/><path d="M${x - 46} 100 q46 40 92 0z" fill="#3b2a20" stroke="#2b1d14" stroke-width="4"/>
        ${[0, 1, 2, 3, 4].map(j => `<circle cx="${x - 34 + j * 17}" cy="${94 - (j % 2) * 8}" r="11" fill="${["#e8364a", "#ff8fb3", "#e8364a"][i]}" stroke="#2b1d14" stroke-width="2.5"/>`).join("")}
        <path d="M${x - 40} 104 q-10 40 -4 70 M${x + 40} 104 q10 40 4 70" stroke="#3f8f3a" stroke-width="5" fill="none"/>`).join("")}
      <rect x="140" y="250" width="960" height="18" fill="#c99a5b" stroke="#2b1d14" stroke-width="4"/>
      ${Array.from({ length: 24 }, (_, i) => `<rect x="${160 + i * 39}" y="268" width="14" height="150" fill="#d7aa6a" stroke="#2b1d14" stroke-width="3"/>`).join("")}
      <rect x="140" y="418" width="960" height="14" fill="#c99a5b" stroke="#2b1d14" stroke-width="4"/>
      <rect x="380" y="220" width="150" height="34" rx="6" fill="#c8693f" stroke="#2b1d14" stroke-width="4"/><path d="M400 222 q20 -50 40 -6 q20 -60 40 0 q20 -40 36 4" stroke="#3f8f3a" stroke-width="6" fill="none"/>
      <rect x="0" y="430" width="1280" height="130" fill="${night ? "#1a1230" : "#6a4a32"}"/><path d="M0 432 h1280" stroke="#2b1d14" stroke-width="4"/>
      ${[60, 110, 160, 210].map((x, i) => `<g>${[0, 1, 2, 3, 4, 5].map(j => `<circle cx="${x + (j % 3) * 14}" cy="${420 - Math.floor(j / 3) * 14 - i % 2 * 6}" r="8" fill="#ffd83a" stroke="#2b1d14" stroke-width="2"/>`).join("")}<path d="M${x + 14} 440 v-24" stroke="#3f8f3a" stroke-width="5"/></g>`).join("")}
      ${[300, 330].map(x => `<path d="M${x} 440 v-90" stroke="#3f8f3a" stroke-width="5"/>${[0, 1, 2, 3, 4].map(j => `<circle cx="${x + (j % 2 ? 7 : -7)}" cy="${360 + j * 14}" r="8" fill="#6b4fe0" stroke="#2b1d14" stroke-width="2"/>`).join("")}`).join("")}
      <g transform="translate(900,330)"><rect x="0" y="0" width="230" height="86" rx="40" fill="#1d1b22" stroke="#000" stroke-width="5"/><rect x="200" y="30" width="90" height="70" rx="10" fill="#1d1b22" stroke="#000" stroke-width="5"/>
        <rect x="14" y="-90" width="18" height="96" fill="#2a2830" stroke="#000" stroke-width="4"/><path d="M40 40 h150" stroke="#888" stroke-width="6"/>
        <circle cx="40" cy="104" r="24" fill="none" stroke="#000" stroke-width="5"/><text x="115" y="30" font-size="14" text-anchor="middle" fill="#bbb" font-family="Lilita One,sans-serif">SMOKER</text></g>
      ${night ? "" : `<rect x="1180" y="200" width="70" height="180" rx="30" fill="#2b2a33"/>`}
      ${flowers(night)}
    </svg>`;
  }
  // lots more flowers: railing boxes, sunflowers, coneflowers, daisies, tulips and a full front bed
  function flowers(night) {
    const rnd = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    const bloom = (x, y, r, c, ctr = "#ffd83a", petals = 6) => `<g transform="translate(${x},${y})">${Array.from({ length: petals }, (_, k) =>
      `<ellipse cx="0" cy="${-r}" rx="${r * .55}" ry="${r}" fill="${c}" stroke="#2b1d14" stroke-width="1.6" transform="rotate(${k * 360 / petals})"/>`).join("")}<circle r="${r * .55}" fill="${ctr}" stroke="#2b1d14" stroke-width="1.6"/></g>`;
    const stem = (x, y1, y2) => `<path d="M${x} ${y1} q${(x % 7) - 3} ${(y2 - y1) / 2} 0 ${y2 - y1}" stroke="#3f8f3a" stroke-width="4" fill="none"/>`;
    const leaf = (x, y, flip) => `<path d="M${x} ${y} q${flip ? -18 : 18} -10 ${flip ? -26 : 26} 4 q${flip ? 14 : -14} 8 ${flip ? 26 : -26} -4z" fill="#4fae47" stroke="#2b1d14" stroke-width="1.4"/>`;
    const pal = night ? ["#ff5fa8", "#ff9a3c", "#c88bff", "#ffe066", "#ff6b6b"] : ["#ff5fa8", "#ff9a3c", "#9b7bff", "#ffe066", "#ff4d4d", "#ffffff"];
    let g = "";
    // flower boxes along the top rail
    [600, 700, 820, 940].forEach((x, i) => {
      g += `<rect x="${x}" y="226" width="86" height="26" rx="5" fill="${i % 2 ? "#7a4a2a" : "#2b2a33"}" stroke="#2b1d14" stroke-width="3"/>`;
      for (let k = 0; k < 5; k++) g += stem(x + 10 + k * 16, 226, 196 - rnd(i, k) * 18) + bloom(x + 10 + k * 16, 192 - rnd(i, k) * 18, 7, pal[(i + k) % pal.length]);
    });
    // sunflowers by the post
    [1015, 1050].forEach((x, i) => { g += stem(x, 432, 250 + i * 20) + leaf(x, 360 + i * 10, false) + leaf(x, 330 + i * 10, true) + bloom(x, 240 + i * 20, 15, "#ffcc1a", "#6b3f1d", 12); });
    // tulips and coneflowers between the yarrow and the delphinium
    for (let k = 0; k < 7; k++) { const x = 230 + k * 22, y = 395 - rnd(k, 3) * 25; g += stem(x, 440, y) + `<path d="M${x - 8} ${y} q8 -18 16 0 q-2 10 -8 10 q-6 0 -8 -10z" fill="${pal[k % pal.length]}" stroke="#2b1d14" stroke-width="1.6"/>`; }
    for (let k = 0; k < 6; k++) { const x = 360 + k * 26, y = 380 - rnd(k, 5) * 30; g += stem(x, 440, y) + leaf(x, y + 40, k % 2) + bloom(x, y, 9, k % 2 ? "#d9539b" : "#f08a4b", "#6b3f1d", 10); }
    // potted mums along the porch base
    [470, 560, 650, 740, 830].forEach((x, i) => {
      g += `<path d="M${x - 22} 440 l-6 -34 h56 l-6 34z" fill="${["#c8693f", "#2b2a33", "#c8693f", "#5a7f9c", "#c8693f"][i]}" stroke="#2b1d14" stroke-width="3"/>`;
      for (let k = 0; k < 7; k++) g += bloom(x - 16 + (k % 4) * 11, 398 - Math.floor(k / 4) * 10 - rnd(i, k) * 4, 6, pal[(i * 2 + k) % pal.length]);
    });
    // a full front flower bed along the bottom edge
    g += `<path d="M0 560 q640 -46 1280 0z" fill="${night ? "#15240f" : "#3f7a2e"}" stroke="#2b1d14" stroke-width="3"/>`;
    for (let k = 0; k < 48; k++) {
      const x = 12 + k * 26.5, y = 532 - rnd(k, 9) * 26;
      g += stem(x, 560, y) + (k % 3 === 0 ? bloom(x, y, 8, "#ffffff", "#ffd83a", 10) : k % 3 === 1 ? bloom(x, y, 7, pal[k % pal.length]) : `<g>${[0, 1, 2].map(j => `<circle cx="${x}" cy="${y + j * 9}" r="5" fill="${night ? "#c88bff" : "#7b5cff"}" stroke="#2b1d14" stroke-width="1.4"/>`).join("")}</g>`);
    }
    // a couple of bees (day) or fireflies (night)
    g += night ? Array.from({ length: 14 }, (_, k) => `<circle cx="${80 + rnd(k, 1) * 1120}" cy="${140 + rnd(k, 2) * 260}" r="3.5" fill="#eaff7a" filter="url(#gb)"><animate attributeName="opacity" values="0;1;0" dur="${2 + rnd(k, 3) * 2}s" repeatCount="indefinite"/></circle>`).join("")
      : [[300, 300], [780, 210]].map(([x, y]) => `<g><animateTransform attributeName="transform" type="translate" values="0 0;30 -12;0 0" dur="2.6s" repeatCount="indefinite"/><ellipse cx="${x}" cy="${y}" rx="9" ry="7" fill="#ffd83a" stroke="#2b1d14" stroke-width="2"/><path d="M${x - 3} ${y - 6} v12 M${x + 3} ${y - 6} v12" stroke="#2b1d14" stroke-width="2"/><ellipse cx="${x - 2}" cy="${y - 10}" rx="5" ry="4" fill="#fff" opacity=".8"/></g>`).join("");
    return g;
  }
  const potSvg = (c) => `<svg viewBox="0 0 120 120" width="120"><path d="M30 120 l-8 -60 h76 l-8 60z" fill="${c}" stroke="#2b1d14" stroke-width="5"/><path d="M40 60 q8 -50 22 -10 q12 -46 26 2" stroke="#3f8f3a" stroke-width="7" fill="none"/><circle cx="58" cy="22" r="10" fill="#e8364a" stroke="#2b1d14" stroke-width="3"/></svg>`;

  function garden(kind, opts = {}) {
    addCss();
    const night = kind === "dark";
    const el = document.createElement("div");
    el.className = "gd " + (night ? "night" : "day");
    el.innerHTML = `<button class="skip">Skip ▶▶</button>${porch(night)}
      <div class="who al" id="g-al">${ART.toon(night ? ART.ALISON_DARK : ART.ALISON)}</div>
      <div class="who kw" id="g-kw">${ART.kiwi || ""}</div>
      <div class="pot" id="g-pot" style="left:50%;top:30%">${potSvg(night ? "#c8693f" : "#c8693f")}</div>
      ${night ? "" : `<div class="bfly" id="g-bf" style="left:66%;top:38%">🦋</div>`}
      <div class="say" id="g-say"></div><div class="cap" id="g-cap"></div>
      <div class="end" id="g-end"><div><h2 id="g-et"></h2><div id="g-eb"></div><div id="g-ea"></div></div></div>`;
    document.body.appendChild(el);
    const $ = s => el.querySelector(s), timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const cap = t => { $("#g-cap").textContent = t; };
    const say = (t, who) => { const b = $("#g-say"), r = $(who).getBoundingClientRect(); b.textContent = t; b.style.left = Math.min(innerWidth - 320, r.left + r.width * .6) + "px"; b.style.top = Math.max(60, r.top - 70) + "px"; b.classList.add("on"); };
    const hush = () => $("#g-say").classList.remove("on");
    const tone = (f, d = .12) => { try { const a = window.__gdac || (window.__gdac = new (window.AudioContext || window.webkitAudioContext)()); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch (e) { /* no audio */ } };
    const finish = () => {
      timers.forEach(clearTimeout); $("#g-end").classList.add("on");
      const other = night ? "the family-friendly version" : "the Dark Humor version";
      $("#g-et").textContent = night ? "Kiwi: 3 · Garden: 0" : "Kiwi: 1 · Garden: 0";
      $("#g-eb").innerHTML = night ? "Kiwi has been charged with felony geranium-slaughter. Bail is set at three treats. She will not be paying." : "No flowers were harmed. Okay, one. Kiwi says it was the butterfly's fault.";
      $("#g-ea").innerHTML = opts.offerOther ? `<p style="font-size:15px">Want to watch ${other} too?</p><button class="go" id="g-other">▶ Watch ${night ? "Original" : "Dark Humor"}</button><button id="g-next">Skip, next step ▶</button>`
        : `<button class="go" id="g-next">${opts.closeLabel || "Done"}</button>`;
      if ($("#g-other")) $("#g-other").onclick = () => { el.remove(); garden(night ? "original" : "dark", { done: opts.done, closeLabel: "Next step ▶" }); };
      $("#g-next").onclick = () => { el.remove(); if (opts.done) opts.done(); };
    };
    $(".skip").onclick = finish;
    if (!night) {   // ---- Original: "Kiwi Helps" ----
      cap("Alison's garden. Peaceful. Organized. Watered on schedule.");
      at(1200, () => { say("Okay, everybody gets a drink today.", "#g-al"); for (let i = 0; i < 6; i++) { const w = document.createElement("div"); w.className = "water"; w.style.left = "40%"; w.style.top = (52 + i * 2) + "%"; w.style.animationDelay = i * .12 + "s"; el.appendChild(w); } });
      at(3400, () => { hush(); cap("Enter: Kiwi, Head of Garden Security."); $("#g-kw").style.left = "55%"; });
      at(5200, () => { cap("Threat detected: one (1) butterfly."); $("#g-kw").classList.add("shake"); tone(660); });
      at(6600, () => { $("#g-kw").style.bottom = "34%"; $("#g-kw").style.left = "50%"; tone(880); cap("Kiwi launches."); });
      at(7600, () => { $("#g-pot").style.top = "62%"; $("#g-pot").style.transform = "rotate(-25deg)"; $("#g-bf").style.left = "80%"; $("#g-bf").style.top = "12%"; tone(220, .3); });
      at(8600, () => { $("#g-kw").style.bottom = "9%"; $("#g-kw").innerHTML = (ART.kiwi || "") ; $("#g-kw").style.transform = "translateY(-18px)";
        $("#g-pot").style.left = "48%"; $("#g-pot").style.top = "55%"; $("#g-pot").style.transform = "scale(.7) rotate(0)"; cap("Kiwi is now wearing the geranium. She meant to do that."); });
      at(11000, () => say("…Kiwi. Was that the butterfly's fault?", "#g-al"));
      at(13200, () => { hush(); cap("*Kiwi blinks slowly. It was the butterfly's fault.*"); });
      at(15600, finish);
    } else {        // ---- Dark Humor: "Kiwi's War on the Garden" ----
      cap("11:47 PM. The string lights are on. The mushroom lights are on. Kiwi is… awake.");
      at(2400, () => say("Just repotting the geraniums. Nobody touch anything.", "#g-al"));
      at(4600, () => { hush(); cap("Kiwi has heard you. Kiwi does not respect you."); $("#g-kw").style.left = "52%"; $("#g-kw").style.bottom = "30%"; });
      at(6400, () => { cap("*maintains eye contact*"); $("#g-kw").classList.add("shake"); });
      at(7800, () => { $("#g-pot").style.top = "78%"; $("#g-pot").style.transform = "rotate(110deg)"; tone(160, .4); cap("CRASH."); });
      at(9200, () => say("That was a forty-dollar geranium.", "#g-al"));
      at(11000, () => { hush(); cap("Kiwi, after careful consideration, pushes a second, more expensive geranium."); tone(140, .5); });
      at(13200, () => { $("#g-kw").style.left = "70%"; $("#g-kw").style.bottom = "26%"; cap("She then retires to the smoker lid to warm her crimes."); });
      at(15200, () => { $("#g-kw").classList.add("glow"); cap("Kiwi has also eaten one of the mushroom lights. Kiwi is now glowing. Kiwi regrets nothing."); tone(990, .25); });
      at(18400, () => say("I'm putting this in the budget as 'cat damages.'", "#g-al"));
      at(20800, finish);
    }
  }
  window.SHORTS = { garden };
})();
