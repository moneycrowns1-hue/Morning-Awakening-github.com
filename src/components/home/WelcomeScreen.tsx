'use client';

// ═══════════════════════════════════════════════════════
// WelcomeScreen · editorial redesign v3 (Poppr-clean)
//
// Aggressive simplification: stripped rail, marquee,
// chapter marker, vertical-rule quote block, full-width CTA.
//
// What remains, top → bottom:
//   1. HEADER  · MA brand · time/weekday · streak (single
//      compact horizontal row). The AppMenu trigger sits
//      top-right (rendered by the parent).
//   2. HERO    · "morning awakening." in Bricolage Grotesque
//      at clamp(3.6rem,19vw,7rem). A small dorado CTA pill
//      ("despertar →") is positioned absolutely over the
//      baseline of the second line, mirroring the way Poppr
//      drops "Discover what we do" inside its hero image.
//   3. BACKDROP· tilted soft gradient card behind the title
//      (echoes Poppr's tilted greenscreen photo) + a circle
//      outline cut off by the bottom-left edge.
//   4. FOOTER  · single-line greeting · single-line quote ·
//      single-line calendar preview (tap → CalendarScreen).
//
// Coach / Nucleus / Night entrypoints removed from this
// screen. They live in the AppMenu (badges flag urgency)
// and inside their own dedicated screens. Props are kept in
// the interface for backward compatibility.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Flame } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import type { OperatorProfile } from '@/lib/genesis/progression';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';
import { getNextHolidays } from '@/lib/common/holidaysEC';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';

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
  /** Open the full Calendar screen (from the footer preview). */
  onOpenCalendar?: () => void;
}

export default function WelcomeScreen({
  profile,
  streak,
  onStart,
  onOpenCalendar,
}: WelcomeScreenProps) {
  const quote = useDailyQuote();
  const { time, weekday } = useClock();
  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile.name]);

  // SSR-safe gate for time-dependent UI (calendar preview).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const year = useMemo(() => new Date().getFullYear().toString().slice(-2), []);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: 'var(--sunrise-text)' }}
    >
      {/* Animated sunrise background */}
      <GradientBackground stage="welcome" particleCount={45} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* ═══ HEADER · brand · time · streak (compact row) ═══════
           Single horizontal line on the left. Right corner is
           reserved for the AppMenu trigger (rendered by the
           parent at fixed top-right). */}
      <div
        className="relative z-10 px-5 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-ui text-[10px] tracking-[0.42em] uppercase"
              style={{ color: 'var(--sunrise-text)' }}
            >
              MA · {year}
            </span>
            <span
              className="font-mono text-[10px] leading-none mt-1"
              style={{ color: 'var(--sunrise-text-muted)' }}
              suppressHydrationWarning
            >
              {time} / {weekday.slice(0, 3)}
            </span>
          </div>
          <div
            className="h-6 w-px"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.25) }}
          />
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

      {/* ═══ HERO · 3-word title centered + inline CTA pill ═══
           Mirrors poppr.be's "conversion / through / immersion"
           where the yellow CTA pill sits inline next to the
           middle (connector) word. */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 min-h-0">
        <div
          className="font-headline flex flex-col items-center sunrise-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          {/* Line 1 */}
          <div
            className="font-[600] leading-[0.86] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.8rem, 20vw, 7.5rem)',
              color: 'var(--sunrise-text)',
            }}
          >
            awaken
          </div>

          {/* Line 2 · word + inline dorado CTA pill (wraps on narrow) */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 my-1 flex-wrap">
            <span
              className="font-[600] leading-[0.86] tracking-[-0.045em] lowercase"
              style={{
                fontSize: 'clamp(3.4rem, 18vw, 7.5rem)',
                color: 'var(--sunrise-text)',
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
                background: SUNRISE.rise2,
                color: SUNRISE.night,
                boxShadow: `0 10px 32px -6px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
                animationDelay: '320ms',
              }}
            >
              <span className="font-ui font-[600] text-[12px] tracking-[0.22em] uppercase leading-none">
                despertar
              </span>
              <ArrowUpRight size={14} strokeWidth={2.2} />
            </button>
          </div>

          {/* Line 3 */}
          <div
            className="font-[600] leading-[0.86] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.8rem, 20vw, 7.5rem)',
              color: 'var(--sunrise-text)',
            }}
          >
            ritual<span style={{ color: SUNRISE.rise2 }}>.</span>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER · split bento card ═══════════════════════════
           Mirrors thecraftsmen.tech "fast support / happy to help"
           pattern: dark text panel on the left (greeting + quote),
           solid dorado action panel on the right (today's date,
           tap → opens full Calendar screen). */}
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
          />
        ) : (
          // SSR placeholder · same height to avoid layout shift
          <div style={{ height: 148 }} aria-hidden />
        )}
      </div>
    </div>
  );
}

// ─── split bento card (greeting + quote · today) ───────────

function QuoteCalendarCard({
  firstName,
  quote,
  onOpenCalendar,
}: {
  firstName: string;
  quote: { text: string; author: string };
  onOpenCalendar?: () => void;
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
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        minHeight: 148,
      }}
    >
      {/* LEFT · dark · greeting kicker + quote (info, non-interactive) */}
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
                background: SUNRISE.rise2,
              }}
            />
            <span
              className="font-ui text-[11px] tracking-[0.3em] uppercase truncate"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              buenos días,{' '}
              <span style={{ color: 'var(--sunrise-text)' }}>{firstName}</span>
            </span>
          </div>
          <p
            className="font-display italic font-[300] text-[16px] leading-[1.4]"
            style={{
              color: 'var(--sunrise-text-soft)',
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
          className="font-ui text-[10px] tracking-[0.32em] uppercase mt-2.5 truncate"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          — {quote.author.toLowerCase()}
        </div>
      </div>

      {/* RIGHT · dorado · today (tap → opens Calendar) */}
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
          background: SUNRISE.rise2,
          color: SUNRISE.night,
        }}
      >
        <div className="flex items-center justify-between">
          <CalendarDays size={16} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
          {onOpenCalendar && (
            <ArrowUpRight
              size={17}
              strokeWidth={2.4}
              className="transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5"
              style={{ color: SUNRISE.night }}
            />
          )}
        </div>
        <div className="mt-2">
          <div
            className="font-headline font-[700] leading-[0.92] lowercase tracking-[-0.03em]"
            style={{
              fontSize: 'clamp(1.9rem, 7.5vw, 2.4rem)',
              color: SUNRISE.night,
            }}
          >
            {weekdayShort.toLowerCase()} {dayNum}
          </div>
          <div
            className="font-ui text-[11px] tracking-[0.26em] uppercase font-[600] mt-1.5 truncate"
            style={{ color: SUNRISE.night, opacity: 0.72 }}
          >
            {monthShort.toLowerCase()} · {dayLabel.toLowerCase()}
          </div>
          {upcoming && (
            <div
              className="font-mono text-[10px] tabular-nums mt-2 truncate"
              style={{ color: SUNRISE.night, opacity: 0.6 }}
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
