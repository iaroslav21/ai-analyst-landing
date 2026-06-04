(function () {
  const cfg = window.PAYMENT_CONFIG || { mode: "demo", apiBase: "http://localhost:8090/api/pay" };

  function apiRoot() {
    return (cfg.apiBase || "http://localhost:8090/api/pay").replace(/\/api\/pay\/?$/, "");
  }

  function detectBrand(num) {
    const s = num.replace(/\D/g, "");
    if (/^4/.test(s)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(s)) return "mastercard";
    if (/^(50|56|57|58|63|67)/.test(s)) return "maestro";
    return "card";
  }

  function updateCardBrandUI(number) {
    const brand = detectBrand(number);
    document.querySelectorAll(".card-brand-icon").forEach((el) => {
      el.classList.toggle("active", el.dataset.brand === brand);
    });
  }

  async function isServerUp() {
    try {
      const res = await fetch(`${apiRoot()}/api/pay/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiPost(path, body) {
    const res = await fetch(`${apiRoot()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || "payment_failed");
      err.data = data;
      throw err;
    }
    return data;
  }

  async function chargeCard(orderPayload) {
    if (cfg.mode !== "live") return null;
    if (!(await isServerUp())) return null;
    return apiPost("/api/pay/charge", orderPayload);
  }

  window.PaymentGateway = {
    detectBrand,
    updateCardBrandUI,
    chargeCard,
    isLive: () => cfg.mode === "live",
    isServerUp,
    vatPercent: () => cfg.vatPercent || 20,
  };
})();
