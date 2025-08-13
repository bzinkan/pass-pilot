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
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Network-first strategy for all requests
self.addEventListener('fetch', (event) => {
  // Skip non-http requests and chrome extensions
  if (!event.request.url.startsWith('http') || event.request.url.includes('chrome-extension')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response for caching
        const responseToCache = response.clone();
        
        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // For navigation requests, return index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          // Return a generic offline response for other requests
          return new Response('Offline', { status: 503 });
        });
      })
  );
});