(function () {
  const LANG_KEY = "ai-analyst-lang";
  const I18N = window.AI_ANALYST_I18N;
  let lang = localStorage.getItem(LANG_KEY) || "ro";
  let demoRunning = false;

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function setLang(next) {
    if (!I18N[next]) return;
    lang = next;
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    const t = I18N[next];

    document.title = t.meta.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t.meta.description;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = get(t, el.getAttribute("data-i18n"));
      if (val == null) return;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else el.textContent = val;
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === next);
      btn.setAttribute("aria-pressed", btn.dataset.lang === next);
    });

    renderLists(t);
    if (!demoRunning) resetDemoUI(t);
    window.AIAnalystChat?.onLangChange?.();
    window.AIAnalystCheckout?.onLangChange?.();

    const chatInput = document.getElementById("chatInput");
    if (chatInput && t.chat?.placeholder) chatInput.placeholder = t.chat.placeholder;
  }

  function renderLists(t) {
    const problemGrid = document.getElementById("problemGrid");
    if (problemGrid) {
      problemGrid.innerHTML = t.problem.items
        .map(
          (item, i) => `
        <article class="card reveal">
          <div class="card-icon">${["📚", "💬", "🔍", "🗂️", "⏱️", "📉"][i]}</div>
          <h3>${item.t}</h3>
          <p>${item.d}</p>
        </article>`
        )
        .join("");
    }

    const featuresGrid = document.getElementById("featuresGrid");
    if (featuresGrid) {
      featuresGrid.innerHTML = t.features.items
        .map(
          (item) => `
        <article class="card reveal">
          <div class="card-icon">${item.icon}</div>
          <h3>${item.t}</h3>
          <p>${item.d}</p>
        </article>`
        )
        .join("");
    }

    const stepsRow = document.getElementById("stepsRow");
    if (stepsRow) {
      stepsRow.innerHTML = t.how.steps
        .map(
          (step, i) => `
        <div class="step reveal">
          <div class="step-num">0${i + 1}</div>
          <h3>${step.t}</h3>
          <p>${step.d}</p>
        </div>`
        )
        .join("");
    }

    const pipelineFiles = document.getElementById("pipelineFiles");
    if (pipelineFiles) {
      const icons = ["📄", "💬", "📝", "📊"];
      pipelineFiles.innerHTML = t.pipeline.files
        .map(
          (name, i) => `
        <div class="file-row"><span class="file-ico">${icons[i]}</span><span>${name}</span></div>`
        )
        .join("");
    }

    const pipelineOutputs = document.getElementById("pipelineOutputs");
    if (pipelineOutputs) {
      const colors = ["var(--green)", "var(--accent)", "var(--gold)", "var(--accent2)"];
      pipelineOutputs.innerHTML = t.pipeline.outputs
        .map(
          (o, i) => `
        <div class="out-card">
          <div class="out-tag"><span class="out-dot" style="background:${colors[i]}"></span> ${o.label}</div>
          ${o.text}
        </div>`
        )
        .join("");
    }

    const beforeList = document.getElementById("beforeList");
    const afterList = document.getElementById("afterList");
    if (beforeList)
      beforeList.innerHTML = t.solution.before
        .map((x) => `<li><span class="ba-dot before"></span>${x}</li>`)
        .join("");
    if (afterList)
      afterList.innerHTML = t.solution.after
        .map((x) => `<li><span class="ba-dot after"></span>${x}</li>`)
        .join("");

    const beforeTitle = document.getElementById("beforeTitle");
    const afterTitle = document.getElementById("afterTitle");
    if (beforeTitle) beforeTitle.textContent = t.solution.beforeLabel;
    if (afterTitle) afterTitle.textContent = t.solution.afterLabel;

    const demoOutputs = document.getElementById("demoOutputList");
    if (demoOutputs)
      demoOutputs.innerHTML = t.demo.outputs.map((o) => `<li>✓ ${o}</li>`).join("");

    const audienceTags = document.getElementById("audienceTags");
    if (audienceTags)
      audienceTags.innerHTML = t.audience.items.map((x) => `<span class="tag">${x}</span>`).join("");

    const benefitsRow = document.getElementById("benefitsRow");
    if (benefitsRow) {
      const icons = ["⏱", "🔄", "⚡", "📊", "🎯"];
      benefitsRow.innerHTML = t.benefits.items
        .map((b, i) => `<span class="benefit-pill">${icons[i]} ${b}</span>`)
        .join("");
    }

    const statsRow = document.getElementById("statsRow");
    if (statsRow)
      statsRow.innerHTML = t.proof.stats
        .map((s) => `<div class="stat"><div class="stat-n">${s.n}</div><div class="stat-l">${s.l}</div></div>`)
        .join("");

    const logosRow = document.getElementById("logosRow");
    if (logosRow) logosRow.innerHTML = t.proof.logos.map((l) => `<span>${l}</span>`).join("");

    const pricingGrid = document.getElementById("pricingGrid");
    if (pricingGrid)
      pricingGrid.innerHTML = t.pricing.plans
        .map(
          (plan) => `
        <article class="price-card${plan.popular ? " popular" : ""}">
          ${plan.popular ? `<span class="price-badge">${t.pricing.popular}</span>` : ""}
          <h3>${plan.name}</h3>
          <div class="price-amount"><span class="price-num">${plan.price}</span> <span class="price-currency">MDL</span><span class="price-period">${t.pricing.perMonth}</span></div>
          <ul class="price-features">${plan.features.map((f) => `<li>${f}</li>`).join("")}</ul>
          <button type="button" class="${plan.popular ? "btn-primary" : "btn-ghost"}" data-checkout-plan="${plan.id || plan.name.toLowerCase()}" style="width:100%;justify-content:center;margin-top:auto">${plan.cta}</button>
        </article>`
        )
        .join("");

    const testimonialsGrid = document.getElementById("testimonialsGrid");
    if (testimonialsGrid)
      testimonialsGrid.innerHTML = t.testimonials
        .map(
          (x) => `
        <article class="testimonial reveal">
          <p class="test-text">${x.text}</p>
          <div class="test-author">
            <div class="avatar">${x.initials}</div>
            <div><div class="test-name">${x.name}</div><div class="test-role">${x.role}</div></div>
          </div>
        </article>`
        )
        .join("");

    observeReveal();
  }

  function openModal() {
    document.getElementById("leadModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    document.getElementById("leadModal").classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("formError").hidden = true;
    document.getElementById("formSuccess").hidden = true;
    document.getElementById("leadForm").hidden = false;
  }

  function handleForm(e) {
    e.preventDefault();
    const t = I18N[lang].form;
    const name = document.getElementById("fName").value.trim();
    const email = document.getElementById("fEmail").value.trim();
    const err = document.getElementById("formError");
    const ok = document.getElementById("formSuccess");
    const form = document.getElementById("leadForm");

    err.hidden = true;
    if (!name || !email) {
      err.textContent = t.errorRequired;
      err.hidden = false;
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = t.errorEmail;
      err.hidden = false;
      return;
    }

    const leads = JSON.parse(localStorage.getItem("ai-analyst-leads") || "[]");
    leads.push({
      name,
      email,
      company: document.getElementById("fCompany").value.trim(),
      message: document.getElementById("fMessage").value.trim(),
      lang,
      at: new Date().toISOString(),
    });
    localStorage.setItem("ai-analyst-leads", JSON.stringify(leads));

    form.hidden = true;
    ok.hidden = false;
  }

  function resetDemoUI(t) {
    const btn = document.getElementById("runDemoBtn");
    const status = document.getElementById("demoStatus");
    const count = document.getElementById("processedCount");
    if (btn) {
      btn.textContent = t.demo.run;
      btn.disabled = false;
      btn.classList.remove("done");
    }
    if (status) status.textContent = "";
    if (count) count.textContent = "—";
    ["outQ", "outIssues", "outSummary", "outFaq", "outSentiment"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
  }

  function typeText(el, text, speed = 12) {
    return new Promise((resolve) => {
      let i = 0;
      el.textContent = "";
      const tick = () => {
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(tick, speed);
        } else resolve();
      };
      tick();
    });
  }

  function animateCounter(el, target, duration) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(target * p).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    };
    requestAnimationFrame(step);
  }

  async function runDemo() {
    if (demoRunning) return;
    demoRunning = true;
    const t = I18N[lang].demo;
    const btn = document.getElementById("runDemoBtn");
    const status = document.getElementById("demoStatus");

    btn.disabled = true;
    btn.textContent = t.running;
    status.innerHTML = '<span class="status-dot pulse"></span> ' + t.running;

    animateCounter(document.getElementById("processedCount"), 5000, 1800);

    await new Promise((r) => setTimeout(r, 600));
    await typeText(document.getElementById("outQ"), t.sampleQ);
    await new Promise((r) => setTimeout(r, 400));
    await typeText(document.getElementById("outIssues"), t.sampleIssues);
    await new Promise((r) => setTimeout(r, 400));
    await typeText(document.getElementById("outSummary"), t.sampleSummary);
    await new Promise((r) => setTimeout(r, 400));
    await typeText(document.getElementById("outFaq"), t.sampleFaq);
    await new Promise((r) => setTimeout(r, 400));
    await typeText(document.getElementById("outSentiment"), t.sampleSentiment);

    status.innerHTML = '<span class="status-dot ok"></span> ' + t.done;
    btn.textContent = t.reset;
    btn.disabled = false;
    btn.classList.add("done");
    demoRunning = false;

    btn.onclick = () => {
      resetDemoUI(I18N[lang]);
      btn.classList.remove("done");
      btn.onclick = runDemo;
      runDemo();
    };
  }

  function observeReveal() {
    document.querySelectorAll(".reveal:not(.observed)").forEach((el) => {
      el.classList.add("observed");
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("visible");
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      obs.observe(el);
    });
  }

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-modal]")) openModal();
  });

  document.getElementById("closeModal")?.addEventListener("click", closeModal);
  document.getElementById("leadModal")?.addEventListener("click", (e) => {
    if (e.target.id === "leadModal") closeModal();
  });
  document.getElementById("leadForm")?.addEventListener("submit", handleForm);
  document.getElementById("runDemoBtn")?.addEventListener("click", runDemo);

  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("nav").classList.toggle("open");
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        document.getElementById("nav").classList.remove("open");
      }
    });
  });

  document.addEventListener("mousemove", (e) => {
    const g = document.getElementById("glow");
    if (g) {
      g.style.left = e.clientX + "px";
      g.style.top = e.clientY + "px";
    }
  });

  setLang(lang);
})();
