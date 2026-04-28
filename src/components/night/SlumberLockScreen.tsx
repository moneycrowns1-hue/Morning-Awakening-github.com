'use client';

// ═══════════════════════════════════════════════════════════
// SlumberLockScreen · final "¡Que duermas bien!" card.
//
// Shown after the night protocol is complete and the alarm is
// armed. Pure black canvas with a centered glass card:
//   · crescent moon + arc of stars overlay
//   · title "¡Que duermas bien!"
//   · adaptive summary of the upcoming alarm (ramp → peak)
//   · alarm chip showing the peak time
//   · two reminder rows (don't force-quit, keep charger)
//   · back-chevron pill "Alarma encendida" → onExit
//
// The rest of the rules are preserved from the previous design:
//   · Wake Lock API while visible so the display stays on.
//   · Dim on idle: 15 s → brightness 25 %. Any tap restores.
//   · Habit + sleep entry marked ONCE on mount.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft, AlertCircle, BatteryCharging, Clock } from 'lucide-react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import type { AlarmConfig } from '@/lib/alarm/alarmSchedule';
import { computeSleepGate, gateStatus, loadSleepConfig, appendNightEntry } from '@/lib/night/sleepGate';
import { loadHealthSnapshot } from '@/lib/common/healthkitBridge';
import { markHabit } from '@/lib/common/habits';
import { haptics } from '@/lib/common/haptics';

interface SlumberLockScreenProps {
  alarmConfig: AlarmConfig;
  /** Called when the user taps "Alarma encendida" (back chevron). */
  onExit: () => void;
}

const IDLE_MS = 15000;

export default function SlumberLockScreen({ alarmConfig, onExit }: SlumberLockScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const [dimmed, setDimmed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Mark habits + sleep entry once on mount.
  useEffect(() => {
    const today = todayISO();
    const sleep = loadSleepConfig();
    const gate = computeSleepGate(alarmConfig, sleep, new Date(), loadHealthSnapshot());
    const status = gateStatus(gate, new Date());
    appendNightEntry({
      dateISO: today,
      slumberAtISO: new Date().toISOString(),
      insideGate: status === 'in-gate',
    });
    markHabit('night_protocol', today);
    if (status === 'in-gate') markHabit('slept_in_gate', today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wake Lock — keeps the display on while the lock screen is visible.
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (navigator.wakeLock?.request) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch { /* ignore — e.g. not in focus */ }
    };
    void request();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLock && !cancelled) {
        void request();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // Idle dim logic.
  useEffect(() => {
    const bump = () => {
      if (dimmed) setDimmed(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setDimmed(true), IDLE_MS);
    };
    bump();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [dimmed]);

  // Dim animation — we dim the CARD not the root, so the fondo negro
  // permanece negro puro cuando la pantalla se "apaga".
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      opacity: dimmed ? 0.18 : 1,
      duration: 1.2,
      ease: 'power2.inOut',
    });
  }, [dimmed]);

  // Entrance animation.
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.from(cardRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.9,
      ease: 'power2.out',
    });
  }, []);

  const alarmTimes = useMemo(() => computeAlarmTimes(alarmConfig), [alarmConfig]);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{
        background: '#000000',
        color: NT.primary,
      }}
    >
      <div
        ref={cardRef}
        className="relative rounded-[28px] overflow-hidden px-6 pt-10 pb-6 flex flex-col items-center"
        style={{
          width: 'min(92%, 360px)',
          background: `linear-gradient(180deg, ${hexToRgba(N.ember_1, 0.6)} 0%, ${hexToRgba(N.void, 0.9)} 65%, #050300 100%)`,
          border: `1px solid ${hexToRgba(N.amber, 0.1)}`,
          boxShadow: `0 24px 60px -20px ${hexToRgba(N.amber, 0.32)}, inset 0 1px 0 ${hexToRgba('#ffffff', 0.04)}`,
        }}
      >
        {/* Moon + star arc */}
        <StarArc amber={N.amber} amberGlow={N.amber_glow} primary={NT.primary} />

        {/* Title */}
        <h1
          className="mt-5 font-headline font-[500] text-[22px] text-center leading-tight"
          style={{
            color: NT.primary,
            letterSpacing: '-0.01em',
            textShadow: `0 0 24px ${hexToRgba(N.amber, 0.4)}`,
          }}
        >
          ¡Que duermas bien!
        </h1>

        {/* Adaptive summary */}
        {alarmConfig.enabled ? (
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.55] text-center max-w-[260px]"
            style={{ color: NT.soft }}
          >
            El sonido de la alarma comenzará a subir de volumen a partir de las{' '}
            <span style={{ color: NT.primary }}>{alarmTimes.rampLabel}</span>, para despertarte
            suavemente a las{' '}
            <span style={{ color: NT.primary }}>{alarmTimes.peakLabel}</span>.
          </p>
        ) : (
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.55] text-center max-w-[260px]"
            style={{ color: NT.soft }}
          >
            No hay alarma activa. El silencio también es una forma de cuidado.
          </p>
        )}

        {/* Alarm chip */}
        {alarmConfig.enabled && (
          <button
            onClick={() => { haptics.tap(); onExit(); }}
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors"
            style={{
              background: hexToRgba(N.void, 0.55),
              border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            }}
          >
            <Clock size={14} strokeWidth={1.8} color={NT.soft} />
            <span className="font-mono tabular-nums text-[13px]" style={{ color: NT.primary }}>
              {alarmTimes.peakLabel}
            </span>
            <ChevronLeft size={14} strokeWidth={2} color={NT.muted} style={{ transform: 'scaleX(-1)' }} />
          </button>
        )}

        {/* Reminder rows */}
        <div className="mt-5 w-full flex flex-col gap-2">
          <ReminderRow
            icon={<AlertCircle size={14} strokeWidth={1.8} color={NT.muted} />}
            label="No fuerces el cierre de la aplicación"
            bg={hexToRgba(N.void, 0.5)}
            chipBg={hexToRgba(N.amber, 0.08)}
            color={NT.soft}
          />
          <ReminderRow
            icon={<BatteryCharging size={14} strokeWidth={1.8} color={NT.muted} />}
            label="Mantén el cargador conectado"
            bg={hexToRgba(N.void, 0.5)}
            chipBg={hexToRgba(N.amber, 0.08)}
            color={NT.soft}
          />
        </div>

        {/* Back / Alarma encendida pill */}
        <button
          onClick={() => { haptics.tap(); onExit(); }}
          className="mt-7 inline-flex items-center gap-2 pl-3 pr-5 py-2.5 transition-transform active:scale-[0.97]"
          style={{
            background: N.amber,
            color: N.void,
            boxShadow: `0 10px 28px -8px ${hexToRgba(N.amber, 0.55)}`,
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(N.void, 0.85),
              border: `1px solid ${hexToRgba(N.void, 0.4)}`,
            }}
          >
            <ChevronLeft size={14} strokeWidth={2.4} color={N.amber} />
          </span>
          <span className="font-ui font-[700] text-[12px] uppercase tracking-[0.28em]" style={{ color: N.void }}>
            {alarmConfig.enabled ? 'alarma encendida' : 'buenas noches'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ── subcomponents ──────────────────────────────────────────

function ReminderRow({
  icon,
  label,
  bg,
  chipBg,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  chipBg: string;
  color: string;
}) {
  return (
    <div
      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        background: bg,
        border: `1px solid ${hexToRgba('#ffffff', 0.04)}`,
      }}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: chipBg }}
      >
        {icon}
      </span>
      <span className="font-ui text-[12px]" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

/** Crescent moon with a soft arc of stars, matching the reference. */
function StarArc({ amber, amberGlow, primary }: { amber: string; amberGlow: string; primary: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const stars = ref.current.querySelectorAll('.sa-star');
    gsap.to(stars, {
      opacity: (i: number) => 0.35 + ((i * 37) % 50) / 100,
      duration: 1.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.18, from: 'random' },
    });
  }, []);
  return (
    <svg
      ref={ref}
      width="220"
      height="90"
      viewBox="0 0 220 90"
      fill="none"
      aria-hidden="true"
    >
      {/* two subtle arcs */}
      <path
        d="M10 78 C 60 10, 160 10, 210 78"
        stroke={hexToRgba(amber, 0.4)}
        strokeWidth="0.7"
        fill="none"
      />
      <path
        d="M28 82 C 70 30, 150 30, 192 82"
        stroke={hexToRgba(amber, 0.22)}
        strokeWidth="0.6"
        fill="none"
      />
      {/* stars along the arcs */}
      {ARC_STARS.map((s, i) => (
        <circle
          key={i}
          className="sa-star"
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={primary}
          opacity={s.o}
        />
      ))}
      {/* crescent moon — two circles masked */}
      <defs>
        <mask id="slumber-crescent">
          <rect width="220" height="90" fill="black" />
          <circle cx="110" cy="58" r="14" fill="white" />
          <circle cx="116" cy="54" r="13" fill="black" />
        </mask>
        <radialGradient id="slumber-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={amber} stopOpacity="0.55" />
          <stop offset="60%" stopColor={amberGlow} stopOpacity="0.18" />
          <stop offset="100%" stopColor={amber} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="58" r="22" fill="url(#slumber-moon-glow)" />
      <rect
        width="220"
        height="90"
        fill={amberGlow}
        mask="url(#slumber-crescent)"
      />
    </svg>
  );
}

// Pseudo-random but deterministic star positions along the arc.
const ARC_STARS: Array<{ x: number; y: number; r: number; o: number }> = [
  { x: 24,  y: 70, r: 0.9, o: 0.55 },
  { x: 42,  y: 54, r: 1.1, o: 0.75 },
  { x: 58,  y: 42, r: 0.8, o: 0.5 },
  { x: 76,  y: 32, r: 1.2, o: 0.85 },
  { x: 96,  y: 26, r: 0.7, o: 0.45 },
  { x: 128, y: 26, r: 0.9, o: 0.6 },
  { x: 148, y: 32, r: 1.1, o: 0.8 },
  { x: 166, y: 42, r: 0.8, o: 0.5 },
  { x: 182, y: 54, r: 1.0, o: 0.7 },
  { x: 198, y: 70, r: 0.8, o: 0.55 },
  { x: 60,  y: 66, r: 0.6, o: 0.35 },
  { x: 160, y: 66, r: 0.6, o: 0.4 },
];

// ── helpers ────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Compute the ramp-start and peak labels in a localized 12-hour format. */
function computeAlarmTimes(cfg: AlarmConfig): { rampLabel: string; peakLabel: string } {
  const peak = new Date();
  peak.setHours(cfg.hour, cfg.minute, 0, 0);
  const ramp = new Date(peak.getTime() - cfg.rampSec * 1000);
  return {
    rampLabel: fmtAmPm(ramp),
    peakLabel: fmtAmPm(peak),
  };
}

function fmtAmPm(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}
