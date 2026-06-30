const CACHE = "fp-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith("/api")) {
    e.respondWith(networkOnly(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((r) => {
      if (r.ok) {
        const clone = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return r;
    }))
  );
});

async function networkOnly(req) {
  try {
    return await fetch(req);
  } catch {
    return new Response(JSON.stringify({ error: "لا يوجد اتصال بالإنترنت" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
