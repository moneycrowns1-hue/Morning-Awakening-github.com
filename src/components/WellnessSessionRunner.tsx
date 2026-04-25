'use client';

// ═══════════════════════════════════════════════════════════
// WellnessSessionRunner · runner compartido por los 3 modos
// del Hub Bienestar (Bruxismo, Meditación profunda, Drenaje
// linfático). Renderiza:
//   - Header con título + paso actual.
//   - Countdown ring por paso (no por sesión total).
//   - Animación de pulso sincronizada con el `cue` del paso.
//   - Lista de pasos con tick verde para completados.
//   - Botón "Saltar paso" + "Interrumpir sesión".
// Al completar todos los pasos: gong + markHabit(habitId).
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft, SkipForward } from 'lucide-react';
import { AudioEngine } from '@/lib/audioEngine';
import { markHabit } from '@/lib/habits';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import type { WellnessRoutine, WellnessStep, WellnessCue } from '@/lib/wellnessRoutines';

interface WellnessSessionRunnerProps {
  routine: WellnessRoutine;
  onComplete: () => void;
  onCancel: () => void;
}

export default function WellnessSessionRunner({ routine, onComplete, onCancel }: WellnessSessionRunnerProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => routine.steps[0]?.durationSec ?? 0);
  const [completing, setCompleting] = useState(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);

  const step: WellnessStep | undefined = routine.steps[stepIdx];

  // Audio init + opening bowl.
  useEffect(() => {
    const engine = new AudioEngine();
    engine.init();
    void engine.resume();
    audioRef.current = engine;
    window.setTimeout(() => {
      try { engine.playGong(); } catch { /* ignore */ }
    }, 500);
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
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
    );
  }, []);

  // Drive the pulse animation based on the current step's cue.
  useEffect(() => {
    if (!pulseRef.current || !step) return;
    const el = pulseRef.current;
    gsap.killTweensOf(el);
    const cue = step.cue ?? 'rest';
    runCueAnimation(el, cue);
  }, [step]);

  // Countdown.
  useEffect(() => {
    if (completing || !step) return;
    if (secondsLeft <= 0) {
      // Step finished. Advance or complete the routine.
      const nextIdx = stepIdx + 1;
      if (nextIdx >= routine.steps.length) {
        try { audioRef.current?.playGong(); } catch { /* ignore */ }
        haptics.warn();
        try { markHabit(routine.habitId); } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompleting(true);
        window.setTimeout(() => onComplete(), 2200);
        return;
      }
      try { audioRef.current?.playChime(); } catch { /* ignore */ }
      haptics.tick();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIdx(nextIdx);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecondsLeft(routine.steps[nextIdx].durationSec);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, stepIdx, completing, routine, onComplete]);

  const handleSkipStep = () => {
    if (!step || completing) return;
    haptics.tap();
    setSecondsLeft(0); // Triggers the effect above and advances.
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined' && !completing) {
      const ok = window.confirm('¿Interrumpir la sesión? El hábito de hoy no se marcará.');
      if (!ok) return;
    }
    haptics.warn();
    onCancel();
  };

  const totalRing = 2 * Math.PI * 110;
  const stepDuration = step?.durationSec ?? 1;
  const progress = step ? 1 - secondsLeft / stepDuration : 1;
  const dashOffset = totalRing * (1 - progress);

  return (
    <div
      ref={containerRef}
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
          onClick={handleCancel}
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
            {routine.kicker}
          </span>
          <span
            className="font-display italic font-[400] text-[18px] leading-tight truncate"
            style={{ color: NIGHT_TEXT.primary }}
          >
            {routine.title}
          </span>
        </div>
        <span
          className="font-mono text-[11px] tabular-nums tracking-wider px-2.5 py-1 rounded-full"
          style={{
            background: hexToRgba(NIGHT.violet_2, 0.5),
            border: `1px solid ${hexToRgba(NIGHT.moon_core, 0.18)}`,
            color: NIGHT_TEXT.soft,
          }}
        >
          {Math.min(stepIdx + 1, routine.steps.length)} / {routine.steps.length}
        </span>
      </div>

      {/* Body (scroll) */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 flex flex-col items-center px-5 pb-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        {/* Pulse ring */}
        <div className="relative flex items-center justify-center mt-4 mb-4" style={{ width: 260, height: 260 }}>
          <svg width={260} height={260} viewBox="0 0 260 260" className="absolute inset-0">
            <defs>
              <linearGradient id="wellness-ring" x1="0" y1="0" x2="1" y2="1">
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
              stroke="url(#wellness-ring)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={totalRing}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div
            ref={pulseRef}
            className="w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${hexToRgba(NIGHT.moon_halo, 0.22)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.1)} 55%, transparent 80%)`,
              border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.4)}`,
              boxShadow: `0 0 40px ${hexToRgba(NIGHT.moon_halo, 0.25)}`,
            }}
          >
            <span
              className="font-display italic text-[34px] font-[300] tabular-nums"
              style={{ color: NIGHT_TEXT.primary }}
            >
              {completing ? '✓' : formatTimer(secondsLeft)}
            </span>
          </div>
        </div>

        {/* Current step block */}
        {step && !completing && (
          <div className="text-center max-w-[36ch] px-4">
            <div
              className="font-ui text-[10px] tracking-[0.36em] uppercase mb-2"
              style={{ color: NIGHT.moon_halo }}
            >
              {cueLabel(step.cue)}
            </div>
            <div
              className="font-display italic font-[400] text-[22px] leading-tight mb-2"
              style={{ color: NIGHT_TEXT.primary }}
            >
              {step.label}
            </div>
            <p
              className="font-ui text-[13px] leading-[1.55]"
              style={{ color: NIGHT_TEXT.soft }}
            >
              {step.description}
            </p>
            {step.tip && (
              <p
                className="mt-3 font-ui text-[11px] leading-[1.5] italic"
                style={{ color: NIGHT_TEXT.muted }}
              >
                {step.tip}
              </p>
            )}
          </div>
        )}

        {completing && (
          <div className="text-center max-w-[32ch] px-4">
            <div
              className="font-display italic font-[400] text-[22px] mb-2"
              style={{ color: NIGHT_TEXT.primary }}
            >
              Sesión completa.
            </div>
            <p
              className="font-ui text-[13px] leading-[1.55]"
              style={{ color: NIGHT_TEXT.soft }}
            >
              Hábito de hoy registrado. Vuelve cuando lo necesites.
            </p>
          </div>
        )}

        {/* Step pip-list */}
        <div className="mt-6 w-full max-w-md">
          <ul className="flex flex-col gap-1.5">
            {routine.steps.map((s, i) => {
              const done = i < stepIdx || (i === stepIdx && completing);
              const active = i === stepIdx && !completing;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{
                    background: active
                      ? hexToRgba(NIGHT.moon_halo, 0.1)
                      : 'transparent',
                    border: `1px solid ${active ? hexToRgba(NIGHT.moon_halo, 0.3) : 'transparent'}`,
                  }}
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px]"
                    style={{
                      background: done
                        ? hexToRgba(NIGHT.moon_halo, 0.5)
                        : active
                        ? hexToRgba(NIGHT.moon_halo, 0.2)
                        : hexToRgba(NIGHT.violet_2, 0.4),
                      color: done ? NIGHT.abyss : NIGHT_TEXT.soft,
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span
                    className="font-ui text-[12px] truncate flex-1"
                    style={{
                      color: active ? NIGHT_TEXT.primary : done ? NIGHT_TEXT.muted : NIGHT_TEXT.soft,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="font-mono text-[10px] tabular-nums shrink-0"
                    style={{ color: NIGHT_TEXT.muted }}
                  >
                    {Math.round(s.durationSec / 60) > 0
                      ? `${Math.round(s.durationSec / 60)}m`
                      : `${s.durationSec}s`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Skip step button */}
      {!completing && step && (
        <div
          className="relative z-10 px-5 pb-5 flex justify-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <button
            onClick={handleSkipStep}
            className="rounded-full px-4 py-2.5 flex items-center gap-2 transition-transform active:scale-[0.97]"
            style={{
              background: hexToRgba(NIGHT.violet_2, 0.5),
              border: `1px solid ${hexToRgba(NIGHT.moon_core, 0.22)}`,
              color: NIGHT_TEXT.soft,
            }}
          >
            <SkipForward size={14} strokeWidth={1.8} />
            <span className="font-ui text-[11px] tracking-[0.28em] uppercase">
              Saltar paso
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function cueLabel(cue: WellnessCue | undefined): string {
  switch (cue) {
    case 'inhale':   return 'Inhala · mantén · exhala';
    case 'exhale':   return 'Exhalación larga';
    case 'hold':     return 'Retén';
    case 'massage':  return 'Masaje';
    case 'stretch':  return 'Deslizamiento';
    case 'tap':      return 'Toques ligeros';
    case 'rest':
    default:         return 'Práctica';
  }
}

function runCueAnimation(el: HTMLDivElement, cue: WellnessCue): void {
  switch (cue) {
    case 'inhale':
      gsap.to(el, { scale: 1.18, duration: 4, ease: 'sine.inOut', repeat: -1, yoyo: true });
      break;
    case 'exhale':
      gsap.to(el, { scale: 0.9, duration: 6, ease: 'sine.inOut', repeat: -1, yoyo: true });
      break;
    case 'hold':
      gsap.to(el, { scale: 1.05, duration: 0.4, ease: 'power2.out' });
      break;
    case 'massage':
      gsap.to(el, { rotation: 8, duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true });
      break;
    case 'stretch':
      gsap.to(el, { scaleY: 1.08, scaleX: 0.95, duration: 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true });
      break;
    case 'tap':
      gsap.to(el, { scale: 1.04, duration: 0.35, ease: 'power2.out', repeat: -1, yoyo: true });
      break;
    case 'rest':
    default:
      gsap.to(el, { scale: 1.04, duration: 3.5, ease: 'sine.inOut', repeat: -1, yoyo: true });
      break;
  }
}
