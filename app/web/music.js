// An original 8-bit "keygen" tarantella, played live with Web Audio (no audio files).
// Square-wave lead, triangle bass, noise hats, a mandolin-ish tremolo arpeggio.
window.Music = (() => {
  let ctx = null, master = null, timer = null, step = 0, nextTime = 0, on = false;
  const BPM = 152, SIXTEENTH = 60 / BPM / 4;
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

  // A minor tarantella feel in 12/8 (each bar = 12 steps). 0 = rest.
  const A = 57, C = 60, D = 62, E = 64, F = 65, G = 67, Gs = 68, A5 = 69, B5 = 71, C6 = 72, D6 = 74, E6 = 76;
  const lead = [
    E6,0,D6, C6,0,B5, A5,0,B5, C6,0,E6,   D6,0,C6, B5,0,A5, Gs,0,A5, B5,0,0,
    C6,0,B5, A5,0,G,  F,0,G,   A5,0,C6,   B5,0,A5, Gs,0,B5, A5,0,0,  0,0,0,
    A5,B5,C6, D6,0,E6, F+12,0,E6, D6,0,C6, B5,C6,D6, E6,0,D6, C6,0,B5, A5,0,Gs,
    A5,0,E6, D6,0,C6, B5,0,D6, C6,0,B5,   A5,0,0, E,0,Gs, A5,0,0, 0,0,0,
  ];
  const bassRoots = [A, A, D, E, F, D, E, A, A, D, F, E, A, D, E, A];
  const arp = [[0, 3, 7], [0, 3, 7], [0, 3, 7], [0, 4, 7]]; // Am, Dm, Am, E

  function tone(type, freq, t, dur, vol, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hat(t, vol) {
    const len = 0.03, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 7000; s.buffer = buf;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      const i = step % lead.length, bar = Math.floor(step / 12) % bassRoots.length, beat = step % 12;
      if (lead[i]) tone("square", N(lead[i]), nextTime, SIXTEENTH * 1.7, 0.07);
      if (beat % 3 === 0) tone("triangle", N(bassRoots[bar] - 12), nextTime, SIXTEENTH * 2.4, 0.16);
      const chord = arp[bar % 4];
      tone("square", N(bassRoots[bar] + 12 + chord[step % 3]), nextTime, SIXTEENTH * 0.6, 0.022); // mandolin tremolo
      if (beat % 3 === 1) hat(nextTime, 0.05);
      if (beat === 0) tone("sine", 120, nextTime, 0.12, 0.25, 0.35); // kick
      nextTime += SIXTEENTH; step++;
    }
  }
  // ---- Neon theme: an original mixtape, played live (no audio files, no samples). ----
  // Four moods: lofi boom-bap, rap-rock, bluesy rock, and trap. All riffs and chords are original.
  let style = "original", track = 0, nstep = 0, crackle = null;
  const TRACKS = [
    { name: "Nebula Boom-Bap (lofi)", bpm: 84, swing: .18,
      kick: [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hat: [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,0],
      chords: [[62,65,69,72,76],[55,59,62,65,69],[60,64,67,71,74],[57,60,64,67,71]], bass: [38,43,36,45],
      lead: [0,0,81,0, 79,0,0,76, 0,0,74,0, 0,72,0,0], leadWave: "triangle", padWave: "sine", bassWave: "sine", crackle: true },
    { name: "Rage Reactor (rap-rock)", bpm: 100, swing: 0,
      kick: [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], hat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      riff: [40,0,40,43, 0,40,45,0, 43,0,40,0, 38,0,40,0], chords: null, bass: null, lead: null, dist: true },
    { name: "Zeppelin Drift (blues rock)", bpm: 92, swing: .12,
      kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0], snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,0],
      riff: [45,0,48,50, 51,52,0,55, 52,0,50,48, 45,0,43,0], chords: null, bass: null, lead: [0,0,0,0, 0,0,0,0, 76,0,79,81, 0,79,76,0], leadWave: "sawtooth", dist: true },
    { name: "Plug Orbit (trap)", bpm: 140, swing: 0, half: true,
      kick: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], hat: [1,1,1,1, 1,1,2,2, 1,1,1,1, 2,2,2,2],
      chords: [[65,68,72],[63,67,70],[61,65,68],[60,63,67]], bass: [41,39,37,36], glide: true,
      lead: [77,0,0,80, 0,0,79,0, 77,0,75,0, 0,72,0,0], leadWave: "square", padWave: "triangle", bassWave: "sine" },
  ];
  function noise(t, len, vol, hp, lp) {
    const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf;
    let node = s;
    if (hp) { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; node.connect(f); node = f; }
    if (lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; node.connect(f); node = f; }
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    node.connect(g); g.connect(master); s.start(t);
  }
  let shaper = null;
  function distTone(freq, t, dur, vol) {
    if (!shaper) { shaper = ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 6); } shaper.curve = c;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; shaper.connect(lp); lp.connect(master); }
    [1, 1.5, 2].forEach((m, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(freq * m, t);
      g.gain.setValueAtTime(vol * (k ? .5 : 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(shaper); o.start(t); o.stop(t + dur + .02); });
  }
  function kick808(t, vol, long) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (long ? .5 : .22)); o.connect(g); g.connect(master); o.start(t); o.stop(t + .6);
  }
  function scheduleNeon() {
    const T = TRACKS[track], spb = 60 / T.bpm / 4 * (T.half ? 1 : 1);
    while (nextTime < ctx.currentTime + 0.12) {
      const s = nstep % 16, bar = Math.floor(nstep / 16), swingOff = (s % 2 ? T.swing * spb : 0), t = nextTime + swingOff;
      if (T.kick[s]) kick808(t, T.dist ? .45 : .5, !!T.glide);
      if (T.snare[s]) { noise(t, .16, T.dist ? .3 : .22, 900, 7000); if (!T.dist) tone("triangle", 190, t, .08, .08); }
      if (T.hat[s]) { const n = T.hat[s] === 2 ? 3 : 1; for (let k = 0; k < n; k++) noise(t + k * spb / n, .03, .05, 8000); }
      if (T.chords && s === 0) T.chords[bar % T.chords.length].forEach(nn => tone(T.padWave || "sine", N(nn), t, spb * 15, .028));
      if (T.chords && T.crackle === undefined && s === 8 && T.glide) T.chords[bar % T.chords.length].slice(0, 1).forEach(nn => tone("square", N(nn + 12), t, spb * 2, .015));
      if (T.bass && (s === 0 || (T.glide && s === 10))) {
        const b = T.bass[bar % T.bass.length], o = ctx.createOscillator(), g = ctx.createGain(); o.type = T.bassWave || "sine";
        o.frequency.setValueAtTime(N(b), t); if (T.glide && s === 10) o.frequency.exponentialRampToValueAtTime(N(b + 5), t + spb * 3);
        g.gain.setValueAtTime(.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + spb * (T.glide ? 6 : 7)); o.connect(g); g.connect(master); o.start(t); o.stop(t + spb * 8);
      }
      if (T.riff && T.riff[s]) distTone(N(T.riff[s]), t, spb * 1.6, .05);
      if (T.lead && T.lead[s] && bar % 2 === 1) tone(T.leadWave || "triangle", N(T.lead[s]), t, spb * 2.2, T.dist ? .025 : .035);
      if (T.crackle && Math.random() < .35) noise(t, .012, .025, 2500);
      nextTime += spb; nstep++;
      if (nstep >= 16 * 24) { nstep = 0; track = (track + 1) % TRACKS.length; announce(); }   // new track every 24 bars
    }
  }
  function announce() { try { window.dispatchEvent(new CustomEvent("hoagie-track", { detail: TRACKS[track].name })); } catch (e) {} }
  function setStyle(s) { const was = style; style = s === "neon" ? "neon" : "original"; if (was !== style) { nstep = 0; step = 0; if (style === "neon") announce(); } }
  function nextTrack() { if (style !== "neon") return; track = (track + 1) % TRACKS.length; nstep = 0; announce(); }
  function nowPlaying() { return style === "neon" ? TRACKS[track].name : "Tarantella (8-bit)"; }

  function start() {
    if (on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      master = master || (() => { const g = ctx.createGain(); g.gain.value = 0.5; g.connect(ctx.destination); return g; })();
      ctx.resume(); nextTime = ctx.currentTime + 0.05; on = true;
      timer = setInterval(() => style === "neon" ? scheduleNeon() : schedule(), 25);
    } catch (e) { console.warn("music unavailable", e); }
  }
  function stop() { on = false; clearInterval(timer); }
  function blip(kind) { // little sound effects for clicks, pets, treats
    if (!ctx || muted()) return;
    const t = ctx.currentTime;
    if (kind === "purr") { for (let k = 0; k < 6; k++) tone("sawtooth", 38 + (k % 2) * 4, t + k * 0.09, 0.08, 0.05); }
    else if (kind === "treat") { [880, 1175, 1568].forEach((f, k) => tone("square", f, t + k * 0.07, 0.08, 0.05)); }
    else if (kind === "coin") { tone("square", 988, t, 0.06, 0.06); tone("square", 1319, t + 0.06, 0.18, 0.06); }
    else if (kind === "tick") { tone("square", 520 + Math.random() * 180, t, 0.03, 0.018); }
    else { tone("square", 660, t, 0.05, 0.04); }
  }
  function muted() { try { return localStorage.getItem("hoagie-muted") === "1"; } catch (e) { return false; } }
  function setMuted(m) { try { localStorage.setItem("hoagie-muted", m ? "1" : "0"); } catch (e) {} m ? stop() : start(); }
  return { start: () => { if (!muted()) start(); }, stop, blip, muted, setMuted, setStyle, nextTrack, nowPlaying };
})();
