// ═══════════════════════════════════════════════════════════
// climateEC.ts · contexto climático de Ambato (sin red)
//
// Ambato (Tungurahua, valle interandino): latitud ~1°15'S,
// altitud 2580 m. Rasgos clave para skincare:
//   1. UV alto todo el año (cercano al ecuador + altitud).
//      Ligeramente menor que Quito por menos altitud.
//   2. Régimen bimodal de lluvias parecido al de la sierra
//      central, pero MÁS SECO que Quito por estar en valle:
//        · Estación lluviosa: Oct → May (HR moderada, no alta)
//        · Estación seca: Jun → Sep (muy seco, polvoso, viento)
//   3. Banda térmica con MAYOR amplitud diurna (≈ 8–22 °C):
//      noches y madrugadas frías, mediodías cálidos al sol.
//
// Sin red, derivamos un contexto razonable por (mes, hora). El
// resultado se usa en el Coach para subir/bajar metas (agua,
// SPF) y para swapping de productos según contexto.
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
  /**
   * Pico de sequedad (Jun-Sep en Ambato). Más agresivo que
   * `humidity === 'dry'`. La UI/engine pueden disparar
   * recomendaciones extra de oclusivo + más agua.
   */
  veryDry: boolean;
  /** Etiqueta humana corta para UI. */
  summary: string;
}

/**
 * Meses de estación lluviosa en Ambato (1-indexed). Mismo
 * patrón bimodal que la sierra central, pero menos intenso
 * por la geografía del valle:
 * Oct, Nov, Dic, Ene, Feb, Mar, Abr, May.
 */
const RAIN_MONTHS = new Set<number>([10, 11, 12, 1, 2, 3, 4, 5]);

/**
 * Meses MÁS SECOS y polvosos del año en Ambato (Jun-Sep). Aquí
 * el ambiente baja a HR < 50% con frecuencia y se siente la
 * piel tirante. Los usamos para sub-decisiones más agresivas
 * de barrera/oclusivo.
 */
const PEAK_DRY_MONTHS = new Set<number>([6, 7, 8, 9]);

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

/**
 * Modificador por estación: días despejados (seca) reciben más
 * UV. Ambato tiene altitud algo menor que Quito (-270 m), así
 * que ajustamos un punto el modificador base.
 */
function uvSeasonModifier(rainSeason: boolean): number {
  return rainSeason ? 0.82 : 1.05;
}

/**
 * Banda térmica subjetiva por hora en Ambato. Mayor amplitud
 * diurna que Quito: noches/madrugadas más frías y mediodías de
 * sol directo más cálidos en estación seca.
 */
function bandFor(hour: number, rainSeason: boolean): ClimateBand {
  // Madrugada y noche: notablemente frío.
  if (hour < 7 || hour >= 19) return 'cold';
  // Pico mediodía en seca: cálido por sol directo + valle.
  if (!rainSeason && hour >= 10 && hour < 16) return 'warm';
  // Pico mediodía en lluviosa: mild (cielos cubiertos).
  return 'mild';
}

function uvLabelFor(uv: number): ClimateContext['uvLabel'] {
  if (uv >= 0.7) return 'high';
  if (uv >= 0.35) return 'mid';
  return 'low';
}

/** Devuelve el contexto climático aproximado para `now` en Ambato. */
export function getClimateContext(now: Date = new Date()): ClimateContext {
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const rainSeason = RAIN_MONTHS.has(month);
  // Ambato es seco la mayor parte del año, incluso en estación
  // lluviosa la HR no llega a niveles costeros. Solo lo
  // marcamos como `humid` cuando estamos en pico de lluvia
  // (Mar-Abr), donde sí cae el polvo y sube la HR.
  const peakRain = month >= 3 && month <= 4;
  const humidity: ClimateHumidity = peakRain ? 'humid' : 'dry';
  const band = bandFor(hour, rainSeason);
  const uvBase = baseUvByHour(hour);
  const uvProxy = Math.max(0, Math.min(1, uvBase * uvSeasonModifier(rainSeason)));
  const uvLabel = uvLabelFor(uvProxy);

  // Marcador de "muy seco" para que el resto del coach pueda
  // tomar decisiones agresivas de barrera (sumar oclusivo, etc.).
  const veryDry = PEAK_DRY_MONTHS.has(month);

  const summary = [
    'Ambato',
    veryDry ? 'muy seco' : humidity === 'humid' ? 'húmedo' : 'seco',
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
    veryDry,
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
