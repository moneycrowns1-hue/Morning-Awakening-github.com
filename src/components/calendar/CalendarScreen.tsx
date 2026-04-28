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
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import GradientBackground from '../common/GradientBackground';
import {
  getHolidaysInYear,
  getNextHolidays,
  type Holiday,
} from '@/lib/common/holidaysEC';
import { getDayContext, getDayProfile, getDayProfileLabel } from '@/lib/common/dayProfile';
import { isHabitDone, type HabitId } from '@/lib/common/habits';

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

      {/* ─── Header ────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-start gap-3 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          aria-label="Cerrar"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
          style={{
            background: SUNRISE.rise2,
            color: SUNRISE.night,
            boxShadow: `0 6px 18px -4px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
          }}
        >
          <X size={18} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.42em]"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Calendario
          </span>
          <div
            className="font-headline font-[600] text-[26px] md:text-[30px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {monthLabel.toLowerCase()}
          </div>
        </div>
        <button
          onClick={goToday}
          className="font-ui text-[10px] tracking-[0.3em] uppercase rounded-full px-3.5 py-2 transition-transform active:scale-[0.96] font-[700] shrink-0"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.16),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.5)}`,
            color: SUNRISE.rise2,
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
          <div className="mt-4 mb-4 flex items-center justify-center">
            <span
              className="inline-flex items-center gap-2 font-ui text-[10px] tracking-[0.3em] uppercase rounded-full px-3 py-1.5 font-[600]"
              style={{
                background: todayCtx.profile === 'rest'
                  ? hexToRgba(SUNRISE.rise2, 0.16)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(SUNRISE.cool, 0.16)
                  : hexToRgba(SUNRISE.night, 0.55),
                border: `1px solid ${todayCtx.profile === 'rest'
                  ? hexToRgba(SUNRISE.rise2, 0.5)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(SUNRISE.cool, 0.5)
                  : hexToRgba(SUNRISE.rise2, 0.18)}`,
                color: todayCtx.profile === 'rest'
                  ? SUNRISE.rise2
                  : todayCtx.profile === 'saturday'
                  ? SUNRISE.cool
                  : SUNRISE_TEXT.soft,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: todayCtx.profile === 'rest'
                    ? SUNRISE.rise2
                    : todayCtx.profile === 'saturday'
                    ? SUNRISE.cool
                    : SUNRISE_TEXT.muted,
                }}
              />
              hoy · {getDayProfileLabel(todayCtx).toLowerCase()}
            </span>
          </div>

          {/* Month nav · split bento style */}
          <div
            className="flex items-stretch overflow-hidden mb-3"
            style={{
              borderRadius: 18,
              background: hexToRgba(SUNRISE.night, 0.55),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <button
              onClick={prev}
              aria-label="Mes anterior"
              className="shrink-0 flex items-center justify-center transition-transform active:scale-[0.95]"
              style={{ width: 44, color: SUNRISE.rise2 }}
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </button>
            <div
              className="flex-1 flex items-center justify-center font-headline font-[600] text-[15px] lowercase tracking-[-0.01em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              {monthLabel.toLowerCase()}
            </div>
            <button
              onClick={next}
              aria-label="Mes siguiente"
              className="shrink-0 flex items-center justify-center transition-transform active:scale-[0.95]"
              style={{ width: 44, color: SUNRISE.rise2 }}
            >
              <ChevronRight size={18} strokeWidth={2.2} />
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

          {/* ─── Próximos feriados · split bento cards ───────────── */}
          <div className="mt-7">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Próximos feriados · Ecuador
            </h2>
            <ul className="flex flex-col gap-2">
              {upcomingHolidays.map((h) => {
                const isToday = h.daysUntil === 0;
                return (
                  <li
                    key={h.date.toISOString()}
                    className="flex items-stretch overflow-hidden"
                    style={{
                      borderRadius: 18,
                      background: hexToRgba(SUNRISE.night, 0.55),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, isToday ? 0.45 : 0.16)}`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3">
                      <div
                        className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.015em] truncate"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {h.name.toLowerCase()}
                      </div>
                      <div
                        className="mt-1 font-mono text-[10.5px] tracking-wider lowercase"
                        style={{ color: SUNRISE_TEXT.muted }}
                      >
                        {formatLongDateLocal(h.date).toLowerCase()}
                      </div>
                    </div>
                    <div
                      className="shrink-0 flex flex-col items-center justify-center px-3"
                      style={{
                        minWidth: 78,
                        background: isToday
                          ? SUNRISE.rise2
                          : hexToRgba(SUNRISE.rise2, 0.14),
                      }}
                    >
                      {isToday ? (
                        <span
                          className="font-headline font-[700] text-[16px] lowercase tracking-[-0.01em]"
                          style={{ color: SUNRISE.night }}
                        >
                          hoy
                        </span>
                      ) : h.daysUntil === 1 ? (
                        <span
                          className="font-headline font-[700] text-[14px] lowercase tracking-[-0.01em]"
                          style={{ color: SUNRISE.rise2 }}
                        >
                          mañana
                        </span>
                      ) : (
                        <>
                          <span
                            className="font-headline font-[700] text-[22px] leading-none tabular-nums tracking-[-0.02em]"
                            style={{ color: SUNRISE.rise2 }}
                          >
                            {h.daysUntil}
                          </span>
                          <span
                            className="font-ui text-[8.5px] tracking-[0.3em] uppercase mt-0.5 font-[600]"
                            style={{ color: SUNRISE.rise2, opacity: 0.7 }}
                          >
                            días
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ─── Resumen del mes · split bento card ───────────── */}
          <div className="mt-7 mb-4">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Resumen del mes
            </h2>
            <div
              className="flex items-stretch overflow-hidden"
              style={{
                borderRadius: 22,
                background: hexToRgba(SUNRISE.night, 0.55),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {/* LEFT · días completados (dark glass) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between px-4 py-3.5">
                <span
                  className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  días ≥ 3 hábitos
                </span>
                <div
                  className="font-headline font-[700] leading-none lowercase tracking-[-0.025em] mt-2"
                  style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)', color: SUNRISE_TEXT.primary }}
                >
                  {monthStats.daysCompleted}
                  <span
                    className="font-mono text-[16px] font-[400] ml-1"
                    style={{ color: SUNRISE_TEXT.muted }}
                  >
                    / {monthStats.totalCountedDays || '—'}
                  </span>
                </div>
              </div>
              {/* RIGHT · adherencia (dorado sólido) */}
              <div
                className="shrink-0 flex flex-col justify-between px-4 py-3.5"
                style={{
                  width: '40%',
                  maxWidth: 168,
                  background: SUNRISE.rise2,
                  color: SUNRISE.night,
                }}
              >
                <span
                  className="font-ui text-[9.5px] tracking-[0.32em] uppercase font-[700]"
                  style={{ color: SUNRISE.night, opacity: 0.7 }}
                >
                  adherencia
                </span>
                <div
                  className="font-headline font-[700] leading-none lowercase tracking-[-0.025em] mt-2"
                  style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)', color: SUNRISE.night }}
                >
                  {monthStats.totalCountedDays > 0
                    ? Math.round((monthStats.daysCompleted / monthStats.totalCountedDays) * 100)
                    : '—'}
                  {monthStats.totalCountedDays > 0 && (
                    <span
                      className="font-mono text-[16px] font-[400] ml-1"
                      style={{ color: SUNRISE.night, opacity: 0.5 }}
                    >
                      %
                    </span>
                  )}
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
          className="absolute z-20 left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap font-ui text-[9.5px] tracking-[0.2em] uppercase rounded-md px-2 py-1 pointer-events-none font-[600]"
          style={{
            background: SUNRISE.rise2,
            color: SUNRISE.night,
            boxShadow: `0 4px 12px -2px ${hexToRgba(SUNRISE.rise2, 0.4)}`,
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

