// ═══════════════════════════════════════════════════════════
// notifications.ts · Web Notifications permission + schedule
//
// Wraps the browser Notifications API for the "alarma de respaldo"
// feature. Three states:
//
//   - 'unsupported'  → Notification API missing (iOS Safari pre-16.4
//                       or PWA not installed). Caller should hide
//                       the prompt or show "instalá la PWA" copy.
//   - 'default'      → Never asked. Caller should show the rationale
//                       modal and call requestPermission() on tap.
//   - 'granted'      → Done. Use scheduleBackupNotification() to
//                       arm a best-effort local notification.
//   - 'denied'       → Sent to settings; show the "habilitalo en
//                       ajustes del sistema" variant.
//
// IMPORTANT: scheduleBackupNotification() is best-effort. It uses
// setTimeout, which only fires while the page is visible / the SW
// is alive. On installed PWAs the SW persists longer; in browsers
// it'll be dropped after a few minutes of inactivity. Reliable
// at-time delivery requires Web Push from a backend.
// ═══════════════════════════════════════════════════════════

const PENDING_KEY = 'ma-backup-notification-at';

export type NotifPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotifPermission(): NotifPermission {
  if (typeof window === 'undefined') return 'unsupported';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifPermission;
}

/** Returns the new permission state after the prompt resolves. */
export async function requestNotifPermission(): Promise<NotifPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as NotifPermission;
  } catch {
    return 'denied';
  }
}

/** Are we likely in an iOS Safari browser tab (where Notification
 *  API only works once the PWA is installed to home screen)? */
export function isIosNotInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  // navigator.standalone is iOS-specific.
  const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  return isIos && !standalone;
}

interface BackupOptions {
  title: string;
  body: string;
  /** Absolute timestamp (ms) when to fire. */
  whenMs: number;
}

/**
 * Schedules a best-effort local notification for the given time.
 * - Persists `whenMs` to localStorage so we can re-arm on next visit.
 * - Uses setTimeout if the time is within ~24h.
 * - On fire, prefers SW registration (so it works while page is
 *   backgrounded on installed PWAs) and falls back to direct
 *   `new Notification(...)` for tab-only contexts.
 */
export function scheduleBackupNotification({ title, body, whenMs }: BackupOptions): void {
  if (typeof window === 'undefined') return;
  if (getNotifPermission() !== 'granted') return;

  try {
    localStorage.setItem(PENDING_KEY, String(whenMs));
  } catch { /* ignore */ }

  const delay = whenMs - Date.now();
  if (delay <= 0) {
    fireNotification(title, body);
    return;
  }

  // Cap setTimeout at 24h — anything farther will be re-armed on
  // next visit via rearmPendingBackupNotification().
  const cappedDelay = Math.min(delay, 24 * 60 * 60 * 1000);
  window.setTimeout(() => fireNotification(title, body), cappedDelay);
}

function fireNotification(title: string, body: string) {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          tag: 'ma-backup-alarm',
          requireInteraction: true,
        });
      });
    } else {
      new Notification(title, { body, tag: 'ma-backup-alarm' });
    }
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

/** Call once on app mount — re-arms a previously scheduled backup
 *  if the page reloaded before it fired. */
export function rearmPendingBackupNotification(rearm: { title: string; body: string }): void {
  if (typeof window === 'undefined') return;
  if (getNotifPermission() !== 'granted') return;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const whenMs = Number(raw);
    if (!Number.isFinite(whenMs) || whenMs <= Date.now()) {
      // Stale or already past — drop it.
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    scheduleBackupNotification({ ...rearm, whenMs });
  } catch { /* ignore */ }
}

export function clearPendingBackupNotification(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}
