var CACHE_NAME = 'xsemana-shell-v2';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './config.js',
  './comprobante.js',
  './icon-192.png',
  './icon-512.png',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/modules.css',
  './js/storage.js',
  './js/fechas.js',
  './js/formulario.js',
  './js/clientes.js',
  './js/registros.js',
  './js/vencimientos.js',
  './js/mensajes.js',
  './js/auth.js',
  './js/firebase.js',
  './js/exportar.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function guardarEnCache(request, response) {
  if (!response || response.status !== 200) return response;

  var copy = response.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    cache.put(request, copy);
  });

  return response;
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var esShell = APP_SHELL.some(function (entry) {
    return url.pathname.endsWith(entry.replace('./', '/')) || url.pathname === '/' || url.pathname.endsWith('/mi-gestion/');
  });

  if (esShell || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          return guardarEnCache(event.request, response);
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        return guardarEnCache(event.request, response);
      });
    })
  );
});
