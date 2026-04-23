'use client';

// ═══════════════════════════════════════════════════════
// AchievementToast · one-off glass pill that drops from the
// top, holds for ~3.2s, then fades up and out. Shown when
// a badge unlocks at protocol completion.
// ═══════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Award, Clock, Flame, Sparkles, Sunrise, Target, Trophy, Zap } from 'lucide-react';
import type { AchievementDef } from '@/lib/achievements';
import { SUNRISE, hexToRgba } from '@/lib/theme';

const ICONS = { Award, Clock, Flame, Sparkles, Sunrise, Target, Trophy, Zap } as const;

const TONE_HEX: Record<AchievementDef['tone'], string> = {
  gold: SUNRISE.rise2,
  coral: SUNRISE.dawn2,
  amber: SUNRISE.rise1,
  rose: SUNRISE.dawn1,
  cool: SUNRISE.cool,
};

interface AchievementToastProps {
  def: AchievementDef;
  onDone: () => void;
  /** Stacking index (0 = first / top). */
  stackIndex?: number;
}

export default function AchievementToast({ def, onDone, stackIndex = 0 }: AchievementToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3600);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const Icon = ICONS[def.icon];
  const hex = TONE_HEX[def.tone];

  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[60] achievement-toast-enter"
      style={{
        top: `calc(env(safe-area-inset-top, 0px) + 1.25rem + ${stackIndex * 70}px)`,
      }}
    >
      <div
        className="flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(26,15,46,0.92), rgba(11,6,24,0.94))',
          border: `1px solid ${hexToRgba(hex, 0.45)}`,
          boxShadow: `0 12px 32px rgba(0,0,0,0.45), 0 0 24px ${hexToRgba(hex, 0.3)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'var(--sunrise-text)',
        }}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: hexToRgba(hex, 0.18),
            border: `1px solid ${hexToRgba(hex, 0.4)}`,
            color: hex,
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </span>
        <div className="flex flex-col items-start leading-tight">
          <span
            className="font-ui text-[9px] uppercase tracking-[0.32em]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Logro desbloqueado
          </span>
          <span
            className="font-ui text-[13px] font-[500] mt-0.5"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {def.title}
          </span>
        </div>
      </div>
    </div>
  );
}
