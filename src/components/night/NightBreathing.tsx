'use client';

// ═══════════════════════════════════════════════════════════
// NightBreathing · 4-7-8 guided breathing overlay (calmante).
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio dot ámbar + caption "wellness · 4-7-8".
//   - Hero title lowercase + punto ámbar.
//   - Orb ámbar central con breath face expresiva (sonriendo
//     al inhalar, mejillas infladas al sostener, "O" al exhalar).
//   - Cycle dots tabular debajo + phase hint.
//   - Footer V5 hairline · cerrar.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { haptics } from '@/lib/common/haptics';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';

interface NightBreathingProps {
  onClose: () => void;
}

type Phase478 = 'inhale' | 'hold' | 'exhale' | 'rest';

const PHASE_DURATIONS: Record<Phase478, number> = {
  inhale: 4,
  hold:   7,
  exhale: 8,
  rest:   1.5,
};

const PHASE_LABEL: Record<Phase478, string> = {
  inhale: 'inhala',
  hold:   'sostén',
  exhale: 'exhala',
  rest:   'pausa',
};

const PHASE_HINT: Record<Phase478, string> = {
  inhale: 'Por la nariz, lento y profundo',
  hold:   'Sin tensión, retén el aire',
  exhale: 'Por la boca, con un siseo suave',
  rest:   'Prepárate para la siguiente',
};

const TOTAL_CYCLES = 4;

export default function NightBreathing({ onClose }: NightBreathingProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const [phase, setPhase] = useState<Phase478>('inhale');
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const run = (p: Phase478, c: number) => {
      setPhase(p);
      setCycle(c);
      const el = orbRef.current;
      if (el) {
        if (p === 'inhale') gsap.to(el, { scale: 1.18, duration: PHASE_DURATIONS.inhale, ease: 'sine.inOut' });
        else if (p === 'hold') gsap.to(el, { scale: 1.18, duration: 0.1 });
        else if (p === 'exhale') gsap.to(el, { scale: 0.82, duration: PHASE_DURATIONS.exhale, ease: 'sine.inOut' });
        else gsap.to(el, { scale: 1, duration: PHASE_DURATIONS.rest, ease: 'sine.inOut' });
      }

      const dur = PHASE_DURATIONS[p] * 1000;
      timeoutRef.current = window.setTimeout(() => {
        if (p === 'inhale') run('hold', c);
        else if (p === 'hold') run('exhale', c);
        else if (p === 'exhale') {
          if (c >= TOTAL_CYCLES) {
            setDone(true);
            haptics.tap();
          } else run('rest', c);
        } else run('inhale', c + 1);
      }, dur);
    };

    run('inhale', 1);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const globalProgress = done
    ? 1
    : Math.min(1, ((cycle - 1) + (phase === 'exhale' ? 1 : phase === 'hold' ? 0.66 : phase === 'inhale' ? 0.33 : 0)) / TOTAL_CYCLES);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden"
      style={{
        background: N.void,
        color: NT.primary,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-breathing-title"
    >
      {/* ─── Header · MASTHEAD editorial ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        {/* Top folio · close + brand mono · cycle indicator */}
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Cerrar respiración"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: NT.muted }}
          >
            <X size={14} strokeWidth={2.2} />
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
              id="night-breathing-title"
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              wellness · 4-7-8
            </span>
          </button>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(Math.min(cycle, TOTAL_CYCLES)).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            {String(TOTAL_CYCLES).padStart(2, '0')}
          </span>
        </div>
        {/* Hairline progress · global cycle progress */}
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

      {/* ─── Body · hero + orb ────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6">
        {/* Top corners */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{
              color: NT.primary,
              fontSize: 13,
              letterSpacing: '0.02em',
            }}
          >
            {String(cycle).padStart(2, '0')}
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · respiración cuadrada ·
          </span>
        </div>

        {/* Center hero · title + orb */}
        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2.2rem, 8vw, 3.2rem)',
              lineHeight: 0.95,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
              textWrap: 'balance' as never,
              maxWidth: '14ch',
            }}
          >
            {(done ? 'completo' : PHASE_LABEL[phase]).toLowerCase()}
            <span style={{ color: N.amber }}>.</span>
          </h1>

          {/* Orb central con face expresiva */}
          <div className="relative" style={{ width: 160, height: 160 }}>
            {/* Halo blur */}
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: -28,
                background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.4)} 0%, transparent 70%)`,
                filter: 'blur(20px)',
                opacity: done ? 0.5 : 0.95,
                transition: 'opacity 1s ease-in-out',
              }}
            />
            {/* Orb con face */}
            <div
              ref={orbRef}
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
                boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 44px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              <BreathFace phase={done ? 'rest' : phase} ink={N.void} accent={N.candle} />
            </div>
          </div>

          {/* Phase number + hint */}
          <div className="text-center">
            <div
              className="font-headline font-[600] uppercase tabular-nums tracking-[-0.015em]"
              style={{ color: NT.primary, fontSize: 22, lineHeight: 1 }}
            >
              {done ? '✓' : phaseCount(phase) + 's'}
            </div>
            <p
              className="mt-2 font-ui text-[12.5px] leading-[1.55] max-w-[28ch] mx-auto"
              style={{ color: NT.soft }}
            >
              {done ? 'Cuatro ciclos completados. Buenas noches.' : PHASE_HINT[phase]}
            </p>
          </div>
        </div>

        {/* Cycle dots */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === cycle - 1 && !done ? 8 : 5,
                height: i === cycle - 1 && !done ? 8 : 5,
                background: i < cycle ? N.amber : hexToRgba(N.amber, 0.18),
                boxShadow: i === cycle - 1 && !done ? `0 0 10px ${hexToRgba(N.amber, 0.7)}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── Footer · CTA o whisper ─────────────────── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-center pt-3">
          {done ? (
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
          ) : (
            <button
              onClick={() => { haptics.tap(); onClose(); }}
              className="flex items-center gap-1.5 transition-opacity active:opacity-50"
              style={{ color: NT.muted, opacity: 0.6 }}
            >
              <span className="font-mono uppercase tracking-[0.4em] font-[600]" style={{ fontSize: 9 }}>
                interrumpir
              </span>
              <X size={11} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function phaseCount(p: Phase478): string {
  return String(PHASE_DURATIONS[p]).replace('.5', '');
}

// ─── BreathFace · cara expresiva sobre el orb 4-7-8 ─────────────
// (réplica del componente de NightMissionPhase para consistencia)
function BreathFace({
  phase,
  ink,
  accent,
}: {
  phase: Phase478;
  ink: string;
  accent: string;
}) {
  const eyeY = 42;
  const mouthY = 65;

  let leftEye: React.ReactNode;
  let rightEye: React.ReactNode;
  let mouth: React.ReactNode;
  let cheekOpacity = 0;

  if (phase === 'inhale') {
    leftEye = <path d={`M 32 ${eyeY + 2} Q 38 ${eyeY - 3} 44 ${eyeY + 2}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    rightEye = <path d={`M 56 ${eyeY + 2} Q 62 ${eyeY - 3} 68 ${eyeY + 2}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    mouth = <path d={`M 40 ${mouthY} Q 50 ${mouthY + 8} 60 ${mouthY}`} stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />;
    cheekOpacity = 0.35;
  } else if (phase === 'hold') {
    leftEye = <line x1="32" y1={eyeY + 1} x2="44" y2={eyeY + 1} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />;
    rightEye = <line x1="56" y1={eyeY + 1} x2="68" y2={eyeY + 1} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />;
    mouth = <line x1="46" y1={mouthY + 4} x2="54" y2={mouthY + 4} stroke={ink} strokeWidth="2.6" strokeLinecap="round" />;
    cheekOpacity = 0.7;
  } else if (phase === 'exhale') {
    leftEye = <path d={`M 32 ${eyeY} Q 38 ${eyeY + 3} 44 ${eyeY}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    rightEye = <path d={`M 56 ${eyeY} Q 62 ${eyeY + 3} 68 ${eyeY}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    mouth = <ellipse cx="50" cy={mouthY + 5} rx="4.5" ry="6" fill="none" stroke={ink} strokeWidth="2.4" />;
    cheekOpacity = 0.2;
  } else {
    leftEye = <path d={`M 32 ${eyeY + 1} Q 38 ${eyeY - 1} 44 ${eyeY + 1}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />;
    rightEye = <path d={`M 56 ${eyeY + 1} Q 62 ${eyeY - 1} 68 ${eyeY + 1}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />;
    mouth = <path d={`M 42 ${mouthY + 2} Q 50 ${mouthY + 6} 58 ${mouthY + 2}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />;
    cheekOpacity = 0.25;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <ellipse cx="26" cy="58" rx="6" ry="3.5" fill={accent} opacity={cheekOpacity} />
      <ellipse cx="74" cy="58" rx="6" ry="3.5" fill={accent} opacity={cheekOpacity} />
      <g key={phase} style={{ animation: 'maBreathFaceFade 500ms ease-out' }}>
        {leftEye}
        {rightEye}
        {mouth}
      </g>
    </svg>
  );
}
