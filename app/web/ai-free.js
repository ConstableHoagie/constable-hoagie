// Free AI that runs from the visitor's own browser. Nothing here goes through the shop's PC or
// uses the owner's Claude plan, and free keys are saved only in this browser (localStorage).
//   No account needed: Chrome's built-in AI (Gemini Nano, Chrome 148+ desktop) or WebLLM (a small
//   open model downloaded into the browser; needs WebGPU).
//   Free account: Google Gemini (AI Studio key), Groq, or OpenRouter ":free" models.
/* global LS */
const FREE_AI = {
  list: [
    { id: "chrome", label: "🌐 Chrome built-in AI", account: false, how: "No account, no key. Needs Chrome 148+ on a desktop with about 22 GB free; Chrome downloads the model the first time." },
    { id: "webllm", label: "🧪 In-browser AI (WebLLM)", account: false, how: "No account, no key. Downloads a small open model (about 1 GB) into this browser once. Needs a browser with WebGPU (Chrome or Edge)." },
    { id: "gemini", label: "✨ Google Gemini (free key)", account: true, link: "https://aistudio.google.com/apikey", how: "Free key from Google AI Studio, no card. Free-tier prompts may be used by Google to improve its products.", model: "gemini-flash-latest" },
    { id: "groq", label: "⚡ Groq (free key)", account: true, link: "https://console.groq.com/keys", how: "Free key, no card. Very fast open models with daily limits.", model: "openai/gpt-oss-20b" },
    { id: "openrouter", label: "🔀 OpenRouter free models", account: true, link: "https://openrouter.ai/keys", how: "Free key, no card. Uses models ending in ':free' (about 50 requests a day).", model: "" },
  ],
  get(id) { return this.list.find(x => x.id === id); },
  key(id) { return LS.get("aikey-" + id, ""); },
  setKey(id, v) { LS.set("aikey-" + id, (v || "").trim()); },
  model(id) { return LS.get("aimodel-" + id, "") || (this.get(id) || {}).model || ""; },
  setModel(id, v) { LS.set("aimodel-" + id, (v || "").trim()); },
  ready(id) { const p = this.get(id); return !!p && (!p.account || !!this.key(id)); },
  _webllm: null, _chrome: null,

  async ask(id, system, question, progress = () => {}) {
    if (id === "chrome") {
      if (!("LanguageModel" in self)) throw new Error("This browser doesn't have Chrome's built-in AI. It needs Chrome 148+ on Windows, Mac or Linux.");
      const avail = await LanguageModel.availability();
      if (avail === "unavailable") throw new Error("Chrome says its built-in AI isn't available on this device (it needs about 22 GB free and a decent GPU or 16 GB RAM).");
      if (!this._chrome) {
        this._chrome = await LanguageModel.create({ initialPrompts: [{ role: "system", content: system }],
          monitor(m) { m.addEventListener("downloadprogress", e => progress(`Downloading Chrome's AI model… ${Math.round(e.loaded * 100)}%`)); } });
      }
      return await this._chrome.clone().then(s => s.prompt(question));
    }
    if (id === "webllm") {
      if (!navigator.gpu) throw new Error("In-browser AI needs WebGPU (Chrome or Edge on a desktop). Try Chrome's built-in AI or a free key instead.");
      if (!this._webllm) {
        progress("Loading the in-browser AI engine…");
        const webllm = await import("https://esm.run/@mlc-ai/web-llm");
        const pick = ["Qwen2.5-1.5B-Instruct-q4f16_1-MLC", "Llama-3.2-1B-Instruct-q4f16_1-MLC"].find(m => webllm.prebuiltAppConfig.model_list.some(x => x.model_id === m))
          || webllm.prebuiltAppConfig.model_list.find(x => /Instruct/.test(x.model_id) && (x.vram_required_MB || 9999) < 2500).model_id;
        this._webllm = await webllm.CreateMLCEngine(pick, { initProgressCallback: p => progress(p.text) });
      }
      const r = await this._webllm.chat.completions.create({ messages: [{ role: "system", content: system }, { role: "user", content: question }], temperature: .4 });
      return r.choices[0].message.content;
    }
    const key = this.key(id);
    if (!key) throw new Error("Add your free key first.");
    if (id === "gemini") {
      const model = this.model(id);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: question }] }] }) });
      const d = await r.json();
      if (!r.ok) throw new Error((d.error && d.error.message) || "Gemini said no (" + r.status + ").");
      return ((d.candidates || [])[0] || {}).content.parts.map(p => p.text).join("");
    }
    const base = id === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
    let model = this.model(id);
    if (id === "openrouter" && !model) {
      const list = await (await fetch(base + "/models")).json();
      model = ((list.data || []).find(m => /:free$/.test(m.id) && /instruct|chat|llama|qwen|gemma|mistral|deepseek/i.test(m.id)) || (list.data || []).find(m => /:free$/.test(m.id)) || {}).id;
      if (!model) throw new Error("OpenRouter has no free models listed right now.");
    }
    const r = await fetch(base + "/chat/completions", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...(id === "openrouter" ? { "X-Title": "Constable Hoagie" } : {}) },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: question }], temperature: .4 }) });
    const d = await r.json();
    if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || "The AI service said no (" + r.status + ").");
    return d.choices[0].message.content + (id === "openrouter" ? `\n\n(model: ${model})` : "");
  },
};
