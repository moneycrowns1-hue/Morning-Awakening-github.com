'use client';

// ═══════════════════════════════════════════════════════════════
// appTheme.ts · selector global pareado día + noche.
//
// Punto único de verdad para "qué paleta visual está activa".
// Internamente reusa el mismo storage key que useNightPalette
// (`ma.night.palette`) para que cambiar paleta desde Settings o
// desde el Welcome de noche se sincronice instantáneamente.
//
// Cada paleta es un PAR: una versión nocturna (oscura, melatonin-
// safe) y una versión diurna (clara) con la misma "ánima" cromática.
// Los componentes deciden cuál consumir según su contexto:
//
//   const { day, night } = useAppTheme();
//   // pantalla de día → use day.paper / day.accent / dayText.primary
//   // pantalla de noche → use night.void / night.amber / nightText.primary
//
// Esto permite migrar pantallas de a una sin romper las demás.
// ═══════════════════════════════════════════════════════════════

import {
  useNightPalette,
  type NightPaletteId,
  type NightPalette,
  type NightPaletteText,
  type NightPaletteOption,
} from '@/lib/night/nightPalette';
import {
  DAY_EMBER,    DAY_EMBER_TEXT,
  DAY_COCOA,    DAY_COCOA_TEXT,
  DAY_OXBLOOD,  DAY_OXBLOOD_TEXT,
  DAY_FOREST,   DAY_FOREST_TEXT,
  DAY_PEARL,    DAY_PEARL_TEXT,
  type DayPalette,
  type DayPaletteText,
} from './dayPalette';

// ─── Shapes basadas en CSS vars ───────────────────────────────
// Todos los componentes que consumen useAppTheme() (o D / N / DT /
// NT) reciben siempre estos objetos: las CLAVES son las mismas que
// las paletas literales, pero los VALORES son `'var(--ma-...)'`.
// El valor real lo resuelve el navegador en pintado, alimentado por
// `<PaletteBridge />` que escribe el hex correcto según
// (paletaFamilia activa, modo día/noche).
//
// Sí: `D` y `N` apuntan a las MISMAS vars. La diferencia día↔noche
// no la decide el componente, la decide el modo global. Eso es
// exactamente lo que pide el toggle: aplastar día → todo claro,
// aplastar noche → todo oscuro.
const DAY_VARS: DayPalette = {
  paper:        'var(--ma-bg)',
  tint_deep:    'var(--ma-bg-deep)',
  tint:         'var(--ma-bg-card)',
  tint_strong:  'var(--ma-bg-elevated)',
  accent:       'var(--ma-accent)',
  accent_soft:  'var(--ma-accent-soft)',
  accent_deep:  'var(--ma-accent-deep)',
  accent_warm:  'var(--ma-accent-warm)',
  ink:          'var(--ma-ink)',
};
const DAY_TEXT_VARS: DayPaletteText = {
  primary: 'var(--ma-text-primary)',
  soft:    'var(--ma-text-soft)',
  muted:   'var(--ma-text-muted)',
  divider: 'var(--ma-text-divider)',
};
const NIGHT_VARS: NightPalette = {
  void:        'var(--ma-bg)',
  ember_deep:  'var(--ma-bg-deep)',
  ember_1:     'var(--ma-bg-card)',
  ember_2:     'var(--ma-bg-elevated)',
  amber:       'var(--ma-accent)',
  amber_glow:  'var(--ma-accent-soft)',
  amber_deep:  'var(--ma-accent-deep)',
  candle:      'var(--ma-accent-warm)',
  cream:       'var(--ma-ink)',
};
const NIGHT_TEXT_VARS: NightPaletteText = {
  primary: 'var(--ma-text-primary)',
  soft:    'var(--ma-text-soft)',
  muted:   'var(--ma-text-muted)',
  divider: 'var(--ma-text-divider)',
};

export interface AppThemePair {
  id: NightPaletteId;
  label: string;
  hint: string;
  /** Paleta clara para pantallas día. */
  day: DayPalette;
  /** Texto día (tinta oscura sobre paper). */
  dayText: DayPaletteText;
  /** Paleta oscura para pantallas noche. */
  night: NightPalette;
  /** Texto noche (cream sobre void). */
  nightText: NightPaletteText;
}

/**
 * Mapeo (familia de paleta → hex literales día). Lo consume
 * `<PaletteBridge />` y `getDayPalette` para escribir CSS vars,
 * NO los componentes (que ya reciben formas con `var(...)`).
 */
export const DAY_BY_ID: Record<NightPaletteId, { palette: DayPalette; text: DayPaletteText }> = {
  calm:    { palette: DAY_EMBER,   text: DAY_EMBER_TEXT },
  cocoa:   { palette: DAY_COCOA,   text: DAY_COCOA_TEXT },
  oxblood: { palette: DAY_OXBLOOD, text: DAY_OXBLOOD_TEXT },
  forest:  { palette: DAY_FOREST,  text: DAY_FOREST_TEXT },
  pearl:   { palette: DAY_PEARL,   text: DAY_PEARL_TEXT },
};

/**
 * Hook unificado de tema de aplicación.
 *
 * Devuelve la pareja completa día+noche para la paleta activa,
 * además del setter compartido con useNightPalette y la lista de
 * opciones (para construir pickers).
 *
 * Se mantiene en sync automáticamente entre pestañas (storage event)
 * y entre componentes hermanos (custom event ma:night-palette-change).
 */
export function useAppTheme(): {
  id: NightPaletteId;
  setId: (id: NightPaletteId) => void;
  day: DayPalette;
  dayText: DayPaletteText;
  night: NightPalette;
  nightText: NightPaletteText;
  options: NightPaletteOption[];
  pair: AppThemePair;
} {
  const { id, setId, options } = useNightPalette();
  const opt = options.find((o) => o.id === id) ?? options[0];

  const pair: AppThemePair = {
    id,
    label: opt.label,
    hint: opt.hint,
    day: DAY_VARS,
    dayText: DAY_TEXT_VARS,
    night: NIGHT_VARS,
    nightText: NIGHT_TEXT_VARS,
  };

  return {
    id,
    setId,
    day: DAY_VARS,
    dayText: DAY_TEXT_VARS,
    night: NIGHT_VARS,
    nightText: NIGHT_TEXT_VARS,
    options,
    pair,
  };
}

// ─── Helpers fuera de React ─────────────────────────────────────

export function getDayPalette(id: NightPaletteId): { palette: DayPalette; text: DayPaletteText } {
  return DAY_BY_ID[id] ?? DAY_BY_ID.calm;
}
