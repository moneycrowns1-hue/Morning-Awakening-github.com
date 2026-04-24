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
  /**
   * Weekday mask, 7 booleans indexed by `Date.getDay()`:
   *   [0]=Sun, [1]=Mon, [2]=Tue, [3]=Wed, [4]=Thu, [5]=Fri, [6]=Sat.
   * If every entry is false, the alarm is effectively off even when
   * `enabled` is true (defensive: treat it as "disabled today").
   */
  days: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  enabled: false,
  hour: 5,
  minute: 30,
  rampSec: 300,      // 5 min
  reaseguroSec: 300, // 5 min
  peakVolume: 0.7,
  chainProtocol: true,
  // Default: every day of the week. Previous persisted configs
  // without `days` are migrated to the same shape inside loadAlarm.
  days: [true, true, true, true, true, true, true],
};

/** Short Spanish labels for the weekday pills, starting on Monday
 *  since that's how the user writes their schedule (lun-dom). The
 *  array index here is NOT the same as the AlarmConfig.days index:
 *  use dayOrderMonFirst() to translate between the two. */
export const WEEKDAY_LABELS_ES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** Monday-first order as AlarmConfig.days indices.
 *  Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0. */
export const DAY_ORDER_MON_FIRST: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function loadAlarm(): AlarmConfig {
  if (typeof window === 'undefined') return DEFAULT_ALARM_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM_CONFIG;
    const p = JSON.parse(raw);
    // Migrate: older configs (pre-alpha10) don't carry `days`. Treat
    // them as every-day so existing users don't suddenly stop getting
    // alarms.
    const rawDays = Array.isArray(p.days) ? p.days : null;
    const days: AlarmConfig['days'] = [0, 1, 2, 3, 4, 5, 6].map(
      (i) => (rawDays ? !!rawDays[i] : true),
    ) as AlarmConfig['days'];
    return {
      enabled: !!p.enabled,
      hour: clamp(p.hour ?? 5, 0, 23) | 0,
      minute: clamp(p.minute ?? 30, 0, 59) | 0,
      rampSec: clamp(p.rampSec ?? 300, 60, 1800) | 0,
      reaseguroSec: clamp(p.reaseguroSec ?? 300, 0, 900) | 0,
      peakVolume: clamp(p.peakVolume ?? 0.7, 0.2, 1),
      chainProtocol: p.chainProtocol !== false,
      days,
    };
  } catch {
    return DEFAULT_ALARM_CONFIG;
  }
}

export function hasAnyDay(cfg: AlarmConfig): boolean {
  return cfg.days.some(Boolean);
}

export function saveAlarm(cfg: AlarmConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/**
 * Millis until the next target time, honouring the weekday mask.
 * Always in the future: walks forward up to 8 days looking for an
 * active weekday. Returns Infinity if every day is disabled so the
 * controller can treat the alarm as effectively off.
 */
export function msUntilNext(
  hour: number,
  minute: number,
  daysMask: AlarmConfig['days'] = [true, true, true, true, true, true, true],
  from: Date = new Date(),
): number {
  if (!daysMask.some(Boolean)) return Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < 8; offset++) {
    const target = new Date(from);
    target.setDate(target.getDate() + offset);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= from.getTime()) continue;
    if (daysMask[target.getDay()]) {
      return target.getTime() - from.getTime();
    }
  }
  // Should be unreachable (guaranteed to find an active day in ≤8).
  return Number.POSITIVE_INFINITY;
}

/**
 * Millis until the ramp should START (peak time minus rampSec).
 * Always positive: if today's ramp window already began but not
 * ended, returns a small positive number + the offset to resume
 * inside the ramp. Caller inspects `offsetSec` > 0 to know it's
 * mid-ramp on first open.
 *
 * `msUntilRampStart === Infinity` signals "no active day in the
 * weekday mask" so the controller can skip arming entirely.
 */
export interface NextFireInfo {
  msUntilRampStart: number;
  offsetSec: number;
  peakAt: number;
}

export function nextFireInfo(cfg: AlarmConfig, from: Date = new Date()): NextFireInfo {
  const peakMs = msUntilNext(cfg.hour, cfg.minute, cfg.days, from);
  if (!Number.isFinite(peakMs)) {
    return { msUntilRampStart: Number.POSITIVE_INFINITY, offsetSec: 0, peakAt: 0 };
  }
  const peakAt = from.getTime() + peakMs;
  const rampStart = peakAt - cfg.rampSec * 1000;
  const now = from.getTime();
  if (rampStart <= now) {
    // The ramp is already in progress for this occurrence, but only
    // if today is actually an active weekday.
    if (!cfg.days[from.getDay()]) {
      return { msUntilRampStart: peakMs, offsetSec: 0, peakAt };
    }
    const offsetSec = Math.min(cfg.rampSec, (now - rampStart) / 1000);
    return { msUntilRampStart: 0, offsetSec, peakAt };
  }
  return { msUntilRampStart: rampStart - now, offsetSec: 0, peakAt };
}

function formatTimeHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Short human summary of the active weekdays.
 *  "Todos los días" / "Entre semana" / "Fines de semana" /
 *  "L · M · V" etc. */
export function describeDays(days: AlarmConfig['days']): string {
  const on = days.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  if (on.length === 7) return 'Todos los días';
  if (on.length === 0) return 'Ningún día activo';
  const isWeekday = (i: number) => i >= 1 && i <= 5;
  const isWeekend = (i: number) => i === 0 || i === 6;
  if (on.length === 5 && on.every(isWeekday)) return 'Lun – Vie';
  if (on.length === 2 && on.every(isWeekend)) return 'Sáb – Dom';
  const names = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return DAY_ORDER_MON_FIRST.filter((i) => days[i]).map((i) => names[i]).join(' · ');
}

export function describeAlarm(cfg: AlarmConfig): string {
  const t = formatTimeHHMM(cfg.hour, cfg.minute);
  const ramp = Math.round(cfg.rampSec / 60);
  const dayPart = describeDays(cfg.days);
  if (cfg.reaseguroSec > 0) {
    const re = Math.round(cfg.reaseguroSec / 60);
    return `${dayPart} · ${t} · ramp ${ramp} min · reaseguro +${re} min`;
  }
  return `${dayPart} · ${t} · ramp ${ramp} min`;
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
  // Skip scheduling when the weekday mask is empty — otherwise the SW
  // would post a notification tomorrow regardless of the user's
  // "no days active" intent.
  if (!cfg.days.some(Boolean)) {
    await postToSW({ type: 'CANCEL_ALARM' });
    return;
  }
  await postToSW({
    type: 'SCHEDULE_ALARM',
    hour: cfg.hour,
    minute: cfg.minute,
    days: cfg.days,
  });
}

export async function disarmSystemFallback(): Promise<void> {
  await postToSW({ type: 'CANCEL_ALARM' });
}
