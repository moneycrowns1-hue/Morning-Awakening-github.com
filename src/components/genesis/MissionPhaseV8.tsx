'use client';

// ═══════════════════════════════════════════════════════════
// MissionPhaseV8 · pantalla de fase del protocolo Génesis.
//
// MODO NOCHE · paleta noche global (melatonin-safe, 5am-ready):
//   - Fondo N.void + radial amber + ember tint sutil.
//   - Header masthead · dot amber + "fase 02 · codename".
//   - Hairline 1px global progress amber.
//   - Hero title lowercase XL con punto amber.
//   - Timer ring con N.amber override.
//   - Sub-steps editorial: numerales 01-NN + checkbox cuadrado.
//   - Directive card · rounded-22 con kicker "directiva".
//   - Coach split bento.
//   - Science collapsible · Tip hairline.
//   - Skip phase mono caption sutil.
//   - Completado overlay · void + radial amber + headline XL.
//
// Lógica idéntica: timer · voz · media session · sub-step toggle ·
// skip · journaling · breathing · daily insight.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { type Mission, formatTime, MISSIONS } from '@/lib/genesis/constants';
import type { Operator } from '@/lib/genesis/operator';
import { Pause, Play, Plus, Check, ChevronDown, ArrowUpRight, Sparkles } from 'lucide-react';
import BreathingGuide from '../common/BreathingGuide';
import DailyInsight from '../common/DailyInsight';
import JournalingPrompt from '../common/JournalingPrompt';
import { useMissionTimer } from '@/hooks/useMissionTimer';
import { haptics } from '@/lib/common/haptics';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import type { NightPalette, NightPaletteText } from '@/lib/night/nightPalette';
import { clearMediaSession, setMediaSessionHandlers, setPlaybackState, updateMediaSession } from '@/lib/common/mediaSession';

interface MissionPhaseV8Props {
  mission: Mission;
  onComplete: () => void;
  onOpenCoach?: () => void;
  onStrike?: () => void;
  operator?: Operator | null;
  audioTransition?: () => void;
  onSkipPhase?: () => void;
  /** Total de fases en la sesión actual (puede ser menor a
   *  `MISSIONS.length` si el adapter eliminó fases). Default:
   *  `MISSIONS.length` (back-compat). */
  totalPhases?: number;
  /** Posición 1-indexada de esta fase dentro de la sesión actual.
   *  Default: `mission.phase` (la posición catálogo). */
  phaseDisplay?: number;
}

export default function MissionPhaseV8({
  mission,
  onComplete,
  onOpenCoach,
  onStrike,
  operator,
  audioTransition,
  onSkipPhase,
  totalPhases: totalPhasesProp,
  phaseDisplay,
}: MissionPhaseV8Props) {
  const { night: N, nightText: NT } = useAppTheme();

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

  useEffect(() => {
    if (started && mission.duration > 0 && !timer.isRunning && !timer.expired && !timer.isPaused) {
      timer.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // ── Media session lockscreen controls ─────────────────
  useEffect(() => {
    updateMediaSession({
      title: `${toTitleCase(mission.title)} · fase ${phaseDisplay ?? mission.phase}/${totalPhasesProp ?? MISSIONS.length}`,
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
    return () => { /* cleared on full unmount */ };
  }, [mission, timer.isRunning, timer.isPaused, timer]);

  useEffect(() => {
    return () => { clearMediaSession(); };
  }, []);

  // ── Operator voice briefing ───────────────────────────
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
  const totalPhases = totalPhasesProp ?? MISSIONS.length;
  // `phaseDisplay` es 1-indexado y ya refleja la posición dentro de
  // la sesión adaptada; si no se pasa, caé a `mission.phase` (catálogo).
  const displayPhase = phaseDisplay ?? mission.phase;
  const globalProgress = ((displayPhase - 1) + timer.progress) / totalPhases;
  const currentTip = mission.tips?.[Math.floor(Date.now() / 10000) % (mission.tips?.length || 1)];
  const isBreathingPhase = !!mission.breathingPattern;

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{ background: N.void, color: NT.primary }}
    >
      {/* ─── Background · noche editorial ────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(N.amber, 0.16)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(N.ember_1, 0.22)} 0%, transparent 45%, ${hexToRgba(N.ember_deep, 0.3)} 100%)`,
        }}
      />

      {/* ─── COMPLETADO overlay · noche ─────────────────── */}
      {showCompletado && (
        <div
          ref={completadoRef}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${hexToRgba(N.void, 0.88)} 0%, ${hexToRgba(N.void, 0.94)} 100%)`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            opacity: 0,
          }}
        >
          <div className="text-center select-none px-6">
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700]"
              style={{
                color: N.amber,
                fontSize: 10,
                textShadow: `0 0 18px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              · fase {String(displayPhase).padStart(2, '0')} cerrada ·
            </div>
            <div
              className="font-headline font-[700] lowercase tracking-[-0.045em] mt-3"
              style={{
                color: NT.primary,
                fontSize: 'clamp(2.4rem, 9vw, 3.4rem)',
                lineHeight: 0.92,
                textShadow: `0 0 60px ${hexToRgba(N.amber, 0.3)}`,
              }}
            >
              completado
              <span style={{ color: N.amber }}>.</span>
            </div>
            <div
              className="mx-auto mt-5 h-px"
              style={{
                width: 128,
                background: `linear-gradient(90deg, transparent, ${N.amber}, transparent)`,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.6)}`,
              }}
            />
            <div
              className="mt-4 font-mono uppercase tracking-[0.32em] font-[600]"
              style={{ color: NT.soft, fontSize: 10 }}
            >
              {mission.completionLog}
            </div>
          </div>
        </div>
      )}

      {/* ─── Header masthead ────────────────────────────── */}
      <div
        className="relative z-10 px-5 md:px-8 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              fase {String(displayPhase).padStart(2, '0')} / {totalPhases} · {mission.codename.toLowerCase()}
            </span>
          </span>
          {mission.scheduledTime && (
            <span
              className="font-mono tabular-nums tracking-[0.18em] font-[700]"
              style={{ color: NT.soft, fontSize: 10 }}
            >
              {mission.scheduledTime}
            </span>
          )}
        </div>

        {/* Hairline global progress */}
        <div className="relative h-[1px]" style={{ background: hexToRgba(N.amber, 0.16) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, globalProgress * 100))}%`,
              background: N.amber,
              boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.55)}`,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ─── Body scrollable ────────────────────────────── */}
      <div
        ref={scrollRef}
        className="scroll-area flex-1 w-full max-w-md mx-auto flex flex-col items-center gap-y-7 relative z-10 min-h-0 px-6 md:px-8"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Hero title · siempre visible (en breathing phases también, BreathingGuide embedded
            solo aporta el orb + label de respiración). */}
        <div className="w-full flex flex-col items-center text-center mt-4 sunrise-fade-up" style={{ animationDelay: '40ms' }}>
          {mission.blockLabel && (
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700] mb-3"
              style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
            >
              · {mission.blockLabel.toLowerCase()} ·
            </div>
          )}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em]"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2.4rem, 9vw, 3.4rem)',
              lineHeight: 0.94,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
            }}
          >
            {toTitleCase(mission.title).toLowerCase()}
            <span style={{ color: N.amber }}>.</span>
          </h1>
        </div>

        {/* ─── Hero action: timer / breathing / confirm ─── */}
        {isBreathingPhase ? (
          <div className="w-full flex flex-col items-center sunrise-fade-up" style={{ animationDelay: '160ms' }}>
            <BreathingGuide embedded />
          </div>
        ) : mission.duration > 0 ? (
          <div className="flex flex-col items-center gap-6 sunrise-fade-up w-full" style={{ animationDelay: '160ms' }}>
            {/* Timer tipográfico · estilo NightMissionPhase · sin anillo,
                solo número grande tabular + barra ámbar fina + caption. */}
            <button
              onClick={started ? handlePauseResume : undefined}
              disabled={!started}
              className="flex flex-col items-center gap-2.5 w-full max-w-[280px] transition-opacity active:opacity-80"
              style={{ cursor: started ? 'pointer' : 'default' }}
            >
              <div
                className="font-headline font-[200] tabular-nums leading-none"
                style={{
                  color: NT.primary,
                  fontSize: 'clamp(3.4rem, 13vw, 4.8rem)',
                  letterSpacing: '-0.04em',
                  textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
                }}
              >
                {formatTime(timer.remaining)}
              </div>
              <div
                className="w-full relative"
                style={{ height: 1.5, background: hexToRgba(N.amber, 0.16) }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.max(0, Math.min(100, timer.progress * 100))}%`,
                    background: N.amber,
                    boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.6)}`,
                    transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
                  }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="font-mono uppercase tracking-[0.4em] font-[600]"
                  style={{ color: NT.muted, fontSize: 9 }}
                >
                  {timer.isPaused ? 'en pausa' : started ? 'restante' : `de ${formatTime(mission.duration)}`}
                </span>
                {timer.isPaused && (
                  <span
                    aria-hidden
                    style={{ width: 4, height: 4, background: N.amber, borderRadius: 99, opacity: 0.85 }}
                  />
                )}
              </div>
            </button>

            {!started ? (
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2.5 rounded-full transition-transform active:scale-[0.96]"
                style={{
                  padding: '14px 26px',
                  background: N.amber,
                  color: N.void,
                  boxShadow: `0 10px 32px -6px ${hexToRgba(N.amber, 0.55)}`,
                }}
              >
                <Play size={15} strokeWidth={2.4} fill="currentColor" />
                <span className="font-mono font-[700] tracking-[0.32em] uppercase leading-none" style={{ fontSize: 11 }}>
                  iniciar
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-5">
                <ControlButton
                  onClick={handlePauseResume}
                  N={N}
                  NT={NT}
                  label={timer.isRunning ? 'pausar' : 'reanudar'}
                >
                  {timer.isRunning ? <Pause size={16} strokeWidth={2.2} /> : <Play size={16} strokeWidth={2.2} fill="currentColor" />}
                </ControlButton>
                <ControlButton
                  onClick={handleAddMinute}
                  N={N}
                  NT={NT}
                  label="+1 min"
                >
                  <Plus size={16} strokeWidth={2.6} />
                </ControlButton>
                <ControlButton
                  onClick={handleManualComplete}
                  N={N}
                  NT={NT}
                  label="completar"
                  variant="primary"
                >
                  <Check size={16} strokeWidth={2.6} />
                </ControlButton>
              </div>
            )}
          </div>
        ) : (
          /* duration === 0 → manual confirm */
          <div className="flex flex-col items-center sunrise-fade-up" style={{ animationDelay: '160ms' }}>
            <button
              onClick={handleManualComplete}
              className="relative rounded-full transition-transform active:scale-[0.97]"
              style={{
                width: 180,
                height: 180,
                background: N.amber,
                color: N.void,
                boxShadow: `0 18px 50px -12px ${hexToRgba(N.amber, 0.55)}`,
              }}
            >
              <div className="flex flex-col items-center justify-center gap-2.5">
                <Check size={34} strokeWidth={1.8} />
                <span
                  className="font-mono font-[700] tracking-[0.38em] uppercase"
                  style={{ fontSize: 11 }}
                >
                  confirmar
                </span>
              </div>
            </button>
          </div>
        )}

        {/* ─── Directive card (sin sub-steps) ───────────── */}
        {showDirective && !mission.subSteps?.length && (
          <div
            className="w-full px-5 py-5 sunrise-fade-up"
            style={{
              animationDelay: '280ms',
              borderRadius: 22,
              border: `1px solid ${hexToRgba(N.amber, 0.22)}`,
              background: hexToRgba(N.ember_deep, 0.55),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.42em] font-[700] mb-3"
              style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
            >
              · directiva ·
            </div>
            <p
              className="font-headline italic font-[400] leading-[1.5]"
              style={{ color: NT.primary, fontSize: 17 }}
            >
              {typewriterText}
              {typewriterText.length < mission.directive.length && (
                <span className="animate-pulse ml-0.5" style={{ color: N.amber }}>
                  |
                </span>
              )}
            </p>
          </div>
        )}

        {/* ─── Sub-steps editorial ───────────────────────── */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <section className="w-full sunrise-fade-up" style={{ animationDelay: '280ms' }}>
            <div className="flex items-center gap-3 pb-3">
              <span
                aria-hidden
                className="flex-1 h-[1px]"
                style={{ background: hexToRgba(N.amber, 0.18) }}
              />
              <span
                className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
                style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
              >
                · pasos · {checkedSteps.size}/{mission.subSteps.length} ·
              </span>
              <span
                aria-hidden
                className="flex-1 h-[1px]"
                style={{ background: hexToRgba(N.amber, 0.18) }}
              />
            </div>

            <div className="flex flex-col">
              {mission.subSteps.map((step, idx) => {
                const checked = checkedSteps.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className="w-full flex items-start gap-3.5 px-2 py-3.5 text-left transition-opacity active:opacity-70"
                    style={{
                      borderBottom: `1px solid ${hexToRgba(N.amber, 0.12)}`,
                    }}
                  >
                    <span
                      className="font-mono tabular-nums font-[700] shrink-0 pt-0.5"
                      style={{
                        color: checked ? hexToRgba(N.amber, 0.55) : N.amber,
                        fontSize: 12,
                        minWidth: '2.5ch',
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="relative shrink-0 flex items-center justify-center transition-all duration-300 mt-0.5"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1.5px solid ${checked ? N.amber : hexToRgba(NT.primary, 0.32)}`,
                        background: checked ? N.amber : 'transparent',
                      }}
                    >
                      {checked && (
                        <Check size={11} strokeWidth={3.2} style={{ color: N.void }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                      <span
                        className="font-headline font-[600] lowercase tracking-[-0.015em] leading-snug"
                        style={{
                          color: checked ? NT.muted : NT.primary,
                          fontSize: 15,
                          textDecoration: checked ? 'line-through' : 'none',
                          textDecorationColor: hexToRgba(N.amber, 0.55),
                        }}
                      >
                        {step.label.toLowerCase()}
                      </span>
                      {step.optional && (
                        <span
                          className="font-mono uppercase tracking-[0.22em] font-[700] px-1.5 py-0.5"
                          style={{
                            color: N.amber,
                            background: hexToRgba(N.amber, 0.16),
                            fontSize: 8.5,
                            borderRadius: 4,
                          }}
                        >
                          opcional
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Coach contextual card ─────────────────────── */}
        {onOpenCoach && COACH_RELEVANT_PHASES[mission.id] && (
          <MissionCoachCard
            phaseId={mission.id}
            N={N}
            NT={NT}
            onOpen={onOpenCoach}
          />
        )}

        {/* Special features */}
        {mission.hasJournaling && <JournalingPrompt />}
        {mission.hasDailyInsight && <DailyInsight />}

        {/* Hairline divider */}
        <div
          className="w-full"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${hexToRgba(N.amber, 0.22)}, transparent)`,
          }}
          aria-hidden
        />

        {/* ─── Science note (collapsible) ─── */}
        {mission.scienceNote && (
          <div className="w-full">
            <button
              onClick={() => { haptics.tap(); setShowScience((s) => !s); }}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70"
              style={{
                background: hexToRgba(N.ember_deep, 0.45),
                border: `1px solid ${hexToRgba(N.amber, 0.22)}`,
                borderRadius: 14,
              }}
            >
              <span
                className="font-mono uppercase tracking-[0.32em] font-[700]"
                style={{ color: hexToRgba(N.amber, 0.95), fontSize: 10 }}
              >
                · ¿por qué funciona? ·
              </span>
              <ChevronDown
                size={15}
                strokeWidth={2.2}
                style={{
                  color: N.amber,
                  transform: showScience ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.3s',
                }}
              />
            </button>
            {showScience && (
              <div
                className="mt-2 px-5 py-4 font-ui leading-[1.65]"
                style={{
                  color: NT.soft,
                  border: `1px solid ${hexToRgba(N.amber, 0.16)}`,
                  background: hexToRgba(N.ember_deep, 0.3),
                  fontSize: 13,
                  borderRadius: 14,
                }}
              >
                {mission.scienceNote}
              </div>
            )}
          </div>
        )}

        {/* ─── Tip · hairline left border ─── */}
        {currentTip && (
          <div
            className="w-full px-5 py-4"
            style={{
              borderLeft: `2px solid ${N.amber}`,
              background: hexToRgba(N.ember_deep, 0.4),
              borderRadius: '0 14px 14px 0',
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.32em] font-[700] mb-1.5"
              style={{ color: N.amber, fontSize: 9 }}
            >
              · tip ·
            </div>
            <div
              className="font-ui leading-[1.55]"
              style={{ color: NT.primary, fontSize: 13 }}
            >
              {currentTip}
            </div>
          </div>
        )}

        {/* ─── Skip phase ─── */}
        <button
          onClick={handleSkip}
          className="self-center font-mono uppercase tracking-[0.34em] font-[600] px-5 py-2.5 rounded-full transition-opacity active:opacity-70"
          style={{
            color: NT.muted,
            border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            background: 'transparent',
            fontSize: 9.5,
          }}
        >
          saltar fase
        </button>
      </div>
    </div>
  );
}

// ─── small presentational bits ───────────────────────────────

interface NightCtx {
  N: NightPalette;
  NT: NightPaletteText;
}

function ControlButton({
  children,
  onClick,
  label,
  N,
  NT,
  variant = 'ghost',
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: 'ghost' | 'primary';
} & NightCtx) {
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
          background: isPrimary ? N.amber : hexToRgba(N.ember_deep, 0.55),
          border: `1px solid ${isPrimary ? N.amber : hexToRgba(N.amber, 0.32)}`,
          color: isPrimary ? N.void : NT.primary,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow: isPrimary ? `0 8px 22px -8px ${hexToRgba(N.amber, 0.5)}` : 'none',
        }}
      >
        {children}
      </span>
      <span
        className="font-mono uppercase tracking-[0.28em] font-[700]"
        style={{ color: NT.muted, fontSize: 9 }}
      >
        {label}
      </span>
    </button>
  );
}

function toTitleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Coach contextual card ─────────────────────────────────

const COACH_RELEVANT_PHASES: Record<string, { kicker: string; lead: string }> = {
  aqua: {
    kicker: 'hidratación · target diario',
    lead: 'mira tu progreso de los 3 L y registra el vaso de ahora mismo.',
  },
  refuel: {
    kicker: 'skincare AM · rutina personalizada',
    lead: 'tu rutina de hoy se adapta a brote · deriva-c · condiciones activas.',
  },
  sigillum: {
    kicker: 'cepillado · plan vacacional 3×',
    lead: 'marca el slot que acabas de cumplir y revisa tu adherencia.',
  },
};

function MissionCoachCard({
  phaseId,
  N,
  NT,
  onOpen,
}: {
  phaseId: string;
  onOpen: () => void;
} & NightCtx) {
  const meta = COACH_RELEVANT_PHASES[phaseId];
  if (!meta) return null;
  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); onOpen(); }}
      className="w-full text-left flex items-stretch overflow-hidden transition-transform active:scale-[0.985] sunrise-fade-up"
      style={{
        animationDelay: '320ms',
        borderRadius: 22,
        background: hexToRgba(N.ember_deep, 0.55),
        border: `1px solid ${hexToRgba(N.amber, 0.22)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3.5 px-4 py-4">
        <span
          className="shrink-0 w-10 h-10 flex items-center justify-center"
          style={{
            background: hexToRgba(N.amber, 0.16),
            border: `1px solid ${hexToRgba(N.amber, 0.4)}`,
            color: N.amber,
            borderRadius: 12,
          }}
        >
          <Sparkles size={16} strokeWidth={1.95} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: hexToRgba(N.amber, 0.95), fontSize: 9 }}
          >
            {meta.kicker}
          </div>
          <div
            className="font-headline font-[700] lowercase tracking-[-0.025em] mt-1"
            style={{ color: NT.primary, fontSize: 18, lineHeight: 1 }}
          >
            abrir coach
            <span style={{ color: N.amber }}>.</span>
          </div>
          <p
            className="font-mono leading-snug mt-1.5 truncate"
            style={{ color: NT.soft, fontSize: 10.5 }}
          >
            {meta.lead}
          </p>
        </div>
      </div>
      <div
        className="shrink-0 flex items-center justify-center px-4"
        style={{ background: N.amber }}
      >
        <ArrowUpRight size={18} strokeWidth={2.4} style={{ color: N.void }} />
      </div>
    </button>
  );
}
