"""The brains Constable Hoagie can ask: Claude (your Claude Code login), Foundry Local
(free AI that runs on the PC), or a plain web search (Tavily / Brave) with no AI at all.

Claude works the way WoW Advisor does: it runs the `claude` command with whatever account
is logged in on this PC. The app never stores a Claude password or token, so a copy you
share with a friend uses *their* login, not yours.
"""
import json
import os
import re
import shutil
import subprocess

from . import feeds, store

log = store.log
NO_WINDOW = 0x08000000 if os.name == "nt" else 0  # don't flash a console window on Windows


def claude_cmd():
    p = store.settings().get("claude_path", "").strip()
    if p and os.path.exists(p):
        return p
    found = shutil.which("claude")
    if found:
        return found
    if os.name == "nt":
        for cand in (os.path.expandvars(r"%USERPROFILE%\.local\bin\claude.exe"),
                     os.path.expandvars(r"%APPDATA%\npm\claude.cmd"),
                     os.path.expandvars(r"%LOCALAPPDATA%\Programs\claude\claude.exe")):
            if os.path.exists(cand):
                return cand
    return ""


def claude_status():
    cmd = claude_cmd()
    if not cmd:
        return {"ok": False, "why": "Claude Code isn't installed on this PC."}
    try:
        r = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=20, creationflags=NO_WINDOW)
        return {"ok": r.returncode == 0, "version": (r.stdout or r.stderr).strip()[:60]}
    except Exception as e:
        return {"ok": False, "why": str(e)}


# Model choice, like WoW Advisor: pass --model only when there's a reason to.
#   setting "claude_model" blank (default) = auto:
#     quick lookups ("task=quick")  -> the "haiku" alias: fast, light on your plan's usage
#     everything else               -> no --model at all, so Claude Code uses your account's
#                                      default (the best model your plan gives you)
#   setting "claude_model" = "opus" / "sonnet" / "haiku" / a full model name -> always that.
# If a model isn't available on the account, Hoagie retries once with Claude Code's default.
QUICK_MODEL = "haiku"


def model_for(task):
    chosen = store.settings().get("claude_model", "").strip()
    if chosen:
        return chosen
    return QUICK_MODEL if task == "quick" else ""


def _run_claude(args, timeout):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                          encoding="utf-8", errors="replace", creationflags=NO_WINDOW,
                          cwd=str(store.DATA))


def ask_claude(prompt, allow_web=True, files_ok=False, timeout=240, task="deep"):
    cmd = claude_cmd()
    if not cmd:
        raise RuntimeError("Claude Code isn't installed. The Connect counter has a one-click install.")
    tools = []
    if allow_web:
        tools += ["WebSearch", "WebFetch"]
    if files_ok:
        tools += ["Read"]
    base = [cmd, "-p", prompt, "--output-format", "text"]
    if tools:
        base += ["--allowedTools", ",".join(tools)]
    model = model_for(task)
    args = base + (["--model", model] if model else [])
    log.info("asking claude (%d chars, tools=%s, model=%s)", len(prompt), tools, model or "account default")
    r = _run_claude(args, timeout)
    out = (r.stdout or "").strip()
    if (r.returncode != 0 or not out) and model:
        log.info("model %s didn't work (%s); retrying with the account default", model, (r.stderr or "")[:200])
        r = _run_claude(base, timeout)
        out = (r.stdout or "").strip()
    if r.returncode != 0 or not out:
        err = (r.stderr or out or "no answer").strip()
        if "login" in err.lower() or "auth" in err.lower():
            raise RuntimeError("Claude Code isn't logged in. Open a terminal and run:  claude auth login")
        raise RuntimeError("Claude didn't answer: " + err[:300])
    return out


def looks_quick(question):
    """Short look-up questions go to the fast model; 'should I', 'plan', 'compare' get the full one."""
    q = question.lower()
    if re.search(r"\b(should|plan|strategy|compare|why|explain|analy[sz]e|playbook|risk|best way)\b", q):
        return False
    return len(q) < 140


# ---- Foundry Local (free, on-device) -----------------------------------------------------

def foundry_url():
    u = store.settings().get("foundry_url", "").strip()
    if u:
        return u.rstrip("/")
    exe = shutil.which("foundry")
    if not exe:
        return ""
    try:
        r = subprocess.run([exe, "service", "status"], capture_output=True, text=True, timeout=20,
                           creationflags=NO_WINDOW)
        m = re.search(r"https?://[\w.\-]+:\d+", r.stdout + r.stderr)
        return m.group(0) if m else ""
    except Exception:
        return ""


def ask_foundry(prompt, timeout=180):
    base = foundry_url()
    if not base:
        raise RuntimeError("Foundry Local isn't running. Install it from the Connect counter, then run:  foundry model run phi-4-mini")
    models = feeds.http_json(base + "/v1/models", timeout=10).get("data", [])
    if not models:
        raise RuntimeError("Foundry Local has no model loaded yet. Run:  foundry model run phi-4-mini")
    model = models[0]["id"]
    d = feeds.http_json(base + "/v1/chat/completions", timeout=timeout, data={
        "model": model, "temperature": 0.3,
        "messages": [{"role": "system", "content": "You are Constable Hoagie, a cheerful, plain-spoken money helper. Short answers."},
                     {"role": "user", "content": prompt}]})
    return d["choices"][0]["message"]["content"].strip()


# ---- GPT, Gemini and your own agent (all speak the OpenAI-style chat API; called from this PC) ----

COMPAT = {
    "openai": {"label": "GPT (OpenAI)", "base": "https://api.openai.com/v1", "secret": "openai",
               "prefer": [r"^gpt-[\d.]+-mini$", r"^gpt-[\d.]+$", r"^gpt-"], "keys": "https://platform.openai.com/api-keys"},
    "gemini": {"label": "Gemini (Google)", "base": "https://generativelanguage.googleapis.com/v1beta/openai", "secret": "gemini",
               "prefer": [r"gemini-[\d.]+-flash$", r"gemini-[\d.]+-flash", r"gemini-[\d.]+-pro", r"gemini"], "keys": "https://aistudio.google.com/apikey"},
    "groq":   {"label": "Groq (free, fast)", "base": "https://api.groq.com/openai/v1", "secret": "groq",
               "prefer": [r"llama-[\d.]+-70b", r"llama", r"qwen", r"gpt-oss"], "keys": "https://console.groq.com/keys"},
    "openrouter": {"label": "OpenRouter (free models)", "base": "https://openrouter.ai/api/v1", "secret": "openrouter",
               "prefer": [r":free$"], "keys": "https://openrouter.ai/keys"},
    "agent":  {"label": "Your own agent", "base": None, "secret": "agent", "prefer": [], "keys": ""},
}

# The AI picker: who can be Hoagie's brain, what it costs, and how well it uses the shop.
# Fit score (0-10, our estimate) weighs: live news/web research, reading screenshots, building plays
# reliably (structured answers), and whether it can run Today's Play server-side for everyone.
BRAIN_GUIDE = [
    {"id": "claude", "name": "Claude", "cost": "Uses your Claude Pro/Max plan", "account": True, "free": False, "score": 10,
     "why": ["Searches today's news itself, so plays cite real stories", "Reads screenshots and files", "Most reliable at building plays and the Playbook"],
     "how": "Install Claude Code on this PC and run 'claude auth login'. Hoagie never stores the login."},
    {"id": "gemini", "name": "Gemini (Google)", "cost": "Free tier with a Google account", "account": True, "free": True, "score": 8,
     "why": ["Best free brain: strong answers and reads screenshots", "Free daily allowance is plenty for one person"],
     "how": "Get a free key at aistudio.google.com/apikey and paste it here."},
    {"id": "openai", "name": "GPT (OpenAI)", "cost": "Pay as you go (pennies a day)", "account": True, "free": False, "score": 8,
     "why": ["Strong answers and reads screenshots", "Good if you already use ChatGPT's API"],
     "how": "Make a key at platform.openai.com/api-keys (needs billing) and paste it here."},
    {"id": "agent", "name": "Your own agent", "cost": "Whatever your agent costs", "account": False, "free": None, "score": 7,
     "why": ["Plug in the AI you already trust: Ollama, LM Studio, LiteLLM, n8n, Flowise or your own server", "Score depends on the model behind it (5 for small local models, 9-10 for frontier ones)"],
     "how": "Any address that speaks the OpenAI chat format (ends in /v1)."},
    {"id": "groq", "name": "Groq", "cost": "Free key", "account": True, "free": True, "score": 6,
     "why": ["Very fast open models", "Fine for questions and plays; most models can't read screenshots"],
     "how": "Free key at console.groq.com/keys."},
    {"id": "openrouter", "name": "OpenRouter free models", "cost": "Free key", "account": True, "free": True, "score": 6,
     "why": ["One key, dozens of models; several are free", "Quality varies by model"],
     "how": "Free key at openrouter.ai/keys."},
    {"id": "ollama", "name": "Ollama or LM Studio on this PC", "cost": "Free", "account": False, "free": True, "score": 5,
     "why": ["No account, nothing leaves your PC", "Runs Today's Play and Ask for everyone in the shop", "Needs a decent PC; smaller models are less sharp"],
     "how": "Install Ollama, run 'ollama pull llama3.2', then pick it here (uses http://localhost:11434/v1)."},
    {"id": "foundry", "name": "Foundry Local (Microsoft)", "cost": "Free", "account": False, "free": True, "score": 4,
     "why": ["No account, runs on this PC", "Small models: good for simple questions"],
     "how": "winget install Microsoft.FoundryLocal, then: foundry model run phi-4-mini"},
    {"id": "chrome", "name": "Chrome built-in AI / WebLLM", "cost": "Free", "account": False, "free": True, "score": 3,
     "why": ["No account, runs in the visitor's own browser", "Ask counter only: can't build Today's Play for the shop"],
     "how": "Pick it in the Ask counter. Nothing to install for Chrome's; WebLLM downloads once."},
]


def _compat_base(provider):
    if provider == "agent":
        u = (store.settings().get("agent_url") or "").strip().rstrip("/")
        if not u:
            raise RuntimeError("Add your agent's address at the Connect counter (it should end in /v1).")
        return u
    return COMPAT[provider]["base"]


def check_agent_url(u):
    """Your agent's address: https anywhere, or plain http only on this PC / your home network."""
    from urllib.parse import urlparse
    p = urlparse((u or "").strip())
    if p.scheme not in ("http", "https") or not p.hostname:
        raise ValueError("That address should look like http://localhost:11434/v1 or https://my-agent.example.com/v1")
    local = p.hostname in ("localhost", "127.0.0.1", "::1") or re.match(r"^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)", p.hostname)
    if p.scheme == "http" and not local:
        raise ValueError("Use https for an agent that isn't on this PC or your home network, so your questions travel encrypted.")
    return u.strip().rstrip("/")


def _compat_headers(provider):
    key = store.get_secret(COMPAT[provider]["secret"])
    return {"Authorization": "Bearer " + key} if key else {}


def compat_models(provider):
    d = feeds.http_json(_compat_base(provider) + "/models", headers=_compat_headers(provider), timeout=15)
    ids = [m.get("id", "") for m in d.get("data", []) if m.get("id")]
    return sorted({i.split("/")[-1] if provider == "gemini" else i for i in ids})


def compat_model(provider):
    s = store.settings()
    m = (s.get("ai_models") or {}).get(provider)
    if m:
        return m
    try:
        ids = compat_models(provider)
    except Exception as e:
        raise RuntimeError("Couldn't list models (%s). Check the key or address." % e)
    for pat in COMPAT[provider]["prefer"]:
        hits = sorted([i for i in ids if re.search(pat, i) and not re.search(r"(audio|realtime|tts|image|embed|search|transcribe|preview)", i)], reverse=True)
        if hits:
            return hits[0]
    if ids:
        return ids[0]
    raise RuntimeError("No models found at that address.")


def ask_compat(provider, prompt, system=None, image_data_url=None, timeout=120):
    content = prompt
    if image_data_url:
        content = [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": image_data_url}}]
    d = feeds.http_json(_compat_base(provider) + "/chat/completions", headers=_compat_headers(provider), timeout=timeout, data={
        "model": compat_model(provider),
        "messages": [{"role": "system", "content": system or HOAGIE_VOICE}, {"role": "user", "content": content}]})
    return d["choices"][0]["message"]["content"].strip()


def compat_ready(provider):
    s = store.settings()
    if provider == "agent":
        return bool(s.get("agent_url"))
    return store.has_secret(COMPAT[provider]["secret"])


def brain_guide():
    have = engines()
    out = []
    for b in BRAIN_GUIDE:
        r = dict(b)
        r["ready"] = bool(have.get(b["id"])) or (b["id"] == "ollama" and "11434" in (store.settings().get("agent_url") or ""))
        out.append(r)
    return {"brains": out, "default": store.settings().get("ai_default") or "auto", "in_use": pick_brain(),
            "agent_url": store.settings().get("agent_url", ""), "models": store.settings().get("ai_models") or {}}


# ---- choosing an engine ------------------------------------------------------------------

BRAINS = ("claude", "openai", "gemini", "agent", "groq", "openrouter", "foundry")


def engines():
    return {
        "claude": bool(claude_cmd()),
        "openai": compat_ready("openai"),
        "gemini": compat_ready("gemini"),
        "agent": compat_ready("agent"),
        "groq": compat_ready("groq"),
        "openrouter": compat_ready("openrouter"),
        "tavily": store.has_secret("tavily"),
        "brave": store.has_secret("brave"),
        "foundry": bool(shutil.which("foundry") or store.settings().get("foundry_url")),
    }


def pick_engine(wanted="auto"):
    have = engines()
    if wanted not in ("auto", "", None):
        return wanted
    pref = store.settings().get("ai_default") or "auto"
    if pref != "auto" and have.get(pref):
        return pref
    for e in BRAINS + ("tavily", "brave"):
        if have[e]:
            return e
    return "none"


def pick_brain(wanted="auto"):
    """Like pick_engine, but only engines that can write (no plain search)."""
    e = pick_engine(wanted)
    if e in BRAINS:
        return e
    have = engines()
    return next((b for b in BRAINS if have[b]), "none")


def complete(prompt, engine="auto", system=None, timeout=180):
    """One answer from whichever brain the person picked."""
    eng = pick_brain(engine)
    if eng == "claude":
        return ask_claude((system + "\n\n" if system else "") + prompt, timeout=timeout)
    if eng == "foundry":
        return ask_foundry(prompt, timeout=timeout)
    if eng in COMPAT:
        return ask_compat(eng, prompt, system=system, timeout=timeout)
    raise RuntimeError("No AI brain is connected yet. Pick one at the Connect counter: Claude, GPT, Gemini, your own agent, or free Foundry Local.")


def read_image(data_url, path, prompt):
    """Read a screenshot with Claude (from the saved file) or any vision-capable GPT/Gemini/agent model."""
    eng = pick_brain()
    if eng == "claude":
        return ask_claude(prompt.replace("{path}", str(path)), allow_web=False, files_ok=True, timeout=180)
    if eng in COMPAT:
        return ask_compat(eng, prompt.replace("{path}", "the attached image"), system="You read screenshots precisely and reply with JSON only.", image_data_url=data_url)
    raise RuntimeError("Reading screenshots needs Claude, GPT, Gemini or a vision-capable agent. Connect one at the Connect counter, or type it in.")


HOAGIE_VOICE = (
    "You are Constable Hoagie, the friendly deli-counter money helper in the user's app. "
    "The user has ADHD: lead with the one thing that matters in one sentence, then at most 3 short bullets. "
    "Plain words, no jargon. Be honest about risk and uncertainty; never promise profit. "
    "You are not a licensed financial advisor; say so only if they ask for personal financial advice."
)


def ask(question, engine="auto", context=""):
    eng = pick_engine(engine)
    if eng == "claude":
        prompt = HOAGIE_VOICE + ("\n\nWhat the app knows right now:\n" + context if context else "") + "\n\nQuestion: " + question
        task = "quick" if looks_quick(question) else "deep"
        return {"engine": "claude", "answer": ask_claude(prompt, task=task),
                "model": model_for(task) or "your account's default"}
    if eng == "foundry":
        prompt = (context[:3000] + "\n\n" if context else "") + question
        return {"engine": "foundry", "answer": ask_foundry(prompt)}
    if eng in COMPAT:
        prompt = ("What the app knows right now:\n" + context[:6000] + "\n\n" if context else "") + "Question: " + question
        return {"engine": eng, "answer": ask_compat(eng, prompt), "model": compat_model(eng)}
    if eng == "tavily":
        r = feeds.tavily_search(question)
        return {"engine": "tavily", "answer": r["answer"], "results": r["results"]}
    if eng == "brave":
        r = feeds.brave_search(question)
        return {"engine": "brave", "answer": "", "results": r["results"]}
    raise RuntimeError("No helper is connected yet. Visit the Connect counter: Claude, GPT, Gemini, your own agent, a free Tavily key, or free Foundry Local all work.")


def json_from(text):
    """Pull the first JSON object or array out of a model's reply."""
    m = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.S)
    raw = m.group(1) if m else None
    if raw is None:
        start = min([i for i in (text.find("{"), text.find("[")) if i >= 0] or [-1])
        if start < 0:
            raise ValueError("no JSON in reply")
        raw = text[start:]
        # trim trailing chatter after the last closing brace/bracket
        end = max(raw.rfind("}"), raw.rfind("]"))
        raw = raw[: end + 1]
    return json.loads(raw)
