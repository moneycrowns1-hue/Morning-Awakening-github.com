// ═══════════════════════════════════════════════════════════
// coachEngine.ts · motor heurístico (puro)
//
// Recibe `now: Date` y `state: CoachState` y devuelve un
// `Briefing` con:
//
//   · `mode`       → modo de rutina activo
//                    (normal / acne_treatment / flare_strong /
//                     flare_mild / recovery)
//   · `routine`    → rutinas AM y PM ya FILTRADAS por:
//                       - condiciones activas (forbiddenIngredients)
//                       - protocolo de brote (FLARE_PAUSED_*)
//                       - placeholders ausentes
//   · `actions[]`  → acciones priorizadas para HOY,
//                    ordenadas por prioridad → urgencia.
//   · `status[]`   → tarjetas de estado (cepillado X/3, agua,
//                    rutina AM/PM, bruxismo).
//   · `warnings[]` → conflictos detectados (orales incompatibles
//                    tomados misma sesión, doble Vit E, etc.).
//
// Esta capa NO toca localStorage ni el DOM. Todo viene de
// `state.ts`. La UI (Fase 2) llama `buildBriefing(now, state)`
// y renderiza el resultado.
// ═══════════════════════════════════════════════════════════

import { TOPICALS, ORAL, type Product } from './catalog';
import { CONDITIONS, type ConditionId, forbiddenIngredientsFor } from './conditions';
import {
  ROUTINES,
  type Routine,
  type RoutineMode,
} from './routines';
import {
  modeForFlare,
  flareSteps,
  FLARE_PAUSED_PRODUCT_IDS,
  FLARE_FORBIDDEN_INGREDIENT_KEYWORDS,
  type FlareState,
  type FlareStep,
} from './flareProtocol';
import { CRITICAL_HABITS, type CriticalHabitId, type Priority, type Domain } from './criticalHabits';
import { CURRENT_PLAN, type BrushingSlot } from './brushing';
import {
  type CoachState,
  oralTakenCount,
  brushingDoneToday,
} from './state';
import {
  resolveSignals,
  isReactiveFeel,
  SKIN_FEEL_LABEL,
  SLEEP_LABEL,
  STRESS_LABEL,
  type DailyCheckIn,
  type ResolvedSignals,
} from './signals';
import { getDayContext, type DayContext } from '../common/dayProfile';
import { getClimateContext, type ClimateContext } from '../common/climateEC';

// ═══════════════════════════════════════════════════════════
// TIPOS DE SALIDA
// ═══════════════════════════════════════════════════════════

export type Urgency = 'overdue' | 'now' | 'today' | 'tonight' | 'anytime';

export type ActionKind =
  | 'flare_step'
  | 'skincare_routine'
  | 'brushing'
  | 'water'
  | 'bruxism'
  | 'breathing'
  | 'meditation'
  | 'oral_take'
  | 'todo';

export interface CoachAction {
  id: string;
  kind: ActionKind;
  title: string;
  reason: string;
  priority: Priority;
  urgency: Urgency;
  domain: Domain | 'skin';
  productIds?: string[];
  habitId?: CriticalHabitId;
  done?: boolean;
}

export interface StatusCard {
  id: string;
  label: string;
  value: string;
  /** 0..1 — para barras de progreso. */
  progress?: number;
  domain: Domain | 'skin';
}

export interface CoachWarning {
  id: string;
  severity: 'info' | 'caution' | 'danger';
  message: string;
  productIds?: string[];
}

/**
 * Resumen de las señales y el clima que el motor usó para construir
 * el briefing de hoy. La UI puede mostrarlo en una tira "ajustes
 * de hoy" para hacer explicable cada decisión.
 */
export interface BriefingSignals {
  /** Check-in crudo persistido (si lo hubo). */
  checkIn: DailyCheckIn | null;
  /** Versión resuelta con defaults aplicados. */
  resolved: ResolvedSignals;
  /** Contexto climático auto-derivado para Quito. */
  climate: ClimateContext;
  /**
   * Lista de motivos legibles. Cada item explica una decisión del
   * motor en una sola línea (ej. "+0.3 L de agua porque clima seco").
   */
  rationale: string[];
}

export interface Briefing {
  context: DayContext;
  mode: RoutineMode;
  modeReason: string;
  headline: string;
  routine: { am: Routine; pm: Routine };
  flareSteps: FlareStep[];
  actions: CoachAction[];
  status: StatusCard[];
  warnings: CoachWarning[];
  /** Capa de señales + clima utilizadas hoy (v9). */
  signals: BriefingSignals;
}

// ═══════════════════════════════════════════════════════════
// CONFIG INTERNA
// ═══════════════════════════════════════════════════════════

const WATER_TARGET_ML = 3000;

const PRIORITY_WEIGHT: Record<Priority, number> = { critical: 3, high: 2, medium: 1 };
const URGENCY_WEIGHT: Record<Urgency, number> = {
  overdue: 5, now: 4, today: 3, tonight: 2, anytime: 1,
};

// ═══════════════════════════════════════════════════════════
// FILTRADO DE RUTINAS (condiciones + brote)
// ═══════════════════════════════════════════════════════════

/**
 * Devuelve la rutina con pasos filtrados:
 *   · Quita placeholders sin productId.
 *   · Quita productos cuyo `keyIngredients` choca con
 *     `forbiddenIngredients` de las condiciones activas.
 *   · Quita productos que están en `FLARE_PAUSED_PRODUCT_IDS`
 *     cuando hay brote activo.
 */
function filterRoutine(
  routine: Routine,
  conditions: ConditionId[],
  flareActive: boolean,
): Routine {
  const forbidden = forbiddenIngredientsFor(conditions);
  const flareBanIngredients = flareActive
    ? new Set(FLARE_FORBIDDEN_INGREDIENT_KEYWORDS.map(k => k.toLowerCase()))
    : new Set<string>();

  const filtered = routine.steps.filter(step => {
    if (!step.productId) return true; // acción pura (ducha, etc.)
    const product = TOPICALS.find(p => p.id === step.productId);
    if (!product) return false; // referencia rota → omitir

    if (flareActive && FLARE_PAUSED_PRODUCT_IDS.includes(product.id)) return false;

    // chequear ingredientes prohibidos
    for (const active of product.actives) {
      const name = active.name.toLowerCase();
      for (const f of forbidden) {
        if (name.includes(f)) return false;
      }
      for (const f of flareBanIngredients) {
        if (name.includes(f)) return false;
      }
    }

    return true;
  });

  return { ...routine, steps: filtered };
}

// ═══════════════════════════════════════════════════════════
// VENTANAS HORARIAS
// ═══════════════════════════════════════════════════════════

interface TimeWindow { startH: number; endH: number; }

const WINDOWS: Record<'morning' | 'lunch' | 'snack' | 'evening' | 'night', TimeWindow> = {
  morning: { startH: 6, endH: 11 },
  lunch:   { startH: 12, endH: 15 },
  snack:   { startH: 16, endH: 18 },
  evening: { startH: 18, endH: 21 },
  night:   { startH: 21, endH: 24 },
};

function inWindow(now: Date, w: TimeWindow): boolean {
  const h = now.getHours();
  return h >= w.startH && h < w.endH;
}
function pastWindow(now: Date, w: TimeWindow): boolean {
  return now.getHours() >= w.endH;
}

// ═══════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE ACCIONES
// ═══════════════════════════════════════════════════════════

function buildFlareActions(steps: FlareStep[]): CoachAction[] {
  return steps.map((s, idx) => ({
    id: `flare_${idx}`,
    kind: 'flare_step',
    title: s.action,
    reason: s.rationale,
    priority: idx < 3 ? 'critical' : 'high',
    urgency: 'now',
    domain: 'skin',
    productIds: s.productIds,
  }));
}

function buildBrushingActions(state: CoachState, now: Date, dateISO: string): {
  actions: CoachAction[];
  done: number;
  target: number;
} {
  const plan = CURRENT_PLAN;
  const doneSlots = new Set(brushingDoneToday(state.brushing, dateISO));

  const slotWindow: Record<BrushingSlot, TimeWindow> = {
    after_breakfast: WINDOWS.morning,
    after_lunch: WINDOWS.lunch,
    after_snack: WINDOWS.snack,
    before_bed: WINDOWS.night,
  };
  const slotLabel: Record<BrushingSlot, string> = {
    after_breakfast: 'tras desayuno',
    after_lunch: 'tras almuerzo',
    after_snack: 'tras merienda',
    before_bed: 'antes de dormir',
  };

  const actions: CoachAction[] = [];
  for (const slot of plan.slots) {
    if (doneSlots.has(slot)) continue;
    const w = slotWindow[slot];
    let urgency: Urgency = 'today';
    if (inWindow(now, w)) urgency = 'now';
    else if (pastWindow(now, w)) urgency = 'overdue';

    actions.push({
      id: `brush_${slot}`,
      kind: 'brushing',
      title: `Cepillado ${slotLabel[slot]}`,
      reason: plan.notesPerSlot[slot] || '2 min · técnica de Bass.',
      priority: slot === 'before_bed' ? 'critical' : 'high',
      urgency,
      domain: 'oral',
    });
  }
  return { actions, done: doneSlots.size, target: plan.dailyTarget };
}

function buildWaterAction(
  state: CoachState,
  now: Date,
  dateISO: string,
  targetMl: number,
): {
  action: CoachAction | null;
  ml: number;
  targetMl: number;
} {
  const ml = state.water[dateISO] ?? 0;
  if (ml >= targetMl) return { action: null, ml, targetMl };

  const remaining = targetMl - ml;
  let urgency: Urgency = 'anytime';
  if (now.getHours() >= 18 && ml < targetMl * 0.7) urgency = 'overdue';
  else if (now.getHours() >= 14 && ml < targetMl * 0.5) urgency = 'today';

  return {
    action: {
      id: 'water_target',
      kind: 'water',
      title: `Beber agua · faltan ${(remaining / 1000).toFixed(1)} L`,
      reason: 'Hidratación sistémica refuerza barrera atópica y reduce salivación pobre del bruxismo nocturno.',
      priority: 'critical',
      urgency,
      domain: 'hydration',
      habitId: 'water_3l',
    },
    ml,
    targetMl,
  };
}

function buildBruxismActions(state: CoachState, now: Date, dateISO: string): CoachAction[] {
  if (!state.conditions.includes('bruxism')) return [];
  const entry = state.bruxism[dateISO] ?? {};
  const out: CoachAction[] = [];

  if (!entry.amExercise) {
    out.push({
      id: 'bruxism_am',
      kind: 'bruxism',
      title: 'Ejercicios de bruxismo · mañana',
      reason: 'Liberar masetero y temporal al despertar previene tensión acumulada.',
      priority: 'high',
      urgency: pastWindow(now, WINDOWS.morning) ? 'overdue' : 'now',
      domain: 'mind_body',
      habitId: 'bruxism_am',
    });
  }
  if (!entry.pmExercise) {
    out.push({
      id: 'bruxism_pm',
      kind: 'bruxism',
      title: 'Ejercicios de bruxismo · noche',
      reason: 'Bruxismo es predominantemente nocturno — separar conscientemente dientes antes de dormir reduce episodios.',
      priority: 'critical',
      urgency: now.getHours() >= 21 ? 'now' : 'tonight',
      domain: 'mind_body',
      habitId: 'bruxism_pm',
    });
  }
  return out;
}

function buildSkincareActions(now: Date, mode: RoutineMode, modeReason: string): CoachAction[] {
  const out: CoachAction[] = [];
  const h = now.getHours();
  if (h >= 6 && h < 12) {
    out.push({
      id: 'skincare_am',
      kind: 'skincare_routine',
      title: `Rutina AM · modo ${labelForMode(mode)}`,
      reason: modeReason,
      priority: mode.startsWith('flare') ? 'critical' : 'high',
      urgency: 'now',
      domain: 'skin',
    });
  }
  if (h >= 19 || h < 4) {
    out.push({
      id: 'skincare_pm',
      kind: 'skincare_routine',
      title: `Rutina PM · modo ${labelForMode(mode)}`,
      reason: modeReason,
      priority: mode.startsWith('flare') ? 'critical' : 'high',
      urgency: h >= 22 ? 'now' : 'tonight',
      domain: 'skin',
    });
  }
  return out;
}

function buildOralActions(state: CoachState, now: Date, dateISO: string): CoachAction[] {
  const out: CoachAction[] = [];

  // Loratadina: si brote activo y no tomada hoy → acción.
  if (state.flare.phase === 'active' && oralTakenCount(state.oral, 'loratadine_10', dateISO) === 0) {
    out.push({
      id: 'oral_loratadine_flare',
      kind: 'oral_take',
      title: 'Tomar loratadina 10 mg',
      reason: 'Brote activo · primer escalón antihistamínico para frenar el picor sistémico.',
      priority: 'critical',
      urgency: 'now',
      domain: 'skin',
      productIds: ['loratadine_10'],
    });
  }

  // Triptófano AML: si bruxismo activo y noche → recomendar
  if (state.conditions.includes('bruxism') && now.getHours() >= 20) {
    const taken = oralTakenCount(state.oral, 'tryptophan_mg_b6_lajusticia', dateISO);
    if (taken === 0) {
      out.push({
        id: 'oral_tryptophan_bedtime',
        kind: 'oral_take',
        title: 'Triptófano + Mg + B6 (Lajusticia)',
        reason: 'Magnesio relaja musculatura mandibular; triptófano facilita transición al sueño.',
        priority: 'medium',
        urgency: 'tonight',
        domain: 'mind_body',
        productIds: ['tryptophan_mg_b6_lajusticia'],
      });
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════════
// DETECCIÓN DE CONFLICTOS (warnings)
// ═══════════════════════════════════════════════════════════

function detectOralConflicts(state: CoachState, dateISO: string): CoachWarning[] {
  const warnings: CoachWarning[] = [];
  const takenToday: string[] = [];
  for (const product of ORAL) {
    if (oralTakenCount(state.oral, product.id, dateISO) > 0) {
      takenToday.push(product.id);
    }
  }
  for (const id of takenToday) {
    const product = ORAL.find(p => p.id === id);
    if (!product) continue;
    for (const conflictId of product.conflictsWith ?? []) {
      if (takenToday.includes(conflictId)) {
        const other = ORAL.find(p => p.id === conflictId);
        warnings.push({
          id: `conflict_${id}_${conflictId}`,
          severity: 'caution',
          message: `${product.name} y ${other?.name ?? conflictId} compiten por absorción — conviene separarlos ≥ 2 h.`,
          productIds: [id, conflictId],
        });
      }
    }
  }
  return warnings;
}

function detectStockWarnings(state: CoachState): CoachWarning[] {
  const warnings: CoachWarning[] = [];
  for (const oral of ORAL) {
    if (oral.stockRemaining !== undefined &&
        oral.lowStockThreshold !== undefined &&
        oral.stockRemaining <= oral.lowStockThreshold) {
      warnings.push({
        id: `low_stock_${oral.id}`,
        severity: 'info',
        message: `${oral.name}: quedan ${oral.stockRemaining} unidades — reponer pronto.`,
        productIds: [oral.id],
      });
    }
  }
  // Silenciar warning del propio state si no se usa stock todavía
  void state;
  return warnings;
}

// ═══════════════════════════════════════════════════════════
// STATUS CARDS
// ═══════════════════════════════════════════════════════════

function buildStatus(
  state: CoachState,
  dateISO: string,
  brushing: { done: number; target: number },
  waterMl: number,
  waterTargetMl: number = WATER_TARGET_ML,
): StatusCard[] {
  const cards: StatusCard[] = [
    {
      id: 'brushing',
      label: 'Cepillado',
      value: `${brushing.done}/${brushing.target}`,
      progress: brushing.done / brushing.target,
      domain: 'oral',
    },
    {
      id: 'water',
      label: 'Hidratación',
      value: `${(waterMl / 1000).toFixed(1)} / ${(waterTargetMl / 1000).toFixed(1)} L`,
      progress: Math.min(1, waterMl / waterTargetMl),
      domain: 'hydration',
    },
  ];

  if (state.conditions.includes('bruxism')) {
    const e = state.bruxism[dateISO] ?? {};
    const done = (e.amExercise ? 1 : 0) + (e.pmExercise ? 1 : 0);
    cards.push({
      id: 'bruxism',
      label: 'Bruxismo',
      value: `${done}/2 sesiones`,
      progress: done / 2,
      domain: 'mind_body',
    });
  }

  if (state.flare.phase !== 'resolved') {
    cards.push({
      id: 'flare',
      label: 'Brote activo',
      value: state.flare.severity === 'strong' ? 'Severo' : state.flare.phase === 'recovery' ? 'Recovery' : 'Leve',
      domain: 'skin',
    });
  }

  return cards;
}

// ═══════════════════════════════════════════════════════════
// HELPERS DE PRESENTACIÓN
// ═══════════════════════════════════════════════════════════

function labelForMode(mode: RoutineMode): string {
  switch (mode) {
    case 'normal': return 'Normal';
    case 'acne_treatment': return 'Tratamiento Deriva-C';
    case 'flare_strong': return 'Brote severo';
    case 'flare_mild': return 'Brote leve';
    case 'recovery': return 'Recovery';
  }
}

function buildModeReason(mode: RoutineMode, flare: FlareState, derivaC: boolean): string {
  switch (mode) {
    case 'flare_strong': return 'Brote severo activo — corticoide en zonas gruesas, tacroz en finas, sello rico, cero activos.';
    case 'flare_mild': return 'Brote leve activo — solo tacroz puntual + hidratación máxima.';
    case 'recovery': return 'Post-brote — barrera todavía hipersensible; reintroducir activos en 7-10 días.';
    case 'acne_treatment': return 'Deriva-C en curso — PM simplificada, SPF50+ obligatorio AM.';
    case 'normal':
      if (flare.severity || derivaC) return 'Rutina normal restaurada.';
      return 'Rutina normal — protocolo de mantenimiento.';
  }
}

function buildHeadline(mode: RoutineMode, ctx: DayContext, flare: FlareState): string {
  if (mode === 'flare_strong') return 'Hoy toca calmar el brote · prioridad rescate.';
  if (mode === 'flare_mild') return 'Brote leve · piel reactiva en vigilancia.';
  if (mode === 'recovery') return 'Recovery · reconstrucción de barrera.';
  if (mode === 'acne_treatment') return 'Tratamiento Deriva-C en curso · piel disciplinada.';
  if (ctx.profile === 'rest') return 'Día de descanso · solo lo crítico.';
  if (flare.phase === 'recovery') return 'Vuelve la calma · sigue cuidando barrera.';
  return 'Rutina normal · día estable.';
}

// ═══════════════════════════════════════════════════════════
// MODULACIÓN POR SEÑALES + CLIMA
// ═══════════════════════════════════════════════════════════

/**
 * Calcula el target de agua del día ajustado por clima/actividad.
 * Por defecto 3 L, sube hasta 3.3 L si la estación es seca y/o
 * el UV es alto en horas centrales.
 */
function effectiveWaterTarget(
  climate: ClimateContext,
  rationale: string[],
): number {
  let target = WATER_TARGET_ML;
  if (climate.humidity === 'dry') {
    target += 300;
    rationale.push('+0.3 L de agua porque la estación es seca en Quito.');
  }
  if (climate.uvLabel === 'high') {
    target += 200;
    rationale.push('+0.2 L de agua porque el UV está en franja alta ahora.');
  }
  return target;
}

/**
 * Sube de prioridad (medium → high → critical) si toca, sin pasar
 * de critical. No baja: la urgencia clínica del flare nunca cae.
 */
function bumpPriority(p: Priority): Priority {
  if (p === 'medium') return 'high';
  if (p === 'high') return 'critical';
  return 'critical';
}

/**
 * Pasa por todas las acciones y modula prioridades/urgencias según
 * skin-feel/sleep/stress. Reescribe `reason` con un sufijo legible
 * cuando aporta contexto. Va anotando en `rationale[]`.
 */
function modulateActionsBySignals(
  actions: CoachAction[],
  signals: ResolvedSignals,
  rationale: string[],
): CoachAction[] {
  const reactive = isReactiveFeel(signals.skinFeel);
  const sleepPoor = signals.sleep === 'poor';
  const stressHigh = signals.stress === 'high';

  if (reactive) {
    rationale.push(
      `Piel se siente ${SKIN_FEEL_LABEL[signals.skinFeel]} → priorizo calmantes y bajo activos.`,
    );
  }
  if (sleepPoor) {
    rationale.push(
      `Dormiste ${SLEEP_LABEL[signals.sleep]} → subo respiración y meditación al frente.`,
    );
  }
  if (stressHigh) {
    rationale.push(
      `Estrés ${STRESS_LABEL[signals.stress]} → bruxism y respiración pasan a crítico.`,
    );
  }

  return actions.map((a) => {
    let priority = a.priority;
    let urgency = a.urgency;
    let reason = a.reason;

    // Sleep poor: respiration & meditation suben prioridad.
    if (sleepPoor && a.habitId === 'breathing_morning') {
      priority = bumpPriority(priority);
    }
    if (sleepPoor && a.habitId === 'meditation_daily') {
      priority = bumpPriority(priority);
    }

    // Stress high: bruxism crítico siempre, y la respiración nocturna.
    if (stressHigh && (a.habitId === 'bruxism_am' || a.habitId === 'bruxism_pm')) {
      priority = 'critical';
    }
    if (stressHigh && a.habitId === 'breathing_night') {
      priority = bumpPriority(priority);
    }

    // Reactive skin: la rutina del día sube urgencia y se anota.
    if (reactive && a.kind === 'skincare_routine') {
      reason = `${reason} · piel reactiva hoy → mantén capas finas y sin activos.`;
    }

    return { ...a, priority, urgency, reason };
  });
}

/**
 * Inyecta acciones extra que el motor genera SOLO desde signals.
 * Se ejecuta antes del ordenamiento para que entren al ranking.
 */
function buildSignalActions(
  signals: ResolvedSignals,
  now: Date,
): CoachAction[] {
  const out: CoachAction[] = [];
  const h = now.getHours();

  if (signals.sleep === 'poor' && h >= 6 && h < 12) {
    out.push({
      id: 'signal_breathing_extra',
      kind: 'breathing',
      title: 'Respiración 5 min · reseteo',
      reason:
        'Dormiste mal: 5 min de respiración diafragmática bajan cortisol basal y reducen tensión mandibular.',
      priority: 'high',
      urgency: 'now',
      domain: 'mind_body',
      habitId: 'breathing_morning',
    });
  }

  if (signals.stress === 'high') {
    out.push({
      id: 'signal_breathing_4_7_8',
      kind: 'breathing',
      title: 'Respiración 4-7-8 · 3 ciclos',
      reason:
        'Estrés alto: la 4-7-8 baja activación simpática en minutos y descomprime mandíbula.',
      priority: h >= 20 ? 'critical' : 'high',
      urgency: h >= 20 ? 'tonight' : 'today',
      domain: 'mind_body',
      habitId: h >= 20 ? 'breathing_night' : 'breathing_morning',
    });
  }

  return out;
}

// ═══════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════

export function buildBriefing(now: Date, state: CoachState): Briefing {
  const ctx = getDayContext(now);
  const dateISO = ctx.dateISO;

  // 0. Señales + clima
  const checkIn = state.signals;
  const resolved = resolveSignals(checkIn);
  const climate = getClimateContext(now);
  const rationale: string[] = [];

  // 1. Modo activo (puede ser degradado a "calm" si la piel se siente reactiva)
  let mode = modeForFlare(state.flare, state.derivaC.active);
  let modeReason = buildModeReason(mode, state.flare, state.derivaC.active);
  const flareActive = state.flare.phase !== 'resolved';
  if (
    !flareActive &&
    isReactiveFeel(resolved.skinFeel) &&
    (mode === 'normal' || mode === 'acne_treatment')
  ) {
    // Piel reactiva sin brote diagnosticado: evitar activos hoy.
    mode = 'recovery';
    modeReason =
      'Hoy la piel se siente reactiva — degrado la rutina a recovery (sin activos) para no irritar más.';
    rationale.push(
      'Modo de rutina temporalmente en recovery por skin-feel reactiva.',
    );
  }

  // 2. Rutinas filtradas
  const am = filterRoutine(ROUTINES[`am_${mode}`], state.conditions, flareActive);
  const pm = filterRoutine(ROUTINES[`pm_${mode}`], state.conditions, flareActive);

  // 3. Targets dinámicos
  const waterTarget = effectiveWaterTarget(climate, rationale);

  // 4. Acciones base
  const actions: CoachAction[] = [];
  actions.push(...buildFlareActions(flareSteps(state.flare)));
  actions.push(...buildSkincareActions(now, mode, modeReason));
  const { actions: brushingActions, done: brushDone, target: brushTarget } =
    buildBrushingActions(state, now, dateISO);
  actions.push(...brushingActions);
  const { action: waterAction, ml: waterMl, targetMl } = buildWaterAction(
    state,
    now,
    dateISO,
    waterTarget,
  );
  if (waterAction) actions.push(waterAction);
  actions.push(...buildBruxismActions(state, now, dateISO));
  actions.push(...buildOralActions(state, now, dateISO));

  // 5. Acciones extra desde signals (respiración, meditación)
  actions.push(...buildSignalActions(resolved, now));

  // 6. Modulación de prioridades por signals
  const modulated = modulateActionsBySignals(actions, resolved, rationale);

  // 7. En día de descanso, oculta acciones medium si no hay brote.
  const filteredActions = ctx.profile === 'rest' && !flareActive
    ? modulated.filter((a) => a.priority !== 'medium')
    : modulated;

  // 8. Ordenamiento: prioridad → urgencia.
  filteredActions.sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pa !== 0) return -pa;
    return URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
  });

  // 9. Status + warnings
  const status = buildStatus(
    state,
    dateISO,
    { done: brushDone, target: brushTarget },
    waterMl,
    targetMl,
  );
  const warnings = [
    ...detectOralConflicts(state, dateISO),
    ...detectStockWarnings(state),
  ];

  return {
    context: ctx,
    mode,
    modeReason,
    headline: buildHeadline(mode, ctx, state.flare),
    routine: { am, pm },
    flareSteps: flareSteps(state.flare),
    actions: filteredActions,
    status,
    warnings,
    signals: {
      checkIn,
      resolved,
      climate,
      rationale,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS DE RECOMENDACIÓN PARA "PIEL SE SIENTE RARO"
// (utilities adicionales que la UI puede usar fuera del briefing)
// ═══════════════════════════════════════════════════════════

/**
 * Sugiere productos del catálogo que cumplen una FUNCIÓN dada
 * y son compatibles con el modo actual. Útil para una pantalla
 * "tengo la piel tirante" → sugerir humectantes + emolientes
 * compatibles.
 */
export function suggestByNeed(
  need: 'tightness' | 'flake' | 'redness' | 'oiliness' | 'sting',
  state: CoachState,
): Product[] {
  const flareActive = state.flare.phase !== 'resolved';
  const forbidden = forbiddenIngredientsFor(state.conditions);

  const wanted: Record<typeof need, string[]> = {
    tightness: ['humectant', 'emollient', 'occlusive', 'thermal_water'],
    flake:     ['barrier_lipid', 'occlusive', 'soothing'],
    redness:   ['soothing', 'thermal_water', 'active_calcineurin_inhibitor'],
    oiliness:  ['active_bha', 'humectant'],
    sting:     ['thermal_water', 'soothing', 'barrier_lipid'],
  };
  const targetFns = new Set(wanted[need]);

  return TOPICALS.filter(p => {
    if (p.placeholder) return false;
    if (flareActive && FLARE_PAUSED_PRODUCT_IDS.includes(p.id)) return false;

    // ingredientes prohibidos por condiciones
    for (const a of p.actives) {
      const n = a.name.toLowerCase();
      for (const f of forbidden) if (n.includes(f)) return false;
    }

    // ¿al menos una función coincide?
    return p.actives.some(a => targetFns.has(a.function));
  });
}

/**
 * Para un producto dado, devuelve otros productos del catálogo
 * que tengan el MISMO rol funcional principal — útil para
 * sugerir alternativas ("¿qué uso si se me acabó el CeraVe MC?").
 */
export function suggestAlternatives(productId: string): Product[] {
  const p = TOPICALS.find(x => x.id === productId);
  if (!p) return [];
  const fnSet = new Set(p.actives.map(a => a.function));
  return TOPICALS.filter(other =>
    other.id !== p.id &&
    other.category === p.category &&
    other.actives.some(a => fnSet.has(a.function)),
  );
}

// Re-export para que la UI no tenga que tocar `catalog.ts` directamente:
export type { OralProduct } from './catalog';

// Silenciar warnings de imports declarativos aún no consumidos por
// el motor pero referenciados como datos por la UI:
void CONDITIONS;
void CRITICAL_HABITS;
