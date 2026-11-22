// Tiny SVG charts for My Tab: a net-worth line (real = solid, estimate = dashed) with a
// crosshair tooltip, and per-asset sparklines. One hue per chart; text stays in text colors.
/* global esc, THEME */
const CHART = {
  ink() { return THEME === "neon" ? { line: "#22c7e0", grid: "#2f2450", text: "#a99bd0", surface: "#120a24" } : { line: "#2380c7", grid: "#e6dccb", text: "#6d6170", surface: "#fffaf0" }; },
  money(n) { return (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: n >= 1000 ? 0 : 2 }); },

  // series: [{name, points:[{date,total}], dash:bool}]
  line(el, series, opts = {}) {
    const W = opts.width || 720, H = opts.height || 240, P = { l: 64, r: 16, t: 14, b: 28 };
    const all = series.flatMap(s => s.points);
    if (all.length < 2) { el.innerHTML = `<p class="tiny">Not enough history yet. Hoagie saves a snapshot every day; the chart fills in as you go.</p>`; return; }
    const dates = [...new Set(all.map(p => p.date))].sort();
    const xi = d => P.l + (dates.indexOf(d) / Math.max(1, dates.length - 1)) * (W - P.l - P.r);
    let lo = Math.min(...all.map(p => p.total)), hi = Math.max(...all.map(p => p.total));
    if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * .1; const floor0 = lo >= 0; lo -= pad; hi += pad; if (floor0) lo = Math.max(0, lo);
    const yi = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    const c = CHART.ink();
    const ticks = [0, 1, 2, 3].map(k => lo + (hi - lo) * k / 3);
    const xt = [0, Math.floor(dates.length / 2), dates.length - 1].map(i => dates[i]);
    const path = pts => pts.map((p, i) => `${i ? "L" : "M"}${xi(p.date).toFixed(1)} ${yi(p.total).toFixed(1)}`).join(" ");
    el.innerHTML = `<div class="chart-wrap" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opts.label || "Net worth over time")}">
        ${ticks.map(t => `<line x1="${P.l}" x2="${W - P.r}" y1="${yi(t)}" y2="${yi(t)}" stroke="${c.grid}" stroke-width="1"/>
          <text x="${P.l - 8}" y="${yi(t) + 4}" text-anchor="end" font-size="11" fill="${c.text}">${CHART.money(t)}</text>`).join("")}
        ${xt.map(d => `<text x="${xi(d)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${c.text}">${d.slice(5)}</text>`).join("")}
        ${series.map(s => s.points.length > 1 ? `<path d="${path(s.points)}" fill="none" stroke="${c.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 5" opacity=".7"' : ""}/>` : "").join("")}
        ${series.filter(s => !s.dash && s.points.length).map(s => { const p = s.points[s.points.length - 1]; return `<circle cx="${xi(p.date)}" cy="${yi(p.total)}" r="4.5" fill="${c.line}" stroke="${c.surface}" stroke-width="2"/>`; }).join("")}
        <line class="xh" x1="0" x2="0" y1="${P.t}" y2="${H - P.b}" stroke="${c.text}" stroke-width="1" opacity="0"/>
        <rect class="hit" x="${P.l}" y="${P.t}" width="${W - P.l - P.r}" height="${H - P.t - P.b}" fill="transparent"/>
      </svg>
      <div class="chart-tip" hidden></div>
      <div class="chart-legend">${series.map(s => `<span><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke="${c.line}" stroke-width="2" ${s.dash ? 'stroke-dasharray="5 5"' : ""}/></svg> ${esc(s.name)}</span>`).join("")}</div>
    </div>`;
    const svg = el.querySelector("svg"), tip = el.querySelector(".chart-tip"), xh = el.querySelector(".xh");
    el.querySelector(".hit").addEventListener("mousemove", ev => {
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
      const i = Math.round((x - P.l) / (W - P.l - P.r) * (dates.length - 1)), d = dates[Math.max(0, Math.min(dates.length - 1, i))];
      xh.setAttribute("x1", xi(d)); xh.setAttribute("x2", xi(d)); xh.setAttribute("opacity", ".6");
      const vals = series.map(s => { const p = s.points.find(q => q.date === d); return p ? `<div>${esc(s.name)}: <b>${CHART.money(p.total)}</b></div>` : ""; }).join("");
      tip.innerHTML = `<div class="tiny">${esc(d)}</div>${vals}`; tip.hidden = false;
      tip.style.left = Math.min(r.width - 180, (xi(d) / W) * r.width + 12) + "px"; tip.style.top = "8px";
    });
    el.querySelector(".hit").addEventListener("mouseleave", () => { tip.hidden = true; xh.setAttribute("opacity", "0"); });
  },

  spark(prices) {
    if (!prices || prices.length < 2) return "";
    const W = 120, H = 34, v = prices.map(p => p[1]), lo = Math.min(...v), hi = Math.max(...v) || 1;
    const pts = v.map((y, i) => `${(i / (v.length - 1) * W).toFixed(1)},${(H - 3 - (y - lo) / ((hi - lo) || 1) * (H - 6)).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${CHART.ink().line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  },
};
