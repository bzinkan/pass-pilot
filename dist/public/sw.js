// PassPilot Service Worker - Minimal, deployment-safe version
const CACHE_NAME = 'passpilot-v4';

// Skip waiting on message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Immediate activation - no caching during install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('passpilot-') && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Network-first for all requests - no aggressive caching
self.addEventListener('fetch', (event) => {
  // Always try network first to prevent stale content
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets (not HTML)
        if (response.status === 200 && !event.request.url.includes('api') && 
            !event.request.destination === 'document') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Only fall back to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Final fallback for navigation requests
          if (event.request.destination === 'document') {
            return new Response('PassPilot is temporarily offline', {
              headers: { 'Content-Type': 'text/html' }
            });
          }
          throw new Error('No cache available');
        });
      })
  );
});