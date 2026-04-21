'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { getRank, type StreakData } from '@/lib/constants';

interface SummaryScreenProps {
  streakData: StreakData;
  totalTime: number;
  onProceed: () => void;
}

export default function SummaryScreen({ streakData, totalTime, onProceed }: SummaryScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glitchTitle, setGlitchTitle] = useState('');
  const rank = getRank(streakData.streak);
  const titleText = 'DÍA SUPERADO';

  // Glitch typewriter for title
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
    let idx = 0;
    const interval = setInterval(() => {
      if (idx <= titleText.length) {
        const revealed = titleText.slice(0, idx);
        const garbled = Array.from({ length: Math.min(3, titleText.length - idx) }, () =>
          chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        setGlitchTitle(revealed + garbled);
        idx++;
      } else {
        setGlitchTitle(titleText);
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // GSAP stagger entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.summary-stat',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: 'power2.out', delay: 0.8 }
      );
      gsap.fromTo('.summary-rank',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 1.5 }
      );
      gsap.fromTo('.summary-button',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 2 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const minutes = Math.floor(totalTime / 60);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      {/* Status line */}
      <div className="text-[14px] tracking-[0.5em] text-success/50 mb-4">
        ◆ PROTOCOL COMPLETE ◆
      </div>

      {/* Title with glitch */}
      <h1 className="text-3xl md:text-4xl font-bold text-success glow-text-success mb-8 text-center tracking-wider">
        {glitchTitle}
      </h1>

      {/* Completion message */}
      <div className="text-sm text-foreground/50 tracking-wider mb-10 text-center max-w-sm">
        {'>'} TODAS LAS MISIONES EJECUTADAS. RENDIMIENTO REGISTRADO.
      </div>

      {/* Stats Grid */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-8">
        <div className="summary-stat p-4 border border-accent/10 rounded bg-accent/[0.02]">
          <div className="text-[13px] tracking-[0.2em] text-accent/40 mb-1">MISIONES</div>
          <div className="text-3xl font-bold text-accent">12/12</div>
        </div>
        <div className="summary-stat p-4 border border-accent/10 rounded bg-accent/[0.02]">
          <div className="text-[13px] tracking-[0.2em] text-accent/40 mb-1">TIEMPO</div>
          <div className="text-3xl font-bold text-accent">{minutes}<span className="text-sm opacity-60">min</span></div>
        </div>
        <div className="summary-stat p-4 border border-accent/10 rounded bg-accent/[0.02]">
          <div className="text-[13px] tracking-[0.2em] text-accent/40 mb-1">RACHA</div>
          <div className="text-3xl font-bold text-accent">{streakData.streak}<span className="text-sm opacity-60">d</span></div>
        </div>
        <div className="summary-stat p-4 border border-accent/10 rounded bg-accent/[0.02]">
          <div className="text-[13px] tracking-[0.2em] text-accent/40 mb-1">TOTAL</div>
          <div className="text-3xl font-bold text-accent">{streakData.completedDays}<span className="text-sm opacity-60">días</span></div>
        </div>
      </div>

      {/* Rank Display */}
      <div className="summary-rank flex flex-col items-center mb-10">
        <div className="text-[14px] tracking-[0.3em] opacity-40 mb-3">CURRENT RANK</div>
        <div className="w-20 h-20 rounded-lg border-2 flex items-center justify-center text-3xl font-bold mb-2"
          style={{ borderColor: rank.color, color: rank.color, boxShadow: `0 0 25px ${rank.color}40, inset 0 0 15px ${rank.color}15` }}>
          {rank.class}
        </div>
        <div className="text-sm font-semibold tracking-[0.2em]" style={{ color: rank.color }}>
          CLASS {rank.class}: {rank.titleEs}
        </div>
      </div>

      {/* Proceed Button */}
      <button onClick={onProceed}
        className="summary-button w-full max-w-sm py-4 border border-success/30 rounded bg-success/5
          text-success text-sm font-semibold tracking-[0.2em] uppercase
          hover:bg-success/10 active:bg-success/20 transition-all duration-300"
        style={{ boxShadow: '0 0 20px rgba(0,255,136,0.15)' }}>
        ▶ FINALIZAR PROTOCOLO
      </button>

      <p className="text-[13px] tracking-wider text-foreground/20 mt-4 text-center">
        PROTOCOLO MATUTINO COMPLETADO. BUEN DÍA, OPERADOR.
      </p>
    </div>
  );
}
