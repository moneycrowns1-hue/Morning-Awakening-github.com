'use client';

// ═══════════════════════════════════════════════════════
// useMissionTimer · pausable timer with skip / add minute
//
// Returns a `{ remaining, progress, isRunning, isPaused,
// expired, start, pause, resume, skip, addMinute, reset }`
// control object used by ProtocolScreen.
//
// - `duration` is seconds; 0 means "no timer" (user-paced).
// - `autoStart` starts the countdown immediately on mount.
// - `onExpire` fires ONCE when remaining hits 0 (not when
//   skipped manually — that's an explicit skip).
// - Uses requestAnimationFrame for smooth progress updates
//   (60fps feel on the ring) plus a 1s setInterval for the
//   integer second tick displayed in the HUD.
// ═══════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MissionTimer {
  /** Seconds remaining, integer. */
  remaining: number;
  /** 0..1 fraction of time elapsed relative to the original duration. */
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  /** True after remaining hits 0 (timer-based phases only). */
  expired: boolean;
  /** Kick the timer off (from a not-yet-started or paused state). */
  start: () => void;
  /** Pause the countdown. remaining stays put. */
  pause: () => void;
  /** Resume from pause. */
  resume: () => void;
  /** Jump to the end immediately. Fires onExpire once. */
  skip: () => void;
  /** Add 60 seconds to the remaining (and stretches duration by 60s
   *  so progress doesn't jump backwards past 0). */
  addMinute: () => void;
  /** Back to the initial duration; does NOT auto-start. */
  reset: () => void;
}

export interface UseMissionTimerOptions {
  /** Seconds. 0 means no timer; the hook still returns a coherent shape. */
  duration: number;
  autoStart?: boolean;
  onExpire?: () => void;
}

export function useMissionTimer({ duration, autoStart = false, onExpire }: UseMissionTimerOptions): MissionTimer {
  const [remaining, setRemaining] = useState<number>(duration);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart && duration > 0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [expired, setExpired] = useState<boolean>(duration === 0);

  // Effective duration, mutable because addMinute extends it.
  const durationRef = useRef<number>(duration);
  // High-resolution timestamp of the last RAF tick. Set to null
  // while paused / stopped to freeze the decrement.
  const lastTsRef = useRef<number | null>(null);
  // Fractional seconds accumulator to yield a smooth progress curve
  // even though `remaining` is an integer.
  const fracRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef<boolean>(duration === 0);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  // Main tick loop.
  useEffect(() => {
    if (!isRunning || isPaused || durationRef.current === 0) {
      lastTsRef.current = null;
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) {
        lastTsRef.current = ts;
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }
      const dtMs = ts - lastTsRef.current;
      lastTsRef.current = ts;
      fracRef.current += dtMs / 1000;

      if (fracRef.current >= 1) {
        const whole = Math.floor(fracRef.current);
        fracRef.current -= whole;
        setRemaining((prev) => {
          const next = Math.max(0, prev - whole);
          if (next === 0 && prev !== 0 && !expiredRef.current) {
            expiredRef.current = true;
            setExpired(true);
            setIsRunning(false);
            queueMicrotask(() => onExpireRef.current?.());
          }
          return next;
        });
      }

      if (!expiredRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isRunning, isPaused]);

  // External API ---------------------------------------------------------

  const start = useCallback(() => {
    if (durationRef.current === 0) return;
    if (expiredRef.current) return;
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (durationRef.current === 0) return;
    setIsPaused(true);
    setIsRunning(false);
    lastTsRef.current = null;
  }, []);

  const resume = useCallback(() => {
    if (durationRef.current === 0) return;
    if (expiredRef.current) return;
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const skip = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setRemaining(0);
    if (!expiredRef.current) {
      expiredRef.current = true;
      setExpired(true);
      queueMicrotask(() => onExpireRef.current?.());
    }
  }, []);

  const addMinute = useCallback(() => {
    // If we've already expired, un-expire: the user wants more time.
    if (expiredRef.current) {
      expiredRef.current = false;
      setExpired(false);
    }
    durationRef.current += 60;
    setRemaining((prev) => prev + 60);
    // If the timer wasn't running (paused or finished), leave it paused.
    // The user can tap resume to continue.
  }, []);

  const reset = useCallback(() => {
    durationRef.current = duration;
    fracRef.current = 0;
    lastTsRef.current = null;
    expiredRef.current = duration === 0;
    setRemaining(duration);
    setIsPaused(false);
    setIsRunning(false);
    setExpired(duration === 0);
  }, [duration]);

  // Keep durationRef synced when `duration` prop changes (new mission mount).
  useEffect(() => {
    durationRef.current = duration;
    fracRef.current = 0;
    lastTsRef.current = null;
    expiredRef.current = duration === 0;
    setRemaining(duration);
    setIsPaused(false);
    setIsRunning(autoStart && duration > 0);
    setExpired(duration === 0);
    // Deliberately depend on `duration` alone: autoStart is captured
    // at construction time and we want a new mission to reset cleanly.
  }, [duration, autoStart]);

  const progress = durationRef.current === 0
    ? 0
    : Math.max(0, Math.min(1, (durationRef.current - remaining) / durationRef.current));

  return { remaining, progress, isRunning, isPaused, expired, start, pause, resume, skip, addMinute, reset };
}
