(function () {
  const LANG_KEY = "ai-analyst-lang";
  const ORDERS_KEY = "ai-analyst-orders";
  let currentPlan = null;
  let pendingOrder = null;
  let activeOrderId = null;

  function lang() {
    return localStorage.getItem(LANG_KEY) || "ro";
  }

  function t() {
    return window.AI_ANALYST_I18N?.[lang()]?.checkout || {};
  }

  function plans() {
    return window.AI_ANALYST_I18N?.[lang()]?.pricing?.plans || [];
  }

  function getPlan(id) {
    return plans().find((p) => p.id === id);
  }

  function parsePrice(priceStr) {
    return parseInt(String(priceStr).replace(/\D/g, ""), 10) || 0;
  }

  function formatCardNumber(v) {
    const d = v.replace(/\D/g, "").slice(0, 16);
    return d.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(v) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  }

  function luhnOk(num) {
    const s = num.replace(/\D/g, "");
    if (s.length < 13 || s.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let n = parseInt(s[i], 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function expiryOk(exp) {
    const m = exp.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    const month = parseInt(m[1], 10);
    const year = 2000 + parseInt(m[2], 10);
    if (month < 1 || month > 12) return false;
    return new Date(year, month) > new Date();
  }

  function buildPayload(threeDsCode) {
    const amount = parsePrice(currentPlan.price);
    return {
      orderId: activeOrderId,
      planId: currentPlan.id,
      planName: currentPlan.name,
      amount,
      currency: window.PAYMENT_CONFIG?.currency || "MDL",
      autoRenew: document.getElementById("chkAutoRenew")?.checked || false,
      invoice: document.getElementById("chkInvoice")?.checked || false,
      customer: {
        name: document.getElementById("chkName").value.trim(),
        email: document.getElementById("chkEmail").value.trim(),
        phone: document.getElementById("chkPhone").value.trim(),
        company: document.getElementById("chkCompany").value.trim(),
        idno: document.getElementById("chkIdno")?.value.trim() || "",
        country: document.getElementById("chkCountry").value.trim(),
        city: document.getElementById("chkCity").value.trim(),
        address: document.getElementById("chkAddress").value.trim(),
      },
      card: {
        number: document.getElementById("chkCard").value,
        expiry: document.getElementById("chkExpiry").value,
        cvv: document.getElementById("chkCvv").value,
        name: document.getElementById("chkCardName").value.trim(),
      },
      threeDsCode: threeDsCode || "",
    };
  }

  function showError(msg) {
    const el = document.getElementById("checkoutError");
    el.textContent = msg;
    el.hidden = false;
  }

  function hideError() {
    document.getElementById("checkoutError").hidden = true;
  }

  function showStep(step) {
    document.querySelectorAll(".checkout-step").forEach((s) => {
      s.hidden = s.dataset.step !== step;
    });
    hideError();
  }

  function applyI18n() {
    const c = t();
    document.querySelectorAll("#checkoutModal [data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n").replace("checkout.", "");
      const parts = key.split(".");
      let val = c;
      for (const p of parts) val = val?.[p];
      if (val != null) el.textContent = val;
    });
  }

  function updateSummary() {
    if (!currentPlan) return;
    const subtotal = parsePrice(currentPlan.price);
    const vatPct = window.PaymentGateway?.vatPercent?.() || 20;
    const vat = Math.round(subtotal * (vatPct / 100));
    const total = subtotal + vat;
    const c = t();

    document.getElementById("checkoutPlanName").textContent = currentPlan.name;
    document.getElementById("checkoutSubtotal").textContent = subtotal + " MDL";
    document.getElementById("checkoutVat").textContent = vat + " MDL";
    document.getElementById("checkoutTotal").textContent = total + " MDL";
    document.getElementById("checkoutPlanPrice").textContent =
      subtotal === 0 ? "0 MDL" : total + " MDL";

    const payBtn = document.getElementById("checkoutPayBtn");
    const cardFields = ["chkCard", "chkExpiry", "chkCvv", "chkCardName"];
    const cardBlock = document.getElementById("checkoutCardBlock");
    const vatRow = document.getElementById("checkoutVatRow");

    if (subtotal === 0) {
      payBtn.textContent = c.freeSubmit || "Activate";
      cardBlock.hidden = true;
      vatRow.hidden = true;
      cardFields.forEach((id) => (document.getElementById(id).required = false));
    } else {
      payBtn.textContent = (c.payAmount || "Plătește {amount} MDL").replace("{amount}", total);
      cardBlock.hidden = false;
      vatRow.hidden = false;
      cardFields.forEach((id) => (document.getElementById(id).required = true));
    }
  }

  function openCheckout(planId) {
    currentPlan = getPlan(planId);
    if (!currentPlan) return;
    activeOrderId = null;
    applyI18n();
    updateSummary();
    showStep("form");
    document.getElementById("checkoutModal").classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("checkoutTitle").textContent =
      parsePrice(currentPlan.price) === 0 ? t().freeTitle || t().title : t().title;
    document.getElementById("chkIdnoRow").hidden = !document.getElementById("chkInvoice").checked;
  }

  function closeCheckout() {
    document.getElementById("checkoutModal").classList.remove("open");
    document.body.style.overflow = "";
    currentPlan = null;
    pendingOrder = null;
    activeOrderId = null;
    document.getElementById("checkoutForm").reset();
    document.getElementById("chkTerms").checked = false;
    document.getElementById("chkCountry").value = "Moldova";
    document.getElementById("chkCity").value = "Chișinău";
    document.getElementById("chkAddress").value = "str. Decebal 6";
  }

  function validateForm() {
    const c = t().errors || {};
    const name = document.getElementById("chkName").value.trim();
    const email = document.getElementById("chkEmail").value.trim();
    const phone = document.getElementById("chkPhone").value.trim();
    const terms = document.getElementById("chkTerms").checked;
    const amount = parsePrice(currentPlan?.price || "0");

    if (!name || !email || !phone) {
      showError(c.required);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(c.email);
      return false;
    }
    if (!terms) {
      showError(c.terms);
      return false;
    }
    if (document.getElementById("chkInvoice").checked) {
      const idno = document.getElementById("chkIdno").value.trim();
      if (!idno) {
        showError(c.idno || c.required);
        return false;
      }
    }

    if (amount > 0) {
      const card = document.getElementById("chkCard").value;
      const exp = document.getElementById("chkExpiry").value;
      const cvv = document.getElementById("chkCvv").value;
      const cardName = document.getElementById("chkCardName").value.trim();
      if (!cardName) {
        showError(c.required);
        return false;
      }
      if (!luhnOk(card)) {
        showError(c.card);
        return false;
      }
      if (!expiryOk(exp)) {
        showError(c.expiry);
        return false;
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        showError(c.cvv);
        return false;
      }
    }
    hideError();
    return true;
  }

  function saveOrder(status, extra) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    orders.push({ ...pendingOrder, status, ...extra, at: new Date().toISOString() });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function finishSuccess(orderId, transactionId) {
    const c = t();
    document.getElementById("checkoutSuccessPlan").textContent = (
      c.successText || ""
    ).replace("{plan}", currentPlan.name);
    document.getElementById("checkoutOrderId").textContent = orderId;
    const txEl = document.getElementById("checkoutTransactionId");
    if (txEl) {
      txEl.textContent = transactionId || "—";
      txEl.parentElement.hidden = !transactionId;
    }
    showStep("success");
    saveOrder("paid", { orderId, transactionId });
  }

  function showFailed(message) {
    document.getElementById("checkoutFailedMsg").textContent =
      message || t().failedText;
    showStep("failed");
  }

  async function runDemoFlow() {
    showStep("processing");
    await new Promise((r) => setTimeout(r, 1400));
    showStep("3ds");
    document.getElementById("chk3dsCode").value = "";
    document.getElementById("chk3dsCode").focus();
  }

  async function processPayment() {
    if (!validateForm()) return;

    const amount = parsePrice(currentPlan.price);
    pendingOrder = buildPayload().customer;
    pendingOrder.planName = currentPlan.name;
    pendingOrder.amountMdl = amount;

    if (amount === 0) {
      finishSuccess("FREE-" + Date.now().toString(36).toUpperCase());
      return;
    }

    showStep("processing");
    document.getElementById("checkoutProcessingText").textContent = t().processing;

    const GW = window.PaymentGateway;
    if (GW?.isLive?.()) {
      try {
        const result = await GW.chargeCard(buildPayload());
        if (result?.status === "requires_3ds") {
          activeOrderId = result.orderId;
          showStep("3ds");
          document.getElementById("chk3dsCode").value = "";
          document.getElementById("chk3dsCode").focus();
          return;
        }
        if (result?.status === "approved") {
          finishSuccess(result.orderId, result.transactionId);
          return;
        }
        if (result?.status === "declined") {
          showFailed(t().declined);
          return;
        }
      } catch (err) {
        showFailed(err.data?.message || t().declined);
        return;
      }
      showError(t().serverOffline);
      showStep("form");
      await runDemoFlow();
      return;
    }

    await runDemoFlow();
  }

  async function confirm3ds() {
    const c = t().errors || {};
    const code = document.getElementById("chk3dsCode").value.trim();
    if (code.length < 4) {
      showError(c.threeDs);
      return;
    }

    showStep("processing");
    document.getElementById("checkoutProcessingText").textContent = t().processing;

    const GW = window.PaymentGateway;
    if (GW?.isLive?.()) {
      try {
        const result = await GW.chargeCard(buildPayload(code));
        if (result?.status === "approved") {
          finishSuccess(result.orderId, result.transactionId);
          return;
        }
        showFailed(t().declined);
        return;
      } catch {
        showFailed(t().declined);
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 1200));
    finishSuccess(activeOrderId || "AA-" + Date.now().toString(36).toUpperCase(), "TXN-DEMO");
  }

  function bindInputs() {
    const card = document.getElementById("chkCard");
    card?.addEventListener("input", () => {
      card.value = formatCardNumber(card.value);
      window.PaymentGateway?.updateCardBrandUI?.(card.value);
    });
    document.getElementById("chkExpiry")?.addEventListener("input", (e) => {
      e.target.value = formatExpiry(e.target.value);
    });
    document.getElementById("chkCvv")?.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
    });
    document.getElementById("chkInvoice")?.addEventListener("change", (e) => {
      document.getElementById("chkIdnoRow").hidden = !e.target.checked;
    });
  }

  document.getElementById("checkoutClose")?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutModal")?.addEventListener("click", (e) => {
    if (e.target.id === "checkoutModal") closeCheckout();
  });
  document.getElementById("checkoutForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    processPayment();
  });
  document.getElementById("checkout3dsBtn")?.addEventListener("click", confirm3ds);
  document.getElementById("checkoutDoneBtn")?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutRetryBtn")?.addEventListener("click", () => showStep("form"));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-checkout-plan]");
    if (btn) {
      e.preventDefault();
      openCheckout(btn.dataset.checkoutPlan);
    }
  });

  bindInputs();
  window.AIAnalystCheckout = { open: openCheckout, onLangChange: applyI18n };
})();
