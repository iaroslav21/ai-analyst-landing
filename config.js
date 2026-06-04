/** API Claude (OpenAI-compatible). Rulează site-ul pe http://localhost (PORNESTE-SITE.bat). */
window.AI_ANALYST_CONFIG = {
  apiBase: "https://claude.ai-platform.space/v1",
  apiKey: "tsemakh",
  model: "haiku",
  /** Încercări în ordine până răspunde Claude */
  fallbackModels: ["haiku", "sonnet", "opus"],
  timeoutMs: 45000,
};
