// Bewaart de app zodat hij snel opent en ook zonder internet het schema laat zien.
const TEAM = "ballofduty";
const CACHE = TEAM + "-5d7b0b77";
const SHELL = ["./", "index.html", "../config.js?v=4", "manifest.webmanifest", "logo.jpg",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(TEAM + "-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("cuescore.com")) return; // live data nooit uit de cache
  const sameOrigin = url.origin === location.origin;
  if (sameOrigin) {
    // Netwerk eerst, zodat updates direct doorkomen; cache als je offline bent
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
