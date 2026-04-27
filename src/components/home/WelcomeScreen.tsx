'use client';

// ═══════════════════════════════════════════════════════
// WelcomeScreen · editorial redesign (Poppr-inspired)
//
// Reference: poppr.be — agency aesthetic translated to the
// sunrise palette. Key patterns adopted:
//
//   1. Corner-framed HUD with dotted leaders (top-left brand
//      mark, top-right time + weekday + streak).
//   2. Chapter index ("01 / 13") as editorial cue.
//   3. MASSIVE lowercase italic display ("morning awakening.")
//      stacked left-aligned.
//   4. Quote as offset block with thin vertical rule.
//   5. CTA: wide pill with diagonal arrow on the right (no
//      glassmorphism halo — quieter, more architectural).
//   6. Bottom marquee ticker with profile metadata that
//      scrolls horizontally on loop.
//   7. Functional widgets (NightSuggestion, CoachWidget,
//      NucleusCompanion) stay — restyled to slot into the
//      editorial frame instead of stacking visually.
//
// Props interface is unchanged → no consumers break.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Flame, Moon, X } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import NucleusCompanion from '../nucleus/NucleusCompanion';
import CoachWidget from '../coach/CoachWidget';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import type { OperatorProfile } from '@/lib/genesis/progression';
import { isNightSuggestionAppropriate, silenceNightSuggestionToday } from '@/lib/night/nightMode';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';

interface WelcomeScreenProps {
  profile: OperatorProfile;
  streak: number;
  onStart: () => void;
  /** Open the night-mode flow (used by the suggestion card). */
  onOpenNightMode?: () => void;
  /** Open the NUCLEUS day-mode timeline screen (used by NucleusCompanion). */
  onOpenNucleus?: () => void;
  /** Open the Coach screen (used by the briefing widget). */
  onOpenCoach?: () => void;
}

export default function WelcomeScreen({
  profile,
  streak,
  onStart,
  onOpenNightMode,
  onOpenNucleus,
  onOpenCoach,
}: WelcomeScreenProps) {
  const quote = useDailyQuote();
  const { time, weekday } = useClock();
  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile.name]);

  // Show the "son las 22:00, ¿modo noche?" suggestion card when it's
  // actually night and the user hasn't silenced it today. The initial
  // render (incl. SSR) is always `false` so hydration is stable; we
  // flip it true in the mount-only effect once we know we're on the
  // client and have access to localStorage.
  const [showNightSuggestion, setShowNightSuggestion] = useState(false);

  useEffect(() => {
    if (!onOpenNightMode) return;
    if (isNightSuggestionAppropriate()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowNightSuggestion(true);
    }
  }, [onOpenNightMode]);

  // Año de la sesión, usado en la marca editorial superior izquierda.
  const year = useMemo(() => new Date().getFullYear().toString().slice(-2), []);

  // Marquee data: línea repetible de metadatos del operador.
  const marqueeBlocks = useMemo(() => {
    const items = [
      `streak ${streak.toString().padStart(2, '0')}`,
      `level ${profile.level.toString().padStart(2, '0')}`,
      `class ${profile.operatorClass.toLowerCase()}`,
      `xp ${profile.xp}`,
      `${profile.phasesCompleted} phases done`,
      '13 phases · 1h 50m',
    ];
    return items.join('  ·  ');
  }, [streak, profile.level, profile.operatorClass, profile.xp, profile.phasesCompleted]);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: 'var(--sunrise-text)' }}
    >
      {/* Animated sunrise background */}
      <GradientBackground stage="welcome" particleCount={55} />

      {/* Vignette + faint editorial grain for legibility */}
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* ═══ TOP HUD · corner-framed ════════════════════════════ */}
      <div
        className="relative z-10 px-5 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)' }}
      >
        <div className="flex items-start justify-between">
          {/* Brand mark */}
          <div className="flex flex-col gap-1">
            <span
              className="font-ui text-[10px] tracking-[0.42em] uppercase"
              style={{ color: 'var(--sunrise-text)' }}
            >
              MA · {year}
            </span>
            <span
              className="font-ui text-[8.5px] tracking-[0.38em] uppercase"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              ritual operator
            </span>
          </div>

          {/* Time / weekday / streak */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-[15px] leading-none tracking-[-0.01em]"
                style={{ color: 'var(--sunrise-text)' }}
              >
                {time}
              </span>
              <span
                className="font-ui text-[8.5px] tracking-[0.38em] uppercase"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                / {weekday.slice(0, 3)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame
                size={11}
                strokeWidth={1.85}
                style={{ color: streak > 0 ? SUNRISE.rise2 : 'var(--sunrise-text-muted)' }}
              />
              <span
                className="font-mono text-[11px] leading-none"
                style={{ color: 'var(--sunrise-text-soft)' }}
              >
                {streak.toString().padStart(2, '0')}
              </span>
              <span
                className="font-ui text-[8.5px] tracking-[0.32em] uppercase"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                streak
              </span>
            </div>
          </div>
        </div>

        {/* Thin frame markers — two short rules under the HUD */}
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.18) }}
          />
          <span
            className="font-ui text-[8px] tracking-[0.42em] uppercase"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            chapter 01 / 13
          </span>
          <div
            className="h-px w-12"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.18) }}
          />
        </div>
      </div>

      {/* ═══ HERO · editorial typography ════════════════════════ */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 min-h-0">
        {/* Lowercase italic display, stacked, asymmetric */}
        <div
          className="font-display sunrise-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <div
            className="italic font-[300] leading-[0.92] tracking-[-0.025em] lowercase"
            style={{
              fontSize: 'clamp(3rem, 16vw, 5.6rem)',
              color: 'var(--sunrise-text)',
            }}
          >
            morning
          </div>
          <div
            className="italic font-[300] leading-[0.92] tracking-[-0.025em] lowercase pl-[0.6em]"
            style={{
              fontSize: 'clamp(3rem, 16vw, 5.6rem)',
              color: 'var(--sunrise-text)',
            }}
          >
            awakening<span style={{ color: SUNRISE.rise2 }}>.</span>
          </div>
        </div>

        {/* Quote block · offset, vertical rule */}
        <div
          className="mt-8 flex gap-3 sunrise-fade-up"
          style={{ animationDelay: '300ms' }}
        >
          <div
            className="w-px shrink-0 self-stretch"
            style={{
              background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.45)} 0%, ${hexToRgba(SUNRISE.rise2, 0)} 100%)`,
            }}
          />
          <div className="flex-1 min-w-0 max-w-[34ch]">
            <p
              className="font-display italic font-[300] text-[15px] leading-[1.45]"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              &ldquo;{quote.text}&rdquo;
            </p>
            <div
              className="mt-2 font-ui text-[9.5px] tracking-[0.36em] uppercase"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              — {quote.author}
            </div>
          </div>
        </div>

        {/* Greeting · footnote-style */}
        <div
          className="mt-10 flex items-center gap-3 sunrise-fade-up"
          style={{ animationDelay: '440ms' }}
        >
          <div
            className="h-px w-6"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.5) }}
          />
          <span
            className="font-ui text-[10px] tracking-[0.34em] uppercase"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            buenos días,{' '}
            <span style={{ color: 'var(--sunrise-text)' }}>{firstName.toLowerCase()}</span>
          </span>
        </div>
      </div>

      {/* ═══ FUNCTIONAL WIDGETS — quiet stack above CTA ════════ */}
      {showNightSuggestion && onOpenNightMode && (
        <div
          className="relative z-10 mx-5 mb-2.5 rounded-xl p-3 flex items-center gap-3 sunrise-fade-up"
          style={{
            animationDelay: '520ms',
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.22)}`,
            background: hexToRgba(SUNRISE.predawn2, 0.55),
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.12),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.35)}`,
              color: SUNRISE.rise2,
            }}
          >
            <Moon size={14} strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--sunrise-text)' }}
            >
              {time} · ritual nocturno
            </div>
            <div
              className="font-mono text-[10px] leading-snug mt-0.5"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Respiración 4-7-8 + descarga mental antes de dormir.
            </div>
          </div>
          <button
            onClick={() => { haptics.tap(); onOpenNightMode(); }}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-ui text-[9.5px] tracking-[0.28em] uppercase"
            style={{
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
              background: hexToRgba(SUNRISE.rise2, 0.18),
              color: 'var(--sunrise-text)',
            }}
          >
            Entrar <ArrowUpRight size={11} strokeWidth={1.85} />
          </button>
          <button
            onClick={() => { haptics.tick(); silenceNightSuggestionToday(); setShowNightSuggestion(false); }}
            aria-label="No mostrar hoy"
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            <X size={12} strokeWidth={1.85} />
          </button>
        </div>
      )}

      {onOpenCoach && (
        <div
          className="relative z-10 mx-5 mb-2.5 sunrise-fade-up"
          style={{ animationDelay: '540ms' }}
        >
          <CoachWidget onOpen={onOpenCoach} />
        </div>
      )}

      {onOpenNucleus && (
        <div
          className="relative z-10 mx-5 mb-2.5 sunrise-fade-up"
          style={{ animationDelay: '560ms' }}
        >
          <NucleusCompanion onOpen={onOpenNucleus} />
        </div>
      )}

      {/* ═══ CTA · wide, flat, with arrow ═══════════════════════ */}
      <div
        className="relative z-10 px-5 pb-3 sunrise-fade-up"
        style={{ animationDelay: '620ms' }}
      >
        <button
          onClick={() => { haptics.tap(); onStart(); }}
          className="group w-full flex items-center justify-between gap-3 rounded-full pl-6 pr-3 py-3 transition-transform active:scale-[0.985]"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
          }}
        >
          <span className="flex items-center gap-3">
            <span
              className="font-ui text-[8.5px] tracking-[0.42em] uppercase"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              01.
            </span>
            <span
              className="font-display italic font-[300] text-[22px] leading-none lowercase"
              style={{ color: 'var(--sunrise-text)' }}
            >
              despertar
            </span>
          </span>
          <span
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5"
            style={{
              background: SUNRISE.rise2,
              color: SUNRISE.night,
            }}
          >
            <ArrowUpRight size={18} strokeWidth={2} />
          </span>
        </button>
      </div>

      {/* ═══ MARQUEE · footer ticker ════════════════════════════
           Animated with a custom inline keyframe so we don't have
           to introduce new global CSS. The track holds two copies
           of the data so the loop is seamless. */}
      <div
        className="relative z-10 sunrise-fade-up"
        style={{
          animationDelay: '700ms',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
        <div
          className="overflow-hidden border-t border-b"
          style={{
            borderColor: hexToRgba(SUNRISE.rise2, 0.16),
            background: hexToRgba(SUNRISE.predawn2, 0.35),
          }}
        >
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: 'ma-marquee 28s linear infinite',
              willChange: 'transform',
            }}
          >
            {[0, 1].map(i => (
              <span
                key={i}
                className="inline-flex items-center font-ui text-[9.5px] tracking-[0.42em] uppercase py-2 px-6"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                {marqueeBlocks}
                <span className="mx-6" style={{ color: SUNRISE.rise2 }}>
                  ◆
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Inline keyframes for the marquee (scoped via styled-jsx
          would be cleaner but the project uses plain CSS modules).
          Defining here keeps the redesign self-contained. */}
      <style jsx>{`
        @keyframes ma-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── local hooks ─────────────────────────────────────────────

function useClock(): { time: string; weekday: string } {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(now);
  return { time, weekday };
}
