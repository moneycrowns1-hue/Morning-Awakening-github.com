'use client';

// ═══════════════════════════════════════════════════════════
// WellnessSessionRunner · runner compartido por los 3 modos
// del Hub Bienestar (Bruxismo, Meditación profunda, Drenaje
// linfático).
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio con dot ámbar + caption mono "wellness · {kicker}"
//     y numeral tabular "01—NN" del paso actual.
//   - Hairline progress bar 1px ámbar (progreso global de la
//     sesión, no del paso).
//   - Hero · título lowercase grande con punto ámbar + orb
//     central con pulso sincronizado al cue + tipógrafo del
//     countdown debajo.
//   - Step rows · jeton-style con numeral tabular + label +
//     duración mono · hairline bottom border ámbar.
//   - Footer · V5 hairline buttons (saltar · pausar/abandonar)
//     con label mono debajo de ícono.
//
// Paleta · usa useNightPalette() para vivir en sync con la
// paleta global elegida en NightWelcome / Settings.
//
// v2 — Deep meditation enhancements:
//   · MeditationScene replaces the generic orb for deep_meditation
//   · Floating particles behind the scene
//   · Meditation voice audio plays at each step change
//   · Optional subtitles overlay (off by default)
//   · All gated behind isMeditation — bruxism/lymphatic untouched
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ChevronLeft, SkipForward, Check } from 'lucide-react';
import { AudioEngine } from '@/lib/common/audioEngine';
import { markHabit } from '@/lib/common/habits';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import type { WellnessRoutine, WellnessStep, WellnessCue } from '@/lib/wellness/wellnessRoutines';
import MeditationScene from './MeditationScene';
import { playStepAudio, stopStepAudio } from '@/lib/wellness/meditationAudio';

interface WellnessSessionRunnerProps {
  routine: WellnessRoutine;
  onComplete: () => void;
  onCancel: () => void;
  /** Show voice script as subtitles (only for deep_meditation). */
  subtitlesEnabled?: boolean;
}

export default function WellnessSessionRunner({
  routine,
  onComplete,
  onCancel,
  subtitlesEnabled = false,
}: WellnessSessionRunnerProps) {
  // Paleta activa global · sigue al picker de NightWelcome / Settings.
  const { palette: N, paletteText: NT } = useNightPalette();

  // Deep meditation flag — gates all meditation-specific rendering.
  // Bruxism and lymphatic routines are completely unaffected.
  const isMeditation = routine.id === 'deep_meditation';
  const meditationMode = routine.meditationMode;

  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => routine.steps[0]?.durationSec ?? 0);
  const [completing, setCompleting] = useState(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  /** Previous step index for transition animation direction. */
  const prevStepRef = useRef(0);

  const step: WellnessStep | undefined = routine.steps[stepIdx];

  // ── Audio init + opening bowl. ────────────────────────────
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
      // Clean up meditation audio on unmount.
      stopStepAudio();
    };
  }, []);

  // ── Entrance fade. ─────────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
    );
  }, []);

  // ── Drive the pulse animation based on the current step's cue.
  useEffect(() => {
    // Skip orb animation for meditation — MeditationScene handles its own.
    if (isMeditation) return;
    if (!orbRef.current || !step) return;
    const el = orbRef.current;
    gsap.killTweensOf(el);
    const cue = step.cue ?? 'rest';
    runCueAnimation(el, cue);
  }, [step, isMeditation]);

  // ── Meditation voice audio: play mp3 at each step change.
  useEffect(() => {
    if (!isMeditation || !meditationMode || !step) return;
    void playStepAudio(meditationMode, step.id);
    return () => { stopStepAudio(); };
  }, [stepIdx, isMeditation, meditationMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract current milestone id for MeditationScene.
  const currentMilestoneId = step?.id.replace(/^practice_/, '') ?? 'opening';

  // ── Step transition animation (meditation only) ────────────
  useEffect(() => {
    if (!isMeditation || !contentRef.current) return;
    // Only animate if step actually changed (not initial mount).
    if (prevStepRef.current === stepIdx && stepIdx === 0) {
      prevStepRef.current = stepIdx;
      return;
    }
    const el = contentRef.current;
    const dir = stepIdx > prevStepRef.current ? 1 : -1;
    prevStepRef.current = stepIdx;

    // Fade out → slide up → fade in.
    gsap.fromTo(el,
      { opacity: 0.3, y: dir * 18 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'y' },
    );
  }, [stepIdx, isMeditation]);

  // ── Countdown. ────────────────────────────────────────────
  useEffect(() => {
    if (completing || !step) return;
    if (secondsLeft <= 0) {
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
    setSecondsLeft(0);
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined' && !completing) {
      const ok = window.confirm('¿Interrumpir la sesión? El hábito de hoy no se marcará.');
      if (!ok) return;
    }
    haptics.warn();
    onCancel();
  };

  // ── Global session progress (0..1) ────────────────────────
  // Suma de duraciones completadas + parte transcurrida del paso actual.
  const totalSec = routine.steps.reduce((s, x) => s + x.durationSec, 0) || 1;
  const elapsedSec =
    routine.steps.slice(0, stepIdx).reduce((s, x) => s + x.durationSec, 0) +
    ((step?.durationSec ?? 0) - secondsLeft);
  const globalProgress = completing ? 1 : Math.max(0, Math.min(1, elapsedSec / totalSec));

  // ─── MEDITATION MODE: Headspace-style full-screen player ──
  // Ref for center content fade transitions between steps.
  const centerRef = useRef<HTMLDivElement>(null);

  // Animate center content on step change (fade + gentle slide)
  useEffect(() => {
    if (!isMeditation || !centerRef.current) return;
    if (prevStepRef.current === stepIdx && stepIdx === 0) {
      prevStepRef.current = stepIdx;
      return;
    }
    const el = centerRef.current;
    prevStepRef.current = stepIdx;
    gsap.fromTo(el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', clearProps: 'y' },
    );
  }, [stepIdx, isMeditation]);

  if (isMeditation && meditationMode) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
      >
        {/* Full-screen wave background */}
        <MeditationScene
          mode={meditationMode}
          milestone={currentMilestoneId}
          completing={completing}
        />

        {/* Floating particles over the waves */}
        <MeditationParticles N={N} />

        {/* Top bar — X close + step counter */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span
            className="font-mono tabular-nums tracking-[0.2em] font-[500]"
            style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          >
            {String(Math.min(stepIdx + 1, routine.steps.length)).padStart(2, '0')}
            <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
            {String(routine.steps.length).padStart(2, '0')}
          </span>
        </div>

        {/* Center — animated content area */}
        <div
          ref={centerRef}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
        >
          {completing ? (
            /* ── Completion · zen ripple + text ── */
            <div className="flex flex-col items-center gap-6">
              {/* Expanding ripple rings */}
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                {[0, 0.7, 1.4].map((delay, i) => (
                  <circle
                    key={i}
                    cx="50" cy="50" r="15"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1 - i * 0.2}
                  >
                    <animate attributeName="r" from="12" to="45" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                  </circle>
                ))}
                <text
                  x="50" y="54"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.9)"
                  fontSize="24"
                  fontFamily="var(--font-headline)"
                  fontWeight="700"
                >
                  ✓
                </text>
              </svg>

              <p
                className="font-headline font-[600] lowercase tracking-[-0.02em] text-center"
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}
              >
                sesión completa
              </p>
              <p
                className="font-ui text-[12px] text-center max-w-[26ch]"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Hábito de hoy registrado. Vuelve cuando lo necesites.
              </p>
            </div>
          ) : (
            <>
              {/* Step label — above timer */}
              <span
                className="font-mono uppercase tracking-[0.35em] font-[500]"
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8.5 }}
              >
                {step?.label?.toLowerCase() ?? ''}
              </span>

              {/* Countdown timer */}
              <span
                className="font-headline font-[300] tabular-nums"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 20,
                  letterSpacing: '0.1em',
                }}
              >
                {formatTimer(secondsLeft)}
              </span>

              {/* Central button — white circle (Headspace style) */}
              <button
                onClick={handleSkipStep}
                className="relative transition-transform active:scale-95"
                style={{ width: 72, height: 72 }}
                aria-label="Saltar paso"
              >
                {/* Soft glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    filter: 'blur(14px)',
                    transform: 'scale(1.4)',
                  }}
                />
                {/* Button body */}
                <div
                  className="relative w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 4px 28px rgba(0,0,0,0.12)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4L16 12L6 20V4Z" fill="rgba(0,0,0,0.75)" />
                    <line x1="19" y1="5" x2="19" y2="19" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </button>

              {/* Description whisper — optional, only if step has description */}
              {step?.description && (
                <p
                  className="font-ui text-[11px] text-center max-w-[30ch] leading-[1.5]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  {step.description}
                </p>
              )}
            </>
          )}

          {/* Subtitles — floating overlay */}
          {subtitlesEnabled && step && !completing && step.voiceScript && (
            <div
              className="text-center max-w-[32ch] px-4 mt-2"
              style={{
                padding: '10px 16px',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14,
              }}
            >
              <p
                className="font-ui text-[11.5px] leading-[1.6] italic"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                &ldquo;{step.voiceScript}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Bottom progress bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono tabular-nums"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}
            >
              {formatTimer(elapsedSec)}
            </span>
            <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${globalProgress * 100}%`,
                  background: 'rgba(255,255,255,0.3)',
                  transition: 'width 1s linear',
                }}
              />
            </div>
            <span
              className="font-mono tabular-nums"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}
            >
              {formatTimer(totalSec)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─── DEFAULT MODE: Original editorial layout (bruxism, lymphatic, etc.) ───
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
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 5, height: 5, background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              wellness · {routine.kicker.toLowerCase()}
            </span>
          </span>
          <span
            className="font-mono tabular-nums tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {String(Math.min(stepIdx + 1, routine.steps.length)).padStart(2, '0')}
            </span>
            <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
            {String(routine.steps.length).padStart(2, '0')}
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

      {/* ─── Body ──────────────────────────────────────────── */}
      <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4">
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            {String(Math.min(stepIdx + 1, routine.steps.length)).padStart(2, '0')}
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · {cueLabel(step?.cue).toLowerCase()} ·
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-7 my-4">
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
            style={{
              color: NT.primary,
              fontSize: 'clamp(2rem, 7.5vw, 3rem)',
              lineHeight: 0.95,
              textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
              textWrap: 'balance' as never,
              maxWidth: '14ch',
            }}
          >
            {(completing ? 'sesión completa' : step?.label ?? '').toLowerCase()}
            <span style={{ color: N.amber }}>.</span>
          </h1>

          {/* Orb */}
          <div className="relative" style={{ width: 160, height: 160 }}>
            <div
              aria-hidden
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: -28,
                background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.32)} 0%, transparent 70%)`,
                filter: 'blur(18px)',
                opacity: completing ? 0.5 : 0.85,
                transition: 'opacity 1s ease-in-out',
              }}
            />
            <div
              ref={orbRef}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${N.amber_glow} 35%, ${N.amber} 70%, ${N.candle} 100%)`,
                boxShadow: `inset -10px -10px 28px ${hexToRgba(N.candle, 0.5)}, inset 5px 5px 12px ${hexToRgba('#ffffff', 0.18)}, 0 0 44px ${hexToRgba(N.amber, 0.4)}`,
              }}
            >
              <span
                className="font-headline font-[700] tabular-nums"
                style={{
                  color: N.void,
                  fontSize: completing ? 36 : 30,
                  letterSpacing: '-0.02em',
                  textShadow: `0 1px 2px ${hexToRgba('#ffffff', 0.5)}`,
                }}
              >
                {completing ? '✓' : formatTimer(secondsLeft)}
              </span>
            </div>
          </div>

          {step && !completing && (
            <div className="text-center max-w-[36ch] px-2">
              <p className="font-ui text-[12.5px] leading-[1.55]" style={{ color: NT.soft }}>
                {step.description}
              </p>
              {step.tip && (
                <p
                  className="mt-2 font-mono uppercase tracking-[0.28em] font-[500]"
                  style={{ color: hexToRgba(N.amber, 0.75), fontSize: 9 }}
                >
                  · {step.tip} ·
                </p>
              )}
            </div>
          )}

          {completing && (
            <p
              className="font-ui text-[12.5px] leading-[1.55] text-center max-w-[28ch]"
              style={{ color: NT.soft }}
            >
              Hábito de hoy registrado. Vuelve cuando lo necesites.
            </p>
          )}
        </div>

        {!completing && routine.steps.length <= 8 && (
          <div className="w-full mt-2">
            {routine.steps.map((s, i) => (
              <StepRow
                key={s.id}
                index={i + 1}
                label={s.label}
                durationSec={s.durationSec}
                state={i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'}
                N={N}
                NT={NT}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Footer ─────────────────────────────────────────── */}
      {!completing && step && (
        <div
          className="relative z-10 px-6 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="flex items-stretch">
              <V5HairlineButton
                onClick={handleSkipStep}
                label="saltar paso"
                icon={<SkipForward size={14} strokeWidth={2.2} />}
                N={N}
                NT={NT}
              />
              <V5Divider N={N} />
              <V5HairlineButton
                onClick={handleCancel}
                label="abandonar"
                icon={<ChevronLeft size={14} strokeWidth={2.2} />}
                N={N}
                NT={NT}
              />
            </div>
            <span
              className="font-mono uppercase tracking-[0.4em] font-[600] shrink-0"
              style={{ color: NT.muted, fontSize: 9, opacity: 0.6 }}
            >
              {Math.round((step.durationSec - secondsLeft) / step.durationSec * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

// Floating particles · subtle ambient effect for meditation sessions
function MeditationParticles({ N }: { N: PaletteProps['N'] }) {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 1.5 + Math.random() * 2.5,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 5,
      opacity: 0.08 + Math.random() * 0.15,
    }));
  }, []);

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{ inset: -40, zIndex: -1 }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full sunrise-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: N.amber,
            opacity: p.opacity,
            filter: `blur(${p.size > 3 ? 1 : 0}px)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Step row · jeton estilo NightMissionPhase StepCardRow
function StepRow({
  index,
  label,
  durationSec,
  state,
  N,
  NT,
}: {
  index: number;
  label: string;
  durationSec: number;
  state: 'done' | 'active' | 'pending';
} & PaletteProps) {
  const numeralColor =
    state === 'active' ? N.amber :
    state === 'done'   ? hexToRgba(N.amber, 0.45) :
                         hexToRgba(N.amber, 0.3);
  const labelColor =
    state === 'active' ? NT.primary :
    state === 'done'   ? NT.muted :
                         NT.soft;
  return (
    <div
      className="flex items-baseline gap-4 py-2.5"
      style={{ borderBottom: `1px solid ${hexToRgba(N.amber, 0.1)}` }}
    >
      {/* Numeral tabular */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: numeralColor,
          fontSize: 11,
          letterSpacing: '0.1em',
          fontWeight: state === 'active' ? 700 : 500,
          minWidth: '2ch',
        }}
      >
        {String(index).padStart(2, '0')}
      </span>
      {/* Label · lowercase, tighter tracking */}
      <span
        className="flex-1 font-headline font-[600] lowercase tracking-[-0.01em] truncate"
        style={{
          color: labelColor,
          fontSize: 13.5,
          textDecoration: state === 'done' ? 'line-through' : 'none',
          textDecorationColor: hexToRgba(N.amber, 0.4),
        }}
      >
        {label.toLowerCase()}
      </span>
      {/* Duration mono · suffix */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: state === 'active' ? hexToRgba(N.amber, 0.85) : NT.muted,
          fontSize: 10,
        }}
      >
        {formatStepDuration(durationSec)}
      </span>
      {/* Done check · pequeño */}
      {state === 'done' && (
        <Check size={11} strokeWidth={2.4} style={{ color: hexToRgba(N.amber, 0.7), marginLeft: -4 }} />
      )}
    </div>
  );
}

// V5 hairline button · ícono arriba + label mono debajo, sin caja
function V5HairlineButton({
  onClick,
  icon,
  label,
  N,
  NT,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
} & PaletteProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1.5 px-5 py-2 transition-opacity active:opacity-60"
      style={{ color: N.amber }}
    >
      {icon}
      <span
        className="font-mono uppercase tracking-[0.28em] font-[600]"
        style={{ color: NT.muted, fontSize: 8.5 }}
      >
        {label}
      </span>
    </button>
  );
}

// V5 vertical hairline divider entre controles
function V5Divider({ N }: { N: PaletteProps['N'] }) {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        background: hexToRgba(N.amber, 0.18),
        margin: '6px 0',
      }}
    />
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatTimer(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatStepDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m}m`;
}

function cueLabel(cue: WellnessCue | undefined): string {
  switch (cue) {
    case 'inhale':   return 'Inhala · sostén · exhala';
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
