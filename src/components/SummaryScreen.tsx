'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Sparkles } from 'lucide-react';
import { getRankByLevel, type StreakData } from '@/lib/constants';
import { levelProgress, type OperatorProfile } from '@/lib/progression';

interface SummaryScreenProps {
  streakData: StreakData;
  totalTime: number;
  profile: OperatorProfile;
  sessionXp: number;
  onProceed: () => void;
}

const QUOTES = [
  'Lo hiciste. No lo hables.',
  'El día ya es tuyo.',
  'La repetición forja al guerrero.',
  'Ninguna victoria es pequeña.',
  'Ganaste la mañana. Gana el día.',
];

export default function SummaryScreen({
  streakData, totalTime, profile, sessionXp, onProceed,
}: SummaryScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);
  const quote = QUOTES[streakData.completedDays % QUOTES.length];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.summary-stat',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.6 });
      gsap.fromTo('.summary-seal',
        { scale: 2.4, opacity: 0, rotate: -14 },
        { scale: 1, opacity: 1, rotate: -4, duration: 0.7, ease: 'back.out(1.5)', delay: 0.2 });
      gsap.fromTo('.summary-button',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 1.4 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const minutes = Math.floor(totalTime / 60);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative">
      {/* kanji watermark 道 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <span className="kanji-watermark" style={{ fontSize: 'min(60vw, 60vh)' }}>道</span>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Red ink seal */}
        <div className="summary-seal kanji-seal mb-5" style={{ width: '5rem', height: '5rem', fontSize: '3rem' }}>
          完
        </div>

        <div
          className="text-[12px] tracking-[0.5em] mb-2"
          style={{ color: '#c9a227', opacity: 0.7 }}
        >
          PROTOCOLO COMPLETO
        </div>

        <h1
          className="text-3xl md:text-4xl font-bold mb-3 text-center"
          style={{
            color: '#e8dcc4',
            fontFamily: 'var(--font-cinzel), Georgia, serif',
            letterSpacing: '0.18em',
            textShadow: '0 0 20px rgba(201,162,39,0.3)',
          }}
        >
          DÍA SUPERADO
        </h1>

        <div
          className="text-[13px] italic tracking-wider mb-8 text-center max-w-sm"
          style={{ color: 'rgba(232,220,196,0.55)' }}
        >
          {quote}
        </div>

        {/* Stats grid */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-6">
          <StatCell label="MISIONES" value="12/12" />
          <StatCell label="TIEMPO" value={`${minutes}`} unit="min" />
          <StatCell label="RACHA" value={`${streakData.streak}`} unit="días" />
          <StatCell label="XP HOY" value={`+${sessionXp}`} color="#bc002d" />
        </div>

        {/* Rank + XP bar */}
        <div
          className="w-full max-w-sm p-4 rounded mb-6"
          style={{ border: '1px solid rgba(201,162,39,0.2)', background: 'rgba(21,18,14,0.5)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 flex items-center justify-center rounded text-2xl"
              style={{
                color: rank.color,
                border: `1.5px solid ${rank.color}66`,
                boxShadow: `0 0 12px ${rank.color}40, inset 0 0 6px ${rank.color}15`,
                fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
              }}
            >
              {rank.kanji}
            </div>
            <div className="flex-1">
              <div className="text-[11px] tracking-[0.3em] opacity-50">RANGO</div>
              <div
                className="text-base font-bold tracking-[0.2em]"
                style={{ color: rank.color, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
              >
                {rank.titleEs} · LV {profile.level}
              </div>
            </div>
          </div>
          <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(232,220,196,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${prog.ratio * 100}%`,
                background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})`,
                boxShadow: `0 0 8px ${rank.color}80`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] tracking-widest mt-1" style={{ color: 'rgba(232,220,196,0.4)' }}>
            <span>{prog.current} XP</span>
            <span>{prog.required} XP</span>
          </div>
        </div>

        <button
          onClick={onProceed}
          className="summary-button w-full max-w-sm py-3 rounded text-sm font-semibold tracking-[0.25em] uppercase transition-all duration-300 hover:brightness-125 inline-flex items-center justify-center gap-2"
          style={{
            border: '1px solid rgba(188,0,45,0.5)',
            background: 'rgba(188,0,45,0.08)',
            color: '#e8dcc4',
            boxShadow: '0 0 18px rgba(188,0,45,0.18)',
            fontFamily: 'var(--font-cinzel), Georgia, serif',
          }}
        >
          <Sparkles size={16} strokeWidth={1.8} />
          SELLAR EL DÍA
        </button>

        <p
          className="text-[12px] tracking-wider mt-4 text-center"
          style={{ color: 'rgba(232,220,196,0.3)' }}
        >
          BUEN DÍA, {profile.name.toUpperCase()}.
        </p>
      </div>
    </div>
  );
}

function StatCell({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div
      className="summary-stat p-3 rounded"
      style={{ border: '1px solid rgba(201,162,39,0.15)', background: 'rgba(201,162,39,0.02)' }}
    >
      <div className="text-[11px] tracking-[0.25em] mb-1" style={{ color: 'rgba(201,162,39,0.5)' }}>
        {label}
      </div>
      <div
        className="text-2xl font-bold"
        style={{ color: color || '#e8dcc4', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
      >
        {value}
        {unit && <span className="text-xs opacity-60 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
