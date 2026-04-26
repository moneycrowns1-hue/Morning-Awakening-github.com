'use client';

// ═══════════════════════════════════════════════════════════
// IconosLogo · renders the user's actual iconos.jpeg as the
// hero mascot, with a gentle float + breath CSS animation.
// Use this wherever we want the REAL mascot (welcome, summary,
// lock). Inside the breathing-phase of NightMissionPhase we
// still use the animated MoonMascot SVG because that one has
// to morph with 4-7-8 rhythm.
// ═══════════════════════════════════════════════════════════

import { CSSProperties } from 'react';
import { withBasePath } from '@/lib/common/publicPath';

interface IconosLogoProps {
  /** Displayed diameter in px. The JPEG scales by `object-fit: cover`. */
  size?: number;
  /** Turn the idle float + breath on/off. */
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function IconosLogo({
  size = 200,
  animated = true,
  className = '',
  style,
}: IconosLogoProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    >
      {/* Outer halo */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(230,200,255,0.35) 0%, rgba(200,160,240,0.18) 40%, rgba(120,70,180,0) 72%)',
          transform: 'scale(1.4)',
          animation: animated ? 'iconos-glow 6s ease-in-out infinite' : undefined,
        }}
      />
      {/* The PNG mascot. Its background is solid white, so we
          zoom in so only the moon + a little glow are visible,
          and fade the outer edge with a radial mask so the white
          dissolves into the dark violet screen background. */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          animation: animated ? 'iconos-float 5.5s ease-in-out infinite, iconos-breath 7s ease-in-out infinite' : undefined,
          // Radial mask: opaque in the center, transparent at the edge.
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 42%, rgba(0,0,0,0.5) 58%, transparent 72%)',
          maskImage: 'radial-gradient(circle at 50% 50%, #000 42%, rgba(0,0,0,0.5) 58%, transparent 72%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBasePath('/icono.png')}
          alt=""
          draggable={false}
          style={{
            // Zoom in ~2.2x and center on the moon.
            width: '220%',
            height: '220%',
            marginLeft: '-60%',
            marginTop: '-60%',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes iconos-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes iconos-breath {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.08); }
        }
        @keyframes iconos-glow {
          0%, 100% { opacity: 0.85; transform: scale(1.35); }
          50%      { opacity: 1;    transform: scale(1.5);  }
        }
      `}</style>
    </div>
  );
}
