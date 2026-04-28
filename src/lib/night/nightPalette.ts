'use client';

// ═══════════════════════════════════════════════════════════════
// nightPalette.ts · selector global de paleta nocturna
// Persistencia en localStorage + custom event para que los
// componentes hermanos se enteren cuando cambia.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  NIGHT_CALM,    NIGHT_CALM_TEXT,
  NIGHT_COCOA,   NIGHT_COCOA_TEXT,
  NIGHT_OXBLOOD, NIGHT_OXBLOOD_TEXT,
  NIGHT_FOREST,  NIGHT_FOREST_TEXT,
  NIGHT_PEARL,   NIGHT_PEARL_TEXT,
} from './nightTheme';

export type NightPaletteId = 'calm' | 'cocoa' | 'oxblood' | 'forest' | 'pearl';

// Tipos estructurales (no literales) para permitir asignar las distintas paletas.
export type NightPalette = {
  readonly void:        string;
  readonly ember_deep:  string;
  readonly ember_1:     string;
  readonly ember_2:     string;
  readonly amber:       string;
  readonly amber_glow:  string;
  readonly amber_deep:  string;
  readonly candle:      string;
  readonly cream:       string;
};
export type NightPaletteText = {
  readonly primary: string;
  readonly soft:    string;
  readonly muted:   string;
  readonly divider: string;
};

export interface NightPaletteOption {
  id: NightPaletteId;
  label: string;
  hint: string;
  palette: NightPalette;
  paletteText: NightPaletteText;
}

export const PALETTE_OPTIONS: NightPaletteOption[] = [
  { id: 'calm',    label: 'ember',   hint: 'naranja cálido',  palette: NIGHT_CALM,    paletteText: NIGHT_CALM_TEXT },
  { id: 'cocoa',   label: 'cocoa',   hint: 'cacao + dorado',  palette: NIGHT_COCOA,   paletteText: NIGHT_COCOA_TEXT },
  { id: 'oxblood', label: 'oxblood', hint: 'borgoña + rosé',  palette: NIGHT_OXBLOOD, paletteText: NIGHT_OXBLOOD_TEXT },
  { id: 'forest',  label: 'forest',  hint: 'oliva + sage',    palette: NIGHT_FOREST,  paletteText: NIGHT_FOREST_TEXT },
  { id: 'pearl',   label: 'pearl',   hint: 'grafito + perla', palette: NIGHT_PEARL,   paletteText: NIGHT_PEARL_TEXT },
];

const STORAGE_KEY = 'ma.night.palette';
const EVENT_NAME = 'ma:night-palette-change';

const DEFAULT_ID: NightPaletteId = 'calm';

function readStoredId(): NightPaletteId {
  if (typeof window === 'undefined') return DEFAULT_ID;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return PALETTE_OPTIONS.find((o) => o.id === raw)?.id ?? DEFAULT_ID;
}

export function setNightPaletteId(id: NightPaletteId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent<NightPaletteId>(EVENT_NAME, { detail: id }));
}

export function getNightPaletteOption(id: NightPaletteId): NightPaletteOption {
  return PALETTE_OPTIONS.find((o) => o.id === id) ?? PALETTE_OPTIONS[0];
}

/** React hook · subscribe to current palette + setter. */
export function useNightPalette(): {
  id: NightPaletteId;
  setId: (id: NightPaletteId) => void;
  palette: NightPalette;
  paletteText: NightPaletteText;
  options: NightPaletteOption[];
} {
  // Lazy initializer: read from localStorage synchronously on the very first
  // render so the component never paints a frame with the default palette
  // before the stored one kicks in. On SSR this falls back to DEFAULT_ID
  // (the readStoredId guard handles `typeof window === 'undefined'`).
  const [id, setLocal] = useState<NightPaletteId>(() => readStoredId());

  useEffect(() => {
    // Re-sync once mounted in case SSR returned the default and the real
    // value is now available (also handles the edge case where storage
    // was mutated by another tab between render and mount).
    const stored = readStoredId();
    setLocal((prev) => (prev === stored ? prev : stored));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<NightPaletteId>).detail;
      if (detail) setLocal(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocal(readStoredId());
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const opt = getNightPaletteOption(id);
  return {
    id,
    setId: setNightPaletteId,
    palette: opt.palette,
    paletteText: opt.paletteText,
    options: PALETTE_OPTIONS,
  };
}
