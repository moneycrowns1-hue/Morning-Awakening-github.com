// ═══════════════════════════════════════════════════════
// alarmSchedule.ts · persistence + scheduling helpers for
// the gentle alarm.
//
// The alarm config is stored under ALARM_KEY. The actual
// firing is handled by AlarmController (client-side, with
// the app open) and, as a hard-to-miss fallback, by a local
// notification scheduled through the service worker.
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-alarm';

export interface AlarmConfig {
  enabled: boolean;
  /** 0..23 — the moment the alarm reaches peak volume. */
  hour: number;
  /** 0..59. */
  minute: number;
  /** Seconds of gentle ramp before peak. 60..1800. */
  rampSec: number;
  /** Seconds after peak before the louder "reaseguro" kicks in.
   *  0 disables reaseguro. 60..900 when enabled. */
  reaseguroSec: number;
  /** Peak volume 0..1. */
  peakVolume: number;
  /** Whether to launch the Morning Awakening protocol right after
   *  the user dismisses the alarm. */
  chainProtocol: boolean;
}

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  enabled: false,
  hour: 5,
  minute: 30,
  rampSec: 300,      // 5 min
  reaseguroSec: 300, // 5 min
  peakVolume: 0.7,
  chainProtocol: true,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function loadAlarm(): AlarmConfig {
  if (typeof window === 'undefined') return DEFAULT_ALARM_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM_CONFIG;
    const p = JSON.parse(raw);
    return {
      enabled: !!p.enabled,
      hour: clamp(p.hour ?? 5, 0, 23) | 0,
      minute: clamp(p.minute ?? 30, 0, 59) | 0,
      rampSec: clamp(p.rampSec ?? 300, 60, 1800) | 0,
      reaseguroSec: clamp(p.reaseguroSec ?? 300, 0, 900) | 0,
      peakVolume: clamp(p.peakVolume ?? 0.7, 0.2, 1),
      chainProtocol: p.chainProtocol !== false,
    };
  } catch {
    return DEFAULT_ALARM_CONFIG;
  }
}

export function saveAlarm(cfg: AlarmConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/**
 * Millis until the next target time. Always in the future: if the
 * HH:MM has already passed today, returns tomorrow.
 */
export function msUntilNext(hour: number, minute: number, from: Date = new Date()): number {
  const target = new Date(from);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= from.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - from.getTime();
}

/**
 * Millis until the ramp should START (peak time minus rampSec).
 * Always positive: if today's ramp window already began but not
 * ended, returns a small positive number + the offset to resume
 * inside the ramp. Caller inspects `offsetSec` > 0 to know it's
 * mid-ramp on first open.
 */
export interface NextFireInfo {
  msUntilRampStart: number;
  offsetSec: number;
  peakAt: number;
}

export function nextFireInfo(cfg: AlarmConfig, from: Date = new Date()): NextFireInfo {
  const peakMs = msUntilNext(cfg.hour, cfg.minute, from);
  const peakAt = from.getTime() + peakMs;
  const rampStart = peakAt - cfg.rampSec * 1000;
  const now = from.getTime();
  if (rampStart <= now) {
    // The ramp is already in progress for this occurrence.
    const offsetSec = Math.min(cfg.rampSec, (now - rampStart) / 1000);
    return { msUntilRampStart: 0, offsetSec, peakAt };
  }
  return { msUntilRampStart: rampStart - now, offsetSec: 0, peakAt };
}

function formatTimeHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function describeAlarm(cfg: AlarmConfig): string {
  const t = formatTimeHHMM(cfg.hour, cfg.minute);
  const ramp = Math.round(cfg.rampSec / 60);
  if (cfg.reaseguroSec > 0) {
    const re = Math.round(cfg.reaseguroSec / 60);
    return `Alarma a las ${t} · ramp ${ramp} min · reaseguro +${re} min`;
  }
  return `Alarma a las ${t} · ramp ${ramp} min`;
}

// ── Service worker notification fallback ────────────────
// This is intentionally separate from the morning protocol
// reminder: the alarm notification fires AT peak time (not
// before), so if the PWA isn't open and the silent keepalive
// + audio ramp couldn't run, the iPad still gets a system
// notification to "wake" the user.

async function postToSW(message: unknown): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.active) reg.active.postMessage(message);
  } catch { /* ignore */ }
}

export async function armSystemFallback(cfg: AlarmConfig): Promise<void> {
  await postToSW({
    type: 'SCHEDULE_ALARM',
    hour: cfg.hour,
    minute: cfg.minute,
  });
}

export async function disarmSystemFallback(): Promise<void> {
  await postToSW({ type: 'CANCEL_ALARM' });
}
