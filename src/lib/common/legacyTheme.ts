'use client';

// ═══════════════════════════════════════════════════════════════
// legacyTheme.ts · shim de compatibilidad.
//
// HISTÓRICO: Este hook nació para inyectar SUNRISE / SUNRISE_TEXT
// dinámicos en los componentes Coach + ProtocolsScreen mientras
// migrábamos al sistema de paletas. Ahora `theme.ts` exporta
// SUNRISE / SUNRISE_TEXT directamente como CSS vars (`var(--ma-bg)`,
// etc.), y `<PaletteBridge />` se encarga de escribir los valores
// reales según paleta + modo. Así que técnicamente este hook ya no
// es necesario, pero lo mantenemos como passthrough para no romper
// los componentes que ya lo invocan.
// ═══════════════════════════════════════════════════════════════

import { SUNRISE, SUNRISE_TEXT } from './theme';

export type LegacySunrise = typeof SUNRISE;
export type LegacySunriseText = typeof SUNRISE_TEXT;

export function useLegacyTheme(): { SUNRISE: LegacySunrise; SUNRISE_TEXT: LegacySunriseText } {
  return { SUNRISE, SUNRISE_TEXT };
}
