'use client';

// ═══════════════════════════════════════════════════════════
// CalendarScreen · vista mensual con feriados de Ecuador,
// perfil del día y dots de completitud de hábitos.
//
// Layout:
//   1. Header: mes/año + flechas ‹ › + cerrar.
//   2. Grid 7×6 (semana inicia en Lunes — convención local).
//      Cada celda muestra el día, halo dorado si es hoy,
//      tinte rojo tenue si es domingo/feriado, tinte azul
//      tenue si es sábado, y un mini-dot debajo si hay
//      hábitos completados ese día.
//   3. Sección "Próximos feriados" (próximos 6 de Ecuador).
//   4. Sección "Resumen del mes" (días completados, racha,
//      próximo descanso programado).
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import GradientBackground from './GradientBackground';
import {
  getHolidaysInYear,
  getNextHolidays,
  type Holiday,
} from '@/lib/holidaysEC';
import { getDayContext, getDayProfile, getDayProfileLabel } from '@/lib/dayProfile';
import { isHabitDone, type HabitId } from '@/lib/habits';

interface CalendarScreenProps {
  onClose: () => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Habit ids we count as the "core day" set when computing completion
// dots. Keep this list aligned with the day-track NUCLEUS habits the
// user is actively tracking — anything stored under another id will
// still show in the per-day list but won't move the dot.
const DAY_HABITS: HabitId[] = [
  'salt_water_morning',
  'active_recall_pre_arena',
  'coffee_9am',
  'rule_20_20_20',
  'scapular_retractions',
  'lunch_clean',
  'midday_brush',
  'nsdr_session',
  'no_caffeine_pm',
  'optic_flow_walk',
  'desk_closure',
  'morning_protocol',
  'night_protocol',
  // Wellness Hub
  'bruxism_exercise',
  'deep_meditation',
  'lymphatic_facial',
];

function isoFor(year: number, month0: number, day: number): string {
  const m = String(month0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function sameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Count the day-track habits done on this date. */
function countDayHabits(dateISO: string): number {
  let n = 0;
  for (const h of DAY_HABITS) {
    if (isHabitDone(h, dateISO)) n += 1;
  }
  return n;
}

export default function CalendarScreen({ onClose }: CalendarScreenProps) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<{ year: number; month: number }>(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const { year, month } = view;

  // Holidays for the visible year, indexed by YYYY-MM-DD for O(1) lookup.
  const holidaysIndex = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of getHolidaysInYear(year)) map.set(h.key, h);
    // Include the prior + next year so weeks that spill across year
    // boundaries still highlight holidays correctly.
    for (const h of getHolidaysInYear(year - 1)) map.set(h.key, h);
    for (const h of getHolidaysInYear(year + 1)) map.set(h.key, h);
    return map;
  }, [year]);

  // Compute the 6×7 grid (Mon-first). The first row may include trailing
  // days of the previous month; the last row may include leading days
  // of the next month — those are rendered dimmed.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    // Convert getDay() (Sun=0..Sat=6) to a Mon-first index (Mon=0..Sun=6).
    const firstWeekdayMonFirst = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - firstWeekdayMonFirst);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === month });
    }
    return cells;
  }, [year, month]);

  const monthLabel = useMemo(() => {
    const d = new Date(year, month, 1);
    const fmt = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
    const out = fmt.format(d);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }, [year, month]);

  const prev = () => {
    haptics.tap();
    setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
  };
  const next = () => {
    haptics.tap();
    setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });
  };
  const goToday = () => {
    haptics.tap();
    setView({ year: today.getFullYear(), month: today.getMonth() });
  };

  const upcomingHolidays = useMemo(() => getNextHolidays(today, 6), [today]);

  // Month summary stats (only for the currently displayed month).
  const monthStats = useMemo(() => {
    let daysCompleted = 0;
    let totalCountedDays = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      // Don't count future days against adherence.
      if (cellDate.getTime() > today.getTime()) break;
      totalCountedDays += 1;
      if (countDayHabits(isoFor(year, month, day)) >= 3) daysCompleted += 1;
    }
    return { daysCompleted, totalCountedDays };
  }, [year, month, today]);

  const todayCtx = useMemo(() => getDayContext(today), [today]);

  return (
    <div
      className="fixed inset-0 z-[60] w-full h-full flex flex-col"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={40} />

      {/* ─── Header ─────────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          aria-label="Cerrar"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col items-center">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.4em]"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Calendario
          </span>
          <span
            className="font-display italic font-[400] text-[20px] md:text-[24px] leading-none mt-1"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {monthLabel}
          </span>
        </div>
        <button
          onClick={goToday}
          className="font-ui text-[10px] tracking-[0.3em] uppercase rounded-full px-3 py-1.5 transition-colors"
          style={{
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
            background: hexToRgba(SUNRISE.rise2, 0.08),
            color: SUNRISE_TEXT.primary,
          }}
        >
          Hoy
        </button>
      </div>

      {/* ─── Body (scroll) ──────────────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 w-full"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Today's profile pill */}
          <div className="mt-4 mb-5 flex items-center justify-center">
            <span
              className="font-ui text-[10px] tracking-[0.28em] uppercase rounded-full px-3 py-1.5"
              style={{
                background: todayCtx.profile === 'rest'
                  ? hexToRgba(SUNRISE.rise2, 0.16)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(SUNRISE.cool, 0.16)
                  : hexToRgba(SUNRISE.fulllight, 0.08),
                border: `1px solid ${todayCtx.profile === 'rest'
                  ? hexToRgba(SUNRISE.rise2, 0.45)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(SUNRISE.cool, 0.45)
                  : hexToRgba(SUNRISE.fulllight, 0.2)}`,
                color: SUNRISE_TEXT.primary,
              }}
            >
              Hoy · {getDayProfileLabel(todayCtx)}
            </span>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prev}
              aria-label="Mes anterior"
              className="rounded-full p-2 transition-colors hover:bg-white/5"
              style={{ color: SUNRISE_TEXT.soft }}
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <div className="font-ui text-[11px] tracking-[0.32em] uppercase" style={{ color: SUNRISE_TEXT.muted }}>
              {monthLabel}
            </div>
            <button
              onClick={next}
              aria-label="Mes siguiente"
              className="rounded-full p-2 transition-colors hover:bg-white/5"
              style={{ color: SUNRISE_TEXT.soft }}
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>

          {/* Weekday header row */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS.map((w) => (
              <div
                key={w}
                className="font-ui text-[9.5px] tracking-[0.25em] uppercase text-center py-1"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ date, inMonth }) => {
              const isToday = sameYMD(date, today);
              const dayKey = isoFor(date.getFullYear(), date.getMonth(), date.getDate());
              const holiday = holidaysIndex.get(dayKey);
              const profile = getDayProfile(date);
              const dotCount = countDayHabits(dayKey);

              const tint = profile === 'rest'
                ? hexToRgba(SUNRISE.rise2, inMonth ? 0.12 : 0.05)
                : profile === 'saturday'
                ? hexToRgba(SUNRISE.cool, inMonth ? 0.1 : 0.04)
                : 'transparent';

              return (
                <CalendarCell
                  key={dayKey}
                  date={date}
                  inMonth={inMonth}
                  isToday={isToday}
                  tint={tint}
                  holiday={holiday}
                  dotCount={dotCount}
                />
              );
            })}
          </div>

          {/* ─── Próximos feriados ──────────────────────────── */}
          <div className="mt-7">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Próximos feriados · Ecuador
            </h2>
            <ul className="flex flex-col gap-2">
              {upcomingHolidays.map((h) => (
                <li
                  key={h.date.toISOString()}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{
                    background: hexToRgba(SUNRISE.predawn2, 0.4),
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="font-display italic font-[400] text-[16px] truncate"
                      style={{ color: SUNRISE_TEXT.primary }}
                    >
                      {h.name}
                    </div>
                    <div
                      className="mt-0.5 font-mono text-[10.5px] tracking-wider"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {formatLongDateLocal(h.date)}
                    </div>
                  </div>
                  <span
                    className="font-mono text-[11px] tabular-nums tracking-wider px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: h.daysUntil === 0
                        ? hexToRgba(SUNRISE.rise2, 0.5)
                        : hexToRgba(SUNRISE.rise2, 0.14),
                      color: SUNRISE_TEXT.primary,
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
                    }}
                  >
                    {h.daysUntil === 0 ? 'HOY' : h.daysUntil === 1 ? 'MAÑANA' : `${h.daysUntil} d`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Resumen del mes ────────────────────────────── */}
          <div className="mt-7 mb-4">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Resumen del mes
            </h2>
            <div
              className="rounded-2xl px-4 py-4 flex items-center justify-between"
              style={{
                background: hexToRgba(SUNRISE.predawn2, 0.4),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
              }}
            >
              <div>
                <div
                  className="font-mono text-[28px] tabular-nums leading-none"
                  style={{ color: SUNRISE_TEXT.primary }}
                >
                  {monthStats.daysCompleted}
                  <span className="text-[16px]" style={{ color: SUNRISE_TEXT.muted }}>
                    {' / '}{monthStats.totalCountedDays || '—'}
                  </span>
                </div>
                <div
                  className="mt-1 font-ui text-[10px] tracking-[0.28em] uppercase"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  Días con ≥ 3 hábitos
                </div>
              </div>
              <div className="text-right">
                <div
                  className="font-display italic font-[400] text-[15px]"
                  style={{ color: SUNRISE_TEXT.soft }}
                >
                  {monthStats.totalCountedDays > 0
                    ? `${Math.round((monthStats.daysCompleted / monthStats.totalCountedDays) * 100)} %`
                    : '—'}
                </div>
                <div
                  className="mt-1 font-ui text-[9.5px] tracking-[0.28em] uppercase"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  Adherencia
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────

interface CalendarCellProps {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  tint: string;
  holiday?: Holiday;
  dotCount: number;
}

function CalendarCell({ date, inMonth, isToday, tint, holiday, dotCount }: CalendarCellProps) {
  const [showTip, setShowTip] = useState(false);
  const day = date.getDate();
  const isHolidayDay = !!holiday;
  const showDots = dotCount > 0 && inMonth;

  return (
    <button
      type="button"
      onClick={() => {
        if (isHolidayDay) {
          haptics.tap();
          setShowTip((v) => !v);
        }
      }}
      onBlur={() => setShowTip(false)}
      className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-transform active:scale-[0.96]"
      style={{
        background: tint,
        border: isToday
          ? `1.5px solid ${hexToRgba(SUNRISE.rise2, 0.85)}`
          : isHolidayDay && inMonth
          ? `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`
          : '1px solid transparent',
        opacity: inMonth ? 1 : 0.32,
        boxShadow: isToday ? `0 0 0 2px ${hexToRgba(SUNRISE.rise2, 0.25)}` : 'none',
      }}
      aria-label={isHolidayDay ? `${day} · ${holiday!.name}` : `Día ${day}`}
    >
      <span
        className="font-mono text-[13px] tabular-nums leading-none"
        style={{
          color: isToday
            ? SUNRISE_TEXT.primary
            : isHolidayDay
            ? SUNRISE.rise2
            : SUNRISE_TEXT.soft,
          fontWeight: isToday ? 700 : 400,
        }}
      >
        {day}
      </span>
      {showDots && (
        <div className="mt-1 flex items-center gap-0.5">
          {Array.from({ length: Math.min(3, dotCount) }).map((_, i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{
                background: dotCount >= 5
                  ? SUNRISE.fulllight
                  : dotCount >= 3
                  ? SUNRISE.rise2
                  : SUNRISE.dawn2,
              }}
            />
          ))}
        </div>
      )}
      {isHolidayDay && showTip && (
        <span
          className="absolute z-20 left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap font-ui text-[10px] tracking-wider rounded-md px-2 py-1 pointer-events-none"
          style={{
            background: SUNRISE.predawn2,
            color: SUNRISE_TEXT.primary,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
          }}
        >
          {holiday!.name}
        </span>
      )}
    </button>
  );
}

function formatLongDateLocal(d: Date): string {
  const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const out = fmt.format(d);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

