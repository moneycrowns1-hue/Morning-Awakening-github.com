// ═══════════════════════════════════════════════════════════
// brushing.ts · cepillado dental + arsenal oral
//
// El usuario hace 2× actualmente y quiere disciplinarse a 3×
// durante vacaciones (post-desayuno, post-almuerzo, post-merienda).
// Cuando arranque facultad otra vez bajamos a 2× sin perder el
// hábito de noche.
//
// Tools que tiene:
//   · Pasta dental (sin marca específica; cualquiera con flúor sirve)
//   · Hilo dental
//   · Listerine Cool Mint Sin Alcohol
//
// Ciencia que sostiene el plan:
//   · Cepillado mínimo 2 min con técnica modificada de Bass
//     (American Dental Association).
//   · Hilo ANTES del cepillado nocturno mejora reducción de placa
//     interproximal vs después (Mazhari 2018).
//   · Enjuague sin alcohol evita xerostomía e irritación en piel
//     atópica (que suele tener mucosa más reactiva).
//   · Esperar ≥ 30 min tras alimentos ácidos antes de cepillar
//     (esmalte vulnerable post-pH bajo).
// ═══════════════════════════════════════════════════════════

export type BrushingSlot = 'after_breakfast' | 'after_lunch' | 'after_snack' | 'before_bed';

export type DailyTarget = 2 | 3;

export interface BrushingPlan {
  /** Cuántos cepillados al día apunta el usuario. */
  dailyTarget: DailyTarget;
  /** Slots activos en el plan actual. */
  slots: BrushingSlot[];
  /** Si se incluye hilo dental al menos 1×/día. */
  includesFloss: boolean;
  /** Si se incluye enjuague Listerine al menos 1×/día. */
  includesMouthwash: boolean;
  /** Notas para el usuario al ejecutar cada slot. */
  notesPerSlot: Record<BrushingSlot, string>;
}

/** Plan vacacional (3× diarios) — el actual del usuario. */
export const VACATION_PLAN: BrushingPlan = {
  dailyTarget: 3,
  slots: ['after_breakfast', 'after_lunch', 'after_snack', 'before_bed'].slice(0, 3) as BrushingSlot[],
  // ↑ realmente serían 3, pero dejo before_bed disponible si desea
  // mover el tercer slot a la noche en lugar de post-merienda.
  includesFloss: true,
  includesMouthwash: true,
  notesPerSlot: {
    after_breakfast: '2 min, técnica de Bass. Esperar ≥ 30 min si comiste cítrico/jugo.',
    after_lunch: '2 min. Usar hilo si almorzaste algo fibroso.',
    after_snack: '2 min. Si la merienda fue dulce, enjuagar con agua antes de cepillar.',
    before_bed: 'Hilo PRIMERO, luego cepillado 2 min, luego Listerine Cool Mint sin alcohol 30 s.',
  },
};

/** Plan facultad (2× diarios: AM tras desayuno y PM antes de cama). */
export const SCHOOL_PLAN: BrushingPlan = {
  dailyTarget: 2,
  slots: ['after_breakfast', 'before_bed'],
  includesFloss: true,
  includesMouthwash: true,
  notesPerSlot: {
    after_breakfast: '2 min, técnica de Bass.',
    after_lunch: '',
    after_snack: '',
    before_bed: 'Hilo → cepillado 2 min → Listerine Cool Mint sin alcohol 30 s.',
  },
};

/** Plan activo (alterna según estado de "vacaciones" / "facultad"). */
export const CURRENT_PLAN: BrushingPlan = VACATION_PLAN;

// ═══════════════════════════════════════════════════════════
// ARSENAL ORAL
// ═══════════════════════════════════════════════════════════

export interface OralCareItem {
  id: string;
  name: string;
  category: 'paste' | 'floss' | 'mouthwash';
  oneLiner: string;
  cautions?: string[];
}

export const ORAL_CARE_ARSENAL: OralCareItem[] = [
  {
    id: 'toothpaste_default',
    name: 'Pasta dental con flúor',
    category: 'paste',
    oneLiner: 'Cualquier pasta con ≥ 1000 ppm de flúor (revisar etiqueta).',
    cautions: ['No tragar; en adultos ~1.5 cm en cerda.'],
  },
  {
    id: 'dental_floss',
    name: 'Hilo dental',
    category: 'floss',
    oneLiner: 'Hilo encerado o expandible para placa interproximal.',
    cautions: ['Usar antes del cepillado nocturno para mejor remoción de placa (Mazhari 2018).'],
  },
  {
    id: 'listerine_cool_mint_no_alcohol',
    name: 'Listerine Cool Mint Sin Alcohol',
    category: 'mouthwash',
    oneLiner: 'Enjuague antiplaca sin etanol — apto para piel sensible / atópica.',
    cautions: [
      '30 s, no diluir, no enjuagar con agua después.',
      'Sin alcohol evita xerostomía; mejor para mucosa reactiva.',
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// BRUXISMO · INTEGRACIÓN
// ═══════════════════════════════════════════════════════════

/**
 * Recordatorios específicos del bruxismo asociados al cepillado:
 * antes de dormir hay que liberar mandíbula porque la noche es
 * cuando más se aprieta. Estas notas las añade el coach al slot
 * `before_bed` cuando la condición `bruxism` está activa.
 */
export const BRUXISM_BEDTIME_REMINDERS: string[] = [
  'Tras el cepillado, hacer la rutina de bruxismo (mandíbula libre) 5 min.',
  'Conscientemente separar dientes superiores e inferiores antes de dormir (lengua al paladar, labios juntos).',
  'Si despiertas con dolor mandibular, marcar el evento en el log de bruxismo.',
];
