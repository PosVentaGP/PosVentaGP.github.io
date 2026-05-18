/* ==========================================================================
   SERVICE WORKER: CARPINTERIA CASTORES
   CONTROL DE CACHÉ Y ESTRATEGIA DE ACTUALIZACIÓN ULTRA RÁPIDA (PWA)
   *** VERSION 2.2 - CORREGIDA CONTRA ERRORES DE ARCHIVOS FALTANTES ***
   ========================================================================== */

const CACHE_NAME = 'castores-cache-v2.2';

// Dejamos solo los archivos base ultra-seguros que sabemos que existen en tu raíz
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './logo.png'
];

// --- EVENTO 1: INSTALACIÓN ---
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando nueva versión de caché...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Registrando archivos de forma segura...');

        // Usamos un mapeo con catch individual para que si uno falla (ej. una imagen),
        // los archivos críticos como app.js e index.html SÍ se guarden y actualicen.
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.error(`[Service Worker] No se pudo precargar el recurso: ${url}`, err);
            });
          })
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// --- EVENTO 2: ACTIVACIÓN ---
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando y limpiando cachés obsoletas...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// --- EVENTO 3: INTERCEPTOR DE PETICIONES (FETCH) ---
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('script.google.com')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
