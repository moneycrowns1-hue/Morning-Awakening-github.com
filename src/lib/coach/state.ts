// ═══════════════════════════════════════════════════════════
// state.ts · capa de persistencia del coach (localStorage)
//
// Sigue las convenciones del proyecto: keys prefijadas con
// `ma-`, mapas por-id × por-fecha (YYYY-MM-DD), funciones puras
// load/save y null-safety en SSR (`typeof window === 'undefined'`).
//
// El motor (`coachEngine.ts`) es PURO — recibe un snapshot de
// estado completo (`CoachState`) sin tocar localStorage. Eso
// hace el engine testeable y permite re-render reactivo en UI.
// ═══════════════════════════════════════════════════════════

import { DEFAULT_FLARE_STATE, type FlareState } from './flareProtocol';
import type { ConditionId } from './conditions';
import { USER_CONDITIONS } from './conditions';
import type { BrushingSlot } from './brushing';
import type { CriticalHabitId } from './criticalHabits';
import type { DailyCheckIn, SkinFeel, Sleep, Stress } from './signals';
import type { ManualSubRoutine, SubRoutineId } from './subRoutines';

// Re-export the check-in types so consumers can keep importing
// from `state.ts` (single barrel for coach persistence).
export type { DailyCheckIn, SkinFeel, Sleep, Stress };
export type { ManualSubRoutine, SubRoutineId };

// ───────────────────────────────────────────────────────────
// Storage keys
// ───────────────────────────────────────────────────────────

const KEYS = {
  flare: 'ma-coach-flare',
  derivaC: 'ma-coach-deriva-c',
  oral: 'ma-coach-oral',
  oralSchedule: 'ma-coach-oral-schedule',
  brushing: 'ma-coach-brushing',
  water: 'ma-coach-water',
  conditions: 'ma-coach-conditions',
  bruxism: 'ma-coach-bruxism',
  todos: 'ma-coach-todos',
  checkIn: 'ma-coach-checkin',
  tipsSeen: 'ma-coach-tips-seen',
  manualSubRoutines: 'ma-coach-manual-sub',
} as const;

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

export function todayISO(at: Date = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota or serialization error */ }
}

// ───────────────────────────────────────────────────────────
// Schemas
// ───────────────────────────────────────────────────────────

/** Tratamiento de acné con Deriva-C en curso. */
export interface DerivaCState {
  active: boolean;
  startedAt: string | null;       // ISO date
  /** Día previsto de fin de curso (auto-calculado al iniciar). */
  plannedEndAt: string | null;
}

/** Una toma de pastilla / suplemento. */
export interface OralEntry {
  takenAtISO: string;             // ISO datetime
}

/** Por producto → fecha YYYY-MM-DD → array de tomas en ese día. */
export type OralLog = Record<string, Record<string, OralEntry[]>>;

/** Configuración de un horario diario para una pastilla.
 *  Si `daysOfWeek` está ausente, aplica todos los días (0=domingo, 6=sáb). */
export interface OralScheduleEntry {
  hour: number;     // 0–23
  minute: number;   // 0–59
  daysOfWeek?: number[];
}

/** productId → entrada de horario. Una sola toma diaria por producto
 *  por simplicidad; si en el futuro hace falta multi-toma, esto puede
 *  pasar a `Record<productId, OralScheduleEntry[]>`. */
export type OralSchedule = Record<string, OralScheduleEntry>;

/** Por fecha → slot → ISO datetime de cuándo se cepilló. */
export type BrushingLog = Record<string, Partial<Record<BrushingSlot, string>>>;

/** Por fecha → ml acumulados. */
export type WaterLog = Record<string, number>;

/** Por hábito crítico → fecha → true. */
export type CriticalHabitLog = Record<CriticalHabitId, Record<string, boolean>>;

/** Por fecha → registro de bruxismo. */
export interface BruxismDayEntry {
  amExercise?: boolean;
  pmExercise?: boolean;
  /** 0-10, dolor mandibular al despertar. */
  painLevel?: number;
  /** Notas libres. */
  note?: string;
}
export type BruxismLog = Record<string, BruxismDayEntry>;

/** Pendiente ad-hoc del usuario. */
export interface Todo {
  id: string;
  text: string;
  createdAt: string;
  doneAt?: string;
}

/** Snapshot completo que el engine consume. */
export interface CoachState {
  flare: FlareState;
  derivaC: DerivaCState;
  oral: OralLog;
  oralSchedule: OralSchedule;
  brushing: BrushingLog;
  water: WaterLog;
  conditions: ConditionId[];
  bruxism: BruxismLog;
  todos: Todo[];
  /**
   * Check-in opcional del día actual (1-tap chips). Si no hay
   * entrada para hoy, el motor aplica defaults silenciosos.
   * `null` cuando el usuario aún no marcó nada hoy.
   */
  signals: DailyCheckIn | null;
  /**
   * Histórico de tips mostrados (más recientes primero), usado
   * para anti-repetición. Se trunca a un buffer chico.
   */
  tipsSeen: TipSeenEntry[];
  /**
   * Sub-rutinas activadas manualmente por el usuario y aún
   * vigentes (TTL). Se limpian al cargar.
   */
  manualSubRoutines: ManualSubRoutine[];
}

/** Una entrada del historial de tips: id + fecha en que se mostró. */
export interface TipSeenEntry {
  id: string;
  shownAtISO: string;
}

// ───────────────────────────────────────────────────────────
// Defaults
// ───────────────────────────────────────────────────────────

const DEFAULT_DERIVA_C: DerivaCState = { active: false, startedAt: null, plannedEndAt: null };

// ───────────────────────────────────────────────────────────
// Loaders
// ───────────────────────────────────────────────────────────

export function loadFlare(): FlareState {
  return read(KEYS.flare, DEFAULT_FLARE_STATE);
}

export function loadDerivaC(): DerivaCState {
  return read(KEYS.derivaC, DEFAULT_DERIVA_C);
}

export function loadOralLog(): OralLog {
  return read(KEYS.oral, {});
}

export function loadOralSchedule(): OralSchedule {
  return read(KEYS.oralSchedule, {});
}

export function loadBrushingLog(): BrushingLog {
  return read(KEYS.brushing, {});
}

export function loadWaterLog(): WaterLog {
  return read(KEYS.water, {});
}

export function loadConditions(): ConditionId[] {
  return read(KEYS.conditions, USER_CONDITIONS);
}

export function loadBruxismLog(): BruxismLog {
  return read(KEYS.bruxism, {});
}

export function loadTodos(): Todo[] {
  return read(KEYS.todos, []);
}

/**
 * Carga el check-in del día indicado (default: hoy). Devuelve `null`
 * si no hay entrada o si la guardada es de un día previo (los
 * check-ins son por-día, no se acumulan).
 */
export function loadCheckIn(at: Date = new Date()): DailyCheckIn | null {
  const stored = read<DailyCheckIn | null>(KEYS.checkIn, null);
  if (!stored) return null;
  const expected = todayISO(at);
  if (stored.dateISO !== expected) return null;
  return stored;
}

/** Histórico de tips vistos (más recientes primero). */
export function loadTipsSeen(): TipSeenEntry[] {
  const arr = read<TipSeenEntry[]>(KEYS.tipsSeen, []);
  return Array.isArray(arr) ? arr : [];
}

/** Sub-rutinas manuales aún vigentes (filtra TTL al cargar). */
export function loadManualSubRoutines(at: Date = new Date()): ManualSubRoutine[] {
  const arr = read<ManualSubRoutine[]>(KEYS.manualSubRoutines, []);
  if (!Array.isArray(arr)) return [];
  const now = at.getTime();
  return arr.filter((m) => {
    const start = new Date(m.activatedAtISO).getTime();
    if (Number.isNaN(start)) return false;
    return now <= start + m.ttlH * 60 * 60 * 1000;
  });
}

/** Snapshot completo del estado para alimentar el engine. */
export function loadCoachState(): CoachState {
  return {
    flare: loadFlare(),
    derivaC: loadDerivaC(),
    oral: loadOralLog(),
    oralSchedule: loadOralSchedule(),
    brushing: loadBrushingLog(),
    water: loadWaterLog(),
    conditions: loadConditions(),
    bruxism: loadBruxismLog(),
    todos: loadTodos(),
    signals: loadCheckIn(),
    tipsSeen: loadTipsSeen(),
    manualSubRoutines: loadManualSubRoutines(),
  };
}

// ───────────────────────────────────────────────────────────
// Mutators (escritores específicos · usados desde la UI)
// ───────────────────────────────────────────────────────────

export function saveFlare(state: FlareState): void {
  write(KEYS.flare, state);
}

export function saveDerivaC(state: DerivaCState): void {
  write(KEYS.derivaC, state);
}

export function saveConditions(ids: ConditionId[]): void {
  write(KEYS.conditions, ids);
}

/** Programa o actualiza el horario diario de una pastilla. */
export function setOralScheduleEntry(productId: string, entry: OralScheduleEntry): void {
  const sched = loadOralSchedule();
  sched[productId] = entry;
  write(KEYS.oralSchedule, sched);
}

/** Quita el horario de una pastilla. */
export function clearOralScheduleEntry(productId: string): void {
  const sched = loadOralSchedule();
  delete sched[productId];
  write(KEYS.oralSchedule, sched);
}

/** Registra una toma de un producto oral en la fecha indicada. */
export function logOralTake(productId: string, at: Date = new Date()): void {
  const log = loadOralLog();
  const date = todayISO(at);
  const product = log[productId] ?? {};
  const entries = product[date] ?? [];
  entries.push({ takenAtISO: at.toISOString() });
  product[date] = entries;
  log[productId] = product;
  write(KEYS.oral, log);
}

/** Marca un slot de cepillado como hecho. */
export function logBrushing(slot: BrushingSlot, at: Date = new Date()): void {
  const log = loadBrushingLog();
  const date = todayISO(at);
  const day = log[date] ?? {};
  day[slot] = at.toISOString();
  log[date] = day;
  write(KEYS.brushing, log);
}

/** Suma ml de agua al día. */
export function addWater(ml: number, at: Date = new Date()): void {
  const log = loadWaterLog();
  const date = todayISO(at);
  log[date] = (log[date] ?? 0) + ml;
  write(KEYS.water, log);
}

/** Registra evento de bruxismo. */
export function logBruxism(entry: Partial<BruxismDayEntry>, at: Date = new Date()): void {
  const log = loadBruxismLog();
  const date = todayISO(at);
  log[date] = { ...(log[date] ?? {}), ...entry };
  write(KEYS.bruxism, log);
}

export function saveTodos(todos: Todo[]): void {
  write(KEYS.todos, todos);
}

/**
 * Actualiza parcialmente el check-in de hoy (merge con lo previo
 * si la entrada es del mismo día, o crea uno nuevo si no). Cada
 * tap de chip llama esto con un solo eje, sin botón "guardar".
 */
export function updateCheckIn(
  patch: Partial<Pick<DailyCheckIn, 'skinFeel' | 'sleep' | 'stress'>>,
  at: Date = new Date(),
): DailyCheckIn {
  const date = todayISO(at);
  const current = loadCheckIn(at);
  const next: DailyCheckIn = {
    ...(current ?? { dateISO: date }),
    dateISO: date,
    ...patch,
    submittedAt: at.toISOString(),
  };
  write(KEYS.checkIn, next);
  return next;
}

/** Borra el check-in de hoy (si lo hubiera). */
export function clearCheckIn(): void {
  write<DailyCheckIn | null>(KEYS.checkIn, null);
}

/**
 * Marca un tip como visto hoy. Trunca el historial para evitar
 * crecer indefinidamente.
 */
export function markTipSeen(
  id: string,
  at: Date = new Date(),
  maxEntries: number = 60,
): void {
  const seen = loadTipsSeen();
  if (seen[0]?.id === id) return; // ya marcado en la sesión actual
  const next = [{ id, shownAtISO: at.toISOString() }, ...seen].slice(0, maxEntries);
  write(KEYS.tipsSeen, next);
}

/** Activa manualmente una sub-rutina con su TTL en horas. */
export function activateManualSubRoutine(
  id: SubRoutineId,
  ttlH: number,
  at: Date = new Date(),
): void {
  const current = loadManualSubRoutines(at).filter((m) => m.id !== id);
  current.push({ id, activatedAtISO: at.toISOString(), ttlH });
  write(KEYS.manualSubRoutines, current);
}

/** Desactiva manualmente una sub-rutina (toggle off). */
export function deactivateManualSubRoutine(
  id: SubRoutineId,
  at: Date = new Date(),
): void {
  const current = loadManualSubRoutines(at).filter((m) => m.id !== id);
  write(KEYS.manualSubRoutines, current);
}

// ───────────────────────────────────────────────────────────
// Queries derivadas (puras sobre el estado)
// ───────────────────────────────────────────────────────────

/** Cuántas veces se tomó un producto en una fecha (default: hoy). */
export function oralTakenCount(log: OralLog, productId: string, dateISO: string): number {
  return log[productId]?.[dateISO]?.length ?? 0;
}

/** Última toma ISO de un producto, o `null`. */
export function lastOralTake(log: OralLog, productId: string): string | null {
  const series = log[productId];
  if (!series) return null;
  const dates = Object.keys(series).sort().reverse();
  for (const d of dates) {
    const entries = series[d];
    if (entries.length > 0) {
      return entries[entries.length - 1].takenAtISO;
    }
  }
  return null;
}

/** Slots de cepillado realizados hoy. */
export function brushingDoneToday(log: BrushingLog, dateISO: string): BrushingSlot[] {
  const day = log[dateISO] ?? {};
  return Object.keys(day) as BrushingSlot[];
}
