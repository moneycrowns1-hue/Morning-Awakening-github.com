// ═══════════════════════════════════════════════════════════
// flareProtocol.ts · protocolo escalonado para brotes de
// dermatitis atópica / piel reactiva.
//
// Capa de DATOS — el coachEngine (Fase 1) consume estas reglas
// y las convierte en acciones priorizadas + cambia el `mode` de
// la rutina (`flare_strong`, `flare_mild`, `recovery`).
//
// Escalonado clínico (basado en lo dictado por el usuario y
// alineado con AAD 2014 + Eichenfield 2014):
//
//   Brote SEVERO:
//     1. Loratadina 10 mg (antihistamínico H1) primero
//     2. Dermovate (clobetasol) capa MUY fina · zonas gruesas
//     3. Tacroz (tacrolimus 0.1%) · zonas finas (cara, párpados)
//     4. Hidratación rica AM + PM (CeraVe Moisturizing)
//     5. SPF 50+ obligatorio (ambos tópicos fotosensibilizan)
//     6. Cuando cede el rojo → fase recovery con cremas suaves
//
//   Brote LEVE:
//     1. Tacroz puntual en zonas activas
//     2. Hidratación intensiva
//     3. Sin corticoide
//
//   En CUALQUIER brote, el coach RETIRA:
//     · Ácidos (salicílico, glicólico, láctico, mandélico)
//     · Exfoliantes mecánicos
//     · Retinoides (adapaleno, retinol, tretinoína) → pausar Deriva-C
//     · Productos con fragancia / alcohol denat
// ═══════════════════════════════════════════════════════════

import type { RoutineMode } from './routines';

export type FlareSeverity = 'mild' | 'strong';

export type FlarePhase =
  | 'active'    // brote en curso
  | 'recovery'  // rojo cediendo, escamas en resolución
  | 'resolved'; // sin brote, rutina normal

export interface FlareState {
  severity: FlareSeverity | null;
  phase: FlarePhase;
  /** Fecha ISO en la que se inició el brote actual. */
  startedAt: string | null;
  /** Notas opcionales del usuario ("apareció tras estrés exámenes"). */
  notes?: string;
}

/** Estado por defecto cuando no hay brote. */
export const DEFAULT_FLARE_STATE: FlareState = {
  severity: null,
  phase: 'resolved',
  startedAt: null,
};

// ═══════════════════════════════════════════════════════════
// REGLAS DE ESCALADO
// ═══════════════════════════════════════════════════════════

export interface FlareStep {
  order: number;
  /** Acción concreta a sugerir al usuario (texto que verá). */
  action: string;
  /** Productos del catálogo implicados (IDs). */
  productIds: string[];
  /** Categoría táctica para iconografía/UI. */
  kind: 'oral' | 'corticoid' | 'calcineurin' | 'moisturizer' | 'sunscreen' | 'soothing';
  /** Razón clínica corta. */
  rationale: string;
}

const STRONG_FLARE_STEPS: FlareStep[] = [
  {
    order: 1,
    action: 'Tomar loratadina 10 mg para frenar el picor sistémico.',
    productIds: ['loratadine_10'],
    kind: 'oral',
    rationale: 'Antihistamínico H1 reduce prurito mediado por histamina, disminuye rascado nocturno.',
  },
  {
    order: 2,
    action: 'Dermovate capa MUY fina en zonas gruesas en brote.',
    productIds: ['dermovate_ointment'],
    kind: 'corticoid',
    rationale: 'Clobetasol (corticoide superpotente) corta inflamación rápida. Solo zonas gruesas, máx 2 sem.',
  },
  {
    order: 3,
    action: 'Tacroz Forte en zonas finas (cara, párpados).',
    productIds: ['tacroz_forte'],
    kind: 'calcineurin',
    rationale: 'Inhibidor de calcineurina sin atrofia cutánea — apropiado para piel fina donde el corticoide está contraindicado.',
  },
  {
    order: 4,
    action: 'Sello rico de hidratación AM y PM.',
    productIds: ['cerave_moisturizing_cream', 'avene_thermal_spring_water'],
    kind: 'moisturizer',
    rationale: 'Restaurar barrera con ceramidas y emolientes oclusivos reduce TEWL y acelera resolución.',
  },
  {
    order: 5,
    action: 'SPF 50+ obligatorio en AM mientras dure el tratamiento.',
    productIds: ['avene_ultra_fluid_spf50'],
    kind: 'sunscreen',
    rationale: 'Tacrolimus y corticoides aumentan fotosensibilidad; UV agrava inflamación atópica.',
  },
  {
    order: 6,
    action: 'Atoderm SOS Spray si el picor reaparece entre aplicaciones.',
    productIds: ['bioderma_atoderm_sos_spray'],
    kind: 'soothing',
    rationale: 'Niacinamida + enoxolone calman picor agudo sin cortisona extra.',
  },
];

const MILD_FLARE_STEPS: FlareStep[] = [
  {
    order: 1,
    action: 'Tacroz puntual en zonas activas, 2×/día.',
    productIds: ['tacroz_forte'],
    kind: 'calcineurin',
    rationale: 'Para brote leve, calcineurínico tópico es primera línea sin corticoide.',
  },
  {
    order: 2,
    action: 'Hidratación intensiva: spray termal + sello rico.',
    productIds: ['avene_thermal_spring_water', 'cerave_moisturizing_cream'],
    kind: 'moisturizer',
    rationale: 'Hidratación frecuente reduce reactividad y previene escalada a brote severo.',
  },
  {
    order: 3,
    action: 'Loratadina solo si el picor interrumpe el sueño.',
    productIds: ['loratadine_10'],
    kind: 'oral',
    rationale: 'No de rutina en brote leve; reservar para episodios con prurito significativo.',
  },
  {
    order: 4,
    action: 'SPF 50+ en AM (tacrolimus fotosensibiliza).',
    productIds: ['avene_ultra_fluid_spf50'],
    kind: 'sunscreen',
    rationale: 'Aunque no haya corticoide, el tacrolimus solo ya justifica SPF reforzado.',
  },
];

const RECOVERY_STEPS: FlareStep[] = [
  {
    order: 1,
    action: 'Suspender corticoide, mantener tacroz solo en focos residuales.',
    productIds: ['tacroz_forte'],
    kind: 'calcineurin',
    rationale: 'Bajada gradual del escalón de potencia evita rebote.',
  },
  {
    order: 2,
    action: 'Cicalfate+ en zonas que estuvieron rotas.',
    productIds: ['avene_cicalfate_plus'],
    kind: 'soothing',
    rationale: 'Sucralfato + Cu/Zn aceleran cicatrización epitelial.',
  },
  {
    order: 3,
    action: 'Hidratación generosa día y noche.',
    productIds: ['cerave_moisturizing_cream', 'cerave_pm_lotion', 'bioderma_sensibio_defensive'],
    kind: 'moisturizer',
    rationale: 'Reconstrucción de barrera reduce probabilidad de recidiva.',
  },
  {
    order: 4,
    action: 'Mantener SPF 50+ y NO reintroducir activos durante 7-10 días.',
    productIds: ['avene_ultra_fluid_spf50'],
    kind: 'sunscreen',
    rationale: 'La piel post-brote sigue hipersensible; activos pueden reactivar la inflamación.',
  },
];

export function flareSteps(state: FlareState): FlareStep[] {
  if (state.phase === 'resolved') return [];
  if (state.phase === 'recovery') return RECOVERY_STEPS;
  return state.severity === 'strong' ? STRONG_FLARE_STEPS : MILD_FLARE_STEPS;
}

// ═══════════════════════════════════════════════════════════
// MAPEO A `RoutineMode`
// ═══════════════════════════════════════════════════════════

/**
 * Decide qué `RoutineMode` debe correr el coachEngine para un
 * estado de brote dado. Si hay tratamiento de acné con Deriva-C
 * activo Y NO hay brote, devuelve `acne_treatment`.
 */
export function modeForFlare(
  state: FlareState,
  derivaCActive: boolean,
): RoutineMode {
  if (state.phase === 'active') {
    return state.severity === 'strong' ? 'flare_strong' : 'flare_mild';
  }
  if (state.phase === 'recovery') return 'recovery';
  if (derivaCActive) return 'acne_treatment';
  return 'normal';
}

// ═══════════════════════════════════════════════════════════
// PROHIBIDOS DURANTE BROTE (refuerzo independiente de conditions.ts)
// ═══════════════════════════════════════════════════════════

/**
 * Productos del catálogo que se PAUSAN automáticamente cuando hay
 * brote activo, independientemente de la condición base. El motor
 * los oculta de la rutina y muestra el motivo.
 */
export const FLARE_PAUSED_PRODUCT_IDS: string[] = [
  'deriva_c_micro',
];

/**
 * Categorías genéricas a evitar durante brote (lo que el usuario
 * dictó: "nada de ácidos, exfoliantes ni cremas que afecten").
 */
export const FLARE_FORBIDDEN_INGREDIENT_KEYWORDS: string[] = [
  'salicylic',
  'glycolic',
  'lactic',
  'mandelic',
  'adapalene',
  'retinol',
  'tretinoin',
  'benzoyl peroxide',
  'fragrance',
  'alcohol denat',
];
