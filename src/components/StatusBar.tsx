'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { getCurrentTimeString, getRank, type Rank } from '@/lib/constants';

interface StatusBarProps {
  streak: number;
  currentPhase: number;
  totalPhases: number;
}

export default function StatusBar({ streak, currentPhase, totalPhases }: StatusBarProps) {
  const [time, setTime] = useState('--:--:--');
  const barRef = useRef<HTMLDivElement>(null);
  const rank: Rank = getRank(streak);

  useEffect(() => {
    setTime(getCurrentTimeString());
    const interval = setInterval(() => setTime(getCurrentTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(barRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
    }
  }, []);

  return (
    <div ref={barRef} className="w-full px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
      <div className="flex items-center justify-between text-[14px] tracking-[0.2em] uppercase opacity-70 mb-2">
        <span className="animate-breathing">◆ SYS:ONLINE</span>
        <span className="animate-flicker">{time}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Rank Badge */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border flex items-center justify-center text-sm font-bold"
            style={{ borderColor: rank.color, color: rank.color, boxShadow: `0 0 12px ${rank.color}40` }}
          >
            {rank.class}
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] tracking-[0.15em] opacity-50">RANK</span>
            <span className="text-sm font-semibold" style={{ color: rank.color }}>{rank.title}</span>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="flex-1 max-w-[180px]">
          <div className="flex justify-between text-[13px] tracking-widest opacity-50 mb-1">
            <span>PHASE</span>
            <span>{currentPhase}/{totalPhases}</span>
          </div>
          <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000 ease-out progress-bar-glow"
              style={{ width: `${(currentPhase / totalPhases) * 100}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[14px] tracking-[0.15em] opacity-50">STREAK</span>
          <span className="text-sm font-bold text-accent glow-text whitespace-nowrap">{streak}<span className="text-[13px] opacity-60 ml-1">DAYS</span></span>
        </div>
      </div>

      {/* Separator line */}
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </div>
  );
}
