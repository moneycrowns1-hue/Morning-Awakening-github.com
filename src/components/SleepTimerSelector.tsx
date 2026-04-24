'use client';

// ═══════════════════════════════════════════════════════
// SleepTimerSelector · pill row for 15 / 30 / 60 / 90 / ∞
// minutes + a live progress ring below when a timer is
// actively counting down.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { haptics } from '@/lib/haptics';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import { SLEEP_TIMER_OPTIONS, type SleepTimerMinutes } from '@/lib/nightMode';

interface SleepTimerSelectorProps {
  value: SleepTimerMinutes;
  onChange: (v: SleepTimerMinutes) => void;
  /** Total seconds originally scheduled. Null when timer isn't
   *  running (either 'infinite' or not started). */
  totalSec: number | null;
  /** Seconds remaining. Null when timer isn't running. */
  remainingSec: number | null;
}

export default function SleepTimerSelector({
  value,
  onChange,
  totalSec,
  remainingSec,
}: SleepTimerSelectorProps) {
  const pillsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const pills = pillsRef.current.filter(Boolean) as HTMLButtonElement[];
    if (!pills.length) return;
    gsap.from(pills, { opacity: 0, y: 8, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
  }, []);

  const pct = totalSec && remainingSec != null
    ? Math.max(0, Math.min(1, remainingSec / totalSec))
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SLEEP_TIMER_OPTIONS.map((v, i) => {
          const active = v === value;
          const label = v === 0 ? '∞' : `${v} min`;
          return (
            <button
              key={v}
              ref={(el) => { pillsRef.current[i] = el; }}
              onClick={(e) => {
                haptics.tick();
                onChange(v);
                gsap.fromTo(
                  e.currentTarget,
                  { scale: 0.82 },
                  { scale: 1, duration: 0.42, ease: 'elastic.out(1, 0.55)' },
                );
              }}
              className="px-3 py-1.5 rounded-full font-ui text-[11px] tracking-[0.1em] transition-all"
              style={{
                border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.55) : 'rgba(255,250,240,0.1)'}`,
                background: active ? hexToRgba(SUNRISE.rise2, 0.14) : 'rgba(255,250,240,0.03)',
                color: active ? 'var(--sunrise-text)' : 'var(--sunrise-text-soft)',
                fontWeight: active ? 500 : 400,
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      {pct != null && remainingSec != null && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,250,240,0.05)' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${hexToRgba(SUNRISE.rise1, 0.5)}, ${SUNRISE.rise2})`,
                boxShadow: `0 0 6px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
              }}
            />
          </div>
          <span
            className="font-mono text-[11px] tabular-nums"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            {formatMMSS(remainingSec)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
