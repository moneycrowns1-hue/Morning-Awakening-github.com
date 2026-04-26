'use client';

// ═══════════════════════════════════════════════════════
// MissionPhaseV8 · sunrise-themed protocol phase screen
//
// Replaces the dojo-era MissionPhase. Layout, top → bottom:
//   1. Animated sunrise background (tint depends on phase)
//   2. Top header: breadcrumb FASE N / 12 · codename, global
//      protocol progress bar.
//   3. Hero: TimerRing with play / pause / skip / +1min
//      controls underneath. For duration=0 phases, a single
//      "Confirmar" CTA replaces the ring.
//   4. Title (serif) + directive card.
//   5. Sub-steps checklist / BreathingGuide / DailyInsight /
//      JournalingPrompt (feature components reused unchanged).
//   6. Collapsible "¿por qué funciona?" science note.
//   7. Skip-phase button (dev / emergency).
//   8. COMPLETADO overlay on completion.
//
// Public props are identical to the old MissionPhase so the
// parent (MorningAwakening.tsx) only needs to swap the import.
//
// NOTE: this file INTENTIONALLY reimplements the logic rather
// than wrapping MissionPhase, because the old file is 760 LoC
// of dojo CSS that would be very noisy to edit in place. The
// old file stays on disk untouched; we just stop importing it.
// ═══════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { type Mission, formatTime, MISSIONS } from '@/lib/genesis/constants';
import type { Operator } from '@/lib/genesis/operator';
import { Pause, Play, SkipForward, Plus, Check, ChevronDown } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import TimerRing from '../common/TimerRing';
import BreathingGuide from '../common/BreathingGuide';
import DailyInsight from '../common/DailyInsight';
import JournalingPrompt from '../common/JournalingPrompt';
import { useMissionTimer } from '@/hooks/useMissionTimer';
import { haptics } from '@/lib/common/haptics';
import { getStageColors, hexToRgba } from '@/lib/common/theme';
import { clearMediaSession, setMediaSessionHandlers, setPlaybackState, updateMediaSession } from '@/lib/common/mediaSession';

interface MissionPhaseV8Props {
  mission: Mission;
  onComplete: () => void;
  /** Called when a sub-step toggles or the skip button fires, so the
   *  parent can play its SFX (strike). */
  onStrike?: () => void;
  /** Voice line orchestration. */
  operator?: Operator | null;
  /** Optional audio-side transition hook called by the parent when a
   *  phase finishes. Kept for compatibility; parent still uses it. */
  audioTransition?: () => void;
  /** Called by the skip-mid-phase control so the parent can track it. */
  onSkipPhase?: () => void;
}

export default function MissionPhaseV8({
  mission,
  onComplete,
  onStrike,
  operator,
  audioTransition,
  onSkipPhase,
}: MissionPhaseV8Props) {
  const stageIndex = Math.max(0, Math.min(11, mission.phase - 1));
  const stageColors = getStageColors(stageIndex);

  const [started, setStarted] = useState<boolean>(mission.duration === 0);
  const [typewriterText, setTypewriterText] = useState<string>('');
  const [showDirective, setShowDirective] = useState<boolean>(false);
  const [showScience, setShowScience] = useState<boolean>(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [showCompletado, setShowCompletado] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const completadoRef = useRef<HTMLDivElement>(null);
  const spokenOpenRef = useRef(false);

  // ── Timer ──────────────────────────────────────────────
  const timer = useMissionTimer({
    duration: mission.duration,
    autoStart: started && mission.duration > 0,
    onExpire: () => {
      setTimeout(() => {
        audioTransition?.();
        setShowCompletado(true);
      }, 200);
    },
  });

  // When the user taps Play the first time on a timed phase.
  useEffect(() => {
    if (started && mission.duration > 0 && !timer.isRunning && !timer.expired && !timer.isPaused) {
      timer.start();
    }
    // Only care about `started` edges and a fresh mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // ── Media Session: lockscreen / bluetooth controls ────
  // Expose the current phase as "now playing" so iOS / Android show
  // it on the lock screen with play/pause/next buttons.
  useEffect(() => {
    updateMediaSession({
      title: `${toTitleCase(mission.title)} · fase ${mission.phase}/${MISSIONS.length}`,
      artist: 'Morning Awakening',
      album: mission.blockLabel ?? 'Protocolo matutino',
    });
    setMediaSessionHandlers({
      onPlay: () => { if (timer.isPaused) timer.resume(); else timer.start(); },
      onPause: () => timer.pause(),
      onNextTrack: () => { haptics.warn(); setShowCompletado(true); },
      onSeekForward: () => timer.addMinute(),
    });
    setPlaybackState(timer.isRunning ? 'playing' : timer.isPaused ? 'paused' : 'none');
    return () => {
      // Don't clear on every mission re-render (we just overwrite
      // metadata). Only the parent protocol end should clear it.
    };
    // We intentionally only re-run this when the phase or timer state
    // actually changes, not on every keystroke of `timer`.
  }, [mission, timer.isRunning, timer.isPaused, timer]);

  // Clear media session when the component unmounts for good (last
  // phase just completed). The parent moves to SummaryScreen and this
  // component is unmounted; we clear there.
  useEffect(() => {
    return () => { clearMediaSession(); };
  }, []);

  // ── Operator voice briefing (single per-phase line) ────
  useEffect(() => {
    if (!operator || spokenOpenRef.current) return;
    spokenOpenRef.current = true;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      await operator.waitForPendingSpeech();
      if (cancelled) return;
      operator.speak(mission.voiceLineBriefing, { rate: 0.93 });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mission, operator]);

  // ── Typewriter for the directive ──────────────────────
  useEffect(() => {
    if (!mission.directive) return;
    setTypewriterText('');
    setShowDirective(false);
    const showAt = window.setTimeout(() => setShowDirective(true), 400);
    return () => window.clearTimeout(showAt);
  }, [mission.directive]);

  useEffect(() => {
    if (!showDirective) return;
    let i = 0;
    const text = mission.directive;
    setTypewriterText('');
    const id = window.setInterval(() => {
      if (i <= text.length) {
        setTypewriterText(text.slice(0, i));
        i += 1;
      } else {
        window.clearInterval(id);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [showDirective, mission.directive]);

  // ── COMPLETADO overlay animation ──────────────────────
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
    tl.fromTo(node, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
    tl.to(node, { opacity: 0, duration: 0.35, delay: 0.9, ease: 'power1.in' });
    tl.call(() => { onComplete(); });
    return () => { tl.kill(); };
  }, [showCompletado, onComplete, operator]);

  // ── Sub-step toggle ───────────────────────────────────
  const toggleStep = useCallback((idx: number) => {
    haptics.tap();
    onStrike?.();
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [onStrike]);

  // ── Controls ──────────────────────────────────────────
  const handleStart = useCallback(() => {
    haptics.tick();
    onStrike?.();
    setStarted(true);
  }, [onStrike]);

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
    audioTransition?.();
    setShowCompletado(true);
  }, [audioTransition, onSkipPhase]);

  const handleManualComplete = useCallback(() => {
    haptics.success();
    onStrike?.();
    audioTransition?.();
    setShowCompletado(true);
  }, [audioTransition, onStrike]);

  // ── Derived ───────────────────────────────────────────
  const totalPhases = MISSIONS.length;
  const globalProgress = ((mission.phase - 1) + timer.progress) / totalPhases;
  const currentTip = mission.tips?.[Math.floor(Date.now() / 10000) % (mission.tips?.length || 1)];

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      {/* Sunrise background tinted for this phase */}
      <GradientBackground stage={stageIndex} particleCount={40} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* COMPLETADO overlay */}
      {showCompletado && (
        <div
          ref={completadoRef}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10,6,24,0.88) 0%, rgba(10,6,24,0.74) 60%, rgba(10,6,24,0.5) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            opacity: 0,
          }}
        >
          <div className="text-center select-none">
            <div
              className="font-display font-[500] italic text-4xl md:text-5xl tracking-[0.04em]"
              style={{
                color: 'var(--sunrise-text)',
                textShadow: `0 0 24px ${hexToRgba(stageColors.accent, 0.55)}`,
              }}
            >
              Completado
            </div>
            <div
              className="mt-5 font-ui text-[11px] uppercase tracking-[0.32em]"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              {mission.completionLog}
            </div>
            <div
              className="mx-auto mt-6 h-px w-32"
              style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(stageColors.accent, 0.7)}, transparent)` }}
            />
          </div>
        </div>
      )}

      {/* ═══ Header bar (fixed at top) ═══════════════════ */}
      <div
        className="relative z-10 px-5 pt-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span
              className="font-mono text-[11px] tracking-[0.2em]"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              FASE {String(mission.phase).padStart(2, '0')} / {totalPhases}
            </span>
            <span
              className="font-ui text-[11px] uppercase tracking-[0.3em]"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              {mission.codename}
            </span>
          </div>
          {mission.scheduledTime && (
            <span
              className="font-mono text-[11px] tracking-wider"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              {mission.scheduledTime}
            </span>
          )}
        </div>

        {/* Global progress bar across all 12 phases */}
        <div
          className="mt-3 h-[2px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,250,240,0.08)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, globalProgress * 100))}%`,
              background: `linear-gradient(90deg, ${hexToRgba(stageColors.accent, 0.55)}, ${stageColors.accent})`,
              boxShadow: `0 0 8px ${hexToRgba(stageColors.accent, 0.45)}`,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ═══ Main scrollable body ════════════════════════ */}
      <div
        ref={scrollRef}
        className="scroll-area flex-1 w-full max-w-md mx-auto flex flex-col items-center gap-y-9 relative z-10 min-h-0 px-6"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Title (serif, humane) */}
        <div className="w-full flex flex-col items-center text-center mt-2 sunrise-fade-up" style={{ animationDelay: '40ms' }}>
          <h1
            className="font-display font-[400] italic leading-[1.12] text-[clamp(2rem,7.5vw,2.75rem)]"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {toTitleCase(mission.title)}
          </h1>
          {mission.blockLabel && (
            <div
              className="mt-2 font-ui text-[10px] uppercase tracking-[0.35em]"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              {mission.blockLabel}
            </div>
          )}
        </div>

        {/* ═══ Hero action (timer OR confirm button) ═══ */}
        {mission.breathingPattern ? (
          <div className="w-full flex flex-col items-center sunrise-fade-up" style={{ animationDelay: '160ms' }}>
            <BreathingGuide />
          </div>
        ) : mission.duration > 0 ? (
          <div className="flex flex-col items-center gap-5 sunrise-fade-up" style={{ animationDelay: '160ms' }}>
            <TimerRing
              progress={timer.progress}
              label={formatTime(timer.remaining)}
              caption={timer.isPaused ? 'EN PAUSA' : started ? 'RESTANTE' : 'LISTO'}
              stage={stageIndex}
              size={220}
              paused={timer.isPaused}
              onCentreClick={started ? handlePauseResume : undefined}
            />

            {/* Controls row */}
            {!started ? (
              <button
                onClick={handleStart}
                className="group relative flex items-center gap-2.5 rounded-full transition-transform active:scale-[0.97]"
                style={{
                  padding: '14px 32px',
                  background: `linear-gradient(180deg, ${hexToRgba(stageColors.accent, 0.18)} 0%, ${hexToRgba(stageColors.accent, 0.34)} 100%)`,
                  border: `1px solid ${hexToRgba(stageColors.accent, 0.5)}`,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                <Play size={16} strokeWidth={2} fill="currentColor" style={{ color: 'var(--sunrise-text)' }} />
                <span
                  className="font-ui font-[500] text-[13px] tracking-[0.32em] uppercase"
                  style={{ color: 'var(--sunrise-text)' }}
                >
                  Iniciar
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-5">
                <ControlButton
                  onClick={handlePauseResume}
                  accent={stageColors.accent}
                  label={timer.isRunning ? 'Pausar' : 'Reanudar'}
                >
                  {timer.isRunning ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} fill="currentColor" />}
                </ControlButton>
                <ControlButton
                  onClick={handleAddMinute}
                  accent={stageColors.accent}
                  label="+1 min"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </ControlButton>
                <ControlButton
                  onClick={handleManualComplete}
                  accent={stageColors.accent}
                  label="Completar"
                  variant="primary"
                >
                  <Check size={16} strokeWidth={2.5} />
                </ControlButton>
              </div>
            )}
          </div>
        ) : (
          /* duration === 0 → manual confirm phase */
          <div className="flex flex-col items-center sunrise-fade-up" style={{ animationDelay: '160ms' }}>
            <button
              onClick={handleManualComplete}
              className="relative rounded-full transition-transform active:scale-[0.97] overflow-hidden"
              style={{
                width: 180,
                height: 180,
                background: `linear-gradient(180deg, ${hexToRgba(stageColors.accent, 0.14)} 0%, ${hexToRgba(stageColors.accent, 0.34)} 100%)`,
                border: `1px solid ${hexToRgba(stageColors.accent, 0.55)}`,
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <span
                className="absolute inset-0 rounded-full sunrise-cta-halo sunrise-cta-pulse pointer-events-none"
                style={{ borderRadius: '9999px' }}
              />
              <div className="relative flex flex-col items-center justify-center gap-2.5">
                <Check size={34} strokeWidth={1.8} style={{ color: 'var(--sunrise-text)' }} />
                <span
                  className="font-ui font-[500] text-[12px] tracking-[0.38em] uppercase"
                  style={{ color: 'var(--sunrise-text)' }}
                >
                  Confirmar
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Directive card (when there are no sub-steps) */}
        {showDirective && !mission.subSteps?.length && (
          <div
            className="w-full rounded-2xl px-6 py-5 sunrise-fade-up"
            style={{
              animationDelay: '280ms',
              border: `1px solid ${hexToRgba(stageColors.accent, 0.14)}`,
              background: 'rgba(255,250,240,0.04)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <p
              className="font-display text-[17px] leading-[1.55] italic font-[300]"
              style={{ color: 'var(--sunrise-text)' }}
            >
              {typewriterText}
              {typewriterText.length < mission.directive.length && (
                <span className="animate-pulse ml-0.5" style={{ color: hexToRgba(stageColors.accent, 0.9) }}>
                  |
                </span>
              )}
            </p>
          </div>
        )}

        {/* Sub-steps checklist */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <section className="w-full sunrise-fade-up" style={{ animationDelay: '280ms' }}>
            <div
              className="font-ui text-[10px] uppercase tracking-[0.38em] mb-4 pl-1"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Pasos a seguir
            </div>
            <div className="flex flex-col gap-3">
              {mission.subSteps.map((step, idx) => {
                const checked = checkedSteps.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 active:scale-[0.985]"
                    style={{
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: checked ? hexToRgba(stageColors.accent, 0.45) : 'rgba(255,250,240,0.10)',
                      background: checked ? hexToRgba(stageColors.accent, 0.08) : 'rgba(255,250,240,0.03)',
                    }}
                  >
                    <div
                      className="relative w-6 h-6 rounded-lg shrink-0 flex items-center justify-center transition-all duration-300"
                      style={{
                        border: `1.5px solid ${checked ? stageColors.accent : 'rgba(255,250,240,0.28)'}`,
                        background: checked ? stageColors.accent : 'transparent',
                      }}
                    >
                      {checked && (
                        <Check size={14} strokeWidth={3} style={{ color: '#0b0618' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span
                        className="font-ui text-[15px] leading-snug font-[500]"
                        style={{
                          color: checked ? 'var(--sunrise-text-soft)' : 'var(--sunrise-text)',
                          textDecoration: checked ? 'line-through' : 'none',
                          textDecorationColor: hexToRgba(stageColors.accent, 0.5),
                        }}
                      >
                        {step.label}
                      </span>
                      {step.optional && (
                        <span
                          className="font-mono text-[9px] tracking-[0.18em] px-1.5 py-0.5 rounded"
                          style={{
                            color: hexToRgba(stageColors.accent, 0.95),
                            background: hexToRgba(stageColors.accent, 0.14),
                          }}
                        >
                          OPCIONAL
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Special feature blocks */}
        {mission.hasJournaling && <JournalingPrompt />}
        {mission.hasDailyInsight && <DailyInsight />}

        {/* Divider */}
        <div
          className="w-full"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,250,240,0.12), transparent)',
          }}
          aria-hidden
        />

        {/* Science note (collapsible) */}
        {mission.scienceNote && (
          <div className="w-full">
            <button
              onClick={() => { haptics.tap(); setShowScience((s) => !s); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-ui text-[11px] tracking-[0.28em] uppercase transition-colors"
              style={{
                color: 'var(--sunrise-text-soft)',
                background: 'rgba(255,250,240,0.035)',
                border: '1px solid rgba(255,250,240,0.08)',
              }}
            >
              <span>¿Por qué funciona?</span>
              <ChevronDown
                size={15}
                strokeWidth={2}
                style={{ transform: showScience ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
              />
            </button>
            {showScience && (
              <div
                className="mt-2 px-5 py-4 rounded-xl font-ui text-[13px] leading-[1.68]"
                style={{
                  color: 'var(--sunrise-text-soft)',
                  border: '1px solid rgba(255,250,240,0.06)',
                  background: 'rgba(255,250,240,0.02)',
                }}
              >
                {mission.scienceNote}
              </div>
            )}
          </div>
        )}

        {/* Tip (subtle) */}
        {currentTip && (
          <div
            className="w-full px-5 py-4 rounded-xl font-ui text-[13px] leading-[1.6]"
            style={{
              borderLeft: `2px solid ${hexToRgba(stageColors.accent, 0.55)}`,
              background: 'rgba(255,250,240,0.02)',
              color: 'var(--sunrise-text-soft)',
            }}
          >
            <span
              className="font-mono text-[10px] tracking-[0.25em] uppercase mr-2"
              style={{ color: hexToRgba(stageColors.accent, 0.85) }}
            >
              Tip
            </span>
            {currentTip}
          </div>
        )}

        {/* Skip phase (dev/emergency). Intentionally restrained. */}
        <button
          onClick={handleSkip}
          className="self-center font-ui text-[10px] tracking-[0.34em] uppercase px-5 py-2 rounded-full transition-colors"
          style={{
            color: 'rgba(255,250,240,0.35)',
            border: '1px solid rgba(255,250,240,0.08)',
          }}
        >
          Saltar fase
        </button>
      </div>
    </div>
  );
}

// ─── small presentational bits ───────────────────────────────

function ControlButton({
  children,
  onClick,
  label,
  accent,
  variant = 'ghost',
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  accent: string;
  variant?: 'ghost' | 'primary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1.5 transition-transform active:scale-[0.94]"
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: isPrimary ? 56 : 48,
          height: isPrimary ? 56 : 48,
          background: isPrimary
            ? `linear-gradient(180deg, ${hexToRgba(accent, 0.2)} 0%, ${hexToRgba(accent, 0.4)} 100%)`
            : 'rgba(255,250,240,0.05)',
          border: `1px solid ${isPrimary ? hexToRgba(accent, 0.55) : 'rgba(255,250,240,0.14)'}`,
          color: 'var(--sunrise-text)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        {children}
      </span>
      <span
        className="font-ui text-[9px] tracking-[0.28em] uppercase"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {label}
      </span>
    </button>
  );
}

function toTitleCase(s: string): string {
  // "DESPERTAR" → "Despertar"
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
