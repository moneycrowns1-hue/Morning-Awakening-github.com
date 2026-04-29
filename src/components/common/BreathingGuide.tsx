'use client';

// ═══════════════════════════════════════════════════════════
// BreathingGuide · Wim Hof method · 3 rondas energizantes.
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio dot ámbar + caption "wellness · wim hof".
//   - Hero title lowercase de la fase actual.
//   - Orb central pulsante (inhala expande, exhala contrae,
//     retén estático, recuperación expandida).
//   - Round dots tabular + breath count tabular.
//   - Pre-start: descripción + CTA iniciar V5.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Play, X } from 'lucide-react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

type BreathPhase = 'POWER' | 'HOLD' | 'RECOVERY' | 'REST';

interface WimHofState {
  round: number;
  phase: BreathPhase;
  breathCount: number;
  holdTimer: number;
  isInhaling: boolean;
}

interface BreathingGuideProps {
  /** Optional close handler · si se omite, no muestra botón cerrar. */
  onClose?: () => void;
  /** Si true, omite header/título/footer y se integra dentro de otra pantalla
   *  (ej. MissionPhaseV8 fase Pneuma). Solo renderiza orb + label + dots. */
  embedded?: boolean;
}

const TOTAL_ROUNDS = 3;
const BREATHS_PER_ROUND = 30;
const HOLD_DURATION = 30;
const RECOVERY_HOLD = 15;

export default function BreathingGuide({ onClose, embedded = false }: BreathingGuideProps = {}) {
  const { palette: N, paletteText: NT } = useNightPalette();

  const [state, setState] = useState<WimHofState>({
    round: 1, phase: 'POWER', breathCount: 0, holdTimer: 0, isInhaling: true,
  });
  const [active, setActive] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Orb animation per phase
  useEffect(() => {
    if (!orbRef.current || !active) return;
    const el = orbRef.current;

    if (state.phase === 'POWER') {
      if (state.isInhaling) {
        gsap.to(el, { scale: 1.18, duration: 0.8, ease: 'power1.inOut' });
      } else {
        gsap.to(el, { scale: 0.85, duration: 0.7, ease: 'power1.inOut' });
      }
    } else if (state.phase === 'HOLD') {
      gsap.to(el, { scale: 0.7, duration: 1, ease: 'power2.out' });
    } else if (state.phase === 'RECOVERY') {
      gsap.to(el, { scale: 1.22, duration: 2, ease: 'power1.inOut' });
    } else if (state.phase === 'REST') {
      gsap.to(el, { scale: 1, duration: 1, ease: 'power2.inOut' });
    }
  }, [state.phase, state.isInhaling, state.breathCount, active]);

  const startPowerBreathing = useCallback((round: number) => {
    let count = 0;
    let inhaling = true;

    setState(s => ({ ...s, round, phase: 'POWER', breathCount: 0, isInhaling: true }));

    intervalRef.current = setInterval(() => {
      if (inhaling) {
        inhaling = false;
        setState(s => ({ ...s, isInhaling: false }));
      } else {
        count++;
        inhaling = true;
        setState(s => ({ ...s, breathCount: count, isInhaling: true }));

        if (count >= BREATHS_PER_ROUND) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          startHoldPhase(round);
        }
      }
    }, 750);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startHoldPhase = useCallback((round: number) => {
    let timer = 0;
    setState(s => ({ ...s, phase: 'HOLD', holdTimer: 0 }));

    intervalRef.current = setInterval(() => {
      timer++;
      setState(s => ({ ...s, holdTimer: timer }));
      if (timer >= HOLD_DURATION) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        startRecoveryPhase(round);
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecoveryPhase = useCallback((round: number) => {
    let timer = 0;
    setState(s => ({ ...s, phase: 'RECOVERY', holdTimer: 0 }));

    intervalRef.current = setInterval(() => {
      timer++;
      setState(s => ({ ...s, holdTimer: timer }));
      if (timer >= RECOVERY_HOLD) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (round < TOTAL_ROUNDS) {
          setState(s => ({ ...s, phase: 'REST' }));
          timeoutRef.current = setTimeout(() => startPowerBreathing(round + 1), 3000);
        } else {
          setState(s => ({ ...s, phase: 'REST' }));
          haptics.tap();
        }
      }
    }, 1000);
  }, [startPowerBreathing]);

  const handleStart = useCallback(() => {
    haptics.tap();
    setActive(true);
    startPowerBreathing(1);
  }, [startPowerBreathing]);

  const phaseLabel = (): string => {
    switch (state.phase) {
      case 'POWER':    return state.isInhaling ? 'inhala' : 'exhala';
      case 'HOLD':     return 'retén';
      case 'RECOVERY': return 'recuperación';
      case 'REST':     return state.round >= TOTAL_ROUNDS ? 'completo' : 'preparando';
    }
  };

  const phaseHint = (): string => {
    switch (state.phase) {
      case 'POWER':    return `Respiración ${state.breathCount}/${BREATHS_PER_ROUND}`;
      case 'HOLD':     return `Exhala y mantén · ${state.holdTimer}s`;
      case 'RECOVERY': return `Inhala profundo y mantén · ${state.holdTimer}s`;
      case 'REST':     return state.round >= TOTAL_ROUNDS ? 'Tres rondas completadas.' : 'Siguiente ronda en 3s…';
    }
  };

  const isFinished = state.phase === 'REST' && state.round >= TOTAL_ROUNDS;
  const globalProgress = isFinished
    ? 1
    : Math.min(1, (state.round - 1 + (state.phase === 'POWER' ? state.breathCount / BREATHS_PER_ROUND * 0.5 : state.phase === 'HOLD' ? 0.5 + state.holdTimer / HOLD_DURATION * 0.25 : state.phase === 'RECOVERY' ? 0.75 + state.holdTimer / RECOVERY_HOLD * 0.25 : 1)) / TOTAL_ROUNDS);

  // ─── Pre-start screen ─────────────────────────────────────
  if (!active) {
    if (embedded) {
      // Versión compacta para incrustar dentro de MissionPhaseV8.
      // Solo el CTA + descripción corta · sin header/footer/title duplicados.
      return (
        <div className="w-full flex flex-col items-center gap-5 py-2">
          <p
            className="font-ui text-[13px] leading-[1.55] text-center max-w-[32ch]"
            style={{ color: NT.soft }}
          >
            30 respiraciones rápidas y profundas → retención al exhalar →
            inhalación de recuperación. Tres rondas.
          </p>
          <div className="flex items-center gap-6">
            <Stat label="rondas" value="3" N={N} NT={NT} />
            <Divider N={N} />
            <Stat label="resp/ronda" value="30" N={N} NT={NT} />
            <Divider N={N} />
            <Stat label="duración" value="~10m" N={N} NT={NT} />
          </div>
          <button
            onClick={handleStart}
            className="font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center gap-2.5 mt-2"
            style={{
              padding: '14px 28px',
              background: N.amber,
              color: N.void,
              fontSize: 10.5,
              boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            <Play size={13} strokeWidth={2.4} fill="currentColor" />
            iniciar respiración
          </button>
        </div>
      );
    }
    return (
      <div
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{ color: NT.primary, background: N.void }}
      >
        {/* Header masthead */}
        <div
          className="relative z-10 px-6 shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
        >
          <div className="flex items-center justify-between pb-2.5">
            {onClose ? (
              <button
                onClick={() => { haptics.tap(); onClose(); }}
                aria-label="Cerrar"
                className="flex items-center gap-2 transition-opacity active:opacity-60"
                style={{ color: NT.muted }}
              >
                <X size={14} strokeWidth={2.2} />
                <BrandCaption N={N} NT={NT} label="wellness · wim hof" />
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <BrandCaption N={N} NT={NT} label="wellness · wim hof" />
              </span>
            )}
            <span
              className="font-mono tabular-nums tracking-[0.18em] font-[500]"
              style={{ color: NT.muted, fontSize: 10 }}
            >
              <span style={{ color: NT.primary, fontWeight: 600 }}>03</span>
              <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
              rondas
            </span>
          </div>
          <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · método wim hof ·
          </span>

          <h1
            className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2.2rem, 8vw, 3.2rem)',
              lineHeight: 0.95,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
              maxWidth: '14ch',
            }}
          >
            respiración<br />energizante
            <span style={{ color: N.amber }}>.</span>
          </h1>

          <p
            className="font-ui text-[13px] leading-[1.55] text-center max-w-[32ch]"
            style={{ color: NT.soft }}
          >
            30 respiraciones rápidas y profundas → retención al exhalar →
            inhalación de recuperación. Tres rondas.
          </p>

          {/* Mini stat strip */}
          <div className="flex items-center gap-6 mt-2">
            <Stat label="rondas" value="3" N={N} NT={NT} />
            <Divider N={N} />
            <Stat label="resp/ronda" value="30" N={N} NT={NT} />
            <Divider N={N} />
            <Stat label="duración" value="~10m" N={N} NT={NT} />
          </div>
        </div>

        {/* Footer · CTA iniciar */}
        <div
          className="relative z-10 px-6 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <div className="flex items-center justify-center pt-3">
            <button
              onClick={handleStart}
              className="font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center gap-2.5"
              style={{
                padding: '14px 28px',
                background: N.amber,
                color: N.void,
                fontSize: 10.5,
                boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              <Play size={13} strokeWidth={2.4} fill="currentColor" />
              iniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active session screen ────────────────────────────────
  const orbCount = state.phase === 'POWER' ? state.breathCount : state.phase === 'HOLD' || state.phase === 'RECOVERY' ? state.holdTimer : 0;
  const orbCountSuffix = state.phase === 'POWER' ? '' : 's';

  if (embedded) {
    // Versión compacta activa: solo R# · phase · orb + label + dots.
    // La progress bar global la maneja MissionPhaseV8.
    return (
      <div className="w-full flex flex-col items-center gap-6 py-2">
        <div className="w-full flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            R{state.round}
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · {state.phase.toLowerCase()} ·
          </span>
        </div>

        <h2
          className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
          style={{
            color: NT.primary,
            fontSize: 'clamp(2rem, 7vw, 2.6rem)',
            lineHeight: 0.95,
            textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
          }}
        >
          {phaseLabel()}
          <span style={{ color: N.amber }}>.</span>
        </h2>

        <div className="relative" style={{ width: 160, height: 160 }}>
          <div
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            style={{
              inset: -28,
              background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.4)} 0%, transparent 70%)`,
              filter: 'blur(20px)',
              opacity: isFinished ? 0.5 : 0.95,
            }}
          />
          <div
            ref={orbRef}
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
              boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 44px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            <span
              className="font-headline font-[700] tabular-nums"
              style={{
                color: N.void,
                fontSize: 30,
                letterSpacing: '-0.02em',
                textShadow: `0 1px 2px ${hexToRgba('#ffffff', 0.5)}`,
              }}
            >
              {isFinished ? '✓' : orbCount + orbCountSuffix}
            </span>
          </div>
        </div>

        <p
          className="font-ui text-[12.5px] leading-[1.55] text-center max-w-[28ch]"
          style={{ color: NT.soft }}
        >
          {phaseHint()}
        </p>

        <div className="flex justify-center gap-2">
          {[1, 2, 3].map(r => (
            <span
              key={r}
              className="rounded-full transition-all"
              style={{
                width: r === state.round && !isFinished ? 8 : 5,
                height: r === state.round && !isFinished ? 8 : 5,
                background: r <= state.round ? N.amber : hexToRgba(N.amber, 0.18),
                boxShadow: r === state.round && !isFinished ? `0 0 10px ${hexToRgba(N.amber, 0.7)}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* Header masthead */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <span className="flex items-center gap-2">
            <BrandCaption N={N} NT={NT} label="wellness · wim hof" />
          </span>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(state.round).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            {String(TOTAL_ROUNDS).padStart(2, '0')}
          </span>
        </div>
        <div className="relative h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${globalProgress * 100}%`,
              background: N.amber,
              boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.5)}`,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6">
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            R{state.round}
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · {state.phase.toLowerCase()} ·
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2.4rem, 9vw, 3.4rem)',
              lineHeight: 0.95,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
              maxWidth: '14ch',
            }}
          >
            {phaseLabel()}
            <span style={{ color: N.amber }}>.</span>
          </h1>

          {/* Orb central */}
          <div className="relative" style={{ width: 160, height: 160 }}>
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: -28,
                background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.4)} 0%, transparent 70%)`,
                filter: 'blur(20px)',
                opacity: isFinished ? 0.5 : 0.95,
              }}
            />
            <div
              ref={orbRef}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
                boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 44px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              <span
                className="font-headline font-[700] tabular-nums"
                style={{
                  color: N.void,
                  fontSize: 30,
                  letterSpacing: '-0.02em',
                  textShadow: `0 1px 2px ${hexToRgba('#ffffff', 0.5)}`,
                }}
              >
                {isFinished ? '✓' : orbCount + orbCountSuffix}
              </span>
            </div>
          </div>

          <p
            className="font-ui text-[12.5px] leading-[1.55] text-center max-w-[28ch]"
            style={{ color: NT.soft }}
          >
            {phaseHint()}
          </p>
        </div>

        {/* Round dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(r => (
            <span
              key={r}
              className="rounded-full transition-all"
              style={{
                width: r === state.round && !isFinished ? 8 : 5,
                height: r === state.round && !isFinished ? 8 : 5,
                background: r <= state.round ? N.amber : hexToRgba(N.amber, 0.18),
                boxShadow: r === state.round && !isFinished ? `0 0 10px ${hexToRgba(N.amber, 0.7)}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-center pt-3">
          {isFinished && onClose ? (
            <button
              onClick={() => { haptics.tap(); onClose(); }}
              className="font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
              style={{
                padding: '13px 28px',
                background: N.amber,
                color: N.void,
                fontSize: 10.5,
                boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              volver
            </button>
          ) : onClose ? (
            <button
              onClick={() => { clearTimers(); haptics.tap(); onClose(); }}
              className="flex items-center gap-1.5 transition-opacity active:opacity-50"
              style={{ color: NT.muted, opacity: 0.6 }}
            >
              <span className="font-mono uppercase tracking-[0.4em] font-[600]" style={{ fontSize: 9 }}>
                interrumpir
              </span>
              <X size={11} strokeWidth={1.8} />
            </button>
          ) : null}
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

function BrandCaption({ N, NT, label }: PaletteProps & { label: string }) {
  return (
    <>
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
        {label}
      </span>
    </>
  );
}

function Stat({
  label,
  value,
  N,
  NT,
}: { label: string; value: string } & PaletteProps) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-headline font-[700] tabular-nums"
        style={{ color: NT.primary, fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.32em] font-[600] mt-1.5"
        style={{ color: NT.muted, fontSize: 8.5 }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider({ N }: { N: PaletteProps['N'] }) {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 26,
        background: hexToRgba(N.amber, 0.18),
      }}
    />
  );
}
