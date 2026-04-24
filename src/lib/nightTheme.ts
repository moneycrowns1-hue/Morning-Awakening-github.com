// ═══════════════════════════════════════════════════════
// nightTheme.ts · night-protocol palette (violet → rose)
// Mirror of theme.ts, but for the nocturnal protocol.
// Night goes the OPPOSITE direction: you start at dusk
// (warm rose still on the horizon) and sink into abyss
// (deep violet) as phases progress toward SLUMBER.
// ═══════════════════════════════════════════════════════

import type { StageColors } from './theme';

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

// ─── 8 night stages (wind-down → integration → surrender) ───
// Progresses from "still rosy" to "pure abyss".
const STAGES: Record<'welcome' | 'slumber' | number, StageColors> = {
  welcome:  { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // tsuki — cierre del día, aún hay algo de rosa
  0: { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // nocte — cena/integración
  1: { sky: NIGHT.violet_1, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // terra — caminar
  2: { sky: NIGHT.violet_2, horizon: NIGHT.dusk_rose, accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // thermo — ducha caliente
  3: { sky: NIGHT.violet_2, horizon: NIGHT.violet_1,  accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  // stillness — respiración
  4: { sky: NIGHT.violet_1, horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  // scribe — journal
  5: { sky: NIGHT.violet_1, horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_halo },
  // reverie — lectura
  6: { sky: NIGHT.abyss,    horizon: NIGHT.violet_1,  accent: NIGHT.moon_halo, particle: NIGHT.moon_core },
  // slumber placeholder (entrance to lock screen)
  7: { sky: NIGHT.abyss,    horizon: NIGHT.abyss,     accent: NIGHT.moon_core, particle: NIGHT.moon_core },
  slumber: { sky: NIGHT.abyss, horizon: NIGHT.abyss,  accent: NIGHT.moon_core, particle: NIGHT.moon_core },
};

export function getNightStageColors(stage: number | 'welcome' | 'slumber'): StageColors {
  if (stage === 'welcome' || stage === 'slumber') return STAGES[stage];
  const clamped = Math.max(0, Math.min(7, Math.floor(stage)));
  return STAGES[clamped];
}
