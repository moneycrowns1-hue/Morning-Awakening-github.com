// ═══════════════════════════════════════════════════════════
// dayProfile · perfil del día actual para adaptar la rutina
//
// Tres perfiles:
//   workday   · Lun-Vie (no feriado): rutina completa (facultad).
//   saturday  · Sábado (no feriado): sin facultad pero todo lo demás
//               activo — entreno, estudio personal, modo noche full.
//   rest      · Domingo o feriado nacional: modo descanso. Solo se
//               mantienen los hábitos críticos (RECARGA, REFUGIO,
//               SÍNTESIS, skincare, dental) y los protocolos
//               mañana/noche se sugieren en Express.
//
// El perfil se deriva en frío de la fecha — no se persiste — para
// evitar drift al cambiar de día con la app abierta.
// ═══════════════════════════════════════════════════════════

import { isHolidayEC } from './holidaysEC';

export type DayProfile = 'workday' | 'saturday' | 'rest';

export interface DayContext {
  profile: DayProfile;
  /** Holiday name when profile is 'rest' AND today is a national holiday. */
  holidayName?: string;
  /** 0..6 (Date.getDay()). */
  weekday: number;
  /** YYYY-MM-DD local. */
  dateISO: string;
}

/** Return the day profile for `at` (default: now). */
export function getDayProfile(at: Date = new Date()): DayProfile {
  const day = at.getDay();
  const { isHoliday } = isHolidayEC(at);
  if (isHoliday) return 'rest';
  if (day === 0) return 'rest';        // Sunday
  if (day === 6) return 'saturday';
  return 'workday';
}

/** Full context describing today, useful for headers/badges. */
export function getDayContext(at: Date = new Date()): DayContext {
  const day = at.getDay();
  const { isHoliday, name } = isHolidayEC(at);
  const profile: DayProfile = isHoliday
    ? 'rest'
    : day === 0
    ? 'rest'
    : day === 6
    ? 'saturday'
    : 'workday';
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return {
    profile,
    holidayName: isHoliday ? name : undefined,
    weekday: day,
    dateISO: `${y}-${m}-${d}`,
  };
}

/** Human-readable label for a profile, in Spanish. */
export function getDayProfileLabel(ctx: DayContext): string {
  if (ctx.profile === 'workday') return 'Día laboral';
  if (ctx.profile === 'saturday') return 'Sábado libre · facultad apagada';
  if (ctx.holidayName) return `Feriado · ${ctx.holidayName}`;
  return 'Domingo · Modo descanso';
}

/** Short single-word label, useful in dense UIs. */
export function getDayProfileShort(ctx: DayContext): string {
  if (ctx.profile === 'workday') return 'Laboral';
  if (ctx.profile === 'saturday') return 'Sábado';
  if (ctx.holidayName) return 'Feriado';
  return 'Domingo';
}
