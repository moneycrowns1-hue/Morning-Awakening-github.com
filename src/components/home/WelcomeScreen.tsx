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
import { ArrowUpRight, ArrowRight, CalendarDays, Flame } from 'lucide-react';
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

      {/* ═══ FOOTER · greeting · quote · calendar (3 lines max) ═══ */}
      <div
        className="relative z-10 px-5 sunrise-fade-up"
        style={{
          animationDelay: '420ms',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}
      >
        {/* Greeting line */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-px w-7 shrink-0"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.55) }}
          />
          <span
            className="font-ui text-[12px] tracking-[0.32em] uppercase"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            buenos días,{' '}
            <span style={{ color: 'var(--sunrise-text)' }}>{firstName.toLowerCase()}</span>
          </span>
        </div>

        {/* Quote — italic body, allows up to ~2 lines */}
        <p
          className="font-display italic font-[300] text-[15px] leading-[1.4] mb-4"
          style={{
            color: 'var(--sunrise-text-soft)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          &ldquo;{quote.text}&rdquo;
          <span
            className="font-ui not-italic uppercase tracking-[0.26em] text-[11px] ml-2"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            — {quote.author}
          </span>
        </p>

        {/* Calendar single-line preview */}
        {mounted && onOpenCalendar && <CalendarPreviewLine onOpen={onOpenCalendar} />}
      </div>
    </div>
  );
}

// ─── single-line calendar preview ────────────────────────

function CalendarPreviewLine({ onOpen }: { onOpen: () => void }) {
  const today = useMemo(() => new Date(), []);
  const ctx = useMemo(() => getDayContext(today), [today]);
  const upcoming = useMemo(() => getNextHolidays(today, 1)[0], [today]);
  const dayLabel = getDayProfileLabel(ctx);
  const dayName = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' });
    return fmt.format(today).replace(/\.,?/g, '').toLowerCase();
  }, [today]);

  return (
    <button
      type="button"
      onClick={() => { haptics.tick(); onOpen(); }}
      className="group w-full flex items-center gap-3 py-3 transition-opacity active:opacity-70"
      style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}` }}
    >
      <CalendarDays
        size={15}
        strokeWidth={1.85}
        className="shrink-0"
        style={{ color: SUNRISE.rise2 }}
      />
      <span
        className="font-ui text-[11px] tracking-[0.26em] uppercase shrink-0"
        style={{ color: 'var(--sunrise-text-soft)' }}
      >
        {dayName}
      </span>
      <span
        className="font-ui text-[10px] tracking-[0.26em] uppercase shrink-0"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        · {dayLabel.toLowerCase()}
      </span>
      <span
        className="flex-1 h-px min-w-[12px]"
        style={{ background: hexToRgba(SUNRISE.rise2, 0.16) }}
      />
      {upcoming && (
        <span
          className="font-mono text-[10px] tracking-wider tabular-nums shrink-0 truncate"
          style={{ color: 'var(--sunrise-text-muted)', maxWidth: '42%' }}
        >
          +{upcoming.daysUntil}d {upcoming.name.toLowerCase()}
        </span>
      )}
      <ArrowRight
        size={13}
        strokeWidth={1.85}
        className="shrink-0 transition-transform group-active:translate-x-0.5"
        style={{ color: SUNRISE.rise2 }}
      />
    </button>
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
