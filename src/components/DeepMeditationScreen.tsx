'use client';

// ═══════════════════════════════════════════════════════════
// DeepMeditationScreen · 3-mode meditation with selectable
// duration (10/15/20 min).
//
// Two-step flow:
//   1. Mode + duration picker (this screen).
//   2. WellnessSessionRunner with the dynamically-built routine.
//
// Persistence: the last mode and duration are remembered in
// localStorage so the user can hit "Iniciar" without re-picking.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ChevronLeft, Play } from 'lucide-react';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import {
  buildDeepMeditationRoutine,
  DEEP_MEDITATION_MODES,
  type DeepMeditationMode,
} from '@/lib/wellnessRoutines';
import WellnessSessionRunner from './WellnessSessionRunner';

const MODE_KEY = 'ma-deepmed-mode';
const DURATION_KEY = 'ma-deepmed-duration';

type Duration = 10 | 15 | 20;
const DURATIONS: Duration[] = [10, 15, 20];

interface DeepMeditationScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function DeepMeditationScreen({ onComplete, onCancel }: DeepMeditationScreenProps) {
  const [mode, setMode] = useState<DeepMeditationMode>('mindfulness');
  const [duration, setDuration] = useState<Duration>(15);
  const [started, setStarted] = useState(false);

  // Hydrate persisted picks.
  useEffect(() => {
    try {
      const m = window.localStorage.getItem(MODE_KEY);
      if (m === 'mindfulness' || m === 'body_scan' || m === 'metta') setMode(m);
      const d = window.localStorage.getItem(DURATION_KEY);
      if (d === '10' || d === '15' || d === '20') setDuration(parseInt(d, 10) as Duration);
    } catch { /* ignore */ }
  }, []);

  const handleStart = () => {
    haptics.tap();
    try {
      window.localStorage.setItem(MODE_KEY, mode);
      window.localStorage.setItem(DURATION_KEY, String(duration));
    } catch { /* ignore */ }
    setStarted(true);
  };

  if (started) {
    const routine = buildDeepMeditationRoutine(mode, duration);
    return (
      <WellnessSessionRunner
        routine={routine}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    );
  }

  const modeContent = DEEP_MEDITATION_MODES[mode];

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        color: NIGHT_TEXT.primary,
        background: `radial-gradient(ellipse at 50% 35%, ${NIGHT.violet_1} 0%, ${NIGHT.abyss} 80%)`,
      }}
    >
      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onCancel(); }}
          aria-label="Volver"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: NIGHT_TEXT.soft }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.34em]"
            style={{ color: NIGHT_TEXT.muted }}
          >
            Hub Bienestar
          </span>
          <span
            className="font-display italic font-[400] text-[20px] leading-tight truncate"
            style={{ color: NIGHT_TEXT.primary }}
          >
            Meditación profunda
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 px-5 pb-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="max-w-md mx-auto">
          {/* Mode picker */}
          <div className="mt-3 mb-5">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: NIGHT_TEXT.muted }}
            >
              Técnica
            </h2>
            <div className="flex flex-col gap-2">
              {(Object.keys(DEEP_MEDITATION_MODES) as DeepMeditationMode[]).map((id) => {
                const m = DEEP_MEDITATION_MODES[id];
                const active = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => { haptics.tap(); setMode(id); }}
                    className="text-left rounded-2xl px-4 py-3 transition-all"
                    style={{
                      background: active
                        ? hexToRgba(NIGHT.moon_halo, 0.14)
                        : hexToRgba(NIGHT.violet_2, 0.4),
                      border: `1px solid ${active
                        ? hexToRgba(NIGHT.moon_halo, 0.45)
                        : hexToRgba(NIGHT.moon_core, 0.12)}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="font-display italic font-[400] text-[16px]"
                        style={{ color: NIGHT_TEXT.primary }}
                      >
                        {m.shortLabel}
                      </span>
                      {active && (
                        <span
                          className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background: hexToRgba(NIGHT.moon_halo, 0.28),
                            color: NIGHT_TEXT.primary,
                          }}
                        >
                          Activa
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 font-ui text-[12px] leading-[1.5]"
                      style={{ color: active ? NIGHT_TEXT.soft : NIGHT_TEXT.muted }}
                    >
                      {m.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration picker */}
          <div className="mb-6">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: NIGHT_TEXT.muted }}
            >
              Duración
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => {
                const active = duration === d;
                return (
                  <button
                    key={d}
                    onClick={() => { haptics.tap(); setDuration(d); }}
                    className="rounded-xl py-3 transition-transform active:scale-[0.97]"
                    style={{
                      background: active
                        ? hexToRgba(NIGHT.moon_halo, 0.16)
                        : hexToRgba(NIGHT.violet_2, 0.4),
                      border: `1px solid ${active
                        ? hexToRgba(NIGHT.moon_halo, 0.5)
                        : hexToRgba(NIGHT.moon_core, 0.12)}`,
                      color: active ? NIGHT_TEXT.primary : NIGHT_TEXT.soft,
                    }}
                  >
                    <div className="font-display italic font-[400] text-[24px] leading-none">
                      {d}
                    </div>
                    <div className="font-ui text-[10px] tracking-[0.28em] uppercase mt-0.5" style={{ color: NIGHT_TEXT.muted }}>
                      min
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hitos preview */}
          <div className="mb-6">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: NIGHT_TEXT.muted }}
            >
              Estructura
            </h2>
            <ul className="flex flex-col gap-1.5">
              <Hito label="Apertura" hint="60 s · postura + intención" />
              {modeContent.milestones.map((m, i) => (
                <Hito
                  key={m.id}
                  label={`${i + 1}. ${m.label}`}
                  hint={m.description}
                />
              ))}
              <Hito label="Cierre" hint="90 s · expansión + retorno" />
            </ul>
          </div>

          {/* Start CTA */}
          <button
            onClick={handleStart}
            className="w-full rounded-2xl px-5 py-4 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(160deg, ${hexToRgba(NIGHT.moon_halo, 0.3)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.22)} 100%)`,
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.55)}`,
              boxShadow: `0 14px 40px -16px ${hexToRgba(NIGHT.moon_halo, 0.55)}`,
              color: NIGHT_TEXT.primary,
            }}
          >
            <Play size={16} strokeWidth={1.9} fill={NIGHT.moon_halo} />
            <span className="font-ui text-[13px] tracking-[0.3em] uppercase font-[500]">
              Iniciar · {duration} min
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Hito({ label, hint }: { label: string; hint: string }) {
  return (
    <li
      className="rounded-xl px-3 py-2"
      style={{
        background: hexToRgba(NIGHT.violet_2, 0.35),
        border: `1px solid ${hexToRgba(NIGHT.moon_core, 0.1)}`,
      }}
    >
      <div
        className="font-ui text-[12px] font-[500]"
        style={{ color: NIGHT_TEXT.primary }}
      >
        {label}
      </div>
      <div
        className="font-ui text-[10.5px] leading-[1.5] mt-0.5"
        style={{ color: NIGHT_TEXT.muted }}
      >
        {hint}
      </div>
    </li>
  );
}
