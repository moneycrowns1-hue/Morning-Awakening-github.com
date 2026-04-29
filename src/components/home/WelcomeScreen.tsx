'use client';

// ═══════════════════════════════════════════════════════
// WelcomeScreen · editorial redesign v3 (Poppr-clean)
//
// Conectado a la paleta global vía useAppTheme():
//   - bg = D.paper + radial accent 8% sutil (sin GradientBackground).
//   - accents = D.accent (cambia con la paleta elegida en Settings).
//   - texto = DT.primary / DT.soft / DT.muted.
//
// Estructura:
//   1. HEADER · MA brand · time/weekday · streak.
//   2. HERO   · awaken / through · CTA · ritual.
//   3. FOOTER · split bento card (greeting + quote · today).
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Flame } from 'lucide-react';
import AppHeaderControls from '../common/AppHeaderControls';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import type { OperatorProfile } from '@/lib/genesis/progression';
import { haptics } from '@/lib/common/haptics';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { getNextHolidays } from '@/lib/common/holidaysEC';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';

interface WelcomeScreenProps {
  profile: OperatorProfile;
  streak: number;
  onStart: () => void;
  /** Open the night-mode flow (used by the suggestion card). */
  onOpenNightMode?: () => void;
  /** Open the NUCLEUS day-mode timeline screen. */
  onOpenNucleus?: () => void;
  /** Open the Coach screen. */
  onOpenCoach?: () => void;
  /** Open the full Calendar screen (from the footer preview). */
  onOpenCalendar?: () => void;
  /** Hint que el adapter Génesis genera al evaluar el contexto.
   *  Cuando está presente y no es vacío se renderiza un chip
   *  hairline debajo del CTA. Ejemplos:
   *    "anoche dormiste 145 min menos · sin cardio ni frío"
   *    "empezaste a las 06:42 · sólo lo esencial". */
  adaptiveHint?: string;
  /** Modo planeado por el adapter (full / express / recovery).
   *  Se muestra como kicker del chip. */
  adaptiveMode?: 'full' | 'express' | 'recovery';
}

export default function WelcomeScreen({
  profile,
  streak,
  onStart,
  onOpenCalendar,
  adaptiveHint,
  adaptiveMode,
}: WelcomeScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const quote = useDailyQuote();
  const { time, weekday } = useClock();
  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile.name]);

  // SSR-safe gate for time-dependent UI.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const year = useMemo(() => new Date().getFullYear().toString().slice(-2), []);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* ─── Background · paleta global ─────────────────── */}
      {/* Soft warm radial top-center · acompaña al título */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.18)} 0%, transparent 55%)`,
        }}
      />
      {/* Subtle diagonal tint layer · da textura sin animación */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(D.tint_strong, 0.35)} 0%, transparent 40%, ${hexToRgba(D.accent_soft, 0.1)} 100%)`,
        }}
      />
      {/* Outline circle bottom-left · echo poppr greenscreen */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 'clamp(280px, 60vw, 480px)',
          aspectRatio: '1',
          left: '-18%',
          bottom: '-20%',
          borderRadius: '50%',
          border: `1px solid ${hexToRgba(D.accent, 0.18)}`,
          opacity: 0.7,
        }}
      />

      {/* ═══ HEADER · brand · time · streak ════════════════ */}
      <div
        className="relative z-10 px-5 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600]"
              style={{ color: DT.primary, fontSize: 10 }}
            >
              MA · {year}
            </span>
            <span
              className="font-mono leading-none mt-1 tabular-nums"
              style={{ color: DT.muted, fontSize: 10 }}
              suppressHydrationWarning
            >
              {time} / {weekday.slice(0, 3)}
            </span>
          </div>
          <div
            className="h-6 w-px"
            style={{ background: hexToRgba(D.accent, 0.25) }}
          />
          <div className="flex items-center gap-1.5">
            <Flame
              size={12}
              strokeWidth={1.85}
              style={{ color: streak > 0 ? D.accent : DT.muted }}
            />
            <span
              className="font-mono tabular-nums leading-none font-[600]"
              style={{ color: DT.soft, fontSize: 12 }}
            >
              {streak.toString().padStart(2, '0')}
            </span>
          </div>
          {/* Controles · modo + paleta · acceso rápido al lado de la racha */}
          <AppHeaderControls iconSize={13} />
        </div>
      </div>

      {/* ═══ HERO · 3-line title con CTA inline ════════════ */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 min-h-0">
        <div
          className="font-headline flex flex-col items-center sunrise-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          {/* Line 1 */}
          <div
            className="font-[700] leading-[0.86] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.8rem, 20vw, 7.5rem)',
              color: DT.primary,
            }}
          >
            awaken
          </div>

          {/* Line 2 · word + inline CTA pill */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 my-1 flex-wrap">
            <span
              className="font-[700] leading-[0.86] tracking-[-0.045em] lowercase"
              style={{
                fontSize: 'clamp(3.4rem, 18vw, 7.5rem)',
                color: DT.primary,
              }}
            >
              through
            </span>
            <button
              type="button"
              onClick={() => { haptics.tap(); onStart(); }}
              className="shrink-0 inline-flex items-center gap-2 rounded-full transition-transform active:scale-[0.96] sunrise-fade-up"
              style={{
                padding: '13px 19px',
                background: D.accent,
                color: D.paper,
                boxShadow: `0 10px 32px -6px ${hexToRgba(D.accent, 0.55)}`,
                animationDelay: '320ms',
              }}
            >
              <span className="font-mono font-[700] tracking-[0.32em] uppercase leading-none" style={{ fontSize: 11 }}>
                despertar
              </span>
              <ArrowUpRight size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Line 3 */}
          <div
            className="font-[700] leading-[0.86] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.8rem, 20vw, 7.5rem)',
              color: DT.primary,
            }}
          >
            ritual<span style={{ color: D.accent }}>.</span>
          </div>

          {/* Adaptive hint del genesisAdapter · chip hairline.
              Sólo aparece cuando el adapter detectó una señal
              contextual relevante (sleep debt, late start, rest day,
              stress alto). El kicker muestra el modo planeado. */}
          {adaptiveHint && (
            <div
              className="mt-5 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full sunrise-fade-up"
              style={{
                background: hexToRgba(D.accent, 0.08),
                border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
                animationDelay: '480ms',
              }}
            >
              <span
                aria-hidden
                className="sunrise-cta-halo"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: D.accent,
                  boxShadow: `0 0 6px ${hexToRgba(D.accent, 0.7)}`,
                }}
              />
              {adaptiveMode && adaptiveMode !== 'full' && (
                <span
                  className="font-mono uppercase tracking-[0.32em] font-[700]"
                  style={{ color: D.accent, fontSize: 9 }}
                >
                  {adaptiveMode}
                </span>
              )}
              <span
                className="font-mono lowercase tracking-[0.05em]"
                style={{ color: DT.soft, fontSize: 10.5 }}
              >
                {adaptiveHint}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ FOOTER · split bento card ═════════════════════ */}
      <div
        className="relative z-10 px-5 sunrise-fade-up"
        style={{
          animationDelay: '420ms',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
        {mounted ? (
          <QuoteCalendarCard
            firstName={firstName.toLowerCase()}
            quote={quote}
            onOpenCalendar={onOpenCalendar}
            D={D}
            DT={DT}
          />
        ) : (
          <div style={{ height: 148 }} aria-hidden />
        )}
      </div>
    </div>
  );
}

// ─── split bento card ─────────────────────────────────────

function QuoteCalendarCard({
  firstName,
  quote,
  onOpenCalendar,
  D,
  DT,
}: {
  firstName: string;
  quote: { text: string; author: string };
  onOpenCalendar?: () => void;
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
}) {
  const today = useMemo(() => new Date(), []);
  const ctx = useMemo(() => getDayContext(today), [today]);
  const upcoming = useMemo(() => getNextHolidays(today, 1)[0], [today]);
  const dayLabel = getDayProfileLabel(ctx);
  const dayNum = today.getDate();
  const monthShort = useMemo(
    () => new Intl.DateTimeFormat('es', { month: 'short' }).format(today).replace(/\.?$/, ''),
    [today],
  );
  const weekdayShort = useMemo(
    () => new Intl.DateTimeFormat('es', { weekday: 'short' }).format(today).replace(/\.?$/, ''),
    [today],
  );

  return (
    <div
      className="w-full overflow-hidden flex"
      style={{
        borderRadius: 22,
        background: hexToRgba(D.tint, 0.7),
        border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        minHeight: 148,
      }}
    >
      {/* LEFT · greeting + quote */}
      <div
        className="flex flex-col justify-between flex-1 min-w-0"
        style={{ padding: '16px 18px' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="inline-block rounded-full"
              style={{
                width: 7,
                height: 7,
                background: D.accent,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.32em] font-[600] truncate"
              style={{ color: DT.muted, fontSize: 10 }}
            >
              buenos días,{' '}
              <span style={{ color: DT.primary, fontWeight: 700 }}>{firstName}</span>
            </span>
          </div>
          <p
            className="font-headline italic font-[400] leading-[1.4]"
            style={{
              color: DT.soft,
              fontSize: 16,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
        </div>
        <div
          className="font-mono uppercase tracking-[0.32em] font-[600] mt-2.5 truncate"
          style={{ color: DT.muted, fontSize: 9.5 }}
        >
          — {quote.author.toLowerCase()}
        </div>
      </div>

      {/* RIGHT · today (tap → Calendar) */}
      <button
        type="button"
        onClick={() => {
          if (!onOpenCalendar) return;
          haptics.tick();
          onOpenCalendar();
        }}
        disabled={!onOpenCalendar}
        className="group flex flex-col justify-between text-left transition-transform active:scale-[0.985] shrink-0 disabled:cursor-default"
        style={{
          width: '42%',
          maxWidth: 188,
          padding: '16px 18px',
          background: D.accent,
          color: D.paper,
        }}
      >
        <div className="flex items-center justify-between">
          <CalendarDays size={16} strokeWidth={2.2} style={{ color: D.paper }} />
          {onOpenCalendar && (
            <ArrowUpRight
              size={17}
              strokeWidth={2.4}
              className="transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5"
              style={{ color: D.paper }}
            />
          )}
        </div>
        <div className="mt-2">
          <div
            className="font-headline font-[700] leading-[0.92] lowercase tracking-[-0.03em]"
            style={{
              fontSize: 'clamp(1.9rem, 7.5vw, 2.4rem)',
              color: D.paper,
            }}
          >
            {weekdayShort.toLowerCase()} {dayNum}
          </div>
          <div
            className="font-mono uppercase tracking-[0.28em] font-[700] mt-1.5 truncate"
            style={{ color: D.paper, opacity: 0.75, fontSize: 10 }}
          >
            {monthShort.toLowerCase()} · {dayLabel.toLowerCase()}
          </div>
          {upcoming && (
            <div
              className="font-mono tabular-nums mt-2 truncate"
              style={{ color: D.paper, opacity: 0.65, fontSize: 10 }}
            >
              +{upcoming.daysUntil}d {upcoming.name.toLowerCase()}
            </div>
          )}
        </div>
      </button>
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
