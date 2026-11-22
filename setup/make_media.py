"""Builds media/player.html: a standalone, offline player for every Constable Hoagie short, plus the character gallery.
Run after changing any animation:  python setup/make_media.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "app" / "web"
VERSION = json.loads((ROOT / "app" / "version.json").read_text())["version"]


def build():
    js = "\n".join((WEB / f).read_text(encoding="utf-8") for f in ("art.js", "art-neon.js", "look.js", "alison.js"))
    shots = sorted((ROOT / "media" / "screenshots").rglob("*.jpg"))
    gallery = "".join('<a href="%s" target="_blank"><img loading="lazy" src="%s" alt="%s"><span>%s</span></a>' % (
        p.relative_to(ROOT / "media").as_posix(), p.relative_to(ROOT / "media").as_posix(), p.stem, p.parent.name + " · " + p.stem.replace("-", " "))
        for p in reversed(shots))
    html = TEMPLATE.replace("{{V}}", VERSION).replace("{{JS}}", js).replace("{{SHOTS}}", gallery)
    (ROOT / "media" / "player.html").write_text(html, encoding="utf-8")
    print("media/player.html written (v%s, %d screenshots)" % (VERSION, len(shots)))


TEMPLATE = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Constable Hoagie · Media library v{{V}}</title>
<style>
body{margin:0;background:radial-gradient(circle at 50% -10%,#3a136b,#0b0418 55%);color:#eee6ff;font:16px/1.5 system-ui,Nunito,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:18px}h1{margin:0;color:#3df5ff;text-shadow:0 0 14px #3df5ff}h2{color:#ff3df2;margin:26px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.tile{background:#150b2b;border:2px solid #3a2a66;border-radius:16px;padding:14px;cursor:pointer;text-align:left;color:inherit;font:inherit}
.tile:hover{border-color:#ff3df2;box-shadow:0 0 16px rgba(255,61,242,.4)}.tile b{display:block;font-size:17px}.tile span{font-size:13px;color:#b6a8e0}
.chars{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.char{background:#fffaf0;color:#2b1d14;border-radius:16px;padding:10px;text-align:center}.char.n{background:#12061f;color:#eee6ff;border:2px solid #ff3df2}
.char .a{height:200px;display:flex;align-items:flex-end;justify-content:center}.char svg{height:100%;width:auto}
.char button{margin-top:6px;border-radius:10px;border:2px solid currentColor;background:transparent;color:inherit;padding:4px 10px;cursor:pointer;font:700 13px system-ui}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.shots a{color:#b6a8e0;text-decoration:none;font-size:12px}
.shots img{width:100%;border-radius:10px;border:2px solid #3a2a66;display:block}
.fine{color:#9f90cf;font-size:13px}
</style></head><body><div class="wrap">
<h1>🎞 Constable Hoagie media library</h1><p class="fine">v{{V}} · works offline · every animation is original art and original music. Private to Zero Cool admins.</p>
<h2>Shorts &amp; intros</h2><div class="grid">
<button class="tile" data-p="tv"><b>▶ Website intro video</b><span>Original look · pause + skip · first visit to the website</span></button>
<button class="tile" data-p="dark"><b>🌃 The 3 A.M. Bread Bank Job</b><span>Dark Humor intro · plays when someone picks Dark Humor</span></button>
<button class="tile" data-p="case"><b>💼 The gold briefcase</b><span>An admin's first sign-in · opens into the project download</span></button>
<button class="tile" data-p="g1"><b>🌻 Alison: Garden day</b><span>Original · Kiwi helps</span></button>
<button class="tile" data-p="g2"><b>🌙 Alison: Kiwi's war on the garden</b><span>Dark Humor</span></button>
<button class="tile" data-p="pick"><b>🎨 The look picker</b><span>Original vs Dark Humor</span></button>
</div>
<h2>Characters</h2><div class="chars" id="chars"></div>
<h2>Screenshots</h2><div class="shots">{{SHOTS}}</div>
<p class="fine">In the app: 🕶 The Gibson › 🎞 Media plays these inside the real shop, plus Hoagie's welcome and the guided tour.</p>
</div>
<script>{{JS}}</script>
<script>
const P = {
  tv: () => LOOK.tourVideo(), dark: () => LOOK.intro(), pick: () => LOOK.choose(() => {}),
  case: () => LOOK.briefcase({ title: "It's the whole project.", html: "In the real app this opens into the project download.", laterLabel: "Close the case" }),
  g1: () => SHORTS.garden("original", { offerOther: true }), g2: () => SHORTS.garden("dark", { offerOther: true }),
};
document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => P[b.dataset.p]());
const C = [["hoagie-original", "Constable Hoagie", () => ART.toon(ART.HOAGIE), 0], ["hoagie-neon", "Constable Hoagie (neon)", () => ART.NEON.hoagie(), 1],
  ["kiwi", "Kiwi", () => ART.kiwi, 0], ["alison-original", "Alison", () => ART.toon(ART.ALISON), 0], ["alison-dark", "Alison (Dark Humor)", () => ART.toon(ART.ALISON_DARK), 1]];
document.getElementById("chars").innerHTML = C.map(([id, n, f, neon]) => `<div class="char ${neon ? "n" : ""}"><div class="a">${f()}</div><b>${n}</b><br><button data-svg="${id}">⬇ SVG</button></div>`).join("");
document.querySelectorAll("[data-svg]").forEach(b => b.onclick = () => {
  const c = C.find(x => x[0] === b.dataset.svg), svg = c[2]().replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); a.download = c[0] + ".svg"; a.click();
});
</script></body></html>"""

if __name__ == "__main__":
    build()
