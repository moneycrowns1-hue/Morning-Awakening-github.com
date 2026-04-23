'use client';

// ═══════════════════════════════════════════════════════
// SummaryScreenV8 · post-protocol sunrise summary
//
// Layout, top → bottom:
//   1. Sunrise gradient at "complete" stage (fully lit dawn)
//   2. Subtle kicker "Protocolo completo"
//   3. Display-serif title "Día superado"
//   4. QualityGauge 0..100
//   5. Four stat cards (misiones, tiempo, racha, XP)
//   6. Rank strip (icon + rank + level + XP bar to next)
//   7. Last-7-days streak visualiser (mini bars)
//   8. Primary CTA "Sellar el día" + soft "Ver historial" link
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import gsap from 'gsap';
import type { StreakData } from '@/lib/constants';
import { getRankByLevel } from '@/lib/constants';
import { levelProgress, type OperatorProfile } from '@/lib/progression';
import { computeQualityScore, loadSessions, type SessionRecord } from '@/lib/sessionHistory';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import GradientBackground from './GradientBackground';
import QualityGauge from './QualityGauge';

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

  // Pull past sessions for the 7-day mini chart.
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
    <div ref={containerRef} className="relative flex-1 flex flex-col min-h-0 overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      <GradientBackground stage="complete" particleCount={55} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      <div
        className="scroll-area flex-1 w-full max-w-md mx-auto flex flex-col items-center relative z-10 min-h-0 px-6"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        <div
          className="font-ui text-[10px] uppercase tracking-[0.42em] mb-3 summary-enter"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Protocolo completo
        </div>

        <h1
          className="font-display font-[400] italic text-[clamp(2.25rem,9vw,3rem)] leading-[1.08] text-center summary-enter"
          style={{ color: 'var(--sunrise-text)' }}
        >
          Día superado
        </h1>

        <div className="mt-7 mb-4 summary-enter">
          <QualityGauge score={qualityScore} size={240} />
        </div>

        {/* Stats grid */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 summary-enter">
          <StatCell label="Misiones" value={`${totalPhases - skippedPhases.length}/${totalPhases}`} />
          <StatCell label="Duración" value={durationLabel} />
          <StatCell label="Racha" value={`${streakData.streak}`} suffix="días" />
          <StatCell label="XP ganada" value={`+${sessionXp}`} accent={SUNRISE.rise2} />
        </div>

        {/* Rank strip */}
        <div
          className="mt-5 w-full p-4 rounded-2xl summary-enter"
          style={{
            border: '1px solid rgba(255,250,240,0.08)',
            background: 'rgba(255,250,240,0.03)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[22px]"
              style={{
                color: rank.color,
                border: `1.5px solid ${hexToRgba(rank.color, 0.5)}`,
                boxShadow: `0 0 14px ${hexToRgba(rank.color, 0.25)}`,
                fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
              }}
            >
              {rank.kanji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-ui text-[10px] uppercase tracking-[0.32em]" style={{ color: 'var(--sunrise-text-muted)' }}>
                Rango
              </div>
              <div className="font-ui text-[15px] font-[500] tracking-[0.08em]" style={{ color: rank.color }}>
                {rank.titleEs} · Lv {profile.level}
              </div>
            </div>
          </div>
          <div className="mt-3 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,250,240,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, prog.ratio * 100))}%`,
                background: `linear-gradient(90deg, ${hexToRgba(rank.color, 0.55)}, ${rank.color})`,
                boxShadow: `0 0 8px ${hexToRgba(rank.color, 0.45)}`,
                transition: 'width 1s ease-out',
              }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] mt-1" style={{ color: 'var(--sunrise-text-muted)' }}>
            <span>{prog.current} XP</span>
            <span>{prog.required} XP</span>
          </div>
        </div>

        {/* Last 7 days mini bars */}
        {recent.length > 0 && (
          <div className="w-full mt-5 summary-enter">
            <div
              className="font-ui text-[10px] uppercase tracking-[0.34em] mb-2"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Últimos 7 días
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
                          ? `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.85)}, ${hexToRgba(SUNRISE.rise1, 0.65)})`
                          : 'rgba(255,250,240,0.08)',
                      }}
                    />
                    <span className="font-mono text-[9px]" style={{ color: 'var(--sunrise-text-muted)' }}>
                      {rec ? s : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onProceed}
          className="group relative mt-8 w-full rounded-full overflow-hidden transition-transform active:scale-[0.98] summary-enter"
          style={{
            padding: '16px 36px',
            background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.18)} 0%, ${hexToRgba(SUNRISE.rise2, 0.34)} 100%)`,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <span className="absolute inset-0 rounded-full sunrise-cta-halo pointer-events-none" />
          <span className="relative flex items-center justify-center gap-2.5">
            <BadgeCheck size={16} strokeWidth={1.8} style={{ color: 'var(--sunrise-text)' }} />
            <span
              className="font-ui font-[500] text-[13px] tracking-[0.36em] uppercase"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Sellar el día
            </span>
          </span>
        </button>

        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="mt-3 font-ui text-[11px] tracking-[0.3em] uppercase summary-enter"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            Ver historial →
          </button>
        )}

        <p
          className="mt-5 font-ui text-[12px] tracking-wider text-center summary-enter"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Buen día, {profile.name}.
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
  accent,
}: { label: string; value: string; suffix?: string; accent?: string }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        border: '1px solid rgba(255,250,240,0.08)',
        background: 'rgba(255,250,240,0.03)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="font-ui text-[10px] uppercase tracking-[0.3em]"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-display text-[26px] leading-none tracking-[-0.02em]"
        style={{ color: accent ?? 'var(--sunrise-text)' }}
      >
        {value}
        {suffix && (
          <span
            className="font-ui text-[11px] ml-1.5 tracking-wider align-baseline"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
