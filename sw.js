const CACHE_VERSION = "cpa-rpg-pwa-v13";
const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./sprites.js",
  "./manifest.webmanifest",
  "./assets/pwa/pwa-icon-192.png",
  "./assets/pwa/pwa-icon-512.png",
  "./assets/tiles/formal_audit.png",
  "./assets/tiles/formal_capital.png",
  "./assets/tiles/formal_tax.png",
  "./assets/tiles/formal_law.png",
  "./assets/tiles/formal_strategy.png",
  "./assets/sunnyside/chars/player_idle.png",
  "./assets/sunnyside/ui/panel_dark.png",
  "./assets/sunnyside/ui/panel_light.png",
  "./assets/sunnyside/ui/panel_white.png",
  "./assets/sunnyside/ui/cursor_01.png",
  "./assets/sunnyside/ui/confirm.png",
  "./assets/sunnyside/ui/axe.png",
  "./assets/sunnyside/ui/hammer.png",
  "./assets/sunnyside/ui/redbar_03.png",
  "./assets/sunnyside/ui/redbar_05.png",
  "./assets/sunnyside/ui/bluebar_03.png",
  "./assets/sunnyside/ui/greenbar_03.png",
  "./assets/ui/keys/Keyboard_W.png",
  "./assets/ui/keys/Keyboard_A.png",
  "./assets/ui/keys/Keyboard_S.png",
  "./assets/ui/keys/Keyboard_D.png",
  "./assets/ui/keys/Keyboard_E.png",
  "./assets/ui/keys/Keyboard_Space.png",
  "./assets/ui/keys/Mouse_Key_1_Left.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
