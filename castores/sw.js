const CACHE_NAME = 'carpinteria-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

// Instalar el Service Worker y guardar archivos esenciales en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Responder desde la caché si no hay internet en el taller
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
