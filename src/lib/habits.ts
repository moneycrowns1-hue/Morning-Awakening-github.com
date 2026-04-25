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
  | 'no_screens_before_bed'
  // ─── NUCLEUS · day mode ────────────────────────────────
  | 'salt_water_morning'
  | 'active_recall_pre_arena'
  | 'coffee_9am'
  | 'rule_20_20_20'
  | 'scapular_retractions'
  | 'lunch_clean'
  | 'midday_brush'
  | 'nsdr_session'
  | 'no_caffeine_pm'
  | 'optic_flow_walk'
  | 'desk_closure'
  | 'nucleus_complete'
  // ─── Wellness Hub ──────────────────────────────────────
  | 'bruxism_exercise'
  | 'deep_meditation'
  | 'lymphatic_facial';

export type HabitTrack = 'morning' | 'day' | 'night' | 'both';

export const HABIT_META: Record<HabitId, { label: string; icon: string; track: HabitTrack }> = {
  morning_protocol:      { label: 'Protocolo matutino',       icon: '☀', track: 'morning' },
  night_protocol:        { label: 'Protocolo nocturno',       icon: '☾', track: 'night'   },
  breathing:             { label: 'Respiración guiada',       icon: '◯', track: 'both'    },
  journaling:            { label: 'Diario',                   icon: '✎', track: 'both'    },
  slept_in_gate:         { label: 'Dormí dentro de la ventana', icon: '⌐', track: 'night' },
  no_screens_before_bed: { label: 'Sin pantallas antes de cama', icon: '⊘', track: 'night' },
  // NUCLEUS day-block habits
  salt_water_morning:      { label: 'Agua + sal · pre-arena',     icon: '◇', track: 'day' },
  active_recall_pre_arena: { label: 'Active recall · PRE-ARENA',  icon: '◆', track: 'day' },
  coffee_9am:              { label: 'Café 9:00 AM',               icon: '☕', track: 'day' },
  rule_20_20_20:           { label: 'Regla 20-20-20',             icon: '◉', track: 'day' },
  scapular_retractions:    { label: 'Retracciones escapulares',   icon: '⊞', track: 'day' },
  lunch_clean:             { label: 'Almuerzo · proteína+grasas', icon: '◍', track: 'day' },
  midday_brush:            { label: 'Cepillado de transición',    icon: '✦', track: 'day' },
  nsdr_session:            { label: 'NSDR · 20 min',              icon: '◐', track: 'day' },
  no_caffeine_pm:          { label: 'Cero café desde 14:00',      icon: '⊘', track: 'day' },
  optic_flow_walk:         { label: 'Walk + cielo · optic flow',  icon: '◔', track: 'day' },
  desk_closure:            { label: 'Sello del escritorio',       icon: '⠡', track: 'day' },
  nucleus_complete:        { label: 'Día NUCLEUS completo',       icon: '☉', track: 'day' },
  // Wellness hub
  bruxism_exercise:        { label: 'Bruxismo · mandíbula libre',  icon: '◇', track: 'both' },
  deep_meditation:         { label: 'Meditación profunda',         icon: '○', track: 'both' },
  lymphatic_facial:        { label: 'Drenaje linfático facial',    icon: '◐', track: 'morning' },
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
