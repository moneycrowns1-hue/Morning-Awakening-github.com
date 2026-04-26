'use client';

// ═══════════════════════════════════════════════════════════
// NucleusBlockCard · expandable card for the timeline screen
//
// Renders one of the 6 NUCLEUS macro-blocks as a tall card with
// a left rail (kanji + time progress), a header (codename +
// title + window), and a collapsible body that shows the
// narrative, directive, scienceNote, micro-habit checklist, and
// (optionally) a special action button (NSDR launcher, etc.).
//
// Animation duties:
//   - Card entrance: fade + slide-up via parent (stagger).
//   - Active block: warm-gold halo pulse using GSAP.
//   - Expand/collapse: GSAP timeline that animates max-height
//     of the body section.
//   - Habit check: stroke-dashoffset + scale punch + golden
//     particles on completion (lightweight, no plugin).
// ═══════════════════════════════════════════════════════════

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import {
  describeWindow,
  getBlockProgress,
  type NucleusBlock,
} from '@/lib/nucleus/nucleusConstants';
import { NUCLEUS, NUCLEUS_TEXT, getNucleusStageColors, nucleusRgba } from '@/lib/nucleus/nucleusTheme';
import { isHabitDone, setHabit } from '@/lib/common/habits';
import { haptics } from '@/lib/common/haptics';
import type { HabitId } from '@/lib/common/habits';

interface NucleusBlockCardProps {
  block: NucleusBlock;
  /** Compared against block window to render "active" / "past" / "upcoming". */
  now: Date;
  /** Open by default? Active block opens by default. */
  defaultExpanded?: boolean;
  /** True when the day profile (rest/sat) disables this block today.
   *  Card renders dimmed with a "En pausa hoy" badge instead of the
   *  normal status badge, no halo, no auto-expand. */
  pausedToday?: boolean;
  /** Optional: action handler for blocks that have a sub-screen (NSDR). */
  onAction?: (block: NucleusBlock) => void;
}

type BlockStatus = 'past' | 'active' | 'upcoming';

function getStatus(block: NucleusBlock, now: Date): BlockStatus {
  const m = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = block.startHHMM.split(':').map(Number);
  const [eh, em] = block.endHHMM.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (m < start) return 'upcoming';
  if (m >= end) return 'past';
  return 'active';
}

export default function NucleusBlockCard({ block, now, defaultExpanded, pausedToday, onAction }: NucleusBlockCardProps) {
  const rawStatus = getStatus(block, now);
  // When paused by day profile, never display as 'active' so the halo,
  // active border and gold accents don't render even if the wall clock
  // is inside the block's window.
  const status: BlockStatus = pausedToday ? rawStatus === 'past' ? 'past' : 'upcoming' : rawStatus;
  const [expanded, setExpanded] = useState<boolean>(
    pausedToday ? false : (defaultExpanded ?? status === 'active'),
  );
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  const stage = useMemo(() => getNucleusStageColors(block.id), [block.id]);

  // Halo pulse on active block.
  useLayoutEffect(() => {
    const node = haloRef.current;
    if (status !== 'active' || !node) return;
    const tween = gsap.to(node, {
      opacity: 0.9,
      duration: 2.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
      gsap.set(node, { opacity: 0.55 });
    };
  }, [status]);

  // Expand / collapse animation.
  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    if (expanded) {
      // Measure to natural height.
      gsap.fromTo(
        bodyRef.current,
        { height: 0, opacity: 0 },
        {
          height: 'auto',
          opacity: 1,
          duration: 0.45,
          ease: 'power2.out',
          onComplete: () => {
            if (bodyRef.current) bodyRef.current.style.height = 'auto';
          },
        },
      );
    } else {
      gsap.to(bodyRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.32,
        ease: 'power2.inOut',
      });
    }
  }, [expanded]);

  const progress = status === 'active' ? getBlockProgress(block, now) : status === 'past' ? 1 : 0;

  const toggle = () => {
    haptics.tap();
    setExpanded((v) => !v);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      data-block-card={block.id}
      style={{
        background: `linear-gradient(165deg, ${nucleusRgba(stage.sky, 0.85)} 0%, ${nucleusRgba(stage.horizon, 0.65)} 100%)`,
        border: `1px solid ${
          status === 'active'
            ? nucleusRgba(NUCLEUS.sun_gold, 0.55)
            : nucleusRgba(NUCLEUS.cloud, 0.1)
        }`,
        boxShadow:
          status === 'active'
            ? `0 14px 40px -16px ${nucleusRgba(NUCLEUS.sun_gold, 0.55)}`
            : '0 4px 18px -10px rgba(0,0,0,0.5)',
        opacity: pausedToday ? 0.45 : 1,
        filter: pausedToday ? 'grayscale(0.4)' : 'none',
      }}
    >
      {/* Active halo */}
      {status === 'active' && (
        <div
          ref={haloRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 90% 0%, ${nucleusRgba(NUCLEUS.sun_halo, 0.4)} 0%, transparent 55%)`,
            opacity: 0.55,
          }}
        />
      )}

      <button
        onClick={toggle}
        aria-expanded={expanded}
        className="relative w-full flex items-stretch gap-3 px-4 py-3 text-left"
      >
        {/* Left rail · kanji + progress bar */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-12">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: nucleusRgba(NUCLEUS.cloud, 0.08),
              border: `1px solid ${nucleusRgba(NUCLEUS.cloud, 0.15)}`,
              color: status === 'past' ? NUCLEUS_TEXT.muted : NUCLEUS.sun_halo,
              fontFamily: 'var(--font-cinzel, serif)',
              fontSize: 22,
              fontWeight: 300,
              textShadow:
                status === 'active'
                  ? `0 0 14px ${nucleusRgba(NUCLEUS.sun_gold, 0.55)}`
                  : 'none',
            }}
          >
            {block.kanji}
          </div>
          <div
            className="relative w-1 h-12 rounded-full"
            style={{ background: nucleusRgba(NUCLEUS.cloud, 0.12) }}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-full"
              style={{
                height: `${progress * 100}%`,
                background:
                  status === 'past'
                    ? nucleusRgba(NUCLEUS.cloud, 0.45)
                    : `linear-gradient(180deg, ${NUCLEUS.sun_gold}, ${NUCLEUS.sun_halo})`,
                transition: 'height 0.6s ease-out',
              }}
            />
          </div>
        </div>

        {/* Middle · text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-display italic font-[400] text-[18px] truncate"
              style={{ color: NUCLEUS_TEXT.primary }}
            >
              {block.codename}
            </span>
            {pausedToday ? <PausedBadge /> : <StatusBadge status={status} />}
          </div>
          <div
            className="font-ui text-[11px] truncate"
            style={{ color: NUCLEUS_TEXT.soft }}
          >
            {block.title}
          </div>
          <div
            className="mt-1 font-mono text-[10px] tracking-[0.2em]"
            style={{ color: NUCLEUS_TEXT.muted }}
          >
            {describeWindow(block)} · {block.kanjiReading}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={18}
          strokeWidth={1.8}
          style={{
            color: NUCLEUS_TEXT.soft,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        />
      </button>

      {/* Body (collapsible) */}
      <div
        ref={bodyRef}
        className="relative overflow-hidden"
        style={{ height: defaultExpanded ?? status === 'active' ? 'auto' : 0, opacity: defaultExpanded ?? status === 'active' ? 1 : 0 }}
      >
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4">
          <p
            className="font-ui text-[12.5px] leading-[1.6]"
            style={{ color: NUCLEUS_TEXT.primary }}
          >
            {block.narrative}
          </p>

          <div
            className="rounded-xl p-3"
            style={{
              background: nucleusRgba(NUCLEUS.sun_gold, 0.08),
              border: `1px solid ${nucleusRgba(NUCLEUS.sun_gold, 0.25)}`,
            }}
          >
            <div
              className="font-ui text-[9.5px] tracking-[0.3em] uppercase mb-1"
              style={{ color: NUCLEUS.sun_halo }}
            >
              Directiva
            </div>
            <div
              className="font-ui text-[12px] leading-[1.5]"
              style={{ color: NUCLEUS_TEXT.primary }}
            >
              {block.directive}
            </div>
          </div>

          {/* Special action (NSDR) */}
          {block.action === 'nsdr' && onAction && (
            <button
              onClick={() => { haptics.tap(); onAction(block); }}
              className="w-full rounded-xl py-3 transition-transform active:scale-[0.98]"
              style={{
                background: `linear-gradient(180deg, ${nucleusRgba(NUCLEUS.sun_gold, 0.18)} 0%, ${nucleusRgba(NUCLEUS.horizon_blue, 0.5)} 100%)`,
                border: `1px solid ${nucleusRgba(NUCLEUS.sun_halo, 0.5)}`,
                boxShadow: `0 8px 28px -12px ${nucleusRgba(NUCLEUS.sun_gold, 0.45)}`,
              }}
            >
              <span
                className="font-ui font-[500] text-[12px] tracking-[0.32em] uppercase"
                style={{ color: NUCLEUS_TEXT.primary }}
              >
                Iniciar NSDR · 20 min
              </span>
            </button>
          )}

          {/* Micro-habit checklist */}
          {block.microHabits.length > 0 && (
            <div className="flex flex-col gap-2">
              <div
                className="font-ui text-[9.5px] tracking-[0.3em] uppercase"
                style={{ color: NUCLEUS_TEXT.muted }}
              >
                Micro-hábitos
              </div>
              {block.microHabits.map((mh) => (
                <MicroHabitRow key={mh.id} habitId={mh.habitId} label={mh.label} description={mh.description} />
              ))}
            </div>
          )}

          {/* Science note */}
          <div
            className="rounded-xl p-3"
            style={{
              background: nucleusRgba(NUCLEUS.sky_deep, 0.45),
              border: `1px solid ${nucleusRgba(NUCLEUS.cloud, 0.08)}`,
            }}
          >
            <div
              className="font-ui text-[9.5px] tracking-[0.3em] uppercase mb-1"
              style={{ color: NUCLEUS_TEXT.muted }}
            >
              Ciencia
            </div>
            <p
              className="font-ui text-[11.5px] leading-[1.55]"
              style={{ color: NUCLEUS_TEXT.soft }}
            >
              {block.scienceNote}
            </p>
          </div>

          {/* Tips */}
          {block.tips.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {block.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 font-ui text-[11px] leading-[1.55]"
                  style={{ color: NUCLEUS_TEXT.soft }}
                >
                  <span style={{ color: NUCLEUS.sun_halo, flexShrink: 0 }}>·</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────

function PausedBadge() {
  return (
    <span
      className="font-ui text-[8.5px] tracking-[0.32em] uppercase px-2 py-0.5 rounded-full"
      style={{
        background: nucleusRgba(NUCLEUS.cloud, 0.08),
        color: NUCLEUS_TEXT.muted,
        border: `1px solid ${nucleusRgba(NUCLEUS.cloud, 0.18)}`,
        fontWeight: 600,
      }}
    >
      En pausa hoy
    </span>
  );
}

function StatusBadge({ status }: { status: BlockStatus }) {
  const config = (() => {
    switch (status) {
      case 'active':
        return { label: 'En curso', bg: nucleusRgba(NUCLEUS.sun_gold, 0.92), color: NUCLEUS.sky_deep };
      case 'past':
        return { label: 'Cerrado', bg: nucleusRgba(NUCLEUS.cloud, 0.1), color: NUCLEUS_TEXT.muted };
      case 'upcoming':
      default:
        return { label: 'Próximo', bg: nucleusRgba(NUCLEUS.cloud, 0.12), color: NUCLEUS_TEXT.soft };
    }
  })();
  return (
    <span
      className="font-ui text-[8.5px] tracking-[0.32em] uppercase px-2 py-0.5 rounded-full"
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${nucleusRgba(NUCLEUS.sun_gold, status === 'active' ? 0.55 : 0.2)}`,
        fontWeight: 600,
      }}
    >
      {config.label}
    </span>
  );
}

function MicroHabitRow({
  habitId,
  label,
  description,
}: {
  habitId: HabitId;
  label: string;
  description: string;
}) {
  const [done, setDone] = useState<boolean>(() => isHabitDone(habitId));
  const tickRef = useRef<SVGPathElement | null>(null);
  const rowRef = useRef<HTMLButtonElement | null>(null);

  const toggle = () => {
    const next = !done;
    haptics.tap();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setHabit(habitId, iso, next);
    setDone(next);

    if (next && tickRef.current && rowRef.current) {
      const path = tickRef.current;
      const length = path.getTotalLength?.() ?? 24;
      gsap.fromTo(
        path,
        { strokeDasharray: length, strokeDashoffset: length, opacity: 1 },
        { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' },
      );
      gsap.fromTo(
        rowRef.current,
        { scale: 1 },
        { scale: 1.015, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 },
      );
      // Particle burst.
      const burst = document.createElement('div');
      burst.style.position = 'absolute';
      burst.style.inset = '0';
      burst.style.pointerEvents = 'none';
      rowRef.current.appendChild(burst);
      const colors = [NUCLEUS.sun_gold, NUCLEUS.sun_halo, NUCLEUS.cloud];
      for (let i = 0; i < 6; i++) {
        const dot = document.createElement('span');
        dot.style.position = 'absolute';
        dot.style.left = '24px';
        dot.style.top = '50%';
        dot.style.width = '5px';
        dot.style.height = '5px';
        dot.style.borderRadius = '999px';
        dot.style.background = colors[i % colors.length];
        dot.style.boxShadow = `0 0 6px ${colors[i % colors.length]}`;
        burst.appendChild(dot);
        const angle = (i / 6) * Math.PI * 2;
        gsap.fromTo(
          dot,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: Math.cos(angle) * 22,
            y: Math.sin(angle) * 22,
            opacity: 0,
            scale: 0.6,
            duration: 0.55,
            ease: 'power2.out',
            onComplete: () => {
              if (dot.parentElement) dot.parentElement.removeChild(dot);
            },
          },
        );
      }
      window.setTimeout(() => {
        if (burst.parentElement) burst.parentElement.removeChild(burst);
      }, 700);
    }
  };

  return (
    <button
      ref={rowRef}
      onClick={toggle}
      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{
        background: done ? nucleusRgba(NUCLEUS.sun_gold, 0.12) : nucleusRgba(NUCLEUS.cloud, 0.04),
        border: `1px solid ${done ? nucleusRgba(NUCLEUS.sun_gold, 0.45) : nucleusRgba(NUCLEUS.cloud, 0.08)}`,
        color: NUCLEUS_TEXT.primary,
      }}
    >
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: done ? NUCLEUS.sun_gold : 'transparent',
          border: `1px solid ${done ? NUCLEUS.sun_gold : nucleusRgba(NUCLEUS.cloud, 0.3)}`,
        }}
      >
        {done ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path
              ref={tickRef}
              d="M5 12 L10 17 L19 7"
              stroke={NUCLEUS.sky_deep}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <Sparkles size={11} strokeWidth={1.8} style={{ color: NUCLEUS_TEXT.muted }} />
        )}
      </span>
      <div className="text-left min-w-0 flex-1">
        <div
          className="font-ui text-[12.5px] font-[500]"
          style={{ color: NUCLEUS_TEXT.primary }}
        >
          {label}
        </div>
        <div
          className="font-ui text-[10.5px] mt-0.5"
          style={{ color: NUCLEUS_TEXT.muted }}
        >
          {description}
        </div>
      </div>
      {done && (
        <Check size={13} strokeWidth={2.2} style={{ color: NUCLEUS.sun_gold }} />
      )}
    </button>
  );
}
