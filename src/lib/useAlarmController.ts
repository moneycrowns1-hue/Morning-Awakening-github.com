// ═══════════════════════════════════════════════════════
// useAlarmController · ties the alarm config to the engine.
//
// Responsibilities:
//   1. Watch the persisted AlarmConfig.
//   2. When armed: set a timer that fires at the ramp-start
//      moment. When the timer lands, spin up AlarmEngine +
//      silentKeepalive + wake lock.
//   3. Expose a ringing state so a fullscreen overlay can
//      render while the alarm is audible.
//   4. dismiss() / snooze() stop the engine and optionally
//      re-arm.
//
// iOS caveat:
//   Pure-JS timers only run while the tab has execution
//   cycles. When the screen is locked or the PWA is in the
//   background for long, the timer may sleep. That's why we
//   also schedule a system notification via the SW as a
//   hard fallback (arms/disarms when config changes).
// ═══════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  armSystemFallback,
  disarmSystemFallback,
  loadAlarm,
  nextFireInfo,
  saveAlarm,
  type AlarmConfig,
} from './alarmSchedule';
import {
  AlarmEngine,
  DEFAULT_COACH_TEXT,
  DEFAULT_STEMS,
  unlockAlarmAudio,
  type AlarmStage,
  type PreviewResult,
} from './alarmEngine';
import { startSilentKeepalive, stopSilentKeepalive } from './silentAudioKeepalive';

export interface UseAlarmController {
  config: AlarmConfig;
  setConfig: (updater: AlarmConfig | ((prev: AlarmConfig) => AlarmConfig)) => void;

  /** True while the alarm is actively ringing. */
  isRinging: boolean;
  stage: AlarmStage;
  /** 0..1 current audible intensity, driven by the engine. */
  intensity: number;

  /** Starts a manual preview tone for ~6 s (for "Probar" button).
   *  Resolves with a diagnostic describing whether audio actually
   *  played so the UI can surface iOS-specific failures. */
  preview: () => Promise<PreviewResult>;
  /** Manually trigger the alarm (used from the "Empezar ahora" button). */
  fireNow: () => Promise<void>;
  /**
   * Fire the alarm with compressed timings (~1 min total) so the
   * user can verify ramp → peak+coach → reaseguro → wake-up in one
   * take without waiting 5-10 real minutes. Does NOT persist the
   * config — only this one invocation is compressed. */
  fireTest: () => Promise<void>;
  /** Stop the alarm and mark as dismissed (no wake-up voice). */
  dismiss: () => void;
  /**
   * Fade out ramp/reaseguro, play the wake-up voice (musica principal.mp3)
   * once, then call `onComplete`. On iOS this MUST be called inside a
   * user gesture (the "Despertar" tap) so the new audio element can play.
   */
  dismissWithWakeup: (onComplete: () => void) => Promise<void>;
  /** Stop and re-arm 9 minutes from now (one shot, doesn't mutate config). */
  snooze: (minutes?: number) => void;
}

const SNOOZE_KEY = 'morning-awakening-snooze-until';

export function useAlarmController(): UseAlarmController {
  const [config, setConfigState] = useState<AlarmConfig>(() => loadAlarm());
  const [isRinging, setIsRinging] = useState(false);
  const [stage, setStage] = useState<AlarmStage>('idle');
  const [intensity, setIntensity] = useState(0);

  const engineRef = useRef<AlarmEngine | null>(null);
  const armTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ── Persist config changes ─────────────────────────
  const setConfig = useCallback(
    (updater: AlarmConfig | ((prev: AlarmConfig) => AlarmConfig)) => {
      setConfigState((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (p: AlarmConfig) => AlarmConfig)(prev)
          : updater;
        saveAlarm(next);
        return next;
      });
    },
    [],
  );

  // ── Wake lock helpers (keeps screen from sleeping) ──
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } }).wakeLock;
    if (!wl) return;
    try {
      wakeLockRef.current = await wl.request('screen');
    } catch { /* ignore */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release(); } catch { /* ignore */ }
    wakeLockRef.current = null;
  }, []);

  // ── Fire (internal) ─────────────────────────────────
  const fireAlarmInternal = useCallback(
    async (offsetSec: number) => {
      // Avoid double-fire.
      if (engineRef.current) return;

      const engine = new AlarmEngine(DEFAULT_STEMS, {
        onStageChange: (s: AlarmStage) => setStage(s),
        // onProgress already normalizes to 0..1 against peak for ramp,
        // and directly 0..1 for reaseguro/wakeup.
        onProgress: (v: number) => setIntensity(Math.min(1, Math.max(0, v))),
      });
      engineRef.current = engine;

      // CRITICAL iOS ORDERING:
      // 1. Unlock shared AudioContext (must be synchronous in gesture).
      // 2. Kick silent keepalive (uses HTMLAudioElement, needs gesture).
      // 3. engine.start() which synchronously calls ramp.play().
      // 4. Only THEN await wake lock (it awaits a permission prompt and
      //    would otherwise break the gesture chain before play()).
      unlockAlarmAudio();
      startSilentKeepalive();

      try {
        // Don't await — keeps us inside the gesture microtask so the
        // engine's internal el.play() is accepted by iOS Safari.
        const startPromise = engine.start({
          rampDurationSec: config.rampSec,
          reaseguroDelaySec: config.reaseguroSec,
          peakVolume: config.peakVolume,
          startOffsetSec: offsetSec,
          coachText: DEFAULT_COACH_TEXT,
        });
        setIsRinging(true);
        // Fire-and-forget wake lock request AFTER play() was kicked.
        void requestWakeLock();
        await startPromise;
      } catch {
        // AudioContext couldn't start (no gesture, etc). Surface the
        // ringing state anyway so the overlay renders and a tap on
        // "Empezar ahora" becomes the gesture that unlocks audio.
        setIsRinging(true);
      }
    },
    [config, requestWakeLock],
  );

  // ── Arm / disarm scheduling ─────────────────────────
  const clearArmTimer = () => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearArmTimer();

    if (!config.enabled) {
      void disarmSystemFallback();
      return;
    }

    // System notification fallback (fires at peak time, whether or not
    // the JS timer below survives backgrounding).
    void armSystemFallback(config);

    const { msUntilRampStart, offsetSec } = nextFireInfo(config);

    // If we're already inside a ramp window for the upcoming peak AND
    // the snooze dismissal doesn't cover this peak, fire immediately
    // at the correct offset.
    const now = Date.now();
    const snoozeUntilRaw = typeof window !== 'undefined' ? localStorage.getItem(SNOOZE_KEY) : null;
    const snoozeUntil = snoozeUntilRaw ? parseInt(snoozeUntilRaw, 10) : 0;
    const snoozed = snoozeUntil > now;

    if (msUntilRampStart === 0 && !snoozed) {
      void fireAlarmInternal(offsetSec);
    } else if (msUntilRampStart > 0) {
      const delay = Math.max(0, msUntilRampStart - (snoozed ? 0 : 0));
      armTimerRef.current = window.setTimeout(() => {
        void fireAlarmInternal(0);
      }, delay);
    }

    return clearArmTimer;
  }, [config, fireAlarmInternal]);

  // ── Dismiss / snooze ────────────────────────────────
  const dismiss = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    stopSilentKeepalive();
    releaseWakeLock();
    setIsRinging(false);
    setStage('idle');
    setIntensity(0);
    // Clear any stale snooze marker.
    try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
  }, [releaseWakeLock]);

  // ── Dismiss + play wake-up voice, then run onComplete ───
  // This is the "Despertar y empezar" path: the user tap IS the
  // gesture that lets the new <audio> element play on iOS, so we
  // must NOT wait on any async fetch before calling engine.playWakeup.
  const dismissWithWakeup = useCallback(
    async (onComplete: () => void) => {
      // Clear any snooze marker.
      try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
      const engine = engineRef.current;
      if (!engine) {
        // No engine running (alarm was dismissed elsewhere). Just chain.
        setIsRinging(false);
        onComplete();
        return;
      }
      // Keep isRinging=true so the overlay stays up while wake-up plays.
      setStage('wakeup');
      try {
        await engine.playWakeup(() => {
          // Tear everything down after wake-up finishes.
          engine.stop();
          engineRef.current = null;
          stopSilentKeepalive();
          releaseWakeLock();
          setIsRinging(false);
          setStage('idle');
          setIntensity(0);
          onComplete();
        });
      } catch {
        // Fallback path: skip wake-up on failure.
        engine.stop();
        engineRef.current = null;
        stopSilentKeepalive();
        releaseWakeLock();
        setIsRinging(false);
        setStage('idle');
        setIntensity(0);
        onComplete();
      }
    },
    [releaseWakeLock],
  );

  const snooze = useCallback(
    (minutes = 9) => {
      engineRef.current?.stop();
      engineRef.current = null;
      stopSilentKeepalive();
      releaseWakeLock();
      setIsRinging(false);
      setStage('idle');
      setIntensity(0);
      const until = Date.now() + minutes * 60 * 1000;
      try { localStorage.setItem(SNOOZE_KEY, String(until)); } catch { /* ignore */ }
      // Schedule a one-off timer that re-fires after `minutes`.
      armTimerRef.current = window.setTimeout(() => {
        try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
        void fireAlarmInternal(0);
      }, minutes * 60 * 1000);
    },
    [fireAlarmInternal, releaseWakeLock],
  );

  // ── Manual preview (settings "Probar" button) ───────
  const preview = useCallback(async (): Promise<PreviewResult> => {
    // Must run synchronously in gesture stack on iOS.
    unlockAlarmAudio();
    const engine = new AlarmEngine(DEFAULT_STEMS);
    try {
      return await engine.preview(6, 0.7);
    } catch (err) {
      return {
        ok: false,
        playStarted: false,
        bufferedSec: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, []);

  // ── Manual fire ("Empezar ahora" from settings) ─────
  const fireNow = useCallback(async () => {
    unlockAlarmAudio();
    await fireAlarmInternal(Math.max(0, config.rampSec - 2));
  }, [config.rampSec, fireAlarmInternal]);

  // ── Test-mode fire (compressed sequence ~1 min) ─────
  // Bypasses fireAlarmInternal to avoid touching the persisted
  // config. Runs the engine directly with hardcoded short timings
  // so every phase is audible end-to-end in under a minute.
  const fireTest = useCallback(async () => {
    if (engineRef.current) return;
    unlockAlarmAudio();
    startSilentKeepalive();

    const engine = new AlarmEngine(DEFAULT_STEMS, {
      onStageChange: (s: AlarmStage) => setStage(s),
      onProgress: (v: number) => setIntensity(Math.min(1, Math.max(0, v))),
    });
    engineRef.current = engine;

    try {
      // Compressed timings:
      //   ramp:      15 s (fade in from 0 to peak)
      //   peak+2s:   coach voice plays (~45 s total)
      //   reaseguro: 60 s after peak → voice has finished by then,
      //              Zimmer crossfade comes in cleanly over 8 s
      //   user taps Despertar to hear wake-up
      const startPromise = engine.start({
        rampDurationSec: 15,
        reaseguroDelaySec: 60,
        peakVolume: 0.6,
        startOffsetSec: 0,
        coachText: DEFAULT_COACH_TEXT,
      });
      setIsRinging(true);
      void requestWakeLock();
      await startPromise;
    } catch {
      setIsRinging(true);
    }
  }, [requestWakeLock]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
      stopSilentKeepalive();
      releaseWakeLock();
      clearArmTimer();
    };
  }, [releaseWakeLock]);

  return {
    config,
    setConfig,
    isRinging,
    stage,
    intensity,
    preview,
    fireNow,
    fireTest,
    dismiss,
    dismissWithWakeup,
    snooze,
  };
}
