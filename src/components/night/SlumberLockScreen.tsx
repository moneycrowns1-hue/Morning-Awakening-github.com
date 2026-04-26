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
import { NIGHT, NIGHT_TEXT } from '@/lib/night/nightTheme';
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
        color: NIGHT_TEXT.primary,
      }}
    >
      <div
        ref={cardRef}
        className="relative rounded-[28px] overflow-hidden px-6 pt-10 pb-6 flex flex-col items-center"
        style={{
          width: 'min(92%, 360px)',
          background: `linear-gradient(180deg, ${hexToRgba(NIGHT.violet_1, 0.55)} 0%, ${hexToRgba(NIGHT.abyss, 0.85)} 65%, #050309 100%)`,
          border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.08)}`,
          boxShadow: `0 24px 60px -20px ${hexToRgba(NIGHT.moon_core, 0.35)}, inset 0 1px 0 ${hexToRgba('#ffffff', 0.04)}`,
        }}
      >
        {/* Moon + star arc */}
        <StarArc />

        {/* Title */}
        <h1
          className="mt-5 font-display font-[500] text-[22px] text-center leading-tight"
          style={{ color: NIGHT_TEXT.primary }}
        >
          ¡Que duermas bien!
        </h1>

        {/* Adaptive summary */}
        {alarmConfig.enabled ? (
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.55] text-center max-w-[260px]"
            style={{ color: NIGHT_TEXT.soft }}
          >
            El sonido de la alarma comenzará a subir de volumen a partir de las{' '}
            <span style={{ color: NIGHT_TEXT.primary }}>{alarmTimes.rampLabel}</span>, para despertarte
            suavemente a las{' '}
            <span style={{ color: NIGHT_TEXT.primary }}>{alarmTimes.peakLabel}</span>.
          </p>
        ) : (
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.55] text-center max-w-[260px]"
            style={{ color: NIGHT_TEXT.soft }}
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
              background: hexToRgba(NIGHT.violet_2, 0.45),
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.12)}`,
            }}
          >
            <Clock size={14} strokeWidth={1.8} color={NIGHT_TEXT.soft} />
            <span className="font-ui text-[13px]" style={{ color: NIGHT_TEXT.primary }}>
              {alarmTimes.peakLabel}
            </span>
            <ChevronLeft size={14} strokeWidth={2} color={NIGHT_TEXT.muted} style={{ transform: 'scaleX(-1)' }} />
          </button>
        )}

        {/* Reminder rows */}
        <div className="mt-5 w-full flex flex-col gap-2">
          <ReminderRow
            icon={<AlertCircle size={14} strokeWidth={1.8} color={NIGHT_TEXT.muted} />}
            label="No fuerces el cierre de la aplicación"
          />
          <ReminderRow
            icon={<BatteryCharging size={14} strokeWidth={1.8} color={NIGHT_TEXT.muted} />}
            label="Mantén el cargador conectado"
          />
        </div>

        {/* Back / Alarma encendida pill */}
        <button
          onClick={() => { haptics.tap(); onExit(); }}
          className="mt-7 inline-flex items-center gap-2 rounded-full pl-3 pr-5 py-2.5 transition-transform active:scale-[0.97]"
          style={{
            background: `linear-gradient(180deg, ${hexToRgba(NIGHT.moon_halo, 0.18)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.38)} 100%)`,
            border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.4)}`,
            boxShadow: `0 8px 28px -10px ${hexToRgba(NIGHT.moon_core, 0.5)}`,
          }}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba('#000', 0.25),
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.25)}`,
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} color={NIGHT_TEXT.primary} />
          </span>
          <span className="font-ui text-[13px]" style={{ color: NIGHT_TEXT.primary }}>
            {alarmConfig.enabled ? 'Alarma encendida' : 'Buenas noches'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ── subcomponents ──────────────────────────────────────────

function ReminderRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        background: hexToRgba(NIGHT.violet_2, 0.28),
        border: `1px solid ${hexToRgba('#ffffff', 0.04)}`,
      }}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: hexToRgba(NIGHT.violet_1, 0.6) }}
      >
        {icon}
      </span>
      <span className="font-ui text-[12px]" style={{ color: NIGHT_TEXT.soft }}>
        {label}
      </span>
    </div>
  );
}

/** Crescent moon with a soft arc of stars, matching the reference. */
function StarArc() {
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
        stroke={hexToRgba(NIGHT.moon_halo, 0.35)}
        strokeWidth="0.7"
        fill="none"
      />
      <path
        d="M28 82 C 70 30, 150 30, 192 82"
        stroke={hexToRgba(NIGHT.moon_halo, 0.18)}
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
          fill={NIGHT_TEXT.primary}
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
          <stop offset="0%" stopColor={NIGHT.moon_halo} stopOpacity="0.45" />
          <stop offset="60%" stopColor={NIGHT.moon_halo} stopOpacity="0.1" />
          <stop offset="100%" stopColor={NIGHT.moon_halo} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="58" r="22" fill="url(#slumber-moon-glow)" />
      <rect
        width="220"
        height="90"
        fill={NIGHT.moon_core}
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
