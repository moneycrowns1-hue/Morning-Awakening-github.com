// ═══════════════════════════════════════════════════════════
// sleepGate.ts · adaptive sleep-window calculator
//
// Computes the "puerta de sueño" for tonight given:
//   - the user's morning alarm (hour, minute, day mask)
//   - target sleep duration (minutes, user-configured)
//   - whether the user is in an adaptation period (wider window)
//
// The result is used by:
//   - NightWelcomeScreen  → "Esta noche, tu gate: 22:30 – 23:30"
//   - SlumberLockScreen   → semicircular dial + status text
//   - StatsScreen         → historical adherence band
// ═══════════════════════════════════════════════════════════

import type { AlarmConfig } from '../ritual/ritualSchedule';
import type { HealthSnapshot } from '../common/healthkitBridge';

const SLEEP_CONFIG_KEY = 'ma-sleep-config';
const SLEEP_ENTRIES_KEY = 'ma-night-entries';

export interface SleepConfig {
  /** Target sleep duration in minutes. Default 480 (8 h). */
  sleepNeedMin: number;
  /** User-toggled wider window for the first 7 nights. */
  adaptationPeriod: boolean;
  /** When adaptationPeriod was activated (ISO date). */
  adaptationStartedAt?: string;
}

export const DEFAULT_SLEEP_CONFIG: SleepConfig = {
  sleepNeedMin: 480,
  adaptationPeriod: true,
  adaptationStartedAt: undefined,
};

export interface NightEntry {
  dateISO: string;
  /** When the user entered SLUMBER. */
  slumberAtISO: string;
  /** Optional — filled next morning when alarm dismisses. */
  sleptMin?: number;
  /** Whether SLUMBER happened inside the gate window. */
  insideGate: boolean;
  /** 'full' | 'express' — which night mode was run. */
  mode?: 'full' | 'express';
}

export interface SleepGate {
  /** Start of the window. */
  start: Date;
  /** End of the window. */
  end: Date;
  /** The "ideal" center point (alarm - sleepNeed). */
  ideal: Date;
  /** Total width in minutes. */
  widthMin: number;
  /** Whether the adaptation period is currently active. */
  adaptive: boolean;
  /** Where the gate parameters came from. */
  source: 'config' | 'health';
}

export function loadSleepConfig(): SleepConfig {
  if (typeof window === 'undefined') return DEFAULT_SLEEP_CONFIG;
  try {
    const raw = window.localStorage.getItem(SLEEP_CONFIG_KEY);
    if (!raw) return DEFAULT_SLEEP_CONFIG;
    return { ...DEFAULT_SLEEP_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SLEEP_CONFIG;
  }
}

export function saveSleepConfig(cfg: SleepConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SLEEP_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export function loadNightEntries(): NightEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SLEEP_ENTRIES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function appendNightEntry(entry: NightEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const list = loadNightEntries();
    // Replace today's entry if it already exists (second tap on SLUMBER).
    const filtered = list.filter((e) => e.dateISO !== entry.dateISO);
    filtered.push(entry);
    // Keep last 60 days only.
    const trimmed = filtered.slice(-60);
    window.localStorage.setItem(SLEEP_ENTRIES_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/**
 * Compute tonight's sleep gate.
 * Base formula: `bedtime = alarm - sleepNeed`, window = ±30 min.
 * If adaptation is on, the window widens to ±60 min.
 */
export function computeSleepGate(
  alarm: AlarmConfig,
  sleep: SleepConfig,
  now: Date = new Date(),
  health?: HealthSnapshot | null,
): SleepGate {
  // Find the NEXT alarm fire (tomorrow morning, or today if still ahead).
  const alarmToday = new Date(now);
  alarmToday.setHours(alarm.hour, alarm.minute, 0, 0);
  const nextAlarm = alarmToday.getTime() > now.getTime()
    ? alarmToday
    : new Date(alarmToday.getTime() + 24 * 60 * 60 * 1000);

  // ─── Source resolution ───────────────────────────────────
  // If we have a fresh Health snapshot with at least 5 nights,
  // we trust the user's actual sleep duration over the manually
  // configured `sleepNeedMin`. This makes the gate adapt to the
  // real chronotype without the user touching settings.
  let effectiveNeedMin = sleep.sleepNeedMin;
  let source: 'config' | 'health' = 'config';
  if (health && health.nights.length >= 5) {
    // Clamp to a sane range so an outlier export can't drag the
    // recommendation to 4h or 12h.
    const clamped = Math.max(360, Math.min(540, health.avgDurationMin));
    effectiveNeedMin = clamped;
    source = 'health';
  }

  const idealMs = nextAlarm.getTime() - effectiveNeedMin * 60 * 1000;
  // Health-sourced gate is tighter (±20 min) because we have real
  // data; configured-only gate keeps the looser ±30/±60 widths.
  const halfWidthMin = source === 'health'
    ? 20
    : (sleep.adaptationPeriod ? 60 : 30);

  return {
    start: new Date(idealMs - halfWidthMin * 60 * 1000),
    end: new Date(idealMs + halfWidthMin * 60 * 1000),
    ideal: new Date(idealMs),
    widthMin: halfWidthMin * 2,
    adaptive: sleep.adaptationPeriod,
    source,
  };
}

/**
 * Classify the current moment relative to the gate.
 *   'early'     -> still >30 min before start
 *   'approach'  -> within 30 min before start
 *   'in-gate'   -> between start and end
 *   'late'      -> past end, up to +60 min
 *   'very-late' -> more than +60 min past end
 */
export function gateStatus(gate: SleepGate, now: Date = new Date()): 'early' | 'approach' | 'in-gate' | 'late' | 'very-late' {
  const t = now.getTime();
  const startMs = gate.start.getTime();
  const endMs = gate.end.getTime();
  if (t < startMs - 30 * 60 * 1000) return 'early';
  if (t < startMs) return 'approach';
  if (t <= endMs) return 'in-gate';
  if (t <= endMs + 60 * 60 * 1000) return 'late';
  return 'very-late';
}

export function formatGateWindow(gate: SleepGate): string {
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(gate.start)} – ${fmt(gate.end)}`;
}
