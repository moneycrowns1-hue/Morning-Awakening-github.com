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
import MoonMascot from './MoonMascot';
import IconosBackground from './IconosBackground';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import { isHabitDone, setHabit } from '@/lib/habits';
import { haptics } from '@/lib/haptics';
import { Check } from 'lucide-react';

interface NightSummaryScreenProps {
  mode: 'full' | 'express';
  onEnterSlumber: () => void;
}

export default function NightSummaryScreen({ mode, onEnterSlumber }: NightSummaryScreenProps) {
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
      className="relative w-full h-full flex flex-col items-center justify-center px-6"
      style={{
        background: NIGHT.abyss,
        color: NIGHT_TEXT.primary,
      }}
    >
      <IconosBackground haloY={0.38} bottomGlow={1} starCount={65} />
      <div className="relative z-10 flex flex-col items-center w-full">
      <MoonMascot size={180} breathing floating blinking />

      <div
        className="mt-8 font-ui text-[10px] uppercase tracking-[0.45em]"
        style={{ color: NIGHT_TEXT.muted }}
      >
        Protocolo {mode === 'express' ? 'express' : 'completo'}
      </div>
      <h1
        className="mt-3 font-display italic font-[400] text-[clamp(2rem,8vw,2.6rem)] text-center leading-[1.15]"
        style={{
          color: NIGHT_TEXT.primary,
          textShadow: `0 0 28px ${hexToRgba(NIGHT.moon_core, 0.5)}`,
        }}
      >
        Lo hiciste
      </h1>
      <p
        className="mt-3 font-ui text-[13px] leading-[1.55] text-center max-w-sm"
        style={{ color: NIGHT_TEXT.soft }}
      >
        Las puertas están cerradas. Ahora solo queda una, y no la eliges tú: la entregas.
      </p>

      {/* Habit self-check */}
      <button
        onClick={toggleNoScreens}
        className="mt-8 w-full max-w-sm flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
        style={{
          background: noScreens ? hexToRgba(NIGHT.moon_halo, 0.15) : hexToRgba(NIGHT.violet_2, 0.4),
          border: `1px solid ${noScreens ? hexToRgba(NIGHT.moon_halo, 0.5) : NIGHT_TEXT.divider}`,
          color: NIGHT_TEXT.primary,
        }}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: noScreens ? NIGHT.moon_core : 'transparent',
            border: `1px solid ${noScreens ? NIGHT.moon_core : NIGHT_TEXT.divider}`,
          }}
        >
          {noScreens && <Check size={14} strokeWidth={2.5} color={NIGHT.abyss} />}
        </span>
        <div className="text-left">
          <div className="font-ui text-[13px]" style={{ color: NIGHT_TEXT.primary }}>
            Sin pantallas antes de la cama
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: NIGHT_TEXT.muted }}>
            Tocar si lo cumpliste hoy.
          </div>
        </div>
      </button>

      <button
        onClick={() => { haptics.tick(); onEnterSlumber(); }}
        className="mt-10 rounded-full w-full max-w-sm transition-transform active:scale-[0.98]"
        style={{
          padding: '16px 24px',
          background: `linear-gradient(180deg, ${hexToRgba(NIGHT.moon_halo, 0.22)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.55)} 100%)`,
          border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.5)}`,
          boxShadow: `0 10px 36px -10px ${hexToRgba(NIGHT.moon_core, 0.55)}`,
        }}
      >
        <span
          className="font-ui font-[500] text-[13px] tracking-[0.32em] uppercase"
          style={{ color: NIGHT_TEXT.primary }}
        >
          Entregar · Slumber
        </span>
      </button>
      </div>
    </div>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
