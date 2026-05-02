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
  // ─── NUCLEUS · contextuales (inyectados por adapter) ────
  // Sólo aparecen cuando el `nucleusAdapter` detecta señales
  // específicas (stress alto, sleep debt, etc). Se trackean
  // como hábitos normales para consolidar streaks.
  | 'jaw_release_pre_arena'
  | 'breath_478_recarga'
  | 'light_exposure_extra'
  | 'extra_nsdr_monolito'
  // ─── Wellness Hub ──────────────────────────────────────
  | 'bruxism_exercise'
  | 'deep_meditation'
  | 'lymphatic_facial'
  // ─── Looksmax · free-tier (siempre activos) ─────────────
  // Hábitos sin coste que el usuario puede ejecutar desde día 1
  // sin comprar nada. Trackeados directo desde Génesis.
  | 'mewing_check'
  | 'jaw_release'
  | 'chin_tuck'
  | 'face_yoga'
  | 'chewing_apples'
  | 'sleep_supine'
  | 'hydration_3L'
  | 'sodium_low'
  | 'floss'
  // ─── Looksmax · gated por tool en inventario ────────────
  // Solo se trackean visualmente cuando la tool asociada está
  // marcada como adquirida en `inventory.ts`. El tracker bruto
  // (markHabit/isHabitDone) sigue funcionando en localStorage,
  // pero la UI los oculta hasta que la tool exista.
  | 'tongue_scraper'
  | 'cinnamon_paste'
  | 'mouth_tape'
  | 'chewing_advanced'
  | 'spf_am'
  | 'vitc_am'
  | 'retinoid_pm'
  | 'exfoliation_weekly'
  | 'eye_drops_am'
  | 'brow_grooming_week'
  | 'derma_roller_week'
  | 'minoxidil_application'
  | 'finasteride_dose'
  | 'potassium_intake'
  | 'electrolyte_intake';

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
  // NUCLEUS contextuales (inyectados por nucleusAdapter)
  jaw_release_pre_arena:   { label: 'Liberación de mandíbula',     icon: '◌', track: 'day' },
  breath_478_recarga:      { label: 'Respiración 4-7-8',           icon: '◯', track: 'day' },
  light_exposure_extra:    { label: 'Luz solar extra',             icon: '☀', track: 'day' },
  extra_nsdr_monolito:     { label: 'NSDR extra · MONOLITO',       icon: '◐', track: 'day' },
  // ─── Looksmax · free-tier ──────────────────────────────
  mewing_check:            { label: 'Mewing · sonido G',           icon: '◈', track: 'morning' },
  jaw_release:             { label: 'Jaw release · lengua paladar', icon: '◌', track: 'morning' },
  chin_tuck:               { label: 'Chin tuck · postura cervical', icon: '⊥', track: 'morning' },
  face_yoga:               { label: 'Yoga facial · vocaleta/O',    icon: '◔', track: 'morning' },
  chewing_apples:          { label: 'Chewing · 2 manzanas verdes', icon: '◉', track: 'day' },
  sleep_supine:            { label: 'Dormí boca arriba',           icon: '☾', track: 'night' },
  hydration_3L:             { label: 'Hidratación · 3 L+',           icon: '◇', track: 'day' },
  sodium_low:              { label: 'Sodio bajo · de-bloat',        icon: '⊘', track: 'day' },
  floss:                   { label: 'Hilo dental nocturno',         icon: '✚', track: 'night' },
  // ─── Looksmax · gated por tool en inventario ───────────
  tongue_scraper:          { label: 'Raspado de lengua',            icon: '✦', track: 'both' },
  cinnamon_paste:          { label: 'Cepillado · canela',            icon: '✚', track: 'both' },
  mouth_tape:              { label: 'Mouth tape nocturno',           icon: '◉', track: 'night' },
  chewing_advanced:        { label: 'Chewing · jawliner',            icon: '◈', track: 'day' },
  spf_am:                  { label: 'SPF 30+ AM',                    icon: '☀', track: 'morning' },
  vitc_am:                 { label: 'Vitamina C AM',                 icon: '◔', track: 'morning' },
  retinoid_pm:             { label: 'Retinoide PM',                  icon: '◐', track: 'night' },
  exfoliation_weekly:      { label: 'Exfoliación BHA semanal',       icon: '◇', track: 'night' },
  eye_drops_am:            { label: 'Gotero ocular AM',              icon: '◯', track: 'morning' },
  brow_grooming_week:      { label: 'Cejas · navaja semanal',        icon: '✎', track: 'both' },
  derma_roller_week:       { label: 'Derma-roller semanal',          icon: '◍', track: 'night' },
  minoxidil_application:   { label: 'Minoxidil aplicado',            icon: '◐', track: 'both' },
  finasteride_dose:        { label: 'Finasterida dosis',             icon: '⊕', track: 'both' },
  potassium_intake:        { label: 'Potasio (suplemento)',          icon: '◇', track: 'day' },
  electrolyte_intake:      { label: 'Electrolitos',                  icon: '◇', track: 'day' },
};

// ─── Mapeo HabitId → ToolId requerida (para gating en UI) ───────
// Si un hábito requiere una tool, solo se muestra en dashboards
// cuando el usuario marcó esa tool en `inventory.ts`. El tracker
// bruto (markHabit) sigue funcionando aunque no esté la tool —
// esto solo controla visibilidad. Importado por consumidores que
// quieran filtrar (ej. Profile, Coach). Mantenido como string id
// (no ToolId) para evitar dependencia circular con `inventory.ts`.
export const HABIT_REQUIRES_TOOL: Partial<Record<HabitId, string>> = {
  tongue_scraper:        'tongue_scraper',
  cinnamon_paste:        'cinnamon_paste',
  mouth_tape:            'mouth_tape',
  chewing_advanced:      'jawliner',
  spf_am:                'spf_30',
  vitc_am:               'vitc_serum',
  retinoid_pm:           'retinoid_otc',
  exfoliation_weekly:    'salicylic_acid',
  eye_drops_am:          'eye_drops',
  brow_grooming_week:    'eyebrow_razor',
  derma_roller_week:     'derma_roller_05',
  minoxidil_application: 'minoxidil_5',
  finasteride_dose:      'finasteride',
  potassium_intake:      'liquid_potassium',
  electrolyte_intake:    'electrolyte_mix',
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
