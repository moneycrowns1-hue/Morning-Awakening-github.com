'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { levelProgress, type OperatorProfile } from '@/lib/progression';
import { getRankByLevel } from '@/lib/constants';

interface ProfileModalProps {
  profile: OperatorProfile;
  streak: number;
  onClose: () => void;
}

const STATS: Array<{ key: keyof OperatorProfile['stats']; label: string; kanji: string; color: string }> = [
  { key: 'disciplina', label: 'DISCIPLINA', kanji: '律', color: '#bc002d' },
  { key: 'enfoque',    label: 'ENFOQUE',    kanji: '焦', color: '#c9a227' },
  { key: 'energia',    label: 'ENERGÍA',    kanji: '気', color: '#7a8c5a' },
];

export default function ProfileModal({ profile, streak, onClose }: ProfileModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);
  const maxStat = Math.max(1, ...STATS.map(s => profile.stats[s.key]));

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-5"
      style={{ background: 'rgba(10,9,8,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded border p-5 relative"
        style={{
          background: 'rgba(21,18,14,0.96)',
          borderColor: 'rgba(201,162,39,0.25)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 24px rgba(201,162,39,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="shrink-0 w-16 h-16 flex items-center justify-center rounded text-2xl"
            style={{
              color: rank.color,
              border: `1.5px solid ${rank.color}66`,
              boxShadow: `0 0 14px ${rank.color}40, inset 0 0 8px ${rank.color}18`,
              fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
            }}
          >
            {rank.kanji}
          </div>
          <div className="flex-1">
            <div className="text-[11px] tracking-[0.3em] text-washi/40">OPERADOR</div>
            <div
              className="text-xl font-bold tracking-wider truncate"
              style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              {profile.name}
            </div>
            <div
              className="text-[13px] tracking-[0.25em] font-semibold"
              style={{ color: rank.color, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              {rank.titleEs} · LV {profile.level}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-washi/40 hover:text-washi/80 text-xl leading-none"
            aria-label="Cerrar"
          >✕</button>
        </div>

        {/* XP bar */}
        <div className="mb-5">
          <div className="flex justify-between text-[11px] tracking-widest text-washi/40 mb-1">
            <span>XP</span>
            <span>{prog.current} / {prog.required}</span>
          </div>
          <div className="h-[4px] bg-washi/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${prog.ratio * 100}%`,
                background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})`,
                boxShadow: `0 0 8px ${rank.color}80`,
              }}
            />
          </div>
        </div>

        {/* Stats bars */}
        <div className="space-y-3 mb-5">
          {STATS.map(s => {
            const val = profile.stats[s.key];
            const ratio = val / maxStat;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between text-[12px] tracking-widest mb-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="text-base"
                      style={{ color: s.color, fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif' }}
                    >
                      {s.kanji}
                    </span>
                    <span className="text-washi/60">{s.label}</span>
                  </span>
                  <span className="text-washi/80 font-bold">{val}</span>
                </div>
                <div className="h-[3px] bg-washi/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, ratio * 100)}%`,
                      background: s.color,
                      boxShadow: `0 0 6px ${s.color}80`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded border" style={{ borderColor: 'rgba(201,162,39,0.15)' }}>
            <div className="text-[10px] tracking-widest text-washi/35">RACHA</div>
            <div className="text-lg font-bold text-washi/90">{streak}<span className="text-[11px] opacity-60 ml-1">d</span></div>
          </div>
          <div className="p-2 rounded border" style={{ borderColor: 'rgba(201,162,39,0.15)' }}>
            <div className="text-[10px] tracking-widest text-washi/35">FASES</div>
            <div className="text-lg font-bold text-washi/90">{profile.phasesCompleted}</div>
          </div>
          <div className="p-2 rounded border" style={{ borderColor: 'rgba(201,162,39,0.15)' }}>
            <div className="text-[10px] tracking-widest text-washi/35">MIN</div>
            <div className="text-lg font-bold text-washi/90">{profile.totalMinutes}</div>
          </div>
        </div>

        <div className="mt-5 text-[11px] tracking-widest text-washi/30 text-center">
          CLASE: {profile.operatorClass}
        </div>
      </div>
    </div>
  );
}
