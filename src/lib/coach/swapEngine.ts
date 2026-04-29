// ═══════════════════════════════════════════════════════════
// swapEngine.ts · selección dinámica dentro de `swapGroup`
//
// Modelo:
//   · Una rutina puede declarar varios pasos con el mismo
//     `swapGroup` (ej. `pm_moisturizer` con CeraVe Cream rico
//     y Ceramid Gel ligero).
//   · Este motor recibe la rutina ya filtrada por modo y
//     condiciones, y para cada `swapGroup` deja UN solo paso
//     según contexto (clima, skin-feel, conditions).
//   · El paso ganador conserva su `action`/`note` original; los
//     demás se eliminan de la lista para no confundir.
//   · Devuelve además un array de `SwapDecision[]` que el motor
//     usa para sumar líneas al `rationale` de hoy.
//
// Reglas (deterministas, sin red, sin estado nuevo):
//
//   am_moisturizer / pm_moisturizer:
//     · piel reactiva/tirante/seca o veryDry o cold-day → RICA
//       (cerave_am_spf30 · cerave_moisturizing_cream)
//     · piel oily o humedad alta o banda warm                → LIGERA
//       (ceramid_gel_siegfried)
//     · default → conserva la opción "rica" (más segura para
//       barrera atópica).
//
//   eye_care:
//     · si conditions incluye atopic_dermatitis → CeraVe Eye Repair
//       (ceramidas reconstructivas).
//     · default → Sensibio Eye (calmante).
// ═══════════════════════════════════════════════════════════

import type { Routine, RoutineStep } from './routines';
import type { ResolvedSignals, SkinFeel } from './signals';
import type { ClimateContext } from '../common/climateEC';
import type { ConditionId } from './conditions';

// ─── Context y resultado ────────────────────────────────────

export interface SwapCtx {
  signals: ResolvedSignals;
  climate: ClimateContext;
  conditions: ConditionId[];
  flareActive: boolean;
}

/** Decisión tomada para un swap-group. Útil para el rationale. */
export interface SwapDecision {
  swapGroup: string;
  pickedProductId: string;
  droppedProductIds: string[];
  reason: string;
}

// ─── Helpers de clasificación de skin-feel ──────────────────

const RICH_SKIN_FEEL: ReadonlySet<SkinFeel> = new Set<SkinFeel>([
  'tight',
  'flaky',
  'red',
  'itchy',
  'stinging',
]);
const LIGHT_SKIN_FEEL: ReadonlySet<SkinFeel> = new Set<SkinFeel>(['oily']);

// ─── Reglas por grupo ────────────────────────────────────────

type SwapRule = (
  candidates: Array<{ id: string; step: RoutineStep }>,
  ctx: SwapCtx,
) => { pickedId: string; reason: string } | null;

const RULES: Record<string, SwapRule> = {
  am_moisturizer: (candidates, ctx) => moisturizerRule(candidates, ctx, 'am'),
  pm_moisturizer: (candidates, ctx) => moisturizerRule(candidates, ctx, 'pm'),

  eye_care: (candidates, ctx) => {
    const hasAtopia = ctx.conditions.includes('atopic_dermatitis');
    const id = hasAtopia ? 'cerave_eye_repair' : 'bioderma_sensibio_eye';
    const exists = candidates.find((c) => c.id === id);
    if (!exists) return null;
    return {
      pickedId: id,
      reason: hasAtopia
        ? 'Contorno: prefiero CeraVe Eye Repair (ceramidas) por dermatitis atópica.'
        : 'Contorno: Sensibio Eye por defecto (calmante).',
    };
  },
};

function moisturizerRule(
  candidates: Array<{ id: string; step: RoutineStep }>,
  ctx: SwapCtx,
  slot: 'am' | 'pm',
): { pickedId: string; reason: string } | null {
  const RICH_AM = 'cerave_am_spf30';
  const RICH_PM = 'cerave_moisturizing_cream';
  const LIGHT = 'ceramid_gel_siegfried';
  const richId = slot === 'am' ? RICH_AM : RICH_PM;

  const richExists = candidates.some((c) => c.id === richId);
  const lightExists = candidates.some((c) => c.id === LIGHT);
  if (!richExists || !lightExists) return null; // datos incompletos: no swap

  // Score: positivo → rico, negativo → ligero, 0 → default rico.
  let score = 0;
  const reasons: string[] = [];

  if (RICH_SKIN_FEEL.has(ctx.signals.skinFeel)) {
    score += 2;
    reasons.push('piel ' + ctx.signals.skinFeel);
  }
  if (LIGHT_SKIN_FEEL.has(ctx.signals.skinFeel)) {
    score -= 2;
    reasons.push('piel ' + ctx.signals.skinFeel);
  }
  if (ctx.climate.veryDry) {
    score += 2;
    reasons.push('Ambato muy seco');
  } else if (ctx.climate.humidity === 'dry') {
    score += 1;
    reasons.push('clima seco');
  } else if (ctx.climate.humidity === 'humid') {
    score -= 1;
    reasons.push('clima húmedo');
  }
  if (ctx.climate.band === 'cold') {
    score += 1;
    reasons.push('banda fría');
  }
  if (ctx.climate.band === 'warm') {
    score -= 1;
    reasons.push('banda cálida');
  }
  if (ctx.flareActive) {
    score += 3;
    reasons.push('brote activo');
  }

  const picked = score >= 0 ? richId : LIGHT;
  const slotLabel = slot.toUpperCase();
  const variantLabel = picked === LIGHT ? 'ligera (Ceramid Gel)' : 'rica (CeraVe)';
  const reason = `${slotLabel}: variante ${variantLabel} · ${reasons.join(' + ') || 'default'}.`;
  return { pickedId: picked, reason };
}

// ─── Aplicador ──────────────────────────────────────────────

/**
 * Aplica los swaps a la rutina. Devuelve un nuevo `Routine`
 * con UN solo step por `swapGroup` y un array con las decisiones
 * tomadas (para el rationale).
 */
export function applySwaps(
  routine: Routine,
  ctx: SwapCtx,
): { routine: Routine; decisions: SwapDecision[] } {
  // Agrupar steps por swapGroup conservando orden original.
  const groups = new Map<string, Array<{ idx: number; step: RoutineStep }>>();
  routine.steps.forEach((step, idx) => {
    if (!step.swapGroup || !step.productId) return;
    const arr = groups.get(step.swapGroup) ?? [];
    arr.push({ idx, step });
    groups.set(step.swapGroup, arr);
  });

  // Si ningún grupo tiene 2+ candidatos, no hay nada que hacer.
  let hasWork = false;
  for (const arr of groups.values()) {
    if (arr.length >= 2) {
      hasWork = true;
      break;
    }
  }
  if (!hasWork) return { routine, decisions: [] };

  const drop = new Set<number>();
  const decisions: SwapDecision[] = [];

  for (const [group, members] of groups.entries()) {
    if (members.length < 2) continue;
    const rule = RULES[group];
    if (!rule) continue;
    const candidates = members.map((m) => ({
      id: m.step.productId as string,
      step: m.step,
    }));
    const result = rule(candidates, ctx);
    if (!result) continue;

    decisions.push({
      swapGroup: group,
      pickedProductId: result.pickedId,
      droppedProductIds: candidates
        .map((c) => c.id)
        .filter((id) => id !== result.pickedId),
      reason: result.reason,
    });

    // Marcar para drop todos los miembros excepto el ganador.
    for (const m of members) {
      if (m.step.productId !== result.pickedId) {
        drop.add(m.idx);
      }
    }
  }

  if (drop.size === 0) return { routine, decisions };

  const nextSteps = routine.steps
    .map((step, idx) =>
      drop.has(idx)
        ? null
        : // El ganador deja de ser "optional" porque ya es la
          // elección activa del día. Conservamos `action`/`note`.
          step.swapGroup
        ? { ...step, optional: false }
        : step,
    )
    .filter((s): s is RoutineStep => s !== null);

  return {
    routine: { ...routine, steps: nextSteps },
    decisions,
  };
}
