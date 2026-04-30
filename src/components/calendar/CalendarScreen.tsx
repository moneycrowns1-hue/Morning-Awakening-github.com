'use client';

// ═══════════════════════════════════════════════════════════
// CalendarScreen · editorial redesign (D.paper).
//
// Conectado a la paleta global vía useAppTheme():
//   - bg = D.paper + radial accent sutil (sin GradientBackground).
//   - accents = D.accent (cambia con la paleta elegida en Settings).
//   - texto = DT.primary / DT.soft / DT.muted.
//
// Layout:
//   1. Masthead editorial (eyebrow mono uppercase + título lowercase
//      tight kerning + acento dot). Botón Hoy hairline.
//   2. Pill de perfil del día (chip translúcido sobre paper).
//   3. Grid 7×6 (semana inicia Lunes), celdas hairline minimal.
//   4. "Próximos feriados" · cards split (paper / accent solid).
//   5. "Resumen del mes" · split bento (paper / accent solid).
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { haptics } from '@/lib/common/haptics';
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
  const { day: D, dayText: DT } = useAppTheme();
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
      className="fixed inset-0 z-[60] w-full h-full flex flex-col overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* ─── Background · paleta global ─────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.14)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(D.tint_strong, 0.30)} 0%, transparent 45%, ${hexToRgba(D.accent_soft, 0.08)} 100%)`,
        }}
      />

      {/* ─── Header · masthead editorial ────────────────── */}
      <div
        className="relative z-10 flex items-start gap-3 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          aria-label="Cerrar"
          className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
          style={{
            background: 'transparent',
            border: `1px solid ${hexToRgba(D.accent, 0.28)}`,
            color: DT.primary,
          }}
        >
          <X size={16} strokeWidth={2} style={{ color: DT.primary }} />
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          <span
            className="font-mono uppercase tracking-[0.42em] font-[600] block"
            style={{ color: DT.primary, fontSize: 10 }}
          >
            Calendario
          </span>
          <div
            className="font-[700] leading-[0.92] tracking-[-0.035em] lowercase mt-1.5"
            style={{ color: DT.primary, fontSize: 'clamp(2rem, 8vw, 2.6rem)' }}
          >
            {monthLabel.toLowerCase()}
            <span style={{ color: D.accent }}>.</span>
          </div>
        </div>
        <button
          onClick={goToday}
          className="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full px-3.5 py-2 transition-transform active:scale-[0.96] font-[700] shrink-0"
          style={{
            background: hexToRgba(D.accent, 0.10),
            border: `1px solid ${hexToRgba(D.accent, 0.32)}`,
            color: D.accent,
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
              className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase rounded-full px-3 py-1.5 font-[600]"
              style={{
                background: todayCtx.profile === 'rest'
                  ? hexToRgba(D.accent, 0.10)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(D.accent_soft, 0.14)
                  : hexToRgba(D.accent, 0.06),
                border: `1px solid ${todayCtx.profile === 'rest'
                  ? hexToRgba(D.accent, 0.32)
                  : todayCtx.profile === 'saturday'
                  ? hexToRgba(D.accent_soft, 0.40)
                  : hexToRgba(D.accent, 0.18)}`,
                color: todayCtx.profile === 'rest'
                  ? D.accent
                  : todayCtx.profile === 'saturday'
                  ? D.accent_soft
                  : DT.soft,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: todayCtx.profile === 'rest'
                    ? D.accent
                    : todayCtx.profile === 'saturday'
                    ? D.accent_soft
                    : DT.muted,
                }}
              />
              hoy · {getDayProfileLabel(todayCtx).toLowerCase()}
            </span>
          </div>

          {/* Month nav · hairline pill */}
          <div
            className="flex items-stretch overflow-hidden mb-3"
            style={{
              borderRadius: 18,
              background: hexToRgba(D.accent, 0.04),
              border: `1px solid ${hexToRgba(D.accent, 0.18)}`,
            }}
          >
            <button
              onClick={prev}
              aria-label="Mes anterior"
              className="shrink-0 flex items-center justify-center transition-transform active:scale-[0.95]"
              style={{ width: 44, color: D.accent }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <div
              className="flex-1 flex items-center justify-center font-[700] text-[15px] lowercase tracking-[-0.02em]"
              style={{ color: DT.primary }}
            >
              {monthLabel.toLowerCase()}
            </div>
            <button
              onClick={next}
              aria-label="Mes siguiente"
              className="shrink-0 flex items-center justify-center transition-transform active:scale-[0.95]"
              style={{ width: 44, color: D.accent }}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Weekday header row */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS.map((w) => (
              <div
                key={w}
                className="font-mono text-[9.5px] tracking-[0.25em] uppercase text-center py-1 font-[600]"
                style={{ color: DT.muted }}
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
                ? hexToRgba(D.accent, inMonth ? 0.09 : 0.04)
                : profile === 'saturday'
                ? hexToRgba(D.accent_soft, inMonth ? 0.12 : 0.05)
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
                  D={D}
                  DT={DT}
                />
              );
            })}
          </div>

          {/* ─── Próximos feriados · split bento cards ───────────── */}
          <div className="mt-7">
            <h2
              className="font-mono text-[10px] tracking-[0.34em] uppercase mb-3 font-[600]"
              style={{ color: DT.muted }}
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
                      background: hexToRgba(D.accent, 0.05),
                      border: `1px solid ${hexToRgba(D.accent, isToday ? 0.36 : 0.16)}`,
                    }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3">
                      <div
                        className="font-[700] text-[15px] leading-tight lowercase tracking-[-0.025em] truncate"
                        style={{ color: DT.primary }}
                      >
                        {h.name.toLowerCase()}
                      </div>
                      <div
                        className="mt-1 font-mono text-[10.5px] tracking-wider lowercase"
                        style={{ color: DT.muted }}
                      >
                        {formatLongDateLocal(h.date).toLowerCase()}
                      </div>
                    </div>
                    <div
                      className="shrink-0 flex flex-col items-center justify-center px-3"
                      style={{
                        minWidth: 78,
                        background: isToday
                          ? D.accent
                          : hexToRgba(D.accent, 0.10),
                      }}
                    >
                      {isToday ? (
                        <span
                          className="font-[700] text-[16px] lowercase tracking-[-0.02em]"
                          style={{ color: D.paper }}
                        >
                          hoy
                        </span>
                      ) : h.daysUntil === 1 ? (
                        <span
                          className="font-[700] text-[14px] lowercase tracking-[-0.02em]"
                          style={{ color: D.accent }}
                        >
                          mañana
                        </span>
                      ) : (
                        <>
                          <span
                            className="font-[700] text-[22px] leading-none tabular-nums tracking-[-0.03em]"
                            style={{ color: D.accent }}
                          >
                            {h.daysUntil}
                          </span>
                          <span
                            className="font-mono text-[8.5px] tracking-[0.3em] uppercase mt-0.5 font-[600]"
                            style={{ color: D.accent, opacity: 0.75 }}
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
              className="font-mono text-[10px] tracking-[0.34em] uppercase mb-3 font-[600]"
              style={{ color: DT.muted }}
            >
              Resumen del mes
            </h2>
            <div
              className="flex items-stretch overflow-hidden"
              style={{
                borderRadius: 22,
                background: hexToRgba(D.accent, 0.05),
                border: `1px solid ${hexToRgba(D.accent, 0.18)}`,
              }}
            >
              {/* LEFT · días completados (paper card) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between px-4 py-3.5">
                <span
                  className="font-mono text-[9.5px] tracking-[0.32em] uppercase font-[600]"
                  style={{ color: DT.muted }}
                >
                  días ≥ 3 hábitos
                </span>
                <div
                  className="font-[700] leading-none lowercase tracking-[-0.035em] mt-2"
                  style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)', color: DT.primary }}
                >
                  {monthStats.daysCompleted}
                  <span
                    className="font-mono text-[16px] font-[400] ml-1"
                    style={{ color: DT.muted }}
                  >
                    / {monthStats.totalCountedDays || '—'}
                  </span>
                </div>
              </div>
              {/* RIGHT · adherencia (accent solid) */}
              <div
                className="shrink-0 flex flex-col justify-between px-4 py-3.5"
                style={{
                  width: '40%',
                  maxWidth: 168,
                  background: D.accent,
                  color: D.paper,
                }}
              >
                <span
                  className="font-mono text-[9.5px] tracking-[0.32em] uppercase font-[700]"
                  style={{ color: D.paper, opacity: 0.78 }}
                >
                  adherencia
                </span>
                <div
                  className="font-[700] leading-none lowercase tracking-[-0.035em] mt-2"
                  style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)', color: D.paper }}
                >
                  {monthStats.totalCountedDays > 0
                    ? Math.round((monthStats.daysCompleted / monthStats.totalCountedDays) * 100)
                    : '—'}
                  {monthStats.totalCountedDays > 0 && (
                    <span
                      className="font-mono text-[16px] font-[400] ml-1"
                      style={{ color: D.paper, opacity: 0.55 }}
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
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
}

function CalendarCell({ date, inMonth, isToday, tint, holiday, dotCount, D, DT }: CalendarCellProps) {
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
        background: isToday ? D.accent : tint,
        border: isToday
          ? `1px solid ${D.accent}`
          : isHolidayDay && inMonth
          ? `1px solid ${hexToRgba(D.accent, 0.36)}`
          : '1px solid transparent',
        opacity: inMonth ? 1 : 0.32,
        boxShadow: isToday ? `0 6px 18px -6px ${hexToRgba(D.accent, 0.55)}` : 'none',
      }}
      aria-label={isHolidayDay ? `${day} · ${holiday!.name}` : `Día ${day}`}
    >
      <span
        className="font-mono text-[13px] tabular-nums leading-none"
        style={{
          color: isToday
            ? D.paper
            : isHolidayDay
            ? D.accent
            : DT.soft,
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
                background: isToday
                  ? D.paper
                  : dotCount >= 5
                  ? D.accent
                  : dotCount >= 3
                  ? D.accent
                  : hexToRgba(D.accent, 0.55),
                opacity: isToday ? 0.85 : 1,
              }}
            />
          ))}
        </div>
      )}
      {isHolidayDay && showTip && (
        <span
          className="absolute z-20 left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap font-mono text-[9.5px] tracking-[0.2em] uppercase rounded-md px-2 py-1 pointer-events-none font-[600]"
          style={{
            background: D.accent,
            color: D.paper,
            boxShadow: `0 4px 12px -2px ${hexToRgba(D.accent, 0.4)}`,
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

