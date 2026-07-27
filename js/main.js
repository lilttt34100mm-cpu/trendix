(function () {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  /* ============================================================
     i18n
     ============================================================ */
  function buildWaLink(lang, key, extra) {
    const template = (WA_MESSAGES[lang] && WA_MESSAGES[lang][key]) || WA_MESSAGES.en[key] || WA_MESSAGES.en.generic;
    const text = extra ? template + extra : template;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function applyLanguage(lang) {
    const dict = I18N[lang] || I18N.en;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.title = dict["meta.title"];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", dict["meta.desc"]);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll("[data-wa]").forEach((el) => {
      const key = el.getAttribute("data-wa") || "generic";
      el.setAttribute("href", buildWaLink(lang, key));
    });

    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });

    try { localStorage.setItem("trendix-lang", lang); } catch (e) {}
  }

  function initLang() {
    let lang = "ar";
    try {
      const saved = localStorage.getItem("trendix-lang");
      if (saved === "en" || saved === "ar") lang = saved;
      else if (navigator.language && navigator.language.toLowerCase().startsWith("en")) lang = "en";
    } catch (e) {}
    applyLanguage(lang);

    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => applyLanguage(btn.getAttribute("data-lang")));
    });
  }

  /* ============================================================
     Header scroll state
     ============================================================ */
  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ============================================================
     Mobile nav
     ============================================================ */
  function initMobileNav() {
    const toggle = document.querySelector(".menu-toggle");
    const closeBtn = document.querySelector(".mobile-nav-close");
    const overlay = document.querySelector(".mobile-nav");
    if (!toggle || !overlay) return;

    const open = () => {
      overlay.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      overlay.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", open);
    closeBtn && closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ============================================================
     FAQ accordion
     ============================================================ */
  function initFaq() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const q = item.querySelector(".faq-q");
      const a = item.querySelector(".faq-a");
      const inner = item.querySelector(".faq-a-inner");
      q.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        items.forEach((other) => {
          if (other !== item) {
            other.classList.remove("open");
            other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
            other.querySelector(".faq-a").style.height = "0px";
          }
        });
        if (isOpen) {
          item.classList.remove("open");
          q.setAttribute("aria-expanded", "false");
          a.style.height = "0px";
        } else {
          item.classList.add("open");
          q.setAttribute("aria-expanded", "true");
          a.style.height = inner.offsetHeight + "px";
        }
      });
    });
  }

  /* ============================================================
     Marquee (trust bar) — duplicate track, animate loop
     ============================================================ */
  function initMarquee() {
    const track = document.querySelector(".marquee-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
    if (prefersReducedMotion || !hasGsap) return;
    const distance = track.scrollWidth / 2;
    gsap.to(track, {
      x: () => -distance,
      duration: 28,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: (x) => {
          const num = parseFloat(x);
          return (((num % distance) + distance) % distance) - distance + "px";
        }
      }
    });
  }

  /* ============================================================
     Cosmos hero — fallback blob float, text intro, WebGL bootstrap
     ============================================================ */
  function supportsWebGL() {
    try {
      const canvas = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }

  function initCosmosFallbackMotion() {
    const video = document.querySelector(".cosmos-fallback-video");
    if (video) {
      if (prefersReducedMotion) {
        video.pause();
      } else {
        const playPromise = video.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
      }
    }

    if (!hasGsap || prefersReducedMotion) return;
    document.querySelectorAll(".cosmos-fallback .hero-blob").forEach((blob, i) => {
      gsap.to(blob, {
        x: i % 2 === 0 ? 30 : -30,
        y: i % 2 === 0 ? -20 : 20,
        duration: 9 + i * 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });
    });
  }

  /* ============================================================
     Mobile hero video — scroll-driven zoom, echoing the desktop
     scene's camera push. Mobile-only (video is display:none on
     desktop), scrubbed to the scroll gesture itself.
     ============================================================ */
  function initCosmosVideoParallax() {
    if (!hasGsap || !window.ScrollTrigger || prefersReducedMotion) return;
    if (window.innerWidth >= 900) return;
    const video = document.querySelector("[data-cosmos-video]");
    const hero = document.querySelector("[data-cosmos-hero]");
    if (!video || !hero) return;
    gsap.fromTo(
      video,
      { scale: 1.06 },
      {
        scale: 1.24,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 }
      }
    );
  }

  function initCosmosTextReveal() {
    const hero = document.querySelector("[data-cosmos-hero]");
    if (!hero) return;
    const chars = hero.querySelectorAll(".title-char");
    const reveals = hero.querySelectorAll("[data-cosmos-reveal]");

    if (!hasGsap || prefersReducedMotion) {
      chars.forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      reveals.forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }

    const tl = gsap.timeline({ delay: 0.2 });
    tl.from(chars, {
      y: 80,
      opacity: 0,
      duration: 1.1,
      stagger: 0.05,
      ease: "power4.out"
    });
    reveals.forEach((el, i) => {
      tl.from(el, { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" }, i === 0 ? "-=0.6" : "-=0.45");
    });
  }

  function initCosmosScrollCue() {
    const cue = document.querySelector("[data-cosmos-scroll-cue]");
    const hero = document.querySelector("[data-cosmos-hero]");
    if (!cue || !hero) return;
    cue.addEventListener("click", () => {
      window.scrollTo({ top: hero.offsetHeight - 40, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  function initCosmosScene() {
    const hero = document.querySelector("[data-cosmos-hero]");
    const canvas = document.querySelector("[data-cosmos-canvas]");
    if (!hero || !canvas) return;

    const capable = !isTouch && !prefersReducedMotion && window.innerWidth >= 900 && supportsWebGL();
    if (!capable) return;

    import("./hero-scene.js")
      .then((mod) => mod.initCosmosHero({ canvas, heroEl: hero }))
      .then(() => {
        hero.setAttribute("data-cosmos-mode", "webgl");
        setTimeout(() => canvas.classList.add("is-active"), 30);
      })
      .catch(() => {
        /* stay on the CSS fallback if the 3D module fails to load */
      });
  }

  /* ============================================================
     Catalog card tilt
     ============================================================ */
  function initCardTilt() {
    if (isTouch || prefersReducedMotion || !hasGsap) return;
    document.querySelectorAll(".catalog-card").forEach((card) => {
      const rotX = gsap.quickTo(card, "rotateX", { duration: 0.4, ease: "power3.out" });
      const rotY = gsap.quickTo(card, "rotateY", { duration: 0.4, ease: "power3.out" });
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        rotY(px * 10);
        rotX(-py * 10);
      });
      card.addEventListener("mouseleave", () => { rotX(0); rotY(0); });
    });
  }

  /* ============================================================
     Spotlight — cursor-tracked glossy highlight on cards/panels
     ============================================================ */
  function initSpotlight() {
    if (isTouch) return;
    document.querySelectorAll(".spotlight").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - rect.left + "px");
        el.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ============================================================
     Mobile card scroll motion — a subtle scale/tilt settle-in as
     each card crosses the viewport, scrubbed to the scroll gesture
     itself. Desktop keeps hover-driven tilt/spotlight instead; this
     is additive, layered on top of initReveals, mobile/touch only.
     ============================================================ */
  function initMobileCardMotion() {
    if (!hasGsap || !window.ScrollTrigger || prefersReducedMotion) return;
    if (!(isTouch || window.innerWidth < 900)) return;
    const cards = document.querySelectorAll(".step-card, .catalog-card, .why-item, .faq-item");
    cards.forEach((card) => {
      gsap.fromTo(
        card,
        { scale: 0.94, rotationX: 5, transformPerspective: 700, transformOrigin: "50% 100%" },
        {
          scale: 1,
          rotationX: 0,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            end: "top 60%",
            scrub: 0.4
          }
        }
      );
    });
  }

  /* ============================================================
     Scroll reveals
     ============================================================ */
  function initReveals() {
    const groups = document.querySelectorAll("[data-reveal-group]");
    const singles = document.querySelectorAll("[data-reveal]:not([data-reveal-group] [data-reveal])");

    if (!hasGsap) {
      document.querySelectorAll("[data-reveal]").forEach((el) => (el.style.opacity = 1));
      return;
    }

    if (prefersReducedMotion) {
      document.querySelectorAll("[data-reveal]").forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
      return;
    }

    groups.forEach((group) => {
      const items = group.querySelectorAll("[data-reveal]");
      gsap.fromTo(
        items,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: group, start: "top 82%", once: true }
        }
      );
    });

    singles.forEach((el) => {
      if (el.closest("[data-reveal-group]")) return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        }
      );
    });
  }

  /* ============================================================
     Init
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.remove("no-js");
    initLang();
    initHeaderScroll();
    initMobileNav();
    initFaq();
    initMarquee();
    initCosmosFallbackMotion();
    initCosmosVideoParallax();
    initCosmosTextReveal();
    initCosmosScrollCue();
    initCosmosScene();
    initCardTilt();
    initSpotlight();
    initReveals();
    initMobileCardMotion();
  });
})();
