// ═══════════════════════════════════════════════════════════
// nucleusPings.ts · NUCLEUS day-mode push orchestration
//
// Generates the day's array of micro-habit pings (expanding
// recurring triggers into concrete time-slots) and posts them
// to the service worker, which actually schedules the
// notifications. Also handles:
//   - "Skip today" override (localStorage flag, auto-cleared
//     after 48 h so it never lingers).
//   - Permission gate (re-uses the same Notification API as
//     morningReminder).
//   - URL param consumption (?nucleus_done=<microHabitId>) so
//     tapping a notification action auto-marks the habit.
// ═══════════════════════════════════════════════════════════

import {
  NUCLEUS_BLOCKS,
  hhmmToMinutes,
  isWeekend,
  type NucleusBlock,
  type NucleusMicroHabit,
} from './nucleusConstants';
import { markHabit, type HabitId } from './habits';

const NUCLEUS_ENABLED_KEY = 'ma-nucleus-enabled';
const NUCLEUS_SKIP_PREFIX = 'ma-nucleus-skip-';

// ── Permission helpers (mirror morningReminder.ts) ─────────

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

export async function requestNucleusPermission(): Promise<NotificationPermission> {
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

// ── Enable / disable + skip-today ──────────────────────────

export function isNucleusEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = window.localStorage.getItem(NUCLEUS_ENABLED_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export function setNucleusEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NUCLEUS_ENABLED_KEY, on ? '1' : '0');
  } catch { /* ignore */ }
}

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mark NUCLEUS as skipped for the given calendar day (default today). */
export function setSkipToday(skip: boolean, d: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  const key = `${NUCLEUS_SKIP_PREFIX}${todayKey(d)}`;
  try {
    if (skip) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function isSkippedToday(d: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(`${NUCLEUS_SKIP_PREFIX}${todayKey(d)}`) === '1';
  } catch {
    return false;
  }
}

/** Remove skip flags older than 48 h so the prefix doesn't accumulate junk. */
function pruneStaleSkipFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const keepKeys = new Set<string>();
    // Keep today + yesterday only.
    const today = new Date();
    keepKeys.add(`${NUCLEUS_SKIP_PREFIX}${todayKey(today)}`);
    const yesterday = new Date(now - 24 * 3600 * 1000);
    keepKeys.add(`${NUCLEUS_SKIP_PREFIX}${todayKey(yesterday)}`);
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(NUCLEUS_SKIP_PREFIX) && !keepKeys.has(k)) {
        window.localStorage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
}

// ── Ping expansion ─────────────────────────────────────────

interface NucleusPingPayload {
  whenMs: number;
  title: string;
  body: string;
  microHabitId: string;
  habitId: HabitId;
  blockId: string;
  dayKey: string;
}

function setHHMM(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((s) => parseInt(s, 10));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function expandMicroHabit(
  block: NucleusBlock,
  mh: NucleusMicroHabit,
  base: Date,
): NucleusPingPayload[] {
  if (mh.weekdaysOnly && isWeekend(base)) return [];
  const dayKey = todayKey(base);
  const pings: NucleusPingPayload[] = [];

  if (mh.trigger.kind === 'once') {
    const when = setHHMM(base, mh.trigger.atHHMM);
    pings.push({
      whenMs: when.getTime(),
      title: `${block.codename} · ${mh.label}`,
      body: mh.notifyBody,
      microHabitId: mh.id,
      habitId: mh.habitId,
      blockId: block.id,
      dayKey,
    });
    return pings;
  }

  // recurring
  const startMin = hhmmToMinutes(mh.trigger.fromHHMM);
  const endMin = hhmmToMinutes(mh.trigger.untilHHMM);
  const step = mh.trigger.everyMinutes;
  for (let m = startMin; m <= endMin; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const when = setHHMM(base, `${hh}:${mm}`);
    pings.push({
      whenMs: when.getTime(),
      title: `${block.codename} · ${mh.label}`,
      body: mh.notifyBody,
      microHabitId: `${mh.id}-${hh}${mm}`,
      habitId: mh.habitId,
      blockId: block.id,
      dayKey,
    });
  }
  return pings;
}

/** Build today's full ping list (post-now and within 24 h). */
export function buildTodayPings(base: Date = new Date()): NucleusPingPayload[] {
  if (isSkippedToday(base)) return [];
  const out: NucleusPingPayload[] = [];
  for (const block of NUCLEUS_BLOCKS) {
    if (block.skipWeekend && isWeekend(base)) continue;
    for (const mh of block.microHabits) {
      out.push(...expandMicroHabit(block, mh, base));
    }
  }
  return out;
}

// ── Public API ─────────────────────────────────────────────

export async function scheduleNucleusPings(): Promise<boolean> {
  pruneStaleSkipFlags();
  if (!isNucleusEnabled()) return false;
  const perm = await requestNucleusPermission();
  if (perm !== 'granted') return false;
  const pings = buildTodayPings();
  await postToSW({ type: 'SCHEDULE_NUCLEUS_PINGS', pings });
  return true;
}

export async function cancelNucleusPings(): Promise<void> {
  await postToSW({ type: 'CANCEL_NUCLEUS_PINGS' });
}

/**
 * Called on every page load. If NUCLEUS is enabled and notifications
 * are still granted, re-post today's pings so the SW timers are fresh.
 * Skips silently if disabled or perm revoked.
 */
export async function rehydrateNucleusPings(): Promise<void> {
  pruneStaleSkipFlags();
  if (!isNucleusEnabled()) {
    await cancelNucleusPings();
    return;
  }
  if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
    setNucleusEnabled(false);
    await cancelNucleusPings();
    return;
  }
  const pings = buildTodayPings();
  await postToSW({ type: 'SCHEDULE_NUCLEUS_PINGS', pings });
}

// ── URL param + SW message bridge ──────────────────────────

/**
 * Consume `?nucleus_done=<microHabitId>` and `?nucleus_open=<microHabitId>`
 * from the current URL. If `done` is present, mark the corresponding habit
 * as completed. Returns the matched microHabitId or null.
 */
export function consumeNucleusUrlParam(): { verb: 'done' | 'open'; microHabitId: string } | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const done = url.searchParams.get('nucleus_done');
  const open = url.searchParams.get('nucleus_open');
  const matched = done
    ? { verb: 'done' as const, microHabitId: done }
    : open
    ? { verb: 'open' as const, microHabitId: open }
    : null;
  if (!matched) return null;
  // Strip the param so a refresh doesn't re-fire the action.
  url.searchParams.delete('nucleus_done');
  url.searchParams.delete('nucleus_open');
  try {
    window.history.replaceState({}, document.title, url.pathname + (url.search ? `?${url.searchParams.toString()}` : '') + url.hash);
  } catch { /* ignore */ }
  if (matched.verb === 'done') {
    const habitId = resolveHabitId(matched.microHabitId);
    if (habitId) markHabit(habitId);
  }
  return matched;
}

/**
 * Map a microHabitId (which may include a recurring suffix like
 * "rule_20_20_20-0850") back to its base HabitId.
 */
function resolveHabitId(microHabitId: string): HabitId | null {
  const baseId = microHabitId.replace(/-\d{4}$/, '');
  for (const block of NUCLEUS_BLOCKS) {
    for (const mh of block.microHabits) {
      if (mh.id === baseId) return mh.habitId;
    }
  }
  return null;
}

/** Subscribe to the SW's postMessage channel for nucleus actions. */
export function subscribeToNucleusActions(
  cb: (msg: { verb: string; microHabitId?: string; blockId?: string }) => void,
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.kind !== 'nucleus-action') return;
    if (data.verb === 'done' && data.microHabitId) {
      const habitId = resolveHabitId(data.microHabitId);
      if (habitId) markHabit(habitId);
    }
    cb(data);
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
