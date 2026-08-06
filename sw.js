'use strict';

var CACHE_NAME = 'three-v4';
var APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './js/debug.js',
  './js/ui.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).then(
            function () { return true; },
            function () { return false; }
          );
        })
      ).then(function (results) {
        // Only activate if the whole shell was cached; otherwise the
        // previous working service worker keeps serving the app instead
        // of silently installing a broken partial shell.
        if (results.indexOf(false) === -1) return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      var appPrefix = CACHE_NAME.split('-')[0] + '-';
      return Promise.all(
        keys.filter(function (key) {
          return key.indexOf(appPrefix) === 0 && key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.ok && !response.redirected) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            return cache.put(event.request, copy);
          }).catch(function () {});
        }
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html').then(function (cached) {
            return cached || new Response('', { status: 503, statusText: 'Offline' });
          });
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
