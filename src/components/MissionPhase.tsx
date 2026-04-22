'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { type Mission, formatTime, MISSIONS } from '@/lib/constants';
import type { Operator } from '@/lib/operator';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenOpenRef = useRef(false);
  const coachingIndexRef = useRef(0);

  const totalDuration = mission.duration;
  const totalPhases = MISSIONS.length;

  // ═══ Operator voice — opening line ═══
  useEffect(() => {
    if (!operator || spokenOpenRef.current) return;
    spokenOpenRef.current = true;
    const t = setTimeout(() => {
      operator.speak(mission.voiceLine, { rate: 0.93 });
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

  // ═══ GSAP entrance ═══
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', delay: 0.2 });
      }
      if (timerRef.current) {
        gsap.fromTo(timerRef.current,
          { scale: 0.82, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.4)', delay: 0.45 });
      }
      if (buttonRef.current) {
        gsap.fromTo(buttonRef.current,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.75 });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // ═══ Timer countdown ═══
  useEffect(() => {
    if (!started || mission.duration === 0) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => {
            audioTransition?.();
            if (mission.voiceLineComplete) {
              operator?.speak(mission.voiceLineComplete, { rate: 0.9 });
            }
            onComplete();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, mission.duration, mission.voiceLineComplete, onComplete, audioTransition, operator]);

  // ═══ Mid-phase coaching ═══
  useEffect(() => {
    if (!started || !mission.coachingLines || mission.coachingLines.length === 0) return;
    if (mission.duration < 60) return; // skip very short missions
    const interval = Math.floor(mission.duration / (mission.coachingLines.length + 1));
    if (interval < 30) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    mission.coachingLines.forEach((line, idx) => {
      const delay = interval * (idx + 1) * 1000;
      timers.push(setTimeout(() => {
        operator?.speak(line, { rate: 0.93 });
        coachingIndexRef.current = idx + 1;
      }, delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [started, mission, operator]);

  const handleStart = useCallback(() => {
    setStarted(true);
    audioTransition?.();
    onStrike?.();
  }, [audioTransition, onStrike]);

  const handleManualComplete = useCallback(() => {
    onStrike?.();
    if (mission.voiceLineComplete) {
      operator?.speak(mission.voiceLineComplete, { rate: 0.9 });
    }
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 1.15, opacity: 0, duration: 0.3,
        onComplete: () => { audioTransition?.(); onComplete(); }
      });
    } else { audioTransition?.(); onComplete(); }
  }, [onComplete, audioTransition, mission.voiceLineComplete, operator, onStrike]);

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
    <div ref={containerRef} className="flex-1 flex flex-col items-center px-5 py-4 relative overflow-hidden">
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
        className="flex-1 w-full max-w-md overflow-y-auto flex flex-col items-center pb-6 relative z-10"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Block label */}
        {mission.blockLabel && (
          <div
            className="w-full text-center mb-2 py-1"
            style={{ borderBottom: '1px solid rgba(201,162,39,0.15)' }}
          >
            <span
              className="text-[11px] tracking-[0.4em] font-bold"
              style={{
                color: 'rgba(201,162,39,0.5)',
                fontFamily: 'var(--font-cinzel), Georgia, serif',
              }}
            >
              {mission.blockLabel}
            </span>
          </div>
        )}

        {/* Phase indicator */}
        <div className="flex items-center gap-2 mb-2 self-start">
          <span className="text-[12px] tracking-[0.3em]" style={{ color: 'rgba(201,162,39,0.55)' }}>
            FASE {mission.phase}/{totalPhases}
          </span>
          {mission.scheduledTime && (
            <span className="text-[11px] tracking-wider" style={{ color: 'rgba(201,162,39,0.35)' }}>
              ⏱ {mission.scheduledTime}
            </span>
          )}
        </div>

        {/* Codename + kanji reading */}
        <div
          className="text-[13px] tracking-[0.5em] mb-1"
          style={{ color: 'rgba(201,162,39,0.45)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
        >
          {mission.icon} {mission.codename} · {mission.kanjiReading}
        </div>

        {/* Title */}
        <div
          ref={titleRef}
          className="text-2xl md:text-3xl font-bold ember-text mb-4 text-center"
          style={{
            color: WASHI,
            fontFamily: 'var(--font-cinzel), Georgia, serif',
            letterSpacing: '0.15em',
          }}
        >
          {mission.title}
        </div>

        {/* Timer ring / action button / breathing */}
        {mission.duration > 0 && !mission.breathingPattern ? (
          <div ref={timerRef} className="relative w-44 h-44 mb-4 shrink-0">
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
                  <span className="text-3xl">▶</span>
                  <span className="text-[13px] tracking-[0.3em]">INICIAR</span>
                </button>
              )}
            </div>
          </div>
        ) : mission.duration === 0 ? (
          <button
            ref={buttonRef}
            onClick={handleManualComplete}
            className="relative w-36 h-36 mb-4 group shrink-0"
          >
            <div
              className="absolute inset-0 rounded-full animate-ember-pulse"
              style={{ border: '1px solid rgba(201,162,39,0.3)' }}
            />
            <div
              className="absolute inset-2 rounded-full"
              style={{ border: '1px solid rgba(201,162,39,0.2)' }}
            />
            <div
              className="absolute inset-5 rounded-full flex flex-col items-center justify-center transition-all duration-300 ember-border group-hover:brightness-125 group-active:brightness-90"
              style={{
                background: 'rgba(201,162,39,0.08)',
                border: '1px solid rgba(201,162,39,0.45)',
              }}
            >
              <span className="text-3xl mb-1" style={{ color: HINOMARU }}>◉</span>
              <span
                className="text-[13px] tracking-[0.2em] font-semibold"
                style={{ color: KIN, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
              >
                CONFIRMAR
              </span>
            </div>
          </button>
        ) : null}

        {/* Breathing guide */}
        {mission.breathingPattern && (
          <div ref={timerRef} className="mb-4 w-full flex flex-col items-center">
            <BreathingGuide />
          </div>
        )}

        {/* System log */}
        <div className="w-full space-y-2 mb-3">
          <div className="text-[14px] tracking-wider" style={{ color: 'rgba(201,162,39,0.65)' }}>
            <span style={{ color: 'rgba(201,162,39,0.35)' }}>{'>'} </span>{systemText}
            <span className="animate-pulse" style={{ color: KIN }}>█</span>
          </div>

          {showDirective && (
            <div
              className="p-3 rounded hud-frame hud-frame-bottom"
              style={{
                border: '1px solid rgba(201,162,39,0.12)',
                background: 'rgba(201,162,39,0.03)',
              }}
            >
              <p className="text-[15px] leading-relaxed tracking-wide" style={{ color: 'rgba(232,220,196,0.78)' }}>
                {typewriterText}
                {typewriterText.length < mission.directive.length && (
                  <span className="animate-pulse" style={{ color: KIN }}>█</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Sub-steps checklist */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <div className="w-full mb-3">
            <div className="text-[12px] tracking-[0.25em] mb-2" style={{ color: 'rgba(201,162,39,0.4)' }}>
              PASOS A SEGUIR
            </div>
            <div className="space-y-1.5">
              {mission.subSteps.map((step, idx) => {
                const checked = checkedSteps.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className="w-full flex items-start gap-2 p-2.5 rounded transition-all text-left"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: checked ? 'rgba(122,140,90,0.4)' : 'rgba(201,162,39,0.1)',
                      background: checked ? 'rgba(122,140,90,0.04)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[12px]"
                      style={{
                        borderColor: checked ? MOSS : 'rgba(201,162,39,0.35)',
                        background: checked ? 'rgba(122,140,90,0.2)' : 'transparent',
                        color: checked ? MOSS : 'transparent',
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <span
                        className="text-[15px] font-medium tracking-wide"
                        style={{
                          color: checked ? 'rgba(122,140,90,0.75)' : 'rgba(232,220,196,0.75)',
                          textDecoration: checked ? 'line-through' : 'none',
                        }}
                      >
                        {step.label}
                      </span>
                      {step.optional && (
                        <span className="text-[11px] ml-2" style={{ color: 'rgba(201,162,39,0.55)' }}>
                          OPCIONAL
                        </span>
                      )}
                      <p className="text-[13px] mt-0.5" style={{ color: 'rgba(232,220,196,0.35)' }}>
                        {step.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Journaling */}
        {mission.hasJournaling && <JournalingPrompt />}

        {/* Daily Insight */}
        {mission.hasDailyInsight && <DailyInsight />}

        {/* Science Note */}
        {mission.scienceNote && (
          <div className="w-full mt-3">
            <button
              onClick={() => setShowScience(!showScience)}
              className="text-[12px] tracking-[0.2em] transition-colors hover:brightness-150"
              style={{ color: 'rgba(201,162,39,0.4)' }}
            >
              {showScience ? '▾' : '▸'} ¿POR QUÉ FUNCIONA?
            </button>
            {showScience && (
              <div
                className="mt-2 p-3 rounded text-[14px] leading-relaxed"
                style={{
                  border: '1px solid rgba(201,162,39,0.1)',
                  background: 'rgba(201,162,39,0.015)',
                  color: 'rgba(232,220,196,0.45)',
                }}
              >
                {mission.scienceNote}
              </div>
            )}
          </div>
        )}

        {/* Tip */}
        {currentTip && (
          <div className="w-full mt-3 text-[13px] tracking-wider" style={{ color: 'rgba(232,220,196,0.3)' }}>
            <span style={{ color: 'rgba(201,162,39,0.45)' }}>TIP:</span> {currentTip}
          </div>
        )}

        {/* Progress bar */}
        {mission.duration > 0 && started && !mission.breathingPattern && (
          <div className="w-full mt-4">
            <div
              className="flex justify-between text-[11px] tracking-widest mb-1"
              style={{ color: 'rgba(201,162,39,0.4)' }}
            >
              <span>PROGRESO</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(232,220,196,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress * 100}%`, background: KIN }}
              />
            </div>
          </div>
        )}

        {/* Skip (testing) */}
        <button
          onClick={() => {
            audioTransition?.();
            if (mission.voiceLineComplete) operator?.speak(mission.voiceLineComplete, { rate: 0.9 });
            onComplete();
          }}
          className="mt-6 mb-4 px-6 py-2 rounded text-[12px] tracking-[0.2em] transition-all shrink-0 hover:brightness-125"
          style={{
            border: '1px solid rgba(188,0,45,0.3)',
            color: 'rgba(188,0,45,0.7)',
            background: 'rgba(188,0,45,0.04)',
          }}
        >
          ⏭ SALTAR FASE
        </button>
      </div>
    </div>
  );
}
