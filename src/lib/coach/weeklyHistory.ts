// ═══════════════════════════════════════════════════════════
// weeklyHistory.ts · agregador puro para la vista semanal
//
// Toma el snapshot completo del CoachState y produce un
// resumen de los últimos 7 días: hábitos clave (cepillado,
// agua, oral), aplicaciones de activos rotables, sub-rutinas
// que se dismisaron y tips vistos.
//
// Función pura: la UI la consume tal cual, sin tocar window.
// ═══════════════════════════════════════════════════════════

import type { CoachState } from './state';
import { todayISO, brushingDoneToday } from './state';
import type { ActiveCategory } from './activesLog';
import { CATEGORY_LABEL } from './activesLog';
import type { SubRoutineId } from './subRoutines';
import { SUB_ROUTINE_BY_ID } from './subRoutines';

// ─── Tipos ──────────────────────────────────────────────────

export interface WeeklyDay {
  /** YYYY-MM-DD local. */
  dateISO: string;
  /** Día de la semana abreviado (lun, mar, mié…). */
  weekdayShort: string;
  /** ¿Es hoy? */
  isToday: boolean;

  // ── Hábitos ──
  /** Slots cepillados ese día. 0–3 esperado. */
  brushSlots: number;
  /** ml de agua acumulados ese día. */
  waterMl: number;
  /** ¿Hubo al menos una toma oral programada ese día? */
  oralAnyTake: boolean;

  // ── Activos rotables ──
  /** Categorías aplicadas ese día (puede haber más de una). */
  activesApplied: ActiveCategory[];

  // ── Sub-rutinas dismissed ──
  /** IDs descartadas ese día. */
  dismissedSubRoutines: SubRoutineId[];
}

export interface WeeklyTipSummary {
  id: string;
  /** Cuántos días distintos en la ventana se mostró. */
  count: number;
}

export interface WeeklySubRoutineSummary {
  id: SubRoutineId;
  label: string;
  /** Veces que el usuario la descartó en la ventana. */
  dismissCount: number;
  /** Penalty actual (0–1) según dismissalLog. */
  penalty: number;
}

export interface WeeklyHistory {
  /** Días en orden cronológico ascendente: [hace 6 días, …, hoy]. */
  days: WeeklyDay[];
  /** Categorías rotables más recientes y su última aplicación. */
  rotationStreaks: Array<{
    category: ActiveCategory;
    label: string;
    /** Días seguidos consecutivos al final de la ventana. */
    consecutiveDays: number;
    /** Última aplicación ISO o null. */
    lastAppliedISO: string | null;
  }>;
  /** Tips más vistos en la ventana (top 5). */
  topTips: WeeklyTipSummary[];
  /** Sub-rutinas con más dismissals en la ventana. */
  noisyAutoSubRoutines: WeeklySubRoutineSummary[];
  /** Total de aplicaciones de cada categoría en los 7 días. */
  totalsByCategory: Record<ActiveCategory, number>;
}

// ─── Helpers ────────────────────────────────────────────────

const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function dateNDaysAgo(now: Date, n: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Builder ────────────────────────────────────────────────

/**
 * Construye un resumen de los últimos 7 días (hoy incluido) a
 * partir del CoachState. No toca disco; solo lee del snapshot.
 */
export function buildWeeklyHistory(
  state: CoachState,
  now: Date = new Date(),
): WeeklyHistory {
  const todayLocal = todayISO(now);

  // Pre-índices para lookup O(1) por fecha.
  const activesByDate = new Map<string, ActiveCategory[]>();
  for (const app of state.activesLog) {
    const d = new Date(app.appliedAtISO);
    if (Number.isNaN(d.getTime())) continue;
    const key = todayISO(d);
    const arr = activesByDate.get(key) ?? [];
    arr.push(app.category);
    activesByDate.set(key, arr);
  }

  const dismissalsByDate = new Map<string, SubRoutineId[]>();
  for (const e of state.dismissals) {
    const arr = dismissalsByDate.get(e.dateISO) ?? [];
    arr.push(e.id);
    dismissalsByDate.set(e.dateISO, arr);
  }

  const oralAnyTakeByDate = new Map<string, boolean>();
  for (const productId of Object.keys(state.oral)) {
    const series = state.oral[productId];
    for (const dateKey of Object.keys(series)) {
      if ((series[dateKey]?.length ?? 0) > 0) {
        oralAnyTakeByDate.set(dateKey, true);
      }
    }
  }

  // Construye los 7 días, del más antiguo al más reciente.
  const days: WeeklyDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dateNDaysAgo(now, i);
    const dateISO = todayISO(d);
    const slots = brushingDoneToday(state.brushing, dateISO).length;
    days.push({
      dateISO,
      weekdayShort: WEEKDAY_SHORT[d.getDay()],
      isToday: dateISO === todayLocal,
      brushSlots: slots,
      waterMl: state.water[dateISO] ?? 0,
      oralAnyTake: oralAnyTakeByDate.get(dateISO) === true,
      activesApplied: activesByDate.get(dateISO) ?? [],
      dismissedSubRoutines: dismissalsByDate.get(dateISO) ?? [],
    });
  }

  // ── Streaks consecutivos por categoría (al final de la ventana) ──
  const allCats: ActiveCategory[] = ['retinoid', 'aha', 'bha', 'corticoid'];
  const rotationStreaks = allCats.map((category) => {
    let consecutive = 0;
    // Cuenta desde hoy hacia atrás.
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].activesApplied.includes(category)) consecutive++;
      else break;
    }
    const lastApp = state.activesLog.find((a) => a.category === category);
    return {
      category,
      label: CATEGORY_LABEL[category],
      consecutiveDays: consecutive,
      lastAppliedISO: lastApp?.appliedAtISO ?? null,
    };
  });

  // ── Tips top de la ventana ──
  const cutoff = dateNDaysAgo(now, 6).getTime();
  const tipCount = new Map<string, number>();
  for (const t of state.tipsSeen) {
    const ts = new Date(t.dateISO).getTime();
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    tipCount.set(t.id, (tipCount.get(t.id) ?? 0) + 1);
  }
  const topTips: WeeklyTipSummary[] = [...tipCount.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Sub-rutinas ruidosas (más dismissed) ──
  const dismissCount = new Map<SubRoutineId, number>();
  for (const e of state.dismissals) {
    const ts = new Date(e.dateISO).getTime();
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    dismissCount.set(e.id, (dismissCount.get(e.id) ?? 0) + 1);
  }
  const noisyAutoSubRoutines: WeeklySubRoutineSummary[] = [...dismissCount.entries()]
    .map(([id, n]) => ({
      id,
      label: SUB_ROUTINE_BY_ID[id]?.label ?? id,
      dismissCount: n,
      penalty: n <= 0 ? 0 : n <= 2 ? 0.4 : n <= 4 ? 0.7 : 1,
    }))
    .sort((a, b) => b.dismissCount - a.dismissCount)
    .slice(0, 5);

  // ── Totales por categoría ──
  const totalsByCategory: Record<ActiveCategory, number> = {
    retinoid: 0,
    aha: 0,
    bha: 0,
    corticoid: 0,
  };
  for (const day of days) {
    for (const c of day.activesApplied) totalsByCategory[c]++;
  }

  return {
    days,
    rotationStreaks,
    topTips,
    noisyAutoSubRoutines,
    totalsByCategory,
  };
}
