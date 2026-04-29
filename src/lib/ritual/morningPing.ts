// ═══════════════════════════════════════════════════════════
// morningPing.ts · push notification diaria que invita a
// arrancar el ritual matutino.
//
// Reemplaza al antiguo `morningReminder.ts`. Usa el MISMO
// canal del service worker (`SCHEDULE_MORNING` / `CANCEL_MORNING`)
// y la MISMA storage key (`morning-awakening-reminder`) por
// compatibilidad — sólo cambió el nombre del módulo y la
// conceptualización: ya no es "recordatorio del protocolo",
// ahora es "tu ritual matutino te espera".
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-reminder';

export interface MorningPingConfig {
  enabled: boolean;
  hour: number;    // 0..23
  minute: number;  // 0..59
}

const DEFAULT_CONFIG: MorningPingConfig = { enabled: false, hour: 5, minute: 0 };

export function loadConfig(): MorningPingConfig {
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

function saveConfig(cfg: MorningPingConfig): void {
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

export function permissionStatus(): NotificationPermission | 'unsupported' {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
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

/**
 * Programa el push diario para HH:MM. Pide permiso si hace falta.
 * Devuelve `true` si quedó programado.
 */
export async function enableMorningPing(hour: number, minute: number): Promise<boolean> {
  const permission = await requestPermission();
  if (permission !== 'granted') return false;
  const cfg: MorningPingConfig = {
    enabled: true,
    hour: clamp(hour, 0, 23),
    minute: clamp(minute, 0, 59),
  };
  saveConfig(cfg);
  await postToSW({ type: 'SCHEDULE_MORNING', hour: cfg.hour, minute: cfg.minute });
  return true;
}

/** Apaga el push y persiste el cambio. */
export async function disableMorningPing(): Promise<void> {
  const cfg = loadConfig();
  saveConfig({ ...cfg, enabled: false });
  await postToSW({ type: 'CANCEL_MORNING' });
}

/**
 * Re-programa el push después de un load del page (los timers del SW
 * no sobreviven a su terminación). Llamar una vez al iniciar la app
 * si `cfg.enabled === true`.
 */
export async function rescheduleMorningPing(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.enabled) return;
  const permission = permissionStatus();
  if (permission !== 'granted') return;
  await postToSW({ type: 'SCHEDULE_MORNING', hour: cfg.hour, minute: cfg.minute });
}

// ─── Back-compat aliases ────────────────────────────────────
// Mantienen funcional al `SettingsScreen` y al
// `ServiceWorkerRegistrar` que importan los nombres del antiguo
// `morningReminder.ts`. Internamente delegan al mismo SW.

/** Alias antiguo de `MorningPingConfig`. */
export type ReminderConfig = MorningPingConfig;

/** Alias antiguo: lee la misma key de localStorage. */
export const enableReminder = enableMorningPing;
export const disableReminder = disableMorningPing;
export const rehydrateReminder = rescheduleMorningPing;
