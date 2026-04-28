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

const DAY_BY_ID: Record<NightPaletteId, { palette: DayPalette; text: DayPaletteText }> = {
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
  const { id, setId, palette: night, paletteText: nightText, options } = useNightPalette();
  const dayBundle = DAY_BY_ID[id];
  const opt = options.find((o) => o.id === id) ?? options[0];

  const pair: AppThemePair = {
    id,
    label: opt.label,
    hint: opt.hint,
    day: dayBundle.palette,
    dayText: dayBundle.text,
    night,
    nightText,
  };

  return {
    id,
    setId,
    day: dayBundle.palette,
    dayText: dayBundle.text,
    night,
    nightText,
    options,
    pair,
  };
}

// ─── Helpers fuera de React ─────────────────────────────────────

export function getDayPalette(id: NightPaletteId): { palette: DayPalette; text: DayPaletteText } {
  return DAY_BY_ID[id] ?? DAY_BY_ID.calm;
}
