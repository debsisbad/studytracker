const CACHE_NAME = "study-tracker-v72.0.0";

const APP_FILES = [
  "/studytracker/",
  "/studytracker/index.html",
  "/studytracker/manifest.json",
  "/studytracker/version.json",
  "/studytracker/icons/icon-192.png",
  "/studytracker/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("study-tracker-v") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Não interfere em recursos externos (CDNs, Supabase etc.).
  if (url.origin !== self.location.origin) return;

  // Navegação: tenta a versão mais recente e usa o cache se estiver offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/studytracker/index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match("/studytracker/index.html")
          )
        )
    );
    return;
  }

  // Arquivos locais: rede primeiro; cache como fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
