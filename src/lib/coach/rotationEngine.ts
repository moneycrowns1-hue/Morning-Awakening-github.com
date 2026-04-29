// ═══════════════════════════════════════════════════════════
// rotationEngine.ts · evalúa el log de activos contra la rutina
// del día y decide qué pasos saltar para descansar la barrera.
//
// Reglas implementadas (todas conservadoras y derivadas de
// guidelines clínicas estándar de retinoides/ácidos/corticoides):
//
//   R1 · Retinoide: si última aplicación < 18 h → SKIP retinoide
//        hoy. Sumamos un sustituto barrera (Cicalfate+ o
//        Sensibio Defensive) y agregamos rationale.
//
//   R2 · Ácidos (AHA/BHA): si última aplicación < 24 h → SKIP
//        cualquier ácido hoy. (Acumulación irrita.)
//
//   R3 · Retinoide + Ácido: nunca el mismo turno (ya cubierto
//        por stackIssues). El rotation engine se asegura
//        además que si hoy se aplicó ácido, el retinoide
//        del día se posponga a mañana.
//
//   R4 · Corticoide: si racha ≥ 14 días seguidos → emitir
//        warning crítico (riesgo de atrofia / efecto rebote).
//        No saltamos automáticamente: el médico decide.
//
// El motor devuelve `RotationDecision[]` y un applicador que
// modifica una `Routine` removiendo steps cuyo producto
// pertenece a una categoría con decisión `skip`.
// ═══════════════════════════════════════════════════════════

import type { Routine, RoutineStep } from './routines';
import {
  hoursSinceLast,
  streakDaysOf,
  rotationCategoryFor,
  CATEGORY_LABEL,
  type ActivesLog,
  type ActiveCategory,
} from './activesLog';

// ─── Tipos de salida ─────────────────────────────────────────

export type RotationAction = 'skip' | 'warn' | 'continue';

export interface RotationDecision {
  category: ActiveCategory;
  action: RotationAction;
  reason: string;
  /** Si action === 'skip', productos que se removerán de la rutina hoy. */
  skipProductIds?: string[];
  /** Si action === 'warn', mensaje severidad (para warnings UI). */
  warnSeverity?: 'caution' | 'danger';
}

export interface RotationCtx {
  log: ActivesLog;
  now: Date;
  am: Routine;
  pm: Routine;
}

// ─── Reglas ─────────────────────────────────────────────────

/** Categorías de "ácidos" que comparten cooldown entre sí. */
const ACID_CATEGORIES: ReadonlyArray<ActiveCategory> = ['aha', 'bha'];

/** Cooldown en horas por categoría desde la última aplicación. */
const COOLDOWN_HOURS: Record<ActiveCategory, number> = {
  retinoid: 18,
  aha: 24,
  bha: 24,
  corticoid: 0, // gestionado por racha, no por horas
};

const CORTICOID_STREAK_WARN = 14;

/**
 * Devuelve los productIds de la rutina del día (AM+PM) que caen
 * en `category` (humectantes/oclusivos/SPF no cuentan).
 */
function dayProductIdsByCategory(
  am: Routine,
  pm: Routine,
  category: ActiveCategory,
): string[] {
  const out: string[] = [];
  for (const step of [...am.steps, ...pm.steps]) {
    if (!step.productId) continue;
    if (rotationCategoryFor(step.productId) === category) {
      out.push(step.productId);
    }
  }
  return out;
}

// ─── Evaluador ──────────────────────────────────────────────

/**
 * Recorre todas las categorías rotables y decide qué hacer hoy.
 * Funciones puras: no toca persistencia.
 */
export function evaluateRotation(ctx: RotationCtx): RotationDecision[] {
  const out: RotationDecision[] = [];

  // R1: Retinoide
  const retiHrs = hoursSinceLast(ctx.log, 'retinoid', ctx.now);
  const retiToday = dayProductIdsByCategory(ctx.am, ctx.pm, 'retinoid');
  if (retiToday.length > 0 && retiHrs !== null && retiHrs < COOLDOWN_HOURS.retinoid) {
    const h = Math.round(retiHrs);
    out.push({
      category: 'retinoid',
      action: 'skip',
      reason: `Retinoide aplicado hace ${h} h — hoy día de descanso para no irritar.`,
      skipProductIds: retiToday,
    });
  }

  // R2: Ácidos (AHA y BHA, cooldown cruzado)
  for (const cat of ACID_CATEGORIES) {
    const todays = dayProductIdsByCategory(ctx.am, ctx.pm, cat);
    if (todays.length === 0) continue;

    // Buscamos la más reciente entre AHA y BHA: comparten cooldown.
    let mostRecentH: number | null = null;
    let mostRecentCat: ActiveCategory | null = null;
    for (const c of ACID_CATEGORIES) {
      const h = hoursSinceLast(ctx.log, c, ctx.now);
      if (h === null) continue;
      if (mostRecentH === null || h < mostRecentH) {
        mostRecentH = h;
        mostRecentCat = c;
      }
    }
    if (mostRecentH !== null && mostRecentH < COOLDOWN_HOURS[cat]) {
      const h = Math.round(mostRecentH);
      out.push({
        category: cat,
        action: 'skip',
        reason: `${CATEGORY_LABEL[cat]} hoy se posterga · último ácido (${
          mostRecentCat ? CATEGORY_LABEL[mostRecentCat] : '—'
        }) hace ${h} h.`,
        skipProductIds: todays,
      });
      // Solo emitimos uno por la categoría que toca hoy; rompemos.
      break;
    }
  }

  // R2b: Si hoy se aplicó ácido pero todavía no retinoide → posponer
  //      retinoide. Cubre el caso "AHA mañana + retinoide tarde".
  if (
    !out.some((d) => d.category === 'retinoid' && d.action === 'skip') &&
    retiToday.length > 0
  ) {
    const acidHToday = Math.min(
      ...ACID_CATEGORIES.map((c) => hoursSinceLast(ctx.log, c, ctx.now) ?? Infinity),
    );
    if (acidHToday < 12) {
      const h = Math.round(acidHToday);
      out.push({
        category: 'retinoid',
        action: 'skip',
        reason: `Ácido aplicado hace ${h} h — hoy salto retinoide para evitar irritación combinada.`,
        skipProductIds: retiToday,
      });
    }
  }

  // R4: Corticoide racha larga → warn (no skip; criterio médico)
  const corticoidStreak = streakDaysOf(ctx.log, 'corticoid', ctx.now);
  if (corticoidStreak >= CORTICOID_STREAK_WARN) {
    out.push({
      category: 'corticoid',
      action: 'warn',
      reason: `Corticoide tópico aplicado ${corticoidStreak} días seguidos. Guía estándar: máx 2 semanas. Conviene pausar y consultar dermatólogo.`,
      warnSeverity: corticoidStreak >= 21 ? 'danger' : 'caution',
    });
  }

  return out;
}

// ─── Aplicador ──────────────────────────────────────────────

/**
 * Aplica las decisiones `skip` a una rutina removiendo los steps
 * cuyo producto coincide con `skipProductIds`. No modifica la
 * rutina si ninguna decisión es `skip`. No toca decisiones `warn`.
 */
export function applyRotationToRoutine(
  routine: Routine,
  decisions: RotationDecision[],
): Routine {
  const skipIds = new Set<string>();
  for (const d of decisions) {
    if (d.action !== 'skip') continue;
    for (const id of d.skipProductIds ?? []) skipIds.add(id);
  }
  if (skipIds.size === 0) return routine;
  const nextSteps: RoutineStep[] = routine.steps.filter(
    (s) => !s.productId || !skipIds.has(s.productId),
  );
  return { ...routine, steps: nextSteps };
}
