"""Builds README.html (animated, Dark Humor neon style), README.md and docs/ from the app's own data.
Run after changing integrations or revisions:  python setup/make_readme.py
"""
import html
import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
sys.path.insert(0, str(APP))
from hoagie import integrations  # noqa: E402

VERSION = json.loads((APP / "version.json").read_text())["version"]
ADMIN = json.loads((APP / "knowledge" / "admin.json").read_text(encoding="utf-8"))
E = html.escape

ADMIN_STEPS = [
    "Open the shop on your PC (or sign in as a Zero Cool admin) and go to <b>🔌 Connect › 🔑 User accounts</b>.",
    "Type a username, a password (10+ characters) and pick a tier: <b>Regular</b> or <b>Zero Cool</b>. Press <b>Add</b>.",
    "Open <b>🕶 The Gibson › 👥 People &amp; links</b>. Press <b>🔗 New sign-in link</b> and send the website link privately (text or DM). It signs them straight in; making a new one kills the old one, and <b>Revoke</b> turns it off.",
    "Same screen: change anyone's <b>tier</b>, or tick <b>🏈 Sports tab</b> to give a money-only person a separate tab with games and the Bet Tracker.",
    "On their first visit everyone gets the look picker, Hoagie's welcome, the guided tour and the AI question, once. Each person picks their own menu (money-only or full). Replays live in <b>👤 Me</b>.",
    "<b>Autopatcher (once):</b> double-click <b>Setup Everything</b> and say yes to GitHub. It makes the repo, installs the workflows, the Claude GitHub App and the Claude token, and switches on reports. Claude's fixes then show up there for any Zero Cool admin to <b>Approve &amp; release</b> or <b>Reject</b>, and each admin can set their own email or Discord alerts.",
    "Giving someone their own copy of the app? Leave out <code>app\\seed</code> unless they should be a Zero Cool admin on their PC.",
]
START = ["Double-click <b>Start Constable Hoagie</b>. First time, it installs what it needs (about 2 minutes).",
         "Pick your look: <b>Original</b> (sunny, family-friendly) or <b>Dark Humor</b> (18+, neon, edgy jokes, no nudity).",
         "Take the 2-minute tour with practice data, pick an AI brain, and connect only what you want."]
WHAT = ["Turns today's news and prices into a few simple money moves. Small bites, no homework.",
        "Shows everything you own, what you spend and (on the full menu) every bet, in one place.",
        "Never moves your money on its own. Every number is an estimate, not financial advice."]


def rows(cat):
    return [i for i in integrations.CATALOG if i[1] == cat]


def build_md():
    out = ["# 🥪 Constable Hoagie v%s" % VERSION, "### Protecting & Serving Your Dough", ""]
    out += ["- " + w for w in WHAT] + ["", "## Start in 3 steps", ""]
    out += ["%d. %s" % (n + 1, s.replace("<b>", "**").replace("</b>", "**")) for n, s in enumerate(START)]
    out += ["", "**App vs website:** the website (beta.constablehoagie.com) is the same shop served from the owner's PC, so it's only up while that PC is on. "
            "Marked **App** = only on your PC; **Website** = needs the public address; **Both** = works either way.", ""]
    out += ["## What it can do", ""]
    for cid, cname in integrations.CATEGORIES:
        out += ["### " + cname, "", "| What | You get | Connects with | Works on | Status |", "|---|---|---|---|---|"]
        for i, c, n, st, w, cn, caps, b, l in rows(cid):
            out.append("| %s | %s | %s | %s | %s |" % (n, b.replace("|", "/"), cn.replace("|", "/"), w, st))
        out.append("")
    out += ["## For admins: adding people & access", ""]
    out += ["%d. %s" % (n + 1, re.sub(r"<[^>]+>", "", s).replace("&amp;", "&").replace("\\\\", "\\")) for n, s in enumerate(ADMIN_STEPS)]
    out += ["", "**Zero Cool** = god-mode admin (everything plus the 🕶 Admin tab) · **Regular** = the shop without keys, settings or admin.", ""]
    out += ["More detail: **GUIDE.md** (full guide) · **CLAUDE.md** (for your Claude) · **docs/**", "",
            "_Not financial advice. If betting stops being fun, call or text 1-800-GAMBLER._"]
    return "\n".join(out) + "\n"


def build_html():
    art = (APP / "web" / "art.js").read_text(encoding="utf-8") + "\n" + (APP / "web" / "art-neon.js").read_text(encoding="utf-8")
    cats = []
    for cid, cname in integrations.CATEGORIES:
        trs = "".join("<tr><td><b>%s</b>%s</td><td>%s</td><td>%s</td><td><span class='w w-%s'>%s</span></td><td><span class='s s-%s'>%s</span></td></tr>" % (
            E(n), ("<div class='caps'>" + E(" · ".join(caps)) + "</div>") if caps else "", E(b), E(cn), w.lower(), E(w), st.split()[0].lower(), E(st))
            for i, c, n, st, w, cn, caps, b, l in rows(cid))
        cats.append("<details %s><summary>%s <span>%d</span></summary><div class='tw'><table><tr><th>What</th><th>You get</th><th>Connects with</th><th>Works on</th><th>Status</th></tr>%s</table></div></details>"
                    % ("open" if cid in ("trading", "money") else "", E(cname), len(rows(cid)), trs))
    return TEMPLATE.replace("{{V}}", VERSION).replace("{{ART}}", art).replace("{{CATS}}", "\n".join(cats)) \
        .replace("{{WHAT}}", "".join("<li>%s</li>" % w for w in WHAT)).replace("{{START}}", "".join("<li>%s</li>" % s for s in START)).replace("{{ADMIN}}", "".join("<li>%s</li>" % s for s in ADMIN_STEPS))


TEMPLATE = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Constable Hoagie v{{V}} · Read me</title>
<style>
:root{--m:#ff3df2;--c:#3df5ff;--l:#b8ff4a;--g:#ffd84a;--bg:#0b0418;--card:#150b2b;--ink:#eee6ff;--mut:#b6a8e0}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#3a136b,var(--bg) 55%);color:var(--ink);font:16px/1.5 system-ui,Segoe UI,Nunito,sans-serif}
.wrap{max-width:1000px;margin:0 auto;padding:18px}
.hero{position:relative;height:340px;border-radius:26px;overflow:hidden;border:3px solid var(--m);box-shadow:0 0 30px rgba(255,61,242,.45);background:#07020f}
.vortex{position:absolute;left:50%;top:50%;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;
 background:conic-gradient(from 0deg,#1b0a35,#39ff9c,#0b3b2a,#b8ff4a,#1b0a35,#39ff9c,#0b3b2a,#1b0a35);filter:blur(2px) url(#wob);opacity:.55;animation:spin 9s linear infinite}
.vortex::after{content:"";position:absolute;inset:90px;border-radius:50%;background:radial-gradient(#07020f 30%,transparent 70%)}
@keyframes spin{to{transform:rotate(360deg)}}
.stars{position:absolute;inset:0;background:radial-gradient(2px 2px at 10% 20%,#fff,transparent),radial-gradient(2px 2px at 70% 30%,var(--c),transparent),radial-gradient(2px 2px at 40% 80%,var(--m),transparent),radial-gradient(1px 1px at 90% 60%,#fff,transparent);background-size:220px 160px;animation:tw 4s ease-in-out infinite alternate}
@keyframes tw{to{opacity:.4}}
.hg{position:absolute;left:6%;bottom:-8px;height:330px;filter:url(#wob) drop-shadow(0 0 16px rgba(61,245,255,.55));animation:bob 2.6s ease-in-out infinite;transform-origin:bottom}
.hg svg,.kw svg{height:100%;width:auto}
.kw{position:absolute;right:7%;bottom:6px;height:120px;filter:url(#wob) drop-shadow(0 0 12px rgba(184,255,74,.6));animation:kiwi 7s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-6px) rotate(-1deg)}}
@keyframes kiwi{0%,100%{transform:translateX(0) scaleX(1)}45%{transform:translateX(-180px) scaleX(1)}50%{transform:translateX(-180px) scaleX(-1)}95%{transform:translateX(0) scaleX(-1)}}
.title{position:absolute;right:5%;top:22px;text-align:right}
.title h1{margin:0;font:900 clamp(30px,6vw,56px)/1 system-ui;color:var(--c);text-shadow:0 0 14px var(--c),0 0 30px var(--m);filter:url(#wob)}
.title p{margin:6px 0 0;color:var(--g);font-weight:800}
.bubble{position:absolute;left:34%;top:150px;max-width:330px;background:#fff;color:#170a2e;border:3px solid #000;border-radius:22px;padding:10px 14px;font-weight:800;filter:url(#wob);opacity:0;transform:scale(.8);transition:all .35s}
.bubble.on{opacity:1;transform:scale(1)}.bubble::after{content:"";position:absolute;left:-14px;bottom:18px;border:10px solid transparent;border-right-color:#000}
section{background:var(--card);border:2px solid #3a2a66;border-radius:20px;padding:16px 18px;margin:16px 0}
h2{margin:0 0 8px;color:var(--m);text-shadow:0 0 10px rgba(255,61,242,.5)}
ul,ol{margin:0;padding-left:22px}li{margin:4px 0}
.looks{display:grid;grid-template-columns:1fr 1fr;gap:12px}.look{border-radius:16px;padding:12px}.look.o{background:linear-gradient(#bfe6ff,#fff3dc);color:#2b1d14}.look.d{background:#0c0618;border:2px solid var(--m)}
.legend span{margin-right:12px}
details{border:1px solid #3a2a66;border-radius:14px;margin:8px 0;background:#110824}
summary{cursor:pointer;padding:10px 14px;font-weight:900;color:var(--c)}summary span{float:right;color:var(--mut);font-weight:700}
.tw{overflow:auto;padding:0 10px 10px}table{border-collapse:collapse;width:100%;font-size:14px}
th{text-align:left;color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:6px}td{padding:7px 6px;border-top:1px solid #2a1d4d;vertical-align:top}
.caps{font-size:12px;color:var(--mut)}
.w,.s{display:inline-block;padding:1px 8px;border-radius:9px;font-size:12px;font-weight:800;white-space:nowrap}
.w-both{background:#123a2a;color:var(--l)}.w-app{background:#3a2a10;color:var(--g)}.w-website{background:#10293a;color:var(--c)}
.s-live{background:var(--l);color:#0b0418}.s-beta{background:var(--g);color:#0b0418}.s-planned,.s-not{background:#2a1d4d;color:var(--mut)}
.fine{color:var(--mut);font-size:13px;text-align:center}
@media(max-width:700px){.hero{height:300px}.hg{height:250px}.bubble{left:30%;top:120px;max-width:210px;font-size:13px}.looks{grid-template-columns:1fr}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><filter id="wob"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="3"><animate attributeName="seed" values="1;2;3;4;5" dur=".5s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="4"/></filter></svg>
<div class="wrap">
<div class="hero"><div class="stars"></div><div class="vortex"></div><div class="hg" id="hg"></div><div class="kw" id="kw"></div>
<div class="title"><h1>Constable Hoagie</h1><p>v{{V}} · Protecting &amp; Serving Your Dough</p></div><div class="bubble" id="bub"></div></div>

<section><h2>What it is</h2><ul>{{WHAT}}</ul></section>
<section><h2>Start in 3 steps</h2><ol>{{START}}</ol></section>
<section><h2>Two looks</h2><div class="looks"><div class="look o"><b>🥪 Original</b><br>Light, fluffy, family-friendly.</div>
<div class="look d"><b>🌃 Dark Humor (18+)</b><br>Neon, edgy jokes, betting talk, a cat with a record. No nudity, just numbers.</div></div></section>
<section><h2>App or website?</h2><p>The website is the same shop, served from the owner's PC, so it's only up while that PC is on.</p>
<p class="legend"><span class="w w-both">Both</span> works anywhere <span class="w w-app">App</span> only on your PC <span class="w w-website">Website</span> needs the public address</p></section>
<section><h2>What it can do</h2>{{CATS}}</section>
<section id="admins"><h2>For admins: adding people &amp; access</h2><ol>{{ADMIN}}</ol>
<p class="legend"><span class="w w-both">Zero Cool</span> god-mode admin: everything plus the 🕶 Admin tab &nbsp; <span class="w w-website">Regular</span> the shop, no keys, settings or admin</p></section>
<p class="fine">More: GUIDE.md (full guide) · CLAUDE.md (for your Claude) · docs/ · Not financial advice. If betting stops being fun: 1-800-GAMBLER.</p>
</div>
<script>{{ART}}</script>
<script>
document.getElementById("hg").innerHTML = ART.NEON && ART.NEON.hoagie ? ART.NEON.hoagie() : ART.toon(ART.HOAGIE);
document.getElementById("kw").innerHTML = ART.kiwi || "";
const LINES = ["Your money. Our questionable cat.", "I read the news so you don't have to. It's mostly bad. I find the good bits.",
 "Kiwi has admin access. Nobody knows how.", "Every number is an estimate. Like my age.", "I never move your money. I barely move off this stool.",
 "Dark Humor mode: all the jokes, none of the nudity."];
let i = 0; const b = document.getElementById("bub");
function next(){ b.classList.remove("on"); setTimeout(()=>{ b.textContent = LINES[i++ % LINES.length]; b.classList.add("on"); }, 350); }
next(); setInterval(next, 3800);
</script></body></html>"""


def main():
    (ROOT / "README.md").write_text(build_md(), encoding="utf-8")
    (ROOT / "README.html").write_text(build_html(), encoding="utf-8")
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    (docs / "BUILD-LOG.md").write_text("# Build log\n\n" + "\n".join("- **v%s** (%s): %s" % (r["v"], r["date"], r["what"]) for r in ADMIN["revisions"]) + "\n", encoding="utf-8")
    cat = ["# Integrations & capabilities (v%s)" % VERSION, "", "Works on: Both = app on your PC and the website · App = only on the PC · Website = needs the public address.", ""]
    for cid, cname in integrations.CATEGORIES:
        cat += ["## " + cname, "", "| Integration | Status | Works on | Connection | Capabilities | What Hoagie does with it |", "|---|---|---|---|---|---|"]
        for i, c, n, st, w, cn, caps, b, l in rows(cid):
            cat.append("| %s | %s | %s | %s | %s | %s |" % ("[%s](%s)" % (n, l) if l else n, st, w, cn, ", ".join(caps) or "-", b.replace("|", "/")))
        cat.append("")
    (docs / "INTEGRATIONS.md").write_text("\n".join(cat), encoding="utf-8")
    print("README.md, README.html, docs/ written for v%s" % VERSION)


if __name__ == "__main__":
    main()
