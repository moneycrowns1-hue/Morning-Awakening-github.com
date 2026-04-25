'use client';

// ═══════════════════════════════════════════════════════
// WelcomeScreen · new IDLE screen (v8 sunrise redesign)
//
// Replaces the old washi/dōjō boot sequence. Three layers:
//   1. Full-bleed <GradientBackground stage="welcome"/> (canvas)
//   2. Top HUD: hora local · día de la semana · racha
//   3. Centre: kicker ('MORNING AWAKENING'), daily quote
//      (serif display, big, breathing float), author line.
//   4. Big "Despertar" CTA at the bottom with halo pulse.
//
// Every element enters with a staggered sunrise-fade-up. The
// HUD stays restrained (quiet data) so the eye goes to the
// quote and the CTA, not to XP or stats.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Flame, Moon, X } from 'lucide-react';
import GradientBackground from './GradientBackground';
import NucleusCompanion from './NucleusCompanion';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import type { OperatorProfile } from '@/lib/progression';
import { isNightSuggestionAppropriate, silenceNightSuggestionToday } from '@/lib/nightMode';
import { haptics } from '@/lib/haptics';
import { SUNRISE, hexToRgba } from '@/lib/theme';

interface WelcomeScreenProps {
  profile: OperatorProfile;
  streak: number;
  onStart: () => void;
  /** Open the night-mode flow (used by the suggestion card). */
  onOpenNightMode?: () => void;
  /** Open the NUCLEUS day-mode timeline screen (used by NucleusCompanion). */
  onOpenNucleus?: () => void;
}

export default function WelcomeScreen({
  profile,
  streak,
  onStart,
  onOpenNightMode,
  onOpenNucleus,
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

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      {/* Animated sunrise background */}
      <GradientBackground stage="welcome" particleCount={55} />

      {/* Gentle vignette overlay for text legibility */}
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* ─── Top HUD: time · weekday · streak (read-only) ─── */}
      <div
        className="relative z-10 flex items-start justify-between px-5 pt-5 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="flex flex-col">
          <div className="font-mono text-[28px] leading-none tracking-[-0.02em]" style={{ color: 'var(--sunrise-text)' }}>
            {time}
          </div>
          <div
            className="font-ui text-[11px] tracking-[0.28em] mt-1 uppercase"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            {weekday}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame size={14} strokeWidth={2} style={{ color: streak > 0 ? 'var(--sunrise-rise-2, #f4c267)' : 'var(--sunrise-text-muted)' }} />
          <span className="font-mono text-[14px]" style={{ color: 'var(--sunrise-text)' }}>
            {streak}
          </span>
          <span className="font-ui text-[10px] tracking-[0.24em] uppercase" style={{ color: 'var(--sunrise-text-muted)' }}>
            días
          </span>
        </div>
      </div>

      {/* ─── Hero: kicker + quote ───────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-7">
        <div
          className="font-ui text-[10px] tracking-[0.42em] uppercase mb-8 sunrise-fade-up"
          style={{ animationDelay: '80ms', color: 'var(--sunrise-text-muted)' }}
        >
          Morning Awakening
        </div>

        <div
          className="font-display sunrise-fade-up sunrise-float text-center max-w-[32ch]"
          style={{ animationDelay: '220ms' }}
        >
          <div
            className="font-[300] italic leading-[1.28] text-[clamp(1.55rem,6.4vw,2.35rem)]"
            style={{ color: 'var(--sunrise-text)' }}
          >
            &ldquo;{quote.text}&rdquo;
          </div>
          <div
            className="mt-5 font-ui not-italic text-[11px] tracking-[0.3em] uppercase"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            — {quote.author}
          </div>
        </div>

        {/* Thin horizon divider */}
        <div
          className="mt-10 h-px w-40 sunrise-horizon sunrise-fade-up"
          style={{ animationDelay: '380ms' }}
        />

        {/* Personal greeting */}
        <div
          className="mt-6 font-ui text-[13px] tracking-wider sunrise-fade-up"
          style={{ animationDelay: '480ms', color: 'var(--sunrise-text-soft)' }}
        >
          Buenos días, <span style={{ color: 'var(--sunrise-text)' }}>{firstName}</span>.
        </div>
      </div>

      {/* ─── Night-mode suggestion (>= 21:00) ──────────────── */}
      {showNightSuggestion && onOpenNightMode && (
        <div
          className="relative z-10 mx-5 mb-3 rounded-2xl p-3 flex items-center gap-3 sunrise-fade-up"
          style={{
            animationDelay: '560ms',
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
            background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.predawn2, 0.7)}, ${hexToRgba(SUNRISE.night, 0.8)})`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.14),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
              color: SUNRISE.rise2,
            }}
          >
            <Moon size={16} strokeWidth={1.8} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-ui text-[12px] font-[500]"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Son las {time} — ¿iniciamos tu rutina nocturna?
            </div>
            <div
              className="font-ui text-[10px] mt-0.5"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Sonidos ambientales, respiración 4-7-8 y una descarga mental antes de dormir.
            </div>
          </div>
          <button
            onClick={() => { haptics.tap(); onOpenNightMode(); }}
            className="shrink-0 px-3 py-2 rounded-full font-ui text-[11px] tracking-[0.2em] uppercase"
            style={{
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
              background: hexToRgba(SUNRISE.rise2, 0.18),
              color: 'var(--sunrise-text)',
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { haptics.tick(); silenceNightSuggestionToday(); setShowNightSuggestion(false); }}
            aria-label="No mostrar hoy"
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* ─── NUCLEUS companion (only inside 06:50–18:00) ─── */}
      {onOpenNucleus && (
        <div
          className="relative z-10 mx-5 mb-3 sunrise-fade-up"
          style={{ animationDelay: '600ms' }}
        >
          <NucleusCompanion onOpen={onOpenNucleus} />
        </div>
      )}

      {/* ─── CTA ────────────────────────────────────────────
           Extra bottom padding leaves room for the AppDock that
           the parent renders fixed at the bottom. */}
      <div
        className="relative z-10 flex flex-col items-center pb-10 sunrise-fade-up"
        style={{
          animationDelay: '640ms',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
        }}
      >
        <button
          onClick={onStart}
          className="group relative rounded-full overflow-hidden transition-transform active:scale-[0.97]"
          style={{
            padding: '18px 48px',
            background: 'linear-gradient(180deg, rgba(253,233,184,0.14) 0%, rgba(244,194,103,0.28) 100%)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(253,233,184,0.35)',
          }}
        >
          {/* Halo */}
          <span className="absolute inset-0 rounded-full sunrise-cta-halo sunrise-cta-pulse pointer-events-none" />
          <span
            className="relative font-ui font-[500] tracking-[0.4em] text-[15px] uppercase"
            style={{ color: 'var(--sunrise-text)' }}
          >
            Despertar
          </span>
        </button>

        <div
          className="mt-4 font-ui text-[10px] tracking-[0.35em] uppercase"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          13 fases · ~1 h 50 min
        </div>
      </div>

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
