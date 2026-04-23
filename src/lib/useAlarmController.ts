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
import { AlarmEngine, type AlarmStage } from './alarmEngine';
import { startSilentKeepalive, stopSilentKeepalive } from './silentAudioKeepalive';

export interface UseAlarmController {
  config: AlarmConfig;
  setConfig: (updater: AlarmConfig | ((prev: AlarmConfig) => AlarmConfig)) => void;

  /** True while the alarm is actively ringing. */
  isRinging: boolean;
  stage: AlarmStage;
  /** 0..1 current audible intensity, driven by the engine. */
  intensity: number;

  /** Starts a manual preview tone for ~6s (for "Probar" button). */
  preview: () => Promise<void>;
  /** Manually trigger the alarm (used from the "Empezar ahora" button). */
  fireNow: () => Promise<void>;
  /** Stop the alarm and mark as dismissed. */
  dismiss: () => void;
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

      const engine = new AlarmEngine({
        onStageChange: (s) => setStage(s),
        onProgress: (v) => setIntensity(Math.min(1, Math.max(0, v / Math.max(0.01, config.peakVolume)))),
      });
      engineRef.current = engine;

      // Keep the page classified as "playing media" so iOS doesn't
      // throttle the AudioContext mid-ramp.
      startSilentKeepalive();
      await requestWakeLock();

      try {
        await engine.start({
          rampDurationSec: config.rampSec,
          reaseguroDelaySec: config.reaseguroSec,
          peakVolume: config.peakVolume,
          startOffsetSec: offsetSec,
        });
        setIsRinging(true);
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
  const preview = useCallback(async () => {
    const engine = new AlarmEngine();
    try {
      await engine.preview(6, 0.55);
    } catch { /* ignore */ }
  }, []);

  // ── Manual fire ("Empezar ahora" from settings) ─────
  const fireNow = useCallback(async () => {
    await fireAlarmInternal(Math.max(0, config.rampSec - 2));
  }, [config.rampSec, fireAlarmInternal]);

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
    dismiss,
    snooze,
  };
}
