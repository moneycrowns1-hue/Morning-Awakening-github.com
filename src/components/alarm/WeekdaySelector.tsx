'use client';

// ═══════════════════════════════════════════════════════
// WeekdaySelector · seven pills (L M M J V S D, Monday-first)
// that toggle AlarmConfig.days. Uses GSAP for:
//   - staggered mount animation (pills fade-and-rise left→right)
//   - springy tap feedback when a pill flips
//   - glow pulse on the active state
//
// Also exposes shortcut chips below (Todos, Entre semana, Fin
// de semana) that set canonical masks in one tap.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';
import {
  DAY_ORDER_MON_FIRST,
  WEEKDAY_LABELS_ES,
  type AlarmConfig,
} from '@/lib/alarm/alarmSchedule';

type DaysMask = AlarmConfig['days'];

interface WeekdaySelectorProps {
  value: DaysMask;
  onChange: (next: DaysMask) => void;
}

const WEEKDAY_MASK: DaysMask = [false, true, true, true, true, true, false];
const WEEKEND_MASK: DaysMask = [true, false, false, false, false, false, true];
const ALL_MASK: DaysMask = [true, true, true, true, true, true, true];

export default function WeekdaySelector({ value, onChange }: WeekdaySelectorProps) {
  const pillsRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Staggered mount animation — pills fade-and-rise left→right
  // once, on first paint. GSAP is stable across re-renders via ref.
  useEffect(() => {
    const pills = pillRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!pills.length) return;
    gsap.from(pills, {
      opacity: 0,
      y: 10,
      duration: 0.42,
      stagger: 0.04,
      ease: 'power2.out',
    });
  }, []);

  const togglePill = (dayIndex: number, btn: HTMLButtonElement | null) => {
    haptics.tick();
    const next: DaysMask = [...value] as DaysMask;
    next[dayIndex] = !next[dayIndex];
    onChange(next);
    // Springy squish on tap.
    if (btn) {
      gsap.fromTo(
        btn,
        { scale: 0.82 },
        { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.55)' },
      );
    }
  };

  const applyMask = (mask: DaysMask) => {
    haptics.tap();
    onChange(mask);
    // Pulse every active pill.
    const pills = pillRefs.current.filter(Boolean) as HTMLButtonElement[];
    gsap.fromTo(
      pills,
      { scale: 0.9 },
      {
        scale: 1,
        duration: 0.5,
        stagger: 0.03,
        ease: 'elastic.out(1, 0.6)',
      },
    );
  };

  const isEqualMask = (a: DaysMask, b: DaysMask) => a.every((v, i) => v === b[i]);
  const matchesAll = isEqualMask(value, ALL_MASK);
  const matchesWeekdays = isEqualMask(value, WEEKDAY_MASK);
  const matchesWeekend = isEqualMask(value, WEEKEND_MASK);

  return (
    <div>
      {/* ─── The seven pills ─── */}
      <div
        ref={pillsRef}
        className="grid grid-cols-7 gap-1.5 mb-3"
        role="group"
        aria-label="Días de la semana activos"
      >
        {DAY_ORDER_MON_FIRST.map((dayIndex, slot) => {
          const active = value[dayIndex];
          return (
            <button
              key={dayIndex}
              ref={(el) => { pillRefs.current[slot] = el; }}
              onClick={(e) => togglePill(dayIndex, e.currentTarget)}
              className="relative aspect-square rounded-xl font-ui text-[14px] tracking-[0.06em] transition-colors select-none"
              style={{
                border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.6) : 'rgba(255,250,240,0.1)'}`,
                background: active
                  ? `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.22)}, ${hexToRgba(SUNRISE.rise2, 0.08)})`
                  : 'rgba(255,250,240,0.03)',
                color: active ? 'var(--sunrise-text)' : 'var(--sunrise-text-muted)',
                boxShadow: active ? `0 0 14px -4px ${hexToRgba(SUNRISE.rise2, 0.55)}` : 'none',
                fontWeight: active ? 500 : 400,
              }}
              aria-pressed={active}
              aria-label={fullDayName(dayIndex)}
            >
              {WEEKDAY_LABELS_ES[slot]}
              {/* Active dot (subtle bottom accent) */}
              <span
                className="absolute left-1/2 bottom-1 -translate-x-1/2 w-1 h-1 rounded-full transition-opacity"
                style={{
                  background: SUNRISE.rise2,
                  opacity: active ? 0.9 : 0,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* ─── Shortcut chips ─── */}
      <div className="flex flex-wrap gap-1.5">
        <Shortcut label="Todos los días" active={matchesAll} onClick={() => applyMask(ALL_MASK)} />
        <Shortcut label="Lun – Vie" active={matchesWeekdays} onClick={() => applyMask(WEEKDAY_MASK)} />
        <Shortcut label="Sáb – Dom" active={matchesWeekend} onClick={() => applyMask(WEEKEND_MASK)} />
      </div>
    </div>
  );
}

function fullDayName(dayIndex: number): string {
  return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];
}

function Shortcut({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full font-ui text-[10px] tracking-[0.2em] uppercase transition-all active:scale-[0.97]"
      style={{
        border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.5) : 'rgba(255,250,240,0.1)'}`,
        background: active ? hexToRgba(SUNRISE.rise2, 0.1) : 'rgba(255,250,240,0.03)',
        color: active ? 'var(--sunrise-text)' : 'var(--sunrise-text-muted)',
      }}
    >
      {label}
    </button>
  );
}
