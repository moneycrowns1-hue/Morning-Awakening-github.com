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
    <div ref={containerRef} className="flex-1 flex flex-col items-center px-6 py-5 relative overflow-hidden">
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
        className="flex-1 w-full max-w-md overflow-y-auto flex flex-col items-center gap-y-10 pb-12 relative z-10"
        style={{ scrollbarWidth: 'none' }}
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
            className="relative w-40 h-40 group shrink-0 my-6"
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
              className="absolute inset-5 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ember-border group-hover:brightness-125 group-active:brightness-90"
              style={{
                background: 'rgba(201,162,39,0.08)',
                border: '1px solid rgba(201,162,39,0.45)',
              }}
            >
              <span
                className="text-3xl"
                style={{
                  color: HINOMARU,
                  fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
                  textShadow: '0 0 10px rgba(188,0,45,0.4)',
                }}
              >
                決
              </span>
              <span
                className="text-[12px] tracking-[0.3em] font-bold"
                style={{ color: KIN, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
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

        {/* Directive card */}
        {showDirective && (
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
                    onClick={() => toggleStep(idx)}
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
              <span className="transition-transform" style={{ transform: showScience ? 'rotate(180deg)' : 'none' }}>▾</span>
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
            audioTransition?.();
            if (mission.voiceLineComplete) operator?.speak(mission.voiceLineComplete, { rate: 0.9 });
            onComplete();
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
