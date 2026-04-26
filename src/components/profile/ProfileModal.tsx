'use client';

// ═══════════════════════════════════════════════════════
// ProfileModal · sunrise reskin. Shows rank, XP progress,
// stat bars (disciplina / enfoque / energía), aggregate
// counters and achievement highlights. Glass card over a
// dark backdrop; closes on backdrop click or ✕.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { levelProgress, type OperatorProfile } from '@/lib/genesis/progression';
import { getRankByLevel } from '@/lib/genesis/constants';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';

interface ProfileModalProps {
  profile: OperatorProfile;
  streak: number;
  onClose: () => void;
}

const STATS: Array<{ key: keyof OperatorProfile['stats']; label: string; color: string }> = [
  { key: 'disciplina', label: 'Disciplina', color: SUNRISE.rise2 },
  { key: 'enfoque',    label: 'Enfoque',    color: SUNRISE.rise1 },
  { key: 'energia',    label: 'Energía',    color: SUNRISE.dawn2 },
];

export default function ProfileModal({ profile, streak, onClose }: ProfileModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);
  const maxStat = Math.max(1, ...STATS.map((s) => profile.stats[s.key]));

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { y: 30, opacity: 0, filter: 'blur(6px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' },
      );
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-5"
      style={{ background: 'rgba(5,3,15,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl p-6 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(26,15,46,0.92), rgba(11,6,24,0.94))',
          border: '1px solid rgba(255,250,240,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(244,194,103,0.08)',
          color: 'var(--sunrise-text)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: 'var(--sunrise-text-soft)' }}
          aria-label="Cerrar"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pr-6">
          <div
            className="shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl text-[26px]"
            style={{
              color: rank.color,
              border: `1.5px solid ${hexToRgba(rank.color, 0.5)}`,
              boxShadow: `0 0 16px ${hexToRgba(rank.color, 0.25)}`,
              fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
            }}
          >
            {rank.kanji}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-ui text-[10px] uppercase tracking-[0.36em]"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Operador
            </div>
            <div
              className="font-display italic font-[400] text-[22px] leading-tight truncate mt-0.5"
              style={{ color: 'var(--sunrise-text)' }}
            >
              {profile.name}
            </div>
            <div
              className="font-ui text-[12px] tracking-[0.2em] mt-0.5"
              style={{ color: rank.color }}
            >
              {rank.titleEs} · Lv {profile.level}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-5">
          <div
            className="flex justify-between font-mono text-[11px] mb-1.5"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            <span>XP</span>
            <span>{prog.current} / {prog.required}</span>
          </div>
          <div
            className="h-[4px] rounded-full overflow-hidden"
            style={{ background: 'rgba(255,250,240,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(0, Math.min(100, prog.ratio * 100))}%`,
                background: `linear-gradient(90deg, ${hexToRgba(rank.color, 0.6)}, ${rank.color})`,
                boxShadow: `0 0 8px ${hexToRgba(rank.color, 0.5)}`,
              }}
            />
          </div>
        </div>

        {/* Stats bars */}
        <div className="space-y-3 mb-6">
          {STATS.map((s) => {
            const val = profile.stats[s.key];
            const ratio = val / maxStat;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="font-ui text-[12px] font-[500]"
                    style={{ color: 'var(--sunrise-text-soft)' }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="font-mono text-[12px]"
                    style={{ color: 'var(--sunrise-text)' }}
                  >
                    {val}
                  </span>
                </div>
                <div
                  className="h-[3px] rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,250,240,0.08)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, ratio * 100)}%`,
                      background: `linear-gradient(90deg, ${hexToRgba(s.color, 0.55)}, ${s.color})`,
                      boxShadow: `0 0 6px ${hexToRgba(s.color, 0.45)}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Aggregate counters */}
        <div className="grid grid-cols-3 gap-2">
          <Counter label="Racha" value={streak} suffix="d" />
          <Counter label="Fases" value={profile.phasesCompleted} />
          <Counter label="Minutos" value={profile.totalMinutes} />
        </div>

        <div
          className="mt-5 font-ui text-[10px] uppercase tracking-[0.32em] text-center"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Clase · {profile.operatorClass}
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{
        border: '1px solid rgba(255,250,240,0.08)',
        background: 'rgba(255,250,240,0.03)',
      }}
    >
      <div
        className="font-ui text-[9px] uppercase tracking-[0.32em]"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {label}
      </div>
      <div
        className="font-display text-[22px] leading-none mt-1"
        style={{ color: 'var(--sunrise-text)' }}
      >
        {value}
        {suffix && <span className="font-ui text-[11px] ml-0.5" style={{ color: 'var(--sunrise-text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );
}
