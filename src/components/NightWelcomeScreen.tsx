'use client';

// ═══════════════════════════════════════════════════════════
// NightWelcomeScreen · entry to the Night Conquest Protocol
//
// Symmetric to the morning WelcomeScreen but in the violet/
// rose palette. Layers:
//   1. Animated NIGHT GradientBackground (stage 'welcome').
//   2. HUD: hora · weekday · Sleep Gate mini-preview · close.
//   3. Hero: MoonMascot (floating, breathing) + kicker
//      "NOCHE DE CONQUISTA" + nocturnal quote.
//   4. Mode selector: Completo / Express (persisted).
//   5. CTA "Entrar a la noche" with rose halo pulse.
//
// Picking Slumber Lock directly (if protocol already done
// today) is exposed via a small secondary link.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { X, Moon, Sun, Timer } from 'lucide-react';
import IconosLogo from './IconosLogo';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import { totalNightDuration } from '@/lib/nightConstants';
import type { AlarmConfig } from '@/lib/alarmSchedule';
import { computeSleepGate, formatGateWindow, loadSleepConfig } from '@/lib/sleepGate';
import { haptics } from '@/lib/haptics';

const MODE_KEY = 'ma-night-mode-pref';

export type NightMode = 'full' | 'express';

interface NightWelcomeScreenProps {
  alarmConfig: AlarmConfig;
  onEnter: (mode: NightMode) => void;
  onEnterSlumber: () => void;
  onClose: () => void;
  /** True when today's night protocol has already been completed. */
  completedToday?: boolean;
}

const QUOTES = [
  { text: 'El descanso no es una pausa del trabajo; es donde el trabajo se asienta.', author: 'Anónimo' },
  { text: 'La noche no es la ausencia del día: es su integración.', author: 'Heráclito (atrib.)' },
  { text: 'Dormir es confiar en que el mundo puede girar sin ti.', author: 'Kohelet' },
  { text: 'Acuéstate a tiempo. Mañana será más claro que ahora.', author: 'Marco Aurelio' },
  { text: 'La calma es un músculo. Se entrena de noche.', author: 'B.K.S. Iyengar' },
];

export default function NightWelcomeScreen({
  alarmConfig,
  onEnter,
  onEnterSlumber,
  onClose,
  completedToday,
}: NightWelcomeScreenProps) {
  const [mode, setMode] = useState<NightMode>('full');
  const [time, setTime] = useState(() => now());

  // Load persisted preference on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MODE_KEY);
      if (raw === 'full' || raw === 'express') setMode(raw);
    } catch { /* ignore */ }
  }, []);

  // Tick the clock every 30s (don't need second precision).
  useEffect(() => {
    const id = window.setInterval(() => setTime(now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const gate = useMemo(() => {
    const sleepCfg = loadSleepConfig();
    return computeSleepGate(alarmConfig, sleepCfg);
  }, [alarmConfig]);

  const quote = useMemo(() => {
    const idx = new Date().getDate() % QUOTES.length;
    return QUOTES[idx];
  }, []);

  const fullMin = Math.round(totalNightDuration('full') / 60);
  const expressMin = Math.round(totalNightDuration('express') / 60);

  const setModeAnd = (m: NightMode) => {
    haptics.tap();
    setMode(m);
    try { window.localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  };

  const handleEnter = () => {
    haptics.tick();
    try { window.localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
    onEnter(mode);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        color: NIGHT_TEXT.primary,
        background: `radial-gradient(ellipse at 50% 35%, ${NIGHT.violet_1} 0%, ${NIGHT.abyss} 80%)`,
      }}
    >

      {/* ─── HUD ─────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-start justify-between px-5 pt-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div>
          <div className="font-mono text-[13px] tracking-wider tabular-nums" style={{ color: NIGHT_TEXT.primary }}>
            {time}
          </div>
          <div className="font-ui text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: NIGHT_TEXT.muted }}>
            {weekdayLabel()}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.28)}`,
              background: hexToRgba(NIGHT.violet_2, 0.4),
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <Moon size={12} strokeWidth={1.6} style={{ color: NIGHT.moon_halo }} />
            <span className="font-mono text-[11px] tracking-wider" style={{ color: NIGHT_TEXT.soft }}>
              {formatGateWindow(gate)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-[0.92]"
            style={{
              border: `1px solid ${NIGHT_TEXT.divider}`,
              background: hexToRgba(NIGHT.violet_2, 0.3),
              color: NIGHT_TEXT.soft,
            }}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <IconosLogo size={220} />

        <div
          className="mt-7 font-ui text-[10px] uppercase tracking-[0.45em]"
          style={{ color: NIGHT_TEXT.muted }}
        >
          Noche de conquista
        </div>

        <h1
          className="mt-3 font-display italic font-[400] text-center leading-[1.15] text-[clamp(1.6rem,5.5vw,2.15rem)] max-w-md"
          style={{ color: NIGHT_TEXT.primary }}
        >
          “{quote.text}”
        </h1>
        <div
          className="mt-2 font-ui text-[10px] uppercase tracking-[0.3em]"
          style={{ color: NIGHT_TEXT.muted }}
        >
          — {quote.author}
        </div>
      </div>

      {/* ─── Mode selector + CTA ────────────────────────────── */}
      <div
        className="relative z-10 px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex gap-2.5 mb-4">
          <ModePill
            active={mode === 'full'}
            onClick={() => setModeAnd('full')}
            label="Completo"
            sub={`8 fases · ${fullMin} min`}
          />
          <ModePill
            active={mode === 'express'}
            onClick={() => setModeAnd('express')}
            label="Express"
            sub={`4 fases · ${expressMin} min`}
          />
        </div>

        <button
          onClick={handleEnter}
          className="w-full rounded-full transition-transform active:scale-[0.98]"
          style={{
            padding: '17px 24px',
            background: `linear-gradient(180deg, ${hexToRgba(NIGHT.moon_halo, 0.22)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.55)} 100%)`,
            border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.5)}`,
            boxShadow: `0 10px 40px -10px ${hexToRgba(NIGHT.moon_core, 0.55)}, 0 0 0 1px ${hexToRgba(NIGHT.moon_halo, 0.1)} inset`,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <span
            className="font-ui font-[500] text-[14px] tracking-[0.32em] uppercase"
            style={{ color: NIGHT_TEXT.primary }}
          >
            Entrar a la noche
          </span>
        </button>

        <div className="flex items-center justify-between mt-4 text-[11px]">
          <button
            onClick={onEnterSlumber}
            className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: NIGHT_TEXT.soft }}
          >
            <Timer size={12} strokeWidth={1.7} />
            <span className="font-ui tracking-wider uppercase text-[10px]">
              {completedToday ? 'Volver al Slumber' : 'Ir directo a Slumber'}
            </span>
          </button>
          {alarmConfig.enabled && (
            <div className="flex items-center gap-1.5" style={{ color: NIGHT_TEXT.muted }}>
              <Sun size={11} strokeWidth={1.6} />
              <span className="font-mono tracking-wider">
                {String(alarmConfig.hour).padStart(2, '0')}:{String(alarmConfig.minute).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-2xl py-3 px-3 text-left transition-all active:scale-[0.98]"
      style={{
        background: active
          ? `linear-gradient(180deg, ${hexToRgba(NIGHT.moon_halo, 0.18)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.35)} 100%)`
          : hexToRgba(NIGHT.violet_2, 0.4),
        border: `1px solid ${active ? hexToRgba(NIGHT.moon_halo, 0.55) : NIGHT_TEXT.divider}`,
        boxShadow: active ? `0 0 18px -4px ${hexToRgba(NIGHT.moon_core, 0.45)}` : 'none',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="font-ui text-[13px] font-[600] tracking-wider uppercase"
        style={{ color: active ? NIGHT_TEXT.primary : NIGHT_TEXT.soft }}
      >
        {label}
      </div>
      <div className="font-mono text-[10px] mt-0.5 tabular-nums" style={{ color: NIGHT_TEXT.muted }}>
        {sub}
      </div>
    </button>
  );
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function weekdayLabel(): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date().getDay()];
}
