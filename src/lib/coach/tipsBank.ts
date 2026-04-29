// ═══════════════════════════════════════════════════════════
// tipsBank.ts · pool de tips contextuales con anti-repetición
//
// Cada tip declara tags (función cosmética, condición, signal,
// clima, sub-rutina). El selector:
//   1. Filtra tips relevantes al contexto actual.
//   2. Excluye los mostrados en los últimos N días.
//   3. Elige determinísticamente (hash sobre fecha) → mismo tip
//      todo el día, distinto cada día.
//
// Persistencia de "vistos" la maneja `state.ts`.
// ═══════════════════════════════════════════════════════════

import type { IngredientFunction } from './catalog';
import type { ConditionId } from './conditions';
import type { SkinFeel, Sleep, Stress } from './signals';
import type { SubRoutineId } from './subRoutines';

const TIP_HISTORY_DAYS = 14;

export type TipDomain = 'skin' | 'oral' | 'mind_body' | 'hydration' | 'sleep' | 'general';

export interface TipTags {
  fns?: IngredientFunction[];
  conditions?: ConditionId[];
  skinFeel?: SkinFeel[];
  sleep?: Sleep[];
  stress?: Stress[];
  /** Solo cuando una sub-rutina está activa. */
  subRoutines?: SubRoutineId[];
  /** Tag genérico (ej. clima seco, UV alto). */
  context?: ('dry' | 'humid' | 'uv_high' | 'cold' | 'warm' | 'rest_day')[];
}

export interface Tip {
  id: string;
  text: string;
  domain: TipDomain;
  /** Etiqueta corta para chip de origen ("ingrediente · niacinamida"). */
  source: string;
  tags: TipTags;
}

// ─── Pool ────────────────────────────────────────────────────

export const TIPS: Tip[] = [
  // ── Ingredientes ──────────────────────────────────────────
  {
    id: 'tip_niacinamide_5pct',
    text: 'Niacinamida al 5% calma rojeces y modula sebo sin irritar — segura junto a casi todo.',
    domain: 'skin', source: 'ingrediente · niacinamida',
    tags: { fns: ['soothing'], skinFeel: ['red', 'oily'] },
  },
  {
    id: 'tip_panthenol',
    text: 'Panthenol (B5) repara barrera y reduce escozor — ideal post-flare leve.',
    domain: 'skin', source: 'ingrediente · panthenol',
    tags: { fns: ['soothing', 'humectant'], skinFeel: ['itchy', 'tight'] },
  },
  {
    id: 'tip_ceramides_ratio',
    text: 'La ratio 3:1:1 ceramidas/colesterol/ácidos grasos es la que mejor reconstruye barrera.',
    domain: 'skin', source: 'ingrediente · ceramidas',
    tags: { fns: ['barrier_lipid'], conditions: ['atopic_dermatitis'] },
  },
  {
    id: 'tip_hyaluronic_damp_skin',
    text: 'Aplica hialurónico sobre piel HÚMEDA — sin agua superficial puede deshidratar más.',
    domain: 'skin', source: 'técnica · ácido hialurónico',
    tags: { fns: ['humectant'], context: ['dry'] },
  },
  {
    id: 'tip_petrolatum_sandwich',
    text: 'Aquaphor sandwich: humectante → emoliente → vaselina fina. Sella sin asfixiar.',
    domain: 'skin', source: 'técnica · oclusivo',
    tags: { fns: ['occlusive'], conditions: ['atopic_dermatitis'], context: ['dry', 'cold'] },
  },
  {
    id: 'tip_avene_thermal',
    text: 'Agua termal Avène + 1 min en piel + sello: corta picazón aguda en flare leve.',
    domain: 'skin', source: 'producto · agua termal',
    tags: { fns: ['thermal_water'], skinFeel: ['itchy', 'red', 'stinging'] },
  },
  {
    id: 'tip_retinoid_sandwich',
    text: 'Si el retinoide irrita: humectante → retinoide → emoliente. Buffering sin perder eficacia clínica.',
    domain: 'skin', source: 'técnica · retinoide',
    tags: { fns: ['active_retinoid'] },
  },
  {
    id: 'tip_bha_no_retinoid_same_pm',
    text: 'BHA + retinoide misma noche = irritación garantizada. Alterna días.',
    domain: 'skin', source: 'compatibilidad · activos',
    tags: { fns: ['active_bha', 'active_retinoid'] },
  },
  {
    id: 'tip_vitc_morning',
    text: 'Vitamina C en AM potencia el SPF — antioxidante que neutraliza radicales del UV.',
    domain: 'skin', source: 'ingrediente · vit C',
    tags: { fns: ['antioxidant'], context: ['uv_high'] },
  },

  // ── Sol / fotoprotección ──────────────────────────────────
  {
    id: 'tip_spf_2h_reapply',
    text: 'Re-aplicar SPF cada 2 h al sol — sin reaplicar, la protección efectiva cae a la mitad antes del mediodía.',
    domain: 'skin', source: 'fotoprotección',
    tags: { fns: ['sunscreen_broad'], context: ['uv_high'], subRoutines: ['high_uv', 'post_gym'] },
  },
  {
    id: 'tip_spf_quito_cloudy',
    text: 'En Quito, días nublados pasan 80% del UV. SPF también esos días.',
    domain: 'skin', source: 'clima · Quito',
    tags: { context: ['humid'] },
  },
  {
    id: 'tip_lip_actinic',
    text: 'El labio inferior es zona de queilitis actínica — bálsamo con SPF15+ todos los días al sol.',
    domain: 'skin', source: 'prevención · labio',
    tags: { context: ['uv_high'] },
  },
  {
    id: 'tip_two_finger_rule',
    text: 'La cantidad correcta de SPF = 2 dedos completos para cara y cuello.',
    domain: 'skin', source: 'técnica · SPF',
    tags: { fns: ['sunscreen_broad'] },
  },

  // ── Bruxismo / mandíbula ──────────────────────────────────
  {
    id: 'tip_bruxism_water',
    text: 'Hidratación pobre = saliva más espesa = más fricción nocturna en bruxismo.',
    domain: 'oral', source: 'fisiología · bruxismo',
    tags: { conditions: ['bruxism'] },
  },
  {
    id: 'tip_bruxism_jaw_release',
    text: 'Antes de dormir: lengua al paladar, dientes separados 2 mm, mandíbula relajada. Gatilla descanso.',
    domain: 'oral', source: 'técnica · bruxismo',
    tags: { conditions: ['bruxism'], stress: ['high'] },
  },
  {
    id: 'tip_478_breath',
    text: 'La 4-7-8 (inhala 4s, retén 7s, exhala 8s) baja activación simpática en menos de 2 min.',
    domain: 'mind_body', source: 'respiración · 4-7-8',
    tags: { stress: ['high'], subRoutines: ['high_stress', 'poor_sleep'] },
  },

  // ── Sueño / cortisol ──────────────────────────────────────
  {
    id: 'tip_cortisol_skin',
    text: 'Cortisol elevado por mal dormir empeora atopia, acné y barrera. Recuperar sueño es skincare.',
    domain: 'sleep', source: 'fisiología · cortisol',
    tags: { sleep: ['poor'], subRoutines: ['poor_sleep'] },
  },
  {
    id: 'tip_tryptophan_timing',
    text: 'Triptófano 1 h antes de dormir + carbohidrato simple ayuda a la conversión a serotonina y luego melatonina.',
    domain: 'sleep', source: 'suplementación · triptófano',
    tags: { sleep: ['poor', 'avg'] },
  },
  {
    id: 'tip_blue_light',
    text: 'Pantallas en hora previa al sueño retrasan melatonina ~30 min. Apaga o usa filtro cálido.',
    domain: 'sleep', source: 'higiene · pantallas',
    tags: { sleep: ['poor'] },
  },

  // ── Hidratación sistémica ─────────────────────────────────
  {
    id: 'tip_water_quito_dry',
    text: 'En estación seca de Quito, sumar 0.3 L mantiene la barrera epidérmica funcional.',
    domain: 'hydration', source: 'clima · Quito',
    tags: { context: ['dry'] },
  },
  {
    id: 'tip_water_morning_first',
    text: 'Primer vaso de agua al levantarte rompe ayuno hídrico de 7-9 h.',
    domain: 'hydration', source: 'hábito · mañana',
    tags: {},
  },
  {
    id: 'tip_water_flake',
    text: 'Si la piel descama, primero pregúntate si tomaste suficiente agua antes de cambiar la crema.',
    domain: 'hydration', source: 'troubleshooting · descamación',
    tags: { skinFeel: ['flaky', 'tight'] },
  },

  // ── Atopia específica ─────────────────────────────────────
  {
    id: 'tip_atopic_short_showers',
    text: 'Duchas tibias < 10 min preservan los lípidos del estrato córneo en atopia.',
    domain: 'skin', source: 'higiene · atopia',
    tags: { conditions: ['atopic_dermatitis'], context: ['cold', 'dry'] },
  },
  {
    id: 'tip_atopic_pat_dry',
    text: 'Después de ducharte, no frotes — palmadas suaves y aplica humectante con piel aún húmeda.',
    domain: 'skin', source: 'técnica · atopia',
    tags: { conditions: ['atopic_dermatitis'] },
  },
  {
    id: 'tip_atopic_no_fragrance',
    text: 'Fragancias y aceites esenciales son los #1 disparadores en dermatitis atópica.',
    domain: 'skin', source: 'evita · atopia',
    tags: { conditions: ['atopic_dermatitis'], skinFeel: ['itchy', 'red'] },
  },

  // ── Acné / Deriva-C ───────────────────────────────────────
  {
    id: 'tip_acne_no_squeeze',
    text: 'Apretar lesiones inflamatorias profundiza la lesión y deja PIH 3–6 meses extra.',
    domain: 'skin', source: 'evita · acné',
    tags: { skinFeel: ['oily'] },
  },
  {
    id: 'tip_deriva_c_pea_size',
    text: 'Cantidad correcta de adapaleno: tamaño guisante para toda la cara. Más no es mejor, más irrita.',
    domain: 'skin', source: 'técnica · adapaleno',
    tags: { fns: ['active_retinoid'] },
  },

  // ── Mind-body / estrés ────────────────────────────────────
  {
    id: 'tip_morning_breath_anchor',
    text: 'Respiración matinal 5 min ancla el sistema nervioso para el día — más ROI que cualquier app.',
    domain: 'mind_body', source: 'hábito · respiración',
    tags: { stress: ['high', 'mid'], sleep: ['poor'] },
  },
  {
    id: 'tip_meditation_5min_floor',
    text: '5 min al día consistente > 30 min los domingos. La frecuencia construye plasticidad.',
    domain: 'mind_body', source: 'hábito · meditación',
    tags: {},
  },

  // ── Post-gym / actividad ──────────────────────────────────
  {
    id: 'tip_postgym_cleanse_fast',
    text: 'Limpia cara dentro de 30 min post-entreno: el sudor + sebo retenidos disparan foliculitis.',
    domain: 'skin', source: 'post-gym',
    tags: { subRoutines: ['post_gym'] },
  },
  {
    id: 'tip_postgym_thermal_water',
    text: 'Una capa de agua termal post-gym baja la sensación de "calor" en piel atópica.',
    domain: 'skin', source: 'post-gym',
    tags: { subRoutines: ['post_gym'], conditions: ['atopic_dermatitis'] },
  },

  // ── Generales / motivacionales (siempre elegibles) ────────
  {
    id: 'tip_routine_consistency',
    text: 'Una rutina simple seguida 30 días supera una compleja seguida 5 días.',
    domain: 'general', source: 'principio · constancia',
    tags: {},
  },
  {
    id: 'tip_less_is_more',
    text: 'En piel sensible: menos productos, mejor ejecución. Cada activo extra es un riesgo.',
    domain: 'skin', source: 'principio · minimal',
    tags: { skinFeel: ['red', 'tight', 'stinging'] },
  },
  {
    id: 'tip_patch_test',
    text: 'Producto nuevo: parche en mandíbula 5 días antes de cara completa. Evita disasters.',
    domain: 'skin', source: 'método · patch test',
    tags: {},
  },
  {
    id: 'tip_rest_day_meaning',
    text: 'Día de descanso ≠ día de abandono. Cepillado, agua y rutina mínima sostienen el momentum.',
    domain: 'general', source: 'principio · descanso',
    tags: { context: ['rest_day'] },
  },
  {
    id: 'tip_evidence_over_hype',
    text: 'Si un activo no tiene 5+ años de literatura, espéralo en la siguiente generación de productos.',
    domain: 'general', source: 'principio · evidencia',
    tags: {},
  },
  {
    id: 'tip_cleanser_ph',
    text: 'Limpiadores con pH 4.5–5.5 mantienen el manto ácido y previenen sensibilización progresiva.',
    domain: 'skin', source: 'principio · pH',
    tags: {},
  },
  {
    id: 'tip_skincare_layers_thin',
    text: 'Capas finas y esperar 30-60s entre cada una previenen pilling y mejoran absorción.',
    domain: 'skin', source: 'técnica · capas',
    tags: {},
  },
  {
    id: 'tip_bruxism_morning_check',
    text: 'Si despiertas con dolor mandibular, registra el día — patrón > 3 días/semana = consulta.',
    domain: 'oral', source: 'monitoreo · bruxismo',
    tags: { conditions: ['bruxism'] },
  },
];

// ─── Selector ────────────────────────────────────────────────

export interface TipSelectionCtx {
  dateISO: string;
  skinFeel: SkinFeel;
  sleep: Sleep;
  stress: Stress;
  conditions: ConditionId[];
  activeSubRoutines: SubRoutineId[];
  contextTags: NonNullable<TipTags['context']>;
  /** IDs de tips ya mostrados en últimos N días (más recientes primero). */
  recentSeen: string[];
}

/**
 * Score 0..N para indicar cuántos tags del tip matchean el contexto.
 * Tips sin tags reciben score 0 pero siguen siendo elegibles (filler).
 */
function relevanceScore(tip: Tip, ctx: TipSelectionCtx): number {
  const t = tip.tags;
  let score = 0;
  if (t.skinFeel?.includes(ctx.skinFeel)) score += 2;
  if (t.sleep?.includes(ctx.sleep)) score += 2;
  if (t.stress?.includes(ctx.stress)) score += 2;
  if (t.conditions?.some((c) => ctx.conditions.includes(c))) score += 2;
  if (t.subRoutines?.some((s) => ctx.activeSubRoutines.includes(s))) score += 3;
  if (t.context?.some((c) => ctx.contextTags.includes(c))) score += 1;
  return score;
}

/** Hash determinístico de un string a entero positivo. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Elige el "tip del día". Si hay tips relevantes (score > 0) prefiere
 * esos; cae a tips genéricos si no. Excluye los recientes.
 */
export function pickTipOfTheDay(ctx: TipSelectionCtx): Tip | null {
  const recent = new Set(ctx.recentSeen.slice(0, TIP_HISTORY_DAYS));

  // Eligibles: no vistos recientemente.
  const candidates = TIPS.filter((t) => !recent.has(t.id));
  if (candidates.length === 0) {
    // Fallback: si TODO se vio recientemente (caso raro), reseteamos.
    return TIPS[hashString(ctx.dateISO) % TIPS.length] ?? null;
  }

  // Ordenamos por score desc; en empate, hash determinístico.
  const scored = candidates
    .map((t) => ({ t, s: relevanceScore(t, ctx) }))
    .sort((a, b) => b.s - a.s);

  const topScore = scored[0].s;
  const top = scored.filter((x) => x.s === topScore).map((x) => x.t);
  return top[hashString(ctx.dateISO) % top.length];
}

export const TIP_HISTORY_LIMIT = TIP_HISTORY_DAYS;
