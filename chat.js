(function () {
  const LANG_KEY = "ai-analyst-lang";
  const cfg = window.AI_ANALYST_CONFIG || {};
  const messagesEl = document.getElementById("chatMessages");
  const panel = document.getElementById("chatPanel");
  const fab = document.getElementById("chatFab");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  let history = [];
  let welcomed = false;
  let busy = false;

  function lang() {
    return localStorage.getItem(LANG_KEY) || "ro";
  }

  function t() {
    return window.AI_ANALYST_I18N?.[lang()]?.chat || {};
  }

  function systemPrompt() {
    const l = lang();
    const base = {
      ro: `Ești Claude, asistentul AI al platformei AI Analyst (powered by Claude). Răspunde scurt, cald, în română. Firmă: tel 060 833 229, email meroowiiwii@gmail.com, str. Decebal 6, Chișinău. Prețuri MDL/lună: Gratuit 0, Start 399, Pro 799, Business 1599. Plată cu cardul online în site.`,
      ru: `Ты Claude, ассистент AI Analyst. Тел. 060 833 229, meroowiiwii@gmail.com, ул. Дечебал 6, Кишинёв. Тарифы MDL: 0 / 399 / 799 / 1599. Оплата картой на сайте.`,
      en: `You are Claude, AI Analyst assistant. Phone 060 833 229, meroowiiwii@gmail.com, Chișinău. Plans MDL/mo: Free 0, Start 399, Pro 799, Business 1599. Card payment on site.`,
    };
    return base[l] || base.ro;
  }

  function appendMessage(role, text, meta) {
    const wrap = document.createElement("div");
    wrap.className = `chat-msg-wrap ${role}`;

    if (role === "bot" && meta?.claude) {
      const badge = document.createElement("span");
      badge.className = "chat-claude-badge";
      badge.textContent = meta.modelLabel || "Claude";
      wrap.appendChild(badge);
    }

    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    wrap.appendChild(div);

    if (role === "bot" && meta?.fallback) {
      const note = document.createElement("span");
      note.className = "chat-fallback-note";
      note.textContent = meta.fallbackNote || "";
      wrap.appendChild(note);
    }

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function localFallback(userText) {
    const l = lang();
    const low = userText.toLowerCase();
    const contact = {
      ro: "Sunt Claude (mod local). Ne poți contacta la 060 833 229, meroowiiwii@gmail.com sau str. Decebal 6, Chișinău.",
      ru: "Я Claude (локальный режим). Тел. 060 833 229, meroowiiwii@gmail.com, ул. Дечебал 6, Кишинёв.",
      en: "I'm Claude (offline mode). Contact: 060 833 229, meroowiiwii@gmail.com, 6 Decebal St, Chișinău.",
    };
    const prices = {
      ro: "Abonamente MDL/lună: Gratuit 0 · Start 399 · Pro 799 · Business 1.599. Cumpără cu cardul din secțiunea Prețuri.",
      ru: "Тарифы MDL: 0 · 399 · 799 · 1.599. Оплата картой в разделе Цены.",
      en: "Plans MDL/month: Free 0 · Start 399 · Pro 799 · Business 1,599. Pay by card in Pricing.",
    };
    const hello = {
      ro: "Bună! Sunt Claude, asistentul AI Analyst. Cu ce te pot ajuta — prețuri, demo sau contact?",
      ru: "Здравствуйте! Я Claude, ассистент AI Analyst. Чем помочь?",
      en: "Hi! I'm Claude, your AI Analyst assistant. How can I help?",
    };
    const claude = {
      ro: "Da, folosim Claude (Anthropic) pentru analiză și chat. Încarcă documente sau conversații și primești rezumate, FAQ și rapoarte în minute.",
      ru: "Да, мы используем Claude для анализа и чата. Загрузите документы — получите резюме и отчёты за минуты.",
      en: "Yes, we use Claude for analysis and chat. Upload docs or chats and get summaries, FAQ, and reports in minutes.",
    };
    if (/claude|клод|антроп/.test(low)) return claude[l];
    if (/pre[tț]|price|цен|тариф|plan|abon/.test(low)) return prices[l];
    if (/contact|telefon|phone|email|adres|адрес/.test(low)) return contact[l];
    if (/salut|bună|hello|привет|hi\b|buna/.test(low)) return hello[l];
    return {
      ro: "Cu Claude, AI Analyst analizează PDF-uri și conversații și generează rezumate și rapoarte. Pentru suport: 060 833 229.",
      ru: "С Claude, AI Analyst анализирует документы и переписки. Поддержка: 060 833 229.",
      en: "With Claude, AI Analyst analyzes your files and chats. Support: 060 833 229.",
    }[l];
  }

  function modelsToTry() {
    const list = cfg.fallbackModels || [cfg.model || "haiku", "sonnet", "opus"];
    const primary = cfg.model || "haiku";
    return [...new Set([primary, ...list])];
  }

  async function requestClaude(apiMessages, model, useQueryKey) {
    const base = (cfg.apiBase || "").replace(/\/$/, "");
    const url = useQueryKey
      ? `${base}/chat/completions?key=${encodeURIComponent(cfg.apiKey)}`
      : `${base}/chat/completions`;

    const headers = { "Content-Type": "application/json" };
    if (!useQueryKey && cfg.apiKey) {
      headers.Authorization = `Bearer ${cfg.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs || 45000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          mode: "direct",
          max_tokens: 600,
          messages: apiMessages,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error?.message || data?.detail || res.statusText;
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }

      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("Empty reply");

      const usedModel = data.model || model;
      return { reply, model: usedModel };
    } finally {
      clearTimeout(timer);
    }
  }

  async function askClaude(userText) {
    const apiMessages = [
      { role: "system", content: systemPrompt() },
      ...history,
      { role: "user", content: userText },
    ];

    const errors = [];

    for (const model of modelsToTry()) {
      for (const useQueryKey of [false, true]) {
        try {
          const result = await requestClaude(apiMessages, model, useQueryKey);
          history.push({ role: "user", content: userText });
          history.push({ role: "assistant", content: result.reply });
          if (history.length > 20) history = history.slice(-20);
          return {
            reply: result.reply,
            modelLabel: `Claude · ${result.model}`,
            claude: true,
          };
        } catch (err) {
          errors.push(`${model}${useQueryKey ? " (?key)" : ""}: ${err.message}`);
        }
      }
    }

    throw new Error(errors.join(" | "));
  }

  async function sendUserMessage(text) {
    if (!text.trim() || busy) return;
    busy = true;
    const userText = text.trim();
    appendMessage("user", userText);
    input.value = "";

    const thinking = document.createElement("div");
    thinking.className = "chat-msg-wrap bot";
    const thinkInner = document.createElement("div");
    thinkInner.className = "chat-msg bot thinking";
    thinkInner.textContent = t().thinking || "...";
    thinking.appendChild(thinkInner);
    messagesEl.appendChild(thinking);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const result = await askClaude(userText);
      thinking.remove();
      appendMessage("bot", result.reply, {
        claude: true,
        modelLabel: result.modelLabel,
      });
    } catch (err) {
      console.warn("[AI Analyst chat] Claude API:", err.message);
      thinking.remove();
      const fb = localFallback(userText);
      appendMessage("bot", fb, {
        claude: true,
        modelLabel: "Claude",
        fallback: true,
        fallbackNote: t().offline || "",
      });
    }

    busy = false;
  }

  function openChat() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    fab.classList.add("hidden");
    if (!welcomed) {
      const w = t().welcome || "Hello!";
      appendMessage("bot", w, { claude: true, modelLabel: "Claude" });
      welcomed = true;
    }
    input.focus();
  }

  function closeChat() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    fab.classList.remove("hidden");
  }

  function updateUiStrings() {
    const pack = t();
    document.querySelectorAll("#chatPanel [data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n").replace("chat.", "");
      if (pack[key]) el.textContent = pack[key];
    });
    if (input && pack.placeholder) input.placeholder = pack.placeholder;
    fab.setAttribute("aria-label", pack.open || "Chat");
    document.getElementById("chatClose")?.setAttribute("aria-label", pack.close || "Close");
  }

  fab?.addEventListener("click", openChat);
  document.getElementById("chatClose")?.addEventListener("click", closeChat);
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendUserMessage(input.value);
  });

  window.AIAnalystChat = { onLangChange: updateUiStrings };
  updateUiStrings();
})();
