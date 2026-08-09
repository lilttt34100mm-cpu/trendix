/* Trendix — product catalog data.
   Single source of truth for the catalog + cart. Prices in USD.
   Each product has one or more "plans" (duration/tier variants);
   the cart stores a chosen plan index per product.
   "logo" is a filename (with extension) under assets/icons/ — each
   points at that brand's real official mark. Products sharing a logo
   file only do so when they ARE the same brand (e.g. the 3 Autodesk
   products, the 2 LinkedIn plans, the 2 Duolingo plans, MS365 +
   Office ProPlus which are both current Microsoft Office branding). */

const CATEGORIES = [
  { key: "top", name: "Top Sellers", nameAr: "الأكثر مبيعًا" },
  { key: "ai", name: "AI & Developer Tools", nameAr: "أدوات الذكاء الاصطناعي والمطورين" },
  { key: "design", name: "Design, Video & Productivity", nameAr: "تصميم، فيديو وإنتاجية" },
  { key: "business", name: "Business & Workspace", nameAr: "أعمال ومساحات عمل" },
  { key: "engineering", name: "Engineering & CAD", nameAr: "هندسة وتصميم ثلاثي الأبعاد" },
  { key: "learning", name: "Learning & Entertainment", nameAr: "تعلّم وترفيه" }
];

const PRODUCTS = [
  // ---------------- AI & Developer Tools ----------------
  { id: "google-ai-pro", name: "Google AI Pro", category: "ai", topSeller: false, logo: "googlegemini.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 75 }] },
  { id: "google-ai-ultra", name: "Google AI Ultra", category: "ai", topSeller: false, logo: "googlegemini.png",
    plans: [{ label: "1 Month", labelAr: "شهر واحد", price: 70 }] },
  { id: "claude-pro", name: "Claude Pro", category: "ai", topSeller: true, badge: "popular", logo: "claude.svg",
    plans: [{ label: "1 Month", labelAr: "شهر واحد", price: 18 }] },
  { id: "perplexity-pro", name: "Perplexity AI Pro", category: "ai", topSeller: false, logo: "perplexity.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 75 }] },
  { id: "manus-ai-pro", name: "Manus AI Pro", category: "ai", topSeller: false, logo: "manus.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 120 }] },
  { id: "gamma-ai-pro", name: "Gamma AI Pro", category: "ai", topSeller: false, logo: "gamma.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 120 }] },
  { id: "lovable-pro", name: "Lovable Pro", category: "ai", topSeller: false, logo: "lovable.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 120 }] },
  { id: "cursor-pro", name: "Cursor Pro", category: "ai", topSeller: false, logo: "cursor.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 160 }] },
  { id: "chatprd-pro", name: "ChatPRD Pro", category: "ai", topSeller: false, logo: "chatprd.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 90 }] },
  { id: "magic-patterns", name: "Magic Patterns", category: "ai", topSeller: false, logo: "magicpatterns.png",
    plans: [{ label: "Starter Plan — 12 Months", labelAr: "خطة الانطلاق — 12 شهرًا", price: 120 }] },
  { id: "bolt-ai", name: "Bolt AI", category: "ai", topSeller: false, logo: "boltai.png",
    plans: [{ label: "Pro Plan — 12 Months", labelAr: "خطة برو — 12 شهرًا", price: 120 }] },
  { id: "warp-ai", name: "Warp AI", category: "ai", topSeller: false, logo: "warp.png",
    plans: [{ label: "Build Plan — 12 Months", labelAr: "خطة البناء — 12 شهرًا", price: 120 }] },

  // ---------------- Design, Video & Productivity ----------------
  { id: "adobe-cc", name: "Adobe Creative Cloud", category: "design", topSeller: true, logo: "adobecc.png",
    plans: [
      { label: "1 Month", labelAr: "شهر واحد", price: 19 },
      { label: "Individual — 12 Months", labelAr: "فردي — 12 شهرًا", price: 135 },
      { label: "Pro Plus Individual — 12 Months", labelAr: "برو بلس فردي — 12 شهرًا", price: 135 },
      { label: "K12 — 12 Months", labelAr: "K12 — 12 شهرًا", price: 135 },
      { label: "VIP — 12 Months", labelAr: "VIP — 12 شهرًا", price: 250 }
    ] },
  { id: "canva-pro", name: "Canva Pro", category: "design", topSeller: true, badge: "value", logo: "canva.svg",
    plans: [{ label: "Lifetime", labelAr: "مدى الحياة", price: 7 }] },
  { id: "capcut-pro", name: "CapCut Pro", category: "design", topSeller: true, logo: "capcut.png",
    plans: [{ label: "6 Months", labelAr: "6 أشهر", price: 30 }] },
  { id: "picsart-pro", name: "Picsart Pro", category: "design", topSeller: false, logo: "picsart.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 45 }] },
  { id: "figma-pro", name: "Figma Pro", category: "design", topSeller: false, logo: "figma.png",
    plans: [
      { label: "12 Months", labelAr: "12 شهرًا", price: 60 },
      { label: "2 Years", labelAr: "سنتان", price: 80 }
    ] },
  { id: "beautiful-ai", name: "Beautiful AI", category: "design", topSeller: false, logo: "beautifulai.png",
    plans: [{ label: "Pro Plan — 12 Months", labelAr: "خطة برو — 12 شهرًا", price: 70 }] },

  // ---------------- Business & Workspace ----------------
  { id: "ms365", name: "Microsoft 365", category: "business", topSeller: true, logo: "microsoft365.png",
    plans: [{ label: "12 Months — 1 User", labelAr: "12 شهرًا — مستخدم واحد", price: 40 }] },
  { id: "office-proplus-2024", name: "Office ProPlus 2024 LTSC", category: "business", topSeller: false, logo: "microsoft365.png",
    plans: [{ label: "Lifetime — 1 PC", labelAr: "مدى الحياة — جهاز واحد", price: 20 }] },
  { id: "windows11-pro-key", name: "Windows 11 Pro License Key", category: "business", topSeller: true, logo: "windows11.png",
    plans: [{ label: "Lifetime", labelAr: "مدى الحياة", price: 15 }] },
  { id: "jira-premium", name: "Jira Software", category: "business", topSeller: false, logo: "jira.png",
    plans: [{ label: "Premium Plan — 12 Months", labelAr: "خطة بريميوم — 12 شهرًا", price: 85 }] },
  { id: "linear-business", name: "Linear", category: "business", topSeller: false, logo: "linear.png",
    plans: [{ label: "Business Plan — 12 Months", labelAr: "خطة الأعمال — 12 شهرًا", price: 90 }] },
  { id: "loom-business", name: "Loom", category: "business", topSeller: false, logo: "loom.png",
    plans: [{ label: "Business Plan — 12 Months", labelAr: "خطة الأعمال — 12 شهرًا", price: 68 }] },
  { id: "granola-ai", name: "Granola AI", category: "business", topSeller: false, logo: "granola.png",
    plans: [{ label: "Business Plan — 12 Months", labelAr: "خطة الأعمال — 12 شهرًا", price: 78 }] },
  { id: "superhuman-ai", name: "Superhuman AI", category: "business", topSeller: false, logo: "superhuman.png",
    plans: [{ label: "Business Plan — 12 Months", labelAr: "خطة الأعمال — 12 شهرًا", price: 135 }] },
  { id: "miro-ai", name: "Miro AI", category: "business", topSeller: false, logo: "miro.png",
    plans: [{ label: "Starter Plan — 12 Months", labelAr: "خطة الانطلاق — 12 شهرًا", price: 45 }] },
  { id: "anydesk-solo", name: "AnyDesk Solo", category: "business", topSeller: false, logo: "anydesk.png",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 70 }] },
  { id: "linkedin-business-premium", name: "LinkedIn Business Premium", category: "business", topSeller: false, logo: "linkedin.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 117 }] },
  { id: "linkedin-career", name: "LinkedIn Career", category: "business", topSeller: false, logo: "linkedin.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 105 }] },

  // ---------------- Engineering & CAD ----------------
  { id: "autodesk-all-apps", name: "AutoDesk — All Apps", category: "engineering", topSeller: false, logo: "autodesk.svg",
    plans: [{ label: "3 Years", labelAr: "3 سنوات", price: 117 }] },
  { id: "autodesk-aec", name: "Autodesk AEC Commercial License", category: "engineering", topSeller: false, logo: "autodesk.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 450 }] },
  { id: "autodesk-bim-forma", name: "Autodesk BIM License / Forma", category: "engineering", topSeller: false, logo: "autodesk.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 450 }] },
  { id: "lumion-pro", name: "Lumion Pro", category: "engineering", topSeller: false, logo: "lumion.png",
    plans: [{ label: "Edu — 12 Months", labelAr: "تعليمي — 12 شهرًا", price: 120 }] },
  { id: "sketchup-pro", name: "SketchUp", category: "engineering", topSeller: false, logo: "sketchup.svg",
    plans: [{ label: "Pro Plan — 12 Months", labelAr: "خطة برو — 12 شهرًا", price: 280 }] },
  { id: "vray-edu", name: "V-Ray", category: "engineering", topSeller: false, logo: "vray.svg",
    plans: [{ label: "Edu License — 12 Months", labelAr: "ترخيص تعليمي — 12 شهرًا", price: 150 }] },
  { id: "corona-premium", name: "Corona Premium", category: "engineering", topSeller: false, logo: "coronarenderer.svg",
    plans: [{ label: "Edu License — 12 Months", labelAr: "ترخيص تعليمي — 12 شهرًا", price: 150 }] },
  { id: "enscape-premium", name: "Enscape", category: "engineering", topSeller: false, logo: "enscape.svg",
    plans: [{ label: "Premium Plan — 12 Months", labelAr: "خطة بريميوم — 12 شهرًا", price: 250 }] },

  // ---------------- Learning & Entertainment ----------------
  { id: "youtube-premium", name: "YouTube Premium", category: "learning", topSeller: true, logo: "youtube.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 45 }] },
  { id: "coursera-plus", name: "Coursera Plus", category: "learning", topSeller: false, logo: "coursera.svg",
    plans: [{ label: "12 Months — Full Access", labelAr: "12 شهرًا — وصول كامل", price: 60 }] },
  { id: "duolingo-max", name: "Duolingo MAX", category: "learning", topSeller: true, logo: "duolingo.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 55 }] },
  { id: "duolingo-super", name: "Duolingo Super", category: "learning", topSeller: false, logo: "duolingo.svg",
    plans: [{ label: "12 Months", labelAr: "12 شهرًا", price: 35 }] },
  { id: "rezi-ai", name: "Rezi AI — Resume Builder", category: "learning", topSeller: false, logo: "rezi.png",
    plans: [{ label: "Lifetime", labelAr: "مدى الحياة", price: 50 }] }
];
