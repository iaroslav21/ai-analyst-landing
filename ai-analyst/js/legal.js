(function () {
  const LANG_KEY = "ai-analyst-lang";
  const page = document.body.dataset.legalPage;
  const I18N = window.AI_ANALYST_I18N;

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function render(lang) {
    const pack = I18N[lang]?.legal?.[page];
    if (!pack) return;
    document.documentElement.lang = lang;
    document.title = pack.title + " — AI Analyst";
    document.getElementById("legalTitle").textContent = pack.title;
    document.getElementById("legalBody").innerHTML = pack.sections
      .map((s) => `<h2>${s.h}</h2><p>${s.p}</p>`)
      .join("");
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = get(I18N[lang], el.getAttribute("data-i18n"));
      if (v) el.textContent = v;
    });
  }

  let lang = localStorage.getItem(LANG_KEY) || "ro";
  render(lang);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      lang = btn.dataset.lang;
      localStorage.setItem(LANG_KEY, lang);
      render(lang);
    });
  });
})();
