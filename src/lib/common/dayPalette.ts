// ═══════════════════════════════════════════════════════════════
// dayPalette.ts · 5 paletas diurnas pareadas 1:1 con las nocturnas.
//
// Misma "semántica" que NightPalette pero invertida en luminancia:
// fondo claro (paper) y tinta oscura. Cada paleta diurna armoniza
// tonalmente con su contraparte nocturna (mismo "ánima" cromática).
//
// Ejemplo: si elegiste OXBLOOD de noche (borgoña + rosé), de día
// verás blush rosado + terracota — la misma temperatura, pero clara.
//
// Estas paletas NO están aún cableadas a las pantallas día. Son
// data + types listos para que `useAppTheme()` los exponga; la
// migración de pantallas (ProtocolsScreen, WelcomeScreen, etc.)
// se hace en una fase posterior.
// ═══════════════════════════════════════════════════════════════

/**
 * Estructura semántica de una paleta diurna. Espejo de NightPalette
 * para que un componente pueda mapear sus campos sin duplicar lógica:
 *
 *   night.void        ↔ day.paper        (fondo principal)
 *   night.ember_deep  ↔ day.tint_deep    (presionado/profundo)
 *   night.ember_1     ↔ day.tint         (card/glass)
 *   night.ember_2     ↔ day.tint_strong  (elevado/hover)
 *   night.amber       ↔ day.accent       (acento principal)
 *   night.amber_glow  ↔ day.accent_soft  (highlight/hover)
 *   night.amber_deep  ↔ day.accent_deep  (border/pressed)
 *   night.candle      ↔ day.accent_warm  (estado activo)
 *   night.cream       ↔ day.ink          (color tipográfico)
 */
export type DayPalette = {
  readonly paper:        string;
  readonly tint_deep:    string;
  readonly tint:         string;
  readonly tint_strong:  string;
  readonly accent:       string;
  readonly accent_soft:  string;
  readonly accent_deep:  string;
  readonly accent_warm:  string;
  readonly ink:          string;
};

export type DayPaletteText = {
  readonly primary: string;
  readonly soft:    string;
  readonly muted:   string;
  readonly divider: string;
};

// ─── EMBER · pareada con NIGHT_CALM ─────────────────────────────
// Amanecer cálido · cream + naranja sunrise.
export const DAY_EMBER: DayPalette = {
  paper:        '#fdf6ed',
  tint_deep:    '#f5e8d4',
  tint:         '#fbf0e0',
  tint_strong:  '#f0d8b8',
  accent:       '#e8753a',
  accent_soft:  '#f0986a',
  accent_deep:  '#a84a18',
  accent_warm:  '#d4451a',
  ink:          '#3a1f10',
} as const;
export const DAY_EMBER_TEXT: DayPaletteText = {
  primary: 'rgba(58,31,16,0.92)',
  soft:    'rgba(58,31,16,0.68)',
  muted:   'rgba(58,31,16,0.46)',
  divider: 'rgba(58,31,16,0.10)',
} as const;

// ─── COCOA · pareada con NIGHT_COCOA ────────────────────────────
// Latte velado · cream tostado + caramelo dorado.
export const DAY_COCOA: DayPalette = {
  paper:        '#f6efe2',
  tint_deep:    '#ead7b8',
  tint:         '#f0e2c8',
  tint_strong:  '#dfc89c',
  accent:       '#c89540',
  accent_soft:  '#d8a85c',
  accent_deep:  '#8a6420',
  accent_warm:  '#a87c30',
  ink:          '#3a2a14',
} as const;
export const DAY_COCOA_TEXT: DayPaletteText = {
  primary: 'rgba(58,42,20,0.92)',
  soft:    'rgba(58,42,20,0.68)',
  muted:   'rgba(58,42,20,0.46)',
  divider: 'rgba(58,42,20,0.10)',
} as const;

// ─── OXBLOOD · pareada con NIGHT_OXBLOOD ────────────────────────
// Blush bar diurno · rosado polvoriento + terracota.
export const DAY_OXBLOOD: DayPalette = {
  paper:        '#fbf1ec',
  tint_deep:    '#f0d4c8',
  tint:         '#f7dccc',
  tint_strong:  '#e8b8a4',
  accent:       '#c4604a',
  accent_soft:  '#dc8474',
  accent_deep:  '#8a3424',
  accent_warm:  '#a8483a',
  ink:          '#3e1a14',
} as const;
export const DAY_OXBLOOD_TEXT: DayPaletteText = {
  primary: 'rgba(62,26,20,0.92)',
  soft:    'rgba(62,26,20,0.68)',
  muted:   'rgba(62,26,20,0.46)',
  divider: 'rgba(62,26,20,0.10)',
} as const;

// ─── FOREST · pareada con NIGHT_FOREST ──────────────────────────
// Sage de día · oliva claro + crema verdosa.
export const DAY_FOREST: DayPalette = {
  paper:        '#f3f4eb',
  tint_deep:    '#dde2cc',
  tint:         '#e5e9d2',
  tint_strong:  '#c4cca8',
  accent:       '#5e6f3a',
  accent_soft:  '#80954c',
  accent_deep:  '#3e4a24',
  accent_warm:  '#4f5e30',
  ink:          '#1f2814',
} as const;
export const DAY_FOREST_TEXT: DayPaletteText = {
  primary: 'rgba(31,40,20,0.92)',
  soft:    'rgba(31,40,20,0.68)',
  muted:   'rgba(31,40,20,0.46)',
  divider: 'rgba(31,40,20,0.10)',
} as const;

// ─── PEARL · pareada con NIGHT_PEARL ────────────────────────────
// Pearl day · grafito frío + perla suave.
export const DAY_PEARL: DayPalette = {
  paper:        '#f4f5f7',
  tint_deep:    '#dcdee2',
  tint:         '#e5e7eb',
  tint_strong:  '#c4c8cd',
  accent:       '#4a5260',
  accent_soft:  '#6c7484',
  accent_deep:  '#252a32',
  accent_warm:  '#383d48',
  ink:          '#15171c',
} as const;
export const DAY_PEARL_TEXT: DayPaletteText = {
  primary: 'rgba(21,23,28,0.92)',
  soft:    'rgba(21,23,28,0.68)',
  muted:   'rgba(21,23,28,0.46)',
  divider: 'rgba(21,23,28,0.10)',
} as const;
