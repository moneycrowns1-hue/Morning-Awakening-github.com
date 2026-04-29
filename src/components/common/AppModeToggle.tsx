'use client';

// ═══════════════════════════════════════════════════════════════
// AppModeToggle · botón Sun/Moon que alterna día↔noche global.
//
// Usa `useAppMode()` para leer/escribir el modo activo. El cambio
// se propaga vía localStorage + custom event a `<PaletteBridge />`
// que reescribe las CSS vars del documento, lo que tinta toda la
// app instantáneamente.
//
// Diseño: chip circular minimalista, glass sutil sobre el fondo
// activo, tipografía ui · borde `--ma-text-divider`. El icono
// muestra el modo ACTIVO (sol = día, luna = noche). Animación
// micro-rotación + crossfade al cambiar.
// ═══════════════════════════════════════════════════════════════

import { Sun, Moon } from 'lucide-react';
import { useAppMode } from '@/lib/common/appMode';
import { haptics } from '@/lib/common/haptics';

interface AppModeToggleProps {
  /** Tamaño del botón. Default 36 px. */
  size?: number;
  /** Label opcional al lado del icono. */
  showLabel?: boolean;
  className?: string;
}

export default function AppModeToggle({
  size = 36,
  showLabel = false,
  className = '',
}: AppModeToggleProps) {
  const { mode, toggle } = useAppMode();
  const isDay = mode === 'day';
  const Icon = isDay ? Sun : Moon;
  const next = isDay ? 'noche' : 'día';

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); toggle(); }}
      aria-label={`Cambiar a modo ${next}`}
      title={`Cambiar a modo ${next}`}
      className={`inline-flex items-center gap-2 rounded-full transition-transform active:scale-[0.94] ${className}`}
      style={{
        width: showLabel ? undefined : size,
        height: size,
        padding: showLabel ? '0 14px 0 12px' : 0,
        justifyContent: 'center',
        background: 'var(--ma-bg-card)',
        border: '1px solid var(--ma-text-divider)',
        color: 'var(--ma-accent)',
      }}
    >
      <Icon
        size={Math.round(size * 0.46)}
        strokeWidth={1.85}
        style={{
          transition: 'transform 320ms cubic-bezier(.2,.7,.2,1), opacity 220ms',
          transform: isDay ? 'rotate(0deg)' : 'rotate(-22deg)',
        }}
      />
      {showLabel && (
        <span
          className="font-ui text-[10px] tracking-[0.3em] uppercase font-[600]"
          style={{ color: 'var(--ma-text-soft)' }}
        >
          {isDay ? 'día' : 'noche'}
        </span>
      )}
    </button>
  );
}
