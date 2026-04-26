// ═══════════════════════════════════════════════════════
// nightTheme.ts · night-protocol palette (violet → rose)
// Mirror of theme.ts, but for the nocturnal protocol.
// Night goes the OPPOSITE direction: you start at dusk
// (warm rose still on the horizon) and sink into abyss
// (deep violet) as phases progress toward SLUMBER.
// ═══════════════════════════════════════════════════════

import type { StageColors } from '../common/theme';

export const NIGHT = {
  abyss:     '#0a0614',
  violet_1:  '#1a0f3a',
  violet_2:  '#2d1658',
  dusk_rose: '#6b2c8f',
  moon_core: '#d9a3ff',
  moon_halo: '#f4c2ff',
  petal:     '#ffd4e5',
} as const;

export const NIGHT_TEXT = {
  primary: 'rgba(245,230,255,0.94)',
  soft:    'rgba(245,230,255,0.68)',
  muted:   'rgba(245,230,255,0.42)',
  divider: 'rgba(245,230,255,0.10)',
} as const;

// ─── 10 night stages · TÉRMINUS ───
// Progresa de "aún rosa en el horizonte" a "abismo puro".
//   0 CLAUSURA · 1 ÓPTICA · 2 SEQUÍA
//   3 TERMINUS · 4 AEGIS  · 5 THERMA  · 6 HYGIENE
//   7 KATHARSIS · 8 PARASÍMPATO
//   9 STASIS
const STAGES: Record<'welcome' | 'slumber' | number, StageColors> = {
  welcome:  { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // Bloque 0 · cierre metabólico — atardecer violeta cálido
  0: { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  1: { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  2: { sky: NIGHT.violet_2, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // Bloque 1 · descompresión — violeta medio
  3: { sky: NIGHT.violet_2, horizon: NIGHT.violet_1,  accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  4: { sky: NIGHT.violet_2, horizon: NIGHT.violet_1,  accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  5: { sky: NIGHT.violet_1, horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  6: { sky: NIGHT.violet_1, horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  // Bloque 2 · santuario (ámbar) — abismo con luna viva
  7: { sky: NIGHT.abyss,    horizon: NIGHT.violet_1,  accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  8: { sky: NIGHT.abyss,    horizon: NIGHT.violet_1,  accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // Bloque 3 · apagado neuronal — abismo puro
  9: { sky: NIGHT.abyss,    horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_core },
  slumber: { sky: NIGHT.abyss, horizon: NIGHT.abyss,  accent: NIGHT.moon_core, particle: NIGHT.moon_core },
};

export function getNightStageColors(stage: number | 'welcome' | 'slumber'): StageColors {
  if (stage === 'welcome' || stage === 'slumber') return STAGES[stage];
  const clamped = Math.max(0, Math.min(9, Math.floor(stage)));
  return STAGES[clamped];
}
