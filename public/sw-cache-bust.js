// HireNova — One-time cache buster service worker
// Clears ALL browser caches on install, then self-unregisters

self.addEventListener('install', (event) => {
  console.log('[HireNova SW] Installing cache buster...');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          console.log('[HireNova SW] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[HireNova SW] Activated — clearing cache and self-unregistering');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => caches.delete(name))
      );
    }).then(() => {
      // Self-unregister after clearing caches
      self.registration.unregister().then(() => {
        console.log('[HireNova SW] Unregistered — cache busting complete');
      });
    })
  );
});

// No fetch handler — let all requests pass through normally
