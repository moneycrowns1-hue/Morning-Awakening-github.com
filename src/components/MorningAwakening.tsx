'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import {
  MISSIONS,
  type StreakData,
  DEFAULT_STREAK_DATA,
  getToday,
  isYesterday,
  isToday,
} from '@/lib/constants';
import { AudioEngine } from '@/lib/audioEngine';
import StatusBar from './StatusBar';
import MissionPhase from './MissionPhase';
import SummaryScreen from './SummaryScreen';

type AppState = 'IDLE' | 'MISSION' | 'COMPLETE';
const STORAGE_KEY = 'morning-awakening-streak';

export default function MorningAwakening() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [missionIndex, setMissionIndex] = useState(0);
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [startTime, setStartTime] = useState<number>(0);
  const [idleText, setIdleText] = useState('');
  const [showIdleButton, setShowIdleButton] = useState(false);
  const audioRef = useRef<AudioEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleButtonRef = useRef<HTMLButtonElement>(null);
  const dataStreamRef = useRef<HTMLDivElement>(null);

  // Load streak data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: StreakData = JSON.parse(saved);
        // Check if streak is still valid
        if (data.lastCompletedDate) {
          if (isToday(data.lastCompletedDate)) {
            // Already completed today - show summary
            setStreakData(data);
            setAppState('COMPLETE');
            return;
          } else if (!isYesterday(data.lastCompletedDate)) {
            // Streak broken
            data.streak = 0;
          }
        }
        setStreakData(data);
      }
    } catch {
      // Fresh start
    }
  }, []);

  // Idle screen typewriter animation
  useEffect(() => {
    if (appState !== 'IDLE') return;
    const text = 'PROTOCOLO v4.0 — 12 FASES. 3 BLOQUES. 5:00-6:45 AM. ESPERANDO ACTIVACIÓN DEL OPERADOR...';
    let i = 0;
    setIdleText('');
    setShowIdleButton(false);
    const interval = setInterval(() => {
      if (i <= text.length) {
        setIdleText(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowIdleButton(true), 400);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [appState]);

  // Idle button GSAP entrance
  useEffect(() => {
    if (showIdleButton && idleButtonRef.current) {
      gsap.fromTo(idleButtonRef.current,
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' }
      );
    }
  }, [showIdleButton]);

  // Data stream background effect
  useEffect(() => {
    if (!dataStreamRef.current) return;
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
    const columns = 12;
    const el = dataStreamRef.current;
    el.innerHTML = '';

    for (let c = 0; c < columns; c++) {
      const col = document.createElement('div');
      col.className = 'absolute top-0 text-[13px] leading-[14px] text-accent/[0.04] font-light';
      col.style.left = `${(c / columns) * 100}%`;

      let content = '';
      for (let r = 0; r < 80; r++) {
        content += chars[Math.floor(Math.random() * chars.length)] + '\n';
      }
      col.textContent = content;
      col.style.whiteSpace = 'pre';

      const duration = 15 + Math.random() * 20;
      col.style.animation = `data-scroll ${duration}s linear infinite`;
      col.style.animationDelay = `${-Math.random() * duration}s`;

      el.appendChild(col);
    }
  }, []);

  const saveStreak = useCallback((data: StreakData) => {
    setStreakData(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const handleInitialize = useCallback(() => {
    // Init audio
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
    }
    audioRef.current.init();
    audioRef.current.startAmbient();

    // Transition
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0, duration: 0.4, onComplete: () => {
          setAppState('MISSION');
          setMissionIndex(0);
          setStartTime(Date.now());
          gsap.to(containerRef.current, { opacity: 1, duration: 0.4 });
        }
      });
    } else {
      setAppState('MISSION');
      setMissionIndex(0);
      setStartTime(Date.now());
    }
  }, []);

  const handleMissionComplete = useCallback(() => {
    const nextIndex = missionIndex + 1;

    if (nextIndex >= MISSIONS.length) {
      // All missions done
      audioRef.current?.playComplete();

      const today = getToday();
      const newData: StreakData = {
        streak: streakData.streak + 1,
        completedDays: streakData.completedDays + 1,
        lastCompletedDate: today,
        history: [...streakData.history, today],
      };
      saveStreak(newData);

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0, duration: 0.5, onComplete: () => {
            setAppState('COMPLETE');
            gsap.to(containerRef.current, { opacity: 1, duration: 0.5 });
          }
        });
      } else {
        setAppState('COMPLETE');
      }
    } else {
      // Next mission
      audioRef.current?.playSuccess();

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0, x: -20, duration: 0.3, onComplete: () => {
            setMissionIndex(nextIndex);
            gsap.fromTo(containerRef.current,
              { opacity: 0, x: 20 },
              { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
            );
          }
        });
      } else {
        setMissionIndex(nextIndex);
      }
    }
  }, [missionIndex, streakData, saveStreak]);

  const handleAudioTransition = useCallback(() => {
    audioRef.current?.playTransition();
  }, []);

  const handleProceedToStudy = useCallback(() => {
    audioRef.current?.stopAll();
    // No redirect configured yet — user decides later
    setAppState('IDLE');
  }, []);

  const handleReset = useCallback(() => {
    audioRef.current?.stopAll();
    setAppState('IDLE');
    setMissionIndex(0);
  }, []);

  const totalElapsed = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const currentPhase = appState === 'COMPLETE' ? MISSIONS.length : appState === 'MISSION' ? missionIndex + 1 : 0;

  return (
    <div className="h-full w-full bg-black flex flex-col relative overflow-hidden scan-lines">
      {/* Data stream background */}
      <div ref={dataStreamRef} className="absolute inset-0 overflow-hidden pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />

      {/* Status Bar */}
      <StatusBar
        streak={streakData.streak}
        currentPhase={currentPhase}
        totalPhases={MISSIONS.length}
      />

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex flex-col relative z-10">
        {/* IDLE STATE */}
        {appState === 'IDLE' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* System title */}
            <div className="text-[14px] tracking-[0.6em] text-accent/30 mb-6">
              ◇ SYSTEM: MORNING AWAKENING ◇
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-accent/80 tracking-wider mb-2 text-center animate-flicker">
              PROTOCOLO MATUTINO
            </h1>

            <div className="text-[13px] tracking-[0.3em] text-foreground/20 mb-6">
              v4.0 — 5:00 AM PROTOCOL
            </div>

            {/* Mission preview labels */}
            <div className="w-full max-w-sm mb-4 px-2">
              <div className="grid grid-cols-3 gap-1 text-[11px] tracking-wider text-accent/20 text-center">
                {MISSIONS.map(m => (
                  <span key={m.id}>{m.icon} {m.codename}</span>
                ))}
              </div>
            </div>

            {/* Boot sequence text */}
            <div className="w-full max-w-md mb-10">
              <div className="p-4 border border-accent/10 rounded bg-accent/[0.02] hud-frame hud-frame-bottom">
                <div className="text-[15px] leading-relaxed text-accent/60 tracking-wide">
                  <span className="text-accent/30">{'>'} </span>
                  {idleText}
                  {idleText.length < 90 && <span className="animate-pulse text-accent">█</span>}
                </div>
              </div>
            </div>

            {/* Initialize Button */}
            {showIdleButton && (
              <button ref={idleButtonRef} onClick={handleInitialize}
                className="relative w-48 h-48 group" id="init-button">
                {/* Outer rotating border */}
                <div className="absolute inset-0 rounded-full border border-accent/20 animate-ring-pulse" />
                <div className="absolute inset-2 rounded-full border border-accent/10" />

                {/* Core */}
                <div className="absolute inset-5 rounded-full bg-accent/[0.03] border border-accent/30
                  flex flex-col items-center justify-center
                  group-hover:bg-accent/[0.08] group-active:bg-accent/[0.15]
                  transition-all duration-300 animate-pulse-glow">
                  <div className="text-4xl text-accent mb-2">⬡</div>
                  <span className="text-[15px] tracking-[0.25em] text-accent font-bold">INITIALIZE</span>
                  <span className="text-[12px] tracking-[0.2em] text-accent/40 mt-1">05:00 AM PROTOCOL</span>
                </div>
              </button>
            )}

            {/* Mission preview */}
            {showIdleButton && (
              <div className="mt-8 flex gap-2">
                {MISSIONS.map((m, i) => (
                  <div key={m.id} className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent/20" />
                    <span className="text-[15px] tracking-wider text-accent/20">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MISSION STATE */}
        {appState === 'MISSION' && (
          <MissionPhase
            key={MISSIONS[missionIndex].id}
            mission={MISSIONS[missionIndex]}
            onComplete={handleMissionComplete}
            audioTransition={handleAudioTransition}
          />
        )}

        {/* COMPLETE STATE */}
        {appState === 'COMPLETE' && (
          <SummaryScreen
            streakData={streakData}
            totalTime={totalElapsed}
            onProceed={handleProceedToStudy}
          />
        )}
      </div>

      {/* Bottom system bar */}
      <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent mb-2" />
        <div className="flex justify-between text-[12px] tracking-[0.2em] text-foreground/15">
          <span>MORNING:AWAKENING:v4.0</span>
          {appState === 'COMPLETE' && (
            <button onClick={handleReset} className="text-accent/30 hover:text-accent/60 transition-colors">
              RESET
            </button>
          )}
          <span>◆ MAURO.SYS</span>
        </div>
      </div>
    </div>
  );
}
