'use client';

// ═══════════════════════════════════════════════════════
// LevelUpOverlay · sunrise reskin. Plays once on XP rollover.
// 'Ascenso' kicker → rank kanji pulse → new level and (if the
// title also changed) new rank line. Auto-dismisses after ~2s
// (or ~3.2s when the title changed).
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { getRankByLevel } from '@/lib/constants';
import { hexToRgba } from '@/lib/theme';

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
    // force GPU compositing so iPad doesn't repaint every frame
    gsap.set([overlay, seal], { force3D: true, willChange: 'transform, opacity' });
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([overlay, seal], { clearProps: 'willChange' });
        onDone();
      },
    });
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
    tl.fromTo(
      seal,
      { scale: 1.8, opacity: 0, rotate: -10 },
      { scale: 1, opacity: 1, rotate: -4, duration: 0.55, ease: 'back.out(1.5)' },
      '-=0.1',
    );
    tl.to(overlay, { opacity: 0, duration: 0.45, delay: rankChanged ? 3.2 : 2.0 });
  }, [onDone, rankChanged]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
      style={{
        /* NOTE: backdrop-filter blur was removed here due to heavy iPad
           jank during the scale animation. We use a solid radial
           vignette in the sunrise palette instead. */
        background:
          'radial-gradient(ellipse at center, rgba(26,15,46,0.96) 0%, rgba(5,3,15,0.98) 70%)',
        color: 'var(--sunrise-text)',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      <div
        className="font-ui text-[10px] uppercase tracking-[0.5em] mb-4"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        Ascenso
      </div>

      <div
        ref={sealRef}
        className="mb-6 flex items-center justify-center rounded-2xl"
        style={{
          width: '6rem',
          height: '6rem',
          fontSize: '3.6rem',
          color: rank.color,
          border: `1.5px solid ${hexToRgba(rank.color, 0.5)}`,
          boxShadow: `0 0 36px ${hexToRgba(rank.color, 0.35)}, inset 0 0 18px ${hexToRgba(rank.color, 0.15)}`,
          fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
        }}
      >
        {rank.kanji}
      </div>

      <div
        className="font-display italic text-[32px] leading-none mb-1"
        style={{ color: 'var(--sunrise-text)' }}
      >
        Nivel {newLevel}
      </div>

      {rankChanged && (
        <div className="mt-5">
          <div
            className="font-ui text-[10px] uppercase tracking-[0.4em] mb-1"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Nuevo rango
          </div>
          <div
            className="font-ui text-[18px] tracking-[0.2em] font-[500]"
            style={{ color: rank.color }}
          >
            {rank.titleEs}
          </div>
        </div>
      )}

      <div
        className="mt-6 font-ui text-[12px] tracking-wider max-w-xs"
        style={{ color: 'var(--sunrise-text-soft)' }}
      >
        {rankChanged ? 'El sello ha sido actualizado, operador.' : 'El camino continúa.'}
      </div>
    </div>
  );
}
