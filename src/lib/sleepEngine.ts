// ═══════════════════════════════════════════════════════
// sleepEngine.ts · ambient loop player for Night Mode.
//
// Why a separate engine (not AlarmEngine):
//   - No ramp/peak/reaseguro state machine.
//   - Needs seamless loop (HTMLAudioElement.loop = true).
//   - Needs crossfade when the user swaps tracks without a
//     perceptible gap.
//   - Sleep timer is a LINEAR volume ramp to 0 after N minutes,
//     then pause; the alarm engine's fade logic is the wrong
//     shape for this.
//
// Two <audio> elements ("active" and "incoming") let us crossfade
// in ~800 ms: new element starts at volume 0, old element ramps
// down, and we swap the refs at the end.
// ═══════════════════════════════════════════════════════

import { findSound, type SleepTrackId } from './nightMode';

export interface SleepEngineState {
  trackId: SleepTrackId | null;
  volume: number;
  /** Seconds remaining until the timer triggers fade-out. `null`
   *  means the timer is off (infinite). */
  timerRemainingSec: number | null;
  /** True during the terminal fade-out. */
  fadingOut: boolean;
  /** True when audio is currently audible (not paused, timer not
   *  at 0). */
  playing: boolean;
}

type Listener = (state: SleepEngineState) => void;

interface ActiveElement {
  el: HTMLAudioElement;
  id: SleepTrackId;
  /** Target "full" volume for this element. We keep it in sync so
   *  external setVolume() calls work cleanly during a crossfade. */
  targetVol: number;
  /** The in-flight requestAnimationFrame id for the current fade,
   *  if any. Used so we can cancel and start a new fade cleanly. */
  rafId: number | null;
}

export class SleepEngine {
  private primary: ActiveElement | null = null;
  private secondary: ActiveElement | null = null;
  private timerTickId: number | null = null;
  private timerDeadlineMs: number | null = null; // absolute ms when timer triggers fade-out
  private fadeOutDurationSec = 30;
  private fadingOut = false;
  private listeners = new Set<Listener>();
  private masterVolume = 0.55;
  private destroyed = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => { this.listeners.delete(fn); };
  }

  private emit(): void {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  getState(): SleepEngineState {
    return {
      trackId: this.primary?.id ?? null,
      volume: this.masterVolume,
      timerRemainingSec: this.timerDeadlineMs == null ? null : Math.max(0, Math.round((this.timerDeadlineMs - Date.now()) / 1000)),
      fadingOut: this.fadingOut,
      playing: !!this.primary && !this.primary.el.paused,
    };
  }

  /**
   * Play the given track at the given volume. If another track is
   * already playing, crossfade into the new one over `crossfadeMs`.
   * Must be called from a user gesture on iOS the first time.
   */
  async play(trackId: SleepTrackId, volume = this.masterVolume, crossfadeMs = 800): Promise<void> {
    if (this.destroyed) return;
    const sound = findSound(trackId);
    if (!sound) return;
    this.masterVolume = volume;
    this.fadingOut = false;

    // Same track already playing → just adjust volume.
    if (this.primary?.id === trackId) {
      this.rampVolume(this.primary, volume, 200);
      this.emit();
      return;
    }

    // Create the new <audio>.
    const el = new Audio(sound.src);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    // iOS: keep element "inline" even when full-screen.
    el.setAttribute('playsinline', 'true');
    // Try to start playback synchronously inside the gesture frame.
    const playPromise = el.play();

    const incoming: ActiveElement = { el, id: trackId, targetVol: volume, rafId: null };

    // Crossfade old → new. If there's no primary, just fade the new
    // one up from 0 to target.
    if (this.primary) {
      const old = this.primary;
      this.rampVolume(old, 0, crossfadeMs, () => {
        try { old.el.pause(); } catch { /* ignore */ }
      });
      this.rampVolume(incoming, volume, crossfadeMs);
    } else {
      this.rampVolume(incoming, volume, crossfadeMs);
    }

    this.primary = incoming;
    try { await playPromise; } catch { /* iOS rejects outside gesture; swallow */ }
    this.emit();
  }

  /** Set master volume. Respects an in-flight fade-out (won't undo it). */
  setVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.fadingOut) return;
    if (this.primary) this.rampVolume(this.primary, this.masterVolume, 150);
    this.emit();
  }

  /**
   * Schedule a fade-out starting `afterSec` seconds from now. After
   * the fade completes the audio pauses and the timer clears.
   * `afterSec === Infinity` disables the timer.
   */
  scheduleFadeOut(afterSec: number, fadeSec = 30): void {
    this.clearTimer();
    this.fadeOutDurationSec = fadeSec;
    if (!Number.isFinite(afterSec) || afterSec <= 0) return;
    this.timerDeadlineMs = Date.now() + afterSec * 1000;
    // 1 Hz tick so the UI can show a countdown.
    this.timerTickId = window.setInterval(() => {
      if (!this.timerDeadlineMs) return;
      const remainingMs = this.timerDeadlineMs - Date.now();
      if (remainingMs <= 0) {
        this.beginTerminalFade();
      } else {
        this.emit();
      }
    }, 1000);
    this.emit();
  }

  /** Cancel any pending fade-out without affecting current playback. */
  clearTimer(): void {
    if (this.timerTickId) { clearInterval(this.timerTickId); this.timerTickId = null; }
    this.timerDeadlineMs = null;
    this.fadingOut = false;
    this.emit();
  }

  pause(): void {
    if (this.primary) try { this.primary.el.pause(); } catch { /* ignore */ }
    this.emit();
  }

  async resume(): Promise<void> {
    if (this.primary) {
      try { await this.primary.el.play(); } catch { /* ignore */ }
    }
    this.emit();
  }

  stop(): void {
    this.clearTimer();
    if (this.primary) {
      this.cancelFade(this.primary);
      try { this.primary.el.pause(); this.primary.el.src = ''; } catch { /* ignore */ }
    }
    if (this.secondary) {
      this.cancelFade(this.secondary);
      try { this.secondary.el.pause(); this.secondary.el.src = ''; } catch { /* ignore */ }
    }
    this.primary = null;
    this.secondary = null;
    this.emit();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.listeners.clear();
  }

  // ─── internals ───────────────────────────────────────

  private beginTerminalFade(): void {
    if (!this.primary) { this.clearTimer(); return; }
    this.fadingOut = true;
    if (this.timerTickId) { clearInterval(this.timerTickId); this.timerTickId = null; }
    this.timerDeadlineMs = null;
    const p = this.primary;
    this.rampVolume(p, 0, this.fadeOutDurationSec * 1000, () => {
      try { p.el.pause(); } catch { /* ignore */ }
      this.fadingOut = false;
      this.emit();
    });
    this.emit();
  }

  private cancelFade(active: ActiveElement): void {
    if (active.rafId != null) { cancelAnimationFrame(active.rafId); active.rafId = null; }
  }

  private rampVolume(
    active: ActiveElement,
    to: number,
    durationMs: number,
    onComplete?: () => void,
  ): void {
    this.cancelFade(active);
    active.targetVol = to;
    const from = active.el.volume;
    const start = performance.now();
    const step = (now: number) => {
      if (this.destroyed) return;
      const t = Math.min(1, (now - start) / Math.max(1, durationMs));
      const v = from + (to - from) * t;
      try { active.el.volume = Math.max(0, Math.min(1, v)); } catch { /* ignore */ }
      if (t < 1) {
        active.rafId = requestAnimationFrame(step);
      } else {
        active.rafId = null;
        onComplete?.();
      }
    };
    active.rafId = requestAnimationFrame(step);
  }
}

// ─── Singleton helpers (optional convenience) ──────────────
// A single shared engine survives component unmounts so the
// user can back out of NightModeScreen and the audio keeps
// playing until the fade-out timer finishes.

let sharedEngine: SleepEngine | null = null;

export function getSleepEngine(): SleepEngine {
  if (!sharedEngine) sharedEngine = new SleepEngine();
  return sharedEngine;
}

export function stopSleepEngine(): void {
  sharedEngine?.stop();
}
