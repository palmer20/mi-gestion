// ============================================================
//  sw.js — Service Worker XSemana Totoras
// ============================================================
const CACHE = 'xsemana-v1';
const ASSETS = [
  '/mi-gestion/index.html',
  '/mi-gestion/css/base.css',
  '/mi-gestion/css/components.css',
  '/mi-gestion/css/layout.css',
  '/mi-gestion/css/modules.css',
  '/mi-gestion/js/auth.js',
  '/mi-gestion/js/clientes.js',
  '/mi-gestion/js/exportar.js',
  '/mi-gestion/js/fechas.js',
  '/mi-gestion/js/formulario.js',
  '/mi-gestion/js/mensajes.js',
  '/mi-gestion/js/registros.js',
  '/mi-gestion/js/storage.js',
  '/mi-gestion/js/vencimientos.js',
  '/mi-gestion/config.js',
  '/mi-gestion/comprobante.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
