/* Trendix — ad-attribution capture.
   Reads utm params and fbclid/ttclid from the landing URL once, persists
   them for the session (30 days) so they survive until checkout even if
   the visitor browses for a while before ordering. Read by catalog.js
   when it logs an order to the backend. */
(function () {
  "use strict";

  const KEY = "trendix-attribution-v1";
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function readStored() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function captureFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "ttclid"];
    const found = {};
    let any = false;
    fields.forEach((f) => {
      const v = params.get(f);
      if (v) {
        found[f] = v;
        any = true;
      }
    });
    if (!any) return null;
    found.landing_page = window.location.href.split("?")[0];
    found.referrer = document.referrer || "";
    found.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) {}
    return found;
  }

  // A fresh landing with new tracking params always wins; otherwise keep
  // whatever was captured earlier this session/visit.
  const fresh = captureFromUrl();
  if (!fresh && !readStored()) {
    // first-ever visit with no ad params: still record landing page/referrer
    // so "Organic / Direct" orders show where they actually came from.
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          landing_page: window.location.href.split("?")[0],
          referrer: document.referrer || "",
          savedAt: Date.now()
        })
      );
    } catch (e) {}
  }

  window.trendixGetAttribution = function () {
    return readStored() || {};
  };
})();
