'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity, Settings as SettingsIcon, VolumeX } from 'lucide-react';
import { getCurrentTimeString } from '@/lib/constants';

interface StatusBarProps {
  streak: number;
  currentPhase: number;
  totalPhases: number;
  onOpenSettings?: () => void;
  voiceEnabled?: boolean;
}

export default function StatusBar({
  streak,
  currentPhase,
  totalPhases,
  onOpenSettings,
  voiceEnabled = true,
}: StatusBarProps) {
  const [time, setTime] = useState('--:--:--');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTime(getCurrentTimeString());
    const interval = setInterval(() => setTime(getCurrentTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(barRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
    }
  }, []);

  const progress = totalPhases > 0 ? (currentPhase / totalPhases) * 100 : 0;

  return (
    <div ref={barRef} className="w-full px-4 pt-[env(safe-area-inset-top,12px)] pb-2 relative z-20">
      <div
        className="flex items-center justify-between text-[12px] tracking-[0.25em] uppercase mb-2"
        style={{ color: 'rgba(232,220,196,0.6)' }}
      >
        <span className="animate-breathing inline-flex items-center gap-1.5">
          <Activity size={12} strokeWidth={2} />
          SYS:ONLINE
        </span>
        <span className="animate-flicker" style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}>
          {time}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Phase progress */}
        <div className="flex-1">
          <div
            className="flex justify-between text-[11px] tracking-widest mb-1"
            style={{ color: 'rgba(232,220,196,0.5)' }}
          >
            <span>FASE</span>
            <span>{currentPhase}/{totalPhases}</span>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(232,220,196,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out progress-bar-glow"
              style={{ width: `${progress}%`, background: '#c9a227' }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[11px] tracking-[0.15em] opacity-50">RACHA</span>
          <span
            className="text-base font-bold whitespace-nowrap"
            style={{ color: '#bc002d', textShadow: '0 0 8px rgba(188,0,45,0.4)' }}
          >
            {streak}
            <span className="text-[11px] opacity-60 ml-1">d</span>
          </span>
        </div>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded border text-[14px] transition-colors hover:brightness-125"
            style={{
              borderColor: 'rgba(201,162,39,0.25)',
              color: 'rgba(201,162,39,0.7)',
              background: 'rgba(201,162,39,0.04)',
            }}
            aria-label="Ajustes"
            title={voiceEnabled ? 'Ajustes (voz ON)' : 'Ajustes (voz OFF)'}
          >
            {voiceEnabled ? (
              <SettingsIcon size={15} strokeWidth={1.8} />
            ) : (
              <VolumeX size={15} strokeWidth={1.8} />
            )}
          </button>
        )}
      </div>

      <div
        className="mt-3 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.35), transparent)' }}
      />
    </div>
  );
}
