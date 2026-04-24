'use client';

// ═══════════════════════════════════════════════════════════
// IconosBackground · replica del ambiente del logo iconos.jpeg
//
// Capas, de abajo hacia arriba:
//   1. Base índigo profundo → violeta medio.
//   2. Resplandor rosado en el horizonte inferior (elipse muy
//      difuminada, tipo "luz que sube del suelo").
//   3. Halo central lavanda donde vive la mascota/CTA.
//   4. Campo estelar determinístico (SVG, ~70 puntos, tamaños
//      y alphas variables).
//   5. Rayos verticales muy sutiles desde el horizonte (mask
//      con gradiente cónico, opacidad ~8 %).
//
// Pensado como full-bleed absolute inset-0 pointer-events-none,
// se coloca detrás del contenido con z-0.
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';

interface IconosBackgroundProps {
  /** Posición vertical del halo central (0 = top, 1 = bottom). 0.42 por defecto. */
  haloY?: number;
  /** Intensidad del resplandor rosado inferior (0..1). */
  bottomGlow?: number;
  /** Densidad del campo estelar. */
  starCount?: number;
  className?: string;
}

export default function IconosBackground({
  haloY = 0.42,
  bottomGlow = 1,
  starCount = 70,
  className = '',
}: IconosBackgroundProps) {
  const stars = useMemo(() => {
    const rng = mulberry32(9137);
    return Array.from({ length: starCount }, () => {
      const y = rng();
      // Stars are denser in the top 60 %, sparser near the bottom glow.
      const keepProb = y < 0.6 ? 1 : 0.35;
      if (rng() > keepProb) return null;
      return {
        x: rng() * 100,
        y: y * 100,
        r: rng() * 1.6 + 0.25,
        // Soft twinkle alpha, stars near the top glow a bit less (behind haze).
        a: rng() * 0.55 + 0.18,
        hue: rng() > 0.82 ? 'rose' : 'white',
      };
    }).filter(Boolean) as Array<{ x: number; y: number; r: number; a: number; hue: 'rose' | 'white' }>;
  }, [starCount]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* ─── Layer 1 · base vertical gradient (índigo profundo → violeta) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, ' +
              '#0d0828 0%, ' +    // indigo casi negro arriba
              '#1a1048 18%, ' +   // violet dark
              '#2e1968 38%, ' +   // violet mid
              '#4a2a8a 58%, ' +   // violet brightening
              '#6b3aa0 74%, ' +   // lavender-violet
              '#8a4aa8 88%, ' +   // pinker violet near horizon
              '#4a2068 100%' +    // fade back into deep at the very bottom
            ')',
        }}
      />

      {/* ─── Layer 2 · bottom rosy horizon glow (wide elliptical) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(120% 55% at 50% 96%, ` +
              `rgba(255, 190, 230, ${0.45 * bottomGlow}) 0%, ` +
              `rgba(230, 140, 200, ${0.32 * bottomGlow}) 18%, ` +
              `rgba(180, 100, 170, ${0.18 * bottomGlow}) 38%, ` +
              `rgba(120, 70, 140, 0) 65%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* ─── Layer 3 · central lavender halo (where the mascot lives) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(42% 36% at 50% ${haloY * 100}%, ` +
              'rgba(230, 200, 255, 0.20) 0%, ' +
              'rgba(200, 160, 240, 0.12) 28%, ' +
              'rgba(160, 110, 210, 0.06) 55%, ' +
              'rgba(120, 70, 180, 0) 80%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* ─── Layer 4 · vertical light rays from the horizon (soft) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'conic-gradient(from 270deg at 50% 100%, ' +
              'transparent 0deg, ' +
              'rgba(255, 200, 230, 0.055) 18deg, ' +
              'transparent 30deg, ' +
              'rgba(255, 200, 230, 0.04) 48deg, ' +
              'transparent 62deg, ' +
              'rgba(255, 200, 230, 0.05) 82deg, ' +
              'transparent 96deg, ' +
              'rgba(255, 200, 230, 0.04) 116deg, ' +
              'transparent 180deg)',
          mixBlendMode: 'screen',
          opacity: 0.65 * bottomGlow,
        }}
      />

      {/* ─── Layer 5 · starfield */}
      <svg className="absolute inset-0 w-full h-full">
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill={s.hue === 'rose' ? '#ffd4e5' : '#f6ecff'}
            opacity={s.a}
          />
        ))}
      </svg>

      {/* ─── Layer 6 · top vignette (darkens status bar area) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,4,20,0.55) 0%, rgba(8,4,20,0) 16%, rgba(8,4,20,0) 80%, rgba(8,4,20,0.4) 100%)',
        }}
      />
    </div>
  );
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
