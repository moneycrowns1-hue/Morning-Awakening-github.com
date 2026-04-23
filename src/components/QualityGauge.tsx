'use client';

// ═══════════════════════════════════════════════════════
// QualityGauge · 0..100 circular gauge for SummaryScreen
//
// Draws a 240° arc (270° with a cut at the bottom) that
// fills from left-bottom clockwise. The colour interpolates
// from dim coral (low) through amber to full gold+cream
// (high) so a great session visually glows.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { SUNRISE, hexToRgba, mixHex } from '@/lib/theme';

interface QualityGaugeProps {
  /** 0..100 */
  score: number;
  size?: number;
  /** Label under the score. */
  caption?: string;
}

export default function QualityGauge({ score, size = 240, caption = 'Score de hoy' }: QualityGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const [displayed, setDisplayed] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  // Animate the score number + arc from 0 -> target on mount.
  useEffect(() => {
    let start: number | null = null;
    const DUR = 1400; // ms
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / DUR);
      setDisplayed(Math.round(ease(t) * clampedScore));
      if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [clampedScore]);

  const STROKE = 8;
  const radius = size / 2 - STROKE;
  const cx = size / 2;
  const cy = size / 2;
  const START_DEG = 135; // arc start (bottom-left)
  const END_DEG = 405;   // arc end (bottom-right), 270° sweep

  const sweepRatio = displayed / 100;

  // Convert an angle to (x, y) on the gauge circle.
  const pointAt = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  // Build the SVG path for the arc between two angles.
  const arcPath = (fromDeg: number, toDeg: number) => {
    const p1 = pointAt(fromDeg);
    const p2 = pointAt(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} 1 ${p2.x} ${p2.y}`;
  };

  const trackPath = arcPath(START_DEG, END_DEG);
  const activePath = arcPath(
    START_DEG,
    START_DEG + sweepRatio * (END_DEG - START_DEG),
  );

  // Colour interpolation by score range.
  const gaugeColor = mixHex(
    clampedScore < 50 ? SUNRISE.dawn2 : SUNRISE.rise1,
    SUNRISE.rise2,
    clampedScore / 100,
  );

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <path d={trackPath} stroke={hexToRgba(SUNRISE.rise2, 0.1)} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
        {sweepRatio > 0 && (
          <path
            d={activePath}
            stroke={gaugeColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${hexToRgba(gaugeColor, 0.55)})` }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-display font-[400] leading-none tracking-[-0.03em]"
          style={{
            fontSize: size * 0.32,
            color: 'var(--sunrise-text)',
          }}
        >
          {displayed}
        </span>
        <span
          className="font-ui text-[10px] uppercase tracking-[0.4em] mt-3"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {caption}
        </span>
        <span
          className="font-mono text-[10px] mt-1"
          style={{ color: hexToRgba(gaugeColor, 0.8) }}
        >
          {scoreLabel(clampedScore)}
        </span>
      </div>
    </div>
  );
}

function scoreLabel(s: number): string {
  if (s >= 90) return 'EXCEPCIONAL';
  if (s >= 75) return 'EXCELENTE';
  if (s >= 60) return 'SÓLIDO';
  if (s >= 40) return 'EN CAMINO';
  return 'A RETOMAR';
}
