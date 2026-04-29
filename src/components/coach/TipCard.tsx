'use client';

// ═══════════════════════════════════════════════════════════════
// TipCard · "tip del día" inline · 1 frase + chip de origen
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import type { Tip } from '@/lib/coach/tipsBank';

interface TipCardProps {
  tip: Tip;
  /** Llamado una vez al montar/cambiar para registrar como visto. */
  onSeen?: (id: string) => void;
}

export default function TipCard({ tip, onSeen }: TipCardProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();

  useEffect(() => {
    if (onSeen) onSeen(tip.id);
  }, [tip.id, onSeen]);

  return (
    <div
      className="rounded-2xl px-4 py-3 flex gap-3"
      style={{
        background: hexToRgba(SUNRISE.rise2, 0.08),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.18),
          color: SUNRISE.rise2,
        }}
      >
        <Lightbulb size={14} strokeWidth={2.2} />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div
          className="font-mono uppercase tracking-[0.32em] font-[600]"
          style={{ color: SUNRISE_TEXT.muted, fontSize: 9 }}
        >
          tip del día · {tip.source}
        </div>
        <p
          className="font-ui text-[13px] leading-snug"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {tip.text}
        </p>
      </div>
    </div>
  );
}
