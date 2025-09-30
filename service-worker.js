// service-worker.js

// Bump this whenever you change what you cache
const CACHE_NAME = "gen008-cache-v5";

// Determine the base scope (ends with /gen008exam/)
const BASE = self.registration.scope;

// Only cache same-origin app shell you control
const APP_SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "admin.html",
  BASE + "offline.html",
  BASE + "manifest.webmanifest?v=5",
  BASE + "icons/icon-192x192.png",
  BASE + "icons/icon-512x512.png",
  BASE + "icons/maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try {
        await cache.add(url);
      } catch (err) {
        // Don't fail the whole install if one asset is missing
        console.warn("[SW] skip caching", url, err?.message || err);
      }
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
  })());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Cache-first for your own files; fallback to offline page for HTML navigations
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch {
        const accept = req.headers.get("accept") || "";
        if (req.mode === "navigate" || accept.includes("text/html")) {
          return (await caches.match(BASE + "offline.html")) || Response.error();
        }
        return Response.error();
      }
    })());
  } else {
    // Network-first for cross-origin (Firebase CDN, fonts, etc.)
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch { return (await caches.match(req)) || Response.error(); }
    })());
  }
});
