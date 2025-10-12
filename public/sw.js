const CACHE_NAME = 'device-health-monitor-v2'; // Updated version to force cache refresh
const RUNTIME_CACHE = 'runtime-cache-v2';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  // Skip caching in development (when hostname includes lovableproject.com)
  if (self.location.hostname.includes('lovableproject.com')) {
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name)) // Delete ALL old caches
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip caching in development
  if (self.location.hostname.includes('lovableproject.com')) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome extensions and cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache assets dynamically
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return offline page or fallback
        return new Response('Offline - Please check your connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});
