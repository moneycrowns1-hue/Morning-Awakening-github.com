'use client';

import { levelProgress, type OperatorProfile } from '@/lib/progression';
import { getRankByLevel } from '@/lib/constants';

interface OperatorHUDProps {
  profile: OperatorProfile;
  onOpenProfile?: () => void;
}

export default function OperatorHUD({ profile, onOpenProfile }: OperatorHUDProps) {
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);

  return (
    <button
      onClick={onOpenProfile}
      className="group w-full flex items-center gap-3 px-3 py-2 rounded border transition-colors text-left hover:brightness-110"
      style={{ borderColor: 'rgba(201,162,39,0.18)', background: 'rgba(10,9,8,0.55)' }}
    >
      {/* Rank seal */}
      <div
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded text-[20px] font-bold"
        style={{
          color: rank.color,
          border: `1px solid ${rank.color}55`,
          boxShadow: `0 0 10px ${rank.color}30, inset 0 0 6px ${rank.color}15`,
          fontFamily: "var(--font-cinzel), Georgia, serif",
        }}
        aria-label={`Rango ${rank.titleEs}`}
      >
        <span style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif' }}>
          {rank.kanji}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[12px] tracking-[0.25em] font-semibold truncate"
            style={{ color: rank.color, fontFamily: "var(--font-cinzel), Georgia, serif" }}
          >
            {rank.titleEs}
          </span>
          <span className="text-[11px] tracking-wider text-washi/50 shrink-0">
            LV {profile.level}
          </span>
        </div>
        <div className="mt-1 h-[3px] bg-washi/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, prog.ratio * 100)}%`,
              background: `linear-gradient(90deg, ${rank.color}AA, ${rank.color})`,
              boxShadow: `0 0 6px ${rank.color}80`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] tracking-widest text-washi/30 mt-0.5">
          <span>{prog.current} XP</span>
          <span>{prog.required} XP</span>
        </div>
      </div>
    </button>
  );
}
