// Neon Galactic theme art: the same shop layout and hotspots as the original, drawn as a
// night-time galactic sub shop. Original art; uses hot() and the ART object from art.js.
/* global ART, hot, uid */
ART.NEON = {};
(() => {
  const M = "#ff3df2", C = "#3df5ff", L = "#b8ff4a", G = "#ffcf6b", V = "#7a3cff";
  const glow = id => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const panel = (x, y, w, h, col, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#0a1222" opacity=".88"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="${col}" stroke-width="2.5" filter="url(#${f})"/>`;
  const marker = () => "";  // markers come from hot()

  ART.NEON.sceneBack = (() => {
    const f = uid("ng");
    const stars = Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 197) % 1200}" cy="${(i * 53) % 150 + 6}" r="${i % 5 ? 1 : 1.8}" fill="#fff" opacity="${.3 + (i % 4) * .15}"/>`).join("");
    const towers = [[0, 120, 70], [64, 80, 54], [112, 140, 80], [186, 96, 50], [230, 60, 70], [296, 130, 60], [350, 90, 84], [430, 150, 56], [480, 70, 64],
      [540, 120, 90], [624, 84, 50], [668, 140, 70], [732, 60, 58], [786, 110, 80], [860, 74, 54], [908, 130, 76], [978, 90, 60], [1032, 150, 70], [1096, 70, 104]];
    const windows = towers.map(([x, h, w], k) => Array.from({ length: 6 }, (_, j) => `<rect x="${x + 8 + (j % 3) * (w / 3.4)}" y="${262 - h + 14 + Math.floor(j / 3) * 22 + (k % 3) * 9}" width="5" height="7" fill="${[G, C, M][(k + j) % 3]}" opacity="${(k + j) % 4 ? .7 : .25}"/>`).join("")).join("");
    return `<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" class="scene-svg neon">
  <defs>${glow(f)}
    <linearGradient id="${f}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140630"/><stop offset=".6" stop-color="#4a1470"/><stop offset="1" stop-color="#ff3d9a"/></linearGradient>
    <radialGradient id="${f}p" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#b9f3ff"/><stop offset=".5" stop-color="#4fa3d9"/><stop offset="1" stop-color="#1d1450"/></radialGradient>
    <pattern id="${f}t" width="48" height="24" patternUnits="userSpaceOnUse"><rect width="48" height="24" fill="#1a1236"/><rect x="2" y="2" width="44" height="20" rx="2" fill="#241848"/><rect x="4" y="4" width="18" height="3" rx="1.5" fill="${C}" opacity=".12"/></pattern>
    <filter id="${f}b"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <!-- panoramic window onto the neon city -->
  <rect width="1200" height="262" fill="url(#${f}s)"/>${stars}
  <circle cx="1040" cy="66" r="38" fill="url(#${f}p)"/><ellipse cx="1040" cy="68" rx="68" ry="11" fill="none" stroke="#c9b8ff" stroke-width="3" opacity=".7" transform="rotate(-14 1040 68)"/>
  <path d="M168 34 a18 18 0 1 0 13 30 a14 14 0 1 1 -13 -30z" fill="#ffe9c9" opacity=".9"/>
  <g fill="#0c0618">${towers.map(([x, h, w]) => `<rect x="${x}" y="${262 - h}" width="${w}" height="${h}"/>`).join("")}</g>${windows}
  <path d="M0 200 C300 176 640 190 1200 160" stroke="${M}" stroke-width="2.5" fill="none" opacity=".6" filter="url(#${f})"/>
  <g class="hovercar"><path d="M860 164 q12 -10 34 -9 q20 2 26 10 q-30 9 -60 -1z" fill="#1b0f30" stroke="${C}" stroke-width="2"/><ellipse cx="888" cy="176" rx="22" ry="3.5" fill="${C}" opacity=".7" filter="url(#${f})"/></g>
  <g stroke="#2f2450" stroke-width="10">${[240, 480, 720, 960].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="262"/>`).join("")}</g>
  <rect x="0" y="252" width="1200" height="12" fill="#0d0819"/><rect x="0" y="252" width="1200" height="2" fill="${M}" filter="url(#${f})"/>
  <!-- wall tile below the window -->
  <rect x="0" y="264" width="1200" height="158" fill="url(#${f}t)"/>
  <ellipse cx="600" cy="300" rx="320" ry="110" fill="${V}" opacity=".18" filter="url(#${f}b)"/>
  <!-- pendant neon rings -->
  ${[260, 600, 940].map((x, i) => `<path d="M${x} 0 v52" stroke="#2f2450" stroke-width="3"/><ellipse cx="${x}" cy="62" rx="30" ry="9" fill="none" stroke="${[M, C, M][i]}" stroke-width="4" filter="url(#${f})"/>`).join("")}
  <!-- Connect: holo power panel -->
  ${hot("connect", "🔌 Connect Counter", `${panel(42, 120, 96, 120, C, f)}
    ${[0, 1, 2].map(i => `<circle cx="${70 + i * 20}" cy="152" r="6" fill="${[L, G, L][i]}" filter="url(#${f})"/>`).join("")}
    <path d="M86 176 l-10 22 h14 l-7 24 l22 -32 h-14 l7 -14z" fill="${G}" filter="url(#${f})"/>`, 90, 116)}
  <!-- News: holo board -->
  ${hot("news", "📰 News Rail", `${panel(190, 96, 250, 140, C, f)}
    <text x="315" y="134" text-anchor="middle" font-size="24" font-family="Anton, Impact, sans-serif" letter-spacing="2" fill="${C}">TODAY'S NEWS</text>
    <path d="M214 156 h130 M214 178 h180 M214 200 h100" stroke="#d9f9ff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
    <circle cx="404" cy="200" r="10" fill="${M}" filter="url(#${f})"/>`, 315, 92)}
  <!-- Playbook: holo menu -->
  ${hot("playbook", "📋 Build a Playbook", `${panel(470, 86, 260, 150, M, f)}
    <text x="600" y="124" text-anchor="middle" font-size="26" font-family="Anton, Impact, sans-serif" letter-spacing="2" fill="#fff">PLAYBOOK MENU</text>
    <g font-family="Inter, sans-serif" font-weight="800" font-size="15">
      <text x="496" y="158" fill="${M}">SAME DAY</text><text x="704" y="158" text-anchor="end" fill="#d9f9ff">HOT</text>
      <text x="496" y="184" fill="${C}">2 DAYS – 4 WKS</text><text x="704" y="184" text-anchor="end" fill="#d9f9ff">FRESH</text>
      <text x="496" y="210" fill="${L}">LONG HAUL</text><text x="704" y="210" text-anchor="end" fill="#d9f9ff">SLOW</text></g>`, 600, 82)}
  <!-- Lotto: neon number machine -->
  ${hot("lotto", "🎟️ Lucky Tickets", `${panel(760, 104, 150, 132, V, f)}
    ${[0, 1, 2].map(i => `<circle cx="${800 + i * 35}" cy="146" r="13" fill="#0b0616" stroke="${[M, C, L][i]}" stroke-width="2.5"/><text x="${800 + i * 35}" y="152" text-anchor="middle" font-size="14" font-family="Anton, sans-serif" fill="#fff">${[7, 23, 41][i]}</text>`).join("")}
    <text x="835" y="202" text-anchor="middle" font-size="20" font-family="Monoton, Anton, sans-serif" fill="none" stroke="${G}" stroke-width="1.2" filter="url(#${f})">LUCKY</text>`, 835, 100)}
  <!-- Health: glowing grade -->
  ${hot("health", "🩺 Health Inspector", `${panel(952, 104, 96, 120, L, f)}
    <text x="1000" y="132" text-anchor="middle" font-size="11" font-family="Inter, sans-serif" font-weight="900" letter-spacing="2" fill="${L}">HEALTH</text>
    <text x="1000" y="196" text-anchor="middle" font-size="56" font-family="Anton, Impact, sans-serif" fill="${L}" filter="url(#${f})" class="grade">A</text>`, 1000, 100)}
  <!-- Avatar: holo mirror -->
  ${hot("avatar", "🧑‍🚀 Make Your Avatar", `<ellipse cx="1124" cy="170" rx="50" ry="70" fill="#0a1222" opacity=".9"/><ellipse cx="1124" cy="170" rx="50" ry="70" fill="none" stroke="${M}" stroke-width="3" filter="url(#${f})"/>
    <ellipse cx="1124" cy="170" rx="38" ry="58" fill="none" stroke="${C}" stroke-width="1.5" opacity=".6"/><path d="M1104 136 l24 -18 M1100 160 l40 -30" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>`, 1124, 96)}
  <!-- floor: dark, reflective, perspective grid -->
  <rect x="0" y="420" width="1200" height="140" fill="#0d0819"/>
  <g stroke="#3a2a66" stroke-width="1" opacity=".7">${[446, 476, 512, 556].map(y => `<line x1="0" y1="${y}" x2="1200" y2="${y}"/>`).join("")}
    ${[-600, -360, -160, 0, 160, 360, 600].map(d => `<line x1="600" y1="420" x2="${600 + d * 2.2}" y2="560"/>`).join("")}</g>
  <path d="M0 420 h1200" stroke="${M}" stroke-width="2" filter="url(#${f})"/>
</svg>`;
  })();

  ART.NEON.sceneFront = (() => {
    const f = uid("nf");
    return `<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" class="scene-svg front neon">
  <defs>${glow(f)}
    <linearGradient id="${f}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4dcff"/><stop offset=".45" stop-color="#8a7ab8"/><stop offset="1" stop-color="#2a1d48"/></linearGradient>
    <linearGradient id="${f}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1550"/><stop offset="1" stop-color="#120a26"/></linearGradient>
    <linearGradient id="${f}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}" stop-opacity=".3"/><stop offset="1" stop-color="${C}" stop-opacity=".05"/></linearGradient>
  </defs>
  <!-- counter -->
  <path d="M150 330 h900 l14 108 h-928z" fill="url(#${f}c)"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${260 + i * 140} 346 v80" stroke="#3a2470" stroke-width="2"/>`).join("")}
  <path d="M138 434 h924" stroke="${M}" stroke-width="5" filter="url(#${f})"/>
  <rect x="130" y="312" width="940" height="22" rx="7" fill="url(#${f}t)"/><rect x="130" y="332" width="940" height="2" fill="${C}" opacity=".8"/>
  <!-- glass case with glowing subs -->
  <path d="M420 248 h300 l20 64 h-340z" fill="url(#${f}g)" stroke="${C}" stroke-width="2"/>
  <g filter="url(#${f})">${[470, 560, 650].map((x, i) => `<rect x="${x}" y="282" width="70" height="20" rx="10" fill="#e0a24a"/><path d="M${x + 6} 288 h58" stroke="${[L, "#ff4f6d", "#ff9ad5"][i]}" stroke-width="3"/>`).join("")}</g>
  <!-- bell = Ask -->
  ${hot("ask", "🔔 Ask the Constable", `<path d="M318 312 q0 -40 34 -40 q34 0 34 40z" fill="#1b1036" stroke="${G}" stroke-width="3" filter="url(#${f})"/>
    <rect x="312" y="308" width="80" height="8" rx="4" fill="#2a1d48" stroke="${G}" stroke-width="2"/><circle cx="352" cy="268" r="7" fill="${G}" filter="url(#${f})"/>`, 352, 262)}
  <!-- holo register = My Tab -->
  ${hot("tab", "💼 My Tab", `<path d="M800 312 l10 -60 h100 l10 60z" fill="#151030" stroke="${V}" stroke-width="2.5"/>
    <rect x="822" y="226" width="76" height="26" rx="4" fill="#0b2230" stroke="${C}" stroke-width="2"/>
    <text x="860" y="246" text-anchor="middle" font-size="18" font-family="Anton, Impact, sans-serif" fill="${C}" filter="url(#${f})">$$$</text>
    ${[0, 1, 2].map(r => [0, 1, 2, 3].map(c2 => `<rect x="${822 + c2 * 20}" y="${264 + r * 13}" width="14" height="9" rx="2" fill="#2a1d48" stroke="${C}" stroke-width="1" opacity=".9"/>`).join("")).join("")}`, 860, 222)}
  <!-- plasma slicer + condiments -->
  <circle cx="1000" cy="286" r="26" fill="#1a1236" stroke="#9a8ad0" stroke-width="3"/><circle cx="1000" cy="286" r="20" fill="none" stroke="${M}" stroke-width="3" filter="url(#${f})"/>
  <rect x="960" y="304" width="80" height="10" rx="3" fill="#2a1d48"/>
</svg>`;
  })();

  // Constable Hoagie, neon edition. Same shape as the mockup; classes match the original
  // animations (head = nod, mouth = talk, armR = wave).
  ART.NEON.hoagie = (eyes3 = false) => {
    const u = uid("nh");
    return `<svg viewBox="0 0 420 600" xmlns="http://www.w3.org/2000/svg" class="hoagie-neon" aria-label="Constable Hoagie">
  <defs>
    <radialGradient id="${u}sk" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#f3c8a6"/><stop offset=".5" stop-color="#cf8f6a"/><stop offset="1" stop-color="#6a3a3c"/></radialGradient>
    <linearGradient id="${u}al" x1="0" x2="1"><stop offset="0" stop-color="#7a3f4a"/><stop offset=".35" stop-color="#c98a68"/><stop offset=".7" stop-color="#e2a988"/><stop offset="1" stop-color="#9b5e4c"/></linearGradient>
    <linearGradient id="${u}ar" x1="0" x2="1"><stop offset="0" stop-color="#9b5e4c"/><stop offset=".35" stop-color="#d79b78"/><stop offset=".75" stop-color="#b87458"/><stop offset="1" stop-color="#3a2a5a"/></linearGradient>
    <linearGradient id="${u}hm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3590"/><stop offset=".45" stop-color="#1e1440"/><stop offset="1" stop-color="#0a0716"/></linearGradient>
    <linearGradient id="${u}bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#62452f"/><stop offset=".6" stop-color="#3c2a1e"/><stop offset="1" stop-color="#22160f"/></linearGradient>
    <linearGradient id="${u}ap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ece6f6"/><stop offset=".6" stop-color="#b5a9cc"/><stop offset="1" stop-color="#5a4c78"/></linearGradient>
    <linearGradient id="${u}tk" x1="0" x2="1"><stop offset="0" stop-color="#3a2d5a"/><stop offset=".45" stop-color="#15101f"/><stop offset="1" stop-color="#06040a"/></linearGradient>
    <linearGradient id="${u}ln" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fd8" stop-opacity=".5"/><stop offset=".5" stop-color="#1b1030" stop-opacity=".15"/><stop offset="1" stop-color="#3df5ff" stop-opacity=".45"/></linearGradient>
    <linearGradient id="${u}bn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#b8701e"/></linearGradient>
    <filter id="${u}g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${u}h" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="${u}r"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="${u}f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>
    <clipPath id="${u}cl"><path d="M142 300 Q100 300 90 348 L78 432 Q74 470 82 500 L114 502 Q118 466 122 432 L134 362 Z"/></clipPath>
  </defs>
  <ellipse cx="210" cy="300" rx="150" ry="230" fill="#7a3cff" opacity=".3" filter="url(#${u}h)"/>
  <path d="M146 520 L142 600 L204 600 L210 548 L216 600 L278 600 L274 520 Z" fill="#2a2640"/>
  <path d="M130 298 Q210 282 290 298 L302 526 Q210 544 118 526 Z" fill="url(#${u}tk)"/>
  <path d="M142 300 Q100 300 90 348 L78 432 Q74 470 82 500 L114 502 Q118 466 122 432 L134 362 Z" fill="url(#${u}al)"/>
  <g clip-path="url(#${u}cl)" fill="none" stroke-linecap="round">
    <circle cx="112" cy="345" r="14" stroke="#1d2238" stroke-width="3" opacity=".8"/><ellipse cx="112" cy="345" rx="26" ry="6" stroke="#7a5cff" stroke-width="2" opacity=".85" transform="rotate(-20 112 345)"/>
    <path d="M96 400 q20 10 12 30 q-8 18 10 30" stroke="#1d2238" stroke-width="4" opacity=".75"/><path d="M82 440 q14 -6 24 4 q8 10 22 4" stroke="#ff3df2" stroke-width="2" opacity=".6"/>
    <path d="M84 470 h32 M84 480 h30" stroke="#1d2238" stroke-width="3" opacity=".7"/></g>
  <ellipse cx="98" cy="512" rx="18" ry="20" fill="#c98a68"/>
  <path d="M90 300 Q80 340 78 432 Q74 470 82 500" fill="none" stroke="#ff3df2" stroke-width="4" filter="url(#${u}r)" opacity=".9"/>
  <path d="M280 300 Q322 302 332 346 L342 410 L302 442 L298 360 Z" fill="url(#${u}ar)"/>
  <path d="M300 320 q20 8 30 30" stroke="#1d2238" stroke-width="4" opacity=".75" fill="none"/>
  <path d="M290 298 Q330 304 336 350 L344 408" fill="none" stroke="#3df5ff" stroke-width="4" filter="url(#${u}r)" opacity=".9"/>
  <path d="M176 300 L190 262 M244 300 L230 262" stroke="#cfc6e0" stroke-width="5"/>
  <path d="M160 330 L260 330 L268 400 Q300 410 302 430 L302 548 Q210 564 118 548 L118 430 Q120 410 152 400 Z" fill="url(#${u}ap)"/>
  <ellipse cx="160" cy="470" rx="16" ry="9" fill="#7a5a48" opacity=".22"/><ellipse cx="248" cy="508" rx="12" ry="7" fill="#7a5a48" opacity=".2"/>
  <rect x="180" y="356" width="60" height="32" rx="6" fill="#160c26" stroke="#ff3df2" stroke-width="2" filter="url(#${u}g)"/>
  <text x="210" y="380" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="20" letter-spacing="2" fill="#ff8af0">CH</text>
  <g class="head">
    <ellipse cx="149" cy="172" rx="12" ry="20" fill="#c98a68"/><ellipse cx="271" cy="172" rx="12" ry="20" fill="#b07258"/>
    <ellipse cx="210" cy="160" rx="61" ry="75" fill="url(#${u}sk)"/>
    <path d="M152 180 Q150 140 168 116" fill="none" stroke="#ff3df2" stroke-width="4" filter="url(#${u}r)" opacity=".85"/>
    <path d="M268 180 Q270 140 252 116" fill="none" stroke="#3df5ff" stroke-width="4" filter="url(#${u}r)" opacity=".85"/>
    <path d="M166 140 Q184 130 202 139" stroke="#3a281e" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M218 139 Q236 130 254 140" stroke="#3a281e" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="185" cy="162" rx="7" ry="4.5" fill="#f6efe8"/><circle cx="186" cy="162" r="3.6" fill="#3b2a1e"/>
    <ellipse cx="235" cy="162" rx="7" ry="4.5" fill="#f6efe8"/><circle cx="236" cy="162" r="3.6" fill="#3b2a1e"/>
    <g class="eye3" ${eyes3 ? "" : 'style="display:none"'}><ellipse cx="210" cy="128" rx="10" ry="7" fill="#f6efe8" stroke="#3a281e" stroke-width="2"/><circle cx="210" cy="128" r="4.5" fill="#2fd17a"/><circle cx="211" cy="127" r="1.4" fill="#fff"/></g>
    <path d="M210 168 Q203 192 197 199 Q210 206 223 199 Q217 192 210 168 Z" fill="#a8684e" opacity=".65"/>
    <g filter="url(#${u}f)">
      <path d="M148 168 Q144 218 166 254 Q188 290 210 298 Q232 290 254 254 Q276 218 272 168 Q262 198 246 206 Q228 216 210 214 Q192 216 174 206 Q158 198 148 168 Z" fill="url(#${u}bd)"/>
      <path d="M180 206 Q196 194 210 203 Q224 194 240 206 Q228 220 210 214 Q192 220 180 206 Z" fill="#3e2a1f"/></g>
    <g stroke="#8a6448" stroke-width="1.6" stroke-linecap="round" opacity=".55" fill="none"><path d="M168 222 q4 12 2 22"/><path d="M182 234 q3 14 0 26"/><path d="M198 240 q2 16 0 30"/><path d="M222 240 q-2 16 0 30"/><path d="M238 234 q-3 14 0 26"/><path d="M252 222 q-4 12 -2 22"/></g>
    <path class="mouth" d="M199 224 Q210 229 221 224" stroke="#1e0f0a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="185" cy="161" r="22" fill="url(#${u}ln)" stroke="#0b0710" stroke-width="5"/><circle cx="235" cy="161" r="22" fill="url(#${u}ln)" stroke="#0b0710" stroke-width="5"/>
    <path d="M207 158 Q210 153 213 158" stroke="#0b0710" stroke-width="4" fill="none"/><path d="M163 158 L150 160 M257 158 L270 160" stroke="#0b0710" stroke-width="4"/>
    <path d="M142 124 Q138 60 174 32 Q210 6 246 32 Q282 60 278 124 Z" fill="url(#${u}hm)"/>
    <path d="M154 110 Q150 66 180 40" stroke="#c9b8ff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>
    <circle cx="210" cy="14" r="7" fill="#c9b8ff"/><circle cx="210" cy="14" r="3" fill="#3df5ff" filter="url(#${u}g)"/>
    <ellipse cx="210" cy="124" rx="78" ry="12" fill="#0f0a20" stroke="#7a3cff" stroke-width="2.5" filter="url(#${u}g)"/>
    <g filter="url(#${u}g)"><path d="M210 56 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#3df5ff"/><rect x="200" y="76" width="20" height="7" rx="3.5" fill="#0b0616"/></g>
  </g>
  <g class="armR">
    <path d="M342 404 Q346 432 322 448 L262 474 L252 450 L306 418 Z" fill="url(#${u}ar)"/>
    <ellipse cx="226" cy="470" rx="70" ry="22" fill="#ffb347" opacity=".5" filter="url(#${u}h)"/>
    <rect x="160" y="452" width="132" height="34" rx="17" fill="url(#${u}bn)"/>
    <path d="M166 466 q11 -8 22 0 t22 0 t22 0 t22 0 t22 0 t8 0" stroke="#b8ff4a" stroke-width="4" fill="none" filter="url(#${u}g)"/>
    <path d="M168 474 h120" stroke="#ff4f8a" stroke-width="5" filter="url(#${u}g)"/>
    <ellipse cx="252" cy="462" rx="17" ry="19" fill="#d29674"/>
  </g>
</svg>`;
  };
})();
