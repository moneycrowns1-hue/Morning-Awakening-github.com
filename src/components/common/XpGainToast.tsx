'use client';

// ═══════════════════════════════════════════════════════════
// XpGainToast · editorial redesign (D.paper).
//
// Ganar XP durante Génesis (modo día) solía pintar un toast
// de paleta nocturna (sumi negro + cinzel + gold #c9a227) que
// chocaba contra el nuevo paper cream. Ahora respeta D.accent
// y la tipografía mono/editorial del resto de la experiencia.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { OperatorStats } from '@/lib/genesis/progression';
import { useAppTheme } from '@/lib/common/appTheme';
import { hexToRgba } from '@/lib/common/theme';

interface XpGainToastProps {
  xp: number;
  statName: keyof OperatorStats;
  statDelta: number;
  onDone: () => void;
}

const STAT_LABEL: Record<keyof OperatorStats, string> = {
  disciplina: 'disciplina',
  enfoque: 'enfoque',
  energia: 'energía',
};

export default function XpGainToast({ xp, statName, statDelta, onDone }: XpGainToastProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) { onDone(); return; }
    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(el,
      { y: 18, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
    );
    tl.to(el, { y: -12, opacity: 0, duration: 0.5, ease: 'power2.in', delay: 1.8 });
  }, [onDone]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-40 rounded-full overflow-hidden flex items-stretch"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 5.5rem)',
        background: D.paper,
        border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
        boxShadow: `0 10px 28px -10px ${hexToRgba(D.accent, 0.35)}`,
      }}
    >
      {/* LEFT · +XP chip (accent solid) */}
      <div
        className="flex items-center justify-center px-3.5 py-2"
        style={{ background: D.accent, color: D.paper }}
      >
        <span
          className="font-mono uppercase tracking-[0.28em] font-[700] tabular-nums"
          style={{ fontSize: 11 }}
        >
          +{xp} xp
        </span>
      </div>
      {/* RIGHT · stat delta (paper) */}
      <div className="flex items-center gap-1.5 px-3.5 py-2">
        <span
          className="font-mono tabular-nums font-[700]"
          style={{ color: D.accent, fontSize: 11 }}
        >
          +{statDelta}
        </span>
        <span
          className="font-mono lowercase tracking-[0.22em] font-[600]"
          style={{ color: DT.soft, fontSize: 10 }}
        >
          {STAT_LABEL[statName]}
        </span>
      </div>
    </div>
  );
}
