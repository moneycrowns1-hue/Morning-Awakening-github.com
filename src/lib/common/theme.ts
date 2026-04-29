// ═══════════════════════════════════════════════════════
// theme.ts · design tokens + stage interpolation
//
// Los exports SUNRISE / SUNRISE_TEXT son ahora STRINGS DE
// CSS VARIABLES, no hex literales. Los valores reales los
// inyecta `<PaletteBridge />` en `document.documentElement`
// según (paletaFamilia, modo). Esto permite que toda la app
// reaccione al toggle día↔noche y al picker de paleta sin
// necesidad de re-renderizar nada en React: el navegador
// resuelve `var(--ma-bg)` etc. en tiempo de pintado.
//
// Uso preexistente: `style={{ background: SUNRISE.night }}`
// → emite `background: var(--ma-bg)` → resuelto por CSS.
// `hexToRgba(SUNRISE.rise2, 0.4)` → detecta `var(...)` y
// produce `color-mix(in srgb, var(--ma-accent) 40%, transparent)`.
//
// Mapping legacy SUNRISE → vars semánticas (válido en ambos
// modos):
//   night     → --ma-bg            (fondo principal)
//   predawn1  → --ma-bg-deep       (presionado profundo)
//   predawn2  → --ma-bg-card       (glass card)
//   dawn1     → --ma-bg-elevated   (glass elevado)
//   dawn2     → --ma-accent-deep   (border activo)
//   rise1     → --ma-accent-warm   (acento cálido)
//   rise2     → --ma-accent        (acento principal · CTA)
//   fulllight → --ma-ink           (highlight texto)
//   cool      → --ma-accent-soft   (frío / soft)
// ═══════════════════════════════════════════════════════

export const SUNRISE = {
  night:      'var(--ma-bg)',
  predawn1:   'var(--ma-bg-deep)',
  predawn2:   'var(--ma-bg-card)',
  dawn1:      'var(--ma-bg-elevated)',
  dawn2:      'var(--ma-accent-deep)',
  rise1:      'var(--ma-accent-warm)',
  rise2:      'var(--ma-accent)',
  fulllight:  'var(--ma-ink)',
  cool:       'var(--ma-accent-soft)',
} as const;

export const SUNRISE_TEXT = {
  primary:  'var(--ma-text-primary)',
  soft:     'var(--ma-text-soft)',
  muted:    'var(--ma-text-muted)',
  divider:  'var(--ma-text-divider)',
} as const;

// ─── Hex literals internos para STAGES (gradiente del protocolo) ───
// Las fases del protocolo matutino mantienen su gradiente fijo
// dawn→fulllight independientemente del toggle día/noche, porque
// representan la progresión NARRATIVA del amanecer. Usamos los hex
// originales aquí, no las vars.
const SUNRISE_HEX = {
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

/**
 * Acceso a los hex literales originales (sin pasar por CSS vars).
 * Útil para componentes que necesitan colores fijos del amanecer
 * (GradientBackground del protocolo, transiciones canvas, etc.).
 */
export const SUNRISE_LITERAL = SUNRISE_HEX;

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
    sky: SUNRISE_HEX.night,
    horizon: SUNRISE_HEX.predawn1,
    accent: SUNRISE_HEX.rise2,
    particle: SUNRISE_HEX.rise2,
  },
  0:  { sky: SUNRISE_HEX.night,    horizon: SUNRISE_HEX.predawn1, accent: SUNRISE_HEX.rise2,     particle: SUNRISE_HEX.rise2 },
  1:  { sky: SUNRISE_HEX.night,    horizon: SUNRISE_HEX.predawn2, accent: SUNRISE_HEX.rise2,     particle: SUNRISE_HEX.rise2 },
  2:  { sky: SUNRISE_HEX.predawn1, horizon: SUNRISE_HEX.predawn2, accent: SUNRISE_HEX.rise1,     particle: SUNRISE_HEX.rise2 },
  3:  { sky: SUNRISE_HEX.predawn1, horizon: SUNRISE_HEX.dawn1,    accent: SUNRISE_HEX.rise1,     particle: SUNRISE_HEX.rise1 },
  4:  { sky: SUNRISE_HEX.predawn1, horizon: SUNRISE_HEX.dawn1,    accent: SUNRISE_HEX.rise1,     particle: SUNRISE_HEX.rise1 },
  5:  { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.dawn2,    accent: SUNRISE_HEX.rise1,     particle: SUNRISE_HEX.rise2 },
  6:  { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.dawn2,    accent: SUNRISE_HEX.rise2,     particle: SUNRISE_HEX.rise2 },
  7:  { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.rise1,    accent: SUNRISE_HEX.rise2,     particle: SUNRISE_HEX.rise2 },
  8:  { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.rise1,    accent: SUNRISE_HEX.rise2,     particle: SUNRISE_HEX.fulllight },
  9:  { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.rise2,    accent: SUNRISE_HEX.fulllight, particle: SUNRISE_HEX.fulllight },
  10: { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.rise2,    accent: SUNRISE_HEX.fulllight, particle: SUNRISE_HEX.fulllight },
  11: { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.fulllight,accent: SUNRISE_HEX.fulllight, particle: SUNRISE_HEX.fulllight },
  12: { sky: SUNRISE_HEX.predawn2, horizon: SUNRISE_HEX.fulllight,accent: SUNRISE_HEX.fulllight, particle: SUNRISE_HEX.fulllight },
  complete: {
    sky: SUNRISE_HEX.predawn2,
    horizon: SUNRISE_HEX.fulllight,
    accent: SUNRISE_HEX.fulllight,
    particle: SUNRISE_HEX.fulllight,
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

/**
 * Aplica alpha a un color. Acepta tanto hex literal (`#fff`, `#aabbcc`)
 * como expresiones CSS (`var(--ma-bg)`, `color-mix(...)`, `rgb(...)`).
 *
 * - Hex → produce `rgba(r,g,b,a)` clásico.
 * - var() / color-mix / rgb / hsl → usa `color-mix(in srgb, X N%, transparent)`,
 *   soportado en Chrome 111+, Firefox 113+, Safari 16.4+ (todas modernas).
 *
 * Esto permite que `hexToRgba(SUNRISE.night, 0.5)` funcione aunque
 * `SUNRISE.night` sea ahora `'var(--ma-bg)'` y el valor real del var
 * cambie en runtime al togglear día/noche o cambiar paleta.
 */
export function hexToRgba(color: string, alpha: number): string {
  if (typeof color === 'string' && color[0] !== '#') {
    const pct = clampPct(alpha * 100);
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  }
  const h = color.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Mezcla lineal de dos colores. Acepta hex y/o expresiones CSS (var, etc.).
 * Cuando alguno de los dos no es hex, devuelve `color-mix(in srgb, A %, B)`.
 */
export function mixHex(a: string, b: string, t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  if ((a && a[0] !== '#') || (b && b[0] !== '#')) {
    const aPct = clampPct((1 - clamp) * 100);
    return `color-mix(in srgb, ${a} ${aPct}%, ${b})`;
  }
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

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const v = Math.max(0, Math.min(100, n));
  // 1 decimal max para mantener el CSS limpio
  return Math.round(v * 10) / 10;
}
