// ═══════════════════════════════════════════════════════════
// holidaysEC · feriados oficiales del Ecuador
//
// Fuente: Ministerio del Trabajo del Ecuador (Ley Orgánica
// Reformatoria a la LOSEP y al Código del Trabajo, 2016) +
// COOTAD para los locales más relevantes.
//
// Feriados nacionales fijos:
//   1 Ene  · Año Nuevo
//   1 May  · Día del Trabajo
//   24 May · Batalla de Pichincha
//   10 Ago · Primer Grito de Independencia
//   9 Oct  · Independencia de Guayaquil
//   2 Nov  · Día de los Difuntos
//   3 Nov  · Independencia de Cuenca
//   25 Dic · Navidad
//
// Feriados móviles (computados sobre la Pascua Gregoriana
// usando el algoritmo anónimo de Meeus / Jones / Butcher):
//   Carnaval lunes  = Pascua − 48 días
//   Carnaval martes = Pascua − 47 días
//   Viernes Santo   = Pascua − 2 días
//
// Esta lista NO incluye traslados puente (cuando el feriado
// cae en martes/jueves y el Estado mueve el descanso al
// lunes/viernes), porque se decretan año a año por el
// Ministerio del Trabajo. Para el propósito de la app —
// activar el perfil "rest" — usamos la fecha calendario
// real, no la trasladada.
// ═══════════════════════════════════════════════════════════

export interface Holiday {
  /** Local date at 00:00 in the user's timezone. */
  date: Date;
  name: string;
  /** YYYY-MM-DD key (local) for cheap day-equality checks. */
  key: string;
}

/** Compute Western (Gregorian) Easter Sunday for a given year using
 *  the anonymous Gregorian algorithm. Returns a local-time Date. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Mar, 4 = Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeFixed(year: number, month1: number, day: number, name: string): Holiday {
  const d = new Date(year, month1 - 1, day);
  return { date: d, name, key: dateKey(d) };
}

function offsetDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** All Ecuadorian national holidays for the given year, sorted by date. */
export function getHolidaysInYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const carnavalLunes = offsetDays(easter, -48);
  const carnavalMartes = offsetDays(easter, -47);
  const viernesSanto = offsetDays(easter, -2);

  const list: Holiday[] = [
    makeFixed(year, 1, 1, 'Año Nuevo'),
    { date: carnavalLunes, name: 'Carnaval (lunes)', key: dateKey(carnavalLunes) },
    { date: carnavalMartes, name: 'Carnaval (martes)', key: dateKey(carnavalMartes) },
    { date: viernesSanto, name: 'Viernes Santo', key: dateKey(viernesSanto) },
    makeFixed(year, 5, 1, 'Día del Trabajo'),
    makeFixed(year, 5, 24, 'Batalla de Pichincha'),
    makeFixed(year, 8, 10, 'Primer Grito de Independencia'),
    makeFixed(year, 10, 9, 'Independencia de Guayaquil'),
    makeFixed(year, 11, 2, 'Día de los Difuntos'),
    makeFixed(year, 11, 3, 'Independencia de Cuenca'),
    makeFixed(year, 12, 25, 'Navidad'),
  ];

  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return list;
}

/** Returns { isHoliday, name? } for the given date (local time). */
export function isHolidayEC(date: Date = new Date()): { isHoliday: boolean; name?: string } {
  const key = dateKey(date);
  const holidays = getHolidaysInYear(date.getFullYear());
  const match = holidays.find((h) => h.key === key);
  if (match) return { isHoliday: true, name: match.name };
  return { isHoliday: false };
}

/** The next `count` Ecuadorian holidays starting from `from` (inclusive
 *  of today if today is a holiday). Spans into next year if needed. */
export function getNextHolidays(
  from: Date = new Date(),
  count = 6,
): { date: Date; name: string; daysUntil: number }[] {
  const todayKey = dateKey(from);
  const result: { date: Date; name: string; daysUntil: number }[] = [];
  let year = from.getFullYear();
  // Look up to 2 years forward to be safe.
  while (result.length < count && year <= from.getFullYear() + 2) {
    const yearly = getHolidaysInYear(year);
    for (const h of yearly) {
      if (h.key < todayKey) continue;
      const daysUntil = Math.round(
        (h.date.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime())
          / (1000 * 60 * 60 * 24),
      );
      result.push({ date: h.date, name: h.name, daysUntil });
      if (result.length >= count) break;
    }
    year += 1;
  }
  return result;
}

export { dateKey };
