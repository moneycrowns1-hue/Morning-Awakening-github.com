'use client';

// ═══════════════════════════════════════════════════════════
// SummaryScreenV8 · cierre del protocolo (post-completion).
//
// MODO NOCHE · paleta global noche para legibilidad y cohesión
// con MissionPhaseV8:
//   - Header masthead · dot amber + caption.
//   - Hero "día superado." big lowercase con punto amber.
//   - QualityGauge centrado.
//   - Stats grid 2×2 cards rounded-22 con glass ember.
//   - Rank strip split bento (clase romana en lugar de kanji).
//   - Últimos 7 días bars con N.amber gradient.
//   - CTA "sellar el día" pill solid amber.
//   - Footer: ver historial + saludo final italic.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BadgeCheck } from 'lucide-react';
import gsap from 'gsap';
import type { StreakData } from '@/lib/genesis/constants';
import { getRankByLevel } from '@/lib/genesis/constants';
import { levelProgress, type OperatorProfile } from '@/lib/genesis/progression';
import { computeQualityScore, loadSessions, type SessionRecord } from '@/lib/genesis/sessionHistory';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import QualityGauge from '../common/QualityGauge';

interface SummaryScreenV8Props {
  streakData: StreakData;
  totalTime: number;
  profile: OperatorProfile;
  sessionXp: number;
  skippedPhases: number[];
  totalPhases: number;
  onProceed: () => void;
  onOpenHistory?: () => void;
}

export default function SummaryScreenV8({
  streakData,
  totalTime,
  profile,
  sessionXp,
  skippedPhases,
  totalPhases,
  onProceed,
  onOpenHistory,
}: SummaryScreenV8Props) {
  const { night: N, nightText: NT } = useAppTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);

  const qualityScore = useMemo(
    () => computeQualityScore({
      phasesCompleted: Math.max(0, totalPhases - skippedPhases.length),
      totalPhases,
      skippedCount: skippedPhases.length,
      durationSec: totalTime,
      streak: streakData.streak,
    }),
    [totalTime, skippedPhases.length, streakData.streak, totalPhases],
  );

  const [recent, setRecent] = useState<SessionRecord[]>([]);
  useEffect(() => {
    setRecent(loadSessions().slice(-7));
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.summary-enter',
        { y: 18, opacity: 0, filter: 'blur(6px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.08 },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const minutes = Math.floor(totalTime / 60);
  const hours = Math.floor(minutes / 60);
  const minutesRemainder = minutes % 60;
  const durationLabel = hours > 0 ? `${hours}h ${minutesRemainder}m` : `${minutes} min`;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{ background: N.void, color: NT.primary }}
    >
      {/* ─── Background · noche editorial ────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(N.amber, 0.22)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(N.ember_1, 0.25)} 0%, transparent 45%, ${hexToRgba(N.ember_deep, 0.35)} 100%)`,
        }}
      />

      {/* ─── Header masthead ────────────────────────────── */}
      <div
        className="relative z-10 px-5 md:px-8 max-w-3xl w-full mx-auto shrink-0 summary-enter"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              protocolo · cierre
            </span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.soft, fontSize: 9 }}
          >
            · {durationLabel} ·
          </span>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.16) }} />
      </div>

      {/* ─── Body ─────────────────────────────────────── */}
      <div
        className="scroll-area flex-1 w-full max-w-md mx-auto flex flex-col items-center relative z-10 min-h-0 px-6 md:px-8"
        style={{
          paddingTop: '1.25rem',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        {/* Hero */}
        <div
          className="font-mono uppercase tracking-[0.42em] font-[700] mb-3 summary-enter"
          style={{
            color: hexToRgba(N.amber, 0.95),
            fontSize: 9,
            textShadow: `0 0 18px ${hexToRgba(N.amber, 0.45)}`,
          }}
        >
          · protocolo completo ·
        </div>

        <h1
          className="font-headline font-[700] lowercase tracking-[-0.045em] text-center summary-enter"
          style={{
            color: NT.primary,
            fontSize: 'clamp(2.6rem, 10vw, 3.6rem)',
            lineHeight: 0.94,
            textShadow: `0 0 60px ${hexToRgba(N.amber, 0.28)}`,
          }}
        >
          día superado
          <span style={{ color: N.amber }}>.</span>
        </h1>

        {/* Quality gauge */}
        <div className="mt-7 mb-1 summary-enter flex flex-col items-center">
          <QualityGauge score={qualityScore} size={240} />
          <div
            className="mt-3 max-w-[28ch] text-center font-mono uppercase tracking-[0.28em] font-[600] leading-relaxed"
            style={{ color: NT.muted, fontSize: 9.5 }}
          >
            basado en fases completadas · ritmo · racha
          </div>
        </div>

        {/* Stats grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mt-5 summary-enter">
          <StatCell label="misiones" value={`${totalPhases - skippedPhases.length}/${totalPhases}`} />
          <StatCell label="duración" value={durationLabel} />
          <StatCell label="racha" value={String(streakData.streak)} suffix="días" />
          <StatCell label="xp ganada" value={`+${sessionXp}`} highlight />
        </div>

        {/* Rank strip · split bento */}
        <div
          className="mt-5 w-full overflow-hidden summary-enter flex items-stretch"
          style={{
            borderRadius: 22,
            border: `1px solid ${hexToRgba(N.amber, 0.22)}`,
            background: hexToRgba(N.ember_deep, 0.55),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex-1 min-w-0 px-4 py-4">
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700]"
              style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
            >
              rango · {rank.titleEs.toLowerCase()}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className="font-headline font-[700] tabular-nums tracking-[-0.03em]"
                style={{ color: NT.primary, fontSize: 26, lineHeight: 0.95 }}
              >
                {prog.current.toLocaleString()}
              </span>
              <span
                className="font-mono"
                style={{ color: NT.muted, fontSize: 11 }}
              >
                / {prog.required.toLocaleString()} xp
              </span>
            </div>
            <div
              className="mt-2.5 h-[3px] overflow-hidden"
              style={{ background: hexToRgba(N.amber, 0.18) }}
            >
              <div
                className="h-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, Math.min(100, prog.ratio * 100))}%`,
                  background: N.amber,
                  boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.55)}`,
                }}
              />
            </div>
          </div>
          <div
            className="shrink-0 flex flex-col items-center justify-center px-4 py-4 gap-1"
            style={{
              minWidth: 84,
              background: N.amber,
              color: N.void,
            }}
          >
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: hexToRgba(N.void, 0.7), fontSize: 8.5 }}
            >
              clase
            </span>
            <span
              className="font-headline font-[700] tabular-nums"
              style={{
                color: N.void,
                fontSize: 32,
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
              }}
            >
              {rank.class}
            </span>
            <span
              className="font-mono uppercase tracking-[0.28em] font-[700]"
              style={{ color: hexToRgba(N.void, 0.85), fontSize: 8 }}
            >
              lv {profile.level}
            </span>
          </div>
        </div>

        {/* Last 7 days */}
        {recent.length > 0 && (
          <div className="w-full mt-5 summary-enter">
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700] mb-3"
              style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
            >
              · últimos 7 días ·
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {Array.from({ length: 7 }).map((_, i) => {
                const rec = recent[recent.length - 7 + i] ?? null;
                const s = rec?.score ?? 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(4, s * 0.58)}%`,
                        background: rec
                          ? `linear-gradient(180deg, ${N.amber}, ${hexToRgba(N.amber, 0.55)})`
                          : hexToRgba(N.amber, 0.1),
                        boxShadow: rec ? `0 0 6px ${hexToRgba(N.amber, 0.35)}` : 'none',
                      }}
                    />
                    <span
                      className="font-mono tabular-nums font-[600]"
                      style={{ color: NT.muted, fontSize: 9 }}
                    >
                      {rec ? s : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── CTA · sellar el día ─── */}
        <button
          onClick={onProceed}
          className="mt-8 w-full flex items-center justify-center gap-2.5 rounded-full transition-transform active:scale-[0.98] summary-enter"
          style={{
            padding: '16px 36px',
            background: N.amber,
            color: N.void,
            boxShadow: `0 14px 36px -8px ${hexToRgba(N.amber, 0.55)}`,
          }}
        >
          <BadgeCheck size={16} strokeWidth={2.4} style={{ color: N.void }} />
          <span
            className="font-mono font-[700] tracking-[0.36em] uppercase"
            style={{ color: N.void, fontSize: 11 }}
          >
            sellar el día
          </span>
          <ArrowUpRight size={15} strokeWidth={2.4} style={{ color: N.void }} />
        </button>

        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="mt-4 font-mono uppercase tracking-[0.32em] font-[700] summary-enter transition-opacity active:opacity-70"
            style={{ color: hexToRgba(N.amber, 0.95), fontSize: 10 }}
          >
            · ver historial →
          </button>
        )}

        <p
          className="mt-5 font-headline italic font-[400] text-center summary-enter"
          style={{ color: NT.soft, fontSize: 14 }}
        >
          buen día, {profile.name.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

// ─── internal components ────────────────────────────────────

function StatCell({
  label,
  value,
  suffix,
  highlight,
}: { label: string; value: string; suffix?: string; highlight?: boolean }) {
  const { night: N, nightText: NT } = useAppTheme();
  return (
    <div
      className="px-4 py-4"
      style={{
        borderRadius: 22,
        border: `1px solid ${highlight ? hexToRgba(N.amber, 0.5) : hexToRgba(N.amber, 0.2)}`,
        background: highlight ? hexToRgba(N.amber, 0.12) : hexToRgba(N.ember_deep, 0.5),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.32em] font-[700]"
        style={{ color: highlight ? N.amber : hexToRgba(N.amber, 0.9), fontSize: 8.5 }}
      >
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-headline font-[700] tabular-nums tracking-[-0.03em]"
          style={{
            color: highlight ? N.amber : NT.primary,
            fontSize: 26,
            lineHeight: 0.95,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="font-mono"
            style={{ color: NT.muted, fontSize: 11 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
