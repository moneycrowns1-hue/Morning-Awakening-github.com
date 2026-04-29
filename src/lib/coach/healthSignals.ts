// ═══════════════════════════════════════════════════════════
// healthSignals.ts · derivación de señales coach desde Apple Health
//
// Toma un `HealthSnapshot` (sleep + fitness opcional) y lo
// resume en flags accionables que el motor del coach puede usar
// SIN tocar más bridges. Si el snapshot está ausente o stale,
// devuelve `freshness` apropiado y los flags vuelven a `null`
// para que el motor caiga a su comportamiento default (signals
// manuales del check-in).
// ═══════════════════════════════════════════════════════════

import type { HealthSnapshot } from '../common/healthkitBridge';
import type { Sleep } from './signals';

// ─── Umbrales clínicos ─────────────────────────────────────

const SLEEP_POOR_MIN = 6.5 * 60;  // < 6 h 30 min → poor
const SLEEP_GOOD_MIN = 7.5 * 60;  // > 7 h 30 min → good
/** Adolescente/joven adulto: 8 h objetivo, deuda > 2 h en 7d alerta. */
const SLEEP_DEBT_TARGET_MIN = 8 * 60;
const SLEEP_DEBT_ALERT_MIN = 120;
/** Bedtime "tarde" si la mediana > 23:30. */
const BEDTIME_LATE_HOUR = 23;
const BEDTIME_LATE_MIN = 30;

const STEPS_LOW = 3000;
const STEPS_HIGH = 10_000;
const EXERCISE_MIN_HIGH = 30;

const SLEEP_STALE_MS = 36 * 60 * 60 * 1000;   // 1.5 días
const FITNESS_STALE_MS = 6 * 60 * 60 * 1000;  // 6 h

// ─── Output types ──────────────────────────────────────────

export type Activity = 'low' | 'normal' | 'high';

export interface DerivedHealthSignals {
  /** ¿Hay snapshot fresco/stale/ausente? */
  freshness: 'fresh' | 'stale' | 'missing';
  /** ms desde el último export de Apple Health. */
  ageMs: number | null;

  /** Última noche reportada · poor/avg/good. `null` si no hay datos. */
  sleepLastNight: Sleep | null;
  /** Minutos exactos de la última noche (cuando hay dato). */
  sleepLastNightMin: number | null;
  /**
   * Deuda de sueño acumulada los últimos 7 días en minutos
   * (target 8 h/noche). Positivo = falta sueño.
   */
  sleepDebtMin: number;
  /** Mediana de bedtime > 23:30 → tendencia a dormir tarde. */
  bedtimeLate: boolean;

  /** Categoría de actividad del día. `null` si no hay fitness. */
  activityToday: Activity | null;
  stepsToday: number | null;
  exerciseMinToday: number | null;
  activeKcalToday: number | null;
}

const EMPTY: DerivedHealthSignals = {
  freshness: 'missing',
  ageMs: null,
  sleepLastNight: null,
  sleepLastNightMin: null,
  sleepDebtMin: 0,
  bedtimeLate: false,
  activityToday: null,
  stepsToday: null,
  exerciseMinToday: null,
  activeKcalToday: null,
};

// ─── Pure derivation ───────────────────────────────────────

function classifySleepMin(min: number): Sleep {
  if (min < SLEEP_POOR_MIN) return 'poor';
  if (min > SLEEP_GOOD_MIN) return 'good';
  return 'avg';
}

function classifyActivity(steps: number, exerciseMin: number): Activity {
  if (exerciseMin >= EXERCISE_MIN_HIGH || steps >= STEPS_HIGH) return 'high';
  if (steps < STEPS_LOW && exerciseMin === 0) return 'low';
  return 'normal';
}

/** "HH:MM" → true si la hora está después de 23:30. */
function isLateBedtime(hhmm: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return false;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 12) return false; // pre-mediodía → AM (no aplica)
  if (h > BEDTIME_LATE_HOUR) return true;
  return h === BEDTIME_LATE_HOUR && mm >= BEDTIME_LATE_MIN;
}

/**
 * Convierte un snapshot opcional en señales accionables.
 * Si `now - receivedAt` excede umbrales, marca freshness=stale
 * pero igual derivamos lo que se pueda (datos parciales).
 */
export function deriveHealthSignals(
  snapshot: HealthSnapshot | null,
  now: number = Date.now(),
): DerivedHealthSignals {
  if (!snapshot) return EMPTY;

  const age = now - snapshot.receivedAt;
  const sleepStale = age > SLEEP_STALE_MS;
  const fitnessStale = age > FITNESS_STALE_MS;
  const freshness = sleepStale && fitnessStale ? 'stale' : 'fresh';

  // ── Sleep block ──
  const lastMin = snapshot.nights[0]?.durationMin ?? null;
  const sleepLastNight = lastMin !== null ? classifySleepMin(lastMin) : null;

  const last7 = snapshot.nights.slice(0, 7);
  const debt = last7.reduce(
    (acc, n) => acc + Math.max(0, SLEEP_DEBT_TARGET_MIN - n.durationMin),
    0,
  );
  const bedtimeLate = isLateBedtime(snapshot.bedtimeMedian);

  // ── Fitness block (optional) ──
  let activityToday: Activity | null = null;
  let stepsToday: number | null = null;
  let exerciseMinToday: number | null = null;
  let activeKcalToday: number | null = null;
  if (snapshot.fitness && !fitnessStale) {
    const t = snapshot.fitness.today;
    stepsToday = t.steps;
    exerciseMinToday = t.exerciseMin;
    activeKcalToday = t.activeKcal;
    activityToday = classifyActivity(t.steps, t.exerciseMin);
  }

  return {
    freshness,
    ageMs: age,
    sleepLastNight: sleepStale ? null : sleepLastNight,
    sleepLastNightMin: sleepStale ? null : lastMin,
    sleepDebtMin: sleepStale ? 0 : debt,
    bedtimeLate: sleepStale ? false : bedtimeLate,
    activityToday,
    stepsToday,
    exerciseMinToday,
    activeKcalToday,
  };
}

/**
 * Útil para "rellenar" el check-in cuando el usuario aún no
 * marcó manualmente: si Apple Health dice que durmió mal/bien,
 * exponemos esa pista a la UI sin sobre-escribir lo manual.
 */
export function autofillSleepFromHealth(
  manualSleep: Sleep | undefined,
  derived: DerivedHealthSignals,
): Sleep | undefined {
  if (manualSleep) return manualSleep;
  return derived.sleepLastNight ?? undefined;
}

/** Indica si la deuda de sueño es elevada (>= 2 h en últimos 7d). */
export function hasSleepDebt(derived: DerivedHealthSignals): boolean {
  return derived.sleepDebtMin >= SLEEP_DEBT_ALERT_MIN;
}
