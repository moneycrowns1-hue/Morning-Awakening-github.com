'use client';

// ═══════════════════════════════════════════════════════════
// DeepMeditationScreen · 3-mode meditation with selectable
// duration (10/15/20 min).
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio dot ámbar + caption "wellness · meditación".
//   - Hero hero title lowercase + punto ámbar.
//   - Mode picker (jeton-style rows) + duration grid.
//   - Estructura preview hairline + V5 CTA "iniciar".
// Paleta · useNightPalette() para vivir en sync con global.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ChevronLeft, Play, Check } from 'lucide-react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import {
  buildDeepMeditationRoutine,
  DEEP_MEDITATION_MODES,
  type DeepMeditationMode,
} from '@/lib/wellness/wellnessRoutines';
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
  const { palette: N, paletteText: NT } = useNightPalette();
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
      style={{ color: NT.primary, background: N.void }}
    >
      {/* ─── Header · MASTHEAD editorial ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        {/* Top folio · back + brand mono · clock-style indicator */}
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onCancel(); }}
            aria-label="Volver"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: NT.muted }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              wellness · meditación
            </span>
          </button>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(duration).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            min
          </span>
        </div>
        {/* Hairline divider */}
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
      </div>

      {/* ─── Body unificado ──────────────────────────────────── */}
      <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4">
        {/* Top corners · numeral + cue label */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{
              color: NT.primary,
              fontSize: 13,
              letterSpacing: '0.02em',
            }}
          >
            00
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · {modeContent.shortLabel.toLowerCase()} ·
          </span>
        </div>

        {/* Hero title · lowercase grande con punto ámbar */}
        <h1
          className="font-headline font-[700] lowercase tracking-[-0.04em] mt-5"
          style={{
            color: NT.primary,
            fontSize: 'clamp(2rem, 7.5vw, 2.8rem)',
            lineHeight: 0.95,
            textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
            textWrap: 'balance' as never,
            maxWidth: '14ch',
          }}
        >
          meditación profunda
          <span style={{ color: N.amber }}>.</span>
        </h1>

        <p
          className="mt-3 font-ui text-[12.5px] leading-[1.55] max-w-[36ch]"
          style={{ color: NT.soft }}
        >
          {modeContent.description}
        </p>

        {/* ─── Mode picker · jeton-style rows ───────────────── */}
        <SectionHeader N={N} NT={NT}>técnica</SectionHeader>
        <div className="flex flex-col">
          {(Object.keys(DEEP_MEDITATION_MODES) as DeepMeditationMode[]).map((id, i) => {
            const m = DEEP_MEDITATION_MODES[id];
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => { haptics.tap(); setMode(id); }}
                className="w-full text-left py-3.5 flex items-baseline gap-4 transition-opacity active:opacity-70"
                style={{ borderBottom: `1px solid ${hexToRgba(N.amber, 0.1)}` }}
              >
                {/* Numeral tabular */}
                <span
                  className="font-mono tabular-nums shrink-0"
                  style={{
                    color: active ? N.amber : hexToRgba(N.amber, 0.35),
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    fontWeight: active ? 700 : 500,
                    minWidth: '2ch',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* Label + description */}
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-headline font-[600] lowercase tracking-[-0.01em]"
                    style={{
                      color: active ? NT.primary : NT.soft,
                      fontSize: 15,
                    }}
                  >
                    {m.shortLabel.toLowerCase()}
                  </span>
                  <span
                    className="block mt-0.5 font-ui leading-[1.5]"
                    style={{
                      color: NT.muted,
                      fontSize: 11.5,
                    }}
                  >
                    {m.description}
                  </span>
                </span>
                {/* Active marker */}
                {active && (
                  <Check size={14} strokeWidth={2.4} style={{ color: N.amber, marginTop: 4 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Duration picker · grid 3 ──────────────────────── */}
        <SectionHeader N={N} NT={NT}>duración</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <button
                key={d}
                onClick={() => { haptics.tap(); setDuration(d); }}
                className="py-3.5 transition-transform active:scale-[0.97]"
                style={{
                  background: active ? hexToRgba(N.amber, 0.14) : 'transparent',
                  border: `1px solid ${active ? hexToRgba(N.amber, 0.55) : hexToRgba(N.amber, 0.14)}`,
                }}
              >
                <div
                  className="font-headline font-[700] tabular-nums"
                  style={{
                    color: active ? NT.primary : NT.soft,
                    fontSize: 28,
                    lineHeight: 0.95,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {d}
                </div>
                <div
                  className="font-mono text-[9px] tracking-[0.32em] uppercase mt-1.5 font-[600]"
                  style={{ color: active ? hexToRgba(N.amber, 0.85) : NT.muted }}
                >
                  min
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Estructura preview ─────────────────────── */}
        <SectionHeader N={N} NT={NT}>estructura</SectionHeader>
        <div>
          <HitoRow label="apertura" hint="60s · postura + intención" index={0} N={N} NT={NT} />
          {modeContent.milestones.map((m, i) => (
            <HitoRow
              key={m.id}
              label={m.label}
              hint={m.description}
              index={i + 1}
              N={N}
              NT={NT}
            />
          ))}
          <HitoRow
            label="cierre"
            hint="90s · expansión + retorno"
            index={modeContent.milestones.length + 1}
            N={N}
            NT={NT}
            last
          />
        </div>

        <div className="h-4" />
      </div>

      {/* ─── Footer · CTA iniciar V5 ─────────────────── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            onClick={handleStart}
            className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center justify-center gap-2.5"
            style={{
              padding: '14px 28px',
              background: N.amber,
              color: N.void,
              fontSize: 10.5,
              boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            <Play size={13} strokeWidth={2.4} fill="currentColor" />
            iniciar · {duration} min
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

function SectionHeader({
  children,
  N,
  NT,
}: { children: React.ReactNode } & PaletteProps) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-3">
      <span
        className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
        style={{ color: NT.muted, fontSize: 9 }}
      >
        ─ · {children} · ─
      </span>
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.amber, 0.12) }}
      />
    </div>
  );
}

function HitoRow({
  label,
  hint,
  index,
  N,
  NT,
  last,
}: {
  label: string;
  hint: string;
  index: number;
  last?: boolean;
} & PaletteProps) {
  return (
    <div
      className="py-2.5 flex items-baseline gap-4"
      style={{ borderBottom: last ? 'none' : `1px solid ${hexToRgba(N.amber, 0.08)}` }}
    >
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: hexToRgba(N.amber, 0.45),
          fontSize: 10,
          letterSpacing: '0.1em',
          minWidth: '2ch',
        }}
      >
        {String(index).padStart(2, '0')}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{ color: NT.soft, fontSize: 13.5 }}
        >
          {label.toLowerCase()}
        </span>
        <span
          className="block mt-0.5 font-ui leading-[1.45]"
          style={{ color: NT.muted, fontSize: 11 }}
        >
          {hint}
        </span>
      </span>
    </div>
  );
}
