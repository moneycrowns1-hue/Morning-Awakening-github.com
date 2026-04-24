'use client';

// ═══════════════════════════════════════════════════════════
// SlumberLockScreen · final minimalist lock after night
// protocol completion. Shows:
//   - Giant tabular-nums clock (140 px) with soft violet glow.
//   - MoonMascot 260 px, breathing on continuous 4-7-8 pattern.
//   - Sleep Gate card with window and live status pill.
//   - Discreet morning alarm line.
//   - Hidden actions: long-press (600 ms) reveals Exit / Snooze.
//   - Dim on idle: 15 s → brightness 25 %. Any tap restores.
//   - Wake Lock API while visible so the display stays on.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Sun, X, BedDouble } from 'lucide-react';
import MoonMascot from './MoonMascot';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import type { AlarmConfig } from '@/lib/alarmSchedule';
import { computeSleepGate, formatGateWindow, gateStatus, loadSleepConfig, appendNightEntry } from '@/lib/sleepGate';
import { markHabit } from '@/lib/habits';
import { haptics } from '@/lib/haptics';

interface SlumberLockScreenProps {
  alarmConfig: AlarmConfig;
  /** Called when the user swipes/long-presses Exit. */
  onExit: () => void;
}

const IDLE_MS = 15000;

export default function SlumberLockScreen({ alarmConfig, onExit }: SlumberLockScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [revealActions, setRevealActions] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Tick every 15s — no need for second precision on a lock screen.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Mark the slumber entry + habits ONCE on mount.
  useEffect(() => {
    const today = todayISO();
    const sleep = loadSleepConfig();
    const gate = computeSleepGate(alarmConfig, sleep, new Date());
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

  // Dim animation.
  useEffect(() => {
    if (!rootRef.current) return;
    gsap.to(rootRef.current, {
      filter: dimmed ? 'brightness(0.25)' : 'brightness(1)',
      duration: 1.2,
      ease: 'power2.inOut',
    });
  }, [dimmed]);

  const sleepCfg = useMemo(() => loadSleepConfig(), []);
  const gate = useMemo(() => computeSleepGate(alarmConfig, sleepCfg, now), [alarmConfig, sleepCfg, now]);
  const status = useMemo(() => gateStatus(gate, now), [gate, now]);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const statusCopy: Record<ReturnType<typeof gateStatus>, { text: string; tint: string }> = {
    'early':     { text: 'Aún es temprano para la puerta de sueño.', tint: NIGHT.moon_halo },
    'approach':  { text: 'La puerta se abre en breve.', tint: NIGHT.moon_halo },
    'in-gate':   { text: 'Estás dentro de la ventana. Cierra los ojos.', tint: '#9cffc2' },
    'late':      { text: 'La puerta se está cerrando.', tint: '#ffcf88' },
    'very-late': { text: 'Mañana empezamos antes.', tint: '#ff9ea4' },
  };

  // Long press to reveal actions.
  const onPointerDown = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      haptics.warn();
      setRevealActions(true);
    }, 600);
  };
  const onPointerUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="relative w-full h-full flex flex-col items-center justify-center select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${NIGHT.violet_1} 0%, ${NIGHT.abyss} 70%)`,
        color: NIGHT_TEXT.primary,
        transition: 'filter 1.2s ease',
      }}
    >
      {/* Giant clock */}
      <div
        className="font-mono tabular-nums leading-none"
        style={{
          fontSize: 'clamp(96px, 22vw, 140px)',
          letterSpacing: '-0.02em',
          textShadow: `0 0 40px ${hexToRgba(NIGHT.moon_core, 0.5)}`,
          color: NIGHT_TEXT.primary,
        }}
      >
        {hh}
        <span style={{ opacity: 0.4 }}>:</span>
        {mm}
      </div>

      {/* Mascot */}
      <div className="mt-6">
        <MoonMascot size={260} breathing floating blinking />
      </div>

      {/* Sleep gate card */}
      <div
        className="mt-8 rounded-2xl px-5 py-4 w-[min(92%,380px)]"
        style={{
          background: hexToRgba(NIGHT.violet_2, 0.35),
          border: `1px solid ${NIGHT_TEXT.divider}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[0.3em]" style={{ color: NIGHT_TEXT.muted }}>
          <BedDouble size={12} strokeWidth={1.6} />
          Puerta de sueño
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="font-mono text-[22px] tabular-nums tracking-wider" style={{ color: NIGHT_TEXT.primary }}>
            {formatGateWindow(gate)}
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: statusCopy[status].tint,
              boxShadow: `0 0 8px ${statusCopy[status].tint}`,
            }}
          />
        </div>
        <div className="mt-2 text-[12px] leading-snug" style={{ color: NIGHT_TEXT.soft }}>
          {statusCopy[status].text}
        </div>
      </div>

      {/* Morning alarm line */}
      {alarmConfig.enabled && (
        <div className="mt-6 flex items-center gap-2 font-ui text-[11px] uppercase tracking-[0.3em] opacity-75" style={{ color: NIGHT_TEXT.muted }}>
          <Sun size={12} strokeWidth={1.6} />
          <span className="font-mono tracking-wider">
            {String(alarmConfig.hour).padStart(2, '0')}:{String(alarmConfig.minute).padStart(2, '0')}
          </span>
          <span>· Despertar</span>
        </div>
      )}

      {/* Long-press hint */}
      {!revealActions && (
        <div
          className="absolute font-ui text-[9px] uppercase tracking-[0.35em]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
            color: NIGHT_TEXT.muted,
            opacity: 0.55,
          }}
        >
          Mantén pulsado para acciones
        </div>
      )}

      {/* Hidden actions */}
      {revealActions && (
        <div
          className="absolute flex gap-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        >
          <button
            onClick={() => { haptics.tap(); setRevealActions(false); }}
            className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.3em]"
            style={{
              background: hexToRgba(NIGHT.violet_2, 0.5),
              border: `1px solid ${NIGHT_TEXT.divider}`,
              color: NIGHT_TEXT.soft,
            }}
          >
            Cerrar
          </button>
          <button
            onClick={() => { haptics.tap(); onExit(); }}
            className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.3em] flex items-center gap-1.5"
            style={{
              background: hexToRgba(NIGHT.dusk_rose, 0.35),
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.4)}`,
              color: NIGHT_TEXT.primary,
            }}
          >
            <X size={12} strokeWidth={1.8} />
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
