'use client';

// ═══════════════════════════════════════════════════════
// GradientBackground · animated sunrise canvas
//
// Full-screen <canvas> that paints:
//   1. A radial gradient from a sky colour (top) to a horizon
//      colour (bottom-center, slightly below the viewport) so
//      it feels like a sun rising behind the fold.
//   2. ~60 slow floating particles (warm dust motes) whose
//      colour and density track the current stage accent.
//
// The `stage` prop accepts 'welcome' | 'complete' | 0..11.
// When it changes the gradient crossfades over 1.6 s via an
// eased interpolation between the previous and target stage
// colour pairs. Particles instantly inherit the new accent.
//
// Respects prefers-reduced-motion by pausing particle motion
// and shortening the crossfade.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useRef } from 'react';
import { getStageColors, mixHex, type StageColors } from '@/lib/theme';

type StageInput = 'welcome' | 'complete' | number;

interface GradientBackgroundProps {
  stage: StageInput;
  /** Density of particles. 0 = none. Default 60. */
  particleCount?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaDir: 1 | -1;
  twinkleSpeed: number;
}

const CROSSFADE_MS = 1600;

export default function GradientBackground({
  stage,
  particleCount = 60,
  className,
}: GradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetColors = useMemo<StageColors>(() => getStageColors(stage), [stage]);

  // Mutable animation state, kept outside React to avoid re-renders
  // on every frame (60 fps × setState would be catastrophic).
  const stateRef = useRef<{
    fromColors: StageColors;
    toColors: StageColors;
    transitionStart: number; // ms timestamp
    particles: Particle[];
    dpr: number;
    width: number;
    height: number;
    rafId: number | null;
    lastTs: number;
    reducedMotion: boolean;
  }>({
    fromColors: targetColors,
    toColors: targetColors,
    transitionStart: 0,
    particles: [],
    dpr: 1,
    width: 0,
    height: 0,
    rafId: null,
    lastTs: 0,
    reducedMotion: false,
  });

  // Kick off a crossfade whenever the stage colours change.
  useEffect(() => {
    const s = stateRef.current;
    // Snapshot the colour we're *currently* rendering as the new "from".
    // We compute it by sampling the current transition progress.
    const now = performance.now();
    const progress = s.transitionStart === 0
      ? 1
      : Math.min(1, (now - s.transitionStart) / CROSSFADE_MS);
    s.fromColors = interpolateStage(s.fromColors, s.toColors, progress);
    s.toColors = targetColors;
    s.transitionStart = now;
  }, [targetColors]);

  // Set up canvas, particles, and the RAF loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    s.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      s.dpr = Math.min(2, window.devicePixelRatio || 1);
      s.width = canvas.clientWidth;
      s.height = canvas.clientHeight;
      canvas.width = Math.floor(s.width * s.dpr);
      canvas.height = Math.floor(s.height * s.dpr);
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      // Re-seed particles proportional to area so density feels constant.
      seedParticles();
    };

    const seedParticles = () => {
      const count = s.reducedMotion ? Math.floor(particleCount * 0.3) : particleCount;
      s.particles = Array.from({ length: count }, () => ({
        x: Math.random() * s.width,
        y: Math.random() * s.height,
        r: 0.6 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.04 - Math.random() * 0.08, // slight upward drift
        alpha: 0.15 + Math.random() * 0.4,
        alphaDir: Math.random() > 0.5 ? 1 : -1,
        twinkleSpeed: 0.0008 + Math.random() * 0.0014,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (ts: number) => {
      const dt = s.lastTs === 0 ? 16 : ts - s.lastTs;
      s.lastTs = ts;

      // Interpolate colours.
      const progress = s.transitionStart === 0
        ? 1
        : Math.min(1, (ts - s.transitionStart) / (s.reducedMotion ? 200 : CROSSFADE_MS));
      const eased = easeInOutCubic(progress);
      const current = interpolateStage(s.fromColors, s.toColors, eased);

      // ── Background gradient ──────────────────────────────────
      // Radial gradient from the horizon (just below the fold) upwards.
      // The horizon is bright/warm; the sky at the top is deep twilight.
      const grad = ctx.createRadialGradient(
        s.width * 0.5,
        s.height * 0.88,          // horizon slightly lower than before
        0,
        s.width * 0.5,
        s.height * 0.88,
        Math.max(s.width, s.height) * 1.05,
      );
      grad.addColorStop(0.0, current.horizon);
      grad.addColorStop(0.35, mixHex(current.horizon, current.sky, 0.6));
      grad.addColorStop(0.7, current.sky);
      grad.addColorStop(1.0, current.sky);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s.width, s.height);

      // ── Legibility overlay (TOP) ──────────────────────────────
      // Always darken the top third to keep text readable regardless of
      // how bright the horizon gets in later phases. This is the
      // Light-Awake principle: text lives in the crepuscule, light
      // rises below.
      const topOverlay = ctx.createLinearGradient(0, 0, 0, s.height * 0.45);
      topOverlay.addColorStop(0, 'rgba(5,3,15,0.55)');
      topOverlay.addColorStop(0.6, 'rgba(5,3,15,0.18)');
      topOverlay.addColorStop(1, 'rgba(5,3,15,0)');
      ctx.fillStyle = topOverlay;
      ctx.fillRect(0, 0, s.width, s.height);

      // ── Warm horizon glow (BOTTOM) ───────────────────────────
      // A subtle warm wash below to push the horizon forward.
      const bottomOverlay = ctx.createLinearGradient(0, s.height * 0.55, 0, s.height);
      bottomOverlay.addColorStop(0, 'rgba(0,0,0,0)');
      bottomOverlay.addColorStop(1, hexWithAlpha(current.accent, 0.22));
      ctx.fillStyle = bottomOverlay;
      ctx.fillRect(0, 0, s.width, s.height);

      // ── Particles ────────────────────────────────────────────
      const particleFill = hexWithAlpha(current.particle, 1);
      for (const p of s.particles) {
        if (!s.reducedMotion) {
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.alpha += p.alphaDir * p.twinkleSpeed * dt;
          if (p.alpha > 0.55) { p.alpha = 0.55; p.alphaDir = -1; }
          if (p.alpha < 0.05) { p.alpha = 0.05; p.alphaDir = 1; }
          // Wrap
          if (p.y < -4) { p.y = s.height + 4; p.x = Math.random() * s.width; }
          if (p.x < -4) p.x = s.width + 4;
          if (p.x > s.width + 4) p.x = -4;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = particleFill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      s.rafId = window.requestAnimationFrame(render);
    };

    s.rafId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (s.rafId !== null) window.cancelAnimationFrame(s.rafId);
      s.rafId = null;
      s.lastTs = 0;
    };
    // particleCount changes are rare, but if it changes we want a fresh seed.
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className={['pointer-events-none', 'absolute', 'inset-0', 'w-full', 'h-full', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    />
  );
}

// ─── helpers ─────────────────────────────────────────────────

function interpolateStage(from: StageColors, to: StageColors, t: number): StageColors {
  return {
    sky: mixHex(from.sky, to.sky, t),
    horizon: mixHex(from.horizon, to.horizon, t),
    accent: mixHex(from.accent, to.accent, t),
    particle: mixHex(from.particle, to.particle, t),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
