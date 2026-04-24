// ═══════════════════════════════════════════════════════
// theme.ts · sunrise palette + stage interpolation
// Exposes the v8 design tokens as plain JS constants and a
// `getStageColors(missionIndex)` helper used by
// GradientBackground.tsx / ProtocolScreen / SummaryScreen
// so the whole app's tint shifts from night → full dawn as
// the user progresses through the 13 phases.
// ═══════════════════════════════════════════════════════

export const SUNRISE = {
  night:      '#0b0618',
  predawn1:   '#1b0f2e',
  predawn2:   '#3a1e3e',
  dawn1:      '#6b2c3d',
  dawn2:      '#c4612d',
  rise1:      '#e08a3c',
  rise2:      '#f4c267',
  fulllight:  '#fde9b8',
  cool:       '#8ec5e8',
} as const;

export const SUNRISE_TEXT = {
  primary:  'rgba(255,250,240,0.94)',
  soft:     'rgba(255,250,240,0.68)',
  muted:    'rgba(255,250,240,0.42)',
  divider:  'rgba(255,250,240,0.10)',
} as const;

// ─── Stage colour pairs (top → bottom of the radial gradient) ───────
// 13 entries for 13 missions plus a "welcome" pair used before INICIAR
// and a "fulllight" pair used on the SummaryScreen.
// Gradient direction: top/sky colour -> bottom/horizon colour.

export interface StageColors {
  /** Top-of-screen sky colour (darker). */
  sky: string;
  /** Bottom-of-screen horizon colour (warmer). */
  horizon: string;
  /** Accent colour for CTAs, progress rings, highlights. */
  accent: string;
  /** Subtle particle colour for the gradient background canvas. */
  particle: string;
}

// Light-Awake principle: the light RISES from the horizon. The sky at
// the top of the screen stays in "twilight" across every phase so the
// text area (which always lives at the top) keeps its contrast. The
// sense of progress is conveyed by:
//   - a brighter HORIZON that glows further up the screen as phases
//     advance (handled by GradientBackground gradient stops)
//   - a warmer ACCENT (CTAs, progress rings, particles)
//   - more particles / stronger horizon overlay
// The SKY colour is capped at `predawn2` (a deep warm-grey). Anything
// lighter at the top breaks legibility of the cream text.
const STAGES: Record<'welcome' | 'complete' | number, StageColors> = {
  welcome: {
    sky: SUNRISE.night,
    horizon: SUNRISE.predawn1,
    accent: SUNRISE.rise2,
    particle: SUNRISE.rise2,
  },
  0:  { sky: SUNRISE.night,    horizon: SUNRISE.predawn1, accent: SUNRISE.rise2,     particle: SUNRISE.rise2 },
  1:  { sky: SUNRISE.night,    horizon: SUNRISE.predawn2, accent: SUNRISE.rise2,     particle: SUNRISE.rise2 },
  2:  { sky: SUNRISE.predawn1, horizon: SUNRISE.predawn2, accent: SUNRISE.rise1,     particle: SUNRISE.rise2 },
  3:  { sky: SUNRISE.predawn1, horizon: SUNRISE.dawn1,    accent: SUNRISE.rise1,     particle: SUNRISE.rise1 },
  4:  { sky: SUNRISE.predawn1, horizon: SUNRISE.dawn1,    accent: SUNRISE.rise1,     particle: SUNRISE.rise1 },
  5:  { sky: SUNRISE.predawn2, horizon: SUNRISE.dawn2,    accent: SUNRISE.rise1,     particle: SUNRISE.rise2 },
  6:  { sky: SUNRISE.predawn2, horizon: SUNRISE.dawn2,    accent: SUNRISE.rise2,     particle: SUNRISE.rise2 },
  7:  { sky: SUNRISE.predawn2, horizon: SUNRISE.rise1,    accent: SUNRISE.rise2,     particle: SUNRISE.rise2 },
  8:  { sky: SUNRISE.predawn2, horizon: SUNRISE.rise1,    accent: SUNRISE.rise2,     particle: SUNRISE.fulllight },
  9:  { sky: SUNRISE.predawn2, horizon: SUNRISE.rise2,    accent: SUNRISE.fulllight, particle: SUNRISE.fulllight },
  10: { sky: SUNRISE.predawn2, horizon: SUNRISE.rise2,    accent: SUNRISE.fulllight, particle: SUNRISE.fulllight },
  11: { sky: SUNRISE.predawn2, horizon: SUNRISE.fulllight,accent: SUNRISE.fulllight, particle: SUNRISE.fulllight },
  12: { sky: SUNRISE.predawn2, horizon: SUNRISE.fulllight,accent: SUNRISE.fulllight, particle: SUNRISE.fulllight },
  complete: {
    sky: SUNRISE.predawn2,
    horizon: SUNRISE.fulllight,
    accent: SUNRISE.fulllight,
    particle: SUNRISE.fulllight,
  },
};

/**
 * Returns the stage colours for a given mission index (0-12), or the
 * special 'welcome' / 'complete' stages. Clamps out-of-range indices.
 */
export function getStageColors(stage: number | 'welcome' | 'complete'): StageColors {
  if (stage === 'welcome' || stage === 'complete') return STAGES[stage];
  const clamped = Math.max(0, Math.min(12, Math.floor(stage)));
  return STAGES[clamped];
}

/** Convert a hex colour to an rgba() string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Linear interpolate two hex colours by t in [0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ar = parseInt(pa.slice(0, 2), 16);
  const ag = parseInt(pa.slice(2, 4), 16);
  const ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16);
  const bg = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * clamp);
  const g = Math.round(ag + (bg - ag) * clamp);
  const b2 = Math.round(ab + (bb - ab) * clamp);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
}
