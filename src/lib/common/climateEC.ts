// ═══════════════════════════════════════════════════════════
// climateEC.ts · contexto climático de Quito (sin red)
//
// Quito: latitud ~0°, altitud 2850 m. Por su geografía tiene
// dos rasgos clave para skincare:
//   1. UV alto todo el año (cercano al ecuador + altitud).
//   2. Régimen bimodal de lluvias:
//        · Estación lluviosa: Oct → May (cielos cubiertos, %HR alto)
//        · Estación seca: Jun → Sep (cielos despejados, ambiente seco)
//   3. Banda térmica estable (12–22 °C). Más frío al amanecer y
//      tras el atardecer; templado al mediodía.
//
// Sin red, derivamos un contexto razonable por (mes, hora). El
// resultado se usa en el Coach para subir/bajar metas (agua,
// SPF) y en sub-decisiones futuras.
// ═══════════════════════════════════════════════════════════

export type ClimateHumidity = 'humid' | 'dry';
export type ClimateBand = 'cold' | 'mild' | 'warm';

export interface ClimateContext {
  /** Mes 1–12 considerado (de `now`). */
  month: number;
  /** Hora 0–23. */
  hour: number;
  /** Humedad ambiental aproximada. */
  humidity: ClimateHumidity;
  /** Banda térmica subjetiva. */
  band: ClimateBand;
  /** Proxy UV en [0, 1]. ≥ 0.7 = "alto". */
  uvProxy: number;
  /** Categoría UV deducida del proxy. */
  uvLabel: 'low' | 'mid' | 'high';
  /** ¿Estamos en estación lluviosa? */
  rainSeason: boolean;
  /** Etiqueta humana corta para UI. */
  summary: string;
}

/**
 * Meses de estación lluviosa en Quito (1-indexed):
 * Octubre, Noviembre, Diciembre, Enero, Febrero, Marzo, Abril, Mayo.
 */
const RAIN_MONTHS = new Set<number>([10, 11, 12, 1, 2, 3, 4, 5]);

/**
 * Curva UV base por hora (ecuador + altitud). Pico en 12–13 h.
 * Valores empíricos suaves; el motor solo necesita el orden de
 * magnitud para decidir refresh de SPF.
 */
function baseUvByHour(hour: number): number {
  if (hour < 6 || hour >= 18) return 0;
  const t = (hour - 6) / 12; // 0..1
  // sin(πt) tiene pico 1 en t=0.5 (hora 12)
  return Math.max(0, Math.sin(Math.PI * t));
}

/** Modificador por estación: días despejados (seca) reciben más UV. */
function uvSeasonModifier(rainSeason: boolean): number {
  return rainSeason ? 0.85 : 1.1;
}

/** Banda térmica subjetiva por hora (Quito). */
function bandFor(hour: number, rainSeason: boolean): ClimateBand {
  if (hour < 7 || hour >= 20) return 'cold';
  // Mediodía en seca: más cálido por sol directo.
  if (!rainSeason && hour >= 11 && hour < 16) return 'warm';
  return 'mild';
}

function uvLabelFor(uv: number): ClimateContext['uvLabel'] {
  if (uv >= 0.7) return 'high';
  if (uv >= 0.35) return 'mid';
  return 'low';
}

/** Devuelve el contexto climático aproximado para `now` en Quito. */
export function getClimateContext(now: Date = new Date()): ClimateContext {
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const rainSeason = RAIN_MONTHS.has(month);
  const humidity: ClimateHumidity = rainSeason ? 'humid' : 'dry';
  const band = bandFor(hour, rainSeason);
  const uvBase = baseUvByHour(hour);
  const uvProxy = Math.max(0, Math.min(1, uvBase * uvSeasonModifier(rainSeason)));
  const uvLabel = uvLabelFor(uvProxy);

  const summary = [
    'Quito',
    humidity === 'humid' ? 'húmedo' : 'seco',
    `UV ${uvLabel === 'high' ? 'alto' : uvLabel === 'mid' ? 'medio' : 'bajo'}`,
  ].join(' · ');

  return {
    month,
    hour,
    humidity,
    band,
    uvProxy,
    uvLabel,
    rainSeason,
    summary,
  };
}

/** Devuelve un contexto explícito sin tocar el reloj real (tests/demos). */
export function climateAt(month: number, hour: number): ClimateContext {
  const at = new Date();
  at.setMonth(Math.max(0, Math.min(11, month - 1)));
  at.setHours(Math.max(0, Math.min(23, hour)), 0, 0, 0);
  return getClimateContext(at);
}
