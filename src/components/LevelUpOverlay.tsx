'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { getRankByLevel } from '@/lib/constants';

interface LevelUpOverlayProps {
  newLevel: number;
  previousLevel: number;
  onDone: () => void;
}

export default function LevelUpOverlay({ newLevel, previousLevel, onDone }: LevelUpOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const rank = getRankByLevel(newLevel);
  const previousRank = getRankByLevel(previousLevel);
  const rankChanged = rank.title !== previousRank.title;

  useEffect(() => {
    const overlay = overlayRef.current;
    const seal = sealRef.current;
    if (!overlay || !seal) { onDone(); return; }
    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    tl.fromTo(seal,
      { scale: 2.4, opacity: 0, rotate: -14 },
      { scale: 1, opacity: 1, rotate: -4, duration: 0.6, ease: 'back.out(1.6)' },
      '-=0.1'
    );
    tl.to(overlay, { opacity: 0, duration: 0.5, delay: rankChanged ? 3.4 : 2.2 });
  }, [onDone, rankChanged]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(10,9,8,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="text-[12px] tracking-[0.6em] mb-3"
        style={{ color: '#c9a227', opacity: 0.7 }}
      >
        ◇ ASCENSO ◇
      </div>

      <div
        ref={sealRef}
        className="kanji-seal text-3xl mb-6"
        style={{ width: '6rem', height: '6rem', fontSize: '3.6rem' }}
      >
        {rank.kanji}
      </div>

      <div
        className="text-2xl font-bold tracking-[0.25em]"
        style={{ color: rank.color, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
      >
        NIVEL {newLevel}
      </div>

      {rankChanged && (
        <div className="mt-4 text-center">
          <div className="text-[12px] tracking-[0.3em] text-washi/40 mb-1">NUEVO RANGO</div>
          <div
            className="text-xl font-bold tracking-[0.3em]"
            style={{ color: rank.color, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            {rank.titleEs}
          </div>
        </div>
      )}

      <div className="mt-6 text-[13px] tracking-widest text-washi/50 text-center max-w-xs">
        {rankChanged ? 'El sello ha sido actualizado, Operador.' : 'El camino continúa.'}
      </div>
    </div>
  );
}
