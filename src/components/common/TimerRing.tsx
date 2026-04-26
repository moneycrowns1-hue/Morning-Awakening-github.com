'use client';

// ═══════════════════════════════════════════════════════
// TimerRing · sunrise SVG circular timer
//
// Shows `progress` (0..1) as an arc drawn in the accent
// colour for the current stage, over a subtle track. In
// the centre we display `label` (big, Inter) plus an
// optional `caption` (small, tracking UI label).
//
// When `paused` is true the ring dims + pulses slowly.
// When `progress >= 0.9` the arc glows stronger to signal
// "almost done".
//
// Pure presentational — state is owned by the parent.
// ═══════════════════════════════════════════════════════

import { useMemo } from 'react';
import { getStageColors, hexToRgba } from '@/lib/common/theme';

interface TimerRingProps {
  progress: number;
  label: string;
  caption?: string;
  /** Mission index 0..11 for accent colour. */
  stage: number | 'welcome' | 'complete';
  /** Pixel size (width = height). Default 220. */
  size?: number;
  paused?: boolean;
  onCentreClick?: () => void;
}

export default function TimerRing({
  progress,
  label,
  caption,
  stage,
  size = 220,
  paused = false,
  onCentreClick,
}: TimerRingProps) {
  const { accent } = getStageColors(stage);
  const clamped = Math.max(0, Math.min(1, progress));
  const STROKE = 4;

  // The ring radius is derived from the size so the stroke
  // never clips at smaller renders on small viewports.
  const { radius, circumference, cx, cy } = useMemo(() => {
    const r = size / 2 - STROKE * 2;
    return { radius: r, circumference: 2 * Math.PI * r, cx: size / 2, cy: size / 2 };
  }, [size]);

  const dashOffset = circumference * (1 - clamped);
  const glowAlpha = clamped >= 0.9 ? 0.75 : 0.45;

  return (
    <button
      type="button"
      onClick={onCentreClick}
      disabled={!onCentreClick}
      aria-label={onCentreClick ? 'Pausar o reanudar' : undefined}
      className="relative shrink-0 rounded-full transition-transform active:scale-[0.985]"
      style={{
        width: size,
        height: size,
        cursor: onCentreClick ? 'pointer' : 'default',
        opacity: paused ? 0.82 : 1,
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={hexToRgba(accent, 0.12)}
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 8px ${hexToRgba(accent, glowAlpha)})`,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
          }}
        />
        {/* Inner hairline ring for depth */}
        <circle
          cx={cx}
          cy={cy}
          r={radius - 12}
          fill="none"
          stroke={hexToRgba(accent, 0.06)}
          strokeWidth={1}
        />
      </svg>

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-mono font-[500] leading-none tracking-[-0.02em]"
          style={{
            fontSize: size * 0.22,
            color: 'var(--sunrise-text)',
          }}
        >
          {label}
        </span>
        {caption && (
          <span
            className="mt-3 font-ui text-[10px] uppercase tracking-[0.4em]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            {caption}
          </span>
        )}
      </div>

      {/* Pause indicator bars */}
      {paused && (
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none" style={{ paddingBottom: '18%' }}>
          <div className="flex gap-1.5 items-center">
            <span className="block w-[3px] h-3 rounded-full" style={{ background: hexToRgba(accent, 0.7) }} />
            <span className="block w-[3px] h-3 rounded-full" style={{ background: hexToRgba(accent, 0.7) }} />
          </div>
        </div>
      )}
    </button>
  );
}
