'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { type Mission, formatTime, MISSIONS } from '@/lib/constants';
import type { Operator } from '@/lib/operator';
import { PlayCircle, ChevronDown } from 'lucide-react';
import BreathingGuide from './BreathingGuide';
import DailyInsight from './DailyInsight';
import JournalingPrompt from './JournalingPrompt';

interface MissionPhaseProps {
  mission: Mission;
  onComplete: () => void;
  audioTransition?: () => void;
  operator?: Operator | null;
  onStrike?: () => void;
}

const KIN = '#c9a227';
const WASHI = '#e8dcc4';
const HINOMARU = '#bc002d';
const MOSS = '#7a8c5a';

export default function MissionPhase({
  mission,
  onComplete,
  audioTransition,
  operator,
  onStrike,
}: MissionPhaseProps) {
  const [timeLeft, setTimeLeft] = useState(mission.duration);
  const [started, setStarted] = useState(mission.duration === 0);
  const [typewriterText, setTypewriterText] = useState('');
  const [systemText, setSystemText] = useState('');
  const [showDirective, setShowDirective] = useState(false);
  const [showScience, setShowScience] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  /** Shows the "COMPLETADO" overlay that replaces the old spoken
   *  voiceLineComplete + transition lines. When true, a GSAP timeline
   *  fades it in, holds for ~0.8 s, fades it out, then calls
   *  onComplete() so the parent advances to the next phase. */
  const [showCompletado, setShowCompletado] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenOpenRef = useRef(false);
  const completadoRef = useRef<HTMLDivElement>(null);

  const totalDuration = mission.duration;
  const totalPhases = MISSIONS.length;

  // ═══ Operator voice — single briefing per phase ═══
  // The briefing is one pre-generated Qwen mp3 containing intro +
  // narration + coaching, so voice timbre stays consistent. Plays once
  // at phase mount (after a 600 ms breath) and nothing else is spoken
  // during the phase. Cancelled when COMPLETADO triggers advance.
  useEffect(() => {
    if (!operator || spokenOpenRef.current) return;
    spokenOpenRef.current = true;
    const t = setTimeout(() => {
      operator.speak(mission.voiceLineBriefing, { rate: 0.93 });
    }, 600);
    return () => clearTimeout(t);
  }, [mission, operator]);

  // ═══ Typewriter system log ═══
  useEffect(() => {
    let i = 0;
    const text = mission.systemLog;
    setSystemText('');
    const interval = setInterval(() => {
      if (i <= text.length) { setSystemText(text.slice(0, i)); i++; }
      else { clearInterval(interval); setTimeout(() => setShowDirective(true), 300); }
    }, 30);
    return () => clearInterval(interval);
  }, [mission.systemLog]);

  // ═══ Typewriter directive ═══
  useEffect(() => {
    if (!showDirective) return;
    let i = 0;
    const text = mission.directive;
    setTypewriterText('');
    const interval = setInterval(() => {
      if (i <= text.length) { setTypewriterText(text.slice(0, i)); i++; }
      else clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [showDirective, mission.directive]);

  // ═══ GSAP entrance — fluid choreographed reveal ═══
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Stagger in the top-level sections of the scroll area.
      if (scrollRef.current) {
        const sections = Array.from(
          scrollRef.current.children,
        ) as HTMLElement[];
        gsap.fromTo(
          sections,
          { opacity: 0, y: 24, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.08,
          },
        );
      }

      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, x: -24 },
          { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.15 },
        );
      }
      if (timerRef.current) {
        gsap.fromTo(
          timerRef.current,
          { scale: 0.82, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.9,
            ease: 'back.out(1.4)',
            delay: 0.35,
          },
        );
      }
      if (buttonRef.current) {
        gsap.fromTo(
          buttonRef.current,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.6 },
        );
      }

      // Stagger the checklist items.
      const items =
        containerRef.current?.querySelectorAll<HTMLElement>('[data-step-item]');
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, x: -18 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: 'power2.out',
            stagger: 0.06,
            delay: 0.5,
          },
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, [mission.id]);

  // ═══ Timer countdown ═══
  useEffect(() => {
    if (!started || mission.duration === 0) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Auto-complete: fire the visual COMPLETADO overlay. The
          // overlay animation useEffect will call onComplete when the
          // fade-out finishes. No voice here.
          setTimeout(() => {
            audioTransition?.();
            setShowCompletado(true);
          }, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, mission.duration, audioTransition]);

  // ═══ COMPLETADO overlay animation ═══
  // Drives the visual hand-off between phases: fade-in + scale-up,
  // ~0.8 s hold, fade-out, then onComplete(). Also silences any
  // lingering briefing voice so the next phase starts clean.
  useEffect(() => {
    if (!showCompletado) return;
    operator?.cancel();
    const node = completadoRef.current;
    if (!node) {
      // Fallback: if the overlay node isn't mounted, still advance.
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
    const tl = gsap.timeline();
    tl.fromTo(
      node,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' },
    );
    tl.to(node, {
      opacity: 0,
      duration: 0.3,
      delay: 0.8,
      ease: 'power1.in',
    });
    tl.call(() => {
      onComplete();
    });
    return () => {
      tl.kill();
    };
  }, [showCompletado, onComplete, operator]);

  const handleStart = useCallback(() => {
    setStarted(true);
    audioTransition?.();
    onStrike?.();
  }, [audioTransition, onStrike]);

  const handleManualComplete = useCallback(() => {
    onStrike?.();
    // Play the button exit animation, then show the COMPLETADO overlay.
    // No voice on completion anymore — the overlay is the hand-off.
    const finish = () => {
      audioTransition?.();
      setShowCompletado(true);
    };
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 1.15,
        opacity: 0,
        duration: 0.3,
        onComplete: finish,
      });
    } else {
      finish();
    }
  }, [audioTransition, onStrike]);

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    onStrike?.();
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);
  const currentTip = mission.tips?.[Math.floor(Date.now() / 10000) % (mission.tips?.length || 1)];

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center px-6 py-5 relative overflow-hidden min-h-0">
      {/* ═══ COMPLETADO overlay — replaces the old spoken hand-off ═══ */}
      {showCompletado && (
        <div
          ref={completadoRef}
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(10,10,12,0.94) 0%, rgba(10,10,12,0.82) 60%, rgba(10,10,12,0.6) 100%)',
            backdropFilter: 'blur(6px)',
            opacity: 0,
          }}
        >
          <div className="text-center select-none">
            <div
              className="text-4xl md:text-5xl font-bold tracking-[0.4em]"
              style={{
                color: KIN,
                textShadow: `0 0 24px ${KIN}55, 0 0 48px ${KIN}22`,
                fontFamily: 'var(--font-cinzel), Georgia, serif',
              }}
            >
              COMPLETADO
            </div>
            <div
              className="mt-5 text-[11px] tracking-[0.35em]"
              style={{ color: 'rgba(232,220,196,0.55)' }}
            >
              {mission.completionLog}
            </div>
            <div
              className="mx-auto mt-6 h-px"
              style={{
                width: 120,
                background: `linear-gradient(90deg, transparent, ${KIN}, transparent)`,
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ Giant kanji watermark ═══ */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <span className="kanji-watermark" style={{ fontSize: 'min(46vw, 46vh)' }}>
          {mission.kanji}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="scroll-area flex-1 w-full max-w-md flex flex-col items-center gap-y-10 relative z-10 min-h-0"
        style={{
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* ══════════ ZONE 1: HEADER ══════════ */}
        <header className="w-full flex flex-col items-center">
          {/* Block label */}
          {mission.blockLabel && (
            <div className="w-full text-center mb-6 pb-4" style={{ borderBottom: '1px solid rgba(201,162,39,0.15)' }}>
              <span
                className="text-[10px] tracking-[0.45em] font-bold"
                style={{ color: 'rgba(201,162,39,0.55)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
              >
                {mission.blockLabel}
              </span>
            </div>
          )}

          {/* Phase indicator + schedule */}
          <div className="w-full flex items-center justify-between mb-5">
            <span
              className="text-[11px] tracking-[0.35em] font-bold"
              style={{ color: 'rgba(201,162,39,0.6)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              FASE {mission.phase} / {totalPhases}
            </span>
            {mission.scheduledTime && (
              <span
                className="text-[11px] tracking-[0.25em] px-2.5 py-1 rounded"
                style={{
                  color: 'rgba(201,162,39,0.55)',
                  background: 'rgba(201,162,39,0.06)',
                  border: '1px solid rgba(201,162,39,0.12)',
                }}
              >
                {mission.scheduledTime}
              </span>
            )}
          </div>

          {/* Codename + kanji reading */}
          <div
            className="w-full text-center text-[12px] tracking-[0.5em] mb-3"
            style={{ color: 'rgba(201,162,39,0.45)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            {mission.codename} · {mission.kanjiReading}
          </div>

          {/* Title */}
          <div
            ref={titleRef}
            className="text-2xl md:text-3xl font-bold ember-text text-center"
            style={{
              color: WASHI,
              fontFamily: 'var(--font-cinzel), Georgia, serif',
              letterSpacing: '0.18em',
            }}
          >
            {mission.title}
          </div>
        </header>

        {/* ══════════ ZONE 2: ACTION ALTAR ══════════ */}
        {/* Altar: extra breathing room (my-6) on top of the parent gap, since this is the primary action */}
        {mission.duration > 0 && !mission.breathingPattern ? (
          <div ref={timerRef} className="relative w-48 h-48 shrink-0 my-6">
            <svg className="w-full h-full timer-ring" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(201,162,39,0.08)" strokeWidth="2.5" />
              <circle
                cx="100" cy="100" r="90" fill="none" stroke={KIN} strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ filter: 'drop-shadow(0 0 6px rgba(201,162,39,0.45))' }}
              />
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(201,162,39,0.05)" strokeWidth="1" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {started ? (
                <>
                  <span
                    className="text-3xl font-light tracking-wider ember-text"
                    style={{ color: WASHI, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-[11px] tracking-[0.3em] mt-1" style={{ color: 'rgba(201,162,39,0.45)' }}>
                    RESTANTE
                  </span>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  className="flex flex-col items-center gap-2 transition-colors hover:brightness-125"
                  style={{ color: KIN }}
                >
                  <PlayCircle size={44} strokeWidth={1.3} />
                  <span className="text-[13px] tracking-[0.3em]">INICIAR</span>
                </button>
              )}
            </div>
          </div>
        ) : mission.duration === 0 ? (
          <button
            ref={buttonRef}
            onClick={handleManualComplete}
            className="relative group shrink-0 my-6"
            style={{ width: '180px', height: '180px' }}
          >
            {/* Outer rotating halo */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 200"
              style={{ animation: 'spin-slow 22s linear infinite' }}
              aria-hidden
            >
              <defs>
                <linearGradient id="haloGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(201,162,39,0.0)" />
                  <stop offset="50%" stopColor="rgba(201,162,39,0.65)" />
                  <stop offset="100%" stopColor="rgba(201,162,39,0.0)" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="96" fill="none" stroke="url(#haloGrad)" strokeWidth="1.5" />
              {/* Tick marks like a wax seal */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x1 = 100 + Math.cos(angle) * 92;
                const y1 = 100 + Math.sin(angle) * 92;
                const x2 = 100 + Math.cos(angle) * 86;
                const y2 = 100 + Math.sin(angle) * 86;
                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(201,162,39,0.35)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>

            {/* Middle ember pulse ring */}
            <div
              className="absolute rounded-full animate-ember-pulse"
              style={{
                inset: '18px',
                border: '1px solid rgba(201,162,39,0.25)',
              }}
            />

            {/* Inner coin core */}
            <div
              className="absolute rounded-full flex flex-col items-center justify-center transition-all duration-300 group-hover:brightness-125 group-active:scale-[0.96]"
              style={{
                inset: '30px',
                background:
                  'radial-gradient(circle at 35% 30%, rgba(30,26,19,0.95) 0%, rgba(10,9,8,1) 70%)',
                border: '1.5px solid rgba(201,162,39,0.55)',
                boxShadow:
                  '0 0 25px rgba(201,162,39,0.25), inset 0 0 20px rgba(201,162,39,0.12), inset 0 2px 6px rgba(0,0,0,0.7)',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '42px',
                  lineHeight: 1,
                  color: KIN,
                  fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
                  textShadow: '0 0 14px rgba(201,162,39,0.55), 0 0 3px rgba(188,0,45,0.6)',
                }}
              >
                決
              </span>
              <span
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.4em',
                  fontWeight: 700,
                  color: 'rgba(201,162,39,0.85)',
                  fontFamily: 'var(--font-cinzel), Georgia, serif',
                  paddingLeft: '0.4em',
                }}
              >
                CONFIRMAR
              </span>
            </div>
          </button>
        ) : null}

        {/* Breathing guide */}
        {mission.breathingPattern && (
          <div ref={timerRef} className="w-full flex flex-col items-center">
            <BreathingGuide />
          </div>
        )}

        {/* ══════════ ZONE 3: SYSTEM LOG ══════════ */}
        <div className="w-full text-[13px] tracking-wider px-1" style={{ color: 'rgba(201,162,39,0.7)' }}>
          <span style={{ color: 'rgba(201,162,39,0.4)' }}>{'>'} </span>{systemText}
          <span className="animate-pulse" style={{ color: KIN }}>█</span>
        </div>

        {/* Directive card — shown ONLY when the phase has no subSteps.
            When subSteps exist, they ARE the content (tasks are self-explanatory
            and the operator voice narrates context). For phases like "agua"
            that lack subSteps, the directive IS the instruction. */}
        {showDirective && !mission.subSteps?.length && (
          <div
            className="w-full px-6 py-5 rounded-lg hud-frame hud-frame-bottom"
            style={{
              border: '1px solid rgba(201,162,39,0.15)',
              background: 'rgba(201,162,39,0.035)',
            }}
          >
            <p className="text-[15px] leading-[2] tracking-wide" style={{ color: 'rgba(232,220,196,0.88)' }}>
              {typewriterText}
              {typewriterText.length < mission.directive.length && (
                <span className="animate-pulse" style={{ color: KIN }}>█</span>
              )}
            </p>
          </div>
        )}

        {/* Sub-steps checklist — modern card style */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <section className="w-full">
            <div
              className="text-[11px] tracking-[0.35em] mb-6 font-bold pl-1"
              style={{ color: 'rgba(201,162,39,0.5)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              PASOS A SEGUIR
            </div>
            <div className="space-y-6">
              {mission.subSteps.map((step, idx) => {
                const checked = checkedSteps.has(idx);
                return (
                  <button
                    key={idx}
                    data-step-item
                    onClick={(e) => {
                      toggleStep(idx);
                      // tactile pop when toggled
                      gsap.fromTo(
                        e.currentTarget,
                        { scale: 0.97 },
                        { scale: 1, duration: 0.35, ease: 'back.out(2.2)' },
                      );
                    }}
                    className="w-full flex items-center gap-5 px-6 py-5 rounded-lg transition-all duration-300 text-left hover:brightness-110 active:scale-[0.98]"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: checked ? 'rgba(122,140,90,0.45)' : 'rgba(201,162,39,0.14)',
                      background: checked ? 'rgba(122,140,90,0.06)' : 'rgba(10,9,8,0.35)',
                      boxShadow: checked ? '0 0 12px rgba(122,140,90,0.12)' : 'none',
                    }}
                  >
                    {/* Modern checkbox */}
                    <div
                      className="relative w-6 h-6 rounded-md shrink-0 flex items-center justify-center transition-all duration-300"
                      style={{
                        border: `1.5px solid ${checked ? MOSS : 'rgba(201,162,39,0.4)'}`,
                        background: checked ? MOSS : 'transparent',
                        boxShadow: checked ? `0 0 10px ${MOSS}55` : 'none',
                      }}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-4 h-4"
                          style={{
                            stroke: '#0a0908',
                            strokeWidth: 3.5,
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            animation: 'check-in 0.28s ease-out',
                          }}
                        >
                          <polyline points="5 12 10 17 19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[15px] font-semibold leading-snug"
                        style={{
                          color: checked ? 'rgba(122,140,90,0.85)' : 'rgba(232,220,196,0.95)',
                          opacity: checked ? 0.6 : 1,
                          letterSpacing: '0.02em',
                          textDecoration: checked ? 'line-through' : 'none',
                          textDecorationColor: 'rgba(122,140,90,0.5)',
                        }}
                      >
                        {step.label}
                      </span>
                      {step.optional && (
                        <span
                          className="text-[9px] tracking-[0.2em] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            color: 'rgba(201,162,39,0.85)',
                            background: 'rgba(201,162,39,0.12)',
                            border: '1px solid rgba(201,162,39,0.25)',
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

        {/* Journaling */}
        {mission.hasJournaling && <JournalingPrompt />}

        {/* Daily Insight */}
        {mission.hasDailyInsight && <DailyInsight />}

        {/* ══════════ ZONE 4: FOOTER / META ══════════ */}
        {/* Divider between body and footer (thin gradient hairline) */}
        <div
          className="w-full"
          style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.22), transparent)' }}
          aria-hidden
        />

        {/* Science Note — collapsible card */}
        {mission.scienceNote && (
          <div className="w-full">
            <button
              onClick={() => setShowScience(!showScience)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[11px] tracking-[0.3em] font-bold transition-colors hover:brightness-125"
              style={{
                color: 'rgba(201,162,39,0.65)',
                background: 'rgba(201,162,39,0.04)',
                border: '1px solid rgba(201,162,39,0.12)',
                fontFamily: 'var(--font-cinzel), Georgia, serif',
              }}
            >
              <span>¿POR QUÉ FUNCIONA?</span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className="transition-transform"
                style={{ transform: showScience ? 'rotate(180deg)' : 'none' }}
              />
            </button>
            {showScience && (
              <div
                className="mt-2 px-5 py-4 rounded-lg text-[13px] leading-[1.7]"
                style={{
                  border: '1px solid rgba(201,162,39,0.1)',
                  background: 'rgba(201,162,39,0.02)',
                  color: 'rgba(232,220,196,0.6)',
                }}
              >
                {mission.scienceNote}
              </div>
            )}
          </div>
        )}

        {/* Tip */}
        {currentTip && (
          <div
            className="w-full px-5 py-4 rounded-lg text-[13px] leading-[1.65]"
            style={{
              borderLeft: '2px solid rgba(201,162,39,0.4)',
              background: 'rgba(201,162,39,0.025)',
              color: 'rgba(232,220,196,0.55)',
            }}
          >
            <span
              className="text-[10px] tracking-[0.3em] font-bold mr-2"
              style={{ color: 'rgba(201,162,39,0.7)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              TIP
            </span>
            {currentTip}
          </div>
        )}

        {/* Progress bar */}
        {mission.duration > 0 && started && !mission.breathingPattern && (
          <div className="w-full">
            <div
              className="flex justify-between text-[10px] tracking-[0.3em] mb-1.5 font-bold"
              style={{ color: 'rgba(201,162,39,0.5)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              <span>PROGRESO</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(232,220,196,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${progress * 100}%`,
                  background: KIN,
                  boxShadow: `0 0 8px ${KIN}80`,
                }}
              />
            </div>
          </div>
        )}

        {/* Skip (testing) */}
        <button
          onClick={() => {
            // Dev skip: go straight to the COMPLETADO overlay, same
            // path as the normal completion flow but without the
            // button exit animation.
            audioTransition?.();
            setShowCompletado(true);
          }}
          className="px-7 py-3 rounded-lg text-[11px] tracking-[0.3em] font-bold transition-all shrink-0 hover:brightness-125"
          style={{
            border: '1px solid rgba(188,0,45,0.35)',
            color: 'rgba(188,0,45,0.8)',
            background: 'rgba(188,0,45,0.05)',
            fontFamily: 'var(--font-cinzel), Georgia, serif',
          }}
        >
          SALTAR FASE
        </button>
      </div>
    </div>
  );
}
