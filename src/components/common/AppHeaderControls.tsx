'use client';

// ═══════════════════════════════════════════════════════════════
// AppHeaderControls · chip de toggle día/noche para el header de
// Welcome (o cualquier pantalla principal).
//
// La selección de PALETA (familia) vive en Settings — aquí solo
// el flip rápido entre claro y oscuro.
// ═══════════════════════════════════════════════════════════════

import { Moon, Sun } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { useAppMode } from '@/lib/common/appMode';
import { haptics } from '@/lib/common/haptics';

interface AppHeaderControlsProps {
  /** Tamaño del icono (alto del chip ~ size+18 px). Default 14. */
  iconSize?: number;
  className?: string;
}

export default function AppHeaderControls({
  iconSize = 14,
  className = '',
}: AppHeaderControlsProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const { mode, toggle } = useAppMode();

  const ModeIcon = mode === 'day' ? Sun : Moon;
  const next = mode === 'day' ? 'noche' : 'día';

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); toggle(); }}
      aria-label={`Cambiar a modo ${next}`}
      title={`Cambiar a modo ${next}`}
      className={`inline-flex items-center justify-center rounded-full transition-transform active:scale-[0.94] ${className}`}
      style={{
        width: iconSize + 18,
        height: iconSize + 18,
        background: hexToRgba(D.ink, 0.04),
        border: `1px solid ${DT.divider}`,
        color: D.accent,
      }}
    >
      <ModeIcon
        size={iconSize}
        strokeWidth={1.85}
        style={{
          transition: 'transform 320ms cubic-bezier(.2,.7,.2,1)',
          transform: mode === 'day' ? 'rotate(0deg)' : 'rotate(-22deg)',
        }}
      />
    </button>
  );
}
