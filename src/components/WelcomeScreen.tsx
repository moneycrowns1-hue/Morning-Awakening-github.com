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
import { Flame, User, Settings as SettingsIcon } from 'lucide-react';
import GradientBackground from './GradientBackground';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import type { OperatorProfile } from '@/lib/progression';

interface WelcomeScreenProps {
  profile: OperatorProfile;
  streak: number;
  onStart: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export default function WelcomeScreen({
  profile,
  streak,
  onStart,
  onOpenProfile,
  onOpenSettings,
}: WelcomeScreenProps) {
  const quote = useDailyQuote();
  const { time, weekday } = useClock();
  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile.name]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      {/* Animated sunrise background */}
      <GradientBackground stage="welcome" particleCount={55} />

      {/* Gentle vignette overlay for text legibility */}
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* ─── Top HUD: time · weekday · streak ───────────────── */}
      <div
        className="relative z-10 flex items-start justify-between px-5 pt-5 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        {/* Left: clock + weekday */}
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

        {/* Right: streak + profile + settings */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame size={14} strokeWidth={2} style={{ color: streak > 0 ? 'var(--sunrise-rise-2, #f4c267)' : 'var(--sunrise-text-muted)' }} />
            <span className="font-mono text-[14px]" style={{ color: 'var(--sunrise-text)' }}>
              {streak}
            </span>
            <span className="font-ui text-[10px] tracking-[0.24em] uppercase" style={{ color: 'var(--sunrise-text-muted)' }}>
              días
            </span>
          </div>
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              aria-label="Abrir perfil"
              className="rounded-full p-1.5 transition-colors hover:bg-white/5"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              <User size={18} strokeWidth={1.75} />
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              aria-label="Abrir ajustes"
              className="rounded-full p-1.5 transition-colors hover:bg-white/5"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              <SettingsIcon size={18} strokeWidth={1.75} />
            </button>
          )}
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

      {/* ─── CTA ────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center pb-10 sunrise-fade-up"
        style={{
          animationDelay: '640ms',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)',
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
          12 fases · ~1 h 45 min
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
