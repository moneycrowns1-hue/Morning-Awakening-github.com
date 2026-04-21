'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { type Mission, formatTime, MISSIONS } from '@/lib/constants';
import BreathingGuide from './BreathingGuide';
import DailyInsight from './DailyInsight';
import JournalingPrompt from './JournalingPrompt';

interface MissionPhaseProps {
  mission: Mission;
  onComplete: () => void;
  audioTransition?: () => void;
}

export default function MissionPhase({ mission, onComplete, audioTransition }: MissionPhaseProps) {
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
  const totalDuration = mission.duration;
  const totalPhases = MISSIONS.length;

  // Typewriter for system log
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

  // Typewriter for directive
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

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.fromTo(titleRef.current, { opacity: 0, x: -30, skewX: -10 }, { opacity: 1, x: 0, skewX: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 });
        gsap.to(titleRef.current, { opacity: 0.7, duration: 0.05, repeat: 5, yoyo: true, delay: 0.1 });
      }
      if (timerRef.current) {
        gsap.fromTo(timerRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.4)', delay: 0.5 });
      }
      if (buttonRef.current) {
        gsap.fromTo(buttonRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.8 });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!started || mission.duration === 0) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => { audioTransition?.(); onComplete(); }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [started, mission.duration, onComplete, audioTransition]);

  const handleStart = useCallback(() => { setStarted(true); audioTransition?.(); }, [audioTransition]);

  const handleManualComplete = useCallback(() => {
    if (buttonRef.current) {
      gsap.to(buttonRef.current, { scale: 1.2, opacity: 0, duration: 0.3, onComplete: () => { audioTransition?.(); onComplete(); } });
    } else { audioTransition?.(); onComplete(); }
  }, [onComplete, audioTransition]);

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);
  const currentTip = mission.tips?.[Math.floor(Date.now() / 10000) % (mission.tips?.length || 1)];

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center px-5 py-4 relative overflow-hidden">
      <div ref={scrollRef} className="flex-1 w-full max-w-md overflow-y-auto flex flex-col items-center pb-6" style={{ scrollbarWidth: 'none' }}>
        {/* Block label */}
        {mission.blockLabel && (
          <div className="w-full text-center mb-2 py-1 border-b border-accent/10">
            <span className="text-[11px] tracking-[0.4em] text-accent/25 font-bold">{mission.blockLabel}</span>
          </div>
        )}

        {/* Phase indicator */}
        <div className="flex items-center gap-2 mb-2 self-start">
          <span className="text-[13px] tracking-[0.3em] text-accent/50">PHASE {mission.phase}/{totalPhases}</span>
          {mission.scheduledTime && (
            <span className="text-[12px] text-accent/30 tracking-wider">⏱ {mission.scheduledTime}</span>
          )}
        </div>

        {/* Codename */}
        <div className="text-[14px] tracking-[0.5em] text-accent/30 mb-1">
          {mission.icon} MISSION: {mission.codename} {mission.icon}
        </div>

        {/* Title */}
        <div ref={titleRef} className="text-2xl md:text-3xl font-bold text-accent glow-text mb-4 text-center">
          {mission.title}
        </div>

        {/* Timer ring or action button */}
        {mission.duration > 0 && !mission.breathingPattern ? (
          <div ref={timerRef} className="relative w-44 h-44 mb-4 shrink-0">
            <svg className="w-full h-full timer-ring" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,240,255,0.06)" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="#00F0FF" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,240,255,0.4))' }} />
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(0,240,255,0.04)" strokeWidth="1" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {started ? (
                <>
                  <span className="text-3xl font-light text-accent glow-text tracking-wider">{formatTime(timeLeft)}</span>
                  <span className="text-[12px] tracking-[0.3em] text-accent/35 mt-1">RESTANTE</span>
                </>
              ) : (
                <button onClick={handleStart} className="flex flex-col items-center gap-2 text-accent hover:text-white transition-colors">
                  <span className="text-3xl">▶</span>
                  <span className="text-[13px] tracking-[0.3em]">INICIAR</span>
                </button>
              )}
            </div>
          </div>
        ) : mission.duration === 0 ? (
          <button ref={buttonRef} onClick={handleManualComplete} className="relative w-36 h-36 mb-4 group shrink-0">
            <div className="absolute inset-0 rounded-full border border-accent/30 animate-pulse-glow" />
            <div className="absolute inset-2 rounded-full border border-accent/20" />
            <div className="absolute inset-5 rounded-full bg-accent/5 border border-accent/40 flex flex-col items-center justify-center
              group-hover:bg-accent/10 group-active:bg-accent/20 transition-all duration-300 glow-border">
              <span className="text-3xl text-accent mb-1">⬡</span>
              <span className="text-[13px] tracking-[0.2em] text-accent font-semibold">CONFIRMAR</span>
            </div>
          </button>
        ) : null}

        {/* Breathing Guide */}
        {mission.breathingPattern && (
          <div ref={timerRef} className="mb-4 w-full flex flex-col items-center">
            <BreathingGuide />
          </div>
        )}

        {/* System log */}
        <div className="w-full space-y-2 mb-3">
          <div className="text-[14px] tracking-wider text-accent/60 font-medium">
            <span className="text-accent/30">{'>'} </span>{systemText}
            <span className="animate-pulse text-accent">█</span>
          </div>

          {showDirective && (
            <div className="p-3 border border-accent/10 rounded bg-accent/[0.02] hud-frame hud-frame-bottom">
              <p className="text-[15px] leading-relaxed text-foreground/75 tracking-wide">
                {typewriterText}
                {typewriterText.length < mission.directive.length && <span className="animate-pulse text-accent">█</span>}
              </p>
            </div>
          )}
        </div>

        {/* Sub-steps checklist */}
        {mission.subSteps && mission.subSteps.length > 0 && (
          <div className="w-full mb-3">
            <div className="text-[13px] tracking-[0.2em] text-accent/35 mb-2">PASOS A SEGUIR</div>
            <div className="space-y-1.5">
              {mission.subSteps.map((step, idx) => (
                <button key={idx} onClick={() => toggleStep(idx)}
                  className="w-full flex items-start gap-2 p-2.5 rounded border transition-all text-left"
                  style={{
                    borderColor: checkedSteps.has(idx) ? 'rgba(0,255,136,0.3)' : 'rgba(0,240,255,0.08)',
                    backgroundColor: checkedSteps.has(idx) ? 'rgba(0,255,136,0.03)' : 'transparent',
                  }}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[14px]
                    ${checkedSteps.has(idx) ? 'border-success bg-success/20 text-success' : 'border-accent/30 text-transparent'}`}>
                    ✓
                  </div>
                  <div>
                    <span className={`text-[15px] font-medium tracking-wide ${checkedSteps.has(idx) ? 'text-success/70 line-through' : 'text-foreground/70'}`}>
                      {step.label}
                    </span>
                    {step.optional && <span className="text-[12px] text-warning/50 ml-2">OPCIONAL</span>}
                    <p className="text-[13px] text-foreground/30 mt-0.5">{step.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Journaling Prompt */}
        {mission.hasJournaling && <JournalingPrompt />}

        {/* Daily Insight */}
        {mission.hasDailyInsight && <DailyInsight />}

        {/* Science Note (collapsible) */}
        {mission.scienceNote && (
          <div className="w-full mt-3">
            <button onClick={() => setShowScience(!showScience)}
              className="text-[13px] tracking-[0.2em] text-accent/30 hover:text-accent/60 transition-colors">
              {showScience ? '▾' : '▸'} ¿POR QUÉ FUNCIONA?
            </button>
            {showScience && (
              <div className="mt-2 p-3 border border-accent/8 rounded bg-accent/[0.01] text-[14px] text-foreground/40 leading-relaxed">
                {mission.scienceNote}
              </div>
            )}
          </div>
        )}

        {/* Tip */}
        {currentTip && (
          <div className="w-full mt-3 text-[13px] text-foreground/20 tracking-wider">
            <span className="text-accent/30">TIP:</span> {currentTip}
          </div>
        )}

        {/* Progress bar for timed missions */}
        {mission.duration > 0 && started && !mission.breathingPattern && (
          <div className="w-full mt-4">
            <div className="flex justify-between text-[12px] tracking-widest text-accent/25 mb-1">
              <span>PROGRESO</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent/50 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        {/* === SKIP BUTTON (TESTING ONLY — REMOVE LATER) === */}
        <button onClick={() => { audioTransition?.(); onComplete(); }}
          className="mt-6 mb-4 px-8 py-3 border border-danger/30 rounded text-danger text-[13px] tracking-[0.2em]
            hover:bg-danger/10 active:bg-danger/20 transition-all shrink-0">
          ⏭ SKIP MISSION
        </button>
      </div>
    </div>
  );
}
