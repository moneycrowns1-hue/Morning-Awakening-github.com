'use client';

// ═══════════════════════════════════════════════════════════
// MeditationScene · Full-screen Headspace-style background.
//
// v5 — THE REAL DEAL:
//   Inspired by Headspace's actual iOS meditation player:
//   · Full-screen layered organic waves that cover the
//     entire viewport as background
//   · Waves slowly breathe/undulate (very slow, calming)
//   · All 3 modes use the SAME wave visual (just color shift)
//   · Ultra-minimal: the scene IS the background
//   · No icons, no blobs, no small shapes — just waves
//
// Renders as an absolutely positioned full-screen container
// behind the meditation UI. Uses CSS + GSAP for animation.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import type { DeepMeditationMode } from '@/lib/wellness/wellnessRoutines';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';

interface MeditationSceneProps {
  mode: DeepMeditationMode;
  milestone?: string;
  completing?: boolean;
}

// Color schemes per mode (adapted to our Night amber palette)
const MODE_COLORS: Record<DeepMeditationMode, {
  bg: string;
  wave1: string;
  wave2: string;
  wave3: string;
  wave4: string;
}> = {
  mindfulness: {
    bg:    '#0c0a14',
    wave1: '#1e1640',
    wave2: '#2a1f5c',
    wave3: '#362878',
    wave4: '#281e60',
  },
  body_scan: {
    bg:    '#0a0e14',
    wave1: '#0f1e3a',
    wave2: '#162d52',
    wave3: '#1c3a6a',
    wave4: '#152c4f',
  },
  metta: {
    bg:    '#140c08',
    wave1: '#2a1810',
    wave2: '#3d2418',
    wave3: '#503020',
    wave4: '#3a2215',
  },
};

export default function MeditationScene({
  mode,
  completing,
}: MeditationSceneProps) {
  const wave1Ref = useRef<HTMLDivElement>(null);
  const wave2Ref = useRef<HTMLDivElement>(null);
  const wave3Ref = useRef<HTMLDivElement>(null);
  const wave4Ref = useRef<HTMLDivElement>(null);

  const colors = MODE_COLORS[mode] ?? MODE_COLORS.mindfulness;
  const { palette: N } = useNightPalette();

  // Gentle wave animation — very slow, calming movement
  useEffect(() => {
    const waves = [wave1Ref.current, wave2Ref.current, wave3Ref.current, wave4Ref.current];
    waves.forEach((w) => { if (w) gsap.killTweensOf(w); });

    if (completing) {
      // All waves lift upward slightly and fade
      waves.forEach((w, i) => {
        if (!w) return;
        gsap.to(w, {
          y: -(30 + i * 10),
          opacity: 0.4,
          duration: 3,
          ease: 'power2.out',
        });
      });
      return;
    }

    // Each wave undulates at slightly different speeds
    waves.forEach((w, i) => {
      if (!w) return;
      const duration = 8 + i * 3;
      const yRange = 12 + i * 5;

      gsap.to(w, {
        y: -yRange,
        duration,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 1.5,
      });

      // Subtle horizontal sway
      gsap.to(w, {
        x: (i % 2 === 0 ? 6 : -6),
        duration: duration * 1.3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.8,
      });
    });

    return () => {
      waves.forEach((w) => { if (w) gsap.killTweensOf(w); });
    };
  }, [completing]);

  // Wave paths — large organic curves that span the full width.
  // Styled similar to Headspace's iOS player: one giant curve
  // dividing two zones, with layered curves behind for depth.
  //
  // The SVG viewBox is 1440x900 (standard landscape) and we
  // render it at 100vw x 100vh.

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: colors.bg, zIndex: 0 }}
    >
      {/* Wave 4 — deepest, most subtle */}
      <div
        ref={wave4Ref}
        className="absolute w-full"
        style={{ bottom: '-5%', left: '-3%', right: '-3%' }}
      >
        <svg
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
          className="w-[106%] h-auto"
          style={{ display: 'block', minHeight: '50vh' }}
        >
          <path
            d="M0 380 C200 280, 400 420, 600 350 C800 280, 1000 400, 1200 340 C1300 310, 1400 360, 1440 350 L1440 600 L0 600 Z"
            fill={colors.wave4}
          />
        </svg>
      </div>

      {/* Wave 3 — main visible wave */}
      <div
        ref={wave3Ref}
        className="absolute w-full"
        style={{ bottom: '-8%', left: '-2%', right: '-2%' }}
      >
        <svg
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
          className="w-[104%] h-auto"
          style={{ display: 'block', minHeight: '55vh' }}
        >
          <path
            d="M0 320 C180 240, 360 380, 560 300 C760 220, 900 360, 1100 280 C1250 220, 1380 320, 1440 300 L1440 600 L0 600 Z"
            fill={colors.wave3}
          />
        </svg>
      </div>

      {/* Wave 2 — mid layer, the "hero" wave */}
      <div
        ref={wave2Ref}
        className="absolute w-full"
        style={{ bottom: '-10%', left: '-1%', right: '-1%' }}
      >
        <svg
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
          className="w-[102%] h-auto"
          style={{ display: 'block', minHeight: '60vh' }}
        >
          <path
            d="M0 260 C240 180, 480 340, 720 250 C960 160, 1100 300, 1300 230 C1380 200, 1420 260, 1440 250 L1440 600 L0 600 Z"
            fill={colors.wave2}
          />
        </svg>
      </div>

      {/* Wave 1 — foreground, most opaque, covers bottom */}
      <div
        ref={wave1Ref}
        className="absolute w-full"
        style={{ bottom: '-12%' }}
      >
        <svg
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
          className="w-full h-auto"
          style={{ display: 'block', minHeight: '65vh' }}
        >
          <path
            d="M0 220 C300 140, 500 300, 750 200 C1000 100, 1150 280, 1350 180 C1400 160, 1430 210, 1440 200 L1440 600 L0 600 Z"
            fill={colors.wave1}
          />
        </svg>
      </div>

      {/* Subtle ambient glow in the wave zone */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '40%',
          background: `radial-gradient(ellipse at 50% 80%, ${hexToRgba(N.amber, 0.06)} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
}
