'use client';

// ═══════════════════════════════════════════════════════════════
// appMode.ts · selector global día/noche.
//
// Determina qué set de valores asume cada CSS var del sistema:
// - mode='day'   → vars apuntan al hex de la paleta DIURNA
// - mode='night' → vars apuntan al hex de la paleta NOCTURNA
//
// La paleta familia (calm/cocoa/oxblood/forest/pearl) se elige por
// separado en `useNightPalette`. Mode + Family = par único de hex
// que el `<PaletteBridge />` empuja a `document.documentElement`.
//
// Persistencia + sincronización entre pestañas (storage event) y
// hermanos (custom event ma:app-mode-change) — mismo patrón que
// useNightPalette.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

export type AppMode = 'day' | 'night';

const STORAGE_KEY = 'ma.app.mode';
const EVENT_NAME = 'ma:app-mode-change';
const DEFAULT_MODE: AppMode = 'day';

function readStoredMode(): AppMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'day' || raw === 'night' ? raw : DEFAULT_MODE;
}

export function setAppMode(mode: AppMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent<AppMode>(EVENT_NAME, { detail: mode }));
}

export function getAppMode(): AppMode {
  return readStoredMode();
}

/** React hook · subscribe to current mode + setter. */
export function useAppMode(): {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggle: () => void;
} {
  const [mode, setLocal] = useState<AppMode>(() => readStoredMode());

  useEffect(() => {
    const stored = readStoredMode();
    setLocal((prev) => (prev === stored ? prev : stored));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<AppMode>).detail;
      if (detail === 'day' || detail === 'night') setLocal(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocal(readStoredMode());
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return {
    mode,
    setMode: setAppMode,
    toggle: () => setAppMode(mode === 'day' ? 'night' : 'day'),
  };
}
