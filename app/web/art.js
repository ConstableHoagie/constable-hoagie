// Constable Hoagie art, cel-shaded: ink outlines, a flat base tone, one hard shadow band,
// a rim highlight. Everything is original and drawn as SVG so it scales crisply.
window.ART = {};
const INK = "#2b1d24";
let _uid = 0;
const uid = p => "hz-" + p + (++_uid);  // prefixed so art ids never clash with page ids

// Cel-shade any closed shape. shape(attrs) returns the SVG element with those attrs.
// Shadow falls bottom-right (light from top-left); dx/dy set the shadow band's thickness.
function cel(shape, base, shade, dx = 7, dy = 6, sw = 3.5) {
  const id = uid("c");
  return `<clipPath id="${id}">${shape("")}</clipPath>
    ${shape(`fill="${shade}"`)}
    <g clip-path="url(#${id})"><g transform="translate(${-dx},${-dy})">${shape(`fill="${base}"`)}</g></g>
    ${shape(`fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"`)}`;
}
const shade = (hex, f = 0.78) => { // darker tone of a colour, for the shadow band
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = x => Math.max(0, Math.min(255, Math.round(x * f)));
  return "#" + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1);
};
ART.shade = shade;

// ------------------------------------------------------------------------------------------
// Characters: one toon body used for Hoagie and every avatar, so they all match.
// ------------------------------------------------------------------------------------------
ART.HOAGIE = {
  name: "Constable Hoagie", skin: "#f2c4a0", hair: "bald", hairC: "#3b2a20", beard: "full", beardC: "#5a3e2e",
  glasses: true, hat: "constable", top: "tank", topC: "#1d1b22", apron: true, tattoos: true,
  legs: "shorts", legC: "#1d1b22", shoeC: "#a9adb3", badge: true,
};

// Alison, in both looks (cartoon versions of the owner's partner, drawn from her photos)
ART.ALISON = {
  name: "Alison", skin: "#f1c6a6", hair: "bob", hairC: "#b8894f", hairHi: "#f2dca8", beard: "none", glasses: false,
  hat: "none", top: "tee", topC: "#f4f4f7", apron: false, tattoos: false, legs: "pants", legC: "#1f1f26", shoeC: "#c8a27a", badge: false,
};
ART.ALISON_DARK = Object.assign({}, ART.ALISON, { hair: "bun", hairC: "#7a5233", glasses: true, top: "hoodie", topC: "#9aa3ad", legs: "shorts", legC: "#e9e4dc", shoeC: "#8a5a3a" });

ART.toon = function (c, opts = {}) {
  const u = uid("t"), sk = c.skin || "#f2c4a0", skD = shade(sk), topC = c.topC || "#c8102e", legC = c.legC || "#2d3a5a";
  const shoeC = c.shoeC || "#f4f1e8", hairC = c.hairC || "#3b2a20", beardC = c.beardC || hairC;
  const tat = c.tattoos ? `url(#tat${u})` : sk;
  const limb = (x, y, w, h, rot, ox, oy) => s => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" transform="rotate(${rot} ${ox} ${oy})" ${s}/>`;
  const defs = `<defs>
    <pattern id="tat${u}" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="${sk}"/><path d="M0 8 q4 -7 8 0 t8 0" stroke="#3b5f7d" stroke-width="2.2" fill="none"/>
      <circle cx="12" cy="3" r="1.8" fill="#6a3f7a"/><path d="M2 14 l3 -3 l3 3" stroke="#2e6b48" stroke-width="1.6" fill="none"/></pattern>
    <filter id="toon${u}"><feComponentTransfer>
      <feFuncR type="discrete" tableValues="0.08 0.35 0.62 0.86 1"/><feFuncG type="discrete" tableValues="0.06 0.32 0.58 0.82 0.98"/>
      <feFuncB type="discrete" tableValues="0.08 0.3 0.55 0.8 0.96"/></feComponentTransfer></filter></defs>`;

  // legs + shoes
  const legs = `
    <g class="leg legL">${cel(limb(60, 176, 18, 52, 0, 0, 0), c.legs === "pants" ? legC : sk, c.legs === "pants" ? shade(legC) : skD, 5, 0)}
      ${cel(s => `<path d="M54 226 q0 -8 12 -8 h8 q10 0 10 10 q0 6 -6 6 h-20 q-4 0 -4 -8z" ${s}/>`, shoeC, shade(shoeC), 3, 3)}</g>
    <g class="leg legR">${cel(limb(82, 176, 18, 52, 0, 0, 0), c.legs === "pants" ? legC : sk, c.legs === "pants" ? shade(legC) : skD, 5, 0)}
      ${cel(s => `<path d="M80 228 q0 -10 10 -10 h8 q12 0 12 8 q0 8 -4 8 h-22 q-4 0 -4 -6z" ${s}/>`, shoeC, shade(shoeC), 3, 3)}</g>`;
  const shorts = c.legs === "pants" ? cel(s => `<path d="M54 160 h52 l2 30 h-56z" ${s}/>`, legC, shade(legC), 6, 4)
    : cel(s => `<path d="M52 158 h56 l4 40 h-26 l-6 -12 l-6 12 h-26z" ${s}/>`, legC, shade(legC), 6, 4);
  // arms (right one waves)
  const armL = `<g class="armL">${cel(limb(30, 112, 20, 62, 12, 40, 114), tat, skD, 6, 2)}
    ${cel(s => `<circle cx="28" cy="176" r="11" ${s}/>`, sk, skD, 3, 3)}</g>`;
  const armR = `<g class="armR">${cel(limb(110, 112, 20, 62, -12, 120, 114), tat, skD, 6, 2)}
    ${cel(s => `<circle cx="132" cy="176" r="11" ${s}/>`, sk, skD, 3, 3)}</g>`;
  // torso
  const torsoPath = c.top === "hoodie" ? "M42 118 q38 -16 76 0 l-4 70 q-34 8 -68 0z" : "M46 116 q34 -12 68 0 l-4 72 q-30 8 -60 0z";
  let torso = cel(s => `<path d="${torsoPath}" ${s}/>`, topC, shade(topC), 9, 4);
  if (c.top === "tank") torso = cel(s => `<path d="M48 116 q32 -10 64 0 l-4 72 q-28 8 -56 0z" ${s}/>`, topC, shade(topC), 9, 4)
    + `<path d="M62 112 q18 18 36 0" fill="${sk}" stroke="${INK}" stroke-width="3"/>`;
  if (c.top === "hoodie") torso += `<path d="M80 124 v40" stroke="${shade(topC, .6)}" stroke-width="3"/><path d="M60 170 h40" stroke="${shade(topC, .6)}" stroke-width="3"/>`;
  const apron = c.apron ? cel(s => `<path d="M58 128 h44 l6 66 q-28 8 -56 0z" ${s}/>`, "#fbfaf4", "#d9d4c4", 8, 3)
    + `<path d="M60 128 q20 -18 40 0" fill="none" stroke="${INK}" stroke-width="3"/>
       <rect x="68" y="150" width="24" height="16" rx="4" fill="#efeadd" stroke="${INK}" stroke-width="2.5"/>
       ${c.badge ? `<text x="80" y="162" font-size="10" text-anchor="middle" font-family="Lilita One, sans-serif" fill="#c8102e">CH</text>` : `<path d="M74 152 v10 M78 152 v10" stroke="#3b5f7d" stroke-width="2"/>`}
       <path d="M56 142 h48" stroke="#c8102e" stroke-width="3"/>` : "";
  const neck = cel(s => `<rect x="70" y="98" width="20" height="22" rx="6" ${s}/>`, sk, skD, 4, 0);

  // head
  let face;
  const headShape = s => `<ellipse cx="80" cy="66" rx="44" ry="42" ${s}/>`;
  const ears = cel(s => `<ellipse cx="38" cy="72" rx="8" ry="11" ${s}/>`, sk, skD, 3, 3) + cel(s => `<ellipse cx="122" cy="72" rx="8" ry="11" ${s}/>`, sk, skD, 3, 3);
  if (c.photo) {
    const cp = uid("pc");
    face = `${ears}<clipPath id="${cp}">${headShape("")}</clipPath>${headShape(`fill="${sk}"`)}
      <image href="${c.photo}" x="34" y="22" width="92" height="90" clip-path="url(#${cp})" preserveAspectRatio="xMidYMid slice" filter="url(#toon${u})"/>
      ${headShape(`fill="none" stroke="${INK}" stroke-width="3.5"`)}
      <path d="M48 40 q12 -16 30 -18" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55" fill="none"/>`;
  } else {
    const hair = {
      bald: `<path d="M50 34 q14 -16 34 -16" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55" fill="none"/>`,
      short: cel(s => `<path d="M36 66 q-4 -46 44 -46 q48 0 44 46 q-8 -24 -44 -26 q-36 2 -44 26z" ${s}/>`, hairC, shade(hairC), 6, 5),
      spiky: cel(s => `<path d="M36 64 l-2 -20 l12 6 l4 -20 l12 12 l8 -18 l10 16 l12 -14 l4 20 l12 -6 l-2 24 q-8 -22 -44 -24 q-36 2 -46 24z" ${s}/>`, hairC, shade(hairC), 5, 5),
      long: cel(s => `<path d="M34 70 q-6 -50 46 -50 q52 0 46 50 v42 q-8 -4 -8 -30 q0 -30 -38 -34 q-38 4 -38 34 q0 26 -8 30z" ${s}/>`, hairC, shade(hairC), 6, 5),
      curly: `<g>${[38, 52, 66, 80, 94, 108, 122].map((x, i) => cel(s => `<circle cx="${x}" cy="${30 + (i % 2) * 8 + Math.abs(80 - x) / 4}" r="13" ${s}/>`, hairC, shade(hairC), 4, 4, 3)).join("")}</g>`,
      bob: cel(s => `<path d="M32 74 q-8 -54 48 -54 q56 0 48 54 v28 q-10 4 -14 -6 q-4 -40 -34 -48 q-30 8 -34 48 q-4 10 -14 6z" ${s}/>`, hairC, shade(hairC), 6, 5)
        + `<path d="M58 30 q-10 20 -14 60 M92 26 q14 18 18 62" stroke="${c.hairHi || "#f3dba4"}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".75"/>`,
      bun: cel(s => `<path d="M36 66 q-4 -46 44 -46 q48 0 44 46 q-8 -24 -44 -26 q-36 2 -44 26z" ${s}/>`, hairC, shade(hairC), 6, 5) + cel(s => `<circle cx="80" cy="14" r="13" ${s}/>`, hairC, shade(hairC), 4, 4),
    }[c.hair || "short"] || "";
    const beard = {
      none: "",
      stubble: `<path d="M44 80 q4 34 36 36 q32 -2 36 -36 q-8 18 -36 20 q-28 -2 -36 -20z" fill="${beardC}" opacity=".28"/>`,
      short: cel(s => `<path d="M46 84 q6 30 34 32 q28 -2 34 -32 q-10 16 -34 16 q-24 0 -34 -16z" ${s}/>`, beardC, shade(beardC), 4, 4, 3),
      full: cel(s => `<path d="M38 72 q0 50 42 52 q42 -2 42 -52 q-10 26 -42 26 q-32 0 -42 -26z" ${s}/>`, beardC, shade(beardC), 5, 6, 3.5)
        + `<path d="M58 106 q4 6 8 8 M102 106 q-4 6 -8 8 M76 118 l2 4 M84 118 l-2 4" stroke="#a08f80" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    }[c.beard || "none"] || "";
    const mustache = c.beard === "full" || c.beard === "short"
      ? cel(s => `<path d="M60 92 q10 -9 20 -2 q10 -7 20 2 q-6 7 -20 4 q-14 3 -20 -4z" ${s}/>`, shade(beardC, .9), shade(beardC, .7), 2, 2, 3) : "";
    const glasses = c.glasses ? `<g class="specs"><circle cx="63" cy="70" r="15" fill="rgba(255,255,255,.12)" stroke="${INK}" stroke-width="4.5"/>
        <circle cx="97" cy="70" r="15" fill="rgba(255,255,255,.12)" stroke="${INK}" stroke-width="4.5"/><path d="M78 70 h4 M48 68 l-10 -3 M112 68 l10 -3" stroke="${INK}" stroke-width="4"/>
        <path d="M55 61 l6 -4 M89 61 l6 -4" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>` : "";
    face = `${ears}${cel(headShape, sk, skD, 9, 7)}${hair}${beard}
      <g class="eyes">
        <ellipse cx="63" cy="71" rx="8.5" ry="10" fill="#fff" stroke="${INK}" stroke-width="2.5"/><ellipse cx="97" cy="71" rx="8.5" ry="10" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
        <circle class="pupil" cx="65" cy="72" r="4.6" fill="${INK}"/><circle class="pupil" cx="99" cy="72" r="4.6" fill="${INK}"/>
        <circle cx="66.5" cy="70" r="1.6" fill="#fff"/><circle cx="100.5" cy="70" r="1.6" fill="#fff"/>
        <g class="lids"><rect x="53" y="58" width="21" height="0" fill="${sk}"/><rect x="87" y="58" width="21" height="0" fill="${sk}"/></g>
      </g>
      <path class="brow" d="M53 55 q10 -6 19 -1" stroke="${c.hair === "bald" ? shade(beardC, .9) : hairC}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path class="brow" d="M88 54 q10 -5 19 1" stroke="${c.hair === "bald" ? shade(beardC, .9) : hairC}" stroke-width="5" stroke-linecap="round" fill="none"/>
      ${cel(s => `<path d="M76 76 q-6 12 0 14 q4 2 8 0 q6 -2 0 -14z" ${s}/>`, sk, skD, 3, 2, 2.6)}
      ${mustache}
      <path class="mouth" d="M68 100 q12 11 24 0 q-12 4 -24 0z" fill="#7d2a33" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${glasses}`;
  }
  const hats = {
    none: "",
    constable: cel(s => `<path d="M38 50 q42 -78 84 0z" ${s}/>`, "#24326b", "#18224c", 7, 6)
      + cel(s => `<ellipse cx="80" cy="50" rx="46" ry="8" ${s}/>`, "#1a2552", "#121a3c", 3, 3, 3)
      + cel(s => `<path d="M68 38 l12 -16 l12 16 l-12 8z" ${s}/>`, "#f0c443", "#c79a1f", 3, 3, 2.5)
      + `<ellipse cx="80" cy="33" rx="6" ry="2.6" fill="#e8b96a" stroke="${INK}" stroke-width="1.5"/><path d="M75 32 h10" stroke="#5c8a2c" stroke-width="1.5"/>
         ${cel(s => `<circle cx="80" cy="-2" r="5" ${s}/>`, "#f0c443", "#c79a1f", 2, 2, 2.5)}
         <path d="M52 30 q10 -20 26 -26" stroke="#fff" stroke-width="4" opacity=".35" stroke-linecap="round" fill="none"/>`,
    hardhat: cel(s => `<path d="M38 52 q42 -70 84 0z" ${s}/>`, "#ffc93c", "#e0a10f", 7, 6)
      + cel(s => `<rect x="30" y="46" width="100" height="12" rx="6" ${s}/>`, "#f2b51c", "#cf9208", 2, 3, 3)
      + `<path d="M80 6 v40" stroke="${INK}" stroke-width="3" opacity=".35"/><path d="M52 34 q10 -18 24 -24" stroke="#fff" stroke-width="4" opacity=".45" stroke-linecap="round" fill="none"/>`,
    cap: cel(s => `<path d="M36 50 q44 -60 88 0z" ${s}/>`, c.topC || "#c8102e", shade(c.topC || "#c8102e"), 6, 5)
      + cel(s => `<path d="M96 46 h42 q-4 10 -40 8z" ${s}/>`, c.topC || "#c8102e", shade(c.topC || "#c8102e"), 3, 3, 3),
    beanie: cel(s => `<path d="M36 54 q44 -66 88 0z" ${s}/>`, "#e04e39", "#b73a28", 6, 5) + cel(s => `<rect x="34" y="46" width="92" height="14" rx="7" ${s}/>`, "#b73a28", "#8f2c1f", 2, 3, 3)
      + cel(s => `<circle cx="80" cy="4" r="9" ${s}/>`, "#fff", "#ddd", 2, 2, 3),
    chef: cel(s => `<rect x="48" y="20" width="64" height="30" rx="6" ${s}/>`, "#fff", "#e3e0d6", 5, 3)
      + [58, 80, 102].map((x, i) => cel(s => `<circle cx="${x}" cy="${i === 1 ? 10 : 16}" r="${i === 1 ? 17 : 14}" ${s}/>`, "#fff", "#e3e0d6", 4, 3, 3)).join(""),
  }[c.hat || "none"] || "";

  return `<svg viewBox="0 -14 160 260" xmlns="http://www.w3.org/2000/svg" class="toon" aria-label="${(c.name || "character").replace(/"/g, "")}">
    ${defs}<ellipse cx="80" cy="236" rx="40" ry="7" fill="rgba(0,0,0,.18)"/>
    <g class="body">${legs}${shorts}${armL}${torso}${apron}${armR}${neck}<g class="head">${face}${hats}</g></g></svg>`;
};

// ------------------------------------------------------------------------------------------
// Kiwi: chunky, fluffy, tortoiseshell, green eyes. Cel-shaded side view.
// ------------------------------------------------------------------------------------------
ART.kiwi = (() => {
  const fluff = (cx, cy, rx, ry, n, amp) => {
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, r1 = 1 + (i % 2 ? amp : -amp * .3);
      const x = cx + Math.cos(a) * rx * r1, y = cy + Math.sin(a) * ry * r1;
      d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d + "Z";
  };
  const D = "#2e2019", M = "#4a3226", O = "#d0893f", L = "#e7b06a";
  const body = fluff(70, 74, 46, 26, 34, .09), head = fluff(124, 52, 30, 28, 26, .08), tail = "M28 72 q-26 -6 -20 -38 q4 -14 14 -10 q-8 6 -6 20 q2 14 18 20z";
  return `<svg viewBox="-8 0 170 112" xmlns="http://www.w3.org/2000/svg" class="kiwi-svg" aria-label="Kiwi the cat">
    <ellipse cx="74" cy="104" rx="52" ry="6" fill="rgba(0,0,0,.18)"/>
    <g class="tail">${cel(s => `<path d="${tail}" ${s}/>`, M, D, 4, 4)}<path d="M12 36 q2 -8 8 -10" stroke="${O}" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    <g class="kleg kleg1">${cel(s => `<rect x="38" y="80" width="15" height="24" rx="7" ${s}/>`, D, "#1f150f", 3, 0, 3)}</g>
    <g class="kleg kleg3">${cel(s => `<rect x="88" y="80" width="15" height="24" rx="7" ${s}/>`, D, "#1f150f", 3, 0, 3)}</g>
    ${cel(s => `<path d="${body}" ${s}/>`, M, D, 8, 8)}
    <path d="M40 66 q14 -16 30 -6 q-12 14 -30 6z" fill="${O}"/><path d="M78 58 q16 -8 28 4 q-16 8 -28 -4z" fill="${L}" opacity=".85"/>
    <path d="M48 92 q22 8 44 0" stroke="${L}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M36 58 q14 -12 30 -12" stroke="#fff" stroke-width="3" opacity=".25" stroke-linecap="round" fill="none"/>
    <g class="kleg kleg2">${cel(s => `<rect x="52" y="84" width="15" height="22" rx="7" ${s}/>`, M, D, 3, 0, 3)}</g>
    <g class="kleg kleg4">${cel(s => `<rect x="100" y="84" width="15" height="22" rx="7" ${s}/>`, M, D, 3, 0, 3)}</g>
    <g class="khead">
      ${cel(s => `<path d="M100 36 l4 -28 l18 20z" ${s}/>`, D, "#1f150f", 2, 2, 3)}${cel(s => `<path d="M132 26 l16 -20 l2 30z" ${s}/>`, M, D, 2, 2, 3)}
      <path d="M106 28 l2 -12 l8 9z" fill="${O}"/><path d="M138 26 l8 -10 l1 13z" fill="#e58a9b" opacity=".7"/>
      ${cel(s => `<path d="${head}" ${s}/>`, D, "#1f150f", 6, 6)}
      <path d="M104 40 q12 -10 22 0 q-10 8 -22 0z" fill="${O}"/><path d="M128 66 q10 4 20 -2 q-6 10 -20 2z" fill="${L}"/>
      <g class="keyes">
        <ellipse cx="114" cy="52" rx="7" ry="8.5" fill="#b9e66a" stroke="${INK}" stroke-width="2.5"/><ellipse cx="136" cy="52" rx="7" ry="8.5" fill="#b9e66a" stroke="${INK}" stroke-width="2.5"/>
        <ellipse cx="115" cy="53" rx="2.4" ry="6" fill="${INK}"/><ellipse cx="137" cy="53" rx="2.4" ry="6" fill="${INK}"/>
        <circle cx="117" cy="49" r="2" fill="#fff"/><circle cx="139" cy="49" r="2" fill="#fff"/>
      </g>
      <path d="M123 62 l3 3 l3 -3z" fill="#f08ea0" stroke="${INK}" stroke-width="1.5"/>
      <path d="M126 65 q-4 5 -9 2 M126 65 q4 5 9 2" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M106 64 h-16 M106 68 l-15 3 M146 64 h14 M146 68 l13 3" stroke="#efe6d6" stroke-width="1.4"/>
      <g class="kcollar"><path d="M106 76 q20 10 40 -2" stroke="#b13cff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="126" cy="84" r="5" fill="#0b2230" stroke="#3df5ff" stroke-width="2"/></g>
    </g></svg>`;
})();

ART.scratcher = `<svg viewBox="0 0 130 74" xmlns="http://www.w3.org/2000/svg">
  ${cel(s => `<path d="M6 68 l14 -46 h90 l14 46z" ${s}/>`, "#d6a565", "#b07f42", 8, 4)}
  ${Array.from({ length: 10 }, (_, i) => `<path d="M${26 + i * 8.5} 30 l-5 32" stroke="#9a6e38" stroke-width="2.5"/>`).join("")}
  <rect x="38" y="44" width="54" height="16" rx="4" fill="#fff6e4" stroke="${INK}" stroke-width="2.5"/>
  <text x="65" y="56" font-size="11" text-anchor="middle" font-family="Lilita One, sans-serif" fill="#7a5226">KIWI'S</text></svg>`;
ART.bowl = `<svg viewBox="0 0 90 48" xmlns="http://www.w3.org/2000/svg">
  ${cel(s => `<path d="M8 16 q6 28 37 28 q31 0 37 -28z" ${s}/>`, "#e8384f", "#b8243a", 6, 5)}
  <ellipse cx="45" cy="16" rx="37" ry="8" fill="#8a4a2a" stroke="${INK}" stroke-width="3"/>
  ${[30, 42, 54].map(x => `<circle cx="${x}" cy="13" r="4" fill="#d58a3c" stroke="${INK}" stroke-width="1.5"/>`).join("")}
  <text x="45" y="35" font-size="10" text-anchor="middle" font-family="Lilita One, sans-serif" fill="#fff">TREATS</text></svg>`;

// ------------------------------------------------------------------------------------------
// The shop interior: a game level. Hotspots (class "hot") open counters.
// Two layers: back (wall, boards, floor) and front (the counter), with Hoagie between them.
// ------------------------------------------------------------------------------------------
const hot = (open, label, inner, mx, my) => `<g class="hot" data-open="${open}" tabindex="0" role="button" aria-label="${label}">${inner}
  <g class="marker" transform="translate(${mx} ${my})"><g class="bounce">${cel(s => `<path d="M-13 -30 h26 l-4 22 h-18z" ${s}/>`, "#ffd23f", "#e5a91c", 3, 3, 3)}
  <text x="0" y="-13" text-anchor="middle" font-size="18" font-family="Lilita One, sans-serif" fill="${INK}">!</text></g>
  <g class="hot-label"><rect x="-70" y="-62" width="140" height="26" rx="13" fill="${INK}"/><text x="0" y="-44" text-anchor="middle" font-size="14" fill="#fff" font-family="Nunito, sans-serif" font-weight="900">${label}</text></g></g></g>`;

ART.sceneBack = `<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" class="scene-svg">
  <defs>
    <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3dc"/><stop offset="1" stop-color="#ffe6bf"/></linearGradient>
    <pattern id="tileW" width="36" height="24" patternUnits="userSpaceOnUse"><rect width="36" height="24" fill="#3f8f5a"/><rect x="2" y="2" width="32" height="20" rx="3" fill="#4fa56b"/><rect x="4" y="4" width="14" height="5" rx="2" fill="#7cc792" opacity=".6"/></pattern>
    <pattern id="board" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#26382f"/><circle cx="3" cy="4" r=".6" fill="#3a5246"/></pattern>
  </defs>
  <rect width="1200" height="560" fill="url(#wallG)"/>
  <!-- sunbeams -->
  <path d="M120 0 l120 0 l-260 560 l-120 0z" fill="#fff" opacity=".18"/><path d="M330 0 l60 0 l-220 560 l-60 0z" fill="#fff" opacity=".12"/>
  <!-- wainscot tile -->
  <rect x="0" y="262" width="1200" height="160" fill="url(#tileW)"/><rect x="0" y="252" width="1200" height="14" fill="#2f6b3a" stroke="${INK}" stroke-width="3"/>
  <!-- pendant lamps -->
  ${[260, 600, 940].map(x => `<path d="M${x} 0 v40" stroke="${INK}" stroke-width="3"/>${cel(s => `<path d="M${x - 34} 70 q34 -44 68 0z" ${s}/>`, "#e8384f", "#b8243a", 6, 4)}
    <ellipse cx="${x}" cy="72" rx="14" ry="6" fill="#fff6c8" stroke="${INK}" stroke-width="2.5"/><path d="M${x - 70} 76 l140 0 l60 180 l-260 0z" fill="#fff8d0" opacity=".16"/>`).join("")}
  <!-- left: fuse box = Connect -->
  ${hot("connect", "🔌 Connect Counter", `${cel(s => `<rect x="42" y="120" width="96" height="120" rx="10" ${s}/>`, "#9aa7b4", "#73808c", 8, 6)}
    <rect x="56" y="136" width="68" height="36" rx="6" fill="#2b3640" stroke="${INK}" stroke-width="3"/>
    ${[0, 1, 2].map(i => `<circle cx="${70 + i * 20}" cy="154" r="6" fill="${["#52e07a", "#ffd23f", "#52e07a"][i]}" stroke="${INK}" stroke-width="2"/>`).join("")}
    <path d="M78 186 l-8 18 h12 l-6 20 l18 -26 h-12 l6 -12z" fill="#ffd23f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`, 90, 116)}
  <!-- menu boards on the wall -->
  ${hot("news", "📰 News Rail", `${cel(s => `<rect x="190" y="96" width="250" height="140" rx="10" ${s}/>`, "#8a5a33", "#6b4426", 8, 6)}
    <rect x="202" y="108" width="226" height="116" rx="6" fill="url(#board)" stroke="${INK}" stroke-width="3"/>
    <text x="315" y="138" text-anchor="middle" font-size="22" font-family="Lilita One, sans-serif" fill="#ffd23f">TODAY'S NEWS</text>
    <path d="M222 158 h120 M222 178 h170 M222 198 h90" stroke="#e8e3d3" stroke-width="5" stroke-linecap="round" opacity=".75"/>
    <circle cx="400" cy="196" r="12" fill="#e8384f" stroke="#fff" stroke-width="2"/>`, 315, 92)}
  ${hot("playbook", "📋 Build a Playbook", `${cel(s => `<rect x="470" y="86" width="260" height="150" rx="10" ${s}/>`, "#8a5a33", "#6b4426", 8, 6)}
    <rect x="482" y="98" width="236" height="126" rx="6" fill="url(#board)" stroke="${INK}" stroke-width="3"/>
    <text x="600" y="130" text-anchor="middle" font-size="24" font-family="Lilita One, sans-serif" fill="#fff">PLAYBOOK MENU</text>
    <text x="510" y="160" font-size="15" font-family="Nunito, sans-serif" font-weight="900" fill="#ffd23f">⚡ SAME DAY</text><text x="690" y="160" text-anchor="end" font-size="15" fill="#e8e3d3" font-family="Nunito, sans-serif" font-weight="900">🌶🌶🌶</text>
    <text x="510" y="184" font-size="15" font-family="Nunito, sans-serif" font-weight="900" fill="#ffd23f">🗓 2 DAYS–4 WKS</text><text x="690" y="184" text-anchor="end" font-size="15" fill="#e8e3d3" font-family="Nunito, sans-serif" font-weight="900">🌶🌶</text>
    <text x="510" y="208" font-size="15" font-family="Nunito, sans-serif" font-weight="900" fill="#ffd23f">🌳 LONG HAUL</text><text x="690" y="208" text-anchor="end" font-size="15" fill="#e8e3d3" font-family="Nunito, sans-serif" font-weight="900">🌶</text>`, 600, 82)}
  ${hot("lotto", "🎟️ Lucky Tickets", `${cel(s => `<rect x="760" y="104" width="150" height="132" rx="12" ${s}/>`, "#7c4dbf", "#5d3797", 8, 6)}
    <rect x="776" y="120" width="118" height="52" rx="8" fill="#2a1d44" stroke="${INK}" stroke-width="3"/>
    ${[0, 1, 2].map(i => `<circle cx="${800 + i * 35}" cy="146" r="13" fill="#fff" stroke="${INK}" stroke-width="2.5"/><text x="${800 + i * 35}" y="152" text-anchor="middle" font-size="15" font-family="Lilita One, sans-serif" fill="${INK}">${[7, 23, 41][i]}</text>`).join("")}
    <text x="835" y="200" text-anchor="middle" font-size="16" font-family="Lilita One, sans-serif" fill="#ffd23f">LUCKY</text>
    <rect x="806" y="210" width="58" height="16" rx="4" fill="#ffd23f" stroke="${INK}" stroke-width="2.5"/>`, 835, 100)}
  <!-- right: inspector certificate + mirror -->
  ${hot("health", "🩺 Health Inspector", `${cel(s => `<rect x="952" y="104" width="96" height="120" rx="6" ${s}/>`, "#e8c87a", "#c4a352", 6, 5)}
    <rect x="964" y="116" width="72" height="96" fill="#fffdf4" stroke="${INK}" stroke-width="2.5"/>
    <text x="1000" y="140" text-anchor="middle" font-size="12" font-family="Lilita One, sans-serif" fill="#2f6b3a">HEALTH</text>
    <text x="1000" y="182" text-anchor="middle" font-size="34" font-family="Lilita One, sans-serif" fill="#2f6b3a" class="grade">A</text>
    <path d="M976 196 h48" stroke="#c9c2b0" stroke-width="3"/>`, 1000, 100)}
  ${hot("avatar", "🧑‍🍳 Make Your Avatar", `${cel(s => `<ellipse cx="1124" cy="170" rx="50" ry="70" ${s}/>`, "#e8c87a", "#c4a352", 6, 5)}
    <ellipse cx="1124" cy="170" rx="38" ry="58" fill="#bfe6f5" stroke="${INK}" stroke-width="3"/><path d="M1104 136 l24 -18 M1100 160 l40 -30" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`, 1124, 96)}
  <!-- floor: perspective checker -->
  <rect x="0" y="420" width="1200" height="140" fill="#e9dcc6"/>
  ${(() => { let o = ""; const rows = 5; for (let r = 0; r < rows; r++) { const y0 = 420 + r * 28, y1 = y0 + 28; const n = 24;
      for (let i = -4; i < n + 4; i++) { if ((i + r) % 2) continue; const sk = (x, y) => 600 + (x - 600) * (0.82 + (y - 420) / 140 * 0.4);
        const xa = i * 50, xb = xa + 50; o += `<path d="M${sk(xa, y0)} ${y0} L${sk(xb, y0)} ${y0} L${sk(xb, y1)} ${y1} L${sk(xa, y1)} ${y1}Z" fill="#c9b796"/>`; } } return o; })()}
  <path d="M0 420 h1200" stroke="${INK}" stroke-width="3"/>
</svg>`;

ART.sceneFront = `<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" class="scene-svg front">
  <!-- counter -->
  ${cel(s => `<path d="M150 330 h900 l14 108 h-928z" ${s}/>`, "#c8102e", "#9c0c23", 10, 6, 4)}
  <path d="M150 330 h900" stroke="#fff" stroke-width="5" opacity=".3"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${210 + i * 72} 350 v74" stroke="#9c0c23" stroke-width="5" stroke-linecap="round"/>`).join("")}
  ${cel(s => `<rect x="130" y="312" width="940" height="26" rx="8" ${s}/>`, "#f7efe0", "#d8cdb6", 6, 5, 4)}
  <!-- deli case -->
  ${cel(s => `<path d="M420 248 h300 l20 64 h-340z" ${s}/>`, "#cfeef7", "#9ccfdd", 8, 4)}
  <path d="M440 260 l-10 40 M520 256 l-14 50" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/>
  ${[470, 560, 650].map(x => cel(s => `<rect x="${x}" y="282" width="70" height="22" rx="11" ${s}/>`, "#e8b56a", "#c48f45", 4, 3, 3)
    + `<path d="M${x + 6} 288 h58" stroke="#5aa83c" stroke-width="4"/><path d="M${x + 6} 293 h58" stroke="#e04e39" stroke-width="3"/>`).join("")}
  <!-- bell = Ask -->
  ${hot("ask", "🔔 Ask the Constable", `${cel(s => `<path d="M318 312 q0 -40 34 -40 q34 0 34 40z" ${s}/>`, "#f0c443", "#c79a1f", 6, 4)}
    <rect x="312" y="308" width="80" height="8" rx="4" fill="#9a7a2a" stroke="${INK}" stroke-width="2.5"/>${cel(s => `<circle cx="352" cy="268" r="7" ${s}/>`, "#f0c443", "#c79a1f", 2, 2, 2.5)}
    <path d="M330 290 q6 -12 14 -14" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round" fill="none"/>`, 352, 262)}
  <!-- register = My Tab -->
  ${hot("tab", "💼 My Tab", `${cel(s => `<path d="M800 312 l10 -60 h100 l10 60z" ${s}/>`, "#5b6b7a", "#44515d", 7, 5)}
    ${cel(s => `<rect x="822" y="214" width="76" height="40" rx="6" ${s}/>`, "#3a4652", "#2b343d", 4, 3, 3)}
    <rect x="830" y="222" width="60" height="22" rx="3" fill="#7dff9a" stroke="${INK}" stroke-width="2"/><text x="860" y="239" text-anchor="middle" font-size="15" font-family="Lilita One, sans-serif" fill="#1f5c2d">$$$</text>
    ${[0, 1, 2].map(r => [0, 1, 2, 3].map(c2 => `<rect x="${822 + c2 * 20}" y="${264 + r * 13}" width="14" height="9" rx="2" fill="#dfe6ec" stroke="${INK}" stroke-width="1.5"/>`).join("")).join("")}`, 860, 210)}
  <!-- napkins + condiments for life -->
  ${cel(s => `<rect x="958" y="276" width="20" height="38" rx="6" ${s}/>`, "#e04e39", "#b73a28", 4, 3, 3)}${cel(s => `<rect x="984" y="276" width="20" height="38" rx="6" ${s}/>`, "#ffd23f", "#e5a91c", 4, 3, 3)}
  <path d="M962 276 l6 -14 l6 14 M988 276 l6 -14 l6 14" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  ${cel(s => `<rect x="1014" y="282" width="40" height="32" rx="4" ${s}/>`, "#c9ccd1", "#a2a6ad", 4, 3, 3)}
</svg>`;

// ------------------------------------------------------------------------------------------
// Shop front (entrance), cel-shaded, drawn from the old storefront photo.
// ------------------------------------------------------------------------------------------
ART.storefront = `
<svg viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg" class="storefront" role="img" aria-label="The Constable Hoagie shop front">
  <defs>
    <pattern id="brick" width="44" height="22" patternUnits="userSpaceOnUse">
      <rect width="44" height="22" fill="#c4553f"/><path d="M0 0.5 h44 M0 11 h44 M0 21.5 h44 M22 0 v11 M0 11 v11 M44 11 v11" stroke="#8f3428" stroke-width="2"/>
      <rect x="3" y="3" width="15" height="4" rx="2" fill="#de7a5f" opacity=".7"/><rect x="25" y="14" width="15" height="4" rx="2" fill="#de7a5f" opacity=".7"/></pattern>
    <pattern id="stripes" width="28" height="10" patternUnits="userSpaceOnUse"><rect width="14" height="10" fill="#fff8ec"/><rect x="14" width="14" height="10" fill="#3f8f5a"/></pattern>
    <pattern id="stripesR" width="28" height="10" patternUnits="userSpaceOnUse"><rect width="14" height="10" fill="#fff8ec"/><rect x="14" width="14" height="10" fill="#e8384f"/></pattern>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fc3ff"/><stop offset="1" stop-color="#d9f1ff"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a6d86"/><stop offset=".5" stop-color="#5fa2bf"/><stop offset="1" stop-color="#2f5a70"/></linearGradient>
  </defs>
  <rect width="900" height="560" fill="url(#sky)"/>
  ${[[120, 70, 1], [690, 46, .8], [420, 30, .6]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})" class="cloud">${cel(s => `<path d="M0 30 q0 -22 24 -22 q8 -18 30 -14 q20 -10 34 8 q24 0 22 28z" ${s}/>`, "#ffffff", "#d6ecf7", 0, -6, 3)}</g>`).join("")}
  <!-- building -->
  ${cel(s => `<rect x="60" y="24" width="780" height="300" ${s}/>`, "url(#brick)", "#8f3428", 0, 0, 4)}
  <rect x="60" y="24" width="780" height="300" fill="#000" opacity="0" />
  <path d="M800 24 h40 v300 h-40z" fill="#000" opacity=".12"/>
  ${cel(s => `<rect x="52" y="14" width="796" height="18" rx="3" ${s}/>`, "#7d2f27", "#5e221c", 0, -4, 3.5)}
  ${[220, 560].map(x => `${cel(s => `<rect x="${x}" y="78" width="124" height="152" rx="4" ${s}/>`, "#fbf8f0", "#d8d1c0", 6, 5, 3.5)}
    <rect x="${x + 12}" y="90" width="100" height="128" fill="url(#glass)" stroke="${INK}" stroke-width="3"/>
    <path d="M${x + 45} 90 v128 M${x + 78} 90 v128 M${x + 12} 133 h100 M${x + 12} 176 h100" stroke="#fbf8f0" stroke-width="6"/>
    <path d="M${x + 20} 100 l18 -6 M${x + 20} 112 l30 -12" stroke="#fff" stroke-width="4" opacity=".55" stroke-linecap="round"/>
    ${cel(s => `<rect x="${x - 8}" y="228" width="140" height="12" rx="3" ${s}/>`, "#efe9da", "#cfc6b0", 0, -3, 3)}`).join("")}
  <!-- corner sign -->
  <g class="corner-sign"><rect x="736" y="0" width="8" height="40" fill="${INK}"/>
    ${cel(s => `<rect x="684" y="36" width="172" height="46" rx="8" ${s}/>`, "#e8384f", "#b8243a", 6, 5, 4)}
    <text x="770" y="67" font-size="21" text-anchor="middle" fill="#ffd23f" font-family="Lilita One, sans-serif">🥪 EST. 603</text>
    ${cel(s => `<rect x="684" y="84" width="172" height="80" rx="8" ${s}/>`, "#fffdf3", "#e3dcc4", 6, 5, 4)}
    <text x="770" y="115" font-size="22" text-anchor="middle" fill="${INK}" font-family="Alfa Slab One, serif">CONSTABLE</text>
    <text x="770" y="148" font-size="27" text-anchor="middle" fill="#c8102e" font-family="Alfa Slab One, serif" stroke="${INK}" stroke-width="1">HOAGIE'S</text></g>
  <!-- cornice + storefront -->
  ${cel(s => `<rect x="46" y="300" width="808" height="24" rx="3" ${s}/>`, "#55565c", "#3c3d42", 0, -5, 3.5)}
  ${cel(s => `<rect x="60" y="324" width="780" height="198" ${s}/>`, "#34353b", "#25262b", 0, 0, 3.5)}
  ${cel(s => `<path d="M88 324 h304 l-18 42 h-268z" ${s}/>`, "url(#stripes)", "#2a6a40", 0, -8, 3.5)}
  <path d="M104 366 ${Array.from({ length: 10 }, () => "q13.5 12 27 0").join(" ")}" fill="#3f8f5a" stroke="${INK}" stroke-width="3"/>
  <path d="M104 372 h270 l-6 10 h-258z" fill="#000" opacity=".18"/>
  ${cel(s => `<rect x="96" y="376" width="98" height="140" ${s}/>`, "#fbf8f0", "#d8d1c0", 4, 4, 3)}<rect x="104" y="384" width="82" height="124" fill="url(#glass)" stroke="${INK}" stroke-width="3"/>
  ${cel(s => `<rect x="202" y="376" width="190" height="140" ${s}/>`, "#fbf8f0", "#d8d1c0", 4, 4, 3)}<rect x="210" y="384" width="174" height="124" fill="url(#glass)" stroke="${INK}" stroke-width="3"/>
  <text x="297" y="408" font-size="16" text-anchor="middle" fill="#ffd23f" font-family="Lilita One, sans-serif" stroke="${INK}" stroke-width=".8">TODAY'S PLAYS</text>
  <text x="297" y="452" font-size="36" text-anchor="middle">🥖💵🥖</text>
  <text x="297" y="490" font-size="12" text-anchor="middle" fill="#fff" font-family="Nunito, sans-serif" font-weight="900">fresh every morning</text>
  ${cel(s => `<path d="M440 324 h392 l-14 38 h-364z" ${s}/>`, "url(#stripesR)", "#b8243a", 0, -8, 3.5)}
  <path d="M452 362 ${Array.from({ length: 15 }, () => "q12.2 11 24.4 0").join(" ")}" fill="#e8384f" stroke="${INK}" stroke-width="3"/>
  ${cel(s => `<rect x="600" y="374" width="230" height="142" ${s}/>`, "#fbf8f0", "#d8d1c0", 4, 4, 3)}<rect x="608" y="382" width="214" height="126" fill="url(#glass)" stroke="${INK}" stroke-width="3"/>
  <text x="715" y="420" font-size="19" text-anchor="middle" fill="#fff" font-family="Lilita One, sans-serif" stroke="${INK}" stroke-width=".8">ITALIAN SUBS</text>
  <text x="715" y="446" font-size="15" text-anchor="middle" fill="#ffd23f" font-family="Lilita One, sans-serif">&amp; SMART PLAYS</text>
  <text x="715" y="488" font-size="28" text-anchor="middle">🫒🍅🧀</text>
  <path d="M618 392 l40 -8 M618 404 l60 -14" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>
  <g class="shop-door" tabindex="0" role="button" aria-label="Walk in">
    ${cel(s => `<rect x="470" y="368" width="118" height="152" ${s}/>`, "#fbf8f0", "#d8d1c0", 4, 4, 3)}
    ${cel(s => `<rect x="478" y="376" width="102" height="144" ${s}/>`, "#2f7a4a", "#215a36", 8, 4, 3)}
    <rect x="490" y="386" width="78" height="56" rx="4" fill="url(#glass)" stroke="${INK}" stroke-width="3"/>
    <text x="529" y="420" font-size="14" text-anchor="middle" fill="#ffd23f" font-family="Lilita One, sans-serif" stroke="${INK}" stroke-width=".6">OPEN</text>
    ${[0, 1].map(r => [0, 1].map(c2 => `<rect x="${492 + c2 * 40}" y="${454 + r * 32}" width="34" height="26" rx="3" fill="#36884f" stroke="${INK}" stroke-width="2.5"/>`).join("")).join("")}
    ${cel(s => `<circle cx="568" cy="452" r="5" ${s}/>`, "#f0c443", "#c79a1f", 2, 2, 2)}
    <g class="door-marker"><g class="bounce">${cel(s => `<path d="M516 340 h26 l-4 22 h-18z" ${s}/>`, "#ffd23f", "#e5a91c", 3, 3, 3)}<text x="529" y="357" text-anchor="middle" font-size="18" font-family="Lilita One, sans-serif" fill="${INK}">!</text></g></g>
  </g>
  ${cel(s => `<rect x="0" y="522" width="900" height="38" ${s}/>`, "#c9c3b6", "#a9a395", 0, -6, 3)}
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 80} 522 v38" stroke="#a29d93" stroke-width="2.5"/>`).join("")}
</svg>`;
