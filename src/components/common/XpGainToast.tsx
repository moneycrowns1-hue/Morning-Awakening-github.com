'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { OperatorStats } from '@/lib/genesis/progression';

interface XpGainToastProps {
  xp: number;
  statName: keyof OperatorStats;
  statDelta: number;
  onDone: () => void;
}

const STAT_LABEL: Record<keyof OperatorStats, string> = {
  disciplina: 'Disciplina',
  enfoque: 'Enfoque',
  energia: 'Energía',
};

export default function XpGainToast({ xp, statName, statDelta, onDone }: XpGainToastProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) { onDone(); return; }
    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(el,
      { y: 18, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
    );
    tl.to(el, { y: -12, opacity: 0, duration: 0.5, ease: 'power2.in', delay: 1.8 });
  }, [onDone]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded border"
      style={{
        borderColor: 'rgba(201,162,39,0.4)',
        background: 'rgba(10,9,8,0.85)',
        boxShadow: '0 0 22px rgba(201,162,39,0.3), inset 0 0 10px rgba(201,162,39,0.08)',
        fontFamily: "var(--font-cinzel), Georgia, serif",
      }}
    >
      <div className="flex items-center gap-4 text-[14px] tracking-[0.2em]">
        <span className="text-washi/90 font-bold">+{xp} XP</span>
        <span className="text-washi/30">·</span>
        <span style={{ color: '#c9a227' }}>
          +{statDelta} {STAT_LABEL[statName]}
        </span>
      </div>
    </div>
  );
}
