/* Only public build files are cached. Never intercept API, uploads or auth. */
const CACHE_PREFIX = "handsfree-public-";
const CACHE_NAME = CACHE_PREFIX + __BUILD_ID__;
const PRECACHE = __PRECACHE__;
const PUBLIC_FILES = new Set(PRECACHE);
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
    const previous = names.filter((name) => name !== CACHE_NAME).slice(-1);
    await Promise.all(names.filter((name) => name !== CACHE_NAME && !previous.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(async () =>
      (await caches.match("/offline.html")) || Response.error()));
    return;
  }
  if (url.search || (!PUBLIC_FILES.has(url.pathname) && !/^\/assets\/[^/]+-[\w-]+\.(js|css)$/.test(url.pathname))) return;
  event.respondWith((async () => (await caches.match(request)) || fetch(request))());
});
