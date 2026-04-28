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

/**
 * NIGHT_CALM · scientifically melatonin-safe palette for the
 * Night Welcome / pre-sleep screens. Built from wavelengths
 * >580 nm (amber/warm-orange spectrum) which the ipRGCs (melanopsin
 * receptors) barely register, so they don't suppress melatonin
 * the way blue/violet does (peak suppression ~480 nm).
 *
 * Reference: Lockley & Brainard (2003), Salk Institute work on
 * ipRGCs, and the same principles behind Apple's Night Shift,
 * f.lux (warm 1900–2700K) and Kindle PaperWhite Warm light.
 *
 * The background is a deep warm umber (almost black) so total
 * lumen output stays minimal — physiologically, the eye
 * relaxes when overall brightness drops below ~50 lux.
 */
export const NIGHT_CALM = {
  /** Primary background · warm umber, near-black. Total lumens minimal. */
  void:        '#0a0604',
  /** Pressed / deepest card surface. */
  ember_deep:  '#140a06',
  /** Glass card primary background. */
  ember_1:     '#1d1009',
  /** Elevated card / hover. */
  ember_2:     '#2a1810',

  /** Primary accent · warm orange-amber (~595 nm). Melatonin-safe. */
  amber:       '#ff9a5a',
  /** Glow / highlight tint, lighter amber. */
  amber_glow:  '#ffb787',
  /** Deep amber for borders / pressed accent. */
  amber_deep:  '#cc6f3d',
  /** Hot candle accent for "active" states (~610 nm). */
  candle:      '#e85d2c',

  /** Primary text · warm cream (avoids the full-spectrum white). */
  cream:       '#f4e4d4',
} as const;

export const NIGHT_CALM_TEXT = {
  primary: 'rgba(244,228,212,0.92)',
  soft:    'rgba(244,228,212,0.68)',
  muted:   'rgba(244,228,212,0.42)',
  divider: 'rgba(244,228,212,0.08)',
} as const;

// ─── Paletas alternativas para fase-1 sandbox ────────────────────
// Todas usan las mismas keys que NIGHT_CALM (drop-in compatible).
// Todas son melatonin-safe (>580nm o niveles muy bajos de azul).

/** COCOA · cacao oscuro + dorado cremoso · velada de café */
export const NIGHT_COCOA = {
  void:        '#1a100a',
  ember_deep:  '#221610',
  ember_1:     '#2c1d14',
  ember_2:     '#3a2719',
  amber:       '#e8c46c',
  amber_glow:  '#f4d890',
  amber_deep:  '#b89540',
  candle:      '#d4a854',
  cream:       '#f0e0c8',
} as const;
export const NIGHT_COCOA_TEXT = {
  primary: 'rgba(240,224,200,0.92)',
  soft:    'rgba(240,224,200,0.68)',
  muted:   'rgba(240,224,200,0.42)',
  divider: 'rgba(240,224,200,0.08)',
} as const;

/** OXBLOOD · borgoña profundo + rose-gold · whisky bar */
export const NIGHT_OXBLOOD = {
  void:        '#150810',
  ember_deep:  '#1f0c14',
  ember_1:     '#2a121d',
  ember_2:     '#3a1828',
  amber:       '#f0a890',
  amber_glow:  '#f8c4b0',
  amber_deep:  '#c47868',
  candle:      '#d88878',
  cream:       '#f4dccc',
} as const;
export const NIGHT_OXBLOOD_TEXT = {
  primary: 'rgba(244,220,204,0.92)',
  soft:    'rgba(244,220,204,0.68)',
  muted:   'rgba(244,220,204,0.42)',
  divider: 'rgba(244,220,204,0.08)',
} as const;

/** FOREST · bosque profundo + sage gold · bonsai zen */
export const NIGHT_FOREST = {
  void:        '#0d1410',
  ember_deep:  '#121b17',
  ember_1:     '#192520',
  ember_2:     '#23332c',
  amber:       '#c4d4a8',
  amber_glow:  '#d8e4c0',
  amber_deep:  '#94a878',
  candle:      '#aabf88',
  cream:       '#e8efd8',
} as const;
export const NIGHT_FOREST_TEXT = {
  primary: 'rgba(232,239,216,0.92)',
  soft:    'rgba(232,239,216,0.68)',
  muted:   'rgba(232,239,216,0.42)',
  divider: 'rgba(232,239,216,0.08)',
} as const;

/** PEARL · grafito + perla cream · papel ahumado, editorial silencioso */
export const NIGHT_PEARL = {
  void:        '#0a0a0c',
  ember_deep:  '#101012',
  ember_1:     '#16161a',
  ember_2:     '#202024',
  amber:       '#d8d0c4',
  amber_glow:  '#e8e0d4',
  amber_deep:  '#a89c8c',
  candle:      '#c0b8ac',
  cream:       '#ece4d8',
} as const;
export const NIGHT_PEARL_TEXT = {
  primary: 'rgba(236,228,216,0.92)',
  soft:    'rgba(236,228,216,0.68)',
  muted:   'rgba(236,228,216,0.42)',
  divider: 'rgba(236,228,216,0.08)',
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
