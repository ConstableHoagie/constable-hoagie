// Hoagie's School (Money 101 + Investing 101) and the Money Plan maker.
// Bite-sized on purpose: each lesson is 3 bullets, one thing to try, one quick check.
/* global PANELS, $, $$, esc, money, signed, LS, say, Music, printDoc, toast */

const COURSES = {
  money: {
    title: "Money 101", emoji: "🍞", blurb: "The bread: budgeting, safety nets, debt and credit.",
    lessons: [
      { e: "🧾", t: "Where does it all go?", b: [
          "You can't steer money you can't see. For one month, write down (or export) every purchase.",
          "Sort each one: <b>needs</b> (rent, food, bills), <b>wants</b> (fun stuff), <b>future you</b> (savings, debt payoff).",
          "A common starting rule is <b>50/30/20</b>: half on needs, 30% on wants, 20% to future you. It's a starting point, not a law."],
        try: "Open your bank app and add up last month's top 3 spending categories.",
        q: "In the 50/30/20 rule, what's the 20% for?", a: ["Wants", "Savings and debt payoff", "Rent"], c: 1 },
      { e: "🛟", t: "The safety net (emergency fund)", b: [
          "An emergency fund stops a car repair from turning into credit card debt.",
          "Start with a small starter fund (around $1,000 or one month of bills), then grow it to <b>3–6 months of essential bills</b>.",
          "Keep it boring and reachable: a high-yield savings account, not stocks or crypto."],
        try: "Open a separate savings account and name it \"Do Not Touch\".",
        q: "Where should an emergency fund live?", a: ["Bitcoin", "A high-yield savings account", "A sports bet that's a lock"], c: 1 },
      { e: "⛓️", t: "Beating debt", b: [
          "Always pay at least the minimum on everything, so you avoid late fees and credit damage.",
          "<b>Avalanche</b>: extra money goes to the highest interest rate first. Saves the most money.",
          "<b>Snowball</b>: extra money goes to the smallest balance first. Quick wins keep you motivated. Pick the one you'll actually stick with."],
        try: "List your debts with their interest rates, highest at the top.",
        q: "Which method saves the most interest?", a: ["Avalanche (highest rate first)", "Snowball (smallest balance first)", "Paying only minimums"], c: 0 },
      { e: "📊", t: "Credit scores, decoded", b: [
          "The two biggest pieces: <b>paying on time</b> and <b>how much of your limit you use</b>.",
          "Try to keep card balances well under 30% of your limits; lower is better.",
          "Check your credit reports free at <b>AnnualCreditReport.com</b>, the official site, and dispute anything wrong."],
        try: "Set every card to autopay at least the minimum.",
        q: "What helps your score most?", a: ["Opening lots of cards", "Paying on time, every time", "Checking your own score"], c: 1 },
      { e: "🧮", t: "Taxes without tears", b: [
          "Tax brackets are <b>marginal</b>: a raise only taxes the extra dollars at the higher rate. A raise never lowers your take-home.",
          "New Hampshire and Texas don't tax wages, but federal income tax still applies.",
          "Gambling and lottery winnings are taxable income. Keep records of wins <i>and</i> losses."],
        try: "Find last year's tax return and look at your total tax vs. your income.",
        q: "You get a raise into a higher bracket. Your take-home pay…", a: ["Goes down", "Goes up", "Stays exactly the same"], c: 1 },
      { e: "🤖", t: "Pay yourself first, automatically", b: [
          "Willpower runs out; automation doesn't. Move savings out on payday, before you can spend it.",
          "Set an automatic transfer from checking to savings the day after payday.",
          "Start small (even $20) and bump it up 1% whenever you get a raise."],
        try: "Schedule one automatic transfer for your next payday.",
        q: "Best time to move money to savings?", a: ["Whatever's left at month-end", "Right after payday, automatically", "Only after a big win"], c: 1 },
    ],
  },
  invest: {
    title: "Investing 101", emoji: "🥩", blurb: "The meat: compounding, index funds, accounts and risk.",
    lessons: [
      { e: "❄️", t: "Compounding: the snowball", b: [
          "Your returns earn their own returns. Time does most of the work.",
          "Example: $100 a month for 30 years is $36,000 put in. At an assumed 7% a year it grows to about <b>$122,000</b>.",
          "7% is an assumption for illustration, not a promise. Some years are down, some are up."],
        try: "Use the Money Plan button to see your own 10-year projection.",
        q: "What does compounding need most?", a: ["Time", "Luck", "Hot tips"], c: 0 },
      { e: "🥪", t: "Stocks, bonds and cash", b: [
          "<b>Stocks</b>: you own a slice of companies. Highest long-run growth, biggest swings.",
          "<b>Bonds</b>: you lend money for interest. Steadier, lower growth.",
          "<b>Cash</b> (savings, T-bills): safest, but can lose ground to inflation over long periods."],
        try: "Look up what's inside your 401(k) or IRA, if you have one.",
        q: "Which usually swings the most?", a: ["Cash", "Bonds", "Stocks"], c: 2 },
      { e: "🧺", t: "Index funds and fees", b: [
          "An index fund buys the whole market (like the S&P 500) in one go. Instant diversification.",
          "Fees matter: $10,000 for 30 years at 7% is about $76,000; at 6% (a 1% fee) it's about $57,000.",
          "Look for a low <b>expense ratio</b>. Many broad index funds charge well under 0.1% a year."],
        try: "Find the expense ratio of one fund you own or are curious about.",
        q: "Why do low fees matter so much?", a: ["They compound against you", "They don't", "They make funds riskier"], c: 0 },
      { e: "🏦", t: "The right accounts", b: [
          "If your job matches 401(k) contributions, put in at least enough to get the full match. It's free money.",
          "IRAs: <b>Roth</b> = pay tax now, tax-free later. <b>Traditional</b> = tax break now, taxed later.",
          "Contribution limits change yearly. Check this year's numbers at irs.gov."],
        try: "Ask HR (or check your benefits site) what your 401(k) match is.",
        q: "Your employer matches 401(k) contributions. You should…", a: ["Skip it", "Contribute at least enough for the full match", "Wait until you're 50"], c: 1 },
      { e: "⏳", t: "Risk and time", b: [
          "Money you'll need within about 5 years shouldn't ride on stocks.",
          "Long-term money can handle swings because it has time to recover.",
          "<b>Dollar-cost averaging</b>: invest the same amount on a schedule, rain or shine, so you never have to time the market."],
        try: "Split your goals into 'under 5 years' and '5+ years'.",
        q: "Saving for a car next year. Best home for that money?", a: ["Stocks", "High-yield savings", "Crypto"], c: 1 },
      { e: "🎰", t: "Investing vs. speculating", b: [
          "Sports bets, lottery tickets and day-trading are <b>speculation</b>. The house's cut means the average result is a loss.",
          "That's fine as entertainment: give it a fixed fun-money budget you can afford to lose.",
          "Hoagie shows the expected return on every pick so you always know which one you're doing."],
        try: "Pick a monthly fun-money cap and set it in Hoagie's budget.",
        q: "Average long-run result of lottery tickets?", a: ["A profit", "A loss", "Break even"], c: 1 },
    ],
  },
};

function learnDone() { return LS.get("learn-done", {}); }
function lessonKey(cid, i) { return cid + ":" + i; }

PANELS.learn = (body, arg) => {
  const done = learnDone();
  const total = Object.values(COURSES).reduce((n, c) => n + c.lessons.length, 0);
  const got = Object.keys(done).length;
  body.innerHTML = `<h2>📚 Hoagie's School</h2>
    <p class="lead">Bite-sized lessons. Each one takes about a minute. Earn a ⭐ per lesson (${got}/${total} so far).</p>
    <div class="xp"><div style="width:${Math.round(got / total * 100)}%"></div></div>
    <div class="courses">${Object.entries(COURSES).map(([cid, c]) => {
      const n = c.lessons.filter((_, i) => done[lessonKey(cid, i)]).length;
      return `<button class="course" data-c="${cid}"><span class="ce">${c.emoji}</span><b>${c.title}</b><span class="tiny">${c.blurb}</span><span class="stars">${c.lessons.map((_, i) => done[lessonKey(cid, i)] ? "⭐" : "☆").join("")}</span><span class="tiny">${n}/${c.lessons.length} done</span></button>`;
    }).join("")}</div>
    <p class="fine">General education, not personal financial advice.</p>`;
  $$(".course", body).forEach(b => b.onclick = () => { Music.blip(); showCourse(body, b.dataset.c); });
  if (arg && COURSES[arg]) showCourse(body, arg);
};

function showCourse(body, cid) {
  const c = COURSES[cid], done = learnDone();
  body.innerHTML = `<button class="btn" id="l-back">◀ All courses</button>
    <h2>${c.emoji} ${c.title}</h2>
    <div class="lessons">${c.lessons.map((l, i) => `<button class="lesson ${done[lessonKey(cid, i)] ? "done" : ""}" data-i="${i}"><span>${l.e}</span> ${i + 1}. ${esc(l.t)} ${done[lessonKey(cid, i)] ? "⭐" : ""}</button>`).join("")}</div>`;
  $("#l-back", body).onclick = () => PANELS.learn(body);
  $$(".lesson", body).forEach(b => b.onclick = () => showLesson(body, cid, +b.dataset.i));
}

function showLesson(body, cid, i) {
  const c = COURSES[cid], l = c.lessons[i];
  body.innerHTML = `<button class="btn" id="l-back">◀ ${c.title}</button>
    <article class="lesson-card">
      <div class="tiny">${c.title} · lesson ${i + 1} of ${c.lessons.length}</div>
      <h2>${l.e} ${esc(l.t)}</h2>
      <ul class="bites">${l.b.map(x => `<li>${x}</li>`).join("")}</ul>
      <div class="try">🎯 <b>Try this:</b> ${esc(l.try)}</div>
      <div class="check"><b>Quick check:</b> ${esc(l.q)}
        <div class="row">${l.a.map((a, j) => `<button class="btn ans" data-j="${j}">${esc(a)}</button>`).join("")}</div>
        <div id="l-res" class="tiny"></div></div>
      <div class="row"><button class="btn" id="l-prev" ${i === 0 ? "disabled" : ""}>◀ Back</button>
        <button class="btn go" id="l-next">${i + 1 < c.lessons.length ? "Next lesson ▶" : "Finish course 🎓"}</button></div>
    </article>`;
  $("#l-back", body).onclick = () => showCourse(body, cid);
  $("#l-prev", body).onclick = () => showLesson(body, cid, i - 1);
  $("#l-next", body).onclick = () => i + 1 < c.lessons.length ? showLesson(body, cid, i + 1) : showCourse(body, cid);
  $$(".ans", body).forEach(b => b.onclick = () => {
    const ok = +b.dataset.j === l.c;
    $$(".ans", body).forEach(x => { x.disabled = true; if (+x.dataset.j === l.c) x.classList.add("go"); });
    if (!ok) b.classList.add("wrong");
    $("#l-res", body).textContent = ok ? "Nailed it. ⭐ earned!" : "Close! The green one's right. Star earned anyway for showing up.";
    const d = learnDone(); const first = !d[lessonKey(cid, i)]; d[lessonKey(cid, i)] = true; LS.set("learn-done", d);
    if (first) { Music.blip("coin"); say(ok ? "Look at you. Smarter than my sourdough starter." : "Hey, wrong answers are how the bread rises. Star's yours.", [], 4000); }
  });
}

// ---------- Money Plan maker ----------
// Everything is computed here in the browser from what you type. Nothing is saved except your last answers (on this device).
const PLAN_RISK = {   // long-term mix and the assumed yearly returns (bad / typical / good) used for the 10-year picture
  1: { stocks: 40, bonds: 60, crypto: 0, fun: 0, months: 6, r: [0.01, 0.045, 0.07] },
  2: { stocks: 60, bonds: 40, crypto: 0, fun: 2, months: 6, r: [0.00, 0.055, 0.085] },
  3: { stocks: 75, bonds: 20, crypto: 5, fun: 4, months: 4, r: [-0.01, 0.06, 0.10] },
  4: { stocks: 85, bonds: 5, crypto: 10, fun: 7, months: 3, r: [-0.02, 0.065, 0.115] },
  5: { stocks: 85, bonds: 0, crypto: 15, fun: 10, months: 3, r: [-0.04, 0.07, 0.13] },
};
const AUTONOMY = {
  manual: { label: "I do it", emoji: "✋", how: "Hoagie gives you a checklist; you move the money yourself each payday." },
  hybrid: { label: "Hoagie helps", emoji: "🤝", how: "Hoagie keeps this plan and your fun-money cap; on payday you open it and tick through the moves." },
  auto: { label: "Autopilot", emoji: "🤖", how: "You set up automatic transfers and recurring buys once; they run every payday within your limits." },
};

function monthsToPayoff(balance, apr, pay) {
  if (balance <= 0) return 0;
  if (pay <= 0) return Infinity;
  const r = apr / 100 / 12;
  if (r === 0) return Math.ceil(balance / pay);
  if (pay <= balance * r) return Infinity;
  return Math.ceil(-Math.log(1 - r * balance / pay) / Math.log(1 + r));
}
function fv(monthly, rate, years, start = 0) {
  const r = rate / 12, n = years * 12;
  return r === 0 ? start + monthly * n : start * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
}
const dollars = n => (n < 0 ? "−$" : "$") + Math.round(Math.abs(n)).toLocaleString();

function buildPlan(p) {
  const R = PLAN_RISK[p.risk], spare = Math.max(0, p.pay - p.bills);
  const starter = Math.min(1000, p.bills || 1000), full = p.bills * R.months;
  const fun = Math.min(spare * 0.5, p.pay * R.fun / 100);
  const usable = spare - fun;
  let stage, split;
  if (p.saved < starter) { stage = "Starter safety net"; split = { safety: 0.7, debt: p.debt > 0 ? 0.3 : 0, invest: p.debt > 0 ? 0 : 0.3 }; }
  else if (p.debt > 0 && p.apr >= 8) { stage = "Knock out high-interest debt"; split = { safety: 0.1, debt: 0.8, invest: 0.1 }; }
  else if (p.saved < full) { stage = "Finish the safety net"; split = { safety: 0.5, debt: p.debt > 0 ? 0.2 : 0, invest: p.debt > 0 ? 0.3 : 0.5 }; }
  else { stage = "Grow it"; split = { safety: 0, debt: p.debt > 0 ? 0.3 : 0, invest: p.debt > 0 ? 0.7 : 1 }; }
  const m = { safety: usable * split.safety, debt: usable * split.debt, invest: usable * split.invest, fun };
  const debtPay = m.debt;
  const payoff = monthsToPayoff(p.debt, p.apr, debtPay);
  const toFull = m.safety > 0 ? Math.ceil(Math.max(0, full - p.saved) / m.safety) : (p.saved >= full ? 0 : Infinity);
  const inv = { stocks: m.invest * R.stocks / 100, bonds: m.invest * R.bonds / 100, crypto: m.invest * R.crypto / 100 };
  const tenYr = R.r.map(r => fv(m.invest, r, 10));
  return { R, spare, starter, full, m, stage, payoff, toFull, inv, tenYr };
}

PANELS.plan = (body) => {
  const s = (typeof STATUS !== "undefined" && STATUS && STATUS.settings) || {};
  const p = Object.assign({ pay: 3500, bills: 2200, saved: 500, debt: 2000, apr: 24, risk: s.risk || 2, auto: "hybrid" }, LS.get("plan", {}));
  body.innerHTML = `<h2>🗺 Make My Money Plan</h2>
    <p class="lead">Five numbers, one plan. Change the spice or the autopilot and it updates instantly.</p>
    <div class="plan-in">
      <label class="field">Take-home pay / month ($)<input type="number" min="0" id="pl-pay" value="${p.pay}"></label>
      <label class="field">Must-pay bills / month ($)<input type="number" min="0" id="pl-bills" value="${p.bills}"><span class="tiny">rent, food, utilities, minimum payments</span></label>
      <label class="field">Savings you have now ($)<input type="number" min="0" id="pl-saved" value="${p.saved}"></label>
      <label class="field">Credit card / high-interest debt ($)<input type="number" min="0" id="pl-debt" value="${p.debt}"></label>
      <label class="field">Its interest rate (APR %)<input type="number" min="0" max="80" id="pl-apr" value="${p.apr}"></label>
    </div>
    <div class="row"><div><div class="field" style="font-weight:800;font-size:14px">Risk (🌶 careful → 🌶🌶🌶🌶🌶 spicy)</div>
      <div class="risk-dial" id="pl-risk">${[1, 2, 3, 4, 5].map(n => `<button data-r="${n}" class="${n === p.risk ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div><div class="field" style="font-weight:800;font-size:14px">How hands-on?</div>
      <div class="seg" id="pl-auto">${Object.entries(AUTONOMY).map(([k, a]) => `<button data-a="${k}" class="${k === p.auto ? "on" : ""}">${a.emoji} ${a.label}</button>`).join("")}</div></div></div>
    <div id="pl-out"></div>
    <div class="row"><button class="btn go" id="pl-pdf">📄 Save as PDF</button></div>
    <p class="fine">Hoagie's plan uses simple rules of thumb and assumed returns shown below; real results vary and investments can lose money. General education, not personal financial advice.</p>`;
  const read = () => {
    ["pay", "bills", "saved", "debt", "apr"].forEach(k => p[k] = Math.max(0, +$("#pl-" + k, body).value || 0));
    LS.set("plan", p); render();
  };
  $$(".plan-in input", body).forEach(i => i.oninput = read);
  $$("#pl-risk button", body).forEach(b => b.onclick = () => { p.risk = +b.dataset.r; $$("#pl-risk button", body).forEach(x => x.classList.toggle("on", x === b)); LS.set("plan", p); render(); });
  $$("#pl-auto button", body).forEach(b => b.onclick = () => { p.auto = b.dataset.a; $$("#pl-auto button", body).forEach(x => x.classList.toggle("on", x === b)); LS.set("plan", p); render(); });
  $("#pl-pdf", body).onclick = () => printDoc("My Money Plan", $("#pl-out", body).innerHTML);
  function render() {
    const P = buildPlan(p), a = AUTONOMY[p.auto], m = P.m;
    if (p.pay <= 0) { $("#pl-out", body).innerHTML = `<p class="tiny">Enter your take-home pay to see a plan.</p>`; return; }
    if (P.spare <= 0) {
      $("#pl-out", body).innerHTML = `<article class="play-card"><div class="pc-title">First step: make some room</div>
        <p>Your bills use all of your take-home pay, so there's nothing to split yet. Start with lesson 1 in Money 101 (track every dollar for a month) and look for one bill to cut or one income boost.</p></article>`;
      return;
    }
    const steps = {
      manual: [m.safety ? `Payday: move ${dollars(m.safety)} to savings` : null, m.debt ? `Pay ${dollars(m.debt)} extra on the highest-rate card` : null, m.invest ? `Invest ${dollars(m.invest)} in your brokerage` : null, m.fun ? `Fun money: ${dollars(m.fun)} max for bets, crypto or lottery` : null],
      hybrid: [`On payday, open Make My Money Plan (your numbers are saved on this device)`, m.safety ? `Move ${dollars(m.safety)} to savings` : null, m.debt ? `Pay ${dollars(m.debt)} extra on the highest-rate card` : null, m.invest ? `Invest ${dollars(m.invest)}` : null, `Set your daily budget so Today's Play stays inside the ${dollars(m.fun)} fun-money cap`],
      auto: [m.safety ? `Bank: automatic transfer of ${dollars(m.safety)} to savings the day after payday` : null, m.debt ? `Card: autopay set to minimum + ${dollars(m.debt)}` : null, m.invest ? `Brokerage: recurring buy of ${dollars(m.invest)} (index funds${P.inv.crypto ? " + a small crypto recurring buy" : ""})` : null, `Fun money stays manual on purpose (${dollars(m.fun)} cap). Sportsbooks don't allow automation anyway.`],
    }[p.auto].filter(Boolean);
    const bar = [["safety", "🛟 Safety net", "var(--blue)"], ["debt", "⛓️ Debt", "var(--red)"], ["invest", "🌱 Invest", "var(--green)"], ["fun", "🎰 Fun money", "var(--gold)"]]
      .filter(([k]) => m[k] > 0.5);
    const tot = bar.reduce((n, [k]) => n + m[k], 0) || 1;
    $("#pl-out", body).innerHTML = `
      <article class="play-card calm">
        <div class="pc-top"><span class="pc-menu">🗺 Your plan · stage: ${esc(P.stage)}</span><span class="pill">${dollars(P.spare)}/mo to work with</span></div>
        <div class="split">${bar.map(([k, l, col]) => `<div style="flex:${m[k] / tot};background:${col}" title="${l}"></div>`).join("")}</div>
        ${ticket([
          ["🛟", "Safety net", `<b>${dollars(m.safety)}/mo</b> <span class="tiny">goal ${dollars(P.full)} (${P.R.months} months of bills) · ${P.toFull === 0 ? "done ✅" : P.toFull === Infinity ? "add money here to get there" : `about ${P.toFull} months to go`}</span>`],
          ["⛓️", "Debt", p.debt > 0 ? `<b>${dollars(m.debt)}/mo extra</b> <span class="tiny">${P.payoff === Infinity ? "not enough to beat the interest yet: raise this" : `debt-free in about ${P.payoff} months`}</span>` : `<b>None</b> <span class="tiny">nice</span>`],
          ["🌱", "Invest", m.invest ? `<b>${dollars(m.invest)}/mo</b> <span class="tiny">${dollars(P.inv.stocks)} stock index · ${dollars(P.inv.bonds)} bond fund${P.inv.crypto ? ` · ${dollars(P.inv.crypto)} crypto` : ""}</span>` : `<span class="tiny">starts after the safety net and high-interest debt</span>`],
          ["🎰", "Fun money", m.fun ? `<b>${dollars(m.fun)}/mo max</b> <span class="tiny">bets, lottery, day trades. Money you can afford to lose.</span>` : `<span class="tiny">none at risk level 1</span>`],
          [a.emoji, "Hands-on", `<b>${a.label}</b> <span class="tiny">${a.how}</span>`],
        ])}
        <h4>Your payday checklist</h4><ol>${steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
        ${m.invest ? `<h4>In 10 years, if you keep investing ${dollars(m.invest)}/mo</h4>
          <div class="methods">${["Bad decade", "Typical", "Good decade"].map((l, i) => `<div class="method ${i === 1 ? "best" : ""}"><div class="m-label">${l}</div><div class="m-exp">${dollars(P.tenYr[i])}</div><div class="m-range">assumes ${(P.R.r[i] * 100).toFixed(1)}%/yr · you put in ${dollars(m.invest * 120)}</div></div>`).join("")}</div>` : ""}
        <p class="tiny">Next stage after this one: ${esc({ "Starter safety net": "knock out high-interest debt", "Knock out high-interest debt": "finish the safety net", "Finish the safety net": "grow it (most money goes to investing)", "Grow it": "keep going, and bump it up with every raise" }[P.stage])}.</p>
      </article>`;
  }
  render();
};
