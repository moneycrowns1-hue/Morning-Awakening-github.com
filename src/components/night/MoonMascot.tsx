'use client';

/**
 * MoonMascot — violet/rose moon SVG with breathing + blinking animations.
 * Used in: NightWelcomeScreen hero, STILLNESS phase (breath guide),
 * SLUMBER LOCK screen. Scales cleanly from 32 px (favicon) to 320 px (hero).
 *
 * Props:
 *  - size: pixel size (square). Default 180.
 *  - breathing: 4-7-8 synchronized glow + scale pulse.
 *  - blinking: random blinks every 6–10 s (eyes already closed; this squashes them).
 *  - floating: vertical ±6 px drift (4 s). Useful in hero / lock.
 *  - phase: for breath-guided pulse. When provided, overrides breathing timing:
 *            'inhale' (4 s scale up) · 'hold' (7 s, stay) · 'exhale' (8 s, scale down) · 'rest'.
 */

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

interface MoonMascotProps {
  size?: number;
  breathing?: boolean;
  blinking?: boolean;
  floating?: boolean;
  phase?: BreathPhase;
  className?: string;
}

export default function MoonMascot({
  size = 180,
  breathing = true,
  blinking = true,
  floating = true,
  phase,
  className = '',
}: MoonMascotProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);

  // Float drift (vertical)
  useLayoutEffect(() => {
    if (!floating || !rootRef.current) return;
    const tween = gsap.to(rootRef.current, {
      y: -6,
      duration: 4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
      gsap.set(rootRef.current, { y: 0 });
    };
  }, [floating]);

  // Breathing (auto 4-7-8 loop if no phase prop)
  useLayoutEffect(() => {
    if (!breathing || phase) return;
    if (!bodyRef.current || !haloRef.current) return;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to([bodyRef.current, haloRef.current], {
      scale: 1.04,
      transformOrigin: '50% 50%',
      duration: 4,
      ease: 'sine.inOut',
    })
      .to([bodyRef.current, haloRef.current], {
        duration: 7,
        ease: 'none',
      })
      .to([bodyRef.current, haloRef.current], {
        scale: 1,
        transformOrigin: '50% 50%',
        duration: 8,
        ease: 'sine.inOut',
      });
    return () => {
      tl.kill();
      gsap.set([bodyRef.current, haloRef.current], { scale: 1 });
    };
  }, [breathing, phase]);

  // External-phase-driven breathing (used by STILLNESS)
  useLayoutEffect(() => {
    if (!phase) return;
    if (!bodyRef.current || !haloRef.current) return;
    const targets = [bodyRef.current, haloRef.current];
    switch (phase) {
      case 'inhale':
        gsap.to(targets, { scale: 1.08, transformOrigin: '50% 50%', duration: 4, ease: 'sine.out' });
        break;
      case 'hold':
        gsap.to(targets, { scale: 1.08, transformOrigin: '50% 50%', duration: 7, ease: 'none' });
        break;
      case 'exhale':
        gsap.to(targets, { scale: 0.98, transformOrigin: '50% 50%', duration: 8, ease: 'sine.inOut' });
        break;
      case 'rest':
      default:
        gsap.to(targets, { scale: 1, transformOrigin: '50% 50%', duration: 1, ease: 'sine.inOut' });
        break;
    }
  }, [phase]);

  // Blink (squash eyes briefly every 6–10 s)
  useLayoutEffect(() => {
    if (!blinking || !eyesRef.current) return;
    let alive = true;
    const schedule = () => {
      if (!alive) return;
      const delay = 6 + Math.random() * 4;
      gsap.delayedCall(delay, () => {
        if (!alive || !eyesRef.current) return;
        gsap.to(eyesRef.current, {
          scaleY: 0.25,
          transformOrigin: '50% 50%',
          duration: 0.12,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          onComplete: schedule,
        });
      });
    };
    schedule();
    return () => {
      alive = false;
      if (eyesRef.current) gsap.set(eyesRef.current, { scaleY: 1 });
    };
  }, [blinking]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ width: size, height: size, display: 'inline-block', willChange: 'transform' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 512 512" width={size} height={size}>
        <defs>
          <radialGradient id="mm-halo-far" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4c2ff" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#d9a3ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6b2c8f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mm-halo-petal" cx="50%" cy="78%" r="55%">
            <stop offset="0%" stopColor="#ffd4e5" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#ffd4e5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mm-body" cx="42%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f4c2ff" />
            <stop offset="35%" stopColor="#d9a3ff" />
            <stop offset="75%" stopColor="#8a3fb0" />
            <stop offset="100%" stopColor="#4a1d6e" />
          </radialGradient>
          <radialGradient id="mm-highlight" cx="38%" cy="28%" r="32%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mm-cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff8fb8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ff8fb8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle ref={haloRef} cx="256" cy="256" r="248" fill="url(#mm-halo-far)" />
        <circle cx="256" cy="340" r="200" fill="url(#mm-halo-petal)" />

        <g ref={bodyRef}>
          <circle cx="256" cy="256" r="170" fill="url(#mm-body)" />
          <circle cx="256" cy="256" r="170" fill="url(#mm-highlight)" />
          <ellipse cx="178" cy="300" rx="34" ry="22" fill="url(#mm-cheek)" />
          <ellipse cx="334" cy="300" rx="34" ry="22" fill="url(#mm-cheek)" />
          <g ref={eyesRef} stroke="#2a0f45" strokeWidth="8" strokeLinecap="round" fill="none">
            <path d="M 190 252 Q 210 232 230 252" />
            <path d="M 282 252 Q 302 232 322 252" />
          </g>
          <path
            d="M 224 318 Q 256 340 288 318"
            stroke="#2a0f45"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <circle
            cx="256"
            cy="256"
            r="168"
            fill="none"
            stroke="#2a0f45"
            strokeOpacity="0.12"
            strokeWidth="4"
          />
        </g>
      </svg>
    </div>
  );
}
