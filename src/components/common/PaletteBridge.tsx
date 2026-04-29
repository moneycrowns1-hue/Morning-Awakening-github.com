'use client';

// ═══════════════════════════════════════════════════════════════
// PaletteBridge · puente entre estado React (paleta + modo) y
// las CSS variables del documento.
//
// Se monta UNA SOLA VEZ en el root layout. No renderiza nada.
// Cada vez que cambia la familia de paleta (calm/cocoa/oxblood/
// forest/pearl) o el modo (day/night), reescribe el bloque de
// vars en `document.documentElement.style`. El navegador entonces
// re-evalúa todas las apariciones de `var(--ma-bg)`, `var(--ma-accent)`,
// etc. en la app sin que React tenga que re-renderizar nada.
//
// Variables escritas (mismo set siempre, valores distintos según
// modo + familia):
//   --ma-bg, --ma-bg-deep, --ma-bg-card, --ma-bg-elevated
//   --ma-accent, --ma-accent-soft, --ma-accent-deep, --ma-accent-warm
//   --ma-ink
//   --ma-text-primary, --ma-text-soft, --ma-text-muted, --ma-text-divider
//   --ma-mode (string: "day" | "night", para selectores condicionales)
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { useAppMode } from '@/lib/common/appMode';
import { DAY_BY_ID } from '@/lib/common/appTheme';

export default function PaletteBridge(): null {
  const { palette: night, paletteText: nightText, id } = useNightPalette();
  const { mode } = useAppMode();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (mode === 'day') {
      const day = DAY_BY_ID[id]?.palette ?? DAY_BY_ID.calm.palette;
      const dayText = DAY_BY_ID[id]?.text ?? DAY_BY_ID.calm.text;
      root.style.setProperty('--ma-bg',          day.paper);
      root.style.setProperty('--ma-bg-deep',     day.tint_deep);
      root.style.setProperty('--ma-bg-card',     day.tint);
      root.style.setProperty('--ma-bg-elevated', day.tint_strong);
      root.style.setProperty('--ma-accent',      day.accent);
      root.style.setProperty('--ma-accent-soft', day.accent_soft);
      root.style.setProperty('--ma-accent-deep', day.accent_deep);
      root.style.setProperty('--ma-accent-warm', day.accent_warm);
      root.style.setProperty('--ma-ink',         day.ink);
      root.style.setProperty('--ma-text-primary', dayText.primary);
      root.style.setProperty('--ma-text-soft',    dayText.soft);
      root.style.setProperty('--ma-text-muted',   dayText.muted);
      root.style.setProperty('--ma-text-divider', dayText.divider);
    } else {
      root.style.setProperty('--ma-bg',          night.void);
      root.style.setProperty('--ma-bg-deep',     night.ember_deep);
      root.style.setProperty('--ma-bg-card',     night.ember_1);
      root.style.setProperty('--ma-bg-elevated', night.ember_2);
      root.style.setProperty('--ma-accent',      night.amber);
      root.style.setProperty('--ma-accent-soft', night.amber_glow);
      root.style.setProperty('--ma-accent-deep', night.amber_deep);
      root.style.setProperty('--ma-accent-warm', night.candle);
      root.style.setProperty('--ma-ink',         night.cream);
      root.style.setProperty('--ma-text-primary', nightText.primary);
      root.style.setProperty('--ma-text-soft',    nightText.soft);
      root.style.setProperty('--ma-text-muted',   nightText.muted);
      root.style.setProperty('--ma-text-divider', nightText.divider);
    }
    root.style.setProperty('--ma-mode', mode);
    root.dataset.maMode = mode;
    root.dataset.maPalette = id;
  }, [mode, id, night, nightText]);

  return null;
}
