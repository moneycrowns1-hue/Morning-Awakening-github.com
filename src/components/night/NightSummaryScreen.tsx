'use client';

// ═══════════════════════════════════════════════════════════
// NightSummaryScreen · brief "protocolo nocturno completo"
// screen, pre-Slumber Lock.
//
// Shows:
//   - Mascot, big success mark, phrase.
//   - Self-check toggle for 'no_screens_before_bed' habit.
//   - CTA "Entregar" → parent switches to SlumberLockScreen.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { isHabitDone, setHabit } from '@/lib/common/habits';
import { haptics } from '@/lib/common/haptics';
import { Check } from 'lucide-react';
import NightStarfield from './NightStarfield';

interface NightSummaryScreenProps {
  mode: 'full' | 'express';
  onEnterSlumber: () => void;
}

export default function NightSummaryScreen({ mode, onEnterSlumber }: NightSummaryScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const [noScreens, setNoScreens] = useState(false);

  useEffect(() => {
    setNoScreens(isHabitDone('no_screens_before_bed'));
  }, []);

  const toggleNoScreens = () => {
    haptics.tap();
    const today = todayISO();
    const next = !noScreens;
    setNoScreens(next);
    setHabit('no_screens_before_bed', today, next);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{
        color: NT.primary,
        background: `radial-gradient(ellipse at 50% 35%, ${N.ember_1} 0%, ${N.void} 75%)`,
      }}
    >
      {/* Starfield ambient */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <NightStarfield count={60} shooting={false} />
      </div>
      {/* Soft amber halo */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          height: 280,
          background: `radial-gradient(ellipse, ${hexToRgba(N.amber, 0.22)} 0%, transparent 70%)`,
          filter: 'blur(28px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full">
        <SmilingMoon size={140} amber={N.amber} amberGlow={N.amber_glow} candle={N.candle} void_={N.void} />

        {/* Editorial caption */}
        <div
          className="mt-7 font-mono uppercase tracking-[0.42em] font-[600]"
          style={{ color: hexToRgba(N.amber, 0.75), fontSize: 10 }}
        >
          protocolo {mode === 'express' ? 'express' : 'completo'}
        </div>
        <div
          aria-hidden
          className="mt-3"
          style={{ width: 36, height: 1, background: hexToRgba(N.amber, 0.55) }}
        />

        <h1
          className="mt-5 font-headline font-[500] text-[clamp(2.1rem,9vw,2.8rem)] text-center leading-[1.1]"
          style={{
            color: NT.primary,
            letterSpacing: '-0.015em',
            textShadow: `0 0 32px ${hexToRgba(N.amber, 0.45)}`,
          }}
        >
          Lo hiciste
        </h1>
        <p
          className="mt-4 font-ui text-[13px] leading-[1.6] text-center max-w-sm"
          style={{ color: NT.soft }}
        >
          Las puertas están cerradas. Ahora solo queda una, y no la eliges tú: la entregas.
        </p>

        {/* Habit self-check · hairline jeton */}
        <button
          onClick={toggleNoScreens}
          className="mt-8 w-full max-w-sm flex items-center gap-3 px-4 py-3.5 transition-colors"
          style={{
            background: noScreens ? hexToRgba(N.amber, 0.1) : hexToRgba(N.void, 0.4),
            border: `1px solid ${hexToRgba(N.amber, noScreens ? 0.45 : 0.14)}`,
            color: NT.primary,
          }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: noScreens ? N.amber : 'transparent',
              border: `1px solid ${noScreens ? N.amber : hexToRgba(N.amber, 0.3)}`,
            }}
          >
            {noScreens && <Check size={12} strokeWidth={3} color={N.void} />}
          </span>
          <div className="text-left flex-1">
            <div className="font-ui text-[13px]" style={{ color: NT.primary }}>
              Sin pantallas antes de la cama
            </div>
            <div className="text-[10px] mt-0.5 font-mono uppercase tracking-[0.18em]" style={{ color: NT.muted }}>
              tocar si lo cumpliste hoy
            </div>
          </div>
        </button>

        {/* CTA · entregar slumber · estilo amber rectangular */}
        <button
          onClick={() => { haptics.tick(); onEnterSlumber(); }}
          className="mt-10 w-full max-w-sm flex items-center justify-center gap-2.5 transition-transform active:scale-[0.985]"
          style={{
            padding: '17px 28px',
            background: N.amber,
            color: N.void,
            boxShadow: `0 12px 36px -8px ${hexToRgba(N.amber, 0.6)}`,
          }}
        >
          <span className="font-ui font-[700] text-[12px] tracking-[0.32em] uppercase">
            entregar · slumber
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Smiling crescent moon · luna sonriente con paleta dinámica ───
function SmilingMoon({
  size,
  amber,
  amberGlow,
  candle,
  void_,
}: {
  size: number;
  amber: string;
  amberGlow: string;
  candle: string;
  void_: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 28px ${hexToRgba(amber, 0.55)})` }}
    >
      <defs>
        {/* glow halo around moon */}
        <radialGradient id="sm-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={amber} stopOpacity="0.42" />
          <stop offset="60%" stopColor={amberGlow} stopOpacity="0.12" />
          <stop offset="100%" stopColor={amber} stopOpacity="0" />
        </radialGradient>
        {/* moon body gradient · cream highlight + amber body + candle shadow */}
        <radialGradient id="sm-body" cx="38%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#fff4e2" />
          <stop offset="35%" stopColor={amberGlow} />
          <stop offset="75%" stopColor={amber} />
          <stop offset="100%" stopColor={candle} />
        </radialGradient>
        {/* crescent mask · keeps only the lit portion of the moon */}
        <mask id="sm-crescent">
          <rect width="140" height="140" fill="black" />
          <circle cx="70" cy="70" r="42" fill="white" />
          <circle cx="86" cy="62" r="38" fill="black" />
        </mask>
      </defs>

      {/* halo */}
      <circle cx="70" cy="70" r="68" fill="url(#sm-halo)" />

      {/* crescent body */}
      <g mask="url(#sm-crescent)">
        <rect width="140" height="140" fill="url(#sm-body)" />
      </g>

    </svg>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
