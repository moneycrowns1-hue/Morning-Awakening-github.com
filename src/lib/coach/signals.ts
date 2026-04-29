// ═══════════════════════════════════════════════════════════
// signals.ts · capa de señales auto-reportadas (1-tap check-in)
//
// El usuario marca tres ejes opcionales por día:
//   · skinFeel  → cómo se siente la piel (single-select)
//   · sleep     → cómo durmió
//   · stress    → nivel de estrés
//
// El motor del coach LEE estas señales y modula prioridades:
// más calma cuando la piel se siente reactiva, más respiración
// y meditación cuando el sueño fue pobre, bruxism crítico
// cuando el estrés está alto, etc.
//
// Persistencia: 1 entrada por fecha (YYYY-MM-DD). Si no hay
// entrada para hoy, los consumidores aplican `DEFAULT_SIGNALS`.
// ═══════════════════════════════════════════════════════════

export type SkinFeel =
  | 'good'
  | 'neutral'
  | 'tight'
  | 'red'
  | 'itchy'
  | 'oily'
  | 'flaky'
  | 'stinging';

export type Sleep = 'poor' | 'avg' | 'good';

export type Stress = 'low' | 'mid' | 'high';

export interface DailyCheckIn {
  /** Fecha YYYY-MM-DD de esta entrada. */
  dateISO: string;
  skinFeel?: SkinFeel;
  sleep?: Sleep;
  stress?: Stress;
  /** ISO datetime de la última actualización. */
  submittedAt?: string;
}

/** Defaults silenciosos cuando el usuario no marca nada. */
export const DEFAULT_SIGNALS = {
  skinFeel: 'neutral' as SkinFeel,
  sleep: 'avg' as Sleep,
  stress: 'mid' as Stress,
} as const;

/** Retrieve resolved signals (fills missing axes with defaults). */
export interface ResolvedSignals {
  skinFeel: SkinFeel;
  sleep: Sleep;
  stress: Stress;
  /** ¿El usuario llegó a marcar al menos un eje hoy? */
  hasUserInput: boolean;
}

export function resolveSignals(checkIn: DailyCheckIn | null): ResolvedSignals {
  return {
    skinFeel: checkIn?.skinFeel ?? DEFAULT_SIGNALS.skinFeel,
    sleep: checkIn?.sleep ?? DEFAULT_SIGNALS.sleep,
    stress: checkIn?.stress ?? DEFAULT_SIGNALS.stress,
    hasUserInput: Boolean(
      checkIn && (checkIn.skinFeel || checkIn.sleep || checkIn.stress),
    ),
  };
}

/** True si la entrada corresponde a la fecha indicada y trae al menos un campo. */
export function isCheckedInToday(
  checkIn: DailyCheckIn | null,
  dateISO: string,
): boolean {
  if (!checkIn || checkIn.dateISO !== dateISO) return false;
  return Boolean(checkIn.skinFeel || checkIn.sleep || checkIn.stress);
}

// ───────────────────────────────────────────────────────────
// Etiquetas humanas para UI
// ───────────────────────────────────────────────────────────

export const SKIN_FEEL_LABEL: Record<SkinFeel, string> = {
  good:      'bien',
  neutral:   'normal',
  tight:     'tirante',
  red:       'roja',
  itchy:     'pica',
  oily:      'grasa',
  flaky:     'descama',
  stinging:  'arde',
};

export const SLEEP_LABEL: Record<Sleep, string> = {
  poor: 'mal',
  avg:  'regular',
  good: 'bien',
};

export const STRESS_LABEL: Record<Stress, string> = {
  low:  'bajo',
  mid:  'medio',
  high: 'alto',
};

/** Orden visual de chips para skin-feel (positivo → negativo). */
export const SKIN_FEEL_ORDER: SkinFeel[] = [
  'good', 'neutral', 'tight', 'flaky', 'oily', 'red', 'itchy', 'stinging',
];

export const SLEEP_ORDER: Sleep[] = ['poor', 'avg', 'good'];
export const STRESS_ORDER: Stress[] = ['low', 'mid', 'high'];

// ───────────────────────────────────────────────────────────
// Helpers para el motor (mapping a "necesidades" cosméticas)
// ───────────────────────────────────────────────────────────

/**
 * Mapea un `SkinFeel` a una `need` consumida por
 * `coachEngine.suggestByNeed()`. `null` cuando no hay un mapeo
 * útil (estados positivos / neutrales).
 */
export function skinFeelToNeed(
  feel: SkinFeel,
): 'tightness' | 'flake' | 'redness' | 'oiliness' | 'sting' | null {
  switch (feel) {
    case 'tight':    return 'tightness';
    case 'flaky':    return 'flake';
    case 'red':      return 'redness';
    case 'itchy':    return 'redness'; // mismo bucket: calmantes
    case 'oily':     return 'oiliness';
    case 'stinging': return 'sting';
    case 'good':
    case 'neutral':
      return null;
  }
}

/**
 * Indica si un `SkinFeel` debería degradar el modo a "calm"
 * — sin activos aunque la rutina base los traiga.
 */
export function isReactiveFeel(feel: SkinFeel): boolean {
  return feel === 'red' || feel === 'itchy' || feel === 'stinging';
}
