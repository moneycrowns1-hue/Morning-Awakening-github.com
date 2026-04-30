// ═══════════════════════════════════════════════════════════
// contextualHabits.ts · catálogo de micro-hábitos NUCLEUS
// que NO viven en `NUCLEUS_BLOCKS` porque sólo se activan
// cuando el `nucleusAdapter` detecta una señal contextual
// específica (stress alto, sleep debt, etc).
//
// Cada entrada está pre-asignada al bloque al que pertenece
// para que el adapter sólo tenga que decidir SI inyectarla.
// El bloque destino determina su ventana horaria narrativa,
// pero el `trigger` propio define cuándo dispara la push.
// ═══════════════════════════════════════════════════════════

import type {
  NucleusBlockId,
  NucleusMicroHabit,
} from './nucleusConstants';

/**
 * Definición de un micro-hábito contextual ya pegado al bloque
 * en el que se debe inyectar. El adapter clona la `microHabit`
 * con `contextual: true` + `contextualReason` antes de devolverla.
 */
export interface ContextualHabitDef {
  blockId: NucleusBlockId;
  microHabit: NucleusMicroHabit;
}

/**
 * Hábito de liberación de mandíbula. Se inyecta a media mañana
 * cuando el coach detectó stress alto — la tensión bucal en
 * estudiantes de medicina es uno de los primeros somatizados
 * del cortisol elevado, y un protocolo corto (30 s soltar
 * mandíbula + masaje masetero) baja el simpático medible.
 */
export const HABIT_JAW_RELEASE: ContextualHabitDef = {
  blockId: 'pre_arena',
  microHabit: {
    id: 'jaw_release_pre_arena',
    label: 'Liberación de mandíbula',
    description: '30 s soltar mandíbula + masaje masetero. Baja el simpático.',
    icon: 'Smile',
    trigger: { kind: 'once', atHHMM: '07:30' },
    notifyBody: 'Suelta la mandíbula 30 s + masaje masetero. Baja el cortisol antes de clases.',
    habitId: 'jaw_release_pre_arena',
  },
};

/**
 * Respiración 4-7-8 (Andrew Weil). 3 ciclos antes del NSDR de
 * RECARGA bajan la frecuencia cardíaca ~10 bpm y facilitan la
 * entrada a theta. Inyectar cuando hay stress alto.
 */
export const HABIT_BREATH_478: ContextualHabitDef = {
  blockId: 'recarga',
  microHabit: {
    id: 'breath_478_recarga',
    label: 'Respiración 4-7-8',
    description: '3 ciclos antes del NSDR. Activa parasimpático.',
    icon: 'Wind',
    trigger: { kind: 'once', atHHMM: '13:35' },
    notifyBody: '3 ciclos de 4-7-8 antes del NSDR. Inhala 4s · retén 7s · exhala 8s.',
    habitId: 'breath_478_recarga',
  },
};

/**
 * Exposición lumínica extra. Cuando dormiste poco, una segunda
 * dosis de luz solar a media mañana refuerza el cortisol matutino
 * truncado y consolida la fase circadiana — clave para no
 * acumular más sleep debt mañana.
 */
export const HABIT_LIGHT_EXPOSURE_EXTRA: ContextualHabitDef = {
  blockId: 'arena',
  microHabit: {
    id: 'light_exposure_extra',
    label: 'Luz solar extra · 5 min',
    description: 'Sal al patio o ventana abierta. Refuerza el pico de cortisol.',
    icon: 'Sun',
    trigger: { kind: 'once', atHHMM: '10:00' },
    notifyBody: 'Sal al sol 5 min. Refuerza el pico de cortisol que la falta de sueño aplastó.',
    habitId: 'light_exposure_extra',
  },
};

/**
 * NSDR extra dentro del MONOLITO (~14:30) cuando hay sleep debt
 * acumulada. Una segunda sesión corta (10 min) libera presión
 * adenosínica y permite mantener foco hasta las 16:30.
 */
export const HABIT_EXTRA_NSDR: ContextualHabitDef = {
  blockId: 'monolito',
  microHabit: {
    id: 'extra_nsdr_monolito',
    label: 'NSDR extra · 10 min',
    description: 'Mini-reset. Libera presión adenosínica acumulada.',
    icon: 'Waves',
    trigger: { kind: 'once', atHHMM: '14:30' },
    notifyBody: 'NSDR extra de 10 min. Reset rápido para mantener foco hasta REFUGIO.',
    habitId: 'extra_nsdr_monolito',
  },
};

/** Catálogo completo expuesto al adapter. */
export const CONTEXTUAL_HABITS = {
  jawRelease: HABIT_JAW_RELEASE,
  breath478: HABIT_BREATH_478,
  lightExposureExtra: HABIT_LIGHT_EXPOSURE_EXTRA,
  extraNsdr: HABIT_EXTRA_NSDR,
} as const;
