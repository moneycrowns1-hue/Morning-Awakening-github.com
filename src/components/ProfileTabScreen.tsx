'use client';

// ═══════════════════════════════════════════════════════════
// ProfileTabScreen · tab "Perfil" del dock.
//
// Versión full-screen que reúne lo que antes vivía en el icono
// User: tarjeta del operador (rango, XP, stats), accesos a
// Historial y Ajustes, y la versión de la app.
// ═══════════════════════════════════════════════════════════

import { LineChart, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import GradientBackground from './GradientBackground';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { levelProgress, type OperatorProfile } from '@/lib/progression';
import { getRankByLevel } from '@/lib/constants';

interface ProfileTabScreenProps {
  profile: OperatorProfile;
  streak: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

const STATS: Array<{ key: keyof OperatorProfile['stats']; label: string; color: string }> = [
  { key: 'disciplina', label: 'Disciplina', color: SUNRISE.rise2 },
  { key: 'enfoque',    label: 'Enfoque',    color: SUNRISE.rise1 },
  { key: 'energia',    label: 'Energía',    color: SUNRISE.dawn2 },
];

export default function ProfileTabScreen({
  profile,
  streak,
  onOpenHistory,
  onOpenSettings,
}: ProfileTabScreenProps) {
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);
  const maxStat = Math.max(1, ...STATS.map(s => profile.stats[s.key]));

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={36} />

      {/* Header */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <span
          className="font-ui text-[10px] uppercase tracking-[0.42em]"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Perfil
        </span>
        <div
          className="font-display italic font-[400] text-[26px] leading-tight mt-0.5"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {profile.name.split(' ')[0] || 'Operador'}
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 max-w-3xl mx-auto mt-5 flex flex-col gap-5">
          {/* Operator card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.predawn2, 0.85)}, ${hexToRgba(SUNRISE.predawn1, 0.6)})`,
              border: `1px solid ${hexToRgba(rank.color, 0.25)}`,
              boxShadow: `0 18px 50px -22px ${hexToRgba(rank.color, 0.35)}`,
            }}
          >
            <div className="flex items-start gap-4 mb-5">
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
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  Operador
                </div>
                <div
                  className="font-display italic font-[400] text-[22px] leading-tight truncate mt-0.5"
                  style={{ color: SUNRISE_TEXT.primary }}
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
                style={{ color: SUNRISE_TEXT.muted }}
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

            {/* Stats */}
            <div className="space-y-3 mb-5">
              {STATS.map(s => {
                const val = profile.stats[s.key];
                const ratio = val / maxStat;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="font-ui text-[12px] font-[500]"
                        style={{ color: SUNRISE_TEXT.soft }}
                      >
                        {s.label}
                      </span>
                      <span
                        className="font-mono text-[12px]"
                        style={{ color: SUNRISE_TEXT.primary }}
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

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2">
              <Counter label="Racha" value={streak} suffix="d" />
              <Counter label="Fases" value={profile.phasesCompleted} />
              <Counter label="Minutos" value={profile.totalMinutes} />
            </div>

            <div
              className="mt-4 font-ui text-[10px] uppercase tracking-[0.32em] text-center"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Clase · {profile.operatorClass}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2.5">
            <LinkRow
              icon={<LineChart size={18} strokeWidth={1.75} />}
              title="Historial"
              hint="Sesiones, hábitos y rachas"
              onClick={() => { haptics.tap(); onOpenHistory(); }}
            />
            <LinkRow
              icon={<SettingsIcon size={18} strokeWidth={1.75} />}
              title="Ajustes"
              hint="Voz, volumen, datos"
              onClick={() => { haptics.tap(); onOpenSettings(); }}
            />
          </div>

          {/* Version footer */}
          <div
            className="mt-2 text-center font-mono text-[10px] tracking-wider"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Morning Awakening · v8 sunrise
          </div>
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
        style={{ color: SUNRISE_TEXT.muted }}
      >
        {label}
      </div>
      <div
        className="font-display text-[22px] leading-none mt-1"
        style={{ color: SUNRISE_TEXT.primary }}
      >
        {value}
        {suffix && (
          <span
            className="font-ui text-[11px] ml-0.5"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function LinkRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.14),
          color: SUNRISE.rise2,
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="font-display italic font-[400] text-[16px] leading-tight"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {title}
        </div>
        <div
          className="font-ui text-[10.5px] tracking-wider"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {hint}
        </div>
      </div>
      <ChevronRight size={18} strokeWidth={1.6} style={{ color: SUNRISE_TEXT.muted }} />
    </button>
  );
}
