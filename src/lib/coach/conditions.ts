// ═══════════════════════════════════════════════════════════
// conditions.ts · condiciones del usuario
//
// Fuente única de verdad de las condiciones cutáneas / clínicas
// que el coach considera para adaptar rutinas, escalar brotes y
// priorizar hábitos.
//
// Cada condición lleva activos PROHIBIDOS (lo que el coach
// retira automáticamente de la rutina cuando la condición está
// activa) y notas científicamente sustentadas. Las referencias
// quedan en `evidence` por si abrimos un panel "por qué".
//
// El usuario seleccionará / desactivará condiciones desde un
// dropdown UX/UI con animación GSAP en Fase 2 — esto es solo
// la capa de datos.
// ═══════════════════════════════════════════════════════════

export type ConditionId =
  | 'atopic_dermatitis'
  | 'reactive_skin'
  | 'sensitive_skin'
  | 'seborrheic_dermatitis'
  | 'acne_active'
  | 'bruxism'
  | 'chronic_stress';

export type ConditionDomain = 'skin' | 'oral' | 'mind_body';

export interface Condition {
  id: ConditionId;
  label: string;
  domain: ConditionDomain;
  oneLiner: string;
  /**
   * Ingredientes / categorías que el coach RETIRA de la rutina
   * cuando esta condición está activa. Coincide con cadenas
   * dentro de `Product.keyIngredients`.
   */
  forbiddenIngredients?: string[];
  /**
   * Categorías de producto que se retiran enteras durante la
   * condición (ej: exfoliantes en brote).
   */
  forbiddenCategories?: ('treatment_rx' | 'cleanser' | 'moisturizer' | 'sunscreen')[];
  /** Productos del catálogo que el coach prioriza durante la condición. */
  preferredProductIds?: string[];
  /** Resumen clínico breve y referencias. */
  evidence: string[];
}

export const CONDITIONS: Record<ConditionId, Condition> = {
  atopic_dermatitis: {
    id: 'atopic_dermatitis',
    label: 'Dermatitis atópica',
    domain: 'skin',
    oneLiner: 'Inflamación crónica con barrera cutánea deficiente, prurito y brotes recurrentes.',
    forbiddenIngredients: [
      'Salicylic acid',
      'Glycolic acid',
      'Lactic acid',
      'Mandelic acid',
      'Adapalene',
      'Tretinoin',
      'Retinol',
      'Benzoyl peroxide',
      'Fragrance',
      'Alcohol denat',
    ],
    preferredProductIds: [
      'cerave_moisturizing_cream',
      'cerave_pm_lotion',
      'bioderma_sensibio_defensive',
      'avene_thermal_spring_water',
      'avene_cicalfate_plus',
      'bioderma_atoderm_sos_spray',
      'tacroz_forte',
    ],
    evidence: [
      'Mutación FLG (filagrina) → barrera deficiente, pérdida transepidérmica de agua aumentada.',
      'Estrategia: emolientes ricos en ceramidas + tópicos antiinflamatorios escalonados (corticoide en brote, calcineurínicos en mantenimiento).',
      'Eichenfield 2014, AAD Guidelines on Atopic Dermatitis.',
    ],
  },

  reactive_skin: {
    id: 'reactive_skin',
    label: 'Piel reactiva',
    domain: 'skin',
    oneLiner: 'Respuesta exagerada a estímulos (frío, sol, productos) — eritema y picor sin lesión clara.',
    forbiddenIngredients: ['Fragrance', 'Essential oils', 'Alcohol denat', 'Menthol'],
    evidence: [
      'TRPV1 hipersensibilizado; trigger neurogénico de inflamación.',
      'Misery 2020, "Sensitive skin: from neurosensory to clinical evidence".',
    ],
  },

  sensitive_skin: {
    id: 'sensitive_skin',
    label: 'Piel sensible',
    domain: 'skin',
    oneLiner: 'Tolerancia reducida a activos cosméticos; tendencia a tirantez y enrojecimiento.',
    forbiddenIngredients: ['Fragrance', 'Sulfates (SLS/SLES)', 'Alcohol denat'],
    evidence: [
      'Solapamiento clínico con dermatitis atópica y rosácea pero sin sus criterios diagnósticos plenos.',
    ],
  },

  seborrheic_dermatitis: {
    id: 'seborrheic_dermatitis',
    label: 'Dermatitis seborreica',
    domain: 'skin',
    oneLiner: 'Placas eritematodescamativas en zonas seborreicas (alas nasales, cejas, cuero cabelludo).',
    preferredProductIds: ['bioderma_sensibio_ds_cream'],
    evidence: [
      'Asociado a colonización por Malassezia spp.; piroctone olamine + zinc piritiona como antifúngicos suaves.',
    ],
  },

  acne_active: {
    id: 'acne_active',
    label: 'Acné activo (granitos)',
    domain: 'skin',
    oneLiner: 'Tratamiento con retinoide+antibiótico tópico; rutina simplificada y SPF obligatorio.',
    preferredProductIds: ['deriva_c_micro', 'avene_ultra_fluid_spf50'],
    evidence: [
      'Adapaleno modula queratinización; clindamicina reduce P. acnes. Combinación aumenta adherencia y eficacia (Thiboutot 2018).',
      'Fotoprotección obligatoria por fotosensibilización del retinoide.',
    ],
  },

  bruxism: {
    id: 'bruxism',
    label: 'Bruxismo',
    domain: 'oral',
    oneLiner: 'Apretamiento/rechinamiento dental, frecuentemente nocturno, asociado a estrés.',
    evidence: [
      'Lobbezoo 2018 consenso internacional: factor central + factor periférico.',
      'Manejo conservador: ejercicios de liberación mandibular, control del estrés, higiene del sueño, férula si indicado.',
    ],
  },

  chronic_stress: {
    id: 'chronic_stress',
    label: 'Estrés crónico',
    domain: 'mind_body',
    oneLiner: 'Activación HPA sostenida; agrava bruxismo, dermatitis y altera sueño.',
    evidence: [
      'Cortisol elevado deteriora barrera cutánea (Choi 2005).',
      'Respiración diafragmática + meditación reducen activación simpática (Goyal 2014, JAMA Intern Med).',
    ],
  },
};

/**
 * Condiciones del usuario actual. Esto vive aquí en código durante
 * Fase 0; en Fase 2 se moverá a `localStorage` editable desde el
 * dropdown UX/UI con animación GSAP.
 */
export const USER_CONDITIONS: ConditionId[] = [
  'atopic_dermatitis',
  'reactive_skin',
  'sensitive_skin',
  'bruxism',
  'chronic_stress',
];

/** Devuelve la unión de ingredientes prohibidos por las condiciones activas. */
export function forbiddenIngredientsFor(active: ConditionId[]): Set<string> {
  const set = new Set<string>();
  for (const id of active) {
    const c = CONDITIONS[id];
    c?.forbiddenIngredients?.forEach(i => set.add(i.toLowerCase()));
  }
  return set;
}

/** Devuelve los productos preferidos sugeridos por las condiciones activas. */
export function preferredProductsFor(active: ConditionId[]): string[] {
  const out: string[] = [];
  for (const id of active) {
    const c = CONDITIONS[id];
    c?.preferredProductIds?.forEach(p => {
      if (!out.includes(p)) out.push(p);
    });
  }
  return out;
}
