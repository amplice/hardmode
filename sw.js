const CACHE_NAME = 'surbiton-events-v2';
const ASSETS = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/app.js',
  './calendar-data.js',
  './calendar-data.json',
  './events.ics',
  './gigs.html',
  './gig-data.js',
  './gigs.ics',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});
