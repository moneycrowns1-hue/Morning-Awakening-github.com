'use client';

// ═══════════════════════════════════════════════════════
// NightStarfield · fixed-position canvas of twinkling
// stars + occasional shooting stars. Pure GSAP driven
// (no per-frame React re-renders). Pointer-events: none
// so it never intercepts taps.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface NightStarfieldProps {
  /** Stars count. Default 80 is a good balance for iPad. */
  count?: number;
  /** Whether to emit shooting stars every ~60 s. */
  shooting?: boolean;
}

export default function NightStarfield({ count = 80, shooting = true }: NightStarfieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // ── Build star DOM ──
    const stars: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      const size = Math.random() < 0.1 ? 2.6 : Math.random() < 0.4 ? 1.6 : 1;
      s.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(255, 250, 240, ${0.45 + Math.random() * 0.55});
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 95}%;
        will-change: opacity, transform;
        box-shadow: 0 0 ${size * 2.5}px rgba(244, 194, 103, 0.25);
        pointer-events: none;
      `;
      root.appendChild(s);
      stars.push(s);
    }

    // Twinkle loop — randomised per-star.
    const tweens = stars.map((s) =>
      gsap.to(s, {
        opacity: 0.2 + Math.random() * 0.35,
        duration: 1.6 + Math.random() * 2.8,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2,
        ease: 'sine.inOut',
      }),
    );

    // ── Shooting star loop ──
    let shootTimeout: number | null = null;
    const spawnShootingStar = () => {
      if (!root) return;
      const star = document.createElement('span');
      const startY = 5 + Math.random() * 35;
      const startX = -5 + Math.random() * 40;
      star.style.cssText = `
        position: absolute;
        top: ${startY}%;
        left: ${startX}%;
        width: 2px;
        height: 2px;
        border-radius: 50%;
        background: rgba(255, 250, 240, 1);
        box-shadow: 0 0 12px 3px rgba(244, 194, 103, 0.8),
                    -40px -22px 30px -10px rgba(244, 194, 103, 0.35);
        pointer-events: none;
        opacity: 0;
      `;
      root.appendChild(star);
      gsap.to(star, {
        keyframes: [{ opacity: 1, duration: 0.15 }, { opacity: 0, duration: 1.1 }],
        x: '40vw',
        y: '22vh',
        duration: 1.25,
        ease: 'power1.in',
        onComplete: () => { star.remove(); },
      });
      // Schedule next one in 45..90 s.
      shootTimeout = window.setTimeout(spawnShootingStar, 45_000 + Math.random() * 45_000);
    };
    if (shooting) {
      shootTimeout = window.setTimeout(spawnShootingStar, 6_000 + Math.random() * 4_000);
    }

    return () => {
      tweens.forEach((t) => t.kill());
      if (shootTimeout) clearTimeout(shootTimeout);
      stars.forEach((s) => s.remove());
    };
  }, [count, shooting]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    />
  );
}
