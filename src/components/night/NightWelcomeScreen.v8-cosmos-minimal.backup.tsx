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
import { X, Heart, Moon, ArrowUpRight } from 'lucide-react';
import HealthBridgeScreen from '../profile/HealthBridgeScreen';
import NightStarfield from './NightStarfield';
import { getHealthStatus, loadHealthSnapshot, type HealthStatus } from '@/lib/common/healthkitBridge';
import { hexToRgba } from '@/lib/common/theme';
import { NIGHT_CALM, NIGHT_CALM_TEXT } from '@/lib/night/nightTheme';
import { getNightMissions, totalNightDuration } from '@/lib/night/nightConstants';
import type { AlarmConfig } from '@/lib/alarm/alarmSchedule';
import { computeSleepGate, formatGateWindow, loadSleepConfig } from '@/lib/night/sleepGate';
import { haptics } from '@/lib/common/haptics';
import { getDayProfile } from '@/lib/common/dayProfile';

const MODE_KEY = 'ma-night-mode-pref';
/** Per-day override: when present, takes precedence over the global
 *  preference. Lets us auto-default Express on rest profile without
 *  losing the user's manual choice for that specific day. */
const MODE_DAY_KEY_PREFIX = 'ma-night-mode-pref-';

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(() => ({ kind: 'missing' }));
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Refresh health status whenever the modal closes (it may have
  // imported new data via hash redirect in the meantime).
  useEffect(() => {
    setHealthStatus(getHealthStatus());
  }, [showHealthModal]);

  // Load persisted preference on mount. Priority:
  //   1. Per-day explicit override (user picked Full/Express today).
  //   2. Auto-default to Express when today's profile is 'rest'
  //      (Sunday or Ecuadorian holiday).
  //   3. Global persisted preference.
  //   4. Hardcoded 'full'.
  useEffect(() => {
    try {
      const dayKey = MODE_DAY_KEY_PREFIX + todayKey();
      const dayPref = window.localStorage.getItem(dayKey);
      if (dayPref === 'full' || dayPref === 'express') {
        setMode(dayPref);
        return;
      }
      if (getDayProfile() === 'rest') {
        setMode('express');
        return;
      }
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
    const health = loadHealthSnapshot();
    return computeSleepGate(alarmConfig, sleepCfg, new Date(), health);
  }, [alarmConfig, healthStatus]);

  const quote = useMemo(() => {
    const idx = new Date().getDate() % QUOTES.length;
    return QUOTES[idx];
  }, []);

  const fullCount = getNightMissions('full').length;
  const expressCount = getNightMissions('express').length;
  const fullMin = Math.round(totalNightDuration('full') / 60);
  const expressMin = Math.round(totalNightDuration('express') / 60);

  const setModeAnd = (m: NightMode) => {
    haptics.tap();
    setMode(m);
    try {
      // Persist BOTH the global preference (for next non-rest day) and
      // the per-day override (so today's explicit pick is honored even
      // if it contradicts the rest-profile auto-default).
      window.localStorage.setItem(MODE_KEY, m);
      window.localStorage.setItem(MODE_DAY_KEY_PREFIX + todayKey(), m);
    } catch { /* ignore */ }
  };

  const handleEnter = () => {
    haptics.tick();
    try {
      window.localStorage.setItem(MODE_KEY, mode);
      window.localStorage.setItem(MODE_DAY_KEY_PREFIX + todayKey(), mode);
    } catch { /* ignore */ }
    onEnter(mode);
  };

  // ═══════════════════════════════════════════════════════════
  // V8 · Cosmos + Minimal (final)
  // - Living starfield background (V6)
  // - Centered breathing warm moon orb (V6 fixed)
  // - Minimal corner controls (V4)
  // - Pill mode toggle (V4)
  // - Floating capsule CTA (V4)
  // - Whisper slumber link (V4)
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      className="scroll-area relative w-full h-full flex flex-col overflow-hidden"
      style={{
        color: NIGHT_CALM_TEXT.primary,
        background: NIGHT_CALM.void,
      }}
    >
      {/* ─── Cosmic horizon background ──────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 0%, #1a0e08 0%, #0a0604 60%, #000000 100%)`,
        }}
      />
      {/* Living starfield */}
      <div className="absolute inset-0 pointer-events-none">
        <NightStarfield count={90} shooting />
      </div>
      {/* Distant nebulae · breathing */}
      <div
        aria-hidden
        className="night-breath-slow absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 25% 80%, ${hexToRgba(NIGHT_CALM.candle, 0.16)} 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="night-breath absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 40% 30% at 80% 15%, ${hexToRgba(NIGHT_CALM.amber, 0.1)} 0%, transparent 60%)`,
        }}
      />

      {/* ═══ HEADER · minimal corner controls ═══════════ */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-5 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:scale-[0.92]"
          style={{
            background: 'transparent',
            border: `1px solid ${hexToRgba(NIGHT_CALM.amber, 0.2)}`,
            color: NIGHT_CALM_TEXT.soft,
            opacity: 0.75,
          }}
          aria-label="Cerrar"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => { haptics.tap(); setShowHealthModal(true); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:scale-[0.92] relative"
          style={{
            background: 'transparent',
            border: `1px solid ${hexToRgba(NIGHT_CALM.amber, 0.2)}`,
            color: healthStatus.kind === 'connected' ? NIGHT_CALM.amber : NIGHT_CALM_TEXT.soft,
            opacity: 0.75,
          }}
          aria-label="Apple Health"
        >
          <Heart size={14} strokeWidth={2.2} fill={healthStatus.kind === 'connected' ? 'currentColor' : 'none'} />
          {healthStatus.kind === 'missing' && (
            <span
              className="absolute top-0 right-0 w-2 h-2 rounded-full"
              style={{ background: NIGHT_CALM.candle, border: `1.5px solid #000` }}
            />
          )}
        </button>
      </div>

      {/* ═══ HERO · centered breathing moon orb + clock ═══ */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        {/* The moon orb · perfectly centered, properly proportioned */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: 168, height: 168 }}
        >
          {/* Outer breathing aura · large soft halo */}
          <div
            aria-hidden
            className="night-breath-slow absolute pointer-events-none"
            style={{
              inset: -60,
              background: `radial-gradient(circle, ${hexToRgba(NIGHT_CALM.amber, 0.32)} 0%, ${hexToRgba(NIGHT_CALM.candle, 0.1)} 30%, transparent 65%)`,
              filter: 'blur(24px)',
            }}
          />
          {/* Mid breathing layer · tighter glow */}
          <div
            aria-hidden
            className="night-breath absolute pointer-events-none rounded-full"
            style={{
              inset: -16,
              background: `radial-gradient(circle, ${hexToRgba(NIGHT_CALM.amber, 0.22)} 35%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />
          {/* The sphere · centered, full circle, warm gradient */}
          <div
            className="rounded-full"
            style={{
              width: '100%',
              height: '100%',
              background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${NIGHT_CALM.amber_glow} 35%, ${NIGHT_CALM.amber} 70%, ${NIGHT_CALM.candle} 100%)`,
              boxShadow: `inset -14px -14px 40px ${hexToRgba(NIGHT_CALM.candle, 0.5)}, inset 8px 8px 20px ${hexToRgba('#ffffff', 0.18)}, 0 0 80px ${hexToRgba(NIGHT_CALM.amber, 0.45)}`,
              position: 'relative',
            }}
          >
            {/* Subtle surface details */}
            <div className="absolute rounded-full" style={{ top: '22%', left: '22%', width: 5, height: 5, background: hexToRgba(NIGHT_CALM.candle, 0.35) }} />
            <div className="absolute rounded-full" style={{ top: '52%', left: '18%', width: 3.5, height: 3.5, background: hexToRgba(NIGHT_CALM.candle, 0.3) }} />
            <div className="absolute rounded-full" style={{ top: '38%', left: '60%', width: 2.5, height: 2.5, background: hexToRgba(NIGHT_CALM.candle, 0.25) }} />
            <div className="absolute rounded-full" style={{ top: '70%', left: '48%', width: 4, height: 4, background: hexToRgba(NIGHT_CALM.candle, 0.32) }} />
          </div>
        </div>

        {/* Clock · giant centered monolith */}
        <div
          className="font-headline font-[200] tabular-nums leading-none mt-10"
          style={{
            color: NIGHT_CALM_TEXT.primary,
            fontSize: 'clamp(3.8rem, 15vw, 5.4rem)',
            letterSpacing: '-0.06em',
            textShadow: `0 0 50px ${hexToRgba(NIGHT_CALM.amber, 0.4)}`,
          }}
        >
          {time}
        </div>

        {/* Single line: weekday · window */}
        <div
          className="font-ui uppercase tracking-[0.45em] font-[600] mt-4"
          style={{ color: NIGHT_CALM_TEXT.muted, fontSize: 10 }}
        >
          {weekdayLabel().toLowerCase()} · {formatGateWindow(gate).toLowerCase()}
        </div>

        {/* Quote whisper */}
        <div
          className="font-display italic mt-8 text-center max-w-[28ch]"
          style={{ color: NIGHT_CALM_TEXT.soft, fontSize: 12.5, lineHeight: 1.6, opacity: 0.8 }}
        >
          “{quote.text}”
        </div>
      </div>

      {/* ═══ FOOTER · pill toggle + capsule CTA + slumber ═══ */}
      <div
        className="relative z-10 px-6 shrink-0 flex flex-col items-center gap-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        {/* Pill mode toggle · compact, centered */}
        <div
          className="inline-flex items-center p-1 rounded-full"
          style={{
            background: hexToRgba('#000000', 0.45),
            border: `1px solid ${hexToRgba(NIGHT_CALM.amber, 0.18)}`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {(['full', 'express'] as const).map((m) => {
            const active = mode === m;
            const label = m === 'full' ? 'completo' : 'express';
            const count = m === 'full' ? fullCount : expressCount;
            const min = m === 'full' ? fullMin : expressMin;
            return (
              <button
                key={m}
                onClick={() => setModeAnd(m)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  background: active ? hexToRgba(NIGHT_CALM.amber, 0.2) : 'transparent',
                  color: active ? NIGHT_CALM.amber_glow : NIGHT_CALM_TEXT.muted,
                }}
              >
                <span className="font-ui uppercase tracking-[0.28em] font-[700]" style={{ fontSize: 10 }}>
                  {label}
                </span>
                <span className="font-mono ml-2 tabular-nums opacity-60" style={{ fontSize: 10 }}>
                  {count}·{min}m
                </span>
              </button>
            );
          })}
        </div>

        {/* Floating capsule CTA · with breathing halo */}
        <div className="relative w-full max-w-[360px]">
          <div
            aria-hidden
            className="night-breath absolute -inset-3 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 100% at 50% 50%, ${hexToRgba(NIGHT_CALM.amber, 0.55)} 0%, transparent 70%)`,
              filter: 'blur(22px)',
            }}
          />
          <button
            onClick={handleEnter}
            className="relative w-full flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
            style={{
              borderRadius: 999,
              padding: '18px 28px',
              background: `linear-gradient(135deg, ${NIGHT_CALM.amber_glow} 0%, ${NIGHT_CALM.amber} 50%, ${NIGHT_CALM.candle} 100%)`,
              color: NIGHT_CALM.void,
              boxShadow: `0 14px 40px -10px ${hexToRgba(NIGHT_CALM.amber, 0.65)}, inset 0 1px 0 ${hexToRgba('#ffffff', 0.3)}`,
            }}
          >
            <Moon size={18} strokeWidth={2.4} />
            <span
              className="font-headline font-[600] lowercase tracking-[-0.01em]"
              style={{ fontSize: 17 }}
            >
              entrar a la noche
            </span>
            <ArrowUpRight size={16} strokeWidth={2.6} />
          </button>
        </div>

        {/* Slumber whisper */}
        <button
          onClick={onEnterSlumber}
          className="font-mono uppercase tracking-[0.34em] font-[600] transition-opacity active:opacity-60"
          style={{
            color: NIGHT_CALM_TEXT.muted,
            fontSize: 9.5,
            opacity: 0.7,
            padding: '6px 4px',
          }}
        >
          {completedToday ? 'volver al slumber →' : 'ir directo a slumber →'}
        </button>
      </div>

      {/* Apple Health bridge modal */}
      {showHealthModal && (
        <HealthBridgeScreen
          mode={healthStatus.kind === 'stale' ? 'permissions' : 'connect'}
          onClose={() => setShowHealthModal(false)}
        />
      )}

    </div>
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
