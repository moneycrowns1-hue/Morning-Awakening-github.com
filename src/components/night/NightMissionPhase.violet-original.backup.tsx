'use client';

// ═══════════════════════════════════════════════════════════
// NightMissionPhase · night-protocol phase player
//
// Symmetric to MissionPhaseV8 but for the Night Conquest
// Protocol. Uses the night palette (violet → rose) and
// routes interaction-type phases to their overlay:
//   - 'breath'  → inline breath guide using MoonMascot + phase
//   - 'journal' → NightJournal overlay (reused from v1)
//   - 'read'    → simple reading timer with "terminé" button
//   - 'lock'    → skips directly; parent transitions to SLUMBER
//
// Voice briefings are spoken via the morning Operator (Qwen/Edge
// TTS pipeline) at a slower rate (0.86) to match the intimate
// nocturnal tone.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Pause, Play, SkipForward, Plus, ChevronDown, BookOpen, Check } from 'lucide-react';
import { formatTime } from '@/lib/genesis/constants';
import type { NightMission } from '@/lib/night/nightConstants';
import { NIGHT_MISSIONS } from '@/lib/night/nightConstants';
import type { Operator } from '@/lib/genesis/operator';
import GradientBackground from '../common/GradientBackground';
import TimerRing from '../common/TimerRing';
import MoonMascot, { type BreathPhase } from './MoonMascot';
import NightJournal from './NightJournal';
import { useMissionTimer } from '@/hooks/useMissionTimer';
import { haptics } from '@/lib/common/haptics';
import { getNightStageColors, NIGHT, NIGHT_TEXT } from '@/lib/night/nightTheme';
import { hexToRgba } from '@/lib/common/theme';

interface NightMissionPhaseProps {
  mission: NightMission;
  /** Effective duration for the current mode (full vs express). */
  durationSec: number;
  /** Total number of phases in the selected mode (for header "N / T"). */
  totalPhases: number;
  /** 1-indexed position within the selected mode. */
  phaseIndex: number;
  onComplete: () => void;
  operator?: Operator | null;
  onStrike?: () => void;
  onSkipPhase?: () => void;
}

export default function NightMissionPhase({
  mission,
  durationSec,
  totalPhases,
  phaseIndex,
  onComplete,
  operator,
  onStrike,
  onSkipPhase,
}: NightMissionPhaseProps) {
  // Find the global stage index (0..7) from NIGHT_MISSIONS.
  const globalIdx = useMemo(() => {
    const i = NIGHT_MISSIONS.findIndex((m) => m.id === mission.id);
    return i < 0 ? 0 : i;
  }, [mission.id]);
  const stageColors = useMemo(() => getNightStageColors(globalIdx), [globalIdx]);

  // For 'lock' interaction, skip straight through — parent renders lock.
  const isLockPhase = mission.interaction === 'lock';
  const hasTimer = durationSec > 0 && !isLockPhase;

  const [started, setStarted] = useState<boolean>(!hasTimer);
  const [showScience, setShowScience] = useState(false);
  const [showCompletado, setShowCompletado] = useState(false);
  const [showJournalOverlay, setShowJournalOverlay] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('rest');
  const [breathCycle, setBreathCycle] = useState(0);

  const completadoRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef(false);

  // Timer. For 'lock' (duration 0) we auto-complete at once.
  const timer = useMissionTimer({
    duration: durationSec,
    autoStart: started && hasTimer,
    onExpire: () => {
      window.setTimeout(() => setShowCompletado(true), 200);
    },
  });

  useEffect(() => {
    if (started && hasTimer && !timer.isRunning && !timer.expired && !timer.isPaused) {
      timer.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Lock phase: skip to completion immediately.
  useEffect(() => {
    if (isLockPhase) {
      // Speak the slumber line if operator is available, then complete
      // so the parent transitions to the SLUMBER LOCK.
      if (operator && !spokenRef.current) {
        spokenRef.current = true;
        operator.speak(mission.voiceLineBriefing, { rate: 0.86 });
      }
      const t = window.setTimeout(() => onComplete(), 400);
      return () => window.clearTimeout(t);
    }
  }, [isLockPhase, mission, operator, onComplete]);

  // Voice briefing (once per phase mount).
  useEffect(() => {
    if (!operator || spokenRef.current || isLockPhase) return;
    spokenRef.current = true;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      await operator.waitForPendingSpeech();
      if (cancelled) return;
      operator.speak(mission.voiceLineBriefing, { rate: 0.86 });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mission, operator, isLockPhase]);

  // Completion overlay animation.
  useEffect(() => {
    if (!showCompletado) return;
    operator?.cancel();
    haptics.success();
    const node = completadoRef.current;
    if (!node) {
      const t = window.setTimeout(onComplete, 400);
      return () => window.clearTimeout(t);
    }
    const tl = gsap.timeline();
    tl.fromTo(node, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    tl.to(node, { opacity: 0, duration: 0.5, delay: 1.0, ease: 'power1.in' });
    tl.call(() => onComplete());
    return () => { tl.kill(); };
  }, [showCompletado, onComplete, operator]);

  // ── Breath orchestrator (4-7-8 × 4 cycles) for interaction='breath'.
  useEffect(() => {
    if (mission.interaction !== 'breath') return;
    if (!started) return;
    let alive = true;
    let cycle = 0;
    const run = async () => {
      while (alive && cycle < 4) {
        setBreathCycle(cycle + 1);
        setBreathPhase('inhale'); await sleep(4000);
        if (!alive) return;
        setBreathPhase('hold');   await sleep(7000);
        if (!alive) return;
        setBreathPhase('exhale'); await sleep(8000);
        if (!alive) return;
        cycle += 1;
      }
      if (alive) {
        setBreathPhase('rest');
        // Mark habit could go here; let the timer finish naturally too.
      }
    };
    run();
    return () => { alive = false; };
  }, [mission.interaction, started]);

  // Controls
  const handleStart = useCallback(() => {
    haptics.tick();
    onStrike?.();
    setStarted(true);
    if (mission.interaction === 'journal') setShowJournalOverlay(true);
  }, [mission.interaction, onStrike]);

  const handlePauseResume = useCallback(() => {
    haptics.tap();
    if (timer.isRunning) timer.pause();
    else if (timer.isPaused) timer.resume();
    else timer.start();
  }, [timer]);

  const handleAddMinute = useCallback(() => {
    haptics.tick();
    timer.addMinute();
  }, [timer]);

  const handleSkip = useCallback(() => {
    haptics.warn();
    onSkipPhase?.();
    setShowCompletado(true);
  }, [onSkipPhase]);

  const handleManualComplete = useCallback(() => {
    haptics.success();
    onStrike?.();
    setShowCompletado(true);
  }, [onStrike]);

  const globalProgress = ((phaseIndex - 1) + timer.progress) / totalPhases;

  if (isLockPhase) {
    // Minimal "transicionando a Slumber..." splash while the parent
    // swaps in the lock screen.
    return (
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ background: NIGHT.abyss, color: NIGHT_TEXT.soft }}
      >
        <div className="text-center">
          <MoonMascot size={140} breathing floating blinking />
          <div className="mt-6 font-ui text-[11px] uppercase tracking-[0.4em]">
            Entrando a la noche...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{ color: NIGHT_TEXT.primary }}
    >
      <GradientBackground stage={globalIdx} colors={stageColors} particleCount={35} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, transparent 0%, rgba(10,6,20,0.25) 70%, rgba(10,6,20,0.65) 100%)',
        }}
      />

      {/* COMPLETADO overlay */}
      {showCompletado && (
        <div
          ref={completadoRef}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10,6,20,0.9) 0%, rgba(10,6,20,0.7) 70%, rgba(10,6,20,0.4) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            opacity: 0,
          }}
        >
          <div className="text-center select-none">
            <div
              className="font-headline font-[600] text-4xl md:text-5xl leading-[0.95] lowercase tracking-[-0.025em]"
              style={{
                color: NIGHT_TEXT.primary,
                textShadow: `0 0 28px ${hexToRgba(NIGHT.moon_core, 0.55)}`,
              }}
            >
              completado
            </div>
            <div
              className="mt-5 font-ui text-[11px] uppercase tracking-[0.32em]"
              style={{ color: NIGHT_TEXT.soft }}
            >
              {mission.completionLog}
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div
        className="relative z-10 px-5 pt-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.2em]" style={{ color: NIGHT_TEXT.muted }}>
              FASE {String(phaseIndex).padStart(2, '0')} / {totalPhases}
            </span>
            <span className="font-ui text-[11px] uppercase tracking-[0.3em]" style={{ color: NIGHT_TEXT.soft }}>
              {mission.codename}
            </span>
          </div>
          <span
            className="font-mono text-[18px] tabular-nums opacity-60"
            style={{ color: NIGHT_TEXT.muted }}
          >
            {mission.kanji}
          </span>
        </div>

        <div className="mt-3 h-[2px] rounded-full overflow-hidden" style={{ background: NIGHT_TEXT.divider }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, globalProgress * 100))}%`,
              background: `linear-gradient(90deg, ${hexToRgba(stageColors.accent, 0.55)}, ${stageColors.accent})`,
              boxShadow: `0 0 10px ${hexToRgba(stageColors.accent, 0.5)}`,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ─── Body ─── */}
      <div
        className="scroll-area flex-1 w-full max-w-md mx-auto flex flex-col items-center gap-y-8 relative z-10 min-h-0 px-6"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-full flex flex-col items-center text-center mt-2">
          <h1
            className="font-headline font-[600] leading-[0.98] lowercase tracking-[-0.025em] text-[clamp(1.9rem,7.5vw,2.6rem)]"
            style={{ color: NIGHT_TEXT.primary }}
          >
            {mission.title.toLowerCase()}
          </h1>
          <div className="mt-2 font-ui text-[10px] uppercase tracking-[0.35em]" style={{ color: NIGHT_TEXT.muted }}>
            {mission.blockLabel}
          </div>
          <div className="mt-1 font-ui text-[10px] italic opacity-75" style={{ color: NIGHT_TEXT.muted }}>
            {mission.kanjiReading}
          </div>
        </div>

        {/* Hero: breath (mascot) OR timer ring */}
        {mission.interaction === 'breath' && started ? (
          <div className="flex flex-col items-center">
            <MoonMascot size={240} phase={breathPhase} blinking={false} floating={false} />
            <div className="mt-4 font-ui text-[13px] uppercase tracking-[0.4em]" style={{ color: NIGHT_TEXT.primary }}>
              {breathPhase === 'inhale' ? 'Inhala · 4' :
               breathPhase === 'hold'   ? 'Sostén · 7' :
               breathPhase === 'exhale' ? 'Exhala · 8' :
                                          'Respira libre'}
            </div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: n <= breathCycle ? NIGHT.moon_halo : NIGHT_TEXT.divider,
                    boxShadow: n === breathCycle ? `0 0 8px ${hexToRgba(NIGHT.moon_core, 0.8)}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        ) : hasTimer ? (
          <div className="flex flex-col items-center gap-5">
            <TimerRing
              progress={timer.progress}
              label={formatTime(timer.remaining)}
              caption={timer.isPaused ? 'EN PAUSA' : started ? 'RESTANTE' : 'LISTO'}
              stage={0}
              size={220}
              paused={timer.isPaused}
              onCentreClick={started ? handlePauseResume : undefined}
            />

            {!started ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2.5 rounded-full transition-transform active:scale-[0.97]"
                style={{
                  padding: '14px 32px',
                  background: `linear-gradient(180deg, ${hexToRgba(stageColors.accent, 0.22)} 0%, ${hexToRgba(stageColors.accent, 0.45)} 100%)`,
                  border: `1px solid ${hexToRgba(stageColors.accent, 0.55)}`,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                <Play size={16} strokeWidth={2} fill="currentColor" style={{ color: NIGHT_TEXT.primary }} />
                <span
                  className="font-ui font-[500] text-[13px] tracking-[0.32em] uppercase"
                  style={{ color: NIGHT_TEXT.primary }}
                >
                  {mission.interaction === 'read' ? 'Empezar lectura' :
                   mission.interaction === 'journal' ? 'Abrir diario' :
                                                       'Iniciar'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-5">
                <ControlButton onClick={handlePauseResume} accent={stageColors.accent} label={timer.isRunning ? 'Pausar' : 'Reanudar'}>
                  {timer.isRunning ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} fill="currentColor" />}
                </ControlButton>
                <ControlButton onClick={handleAddMinute} accent={stageColors.accent} label="+ 1 min">
                  <Plus size={16} strokeWidth={2} />
                </ControlButton>
                {mission.interaction === 'read' ? (
                  <ControlButton onClick={handleManualComplete} accent={stageColors.accent} label="Terminé">
                    <BookOpen size={16} strokeWidth={2} />
                  </ControlButton>
                ) : (
                  <ControlButton onClick={handleManualComplete} accent={stageColors.accent} label="Hecho">
                    <Check size={16} strokeWidth={2} />
                  </ControlButton>
                )}
              </div>
            )}
          </div>
        ) : (
          // No-timer phase (shouldn't happen now that lock is special-cased,
          // but kept for future manual-confirm phases).
          <button
            onClick={handleManualComplete}
            className="rounded-full px-10 py-4 font-ui text-[13px] tracking-[0.3em] uppercase"
            style={{
              border: `1px solid ${hexToRgba(stageColors.accent, 0.55)}`,
              background: hexToRgba(stageColors.accent, 0.25),
              color: NIGHT_TEXT.primary,
            }}
          >
            Confirmar
          </button>
        )}

        {/* Directive card */}
        <div
          className="w-full rounded-2xl p-4 text-[13px] leading-[1.55]"
          style={{
            background: hexToRgba(NIGHT.violet_2, 0.45),
            border: `1px solid ${NIGHT_TEXT.divider}`,
            color: NIGHT_TEXT.primary,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {mission.directive}
        </div>

        {/* Sub-steps (if any, wind-down phases) */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            {mission.subSteps.map((step, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{
                  background: hexToRgba(NIGHT.violet_1, 0.5),
                  border: `1px solid ${NIGHT_TEXT.divider}`,
                }}
              >
                <div className="font-ui text-[13px] font-[500]" style={{ color: NIGHT_TEXT.primary }}>
                  · {step.label}
                </div>
                <div className="mt-0.5 text-[12px] leading-[1.45]" style={{ color: NIGHT_TEXT.soft }}>
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Science note (collapsible) */}
        <button
          onClick={() => setShowScience((s) => !s)}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: hexToRgba(NIGHT.violet_1, 0.4),
            border: `1px solid ${NIGHT_TEXT.divider}`,
            color: NIGHT_TEXT.soft,
          }}
        >
          <span className="font-ui text-[11px] uppercase tracking-[0.3em]">¿Por qué funciona?</span>
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            style={{ transform: showScience ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
          />
        </button>
        {showScience && (
          <div
            className="w-full rounded-xl p-4 text-[12px] leading-[1.55]"
            style={{
              background: hexToRgba(NIGHT.abyss, 0.5),
              border: `1px solid ${NIGHT_TEXT.divider}`,
              color: NIGHT_TEXT.soft,
            }}
          >
            {mission.scienceNote}
          </div>
        )}

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="mt-2 flex items-center gap-2 opacity-60 hover:opacity-90 transition-opacity"
          style={{ color: NIGHT_TEXT.muted }}
        >
          <SkipForward size={12} strokeWidth={1.6} />
          <span className="font-ui text-[10px] uppercase tracking-[0.3em]">Saltar fase</span>
        </button>
      </div>

      {/* Journal overlay */}
      {showJournalOverlay && (
        <NightJournal onClose={() => setShowJournalOverlay(false)} />
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  children,
  accent,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  accent: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-[0.9]"
      style={{
        border: `1px solid ${hexToRgba(accent, 0.45)}`,
        background: hexToRgba(accent, 0.15),
        color: NIGHT_TEXT.primary,
      }}
    >
      {children}
    </button>
  );
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}
