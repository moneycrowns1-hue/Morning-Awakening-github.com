'use client';

// ═══════════════════════════════════════════════════════════
// NucleusCompanion · day-mode pill on the Welcome screen
//
// Shows the active block (or the next-up if we're between blocks
// inside the 06:50–18:00 window). Auto-hides outside that window.
// Tapping it opens NucleusTimelineScreen.
//
// Visuals:
//   - Two-tone gradient (deep blue → sun gold) tinted by the
//     current block's stage colour.
//   - Big kanji watermark with breathing scale loop.
//   - Codename + title + countdown to block end.
//   - Row of 4 dots showing micro-habit completion of the block.
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronRight } from 'lucide-react';
import {
  getCurrentBlock,
  getNextBlock,
  getBlockProgress,
  hhmmToMinutes,
  isNucleusWindow,
  type NucleusBlock,
} from '@/lib/nucleusConstants';
import { isHabitDone } from '@/lib/habits';
import { NUCLEUS, NUCLEUS_TEXT, getNucleusStageColors, nucleusRgba } from '@/lib/nucleusTheme';
import { haptics } from '@/lib/haptics';

interface NucleusCompanionProps {
  onOpen: () => void;
}

export default function NucleusCompanion({ onOpen }: NucleusCompanionProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const kanjiRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);

  // Tick every 30 s. Cheap, and good enough for a countdown ring.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const inWindow = isNucleusWindow(now);
  const current = useMemo(() => getCurrentBlock(now), [now]);
  const next = useMemo(() => (current ? null : getNextBlock(now)), [now, current]);
  const block: NucleusBlock | null = current ?? next;

  // Kanji breathing loop.
  useLayoutEffect(() => {
    const node = kanjiRef.current;
    if (!node) return;
    const tween = gsap.to(node, {
      scale: 1.04,
      duration: 5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
      gsap.set(node, { scale: 1 });
    };
  }, [block?.id]);

  // Active-block halo pulse.
  useLayoutEffect(() => {
    const node = haloRef.current;
    if (!current || !node) return;
    const tween = gsap.to(node, {
      opacity: 0.85,
      duration: 2.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
      gsap.set(node, { opacity: 0.55 });
    };
  }, [current]);

  if (!inWindow || !block) return null;

  const stage = getNucleusStageColors(block.id);
  const isActive = !!current;
  const progress = isActive ? getBlockProgress(block, now) : 0;

  // Time-to-event: minutes until block end (active) or block start (upcoming).
  const targetMin = isActive ? hhmmToMinutes(block.endHHMM) : hhmmToMinutes(block.startHHMM);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const remainingMin = Math.max(0, targetMin - nowMin);
  const remainingLabel = formatRemaining(remainingMin);

  // 4 micro-habit dots (or up to N).
  const dots = block.microHabits.slice(0, 4);

  return (
    <button
      onClick={() => { haptics.tap(); onOpen(); }}
      className="relative w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.985]"
      style={{
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${nucleusRgba(stage.sky, 0.92)} 0%, ${nucleusRgba(stage.horizon, 0.78)} 100%)`,
        border: `1px solid ${nucleusRgba(stage.accent, 0.35)}`,
        boxShadow: isActive
          ? `0 12px 36px -16px ${nucleusRgba(NUCLEUS.sun_gold, 0.55)}`
          : `0 6px 24px -10px ${nucleusRgba(NUCLEUS.sky_deep, 0.6)}`,
      }}
    >
      {/* Active halo */}
      {isActive && (
        <div
          ref={haloRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 80% 20%, ${nucleusRgba(NUCLEUS.sun_halo, 0.32)} 0%, transparent 60%)`,
            opacity: 0.55,
          }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Kanji watermark */}
        <div
          ref={kanjiRef}
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: nucleusRgba(NUCLEUS.cloud, 0.08),
            border: `1px solid ${nucleusRgba(NUCLEUS.cloud, 0.15)}`,
            color: NUCLEUS.sun_halo,
            fontFamily: 'var(--font-cinzel, serif)',
            fontSize: 28,
            fontWeight: 300,
            textShadow: `0 0 18px ${nucleusRgba(NUCLEUS.sun_gold, 0.45)}`,
          }}
        >
          {block.kanji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Status pill */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-ui text-[9px] tracking-[0.32em] uppercase px-2 py-0.5 rounded-full"
              style={{
                color: isActive ? NUCLEUS.sky_deep : NUCLEUS.sun_halo,
                background: isActive ? nucleusRgba(NUCLEUS.sun_gold, 0.92) : nucleusRgba(NUCLEUS.sun_gold, 0.18),
                border: `1px solid ${nucleusRgba(NUCLEUS.sun_gold, 0.55)}`,
                fontWeight: 600,
              }}
            >
              {isActive ? 'En curso' : 'Próximo'}
            </span>
            <span
              className="font-ui text-[10px] tracking-[0.28em] uppercase"
              style={{ color: NUCLEUS_TEXT.muted }}
            >
              NUCLEUS
            </span>
          </div>
          {/* Codename + title */}
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="font-display italic font-[400] text-[16px] truncate"
              style={{ color: NUCLEUS_TEXT.primary }}
            >
              {block.codename}
            </span>
            <span
              className="font-ui text-[11px] truncate"
              style={{ color: NUCLEUS_TEXT.soft }}
            >
              {block.title}
            </span>
          </div>
          {/* Countdown */}
          <div className="mt-1 font-mono text-[11px]" style={{ color: NUCLEUS_TEXT.soft }}>
            {isActive ? `Falta ${remainingLabel}` : `En ${remainingLabel} · ${block.startHHMM}`}
          </div>
        </div>

        {/* Right column: dots + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <ChevronRight size={16} strokeWidth={1.8} style={{ color: NUCLEUS_TEXT.soft }} />
          <div className="flex items-center gap-1.5">
            {dots.map((mh) => {
              const done = isHabitDone(mh.habitId);
              return (
                <span
                  key={mh.id}
                  className="block w-2 h-2 rounded-full"
                  style={{
                    background: done ? NUCLEUS.sun_gold : nucleusRgba(NUCLEUS.cloud, 0.25),
                    boxShadow: done ? `0 0 6px ${nucleusRgba(NUCLEUS.sun_gold, 0.7)}` : 'none',
                    border: `1px solid ${done ? nucleusRgba(NUCLEUS.sun_gold, 0.7) : nucleusRgba(NUCLEUS.cloud, 0.25)}`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress bar (only when active) */}
      {isActive && (
        <div
          className="relative mt-3 h-[3px] rounded-full overflow-hidden"
          style={{ background: nucleusRgba(NUCLEUS.cloud, 0.12) }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${NUCLEUS.sun_gold} 0%, ${NUCLEUS.sun_halo} 100%)`,
              boxShadow: `0 0 10px ${nucleusRgba(NUCLEUS.sun_gold, 0.55)}`,
              transition: 'width 0.6s ease-out',
            }}
          />
        </div>
      )}
    </button>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatRemaining(min: number): string {
  if (min <= 0) return '0 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}
