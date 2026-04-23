// ═══════════════════════════════════════════════════════
// sw.js · service worker for Morning Awakening
//
// Strategy:
//   - HTML / navigation requests: network-first (fall back to
//     cached shell if the network is down so the app still opens).
//   - Static assets (js, css, fonts, images, audio): stale-while-
//     revalidate — return cache immediately, update in background.
//   - Anything else: pass through.
//
// Versioned cache name. Bump VERSION to force clients to drop the
// old cache on next activate.
// ═══════════════════════════════════════════════════════

// Bump on every release that changes cacheable assets. Installed
// PWAs on iOS are VERY sticky — the only way to force them to drop
// stale audio/JS is a new VERSION string here, which causes the
// activate handler to delete ma-static-<old>/ma-runtime-<old>.
const VERSION = 'v8.0-alpha8-ramp-wakeup';
const STATIC_CACHE = `ma-static-${VERSION}`;
const RUNTIME_CACHE = `ma-runtime-${VERSION}`;

// Minimal app shell cached on install so first offline launch works.
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Silent — individual misses shouldn't block install.
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Same-origin only. Cross-origin (analytics, CDN) falls through.
  if (url.origin !== self.location.origin) return;

  // HTML / navigation → network-first.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else → stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    const shell = await caches.match('/');
    if (shell) return shell;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || new Response('Not available', { status: 504 });
}

// ── Notifications ────────────────────────────────────────
// The page posts {type: 'SCHEDULE_MORNING', hour, minute} to the
// service worker, which then uses setTimeout to show a local
// notification. This is a best-effort reminder — iOS Safari only
// delivers it if the PWA has been installed and permission was
// granted. Android delivers reliably.

let scheduledTimeoutId = null;
let alarmTimeoutId = null;

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SCHEDULE_MORNING') {
    scheduleMorning(data.hour, data.minute);
  } else if (data.type === 'CANCEL_MORNING') {
    if (scheduledTimeoutId) { clearTimeout(scheduledTimeoutId); scheduledTimeoutId = null; }
  } else if (data.type === 'SCHEDULE_ALARM') {
    scheduleAlarm(data.hour, data.minute);
  } else if (data.type === 'CANCEL_ALARM') {
    if (alarmTimeoutId) { clearTimeout(alarmTimeoutId); alarmTimeoutId = null; }
  }
});

function scheduleAlarm(hour, minute) {
  if (alarmTimeoutId) { clearTimeout(alarmTimeoutId); alarmTimeoutId = null; }
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  alarmTimeoutId = setTimeout(() => {
    self.registration.showNotification('Es hora, operador.', {
      body: 'Tu alarma suave est\u00e1 sonando. Abre para despertar.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'morning-alarm',
      requireInteraction: true,
      silent: false,
      data: { kind: 'alarm' },
    });
    // Re-arm for tomorrow so the fallback keeps firing daily even if
    // the page never reopens.
    scheduleAlarm(hour, minute);
  }, delay);
}

function scheduleMorning(hour, minute) {
  if (scheduledTimeoutId) { clearTimeout(scheduledTimeoutId); scheduledTimeoutId = null; }
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  const delay = next.getTime() - now.getTime();
  scheduledTimeoutId = setTimeout(() => {
    self.registration.showNotification('Buen día, operador.', {
      body: 'Tu protocolo matutino está listo.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'morning-awakening',
      requireInteraction: false,
      silent: false,
    });
    // Reschedule for tomorrow.
    scheduleMorning(hour, minute);
  }, delay);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return self.clients.openWindow('/?source=notification');
    }),
  );
});
