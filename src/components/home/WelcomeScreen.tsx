'use client';

// ═══════════════════════════════════════════════════════
// WelcomeScreen · editorial redesign v2 (Poppr-tightened)
//
// Refinements vs v1:
//
//   · Title now uses Bricolage Grotesque (--font-headline),
//     the closest free analog to Adobe Antique Olive that
//     poppr.be uses for "conversion through immersion".
//     Non-italic, weight 600, tight tracking, lowercase.
//   · Coach + Nucleus widgets no longer render as 80-px
//     cards — they are folded into a single "selected
//     entries" rail of one-line links, mirroring Poppr's
//     footer index aesthetic. Same callbacks fire.
//   · Night-mode suggestion is now a third entry of the
//     same rail (instead of a heavy banner above the CTA),
//     with the X dismiss action moved inline.
//
// Props interface is unchanged → no consumers break.
// CoachWidget / NucleusCompanion components are kept intact
// for any future consumer; this screen just stops using them.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Flame, X } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import { useDailyQuote } from '@/hooks/useDailyQuote';
import { useCoach } from '@/hooks/useCoach';
import type { OperatorProfile } from '@/lib/genesis/progression';
import { isNightSuggestionAppropriate, silenceNightSuggestionToday } from '@/lib/night/nightMode';
import {
  getCurrentBlock,
  getNextBlock,
  hhmmToMinutes,
  isNucleusWindow,
  type NucleusBlock,
} from '@/lib/nucleus/nucleusConstants';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';
import { getNextHolidays } from '@/lib/common/holidaysEC';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';
import { CalendarDays, ArrowRight } from 'lucide-react';

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
  onOpenNightMode,
  onOpenNucleus,
  onOpenCoach,
  onOpenCalendar,
}: WelcomeScreenProps) {
  const quote = useDailyQuote();
  const { time, weekday } = useClock();
  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile.name]);

  // SSR-safe gate. Anything that reads `new Date()` or hydrated coach
  // state would otherwise produce a different DOM on server vs first
  // client render → hydration mismatch. We render those parts only
  // after mount so the SSR HTML is stable and the dynamic bits fade in
  // post-hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  // Rail entries: 0-3 single-line links replacing the heavy
  // CoachWidget / NucleusCompanion / night banner. Computed each
  // render so they react to time + briefing state.
  const coachData = useCoach();
  const railEntries = useMemo<RailEntryData[]>(() => {
    if (!mounted) return []; // SSR-safe
    const out: RailEntryData[] = [];

    // Coach: render if briefing exists and has at least one action.
    if (onOpenCoach && coachData.hydrated && coachData.briefing) {
      const actionCount = coachData.briefing.actions.length;
      if (actionCount > 0) {
        out.push({
          key: 'coach',
          label: 'coach del día',
          meta: `${actionCount} ${actionCount === 1 ? 'acción' : 'acciones'}`,
          accent: coachData.briefing.mode.startsWith('flare') ? '#ff6b6b' : SUNRISE.rise2,
          onTap: onOpenCoach,
        });
      }
    }

    // Nucleus: render if currently inside the day-mode window.
    if (onOpenNucleus && isNucleusWindow(new Date())) {
      const block: NucleusBlock | null =
        getCurrentBlock(new Date()) ?? getNextBlock(new Date());
      if (block) {
        const minutesNow = new Date().getHours() * 60 + new Date().getMinutes();
        const endMin = hhmmToMinutes(block.endHHMM);
        const startMin = hhmmToMinutes(block.startHHMM);
        const isLive = minutesNow >= startMin && minutesNow < endMin;
        const remaining = isLive
          ? Math.max(0, endMin - minutesNow)
          : Math.max(0, startMin - minutesNow);
        out.push({
          key: 'nucleus',
          label: `nucleus · ${block.codename.toLowerCase()}`,
          meta: isLive ? `${remaining} min restantes` : `en ${remaining} min`,
          accent: SUNRISE.rise2,
          onTap: onOpenNucleus,
        });
      }
    }

    // Night: render if appropriate and not silenced.
    if (showNightSuggestion && onOpenNightMode) {
      out.push({
        key: 'night',
        label: 'ritual nocturno',
        meta: time,
        accent: SUNRISE.rise2,
        onTap: onOpenNightMode,
        onDismiss: () => {
          haptics.tick();
          silenceNightSuggestionToday();
          setShowNightSuggestion(false);
        },
      });
    }

    return out;
  }, [
    mounted,
    onOpenCoach, onOpenNucleus, onOpenNightMode,
    coachData.hydrated, coachData.briefing,
    showNightSuggestion, time,
  ]);

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
        {/* Bricolage Grotesque, weight 600, lowercase, tight track.
            Mirrors poppr.be's "conversion through immersion" hero. */}
        <div
          className="font-headline sunrise-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <div
            className="font-[600] leading-[0.88] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.2rem, 17vw, 6rem)',
              color: 'var(--sunrise-text)',
            }}
          >
            morning
          </div>
          <div
            className="font-[600] leading-[0.88] tracking-[-0.045em] lowercase"
            style={{
              fontSize: 'clamp(3.2rem, 17vw, 6rem)',
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

      {/* ═══ SECONDARY RAIL · single-line entries ══════════════
           Replaces the bulky CoachWidget / NucleusCompanion /
           night banner. Each entry is ~32px tall, mirroring the
           "selected work" footer index of poppr.be. */}
      {railEntries.length > 0 && (
        <div
          className="relative z-10 mx-5 mb-3 flex flex-col sunrise-fade-up"
          style={{
            animationDelay: '520ms',
            borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
          }}
        >
          {railEntries.map((entry, idx) => (
            <RailEntry
              key={entry.key}
              index={idx + 1}
              total={railEntries.length}
              entry={entry}
            />
          ))}
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

      {/* ═══ CALENDAR PREVIEW · mini contextual block ═══════════
           Reemplaza el tab "calendario" del antiguo dock. Muestra
           el perfil del día y los 2 próximos feriados. Tap →
           abre el CalendarScreen completo. Gated behind `mounted`
           porque depende de new Date() y rompe SSR si no. */}
      {mounted && onOpenCalendar && (
        <div
          className="relative z-10 mx-5 mb-3 sunrise-fade-up"
          style={{ animationDelay: '660ms' }}
        >
          <CalendarPreview onOpen={onOpenCalendar} />
        </div>
      )}

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

// ─── calendar preview ────────────────────────────────────

function CalendarPreview({ onOpen }: { onOpen: () => void }) {
  const today = useMemo(() => new Date(), []);
  const ctx = useMemo(() => getDayContext(today), [today]);
  const upcoming = useMemo(() => getNextHolidays(today, 2), [today]);
  const dayLabel = getDayProfileLabel(ctx);
  const dayName = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' });
    return fmt.format(today);
  }, [today]);

  return (
    <button
      type="button"
      onClick={() => { haptics.tick(); onOpen(); }}
      className="group w-full flex flex-col gap-2 py-3 transition-opacity active:opacity-70"
      style={{
        borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        borderBottom: `1px solid ${hexToRgba(SUNRISE.rise2, 0.08)}`,
      }}
    >
      {/* Row 1 · today */}
      <div className="flex items-center gap-3">
        <CalendarDays
          size={13}
          strokeWidth={1.85}
          className="shrink-0"
          style={{ color: SUNRISE.rise2 }}
        />
        <span
          className="font-headline font-[500] text-[13px] leading-tight lowercase tracking-[-0.01em]"
          style={{ color: 'var(--sunrise-text)' }}
        >
          {dayName}
        </span>
        <span
          className="flex-1 h-px min-w-[12px]"
          style={{ background: hexToRgba(SUNRISE.rise2, 0.18) }}
        />
        <span
          className="font-ui text-[9px] tracking-[0.32em] uppercase shrink-0"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {dayLabel}
        </span>
        <ArrowRight
          size={12}
          strokeWidth={1.85}
          className="shrink-0 transition-transform group-active:translate-x-0.5"
          style={{ color: SUNRISE.rise2 }}
        />
      </div>

      {/* Row 2 · next holidays (up to 2) */}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1 pl-[25px]">
          {upcoming.map((h) => (
            <div key={h.date.toISOString()} className="flex items-center gap-2">
              <span
                className="font-mono text-[9.5px] tabular-nums tracking-wider shrink-0"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                {h.daysUntil === 0 ? 'hoy' : `+${h.daysUntil}d`}
              </span>
              <span
                className="font-ui text-[10px] tracking-[0.18em] uppercase truncate"
                style={{ color: 'var(--sunrise-text-soft)' }}
              >
                {h.name.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── local types + components ────────────────────────────────

interface RailEntryData {
  key: string;
  label: string;
  meta: string;
  accent: string;
  onTap: () => void;
  /** Optional dismiss button (used by the night entry). */
  onDismiss?: () => void;
}

function RailEntry({
  index,
  total,
  entry,
}: {
  index: number;
  total: number;
  entry: RailEntryData;
}) {
  const isLast = index === total;
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{
        borderBottom: isLast ? 'none' : `1px solid ${hexToRgba(SUNRISE.rise2, 0.1)}`,
      }}
    >
      <button
        type="button"
        onClick={() => { haptics.tick(); entry.onTap(); }}
        className="group flex-1 min-w-0 flex items-center gap-3 transition-opacity active:opacity-70"
      >
        <span
          className="font-mono text-[10px] tracking-wider tabular-nums shrink-0"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {index.toString().padStart(2, '0')}
        </span>
        <span
          className="font-headline font-[500] text-[14px] leading-tight lowercase tracking-[-0.01em] truncate"
          style={{ color: 'var(--sunrise-text)' }}
        >
          {entry.label}
        </span>
        <span
          className="flex-1 h-px min-w-[12px]"
          style={{ background: hexToRgba(SUNRISE.rise2, 0.2) }}
        />
        <span
          className="font-ui text-[9px] tracking-[0.32em] uppercase shrink-0"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {entry.meta}
        </span>
        <ArrowUpRight
          size={13}
          strokeWidth={1.85}
          className="shrink-0 transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5"
          style={{ color: entry.accent }}
        />
      </button>
      {entry.onDismiss && (
        <button
          type="button"
          onClick={entry.onDismiss}
          aria-label="Descartar"
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          <X size={11} strokeWidth={1.85} />
        </button>
      )}
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
