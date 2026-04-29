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
import { X, Heart, Moon, ArrowUpRight, Palette } from 'lucide-react';
import HealthBridgeScreen from '../profile/HealthBridgeScreen';
import NightStarfield from './NightStarfield';
import NightPalettePicker from '../common/NightPalettePicker';
import { getHealthStatus, loadHealthSnapshot, type HealthStatus } from '@/lib/common/healthkitBridge';
import { hexToRgba } from '@/lib/common/theme';
import { useNightPalette } from '@/lib/night/nightPalette';
import { getNightMissions, totalNightDuration } from '@/lib/night/nightConstants';
import type { AlarmConfig } from '@/lib/ritual/ritualSchedule';
import { computeSleepGate, formatGateWindow, loadSleepConfig } from '@/lib/night/sleepGate';
import { haptics } from '@/lib/common/haptics';
import { getDayProfile } from '@/lib/common/dayProfile';
import { adaptNightProtocol, type NightAdaptedPlan } from '@/lib/night/nightAdapter';
import { loadCheckIn } from '@/lib/coach/state';

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
  /** Recibe el plan adaptado (mode + missions resueltas + rationale). */
  onEnter: (plan: NightAdaptedPlan) => void;
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
  const [showPalettePicker, setShowPalettePicker] = useState(false);

  // Paleta activa global (persistida en localStorage).
  const { palette: N, paletteText: NT } = useNightPalette();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(() => ({ kind: 'missing' }));
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Refresh health status whenever the modal closes (it may have
  // imported new data via hash redirect in the meantime).
  useEffect(() => {
    setHealthStatus(getHealthStatus());
  }, [showHealthModal]);

  // Override per‐día: si el usuario tappeó Full/Express hoy, ese
  // valor se respeta en el adapter. Lo leemos de localStorage para
  // no perder la elección al recargar.
  const [userOverride, setUserOverride] = useState<NightMode | null>(null);
  useEffect(() => {
    try {
      const dayKey = MODE_DAY_KEY_PREFIX + todayKey();
      const dayPref = window.localStorage.getItem(dayKey);
      if (dayPref === 'full' || dayPref === 'express') {
        setUserOverride(dayPref);
      }
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

  // Plan adaptado · combina time pressure, sleep debt, day profile,
  // stress y override del usuario. El adapter es puro (no toca
  // localStorage ni el reloj global), así que es seguro recomputarlo
  // en cada render relevante.
  const plan = useMemo<NightAdaptedPlan>(() => {
    return adaptNightProtocol({
      now: new Date(),
      gate,
      health: loadHealthSnapshot(),
      checkIn: loadCheckIn(),
      dayProfile: getDayProfile(),
      userOverride,
    });
  }, [gate, userOverride, time, healthStatus]);

  // El modo "visual" del selector sigue al plan: si el usuario no
  // hizo override, se actualiza automáticamente cuando cambia un
  // signal (p.ej. al pasar el gate end).
  useEffect(() => {
    setMode(plan.mode);
  }, [plan.mode]);

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
    // Tap explicito del usuario → se vuelve override del día. El
    // adapter lo respeta y deja de auto‐adaptar la elección.
    setUserOverride(m);
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
      window.localStorage.setItem(MODE_DAY_KEY_PREFIX + todayKey(), m);
    } catch { /* ignore */ }
  };

  const handleEnter = () => {
    haptics.tick();
    try {
      // Persistimos sólo si no hubo override para no pisar la
      // elección automática del adapter como pref global.
      if (userOverride) {
        window.localStorage.setItem(MODE_KEY, plan.mode);
        window.localStorage.setItem(MODE_DAY_KEY_PREFIX + todayKey(), plan.mode);
      }
    } catch { /* ignore */ }
    onEnter(plan);
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
        color: NT.primary,
        background: N.void,
      }}
    >
      {/* ─── Cosmic horizon background ──────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${N.ember_1} 0%, ${N.void} 60%, #000000 100%)`,
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
          background: `radial-gradient(ellipse 60% 40% at 25% 80%, ${hexToRgba(N.candle, 0.16)} 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="night-breath absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 40% 30% at 80% 15%, ${hexToRgba(N.amber, 0.1)} 0%, transparent 60%)`,
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
            border: `1px solid ${hexToRgba(N.amber, 0.2)}`,
            color: NT.soft,
            opacity: 0.75,
          }}
          aria-label="Cerrar"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
        {/* Palette picker toggle */}
        <button
          onClick={() => { haptics.tap(); setShowPalettePicker((v) => !v); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:scale-[0.92] ml-auto mr-2 relative"
          style={{
            background: showPalettePicker ? hexToRgba(N.amber, 0.18) : 'transparent',
            border: `1px solid ${hexToRgba(N.amber, 0.2)}`,
            color: N.amber,
            opacity: 0.85,
          }}
          aria-label="Cambiar paleta"
        >
          <Palette size={14} strokeWidth={2.2} />
          {/* Mini swatch dot indicator */}
          <span
            aria-hidden
            className="absolute bottom-0.5 right-0.5 rounded-full"
            style={{ width: 6, height: 6, background: N.amber, boxShadow: `0 0 4px ${hexToRgba(N.amber, 0.85)}`, border: `1px solid ${N.void}` }}
          />
        </button>
        <button
          onClick={() => { haptics.tap(); setShowHealthModal(true); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:scale-[0.92] relative"
          style={{
            background: 'transparent',
            border: `1px solid ${hexToRgba(N.amber, 0.2)}`,
            color: healthStatus.kind === 'connected' ? N.amber : NT.soft,
            opacity: 0.75,
          }}
          aria-label="Apple Health"
        >
          <Heart size={14} strokeWidth={2.2} fill={healthStatus.kind === 'connected' ? 'currentColor' : 'none'} />
          {healthStatus.kind === 'missing' && (
            <span
              className="absolute top-0 right-0 w-2 h-2 rounded-full"
              style={{ background: N.candle, border: `1.5px solid #000` }}
            />
          )}
        </button>
      </div>

      {/* ═══ PALETTE PICKER · popover bajo el header ═══ */}
      {showPalettePicker && (
        <NightPalettePicker
          mode="popover"
          onClose={() => setShowPalettePicker(false)}
        />
      )}

      {/* ═══ GIANT MOON · ~35% visible, arcing over top ═══ */}
      {/* Anchored at the top edge with most of the sphere offscreen above.
          Only the bottom hemisphere of the moon shows. */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: 0,
          width: 'min(140vw, 700px)',
          height: 'min(140vw, 700px)',
          transform: 'translate(-50%, -65%)',
          zIndex: 5,
        }}
      >
        {/* Outer breathing aura · large soft halo */}
        <div
          className="night-breath-slow absolute"
          style={{
            inset: '-8%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.28)} 0%, ${hexToRgba(N.candle, 0.08)} 35%, transparent 65%)`,
            filter: 'blur(40px)',
          }}
        />
        {/* Mid breathing layer · tighter glow */}
        <div
          className="night-breath absolute rounded-full"
          style={{
            inset: '-2%',
            background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.18)} 38%, transparent 72%)`,
            filter: 'blur(16px)',
          }}
        />
        {/* The sphere itself */}
        <div
          className="rounded-full relative"
          style={{
            width: '100%',
            height: '100%',
            background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
            boxShadow: `inset -40px -40px 120px ${hexToRgba(N.candle, 0.55)}, inset 30px 30px 80px ${hexToRgba('#ffffff', 0.16)}, 0 0 200px ${hexToRgba(N.amber, 0.4)}`,
          }}
        >
          {/* Subtle surface craters · only on visible (bottom) hemisphere */}
          <div className="absolute rounded-full" style={{ top: '58%', left: '32%', width: '2.2%', height: '2.2%', background: hexToRgba(N.candle, 0.35) }} />
          <div className="absolute rounded-full" style={{ top: '68%', left: '52%', width: '1.6%', height: '1.6%', background: hexToRgba(N.candle, 0.3) }} />
          <div className="absolute rounded-full" style={{ top: '62%', left: '68%', width: '1.2%', height: '1.2%', background: hexToRgba(N.candle, 0.28) }} />
          <div className="absolute rounded-full" style={{ top: '78%', left: '42%', width: '1.8%', height: '1.8%', background: hexToRgba(N.candle, 0.32) }} />
          <div className="absolute rounded-full" style={{ top: '72%', left: '24%', width: '1.4%', height: '1.4%', background: hexToRgba(N.candle, 0.26) }} />
        </div>
      </div>

      {/* ═══ HERO · clock + meta · placed below moon arc ═══ */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-end px-6 pb-2">
        {/* Clock · giant centered monolith */}
        <div
          className="font-headline font-[200] tabular-nums leading-none"
          style={{
            color: NT.primary,
            fontSize: 'clamp(3.8rem, 15vw, 5.4rem)',
            letterSpacing: '-0.06em',
            textShadow: `0 0 50px ${hexToRgba(N.amber, 0.4)}`,
          }}
        >
          {time}
        </div>

        {/* Single line: weekday · window */}
        <div
          className="font-ui uppercase tracking-[0.45em] font-[600] mt-4"
          style={{ color: NT.muted, fontSize: 10 }}
        >
          {weekdayLabel().toLowerCase()} · {formatGateWindow(gate).toLowerCase()}
        </div>

        {/* Quote whisper */}
        <div
          className="font-display italic mt-6 text-center max-w-[28ch]"
          style={{ color: NT.soft, fontSize: 12.5, lineHeight: 1.6, opacity: 0.8 }}
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
            border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {(['full', 'express'] as const).map((m) => {
            const active = mode === m;
            const label = m === 'full' ? 'completo' : 'express';
            const count = m === 'full' ? fullCount : expressCount;
            // Si es el modo activo y el plan adaptó la duración (ej.
            // stress alto), mostramos los minutos del plan; si no,
            // los hardcoded del catálogo.
            const min = active
              ? Math.round(plan.totalSec / 60)
              : (m === 'full' ? fullMin : expressMin);
            return (
              <button
                key={m}
                onClick={() => setModeAnd(m)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  background: active ? hexToRgba(N.amber, 0.2) : 'transparent',
                  color: active ? N.amber_glow : NT.muted,
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

        {/* Rationale del adapter · solo si hubo señal contextual.
            Es una línea fina debajo del pill, en mono pequeñito — no
            roba foco al CTA pero comunica que la app pensó por vos. */}
        {plan.rationale && plan.autoReason !== 'override' && (
          <div
            className="flex items-center gap-2 -mt-1 px-3 py-1.5 rounded-full sunrise-fade-up"
            style={{
              background: hexToRgba(N.amber, 0.06),
              border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
              animationDelay: '120ms',
            }}
          >
            <span
              aria-hidden
              className="night-breath"
              style={{
                width: 5,
                height: 5,
                borderRadius: 99,
                background: N.amber,
                boxShadow: `0 0 6px ${hexToRgba(N.amber, 0.7)}`,
              }}
            />
            <span
              className="font-mono lowercase tracking-[0.05em]"
              style={{ color: NT.soft, fontSize: 10.5 }}
            >
              {plan.rationale}
            </span>
          </div>
        )}

        {/* Floating capsule CTA · with breathing halo */}
        <div className="relative w-full max-w-[360px]">
          <div
            aria-hidden
            className="night-breath absolute -inset-3 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 100% at 50% 50%, ${hexToRgba(N.amber, 0.55)} 0%, transparent 70%)`,
              filter: 'blur(22px)',
            }}
          />
          <button
            onClick={handleEnter}
            className="relative w-full flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
            style={{
              borderRadius: 999,
              padding: '18px 28px',
              background: `linear-gradient(135deg, ${N.amber_glow} 0%, ${N.amber} 50%, ${N.candle} 100%)`,
              color: N.void,
              boxShadow: `0 14px 40px -10px ${hexToRgba(N.amber, 0.65)}, inset 0 1px 0 ${hexToRgba('#ffffff', 0.3)}`,
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
            color: NT.muted,
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
