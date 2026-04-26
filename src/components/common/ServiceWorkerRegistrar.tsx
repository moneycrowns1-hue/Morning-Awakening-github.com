'use client';

// ═══════════════════════════════════════════════════════
// ServiceWorkerRegistrar · renders nothing, registers /sw.js
// on mount. Only runs in production builds so the dev loop
// isn't polluted by a caching worker.
// ═══════════════════════════════════════════════════════

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Skip in dev to avoid caching HMR bundles.
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async () => {
          // Once the SW is active, re-post the morning reminder schedule.
          // This is necessary because SW timeouts don't survive browser
          // restarts — the page has to tell it again every load.
          try {
            const { rehydrateReminder } = await import('@/lib/alarm/morningReminder');
            await rehydrateReminder();
          } catch { /* ignore */ }
          // Same idea for NUCLEUS day-mode pings: the SW timeouts get
          // reset on every restart, so we re-arm them on every load.
          try {
            const { rehydrateNucleusPings } = await import('@/lib/nucleus/nucleusPings');
            await rehydrateNucleusPings();
          } catch { /* ignore */ }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[sw] registration failed', err);
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
