// ═══════════════════════════════════════════════════════════
// habits.ts · unified habit tracker
// Stores a per-day boolean per habit in localStorage and
// exposes helpers to mark and query adherence. The Stats
// screen reads from here to render the 21-day chart.
// ═══════════════════════════════════════════════════════════

const HABITS_KEY = 'ma-habits';

export type HabitId =
  | 'morning_protocol'
  | 'night_protocol'
  | 'breathing'
  | 'journaling'
  | 'slept_in_gate'
  | 'no_screens_before_bed';

export const HABIT_META: Record<HabitId, { label: string; icon: string; track: 'morning' | 'night' | 'both' }> = {
  morning_protocol:      { label: 'Protocolo matutino',       icon: '☀', track: 'morning' },
  night_protocol:        { label: 'Protocolo nocturno',       icon: '☾', track: 'night'   },
  breathing:             { label: 'Respiración guiada',       icon: '◯', track: 'both'    },
  journaling:            { label: 'Diario',                   icon: '✎', track: 'both'    },
  slept_in_gate:         { label: 'Dormí dentro de la ventana', icon: '⌐', track: 'night' },
  no_screens_before_bed: { label: 'Sin pantallas antes de cama', icon: '⊘', track: 'night' },
};

type HabitStore = Partial<Record<HabitId, Record<string, boolean>>>;

function load(): HabitStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(store: HabitStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HABITS_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mark a habit as completed today. */
export function markHabit(id: HabitId, dateISO: string = todayISO()): void {
  const store = load();
  const series = store[id] ?? {};
  series[dateISO] = true;
  store[id] = series;
  save(store);
}

/** Set a habit for a specific date (useful for toggles). */
export function setHabit(id: HabitId, dateISO: string, value: boolean): void {
  const store = load();
  const series = store[id] ?? {};
  if (value) series[dateISO] = true;
  else delete series[dateISO];
  store[id] = series;
  save(store);
}

export function isHabitDone(id: HabitId, dateISO: string = todayISO()): boolean {
  const store = load();
  return !!store[id]?.[dateISO];
}

/** Adherence ratio over the last N days for a given habit. */
export function adherence(id: HabitId, days: number = 21): number {
  const store = load();
  const series = store[id] ?? {};
  const now = new Date();
  let hit = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (series[iso]) hit += 1;
  }
  return hit / days;
}

/** Per-day completion ratio (across all habits) for the last N days. */
export function dailyCompletionSeries(days: number = 21): Array<{ dateISO: string; ratio: number }> {
  const store = load();
  const ids = Object.keys(HABIT_META) as HabitId[];
  const now = new Date();
  const series: Array<{ dateISO: string; ratio: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let hit = 0;
    for (const id of ids) {
      if (store[id]?.[iso]) hit += 1;
    }
    series.push({ dateISO: iso, ratio: hit / ids.length });
  }
  return series;
}

/** Longest current streak for a habit (consecutive days ending today). */
export function currentStreak(id: HabitId): number {
  const store = load();
  const series = store[id] ?? {};
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (series[iso]) streak += 1;
    else break;
  }
  return streak;
}
