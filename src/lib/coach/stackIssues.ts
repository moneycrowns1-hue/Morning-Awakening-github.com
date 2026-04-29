// ═══════════════════════════════════════════════════════════
// stackIssues.ts · detección de inconsistencias en la rutina
//
// Inspecciona los `Routine.steps` (AM/PM) ya filtrados que se
// le mostrarán al usuario y detecta combinaciones problemáticas
// que el filtro por `cautionWith` específico no atrapa:
//
//   · Doble retinoide en el mismo turno
//   · Retinoide + ácido (AHA/BHA) en el mismo turno
//   · Doble corticoide tópico en el mismo día
//   · Humectante sin sello en clima seco
//   · Falta SPF en rutina AM cuando UV alto
//   · skipOnFlare presente con flare activo
//
// Cada hallazgo se emite como `CoachWarning` para mostrarse en
// la UI con su severidad correcta.
// ═══════════════════════════════════════════════════════════

import type { Routine } from './routines';
import {
  findTopical,
  type IngredientFunction,
  type Product,
} from './catalog';
import type { ClimateContext } from '../common/climateEC';

// El tipo CoachWarning está re-exportado desde coachEngine pero
// aquí lo declaramos de forma local para evitar una dependencia
// circular (engine importa este módulo).
export interface CoachWarning {
  id: string;
  severity: 'info' | 'caution' | 'danger';
  message: string;
}

// ─── Helpers ────────────────────────────────────────────────

function productsOf(routine: Routine): Product[] {
  const out: Product[] = [];
  for (const step of routine.steps) {
    if (!step.productId) continue;
    if (step.optional) continue; // solo los no opcionales cuentan
    const p = findTopical(step.productId);
    if (p) out.push(p);
  }
  return out;
}

function hasFunction(products: Product[], fn: IngredientFunction): boolean {
  return products.some((p) => p.actives.some((a) => a.function === fn));
}

function countFunction(products: Product[], fn: IngredientFunction): number {
  let n = 0;
  for (const p of products) {
    if (p.actives.some((a) => a.function === fn)) n++;
  }
  return n;
}

function namesWithFunction(products: Product[], fn: IngredientFunction): string[] {
  return products
    .filter((p) => p.actives.some((a) => a.function === fn))
    .map((p) => p.name);
}

// ─── Detector ───────────────────────────────────────────────

export interface StackIssuesCtx {
  am: Routine;
  pm: Routine;
  flareActive: boolean;
  climate: ClimateContext;
}

export function detectStackIssues(ctx: StackIssuesCtx): CoachWarning[] {
  const out: CoachWarning[] = [];
  const amProducts = productsOf(ctx.am);
  const pmProducts = productsOf(ctx.pm);
  const dayProducts = [...amProducts, ...pmProducts];

  // 1. Doble retinoide en mismo turno → irritación segura.
  if (countFunction(amProducts, 'active_retinoid') >= 2) {
    const names = namesWithFunction(amProducts, 'active_retinoid');
    out.push({
      id: 'stack_double_retinoid_am',
      severity: 'danger',
      message: `Doble retinoide en AM (${names.join(' + ')}) — riesgo alto de irritación. Deja uno solo.`,
    });
  }
  if (countFunction(pmProducts, 'active_retinoid') >= 2) {
    const names = namesWithFunction(pmProducts, 'active_retinoid');
    out.push({
      id: 'stack_double_retinoid_pm',
      severity: 'danger',
      message: `Doble retinoide en PM (${names.join(' + ')}) — riesgo alto de irritación.`,
    });
  }

  // 2. Retinoide + AHA/BHA mismo turno → irritación.
  for (const slot of ['am', 'pm'] as const) {
    const products = slot === 'am' ? amProducts : pmProducts;
    const hasRetinoid = hasFunction(products, 'active_retinoid');
    const hasBHA = hasFunction(products, 'active_bha');
    const hasAHA = hasFunction(products, 'active_aha');
    if (hasRetinoid && (hasBHA || hasAHA)) {
      out.push({
        id: `stack_retinoid_acid_${slot}`,
        severity: 'caution',
        message: `Retinoide + ${
          hasBHA ? 'BHA' : 'AHA'
        } en ${slot.toUpperCase()} mismo turno — alterna días para evitar irritación.`,
      });
    }
  }

  // 3. Doble corticoide en el día → atrofia/efecto rebote.
  if (countFunction(dayProducts, 'active_corticoid') >= 2) {
    out.push({
      id: 'stack_double_corticoid',
      severity: 'caution',
      message:
        'Dos corticoides tópicos hoy — aplícalos en zonas distintas y revisa duración total con dermatólogo.',
    });
  }

  // 4. Humectante sin sello en clima seco → contraproducente.
  if (ctx.climate.humidity === 'dry') {
    for (const slot of ['am', 'pm'] as const) {
      const products = slot === 'am' ? amProducts : pmProducts;
      const hasHumectant = hasFunction(products, 'humectant');
      const hasSeal =
        hasFunction(products, 'occlusive') ||
        hasFunction(products, 'emollient') ||
        hasFunction(products, 'barrier_lipid');
      if (hasHumectant && !hasSeal) {
        out.push({
          id: `stack_humectant_no_seal_${slot}`,
          severity: 'caution',
          message: `Humectante sin sello en ${slot.toUpperCase()} con clima seco — el agua atraída se evapora. Suma una capa oclusiva o emoliente.`,
        });
      }
    }
  }

  // 5. Falta SPF en rutina AM con UV alto.
  if (ctx.climate.uvLabel === 'high') {
    const hasSPF =
      hasFunction(amProducts, 'sunscreen_broad') ||
      hasFunction(amProducts, 'sunscreen_uvb') ||
      hasFunction(amProducts, 'sunscreen_uva');
    if (!hasSPF) {
      out.push({
        id: 'stack_missing_spf_high_uv',
        severity: 'danger',
        message:
          'Hoy UV alto y la rutina AM no incluye fotoprotector — incluye SPF amplio espectro antes de salir.',
      });
    }
  }

  // 6. Pares con `cautionWith` declarado en el catálogo y ambos
  //    presentes en la rutina del día. Solo se emite UNA vez por
  //    par (el orden de IDs ordenado evita duplicados).
  const seenPairs = new Set<string>();
  for (const a of dayProducts) {
    if (!a.cautionWith) continue;
    for (const pair of a.cautionWith) {
      const b = dayProducts.find((p) => p.id === pair.id);
      if (!b) continue;
      const key = [a.id, b.id].sort().join('::');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      out.push({
        id: `stack_caution_pair_${key}`,
        severity: 'caution',
        message: `${a.name} + ${b.name}: ${pair.why}`,
      });
    }
  }

  // 7. skipOnFlare presente durante flare activo.
  if (ctx.flareActive) {
    const offenders = dayProducts.filter((p) => p.skipOnFlare);
    if (offenders.length > 0) {
      const names = offenders.map((p) => p.name).join(' · ');
      out.push({
        id: 'stack_skiponflare_present',
        severity: 'caution',
        message: `Durante el brote, omite: ${names}. Pueden empeorar la irritación.`,
      });
    }
  }

  return out;
}
