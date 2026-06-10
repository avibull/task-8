// Kill-switch service worker.
// Replaces the old app-shell cache at /sw.js so installed apps drop
// stale caches and stop being controlled on next visit.

function isAppShellCache(name) {
  return name === 'task8-v1' || name === 'turbotask-v1' || /^task8-/.test(name) || /^turbotask-/.test(name);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.filter(isAppShellCache).map((n) => caches.delete(n)));
      await self.clients.claim();
      const windowClients = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(windowClients.map((c) => c.navigate(c.url)));
    } finally {
      await self.registration.unregister();
    }
  })());
});
