// Safe service worker registration with update flow
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // When a new SW is found…
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // If there's already a controller, a new version is ready
            if (navigator.serviceWorker.controller) {
              // Ask it to activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        });
      });

      // When the controller changes, reload once
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    } catch (e) {
      console.error('SW registration failed', e);
    }
  });
}