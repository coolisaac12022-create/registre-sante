/* Service worker : permet d'ouvrir le registre sans réseau.
   Stratégie : on essaie le réseau d'abord (pour recevoir les mises à jour), sinon on utilise la copie gardée. */
const CACHE = "registre-sante-v1";
const FICHIERS = [
  "./", "index.html", "css/style.css",
  "js/config.js", "js/store.js", "js/calc.js", "js/app.js",
  "icons/favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const memeSite = url.origin === self.location.origin;
  const police = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!memeSite && !police) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
