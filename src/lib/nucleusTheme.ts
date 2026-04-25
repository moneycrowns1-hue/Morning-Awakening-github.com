// ═══════════════════════════════════════════════════════════
// nucleusTheme.ts · day-mode palette (azul solar)
//
// Mirror of theme.ts (sunrise) and nightTheme.ts (violet) — the
// daytime block lives in a blue-and-gold palette: sky deep at
// dawn → midday horizon blue → bone white at zenith → blue
// twilight at 18:00 just before TÉRMINUS takes over.
//
// Six block stages mapped to the 6 NUCLEUS macro-blocks.
// ═══════════════════════════════════════════════════════════

import type { StageColors } from './theme';
import type { NucleusBlockId } from './nucleusConstants';

export const NUCLEUS = {
  /** Cielo profundo de madrugada (06:50). */
  sky_deep:     '#0a2540',
  /** Azul medio del cielo de la mañana. */
  sky_day:      '#1e4a7a',
  /** Azul horizonte del mediodía. */
  horizon_blue: '#4a90d9',
  /** Azul claro de cielo abierto. */
  azure:        '#7cc1ff',
  /** Sol acento. */
  sun_gold:     '#ffc857',
  /** Halo cálido alrededor del sol. */
  sun_halo:     '#ffe9a8',
  /** Blanco cráneo / hueso para tipografía. */
  bone:         '#f5f5f0',
  /** Blanco azulado de nube. */
  cloud:        '#eaf4ff',
} as const;

export const NUCLEUS_TEXT = {
  primary: 'rgba(245,245,240,0.96)',
  soft:    'rgba(245,245,240,0.72)',
  muted:   'rgba(245,245,240,0.48)',
  divider: 'rgba(245,245,240,0.12)',
} as const;

// ─── 6 stages mapped to block index 0..5 ───
//   0 PRE-ARENA · cielo profundo, sol naciente.
//   1 ARENA     · azul medio, sol marcado.
//   2 RECARGA   · cenit, halo dorado.
//   3 MONOLITO  · cielo abierto, sol cálido.
//   4 REFUGIO   · cielo abierto, sol descendiendo.
//   5 SINTESIS  · azul atardecer, sol tocando horizonte.
const STAGES: Record<'idle' | 'twilight' | number, StageColors> = {
  idle:     { sky: NUCLEUS.sky_deep, horizon: NUCLEUS.sky_day,      accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  0:        { sky: NUCLEUS.sky_deep, horizon: NUCLEUS.sky_day,      accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  1:        { sky: NUCLEUS.sky_day,  horizon: NUCLEUS.horizon_blue, accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  2:        { sky: NUCLEUS.horizon_blue, horizon: NUCLEUS.azure,    accent: NUCLEUS.sun_halo, particle: NUCLEUS.cloud    },
  3:        { sky: NUCLEUS.horizon_blue, horizon: NUCLEUS.azure,    accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  4:        { sky: NUCLEUS.sky_day,  horizon: NUCLEUS.horizon_blue, accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  5:        { sky: NUCLEUS.sky_deep, horizon: NUCLEUS.sky_day,      accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
  twilight: { sky: NUCLEUS.sky_deep, horizon: NUCLEUS.sky_day,      accent: NUCLEUS.sun_gold, particle: NUCLEUS.sun_halo },
};

const BLOCK_INDEX: Record<NucleusBlockId, number> = {
  pre_arena: 0,
  arena: 1,
  recarga: 2,
  monolito: 3,
  refugio: 4,
  sintesis: 5,
};

export function getNucleusStageColors(stage: NucleusBlockId | 'idle' | 'twilight' | number): StageColors {
  if (stage === 'idle' || stage === 'twilight') return STAGES[stage];
  if (typeof stage === 'number') {
    const clamped = Math.max(0, Math.min(5, Math.floor(stage)));
    return STAGES[clamped];
  }
  return STAGES[BLOCK_INDEX[stage] ?? 0];
}

/** Convert a hex colour to an rgba() string with the given alpha. */
export function nucleusRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
