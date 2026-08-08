/* Trendix — catalog rendering + cart logic.
   Depends on: I18N/WA_NUMBER/WA_MESSAGES (i18n.js), CATEGORIES/PRODUCTS (products.js).
   Talks to main.js only via the "trendix:langchange" custom event. */
(function () {
  "use strict";

  const CART_KEY = "trendix-cart-v1";

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
    return "$" + n;
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
      icon.className = "product-icon";
      icon.innerHTML = iconFor(product.category);
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
    if (totalEl) totalEl.textContent = money(total);
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
  }

  function buildCartWaLink(entries, total) {
    const lang = currentLang();
    const greeting =
      lang === "ar" ? "مرحبا ترينديكس! حابب اطلب:" : "Hi Trendix! I'd like to order:";
    const totalLabel = lang === "ar" ? "المجموع" : "Total";
    const lines = entries.map(
      ({ product, plan }) => "- " + product.name + " (" + planLabel(plan) + ") — " + money(plan.price)
    );
    const text = [greeting, ...lines, "", totalLabel + ": " + money(total)].join("\n");
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
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
