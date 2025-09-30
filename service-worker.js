/* service-worker.js */

const CACHE_NAME = "gen008-cache-v4";
// Only cache same-origin assets you control:
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png"
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch: 
// - same-origin → cache-first (falls back to network, then offline page for HTML)
// - cross-origin (e.g., Firebase CDN) → network-first (falls back to cache)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Cache-first for same-origin
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).catch(() => {
          // If it's a navigation request, show offline page
          if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
            return caches.match("./offline.html");
          }
        });
      })
    );
  } else {
    // Network-first for cross-origin (Firebase CDN, Google Fonts, etc.)
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req)) // best effort if ever cached by browser
    );
  }
});
