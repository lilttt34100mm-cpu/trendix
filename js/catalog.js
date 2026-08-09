/* Trendix — catalog rendering + cart logic.
   Depends on: I18N/WA_NUMBER/WA_MESSAGES (i18n.js), CATEGORIES/PRODUCTS (products.js).
   Talks to main.js only via the "trendix:langchange" custom event. */
(function () {
  "use strict";

  const CART_KEY = "trendix-cart-v1";

  /* ============================================================
     Cart incentive config — the ONE place to change thresholds/%s.
     Thresholds are grounded in the catalog's actual top-seller prices
     (avg. top-seller ≈ $34, after the $5 flat price increase):
     milestone 1 sits at ~1.5x that average, milestone 2 double
     milestone 1.
     ============================================================ */
  const CART_MILESTONES = [
    { threshold: 50, discountPercent: 5 },
    { threshold: 100, discountPercent: 10 }
  ];
  /* higher-margin products to prefer suggesting when one of them alone
     closes the gap to the next milestone, in priority order */
  const SUGGESTION_PRIORITY = ["canva-pro", "capcut-pro", "picsart-pro", "duolingo-max", "youtube-premium"];

  /* current UI state */
  let activeCategory = "top";
  let searchQuery = "";
  /* productId -> plan index currently highlighted on its (not-yet-added) card */
  const uiPlan = {};
  /* productId -> plan index actually in the cart */
  let cart = {};

  function currentLang() {
    return document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
  }
  function t(key) {
    const dict = I18N[currentLang()] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }
  function categoryLabel(cat) {
    return currentLang() === "ar" ? cat.nameAr : cat.name;
  }
  function planLabel(plan) {
    return currentLang() === "ar" ? plan.labelAr : plan.label;
  }
  function money(n) {
    const rounded = Math.round(n * 100) / 100;
    return "$" + (Number.isInteger(rounded) ? rounded : rounded.toFixed(2));
  }

  /* ============================================================
     Cart persistence
     ============================================================ */
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      cart = raw ? JSON.parse(raw) : {};
    } catch (e) {
      cart = {};
    }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function getProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }
  function cartEntries() {
    return Object.keys(cart)
      .map((id) => {
        const product = getProduct(id);
        if (!product) return null;
        const planIndex = cart[id] || 0;
        const plan = product.plans[planIndex] || product.plans[0];
        return { product, planIndex, plan };
      })
      .filter(Boolean);
  }
  function cartTotal() {
    return cartEntries().reduce((sum, e) => sum + e.plan.price, 0);
  }
  function cartCount() {
    return Object.keys(cart).length;
  }

  /* ============================================================
     Milestone discount logic
     ============================================================ */
  function activeDiscountPercent(total) {
    let pct = 0;
    CART_MILESTONES.forEach((m) => { if (total >= m.threshold) pct = m.discountPercent; });
    return pct;
  }
  function discountedTotal(total) {
    const pct = activeDiscountPercent(total);
    return total * (1 - pct / 100);
  }
  function nextMilestone(total) {
    return CART_MILESTONES.find((m) => total < m.threshold) || null;
  }

  /* Pick one product (its cheapest plan) to suggest toward the next milestone.
     Priority items win when they alone close the gap; otherwise fall back to
     whatever gets the customer closest without going over. */
  function suggestProduct(remaining) {
    const inCart = new Set(Object.keys(cart));
    const candidates = PRODUCTS.filter((p) => !inCart.has(p.id)).map((p) => {
      const cheapest = p.plans.reduce((a, b) => (b.price < a.price ? b : a));
      return { product: p, plan: cheapest, price: cheapest.price };
    });
    if (!candidates.length) return null;

    for (const id of SUGGESTION_PRIORITY) {
      const c = candidates.find((c) => c.product.id === id);
      if (c && c.price >= remaining) return { product: c.product, plan: c.plan, price: c.price, closes: true };
    }

    const under = candidates.filter((c) => c.price <= remaining).sort((a, b) => b.price - a.price);
    if (under.length) {
      const c = under[0];
      return { product: c.product, plan: c.plan, price: c.price, closes: c.price === remaining };
    }

    const over = candidates.filter((c) => c.price > remaining).sort((a, b) => a.price - b.price);
    if (over.length) {
      const c = over[0];
      return { product: c.product, plan: c.plan, price: c.price, closes: true };
    }
    return null;
  }

  function progressCopy(lang, total) {
    const achieved = activeDiscountPercent(total);
    const next = nextMilestone(total);
    if (!next) {
      return {
        complete: true,
        msg: lang === "ar"
          ? `🎉 مبروك! فتحت خصم <strong>${achieved}%</strong> وبينطبق تلقائيًا عالطلب.`
          : `🎉 You've unlocked <strong>${achieved}% off</strong> — applied to your order!`
      };
    }
    const remaining = Math.max(0, next.threshold - total);
    const remainingStr = money(Math.ceil(remaining * 100) / 100);
    const msg = achieved > 0
      ? (lang === "ar"
          ? `خصم ${achieved}% مفعّل! انت على بعد <strong>${remainingStr}</strong> من خصم <strong>${next.discountPercent}%</strong>.`
          : `${achieved}% off unlocked! You're <strong>${remainingStr}</strong> away from <strong>${next.discountPercent}% off</strong>.`)
      : (lang === "ar"
          ? `انت على بعد <strong>${remainingStr}</strong> من خصم <strong>${next.discountPercent}%</strong> عطلبك.`
          : `You're <strong>${remainingStr}</strong> away from <strong>${next.discountPercent}% off</strong> your order.`);
    return { complete: false, msg, remaining, next };
  }

  function suggestionCopy(lang, suggestion, nextDiscountPercent) {
    const name = suggestion.product.name;
    const price = money(suggestion.price);
    if (suggestion.closes) {
      return lang === "ar"
        ? `ضيف ${name} (${price}) لتفتح خصم ${nextDiscountPercent}%.`
        : `Add ${name} (${price}) to unlock ${nextDiscountPercent}% off.`;
    }
    return lang === "ar"
      ? `ضيف ${name} (${price}) لتقرب من خصم ${nextDiscountPercent}%.`
      : `Add ${name} (${price}) to get closer to ${nextDiscountPercent}% off.`;
  }

  function addToCart(id, planIndex) {
    cart[id] = planIndex || 0;
    saveCart();
    renderAll();
  }
  function removeFromCart(id) {
    delete cart[id];
    saveCart();
    renderAll();
  }
  function setCartPlan(id, planIndex) {
    if (!(id in cart)) return;
    cart[id] = planIndex;
    saveCart();
    renderAll();
  }
  function clearCart() {
    cart = {};
    saveCart();
  }

  /* ============================================================
     Icons — generic, no third-party logos
     ============================================================ */
  const ICONS = {
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9 12 2"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    design: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="8.5" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M12 12a2 2 0 1 0 2 2c0-2 2-1 3-2a10 10 0 1 0-5 2Z"/></svg>',
    business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    engineering: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    learning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/></svg>'
  };
  function iconFor(catKey) {
    return ICONS[catKey] || ICONS.top;
  }

  /* ============================================================
     Filtering
     ============================================================ */
  function filteredProducts() {
    let list = PRODUCTS.filter((p) => (activeCategory === "top" ? p.topSeller : p.category === activeCategory));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = PRODUCTS.filter((p) => {
        const inCategory = activeCategory === "top" ? p.topSeller : p.category === activeCategory;
        return inCategory && p.name.toLowerCase().includes(q);
      });
      /* if nothing matches within the tab, widen the search to the whole catalog */
      if (!list.length) list = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }

  /* ============================================================
     Render: tabs
     ============================================================ */
  function renderTabs() {
    const wrap = document.querySelector("[data-catalog-tabs]");
    if (!wrap) return;
    wrap.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "catalog-tab" + (cat.key === activeCategory ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat.key === activeCategory ? "true" : "false");
      btn.textContent = categoryLabel(cat);
      btn.addEventListener("click", () => {
        activeCategory = cat.key;
        renderTabs();
        renderGrid();
      });
      wrap.appendChild(btn);
    });
  }

  /* ============================================================
     Render: product grid
     ============================================================ */
  function renderGrid() {
    const grid = document.querySelector("[data-product-grid]");
    const emptyEl = document.querySelector("[data-catalog-empty]");
    if (!grid) return;
    grid.innerHTML = "";

    const list = filteredProducts();
    if (emptyEl) emptyEl.hidden = list.length > 0;

    list.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card spotlight glass-edge";

      if (product.badge) {
        const badge = document.createElement("span");
        badge.className = "product-badge badge-" + product.badge;
        badge.textContent = t("product.badge." + product.badge);
        card.appendChild(badge);
      }

      const icon = document.createElement("div");
      if (product.logo) {
        icon.className = "product-icon has-logo";
        const img = document.createElement("img");
        img.src = "assets/icons/" + product.logo;
        img.alt = "";
        icon.appendChild(img);
      } else {
        icon.className = "product-icon";
        icon.innerHTML = iconFor(product.category);
      }
      card.appendChild(icon);

      const name = document.createElement("div");
      name.className = "product-name";
      name.textContent = product.name;
      card.appendChild(name);

      const catObj = CATEGORIES.find((c) => c.key === product.category);
      if (catObj) {
        const catLabel = document.createElement("div");
        catLabel.className = "product-category";
        catLabel.textContent = categoryLabel(catObj);
        card.appendChild(catLabel);
      }

      if (!(product.id in uiPlan)) uiPlan[product.id] = product.id in cart ? cart[product.id] : 0;
      const selectedIndex = uiPlan[product.id];

      const priceEl = document.createElement("div");
      priceEl.className = "product-price";
      function paintPrice() {
        const plan = product.plans[uiPlan[product.id]];
        priceEl.innerHTML =
          '<span class="amount">' + money(plan.price) + '</span><span class="unit">' + planLabel(plan) + "</span>";
      }

      if (product.plans.length > 1 && product.plans.length <= 3) {
        const chips = document.createElement("div");
        chips.className = "product-plans";
        product.plans.forEach((plan, i) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "plan-chip" + (i === selectedIndex ? " active" : "");
          chip.textContent = planLabel(plan);
          chip.addEventListener("click", () => {
            uiPlan[product.id] = i;
            chips.querySelectorAll(".plan-chip").forEach((c, ci) => c.classList.toggle("active", ci === i));
            paintPrice();
          });
          chips.appendChild(chip);
        });
        card.appendChild(chips);
      } else if (product.plans.length > 3) {
        const select = document.createElement("select");
        select.className = "plan-select";
        product.plans.forEach((plan, i) => {
          const opt = document.createElement("option");
          opt.value = String(i);
          opt.textContent = planLabel(plan) + " — " + money(plan.price);
          if (i === selectedIndex) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener("change", () => {
          uiPlan[product.id] = Number(select.value);
          paintPrice();
        });
        card.appendChild(select);
      }

      card.appendChild(priceEl);
      paintPrice();

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      const inCart = product.id in cart;
      addBtn.className = "btn btn-primary btn-block add-to-cart-btn" + (inCart ? " in-cart" : "");
      addBtn.textContent = inCart ? t("product.inCart") : t("product.addToCart");
      addBtn.addEventListener("click", () => addToCart(product.id, uiPlan[product.id]));
      card.appendChild(addBtn);

      grid.appendChild(card);
    });
  }

  /* ============================================================
     Render: cart drawer
     ============================================================ */
  function renderCart() {
    const body = document.querySelector("[data-cart-body]");
    const totalEl = document.querySelector("[data-cart-total]");
    const countEl = document.querySelector("[data-cart-count]");
    const checkoutBtn = document.querySelector("[data-cart-checkout]");
    if (!body) return;

    const entries = cartEntries();
    body.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = t("cart.empty");
      body.appendChild(empty);
    } else {
      entries.forEach(({ product, planIndex, plan }) => {
        const row = document.createElement("div");
        row.className = "cart-item";

        const info = document.createElement("div");
        info.className = "cart-item-info";

        const nameEl = document.createElement("div");
        nameEl.className = "cart-item-name";
        nameEl.textContent = product.name;
        info.appendChild(nameEl);

        if (product.plans.length > 1) {
          const select = document.createElement("select");
          product.plans.forEach((p, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = planLabel(p) + " — " + money(p.price);
            if (i === planIndex) opt.selected = true;
            select.appendChild(opt);
          });
          select.addEventListener("change", () => setCartPlan(product.id, Number(select.value)));
          info.appendChild(select);
        } else {
          const planEl = document.createElement("div");
          planEl.className = "cart-item-plan";
          planEl.textContent = planLabel(plan);
          info.appendChild(planEl);
        }

        row.appendChild(info);

        const price = document.createElement("div");
        price.className = "cart-item-price";
        price.textContent = money(plan.price);
        row.appendChild(price);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "cart-item-remove";
        removeBtn.setAttribute("aria-label", t("cart.remove"));
        removeBtn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
        removeBtn.addEventListener("click", () => removeFromCart(product.id));
        row.appendChild(removeBtn);

        body.appendChild(row);
      });
    }

    const total = cartTotal();
    const discPct = activeDiscountPercent(total);
    if (totalEl) {
      if (discPct > 0 && total > 0) {
        totalEl.innerHTML =
          '<span class="cart-total-original">' + money(total) + "</span>" +
          "<span>" + money(discountedTotal(total)) + "</span>" +
          '<span class="cart-total-discount-badge">-' + discPct + "%</span>";
      } else {
        totalEl.textContent = money(total);
      }
    }
    if (countEl) {
      const n = cartCount();
      countEl.textContent = String(n);
      countEl.hidden = n === 0;
    }

    if (checkoutBtn) {
      if (entries.length) {
        checkoutBtn.classList.remove("disabled");
        checkoutBtn.setAttribute("href", buildCartWaLink(entries, total));
      } else {
        checkoutBtn.classList.add("disabled");
        checkoutBtn.setAttribute("href", "#");
      }
    }

    renderProgress(total);
  }

  function buildCartWaLink(entries, total) {
    const lang = currentLang();
    const greeting =
      lang === "ar" ? "مرحبا ترينديكس! حابب اطلب:" : "Hi Trendix! I'd like to order:";
    const totalLabel = lang === "ar" ? "المجموع" : "Total";
    const lines = entries.map(
      ({ product, plan }) => "- " + product.name + " (" + planLabel(plan) + ") — " + money(plan.price)
    );
    const extra = [];
    const discPct = activeDiscountPercent(total);
    if (discPct > 0) {
      const discountLabel = lang === "ar" ? "الخصم" : "Discount";
      const finalLabel = lang === "ar" ? "الإجمالي بعد الخصم" : "Total after discount";
      extra.push("", discountLabel + ": -" + discPct + "%", finalLabel + ": " + money(discountedTotal(total)));
    }
    const text = [greeting, ...lines, "", totalLabel + ": " + money(total), ...extra].join("\n");
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
  }

  /* ============================================================
     Render: cart progress bar (milestone discounts + suggestion)
     ============================================================ */
  function renderProgress(total) {
    const fill = document.querySelector("[data-cart-progress-fill]");
    const msgEl = document.querySelector("[data-cart-progress-msg]");
    const suggestionWrap = document.querySelector("[data-cart-progress-suggestion]");
    const suggestionText = document.querySelector("[data-cart-progress-suggestion-text]");
    const suggestionBtn = document.querySelector("[data-cart-progress-suggestion-btn]");
    if (!fill) return;

    const lang = currentLang();
    const maxThreshold = CART_MILESTONES[CART_MILESTONES.length - 1].threshold;
    const fillPct = Math.min(100, (total / maxThreshold) * 100);
    fill.style.width = fillPct + "%";

    CART_MILESTONES.forEach((m, i) => {
      const el = document.querySelector('[data-cart-progress-milestone="' + i + '"]');
      const label = document.querySelector('[data-cart-progress-milestone-label="' + i + '"]');
      if (!el) return;
      const pos = (m.threshold / maxThreshold) * 100;
      el.style.setProperty("--pos", pos + "%");
      el.classList.toggle("reached", total >= m.threshold);
      if (label) label.textContent = m.discountPercent + "%";
    });

    const copy = progressCopy(lang, total);
    if (msgEl) {
      msgEl.innerHTML = copy.msg;
      msgEl.classList.toggle("is-complete", copy.complete);
    }

    if (copy.complete) {
      if (suggestionWrap) suggestionWrap.hidden = true;
      return;
    }

    const suggestion = suggestProduct(copy.remaining);
    if (suggestion && suggestionWrap) {
      suggestionWrap.hidden = false;
      if (suggestionText) suggestionText.textContent = suggestionCopy(lang, suggestion, copy.next.discountPercent);
      if (suggestionBtn) {
        suggestionBtn.textContent = t("cart.progress.add");
        suggestionBtn.onclick = () => {
          const planIndex = suggestion.product.plans.indexOf(suggestion.plan);
          addToCart(suggestion.product.id, planIndex);
          openDrawer();
        };
      }
    } else if (suggestionWrap) {
      suggestionWrap.hidden = true;
    }
  }

  /* ============================================================
     Cart drawer open/close
     ============================================================ */
  function openDrawer() {
    const drawer = document.querySelector("[data-cart-drawer]");
    if (!drawer) return;
    drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    const drawer = document.querySelector("[data-cart-drawer]");
    if (!drawer) return;
    drawer.classList.remove("open");
    document.body.style.overflow = "";
  }
  function initCartDrawer() {
    const drawer = document.querySelector("[data-cart-drawer]");
    const toggle = document.querySelector("[data-cart-toggle]");
    const closeBtn = document.querySelector("[data-cart-close]");
    const checkoutBtn = document.querySelector("[data-cart-checkout]");
    if (toggle) toggle.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (drawer) drawer.addEventListener("click", (e) => { if (e.target === drawer) closeDrawer(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", (e) => {
        if (checkoutBtn.classList.contains("disabled")) { e.preventDefault(); return; }
        setTimeout(() => { clearCart(); renderAll(); closeDrawer(); }, 50);
      });
    }
  }

  /* ============================================================
     Search
     ============================================================ */
  function initSearch() {
    const input = document.querySelector("[data-catalog-search]");
    if (!input) return;
    input.setAttribute("placeholder", t("catalog.search.placeholder"));
    input.addEventListener("input", () => {
      searchQuery = input.value;
      renderGrid();
    });
  }

  function renderAll() {
    renderTabs();
    renderGrid();
    renderCart();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    renderAll();
    initSearch();
    initCartDrawer();
  });

  document.addEventListener("trendix:langchange", () => {
    const input = document.querySelector("[data-catalog-search]");
    if (input) input.setAttribute("placeholder", t("catalog.search.placeholder"));
    renderAll();
  });
})();
