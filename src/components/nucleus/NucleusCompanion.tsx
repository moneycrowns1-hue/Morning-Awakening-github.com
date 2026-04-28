'use client';

// ═══════════════════════════════════════════════════════════
// NucleusCompanion · day-mode bento card on the Welcome screen
//
// Diseño · split bento estilo welcome (info izq + CTA der).
//   ┌────────────────────────────────┬────────┐ rounded 22
//   │  03. · próximo                 │        │
//   │                                │   ↗    │  ← arrow + icon
//   │  enfoque.                      │   día  │
//   │  06:50 — 09:00                 │  NUCLEUS│
//   │  ●●○○ · 2/4 hábitos hechos     │        │
//   └────────────────────────────────┴────────┘
//
//   - Fondo glass tint con border accent (active = más fuerte).
//   - Hairline progress 1px en bottom cuando active.
//   - SIN kanji · SIN watermark · SIN azul.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  getCurrentBlock,
  getNextBlock,
  getBlockProgress,
  hhmmToMinutes,
  isNucleusWindow,
  type NucleusBlock,
} from '@/lib/nucleus/nucleusConstants';
import { isHabitDone } from '@/lib/common/habits';
import { useAppTheme } from '@/lib/common/appTheme';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

interface NucleusCompanionProps {
  onOpen: () => void;
}

export default function NucleusCompanion({ onOpen }: NucleusCompanionProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const inWindow = isNucleusWindow(now);
  const current = useMemo(() => getCurrentBlock(now), [now]);
  const next = useMemo(() => (current ? null : getNextBlock(now)), [now, current]);
  const block: NucleusBlock | null = current ?? next;

  if (!inWindow || !block) return null;

  const isActive = !!current;
  const progress = isActive ? getBlockProgress(block, now) : 0;

  const targetMin = isActive ? hhmmToMinutes(block.endHHMM) : hhmmToMinutes(block.startHHMM);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const remainingMin = Math.max(0, targetMin - nowMin);
  const remainingLabel = formatRemaining(remainingMin);

  const dots = block.microHabits.slice(0, 4);
  const dotsDone = dots.filter((mh) => isHabitDone(mh.habitId)).length;

  return (
    <button
      onClick={() => { haptics.tap(); onOpen(); }}
      className="relative w-full text-left overflow-hidden flex items-stretch transition-transform active:scale-[0.985]"
      style={{
        borderRadius: 22,
        background: isActive ? D.accent : hexToRgba(D.tint, 0.7),
        border: `1px solid ${isActive ? D.accent_deep : hexToRgba(D.accent, 0.22)}`,
        boxShadow: isActive
          ? `0 14px 40px -14px ${hexToRgba(D.accent, 0.45)}`
          : '0 4px 18px -10px rgba(0,0,0,0.12)',
        backdropFilter: !isActive ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: !isActive ? 'blur(10px)' : 'none',
      }}
    >
      {/* LEFT · info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between px-4 py-3.5">
        {/* Top: status caption mono */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles
            size={11}
            strokeWidth={2}
            style={{ color: isActive ? D.paper : D.accent }}
          />
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{
              color: isActive ? hexToRgba(D.paper, 0.85) : DT.muted,
              fontSize: 9,
            }}
          >
            día · NUCLEUS · {isActive ? 'en curso' : 'próximo'}
          </span>
        </div>

        {/* Hero codename lowercase */}
        <div
          className="font-headline font-[700] lowercase tracking-[-0.03em] truncate"
          style={{
            color: isActive ? D.paper : DT.primary,
            fontSize: 22,
            lineHeight: 0.95,
          }}
        >
          {block.codename.toLowerCase()}
          <span style={{ color: isActive ? D.accent_deep : D.accent }}>.</span>
        </div>

        {/* Time + countdown */}
        <div
          className="mt-1.5 font-mono tabular-nums tracking-[0.06em]"
          style={{
            color: isActive ? hexToRgba(D.paper, 0.8) : DT.soft,
            fontSize: 10.5,
          }}
        >
          {block.startHHMM}—{block.endHHMM} · {isActive ? `−${remainingLabel}` : `en ${remainingLabel}`}
        </div>

        {/* Habits dots + count */}
        {dots.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {dots.map((mh) => {
                const done = isHabitDone(mh.habitId);
                const dotBg = isActive
                  ? (done ? D.paper : hexToRgba(D.paper, 0.25))
                  : (done ? D.accent : hexToRgba(D.accent, 0.2));
                return (
                  <span
                    key={mh.id}
                    className="block w-1.5 h-1.5 rounded-full"
                    style={{ background: dotBg }}
                  />
                );
              })}
            </div>
            <span
              className="font-mono uppercase tracking-[0.28em] font-[600]"
              style={{
                color: isActive ? hexToRgba(D.paper, 0.7) : DT.muted,
                fontSize: 9,
              }}
            >
              {dotsDone}/{dots.length} hechos
            </span>
          </div>
        )}

        {/* Hairline progress bottom */}
        {isActive && (
          <div className="relative mt-3 h-[1px]" style={{ background: hexToRgba(D.paper, 0.22) }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${progress * 100}%`,
                background: D.paper,
                transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
              }}
            />
          </div>
        )}
      </div>

      {/* RIGHT · CTA · arrow + brand */}
      <div
        className="shrink-0 flex flex-col items-center justify-between px-4 py-3.5"
        style={{
          minWidth: 86,
          background: isActive ? D.accent_deep : hexToRgba(D.accent, 0.12),
          color: isActive ? D.paper : D.accent,
        }}
      >
        <ArrowUpRight
          size={18}
          strokeWidth={2.4}
          style={{ color: isActive ? D.paper : D.accent }}
        />
        <span
          className="font-mono uppercase tracking-[0.32em] font-[700] text-center"
          style={{
            color: isActive ? D.paper : D.accent,
            fontSize: 8.5,
            lineHeight: 1.3,
            opacity: 0.85,
          }}
        >
          abrir
          <br />
          timeline
        </span>
      </div>
    </button>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatRemaining(min: number): string {
  if (min <= 0) return '0m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
