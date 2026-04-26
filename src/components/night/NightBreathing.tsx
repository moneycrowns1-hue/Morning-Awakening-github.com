'use client';

// ═══════════════════════════════════════════════════════
// NightBreathing · 4-7-8 guided breathing overlay for the
// Night Mode screen. Full-screen backdrop, expanding
// breathing circle, phase label. Designed to be calming
// rather than energising — the opposite end of the
// BreathingGuide (Wim Hof) spectrum.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';

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
  inhale: 'INHALA',
  hold:   'RETÉN',
  exhale: 'EXHALA',
  rest:   '',
};

const PHASE_HINT: Record<Phase478, string> = {
  inhale: 'Por la nariz, lento y profundo',
  hold:   'Sin tensión, sostén el aire',
  exhale: 'Por la boca, con un siseo suave',
  rest:   'Prepárate para la siguiente',
};

const TOTAL_CYCLES = 4;

export default function NightBreathing({ onClose }: NightBreathingProps) {
  const [phase, setPhase] = useState<Phase478>('inhale');
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Drive the phase cycle.
    const run = (p: Phase478, c: number) => {
      setPhase(p);
      setCycle(c);
      // Animate the circle.
      const el = circleRef.current;
      if (el) {
        if (p === 'inhale') gsap.to(el, { scale: 1.55, duration: PHASE_DURATIONS.inhale, ease: 'sine.inOut' });
        else if (p === 'hold') gsap.to(el, { scale: 1.55, duration: 0.1 });
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

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.night, 0.94)}, ${hexToRgba(SUNRISE.predawn1, 0.96)})`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-breathing-title"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar respiración"
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0)',
          border: '1px solid rgba(255,250,240,0.12)',
          background: 'rgba(255,250,240,0.04)',
          color: 'var(--sunrise-text-soft)',
        }}
      >
        <X size={18} strokeWidth={1.8} />
      </button>

      <div
        id="night-breathing-title"
        className="font-ui text-[10px] tracking-[0.42em] uppercase mb-4"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        Respiración 4 · 7 · 8
      </div>

      {/* Cycle dots */}
      <div className="flex gap-1.5 mb-10">
        {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: i < cycle ? SUNRISE.rise2 : 'rgba(255,250,240,0.18)',
              boxShadow: i === cycle - 1 && !done ? `0 0 8px ${hexToRgba(SUNRISE.rise2, 0.6)}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center mb-10" style={{ width: 220, height: 220 }}>
        <div
          ref={circleRef}
          className="absolute w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${hexToRgba(SUNRISE.rise2, 0.22)} 0%, ${hexToRgba(SUNRISE.dawn1, 0.1)} 55%, transparent 75%)`,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.35)}`,
            boxShadow: `0 0 40px ${hexToRgba(SUNRISE.rise2, 0.28)}`,
          }}
        >
          <span
            className="font-display italic text-[32px] font-[300]"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {done ? '✓' : phaseCount(phase)}
          </span>
        </div>
      </div>

      <div
        className="font-ui text-[12px] tracking-[0.4em] uppercase mb-1"
        style={{ color: SUNRISE.rise2 }}
      >
        {done ? 'COMPLETO' : PHASE_LABEL[phase]}
      </div>
      <div
        className="font-ui text-[12px] text-center max-w-[24ch]"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {done ? 'Cuatro ciclos completados. Buenas noches.' : PHASE_HINT[phase]}
      </div>

      {done && (
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          className="mt-8 px-6 py-3 rounded-full font-ui text-[12px] tracking-[0.22em] uppercase transition-transform active:scale-[0.97]"
          style={{
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
            background: hexToRgba(SUNRISE.rise2, 0.18),
            color: 'var(--sunrise-text)',
          }}
        >
          Volver al modo noche
        </button>
      )}
    </div>
  );
}

function phaseCount(p: Phase478): string {
  return String(PHASE_DURATIONS[p]).replace('.5', '');
}
