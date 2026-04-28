'use client';

// ═══════════════════════════════════════════════════════════
// NSDRPhaseScreen · 20-min Yoga Nidra mini-phase
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio dot ámbar + caption "wellness · NSDR".
//   - Hairline progress bar 1px (countdown 20:00 → 0:00).
//   - Hero title "theta" lowercase + punto ámbar.
//   - Orb central ámbar con countdown grande + halo.
//   - Description whisper editorial + tip mono.
//   - Footer V5 · interrumpir hairline.
// Paleta · useNightPalette() para vivir en sync con global.
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft, X } from 'lucide-react';
import { AudioEngine } from '@/lib/common/audioEngine';
import { markHabit } from '@/lib/common/habits';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

const NSDR_DURATION_SEC = 20 * 60;

interface NSDRPhaseScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function NSDRPhaseScreen({ onComplete, onCancel }: NSDRPhaseScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const [secondsLeft, setSecondsLeft] = useState<number>(NSDR_DURATION_SEC);
  const [completing, setCompleting] = useState<boolean>(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);

  // Lazy-init audio + opening bowl.
  useEffect(() => {
    const engine = new AudioEngine();
    engine.init();
    void engine.resume();
    audioRef.current = engine;
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

  // Slow breath pulse on the orb · 4-7-8 inspired (gentle 8s cycle).
  useEffect(() => {
    if (!orbRef.current) return;
    const el = orbRef.current;
    gsap.to(el, {
      scale: 1.06,
      duration: 4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
    return () => { gsap.killTweensOf(el); };
  }, []);

  // Countdown.
  useEffect(() => {
    if (completing) return;
    if (secondsLeft <= 0) {
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

  const handleCancel = () => {
    if (typeof window !== 'undefined' && !completing) {
      const ok = window.confirm('¿Interrumpir NSDR? El hábito de hoy no se marcará.');
      if (!ok) return;
    }
    haptics.warn();
    onCancel();
  };

  const progress = completing ? 1 : 1 - secondsLeft / NSDR_DURATION_SEC;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* ─── Header · MASTHEAD editorial ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onCancel(); }}
            aria-label="Cancelar NSDR"
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
              wellness · NSDR
            </span>
          </button>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            20m
          </span>
        </div>
        {/* Hairline progress · countdown */}
        <div className="relative h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${progress * 100}%`,
              background: N.amber,
              boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.5)}`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6">
        {/* Top corners */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            θ
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · yoga nidra ·
          </span>
        </div>

        {/* Center hero · title + orb + description */}
        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2.4rem, 9vw, 3.6rem)',
              lineHeight: 0.95,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
              maxWidth: '14ch',
            }}
          >
            {(completing ? 'completo' : 'theta').toLowerCase()}
            <span style={{ color: N.amber }}>.</span>
          </h1>

          {/* Orb central con countdown grande */}
          <div className="relative" style={{ width: 200, height: 200 }}>
            {/* Halo blur exterior */}
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: -32,
                background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.36)} 0%, transparent 70%)`,
                filter: 'blur(22px)',
                opacity: completing ? 0.5 : 0.85,
                transition: 'opacity 1s ease-in-out',
              }}
            />
            {/* Orb sólido con countdown adentro */}
            <div
              ref={orbRef}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
                boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 50px ${hexToRgba(N.amber, 0.45)}`,
              }}
            >
              <span
                className="font-headline font-[700] tabular-nums"
                style={{
                  color: N.void,
                  fontSize: completing ? 56 : 42,
                  letterSpacing: '-0.02em',
                  textShadow: `0 1px 2px ${hexToRgba('#ffffff', 0.5)}`,
                }}
              >
                {completing ? '✓' : formatTimer(secondsLeft)}
              </span>
            </div>
          </div>

          {/* Description whisper */}
          <div className="text-center max-w-[32ch]">
            <p
              className="font-ui text-[12.5px] leading-[1.55]"
              style={{ color: NT.soft }}
            >
              {completing
                ? 'Vuelve despacio. Estiramiento suave. El día sigue, ya con la mente reseteada.'
                : 'Acuéstate boca arriba. Audífonos puestos. Deja que llegue.'}
            </p>
            {!completing && (
              <p
                className="mt-2 font-mono uppercase tracking-[0.28em] font-[500]"
                style={{ color: hexToRgba(N.amber, 0.75), fontSize: 9 }}
              >
                · ondas theta · 20 min ·
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer · interrumpir whisper ─────────────────── */}
      {!completing && (
        <div
          className="relative z-10 px-6 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <div className="flex items-center justify-center pt-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 transition-opacity active:opacity-50"
              style={{ color: NT.muted, opacity: 0.6 }}
            >
              <span className="font-mono uppercase tracking-[0.4em] font-[600]" style={{ fontSize: 9 }}>
                interrumpir
              </span>
              <X size={11} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
