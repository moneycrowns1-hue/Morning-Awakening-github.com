// ═══════════════════════════════════════════════════════════
// routines.ts · rutinas AM/PM declarativas por modo
//
// Las rutinas son DATOS, no UI. Cada modo (`normal`, `acne_treatment`,
// `flare_strong`, `flare_mild`, `recovery`) define el orden EXACTO
// de pasos para mañana y noche, referenciando `Product.id` del
// catálogo. El coachEngine (Fase 1) elige el modo según el estado
// del usuario (brote activo, tratamiento Deriva-C en curso, etc.).
//
// Reglas de diseño:
//   1. Orden importa — las funciones consumen el array tal cual.
//   2. `applySkinState` registra la regla "soak-and-seal":
//      - 'damp' → aplicar sobre piel todavía húmeda (mejor absorción
//        de humectantes y serums).
//      - 'dry'  → aplicar sobre piel seca (SPF, retinoides).
//   3. `optional` permite alternar productos (p.ej. ceramid_gel
//      como sustituto del CeraVe Moisturizing en PM).
//   4. Pasos sin `productId` son acciones puras (ducha, aclarar).
// ═══════════════════════════════════════════════════════════

export type RoutineSlot = 'am' | 'pm';

export type RoutineMode =
  | 'normal'           // Rutina diaria estándar
  | 'acne_treatment'   // Deriva-C activo: simplificar PM, mantener SPF AM
  | 'flare_strong'     // Brote severo: rescate con corticoide + tacroz, NADA de activos
  | 'flare_mild'       // Brote leve: solo tacroz, hidratación máxima
  | 'recovery';        // Post-brote: reconstrucción de barrera, sin activos aún

export interface RoutineStep {
  /** ID del producto en el catálogo. `null` para acciones puras. */
  productId: string | null;
  /** Verbo corto: "Ducha", "Limpiar", "Aplicar", "Sellar". */
  action: string;
  /** Estado de la piel al aplicar este paso. */
  applySkinState?: 'damp' | 'dry' | 'wet';
  /** Notas específicas del paso. */
  note?: string;
  /** Pasos opcionales o intercambiables. */
  optional?: boolean;
  /** Si es un paso intercambiable, agrupar con otros del mismo `swapGroup`. */
  swapGroup?: string;
}

export interface Routine {
  slot: RoutineSlot;
  mode: RoutineMode;
  steps: RoutineStep[];
  /** Resumen de qué cambia respecto a la rutina `normal`. */
  rationale?: string;
}

// ═══════════════════════════════════════════════════════════
// MAÑANA (AM)
// ═══════════════════════════════════════════════════════════

const AM_NORMAL: Routine = {
  slot: 'am',
  mode: 'normal',
  steps: [
    { productId: null, action: 'Ducha tibia (no caliente)', note: 'Calor extremo daña barrera atópica.' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar la cara', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'bioderma_sensibio_defensive', action: 'Aplicar Sensibio Defensive Serum', applySkinState: 'damp' },
    {
      productId: 'ceramid_gel_siegfried',
      action: 'Ceramid Gel (versión ligera)',
      applySkinState: 'damp',
      swapGroup: 'am_moisturizer',
      note: 'Variante ligera para clima húmedo o piel oily; el SPF lo pone Avène Fluide.',
    },
    {
      productId: 'cerave_am_spf30',
      action: 'CeraVe AM Lotion SPF 30',
      applySkinState: 'dry',
      swapGroup: 'am_moisturizer',
      note: 'Variante rica con SPF integrado · default.',
    },
    { productId: 'avene_ultra_fluid_spf50', action: 'Avène Ultra-Fluide SPF 50+', applySkinState: 'dry', note: 'Refuerzo SPF como última capa AM.' },
    { productId: 'bioderma_sensibio_eye', action: 'Sensibio Eye en contorno', applySkinState: 'dry', swapGroup: 'eye_care' },
    { productId: 'cerave_eye_repair', action: 'CeraVe Eye Repair (alternativa rica)', applySkinState: 'dry', swapGroup: 'eye_care' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry', optional: true },
  ],
};

const AM_ACNE_TREATMENT: Routine = {
  slot: 'am',
  mode: 'acne_treatment',
  rationale: 'Adapaleno fotosensibiliza → SPF 50+ obligatorio; rutina mínima para no saturar.',
  steps: [
    { productId: null, action: 'Ducha tibia' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar la cara', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'cerave_am_spf30', action: 'CeraVe AM Lotion SPF 30', applySkinState: 'damp' },
    { productId: 'avene_ultra_fluid_spf50', action: 'Avène Ultra-Fluide SPF 50+ (obligatorio)', applySkinState: 'dry' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios (retinoide reseca)', applySkinState: 'dry' },
  ],
};

const AM_FLARE_STRONG: Routine = {
  slot: 'am',
  mode: 'flare_strong',
  rationale: 'Brote severo: rescate. Loratadina por la noche del día anterior; AM solo barrera + corticoide donde toca.',
  steps: [
    { productId: null, action: 'Ducha tibia corta (≤ 5 min)', note: 'Agua larga empeora atopia.' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave (sin frotar)', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal · 30 s contacto', applySkinState: 'damp' },
    { productId: 'dermovate_ointment', action: 'Dermovate capa MUY fina · zonas gruesas en brote', applySkinState: 'damp', note: 'NO en cara, pliegues. Máx 2 sem seguidas.' },
    { productId: 'tacroz_forte', action: 'Tacroz Forte · zonas finas (cara, párpados)', applySkinState: 'damp' },
    { productId: 'cerave_moisturizing_cream', action: 'CeraVe Moisturizing · sello rico (sí en AM hoy)', applySkinState: 'damp' },
    { productId: 'avene_ultra_fluid_spf50', action: 'Avène Ultra-Fluide SPF 50+', applySkinState: 'dry', note: 'Tacroz/Dermovate fotosensibilizan.' },
  ],
};

const AM_FLARE_MILD: Routine = {
  slot: 'am',
  mode: 'flare_mild',
  rationale: 'Brote leve: solo tacroz puntual, sin corticoide; resto de rutina suave.',
  steps: [
    { productId: null, action: 'Ducha tibia' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'tacroz_forte', action: 'Tacroz · solo en zonas activas', applySkinState: 'damp' },
    { productId: 'bioderma_sensibio_defensive', action: 'Sensibio Defensive Serum (resto de cara)', applySkinState: 'damp' },
    { productId: 'cerave_am_spf30', action: 'CeraVe AM SPF 30', applySkinState: 'dry' },
    { productId: 'avene_ultra_fluid_spf50', action: 'Avène Ultra-Fluide SPF 50+', applySkinState: 'dry' },
  ],
};

const AM_RECOVERY: Routine = {
  slot: 'am',
  mode: 'recovery',
  rationale: 'Post-brote: rojo cediendo, escamas en resolución. Reconstrucción de barrera, todavía sin activos.',
  steps: [
    { productId: null, action: 'Ducha tibia corta' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'bioderma_sensibio_defensive', action: 'Sensibio Defensive Serum', applySkinState: 'damp' },
    { productId: 'avene_cicalfate_plus', action: 'Cicalfate+ en zonas que estuvieron rotas', applySkinState: 'damp', optional: true },
    { productId: 'cerave_moisturizing_cream', action: 'CeraVe Moisturizing (sello rico)', applySkinState: 'damp' },
    { productId: 'avene_ultra_fluid_spf50', action: 'Avène Ultra-Fluide SPF 50+', applySkinState: 'dry' },
  ],
};

// ═══════════════════════════════════════════════════════════
// NOCHE (PM)
// ═══════════════════════════════════════════════════════════

const PM_NORMAL: Routine = {
  slot: 'pm',
  mode: 'normal',
  steps: [
    { productId: null, action: 'Ducha tibia' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar la cara', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'bioderma_sensibio_defensive', action: 'Sensibio Defensive Serum (sobre piel mojada)', applySkinState: 'damp' },
    {
      productId: 'ceramid_gel_siegfried',
      action: 'Ceramid Gel (versión ligera)',
      applySkinState: 'damp',
      swapGroup: 'pm_moisturizer',
      note: 'Variante ligera para clima húmedo o piel oily.',
    },
    {
      productId: 'cerave_moisturizing_cream',
      action: 'Sellar con CeraVe Moisturizing Cream',
      applySkinState: 'damp',
      swapGroup: 'pm_moisturizer',
      note: 'Variante rica con ceramidas · default.',
    },
    { productId: 'bioderma_sensibio_eye', action: 'Contorno de ojos', applySkinState: 'dry', swapGroup: 'eye_care' },
    { productId: 'cerave_eye_repair', action: 'CeraVe Eye Repair (alternativa rica)', applySkinState: 'dry', swapGroup: 'eye_care' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry' },
    { productId: 'castor_oil_paracelso', action: 'Aceite de ricino (pestañas/cejas)', optional: true },
  ],
};

const PM_ACNE_TREATMENT: Routine = {
  slot: 'pm',
  mode: 'acne_treatment',
  rationale: 'Deriva-C en curso: PM se simplifica, sin otras cremas que interfieran ni layering pesado.',
  steps: [
    { productId: null, action: 'Ducha tibia' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar la cara', applySkinState: 'wet', note: 'Esperar 15-20 min antes del retinoide para piel SECA.' },
    { productId: 'deriva_c_micro', action: 'Deriva-C Micro · capa fina', applySkinState: 'dry', note: 'Evitar ojos, labios, comisuras y cuello.' },
    { productId: 'cerave_pm_lotion', action: 'CeraVe PM Lotion (esperar 10 min tras Deriva-C)', applySkinState: 'dry', note: 'Buffer para reducir irritación retinoide.' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry' },
  ],
};

const PM_FLARE_STRONG: Routine = {
  slot: 'pm',
  mode: 'flare_strong',
  rationale: 'Mismo esquema AM aplicado en PM: corticoide en gruesos, tacroz en finos, sello rico, sin activos.',
  steps: [
    { productId: null, action: 'Ducha tibia corta' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'dermovate_ointment', action: 'Dermovate capa MUY fina · zonas gruesas', applySkinState: 'damp' },
    { productId: 'tacroz_forte', action: 'Tacroz Forte · zonas finas (cara, párpados)', applySkinState: 'damp' },
    { productId: 'cerave_moisturizing_cream', action: 'CeraVe Moisturizing · sello generoso', applySkinState: 'damp' },
    { productId: 'bioderma_atoderm_sos_spray', action: 'Atoderm SOS Spray si pica de noche', optional: true },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry' },
  ],
};

const PM_FLARE_MILD: Routine = {
  slot: 'pm',
  mode: 'flare_mild',
  rationale: 'Brote leve: tacroz puntual, capas hidratantes, sin activos.',
  steps: [
    { productId: null, action: 'Ducha tibia' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'tacroz_forte', action: 'Tacroz · solo zonas activas', applySkinState: 'damp' },
    { productId: 'bioderma_sensibio_defensive', action: 'Sensibio Defensive Serum (resto)', applySkinState: 'damp' },
    { productId: 'cerave_moisturizing_cream', action: 'CeraVe Moisturizing · sello', applySkinState: 'damp' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry' },
  ],
};

const PM_RECOVERY: Routine = {
  slot: 'pm',
  mode: 'recovery',
  rationale: 'Post-brote: foco en barrera. Mantener tacroz puntual si quedan focos; reintroducir activos en 7-10 días.',
  steps: [
    { productId: null, action: 'Ducha tibia corta' },
    { productId: 'eucerin_dermatoclean_gel', action: 'Limpiar suave', applySkinState: 'wet' },
    { productId: 'avene_thermal_spring_water', action: 'Spray agua termal', applySkinState: 'damp' },
    { productId: 'tacroz_forte', action: 'Tacroz · solo focos residuales', applySkinState: 'damp', optional: true },
    { productId: 'bioderma_sensibio_defensive', action: 'Sensibio Defensive Serum', applySkinState: 'damp' },
    { productId: 'avene_cicalfate_plus', action: 'Cicalfate+ en zonas roturadas', applySkinState: 'damp', optional: true },
    { productId: 'cerave_moisturizing_cream', action: 'CeraVe Moisturizing · sello generoso', applySkinState: 'damp' },
    { productId: 'eucerin_aquaphor_lip', action: 'Aquaphor labios', applySkinState: 'dry' },
  ],
};

// ═══════════════════════════════════════════════════════════
// ÍNDICE Y HELPERS
// ═══════════════════════════════════════════════════════════

export const ROUTINES: Record<`${RoutineSlot}_${RoutineMode}`, Routine> = {
  am_normal: AM_NORMAL,
  am_acne_treatment: AM_ACNE_TREATMENT,
  am_flare_strong: AM_FLARE_STRONG,
  am_flare_mild: AM_FLARE_MILD,
  am_recovery: AM_RECOVERY,
  pm_normal: PM_NORMAL,
  pm_acne_treatment: PM_ACNE_TREATMENT,
  pm_flare_strong: PM_FLARE_STRONG,
  pm_flare_mild: PM_FLARE_MILD,
  pm_recovery: PM_RECOVERY,
};

export function routineFor(slot: RoutineSlot, mode: RoutineMode): Routine {
  return ROUTINES[`${slot}_${mode}`];
}
