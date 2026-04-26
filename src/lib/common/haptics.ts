// ═══════════════════════════════════════════════════════
// haptics.ts · safe wrapper over navigator.vibrate
//
// iOS Safari ignores vibrate() entirely. Android Chrome and
// Edge respect it. We still call it unconditionally because
// it's a no-op on unsupported browsers.
//
// All calls are gated by a global `enabled` flag persisted
// in localStorage so the user can opt out from Settings.
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-haptics';

let enabled = true;

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '0' || raw === 'false') enabled = false;
  } catch { /* ignore */ }
}

function safeVibrate(pattern: number | number[]): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try { nav.vibrate?.(pattern); } catch { /* ignore */ }
}

export const haptics = {
  /** Short tap for toggles / buttons (~10 ms). */
  tap(): void { safeVibrate(10); },
  /** Slightly stronger confirmation tick (~18 ms). */
  tick(): void { safeVibrate(18); },
  /** Medium success buzz for phase completion (~60 ms). */
  success(): void { safeVibrate(60); },
  /** Longer ceremonial pattern for protocol completion. */
  celebration(): void { safeVibrate([80, 40, 80, 40, 160]); },
  /** Warning double-buzz for skip / destructive actions. */
  warn(): void { safeVibrate([30, 40, 30]); },
  /** Set global on/off (persisted). */
  setEnabled(on: boolean): void {
    enabled = on;
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  },
  isEnabled(): boolean { return enabled; },
};
