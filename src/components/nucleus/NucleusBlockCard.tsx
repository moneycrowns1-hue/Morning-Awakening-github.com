'use client';

// ═══════════════════════════════════════════════════════════
// NucleusBlockCard · big showcase card (Craftsmen-style)
//
// Diseño · poppr.be / jeton.com / thecraftsmen.tech showcase:
//   ┌─────────────────────────────────────────┐ rounded 22
//   │  02.                    en curso ·      │ numeral + status
//   │                                         │
//   │         enfoque                         │ huge lowercase
//   │                                         │
//   │  06:50 — 09:00 · 2h 10m                 │ time mono
//   │  ─────────────────────────────          │ hairline
//   │  abrir                            ↗     │ action footer
//   └─────────────────────────────────────────┘
//
//   - Active: solid accent bg + ink-paper text (CTA-style).
//   - Upcoming: tint glass + accent hairline.
//   - Past: dimmed glass.
//   - Paused: muy dimmed, "en pausa hoy".
//   - Tap → expande body con narrative, directiva, micro-hábitos,
//     ciencia, tips (animado con GSAP).
// ═══════════════════════════════════════════════════════════

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import {
  describeWindow,
  getBlockProgress,
  type NucleusBlock,
} from '@/lib/nucleus/nucleusConstants';
import { useAppTheme } from '@/lib/common/appTheme';
import { hexToRgba } from '@/lib/common/theme';
import { isHabitDone, setHabit } from '@/lib/common/habits';
import { haptics } from '@/lib/common/haptics';
import type { HabitId } from '@/lib/common/habits';

interface NucleusBlockCardProps {
  block: NucleusBlock;
  /** 1-indexed position in the NUCLEUS_BLOCKS list (for numeral). */
  index: number;
  now: Date;
  defaultExpanded?: boolean;
  pausedToday?: boolean;
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

export default function NucleusBlockCard({
  block, index, now, defaultExpanded, pausedToday, onAction,
}: NucleusBlockCardProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const rawStatus = getStatus(block, now);
  const status: BlockStatus = pausedToday
    ? rawStatus === 'past' ? 'past' : 'upcoming'
    : rawStatus;
  const [expanded, setExpanded] = useState<boolean>(
    pausedToday ? false : (defaultExpanded ?? status === 'active'),
  );
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Expand / collapse animation.
  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    if (expanded) {
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

  const progress = useMemo(() => {
    return status === 'active' ? getBlockProgress(block, now) : status === 'past' ? 1 : 0;
  }, [status, block, now]);

  const toggle = () => {
    haptics.tap();
    setExpanded((v) => !v);
  };

  // ── Color tokens by status ────────────────────────────────
  const isActive = status === 'active';
  const isPast = status === 'past';

  // Active card uses solid accent bg + paper text (like CTA pills).
  // Otherwise tint glass + ink text.
  const cardBg = isActive ? D.accent : hexToRgba(D.tint, 0.7);
  const cardBorder = isActive
    ? D.accent_deep
    : hexToRgba(D.accent, isPast ? 0.12 : 0.22);
  const heroColor = isActive ? D.paper : DT.primary;
  const captionColor = isActive ? hexToRgba(D.paper, 0.7) : DT.muted;
  const subtleColor = isActive ? hexToRgba(D.paper, 0.85) : DT.soft;
  const numeralColor = isActive ? D.paper : hexToRgba(D.accent, 0.7);
  const hairlineColor = isActive
    ? hexToRgba(D.paper, 0.25)
    : hexToRgba(D.accent, 0.16);

  // Status caption text
  const statusLabel = pausedToday
    ? 'en pausa hoy'
    : isActive
    ? 'en curso'
    : isPast
    ? 'cerrado'
    : 'próximo';

  // Time mono caption
  const timeStr = `${block.startHHMM} — ${block.endHHMM}`;
  const minutesTotal = (() => {
    const [sh, sm] = block.startHHMM.split(':').map(Number);
    const [eh, em] = block.endHHMM.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();
  const durationStr = minutesTotal >= 60
    ? `${Math.floor(minutesTotal / 60)}h ${minutesTotal % 60 > 0 ? `${minutesTotal % 60}m` : ''}`.trim()
    : `${minutesTotal}m`;

  return (
    <div
      data-block-card={block.id}
      className="relative overflow-hidden transition-all"
      style={{
        borderRadius: 22,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isActive
          ? `0 18px 48px -18px ${hexToRgba(D.accent, 0.55)}`
          : '0 4px 18px -10px rgba(0,0,0,0.12)',
        opacity: pausedToday ? 0.55 : 1,
        backdropFilter: !isActive ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: !isActive ? 'blur(10px)' : 'none',
      }}
    >
      {/* Active progress overlay (top hairline filling left→right) */}
      {isActive && (
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: hexToRgba(D.paper, 0.18) }}
        >
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

      <button
        onClick={toggle}
        aria-expanded={expanded}
        className="relative w-full text-left px-5 py-5 md:py-6"
      >
        {/* ── Top row: numeral + status caption ───────────── */}
        <div className="flex items-baseline justify-between mb-6 md:mb-8">
          <span
            className="font-headline font-[700] tabular-nums tracking-[-0.02em]"
            style={{ color: numeralColor, fontSize: 22, lineHeight: 1 }}
          >
            {String(index).padStart(2, '0')}.
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[600]"
            style={{ color: captionColor, fontSize: 9.5 }}
          >
            {statusLabel}
            <span style={{ marginLeft: 5 }}>·</span>
          </span>
        </div>

        {/* ── Hero: codename ──────────────────────────────── */}
        <h3
          className="font-headline font-[700] lowercase tracking-[-0.045em]"
          style={{
            color: heroColor,
            fontSize: 'clamp(2.4rem, 8vw, 3.4rem)',
            lineHeight: 0.92,
            textShadow: isActive ? `0 0 40px ${hexToRgba(D.accent_deep, 0.32)}` : 'none',
          }}
        >
          {block.codename.toLowerCase()}
          <span style={{ color: isActive ? D.accent_deep : D.accent }}>.</span>
        </h3>

        {/* ── Subtitle (block.title) ──────────────────────── */}
        <p
          className="mt-3 font-ui leading-[1.45] line-clamp-2"
          style={{ color: subtleColor, fontSize: 13.5 }}
        >
          {block.title}
        </p>

        {/* ── Time mono ───────────────────────────────────── */}
        <div
          className="mt-5 font-mono tabular-nums tracking-[0.1em]"
          style={{ color: captionColor, fontSize: 11 }}
        >
          {timeStr} · {durationStr}
        </div>

        {/* ── Hairline divider ────────────────────────────── */}
        <div
          aria-hidden
          className="mt-4 mb-4 h-[1px] w-full"
          style={{ background: hairlineColor }}
        />

        {/* ── Footer: action label + arrow ────────────────── */}
        <div className="flex items-center justify-between">
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: isActive ? D.paper : D.accent, fontSize: 10 }}
          >
            {expanded ? 'cerrar' : describeWindow(block).split('·')[1]?.trim() ?? 'abrir'}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2.2}
            style={{
              color: isActive ? D.paper : D.accent,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          />
        </div>
      </button>

      {/* ─── Body collapsible ─────────────────────────────── */}
      <div
        ref={bodyRef}
        className="relative overflow-hidden"
        style={{
          height: defaultExpanded ?? status === 'active' ? 'auto' : 0,
          opacity: defaultExpanded ?? status === 'active' ? 1 : 0,
        }}
      >
        <div
          className="px-5 pb-6 pt-2 flex flex-col gap-4"
          style={{ borderTop: `1px solid ${hairlineColor}` }}
        >
          {/* Narrative */}
          <p
            className="font-ui leading-[1.6] mt-3"
            style={{ color: subtleColor, fontSize: 13 }}
          >
            {block.narrative}
          </p>

          {/* Directiva · jeton */}
          <div
            className="px-4 py-3.5"
            style={{
              borderRadius: 14,
              background: isActive ? hexToRgba(D.paper, 0.16) : hexToRgba(D.accent, 0.08),
              border: `1px solid ${isActive ? hexToRgba(D.paper, 0.28) : hexToRgba(D.accent, 0.28)}`,
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700] mb-1.5"
              style={{ color: isActive ? D.paper : D.accent, fontSize: 9 }}
            >
              · directiva ·
            </div>
            <div
              className="font-ui leading-[1.55]"
              style={{ color: heroColor, fontSize: 12.5 }}
            >
              {block.directive}
            </div>
          </div>

          {/* NSDR action CTA */}
          {block.action === 'nsdr' && onAction && (
            <button
              onClick={(e) => { e.stopPropagation(); haptics.tap(); onAction(block); }}
              className="w-full font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center justify-center gap-2"
              style={{
                padding: '14px 20px',
                borderRadius: 99,
                fontSize: 11,
                background: isActive ? D.paper : D.accent,
                color: isActive ? D.accent : D.paper,
                boxShadow: `0 8px 24px -6px ${hexToRgba(isActive ? D.accent_deep : D.accent, 0.4)}`,
              }}
            >
              iniciar NSDR · 20 min
              <ArrowUpRight size={14} strokeWidth={2.4} />
            </button>
          )}

          {/* Micro-habits */}
          {block.microHabits.length > 0 && (
            <div className="flex flex-col">
              <div
                className="font-mono uppercase tracking-[0.42em] font-[700] mb-2"
                style={{ color: captionColor, fontSize: 9 }}
              >
                · micro-hábitos ·
              </div>
              <div className="flex flex-col">
                {block.microHabits.map((mh, i) => (
                  <MicroHabitRow
                    key={mh.id}
                    habitId={mh.habitId}
                    label={mh.label}
                    description={mh.description}
                    index={i + 1}
                    isActiveCard={isActive}
                    D={D}
                    DT={DT}
                    hairlineColor={hairlineColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ciencia note */}
          <div
            className="px-4 py-3"
            style={{
              borderRadius: 14,
              background: isActive ? hexToRgba(D.paper, 0.1) : hexToRgba(D.tint_deep, 0.4),
              border: `1px solid ${hairlineColor}`,
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700] mb-1"
              style={{ color: captionColor, fontSize: 9 }}
            >
              · ciencia ·
            </div>
            <p
              className="font-ui leading-[1.55]"
              style={{ color: subtleColor, fontSize: 11.5 }}
            >
              {block.scienceNote}
            </p>
          </div>

          {/* Tips */}
          {block.tips.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-1">
              {block.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 font-ui leading-[1.55]"
                  style={{ color: subtleColor, fontSize: 11.5 }}
                >
                  <span
                    style={{
                      color: isActive ? D.paper : D.accent,
                      flexShrink: 0,
                      fontFamily: 'monospace',
                    }}
                  >
                    ·
                  </span>
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

// ─── Micro-habit row · numeral + label + checkbox ──────────

function MicroHabitRow({
  habitId,
  label,
  description,
  index,
  isActiveCard,
  D,
  DT,
  hairlineColor,
}: {
  habitId: HabitId;
  label: string;
  description: string;
  index: number;
  isActiveCard: boolean;
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
  hairlineColor: string;
}) {
  const [done, setDone] = useState<boolean>(() => isHabitDone(habitId));
  const tickRef = useRef<SVGPathElement | null>(null);
  const rowRef = useRef<HTMLButtonElement | null>(null);

  const captionColor = isActiveCard ? hexToRgba(D.paper, 0.7) : DT.muted;
  const labelColor = isActiveCard ? D.paper : DT.primary;
  const numeralColor = done
    ? (isActiveCard ? D.paper : D.accent)
    : (isActiveCard ? hexToRgba(D.paper, 0.45) : hexToRgba(D.accent, 0.45));
  const checkBoxFill = done ? (isActiveCard ? D.paper : D.accent) : 'transparent';
  const checkBoxBorder = done
    ? (isActiveCard ? D.paper : D.accent)
    : (isActiveCard ? hexToRgba(D.paper, 0.4) : hexToRgba(D.accent, 0.32));
  const checkColor = isActiveCard ? D.accent : D.paper;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    }
  };

  return (
    <button
      ref={rowRef}
      onClick={toggle}
      className="relative flex items-baseline gap-4 py-2.5 text-left transition-opacity active:opacity-70"
      style={{ borderBottom: `1px solid ${hairlineColor}` }}
    >
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: numeralColor,
          fontSize: 11,
          letterSpacing: '0.1em',
          fontWeight: done ? 700 : 500,
          minWidth: '2ch',
        }}
      >
        {String(index).padStart(2, '0')}
      </span>

      <span className="flex-1 min-w-0">
        <span
          className="block font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{
            color: done ? captionColor : labelColor,
            fontSize: 13.5,
            textDecoration: done ? 'line-through' : 'none',
            textDecorationColor: hexToRgba(isActiveCard ? D.paper : D.accent, 0.5),
          }}
        >
          {label.toLowerCase()}
        </span>
        <span
          className="block mt-0.5 font-ui leading-[1.45]"
          style={{ color: captionColor, fontSize: 10.5 }}
        >
          {description}
        </span>
      </span>

      <span
        className="shrink-0 w-6 h-6 flex items-center justify-center"
        style={{
          background: checkBoxFill,
          border: `1px solid ${checkBoxBorder}`,
          borderRadius: 6,
          marginTop: 2,
        }}
      >
        {done && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path
              ref={tickRef}
              d="M5 12 L10 17 L19 7"
              stroke={checkColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {done && (
        <Check
          size={12}
          strokeWidth={2.4}
          style={{
            color: isActiveCard ? D.paper : D.accent,
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
          }}
          aria-hidden
        />
      )}
    </button>
  );
}
