// After hours (full menu only, adults who confirmed their age): Hoagie sometimes offers a cold
// beer or some "special" mushrooms from behind the counter, and now and then a smoke break out
// back. It's all cartoon gags; nothing here affects money features. Turn it off at
// Connect counter › Your menu.
/* global $, $$, esc, LS, say, Music, STATUS, THEME, ART, AVATARS, hoagieArt, kiwi, wait, toast */
const AFTER = {
  on() { return !!(STATUS && STATUS.me && STATUS.me.betting) && LS.get("afterhours", true); },
  busy: false,

  start() {
    const tick = () => {
      setTimeout(() => {
        if (this.on() && !this.busy && $("#panel-backdrop").hidden && !document.hidden && !$("#shop").hidden) this.offer();
        tick();
      }, (6 + Math.random() * 5) * 60000);   // every 6-11 minutes
    };
    tick();
  },

  offer(kind) {
    kind = kind || (Math.random() < .2 ? "smoke" : Math.random() < .5 ? "beer" : "shrooms");
    const lines = {
      beer: ["Long day? Cold one's on the house. Brewed on Titan. Tastes like Tuesday.", "🍺 Cheers", "I'm good"],
      shrooms: ["Psst. I got some... <i>special</i> mushrooms in the walk-in. Totally legal in this galaxy. Probably.", "🍄 Sure, why not", "Hard pass"],
      smoke: ["Slow night. Wanna step out back for a minute? Kiwi's coming too. She won't smoke. She's a cat.", "🌙 Let's go", "Maybe later"],
    }[kind];
    say(lines[0], [{ label: lines[1], do: () => this[kind]() }, { label: lines[2], do: () => say("No worries. Offer stands. Like my posture.", [], 3500) }], 14000);
  },

  async beer() {
    this.busy = true; Music.blip("coin");
    const mug = document.createElement("div"); mug.className = "ah-mug"; mug.textContent = "🍺";
    $("#scene").appendChild(mug); await wait(1600); mug.classList.add("clink"); Music.blip("treat");
    say("To compound interest and cold glasses. Cheers.", [], 5000);
    $("#scene").classList.add("ah-tipsy"); await wait(14000); $("#scene").classList.remove("ah-tipsy");
    mug.remove(); this.busy = false;
  },

  async shrooms() {
    this.busy = true;
    const scene = $("#scene");
    say("Alright. Give it a minute. If the ceiling says hi, say hi back.", [], 6000);
    await wait(2500);
    scene.classList.add("ah-trip");
    const odd = [this.alien, this.kiwiHeads, this.thirdEye, this.floatingSubs, this.breathingWalls].sort(() => Math.random() - .5);
    for (const f of odd) { await f.call(this); await wait(1200); }
    await wait(2500);
    scene.classList.remove("ah-trip");
    say("Whoa. Okay. I'm gonna go sit in the walk-in cooler for a sec. Your portfolio is still real, by the way.", [], 7000);
    this.busy = false;
  },

  async alien() {
    const a = document.createElement("div"); a.className = "ah-alien";
    a.innerHTML = `<svg viewBox="0 0 120 220" aria-hidden="true"><path d="M60 0 v70" stroke="#b8ff4a" stroke-width="3" stroke-dasharray="6 5"/>
      <rect x="20" y="0" width="80" height="14" rx="3" fill="#2a1d48" stroke="#3df5ff" stroke-width="2"/>
      <ellipse cx="60" cy="110" rx="36" ry="42" fill="#7dffb0" stroke="#0b2230" stroke-width="3"/>
      <ellipse cx="46" cy="104" rx="11" ry="15" fill="#120a24"/><ellipse cx="74" cy="104" rx="11" ry="15" fill="#120a24"/><circle cx="49" cy="99" r="3" fill="#fff"/><circle cx="77" cy="99" r="3" fill="#fff"/>
      <path d="M50 130 q10 8 20 0" stroke="#0b2230" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 72 l-10 -16 M80 72 l10 -16" stroke="#7dffb0" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="54" r="5" fill="#ff3df2"/><circle cx="90" cy="54" r="5" fill="#ff3df2"/>
      <path d="M26 150 q-18 10 -14 30 M94 150 q18 10 14 30" stroke="#7dffb0" stroke-width="8" stroke-linecap="round" fill="none"/>
      <rect x="40" y="148" width="40" height="40" rx="12" fill="#3a1240" stroke="#ff3df2" stroke-width="2"/></svg>
      <div class="ah-say">greetings, sandwich man</div>`;
    $("#scene").appendChild(a); Music.blip("tick");
    await wait(5200); a.classList.add("up"); await wait(1400); a.remove();
  },

  async kiwiHeads() {
    const k = $("#kiwi svg .khead");
    if (!k) return;
    const clone = k.cloneNode(true); clone.classList.add("ah-head2"); clone.setAttribute("transform", "translate(-30 -26) rotate(-14 124 52)");
    k.parentNode.appendChild(clone);
    say("Is... is Kiwi wearing two heads? Both of them look disappointed in me.", [], 4500);
    await wait(5000); clone.remove();
  },

  async thirdEye() {
    if (THEME === "neon") { $("#hoagie").innerHTML = hoagieArt({ eyes3: true }); }
    else { const e = document.createElement("div"); e.className = "ah-eye"; e.textContent = "👁"; $("#hoagie").appendChild(e); }
    say("I can see... everything. Your expense ratios. Gary. It's a lot.", [], 4500);
    await wait(5000);
    $("#hoagie").innerHTML = hoagieArt();
  },

  async floatingSubs() {
    for (let i = 0; i < 7; i++) {
      const s = document.createElement("div"); s.className = "ah-float"; s.textContent = ["🥪", "🥖", "🍄", "🫒", "🪐"][i % 5];
      s.style.left = (8 + Math.random() * 80) + "%"; s.style.animationDelay = (i * .35) + "s";
      $("#scene").appendChild(s); setTimeout(() => s.remove(), 6500);
    }
    await wait(4500);
  },

  async breathingWalls() {
    $("#scene-back").classList.add("ah-breathe");
    say("The menu boards are breathing. Respect the boards.", [], 4000);
    await wait(5000); $("#scene-back").classList.remove("ah-breathe");
  },

  // ---- smoke break out back (cutscene) ----
  async smoke() {
    this.busy = true;
    const you = (AVATARS && AVATARS[0]) ? ART.toon(AVATARS[0]) : ART.toon({ skin: "#d9a07a", hair: "short", hairC: "#2b1d24", topC: "#3a1240", legC: "#1d1b22" });
    const youName = (AVATARS && AVATARS[0] && AVATARS[0].name) || (STATUS && STATUS.signed_in_as) || "You";
    const box = document.createElement("div"); box.className = "ah-cut"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Smoke break out back");
    box.innerHTML = `<div class="ah-stage">
      <svg class="ah-alley" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><pattern id="ahb" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="#2a1630"/><path d="M0 0.5 h60 M0 15 h60 M30 0 v15 M0 15 v15 M60 15 v15" stroke="#140a1a" stroke-width="3"/></pattern>
          <filter id="ahg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <rect width="1200" height="560" fill="#0b0616"/>
        ${Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 233) % 1200}" cy="${(i * 37) % 120 + 8}" r="${i % 6 ? 1 : 2}" fill="#fff" opacity=".6"/>`).join("")}
        <circle cx="1020" cy="70" r="30" fill="#ffe9c9" opacity=".9"/>
        <rect x="0" y="130" width="1200" height="320" fill="url(#ahb)"/>
        <rect x="520" y="190" width="150" height="260" fill="#1a1236" stroke="#3a2a66" stroke-width="6"/>
        <text x="595" y="176" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="26" fill="#ff3df2" filter="url(#ahg)">EMPLOYEES ONLY</text>
        <circle cx="650" cy="330" r="6" fill="#ffcf6b"/>
        <path d="M720 380 h220 l-14 70 h-192z" fill="#24453a" stroke="#0e1f1a" stroke-width="5"/><rect x="712" y="362" width="236" height="22" rx="4" fill="#2f5a4c"/>
        <text x="830" y="424" text-anchor="middle" font-family="Anton, sans-serif" font-size="20" fill="#7dffb0" opacity=".6">PLEASE RECYCLE</text>
        <rect x="0" y="450" width="1200" height="110" fill="#141018"/><path d="M0 450 h1200" stroke="#3df5ff" stroke-width="2" opacity=".5"/>
        <rect x="140" y="400" width="130" height="60" fill="#8a5a33" stroke="#4a2e18" stroke-width="4"/><rect x="330" y="400" width="130" height="60" fill="#8a5a33" stroke="#4a2e18" stroke-width="4"/>
        <rect x="980" y="410" width="100" height="50" fill="#8a5a33" stroke="#4a2e18" stroke-width="4"/>
      </svg>
      <div class="ah-hoagie">${hoagieArt()}</div>
      <div class="ah-you">${you}</div>
      <div class="ah-kiwi">${ART.kiwi}</div>
      <div class="ah-joint" hidden></div>
      <div class="ah-moth">🦋</div>
    </div>
    <div class="ah-dlg"><div class="ah-who" id="ah-who"></div><div id="ah-line"></div>
      <div class="row"><button class="btn primary" id="ah-next">Next ▶</button><button class="btn" id="ah-skip">Back to work</button></div></div>`;
    document.body.appendChild(box);
    const joint = $(".ah-joint", box);
    const puff = (sel) => { const r = $(sel, box).getBoundingClientRect(); for (let i = 0; i < 4; i++) { const p = document.createElement("div"); p.className = "ah-puff";
      p.style.left = (r.left + r.width * .5 + (Math.random() * 30 - 15)) + "px"; p.style.top = (r.top + r.height * .22) + "px"; p.style.animationDelay = (i * .25) + "s"; box.appendChild(p); setTimeout(() => p.remove(), 3200); } };
    const pass = to => { joint.hidden = false; joint.className = "ah-joint at-" + to; };
    const script = [
      ["Constable Hoagie", "Ahh. The alley. Where the real ones take their fifteen.", () => pass("hoagie")],
      ["Constable Hoagie", "You ever think the stock market is just... vibes with a ticker symbol?", () => puff(".ah-hoagie")],
      [youName, "...Every day, man. Every single day.", () => { pass("you"); setTimeout(() => puff(".ah-you"), 500); }],
      ["Kiwi", "(stares at a moth for four straight minutes, then leaves. She doesn't do smoke. Good girl.)", () => $(".ah-kiwi", box).classList.add("leave")],
      ["Constable Hoagie", "Diversify your portfolio. Diversify your snacks. That's the whole sermon.", () => pass("hoagie")],
      [youName, "Write that on the menu board.", () => puff(".ah-you")],
      ["Constable Hoagie", "Already did. Under 'Today's Specials.' Alright. Back to work. Smells like oregano out here anyway.", () => { joint.hidden = true; }],
    ];
    let i = -1;
    const end = () => { box.remove(); this.busy = false; say("Break's over. Kiwi's already back on the scratcher. Judging us.", [], 5000); };
    const next = () => { i++; if (i >= script.length) return end(); const [who, line, fx] = script[i]; $("#ah-who", box).textContent = who; $("#ah-line", box).textContent = line; Music.blip("tick"); fx && fx(); };
    $("#ah-next", box).onclick = next; $("#ah-skip", box).onclick = end;
    box.addEventListener("keydown", e => { if (e.key === "Escape") end(); });
    next(); $("#ah-next", box).focus();
  },
};
window.AFTER = AFTER;
