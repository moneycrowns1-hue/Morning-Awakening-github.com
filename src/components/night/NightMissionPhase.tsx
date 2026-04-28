'use client';

// ═══════════════════════════════════════════════════════════
// NightMissionPhase · night-protocol phase player (V8 · cosmos)
//
// Symmetric to MissionPhaseV8 but for the Night Conquest Protocol.
// Uses the cosmos+minimal palette (NIGHT_CALM, warm amber on void)
// matching NightWelcomeScreen. Routes interaction-type phases:
//   - 'breath'  → inline breath guide w/ amber orb pulsing
//   - 'journal' → NightJournal overlay (reused from v1)
//   - 'read'    → simple reading timer with "terminé" button
//   - 'lock'    → skips directly; parent transitions to SLUMBER
//
// Voice briefings are spoken via the morning Operator (Qwen/Edge
// TTS pipeline) at a slower rate (0.86) to match the intimate
// nocturnal tone.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Pause, Play, SkipForward, Plus, ChevronDown, BookOpen, Check } from 'lucide-react';
import { formatTime } from '@/lib/genesis/constants';
import type { NightMission } from '@/lib/night/nightConstants';
import type { Operator } from '@/lib/genesis/operator';
import TimerRing from '../common/TimerRing';
import NightStarfield from './NightStarfield';
import NightJournal from './NightJournal';
import { useMissionTimer } from '@/hooks/useMissionTimer';
import { haptics } from '@/lib/common/haptics';
import { NIGHT_CALM, NIGHT_CALM_TEXT } from '@/lib/night/nightTheme';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

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
  // For 'lock' interaction, skip straight through — parent renders lock.
  const isLockPhase = mission.interaction === 'lock';
  const hasTimer = durationSec > 0 && !isLockPhase;

  // Paleta activa global (seleccionada en el welcome de la noche).
  const { palette: N, paletteText: NT } = useNightPalette();

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
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{ background: N.void, color: NT.soft }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <NightStarfield count={60} shooting={false} />
        </div>
        <div className="relative text-center">
          {/* Amber breathing orb */}
          <div
            className="relative mx-auto rounded-full night-breath"
            style={{
              width: 110,
              height: 110,
              background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
              boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.55)}, 0 0 60px ${hexToRgba(N.amber, 0.45)}`,
            }}
          />
          <div
            className="mt-6 font-ui text-[11px] uppercase tracking-[0.4em]"
            style={{ color: NT.muted }}
          >
            entrando a la noche…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* Cosmic horizon */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${N.ember_1} 0%, ${N.void} 60%, #000000 100%)`,
        }}
      />
      {/* Living starfield · subtle, paper feel */}
      <div className="absolute inset-0 pointer-events-none">
        <NightStarfield count={45} shooting={false} />
      </div>
      {/* Distant nebulae · breathing */}
      <div
        aria-hidden
        className="night-breath-slow absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 25% 80%, ${hexToRgba(N.candle, 0.14)} 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="night-breath absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 40% 30% at 80% 15%, ${hexToRgba(N.amber, 0.08)} 0%, transparent 60%)`,
        }}
      />

      {/* COMPLETADO overlay */}
      {showCompletado && (
        <div
          ref={completadoRef}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${hexToRgba(N.void, 0.92)} 0%, ${hexToRgba(N.void, 0.7)} 70%, ${hexToRgba(N.void, 0.4)} 100%)`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            opacity: 0,
          }}
        >
          <div className="text-center select-none">
            <div
              className="font-headline font-[300] text-4xl md:text-5xl leading-[0.95] lowercase tracking-[-0.04em]"
              style={{
                color: NT.primary,
                textShadow: `0 0 32px ${hexToRgba(N.amber, 0.6)}`,
              }}
            >
              completado
            </div>
            <div
              className="mt-5 font-ui text-[11px] uppercase tracking-[0.32em]"
              style={{ color: NT.soft }}
            >
              {mission.completionLog}
            </div>
          </div>
        </div>
      )}

      {/* ─── Header · MASTHEAD editorial minimal ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        {/* Top folio · marca whisper (izq) · índice tabular (der) */}
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
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              night protocol
            </span>
          </span>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(phaseIndex).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            {String(totalPhases).padStart(2, '0')}
          </span>
        </div>
        {/* Hairline progress · más fino y suave */}
        <div className="relative h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, globalProgress * 100))}%`,
              background: N.amber,
              boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.5)}`,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          V5 · diseño unificado para todas las fases
            - Título hero centrado + timer tipográfico.
            - Sub-steps como filas tipo jeton (tap a expandir).
            - Footer con CTA ámbar + controles hairline + skip.
          ════════════════════════════════════════════════════════ */}
      <>
        <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4">
          {/* TOP CORNERS · numeral pequeño izq */}
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className="font-mono tabular-nums font-[600]"
              style={{
                color: NT.primary,
                fontSize: 13,
                letterSpacing: '0.02em',
              }}
            >
              {String(phaseIndex).padStart(2, '0')}
              <span style={{ color: N.amber }}>.</span>
            </span>
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              · {mission.blockLabel.toLowerCase()} ·
            </span>
          </div>

          {/* CENTER · título como hero (kaploom-style) + timer debajo */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 my-4">
            {/* TÍTULO HERO · grande, centrado */}
            <h1
              className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
              style={{
                color: NT.primary,
                fontSize: 'clamp(2.4rem, 9vw, 3.6rem)',
                lineHeight: 0.95,
                textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
                textWrap: 'balance' as never,
                maxWidth: '14ch',
              }}
            >
              {mission.title.toLowerCase()}
              <span style={{ color: N.amber }}>.</span>
            </h1>

            {/* Hero principal · breath orb / timer ring (estilo V1, grande) */}
            {mission.interaction === 'breath' && started ? (
              <div className="flex flex-col items-center gap-3 mt-2">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <div
                    aria-hidden
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      inset: -32,
                      background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.4)} 0%, transparent 70%)`,
                      filter: 'blur(20px)',
                      transform: breathPhase === 'inhale' || breathPhase === 'hold' ? 'scale(1.3)' :
                                  breathPhase === 'exhale' ? 'scale(0.85)' : 'scale(1)',
                      opacity: breathPhase === 'rest' ? 0.5 : 0.95,
                      transition: breathPhase === 'inhale' ? 'transform 4s ease-in-out, opacity 4s ease-in-out' :
                                   breathPhase === 'exhale' ? 'transform 8s ease-in-out, opacity 8s ease-in-out' :
                                                               'transform 1s ease-in-out, opacity 1s ease-in-out',
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
                      boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 44px ${hexToRgba(N.amber, 0.5)}`,
                      transform: breathPhase === 'inhale' || breathPhase === 'hold' ? 'scale(1.12)' :
                                  breathPhase === 'exhale' ? 'scale(0.82)' : 'scale(1)',
                      transition: breathPhase === 'inhale' ? 'transform 4s ease-in-out' :
                                   breathPhase === 'exhale' ? 'transform 8s ease-in-out' :
                                                               'transform 1s ease-in-out',
                    }}
                  >
                    <BreathFace phase={breathPhase} ink={N.void} accent={N.candle} />
                  </div>
                </div>
                <div
                  className="font-headline font-[600] uppercase tabular-nums tracking-[-0.015em]"
                  style={{ color: NT.primary, fontSize: 22, lineHeight: 1 }}
                >
                  {breathPhase === 'inhale' ? 'INHALA · 4' :
                   breathPhase === 'hold'   ? 'SOSTÉN · 7' :
                   breathPhase === 'exhale' ? 'EXHALA · 8' :
                                              'RESPIRA'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono uppercase tracking-[0.4em] font-[600]" style={{ color: NT.muted, fontSize: 8.5 }}>
                    ciclo
                  </span>
                  <span className="font-mono tabular-nums" style={{ color: N.amber, fontSize: 11 }}>
                    {String(breathCycle).padStart(2, '0')} / 04
                  </span>
                </div>
              </div>
            ) : hasTimer ? (
              // Timer tipográfico · sin anillo, sólo número grande + barra ámbar.
              // Encaja con el lenguaje del título y los numerales del header.
              <button
                onClick={started ? handlePauseResume : undefined}
                disabled={!started}
                className="flex flex-col items-center gap-2 w-full max-w-[260px] transition-opacity active:opacity-80"
                style={{ cursor: started ? 'pointer' : 'default' }}
              >
                {/* Tiempo grande, tabular */}
                <div
                  className="font-headline font-[200] tabular-nums leading-none"
                  style={{
                    color: NT.primary,
                    fontSize: 'clamp(2.4rem, 9vw, 3.4rem)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {formatTime(timer.remaining)}
                </div>
                {/* Barra de progreso fina */}
                <div
                  className="w-full relative"
                  style={{ height: 1.5, background: hexToRgba(N.amber, 0.15) }}
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
                {/* Caption */}
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono uppercase tracking-[0.4em] font-[600]"
                    style={{ color: NT.muted, fontSize: 9 }}
                  >
                    {timer.isPaused ? 'en pausa' : started ? 'restante' : `de ${formatTime(durationSec)}`}
                  </span>
                  {timer.isPaused && (
                    <span style={{ width: 4, height: 4, background: N.amber, borderRadius: 99, opacity: 0.8 }} />
                  )}
                </div>
              </button>
            ) : null}
          </div>

          {/* SUB-STEPS · editorial spec-sheet · barra ámbar + numeral
               + CAPS title + descripción muted. Encaja con masthead. */}
          {mission.subSteps && mission.subSteps.length > 0 && (
            <div
              className="w-full mt-3 mb-2"
              style={{ borderTop: `1px solid ${hexToRgba(N.amber, 0.18)}` }}
            >
              {mission.subSteps.map((step, i) => (
                <StepCardRow key={i} step={step} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* V5 Footer · estilo V1 · iniciar/skip + controles */}
        <div
          className="relative z-10 w-full max-w-xl mx-auto px-6 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <div
            className="flex items-center justify-between gap-4 pt-4"
            style={{ borderTop: `1px solid ${hexToRgba(N.amber, 0.15)}` }}
          >
            {!started && hasTimer ? (
              // CTA primario · rectangular ámbar (encaja con la barra de progreso)
              <button
                onClick={handleStart}
                className="flex items-center gap-3 transition-transform active:scale-[0.985]"
                style={{
                  padding: '13px 24px',
                  background: N.amber,
                  color: N.void,
                  boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
                }}
              >
                <Play size={12} strokeWidth={2.6} fill="currentColor" />
                <span className="font-mono font-[700] tracking-[0.32em] uppercase" style={{ fontSize: 10.5 }}>
                  {mission.interaction === 'read' ? 'empezar' :
                   mission.interaction === 'journal' ? 'abrir' :
                                                       'iniciar'}
                </span>
              </button>
            ) : !hasTimer ? (
              <button
                onClick={handleManualComplete}
                className="font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
                style={{
                  padding: '13px 28px',
                  background: N.amber,
                  color: N.void,
                  fontSize: 10.5,
                  boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
                }}
              >
                confirmar
              </button>
            ) : (
              // Controles activos · hairline cuadrados con label mono debajo
              <div className="flex items-stretch">
                <V5HairlineButton
                  onClick={handlePauseResume}
                  label={timer.isRunning ? 'pausar' : 'reanudar'}
                  icon={timer.isRunning
                    ? <Pause size={14} strokeWidth={2.2} />
                    : <Play size={14} strokeWidth={2.2} fill="currentColor" />}
                />
                <V5Divider />
                <V5HairlineButton
                  onClick={handleAddMinute}
                  label="+1 min"
                  icon={<Plus size={14} strokeWidth={2.2} />}
                />
                <V5Divider />
                <V5HairlineButton
                  onClick={handleManualComplete}
                  label={mission.interaction === 'read' ? 'terminé' : 'hecho'}
                  icon={mission.interaction === 'read'
                    ? <BookOpen size={14} strokeWidth={2.2} />
                    : <Check size={14} strokeWidth={2.2} />}
                />
              </div>
            )}

            {/* Skip whisper · mismo lenguaje mono que el caption del timer */}
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 transition-opacity active:opacity-50 shrink-0"
              style={{ color: NT.muted, opacity: 0.6 }}
            >
              <span className="font-mono uppercase tracking-[0.4em] font-[600]" style={{ fontSize: 9 }}>
                saltar
              </span>
              <SkipForward size={11} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </>
      {/* Journal overlay */}
      {showJournalOverlay && (
        <NightJournal onClose={() => setShowJournalOverlay(false)} />
      )}
    </div>
  );
}

// V5 · step row · estilo jeton-inspired · solo título visible.
// Tap revela descripción como whisper. Numeral pequeño + dot ámbar.
function StepCardRow({
  step,
  index,
}: {
  step: { label: string; description: string };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { palette: N, paletteText: NT } = useNightPalette();
  return (
    <button
      onClick={() => setExpanded((e) => !e)}
      className="w-full text-left py-3.5 flex items-baseline gap-4 transition-opacity active:opacity-70"
      style={{ borderBottom: `1px solid ${hexToRgba(N.amber, 0.1)}` }}
    >
      {/* Numeral pequeño tabular */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: hexToRgba(N.amber, 0.55),
          fontSize: 11,
          letterSpacing: '0.1em',
          width: 22,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Título + (whisper opcional) */}
      <span className="flex-1 min-w-0">
        <span
          className="font-headline font-[600] lowercase tracking-[-0.015em] block"
          style={{ color: NT.primary, fontSize: 16, lineHeight: 1.25 }}
        >
          {step.label.toLowerCase()}
          <span style={{ color: N.amber, marginLeft: 1 }}>.</span>
        </span>
        {expanded && (
          <span
            className="block mt-1.5 leading-[1.5]"
            style={{ color: NT.soft, fontSize: 12.5, opacity: 0.85 }}
          >
            {step.description}
          </span>
        )}
      </span>

      {/* Plus indicator (rota a × cuando expanded) */}
      <span
        className="shrink-0 mt-1 transition-transform"
        style={{
          color: hexToRgba(N.amber, 0.7),
          fontSize: 14,
          lineHeight: 1,
          transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        +
      </span>
    </button>
  );
}

// V5 · hairline control · ícono arriba + label mono debajo, sin caja
// (eco del lenguaje editorial: hairlines, mono caps, sin radius).
function V5HairlineButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const { palette: N, paletteText: NT } = useNightPalette();
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-1.5 px-4 py-2 transition-opacity active:opacity-60"
      style={{ color: N.amber }}
    >
      {icon}
      <span
        className="font-mono uppercase tracking-[0.32em] font-[600]"
        style={{ fontSize: 8.5, color: NT.muted }}
      >
        {label}
      </span>
    </button>
  );
}

// V5 · vertical hairline divisor entre controles
function V5Divider() {
  const { palette: N } = useNightPalette();
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        alignSelf: 'stretch',
        background: hexToRgba(N.amber, 0.18),
        margin: '4px 0',
      }}
    />
  );
}

function V3IconLink({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  // V3: text-link icon button — sin borde ni fondo, solo color ámbar
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1 transition-opacity active:opacity-60"
      style={{ color: NIGHT_CALM.amber }}
    >
      {children}
      <span
        className="font-mono uppercase tracking-[0.34em] font-[600]"
        style={{ fontSize: 8.5, color: NIGHT_CALM_TEXT.muted }}
      >
        {label}
      </span>
    </button>
  );
}

function ControlButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  // Rectangular (no rounded-full) for newspaper consistency
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 flex items-center justify-center transition-transform active:scale-[0.92]"
      style={{
        border: `1px solid ${hexToRgba(NIGHT_CALM.amber, 0.4)}`,
        background: hexToRgba(NIGHT_CALM.amber, 0.08),
        color: NIGHT_CALM_TEXT.primary,
      }}
    >
      {children}
    </button>
  );
}

// Newspaper section header: ─ · NAME · ───────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-5 pb-3">
      <span
        className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
        style={{ color: NIGHT_CALM.amber, fontSize: 9.5 }}
      >
        · {children} ·
      </span>
      <span
        className="flex-1"
        style={{ height: 1, background: hexToRgba(NIGHT_CALM.amber, 0.2) }}
      />
    </div>
  );
}

// Roman numerals i, ii, iii, iv, v, vi, vii, viii, ix, x …
function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let out = '';
  let rem = n;
  for (const [val, sym] of map) {
    while (rem >= val) { out += sym; rem -= val; }
  }
  return out;
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

// ─── BreathFace · cara expresiva sobre el orb 4-7-8 ─────────────
// Cambia con la fase respiratoria:
//   inhale → ojos cerrados curvos + sonrisa amplia
//   hold   → ojos suavemente cerrados + boca pequeña en línea (mejillas infladas)
//   exhale → ojos relajados + boca redonda "O" soplando
//   rest   → ojos cerrados dormilones + sonrisa serena
function BreathFace({
  phase,
  ink,
  accent,
}: {
  phase: BreathPhase;
  ink: string;
  accent: string;
}) {
  // Posiciones base · ojos a 38% y 62% en x, 42% en y; boca a 50%, 65% en y.
  // Trabajamos en viewBox 100x100 y dejamos que el SVG escale al div.
  const eyeY = 42;
  const mouthY = 65;

  // Fase-específico
  let leftEye: React.ReactNode;
  let rightEye: React.ReactNode;
  let mouth: React.ReactNode;
  let cheekOpacity = 0;

  if (phase === 'inhale') {
    // Ojos curvados hacia arriba (sonrisa de ojos), boca abierta sonriente.
    leftEye = (
      <path d={`M 32 ${eyeY + 2} Q 38 ${eyeY - 3} 44 ${eyeY + 2}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    );
    rightEye = (
      <path d={`M 56 ${eyeY + 2} Q 62 ${eyeY - 3} 68 ${eyeY + 2}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    );
    mouth = (
      <path d={`M 40 ${mouthY} Q 50 ${mouthY + 8} 60 ${mouthY}`} stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />
    );
    cheekOpacity = 0.35;
  } else if (phase === 'hold') {
    // Ojos cerrados (líneas casi rectas), boca pequeña recta, mejillas marcadas.
    leftEye = (
      <line x1="32" y1={eyeY + 1} x2="44" y2={eyeY + 1} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    );
    rightEye = (
      <line x1="56" y1={eyeY + 1} x2="68" y2={eyeY + 1} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    );
    mouth = (
      <line x1="46" y1={mouthY + 4} x2="54" y2={mouthY + 4} stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
    );
    cheekOpacity = 0.7; // mejillas infladas
  } else if (phase === 'exhale') {
    // Ojos relajados (curva ligera hacia abajo), boca redonda "O" soplando.
    leftEye = (
      <path d={`M 32 ${eyeY} Q 38 ${eyeY + 3} 44 ${eyeY}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    );
    rightEye = (
      <path d={`M 56 ${eyeY} Q 62 ${eyeY + 3} 68 ${eyeY}`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    );
    mouth = (
      <ellipse cx="50" cy={mouthY + 5} rx="4.5" ry="6" fill="none" stroke={ink} strokeWidth="2.4" />
    );
    cheekOpacity = 0.2;
  } else {
    // rest · ojos cerrados dormilones + sonrisa serena
    leftEye = (
      <path d={`M 32 ${eyeY + 1} Q 38 ${eyeY - 1} 44 ${eyeY + 1}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
    );
    rightEye = (
      <path d={`M 56 ${eyeY + 1} Q 62 ${eyeY - 1} 68 ${eyeY + 1}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
    );
    mouth = (
      <path d={`M 42 ${mouthY + 2} Q 50 ${mouthY + 6} 58 ${mouthY + 2}`} stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
    );
    cheekOpacity = 0.25;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ transition: 'opacity 600ms ease-in-out' }}
    >
      {/* Cheek blushes */}
      <ellipse cx="26" cy="58" rx="6" ry="3.5" fill={accent} opacity={cheekOpacity} />
      <ellipse cx="74" cy="58" rx="6" ry="3.5" fill={accent} opacity={cheekOpacity} />
      {/* Eyes & mouth — wrap so we can crossfade */}
      <g key={phase} style={{ animation: 'maBreathFaceFade 500ms ease-out' }}>
        {leftEye}
        {rightEye}
        {mouth}
      </g>
    </svg>
  );
}
