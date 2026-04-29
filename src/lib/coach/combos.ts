// ═══════════════════════════════════════════════════════════
// combos.ts · combinaciones curadas de productos/hábitos
//
// Un combo es un mini-protocolo (2–4 elementos) con sinergia
// clínica probada. El motor elige UN combo del día relevante
// al contexto (signals + clima + sub-rutinas) y la UI lo
// muestra como "combo del día".
//
// Cada combo declara `triggers` (predicados sobre el ctx); el
// que más triggers active gana. En empate, hash determinístico.
// ═══════════════════════════════════════════════════════════

import type { ResolvedSignals } from './signals';
import type { ClimateContext } from '../common/climateEC';
import type { DerivedHealthSignals } from './healthSignals';
import type { SubRoutineId } from './subRoutines';
import type { ConditionId } from './conditions';
import type { TipDomain } from './tipsBank';

export interface ComboItem {
  /** Producto del catálogo (TOPICALS/ORAL) si aplica. */
  productId?: string;
  /** O un hábito libre (ej. "respiración 5 min"). */
  habit?: string;
  /** Por qué entra al combo. */
  why: string;
}

export interface Combo {
  id: string;
  title: string;
  /** Una frase: por qué este combo hoy. */
  pitch: string;
  domain: TipDomain;
  items: ComboItem[];
  /**
   * Predicados que activan el combo. Cada uno que devuelve true
   * suma 1 al score; el combo con score más alto gana.
   */
  triggers: Array<(ctx: ComboCtx) => boolean>;
}

export interface ComboCtx {
  signals: ResolvedSignals;
  climate: ClimateContext;
  health: DerivedHealthSignals;
  conditions: ConditionId[];
  flareActive: boolean;
  activeSubRoutines: Set<SubRoutineId>;
}

// ─── Catalog ────────────────────────────────────────────────

export const COMBOS: Combo[] = [
  {
    id: 'barrier_triad',
    title: 'Tríada de barrera',
    pitch: 'Calma, hidrata y sella en 3 capas finas — la base anti-flare leve.',
    domain: 'skin',
    items: [
      {
        productId: 'avene_thermal_spring_water',
        why: 'Capa fina · selenio que estabiliza la respuesta inflamatoria.',
      },
      {
        productId: 'bioderma_sensibio_defensive',
        why: 'Sérum calmante · niacinamida + plant defensins que bajan rojez.',
      },
      {
        productId: 'cerave_moisturizing_cream',
        why: 'Sello rico · ceramidas 3:1:1 que restituyen barrera atópica.',
      },
    ],
    triggers: [
      (c) => c.conditions.includes('atopic_dermatitis'),
      (c) => c.signals.skinFeel === 'tight' || c.signals.skinFeel === 'flaky',
      (c) => c.climate.humidity === 'dry',
    ],
  },
  {
    id: 'flare_rescue',
    title: 'Rescate de brote',
    pitch: 'Cuando arde o pica · cortar inflamación rápido sin agresión.',
    domain: 'skin',
    items: [
      {
        productId: 'avene_cicalfate_plus',
        why: 'Sucralfato + cobre-zinc · acelera reparación epitelial.',
      },
      {
        productId: 'bioderma_atoderm_sos_spray',
        why: 'Spray sobre la zona — calma sin frotar.',
      },
      {
        habit: 'Respiración 4-7-8 · 3 ciclos',
        why: 'Baja cortisol y estrés que potencian la inflamación.',
      },
    ],
    triggers: [
      (c) => c.flareActive,
      (c) => c.signals.skinFeel === 'red' || c.signals.skinFeel === 'itchy' || c.signals.skinFeel === 'stinging',
      (c) => c.activeSubRoutines.has('micro_flare'),
    ],
  },
  {
    id: 'sleep_jaw',
    title: 'Sueño + mandíbula',
    pitch: 'Ataca el bruxism nocturno desde el origen: cortisol, mandíbula, melatonina.',
    domain: 'sleep',
    items: [
      {
        productId: 'tryptophan_mg_b6_lajusticia',
        why: 'Triptófano + magnesio · precursores de serotonina/melatonina.',
      },
      {
        habit: 'Ejercicio mandíbula · noche',
        why: 'Descomprime la articulación antes de dormir.',
      },
      {
        habit: 'Respiración 4-7-8 · pre-sueño',
        why: 'Activa parasimpático en menos de 2 min.',
      },
    ],
    triggers: [
      (c) => c.conditions.includes('bruxism'),
      (c) => c.signals.stress === 'high',
      (c) => c.signals.sleep === 'poor' || c.health.sleepLastNight === 'poor',
    ],
  },
  {
    id: 'acne_strict',
    title: 'Disciplina Deriva-C',
    pitch: 'Adapaleno + sello no oclusivo + SPF religioso.',
    domain: 'skin',
    items: [
      {
        productId: 'deriva_c_micro',
        why: 'Adapaleno 0.1% · normaliza queratinización folicular.',
      },
      {
        productId: 'cerave_pm_lotion',
        why: 'Sello PM ligero · evita pesadez sobre retinoide.',
      },
      {
        productId: 'avene_ultra_fluid_spf50',
        why: 'SPF50 fluido · diario obligatorio durante el curso.',
      },
    ],
    triggers: [
      (c) => c.signals.skinFeel === 'oily',
    ],
  },
  {
    id: 'post_workout',
    title: 'Combo post-entreno',
    pitch: 'Limpia rápido, calma y reaplica fotoprotector si vas al sol.',
    domain: 'skin',
    items: [
      {
        productId: 'eucerin_dermatoclean_gel',
        why: 'Limpieza suave que retira sudor + sebo sin irritar.',
      },
      {
        productId: 'avene_thermal_spring_water',
        why: 'Termal · baja la sensación de "calor" post-entreno.',
      },
      {
        productId: 'avene_ultra_fluid_spf50',
        why: 'Re-aplica si seguís al sol — el sudor desplazó el SPF.',
      },
    ],
    triggers: [
      (c) => c.activeSubRoutines.has('post_gym'),
      (c) => !!c.health.exerciseMinToday && c.health.exerciseMinToday >= 30,
    ],
  },
  {
    id: 'high_uv_protect',
    title: 'Defensa solar',
    pitch: 'UV alto en pico · capas de protección + reaplicar.',
    domain: 'skin',
    items: [
      {
        productId: 'avene_ultra_fluid_spf50',
        why: 'Re-aplica cada 2 h en franja 10–15 h.',
      },
      {
        productId: 'eucerin_aquaphor_lip',
        why: 'El labio inferior es zona de queilitis actínica.',
      },
      {
        habit: 'Sombrero o sombra',
        why: 'Barrera física suma >50% de protección extra.',
      },
    ],
    triggers: [
      (c) => c.activeSubRoutines.has('high_uv'),
      (c) => c.climate.uvLabel === 'high',
    ],
  },
];

// ─── Selector ────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Devuelve el combo con más triggers activos. `null` si ninguno
 * supera score 0 (ningún trigger relevante).
 */
export function pickComboOfTheDay(ctx: ComboCtx, dateISO: string): Combo | null {
  const scored = COMBOS.map((c) => ({
    combo: c,
    score: c.triggers.reduce((acc, t) => acc + (t(ctx) ? 1 : 0), 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score === 0) return null;
  // Empates: hash determinístico sobre la fecha.
  const top = scored.filter((s) => s.score === scored[0].score).map((s) => s.combo);
  return top[hashString(dateISO) % top.length];
}
