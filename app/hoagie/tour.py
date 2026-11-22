"""Ask Hoagie during the guided tour.

Answers come from the shop's own knowledge files (the README plus the project notes, and for the owner on
their own PC, the owner-only notes), using the Claude Code login on this PC first, then any other brain,
then a plain keyword lookup when no AI is connected. Visitors on the website get a daily question budget
so they can't run through the owner's Claude plan.
"""
import re
import threading
import time
from pathlib import Path

from . import ai, store

log = store.log
APP = Path(__file__).resolve().parent.parent
KNOW = APP / "knowledge"
README = APP.parent / "GUIDE.md"
CLAUDE_MD = APP.parent / "CLAUDE.md"
_lock = threading.Lock()
_used = {"day": "", "n": 0}
_per = {}
VISITOR_DAILY = 300       # all website visitors together, per day
PER_SESSION = 25          # one visitor


def _sections(owner):
    files = [README, KNOW / "project-notes.md"] + ([KNOW / "owner-notes.md"] if owner else [])
    out = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        for chunk in re.split(r"\n(?=#{1,3} )", text):
            chunk = chunk.strip()
            if chunk:
                out.append((f.name, chunk))
    return out


def _words(t):
    return [w for w in re.findall(r"[a-z0-9']{3,}", t.lower()) if w not in {"the", "and", "how", "what", "does", "can", "you", "for", "with", "this", "that", "about", "hoagie"}]


def relevant(question, step="", owner=False, limit=9000):
    q = set(_words(question + " " + step))
    scored = []
    for name, chunk in _sections(owner):
        cw = _words(chunk)
        score = sum(cw.count(w) for w in q) / (1 + len(cw) ** 0.5) + (2 if any(w in chunk[:80].lower() for w in q) else 0)
        scored.append((score, name, chunk))
    scored.sort(key=lambda x: -x[0])
    picked, total = [], 0
    for s, name, chunk in scored:
        if s <= 0 and picked:
            break
        if total + len(chunk) > limit:
            continue
        picked.append("[%s]\n%s" % (name, chunk))
        total += len(chunk)
    return "\n\n".join(picked)


def _budget(session, owner):
    if owner:
        return
    day = time.strftime("%Y-%m-%d")
    with _lock:
        if _used["day"] != day:
            _used.update(day=day, n=0)
            _per.clear()
        if _used["n"] >= VISITOR_DAILY:
            raise PermissionError("Hoagie's answered a lot of questions today. Try again tomorrow, or install the app to use your own AI.")
        if _per.get(session, 0) >= PER_SESSION:
            raise PermissionError("That's the question limit for this tour. Install Constable Hoagie to ask your own AI anything.")
        _used["n"] += 1
        _per[session] = _per.get(session, 0) + 1


def ask(question, step="", owner=False, session="local", demo_name=""):
    question = (question or "").strip()[:500]
    if not question:
        raise ValueError("Ask me something!")
    _budget(session, owner)
    notes = relevant(question, step, owner)
    files = [str(README), str(KNOW / "project-notes.md")] + ([str(KNOW / "owner-notes.md")] if owner else [])
    prompt = (
        ai.HOAGIE_VOICE + "\n\nYou are giving a guided tour of the Constable Hoagie app" +
        (" using simulated demo data for the made-up persona %s" % demo_name if demo_name else "") +
        ". The visitor is looking at: %s.\nAnswer ONLY from the shop notes below (you may Read these files for more detail: %s). "
        "If the notes don't cover it, say so plainly. Keep it to 2-4 short sentences. Never give personal financial advice.\n\n"
        "SHOP NOTES:\n%s\n\nQUESTION: %s"
    ) % (step or "the shop", ", ".join(files), notes, question)
    brain = ai.pick_brain()
    try:
        if ai.claude_cmd():
            return {"answer": ai.ask_claude(prompt, allow_web=False, files_ok=True, timeout=120, task="quick"), "engine": "claude"}
        if brain != "none":
            return {"answer": ai.complete(prompt, engine=brain, timeout=90), "engine": brain}
    except Exception as e:
        log.info("tour ask failed (%s), falling back to the notes", e)
    # no AI: quote the lines from the notes that best match the question
    q = set(_words(question))
    lines = [l.strip(" -*#") for l in notes.splitlines() if len(l.strip()) > 25 and not l.startswith("[")]
    lines.sort(key=lambda l: -sum(1 for w in _words(l) if w in q))
    best = [l for l in lines[:3] if any(w in q for w in _words(l))]
    if not best:
        return {"answer": "I couldn't find that in my notes. Connect an AI brain and I can dig deeper.", "engine": "notes"}
    return {"answer": " ".join(re.sub(r"\*\*", "", l) for l in best)[:700], "engine": "notes"}


def chat(question, history=None):
    """Admin panel: Zero Cool admins ask the owner's Claude about the app and how it was built.
    Claude may read the knowledge files, CLAUDE.md and the app's own source code."""
    question = (question or "").strip()[:1500]
    if not question:
        raise ValueError("Ask me something!")
    notes = relevant(question, "", owner=True, limit=12000)
    convo = "\n".join("%s: %s" % ("Admin" if h.get("who") == "me" else "Claude", str(h.get("text", ""))[:800]) for h in (history or [])[-8:])
    prompt = (
        "You are the build assistant for the Constable Hoagie app, talking with one of its Zero Cool admins "
        "(the owner ConstableHoagie, or his partner, code name DoctorCrench; always use that code name). "
        "Explain the app and how it was built: features, architecture, files, decisions, workflows. "
        "You may Read these for detail: %s, the knowledge folder %s, and the app source under %s. "
        "Be concise and concrete (file names, what to run). Never reveal passwords, keys or sign-in links.\n\n"
        "PROJECT NOTES:\n%s\n\n%sQUESTION: %s"
    ) % (CLAUDE_MD, KNOW, APP, notes, ("CONVERSATION SO FAR:\n" + convo + "\n\n") if convo else "", question)
    if ai.claude_cmd():
        return {"answer": ai.ask_claude(prompt, allow_web=False, files_ok=True, timeout=240), "engine": "claude"}
    brain = ai.pick_brain()
    if brain != "none":
        return {"answer": ai.complete(prompt, engine=brain, timeout=120), "engine": brain}
    raise RuntimeError("No AI is connected on this PC. Install Claude Code and run 'claude auth login' to chat about the project.")
