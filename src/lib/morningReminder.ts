// ═══════════════════════════════════════════════════════
// morningReminder.ts · daily morning reminder via service
// worker + Notification API.
//
// Flow:
//   enableReminder(hour, minute)
//     \u2192 request Notification permission if not granted
//     \u2192 postMessage {type: SCHEDULE_MORNING} to the SW
//     \u2192 persist {enabled, hour, minute} in localStorage
//   disableReminder()
//     \u2192 postMessage CANCEL_MORNING
//     \u2192 persist {enabled: false}
//
// The page re-posts SCHEDULE_MORNING on every load so the SW
// always has a fresh timeout (the timeout doesn't survive SW
// termination — this is a best-effort reminder, not a hard
// alarm). iOS Safari only fires it if the PWA is installed
// AND has permission.
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-reminder';

export interface ReminderConfig {
  enabled: boolean;
  hour: number;    // 0..23
  minute: number;  // 0..59
}

const DEFAULT_CONFIG: ReminderConfig = { enabled: false, hour: 5, minute: 0 };

export function loadConfig(): ReminderConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      hour: clamp(parsed.hour ?? 5, 0, 23),
      minute: clamp(parsed.minute ?? 0, 0, 59),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: ReminderConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n | 0));
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

async function postToSW(message: unknown): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.active) return false;
    reg.active.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

export async function enableReminder(hour: number, minute: number): Promise<boolean> {
  const permission = await requestPermission();
  if (permission !== 'granted') return false;
  const cfg: ReminderConfig = { enabled: true, hour: clamp(hour, 0, 23), minute: clamp(minute, 0, 59) };
  saveConfig(cfg);
  await postToSW({ type: 'SCHEDULE_MORNING', hour: cfg.hour, minute: cfg.minute });
  return true;
}

export async function disableReminder(): Promise<void> {
  const cfg = loadConfig();
  saveConfig({ ...cfg, enabled: false });
  await postToSW({ type: 'CANCEL_MORNING' });
}

/**
 * Called on page load: if the user had enabled the reminder, reschedule
 * it so the SW has a fresh timeout for the next day.
 */
export async function rehydrateReminder(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.enabled) return;
  if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
    // Permission was revoked. Quietly disable.
    saveConfig({ ...cfg, enabled: false });
    return;
  }
  await postToSW({ type: 'SCHEDULE_MORNING', hour: cfg.hour, minute: cfg.minute });
}

export function permissionStatus(): NotificationPermission | 'unsupported' {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}
