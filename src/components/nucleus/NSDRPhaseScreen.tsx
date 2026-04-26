'use client';

// ═══════════════════════════════════════════════════════════
// NSDRPhaseScreen · 20-min Yoga Nidra mini-phase
//
// Triggered from RECARGA block (or directly from the timeline).
// Visuals:
//   - Theta-state gradient (violet → deep blue).
//   - MoonMascot in slow breath loop (auto 4-7-8) — mirrors the
//     night protocol mascot for tonal continuity.
//   - Big countdown 20:00 → 0:00.
//   - Initial bowl gong + final gong.
//   - "Interrumpir" button. Completing the full timer marks
//     the `nsdr_session` habit; interrupting does NOT.
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft } from 'lucide-react';
import MoonMascot from '../night/MoonMascot';
import { AudioEngine } from '@/lib/common/audioEngine';
import { markHabit } from '@/lib/common/habits';
import { NIGHT, NIGHT_TEXT } from '@/lib/night/nightTheme';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

const NSDR_DURATION_SEC = 20 * 60;

interface NSDRPhaseScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function NSDRPhaseScreen({ onComplete, onCancel }: NSDRPhaseScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(NSDR_DURATION_SEC);
  const [completing, setCompleting] = useState<boolean>(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazy-init audio + ring the opening bowl.
  useEffect(() => {
    const engine = new AudioEngine();
    engine.init();
    void engine.resume();
    audioRef.current = engine;
    // Opening bowl — soft.
    window.setTimeout(() => {
      try { engine.playGong(); } catch { /* ignore */ }
    }, 600);
    return () => {
      try { engine.stopAll(); } catch { /* ignore */ }
    };
  }, []);

  // Entrance fade.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    );
  }, []);

  // Countdown.
  useEffect(() => {
    if (completing) return;
    if (secondsLeft <= 0) {
      // Closing bowl + haptics + mark habit.
      try { audioRef.current?.playGong(); } catch { /* ignore */ }
      haptics.warn();
      markHabit('nsdr_session');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompleting(true);
      window.setTimeout(() => onComplete(), 2400);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, completing, onComplete]);

  const totalRing = 2 * Math.PI * 110;
  const progress = 1 - secondsLeft / NSDR_DURATION_SEC;
  const dashOffset = totalRing * (1 - progress);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        color: NIGHT_TEXT.primary,
        background: `radial-gradient(ellipse at 50% 35%, ${NIGHT.violet_1} 0%, ${NIGHT.abyss} 75%)`,
      }}
    >
      {/* Back button */}
      <button
        onClick={() => { haptics.tick(); onCancel(); }}
        aria-label="Cancelar NSDR"
        className="absolute top-5 left-4 z-20 rounded-full p-2 transition-colors hover:bg-white/5"
        style={{
          color: NIGHT_TEXT.soft,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>

      {/* Header label */}
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
      >
        <div
          className="font-ui text-[10px] uppercase tracking-[0.42em]"
          style={{ color: NIGHT_TEXT.muted }}
        >
          NSDR · Yoga Nidra
        </div>
        <div
          className="mt-1 font-display italic font-[400] text-[18px]"
          style={{ color: NIGHT_TEXT.primary }}
        >
          Theta · 20 min
        </div>
      </div>

      {/* Mascot + ring */}
      <div className="relative flex items-center justify-center">
        <svg width={260} height={260} viewBox="0 0 260 260" className="absolute inset-0">
          <defs>
            <linearGradient id="nsdr-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={NIGHT.moon_halo} />
              <stop offset="100%" stopColor={NIGHT.dusk_rose} />
            </linearGradient>
          </defs>
          <circle
            cx={130}
            cy={130}
            r={110}
            fill="none"
            stroke={hexToRgba(NIGHT.moon_core, 0.12)}
            strokeWidth={2}
          />
          <circle
            cx={130}
            cy={130}
            r={110}
            fill="none"
            stroke="url(#nsdr-ring)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={totalRing}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 130 130)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <MoonMascot size={160} breathing blinking floating />
      </div>

      {/* Countdown */}
      <div className="mt-8 font-mono text-[44px] tracking-[-0.02em]" style={{ color: NIGHT_TEXT.primary }}>
        {formatTimer(secondsLeft)}
      </div>

      <p
        className="mt-3 font-ui text-[12.5px] leading-[1.55] text-center max-w-[28ch] px-6"
        style={{ color: NIGHT_TEXT.soft }}
      >
        {completing
          ? 'Vuelve despacio. Estiramiento suave. El día sigue, ya con la mente reseteada.'
          : 'Acuéstate boca arriba. Audífonos puestos. Deja que llegue.'}
      </p>

      {/* Cancel button */}
      {!completing && (
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              const ok = window.confirm('¿Interrumpir NSDR? El hábito de hoy no se marcará.');
              if (!ok) return;
            }
            haptics.warn();
            onCancel();
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5"
          style={{
            background: hexToRgba(NIGHT.violet_2, 0.6),
            border: `1px solid ${hexToRgba(NIGHT.moon_core, 0.25)}`,
            color: NIGHT_TEXT.soft,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)',
          }}
        >
          <span className="font-ui text-[11px] tracking-[0.3em] uppercase">
            Interrumpir
          </span>
        </button>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
