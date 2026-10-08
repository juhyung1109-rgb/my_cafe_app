const CACHE_NAME = 'cafecore-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pwa-order.html',
  './kiosk.html',
  './kitchen.html',
  './pickup-board.html',
  './sales-dashboard.html',
  './store-manage.html',
  './dataset-simulator-plan.html',
  './dataset-analysis-plan-v2.html',
  './data-simulator.html',
  './manifest.json',
  './css/common.css',
  './css/pwa.css',
  './css/kiosk.css',
  './css/kitchen.css',
  './css/pickup.css',
  './css/dashboard.css',
  './css/store-manage.css',
  './js/store.js',
  './js/firebase-config.js',
  './js/firebase-auth.js',
  './js/auth-ui.js',
  './js/store-manage.js',
  './js/pwa.js',
  './js/kiosk.js',
  './js/kitchen.js',
  './js/pickup.js',
  './js/dashboard.js',
  './assets/images/americano.png',
  './assets/images/cafe_latte.png',
  './assets/images/vanilla_latte.png',
  './assets/images/coldbrew.png',
  './assets/images/matcha_latte.png',
  './assets/images/earl_grey_tea.png',
  './assets/images/lemon_ade.png',
  './assets/images/grapefruit_ade.png',
  './assets/images/peach_iced_tea.png',
  './assets/images/lemon_iced_tea.png',
  './assets/images/strawberry_smoothie.png',
  './assets/images/mango_smoothie.png',
  './assets/images/hero_banner.png',
  './assets/images/logo_icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell & assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Some assets could not be cached immediately:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
