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
import { startSilentKeepalive, stopSilentKeepalive } from '../common/silentAudioKeepalive';

export interface UseAlarmController {
  config: AlarmConfig;
  setConfig: (updater: AlarmConfig | ((prev: AlarmConfig) => AlarmConfig)) => void;

  /** True while the alarm is actively ringing. */
  isRinging: boolean;
  stage: AlarmStage;
  /** 0..1 current audible intensity, driven by the engine. */
  intensity: number;
  /** True once the ramp element has actually started playing audio.
   *  False while we're still trying to start (e.g. waiting for the
   *  user to tap to satisfy iOS' gesture requirement). The overlay
   *  uses this to decide whether to prompt with "toca para activar". */
  audioStarted: boolean;
  /** Called from a user-gesture handler in the overlay to retry the
   *  alarm after iOS rejected the timer-driven play(). Idempotent: if
   *  audio is already playing this is a no-op. */
  tapToWake: () => Promise<void>;

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
  const [audioStarted, setAudioStarted] = useState(false);

  const engineRef = useRef<AlarmEngine | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // Wall-clock timestamp of the last setConfig() call. Used as a
  // debounce: the polling scheduler refuses to auto-fire within
  // CONFIG_EDIT_DEBOUNCE_MS after a user edit so that scrolling the
  // time picker through "now" doesn't immediately ring the alarm.
  // 0 means "never edited in this session".
  const lastUserChangeAtRef = useRef(0);

  // ── Persist config changes ─────────────────────────
  const setConfig = useCallback(
    (updater: AlarmConfig | ((prev: AlarmConfig) => AlarmConfig)) => {
      setConfigState((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (p: AlarmConfig) => AlarmConfig)(prev)
          : updater;
        saveAlarm(next);
        // Stamp the moment of the edit so the scheduler tick can
        // honour the debounce window (no auto-fire while the user
        // is still adjusting the picker). Also tear down any engine
        // that is currently ringing — editing while it rings means
        // the user wants a clean reset, not a chained re-fire.
        lastUserChangeAtRef.current = Date.now();
        if (engineRef.current) {
          try { engineRef.current.stop(); } catch { /* ignore */ }
          engineRef.current = null;
          stopSilentKeepalive();
          try { wakeLockRef.current?.release(); } catch { /* ignore */ }
          wakeLockRef.current = null;
          setIsRinging(false);
          setStage('idle');
          setIntensity(0);
          setAudioStarted(false);
          try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
        }
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
  // `rampDurationOverrideSec` lets the scheduler shorten the ramp when
  // the user picked a peak time closer than `config.rampSec` — without
  // it the alarm would either ring *before* the requested HH:MM (full
  // configured ramp starting now) or skip the ramp entirely.
  const fireAlarmInternal = useCallback(
    async (offsetSec: number, rampDurationOverrideSec?: number) => {
      // Avoid double-fire.
      if (engineRef.current) return;

      const engine = new AlarmEngine(DEFAULT_STEMS, {
        onStageChange: (s: AlarmStage) => setStage(s),
        // onProgress already normalizes to 0..1 against peak for ramp,
        // and directly 0..1 for reaseguro/wakeup.
        onProgress: (v: number) => setIntensity(Math.min(1, Math.max(0, v))),
        onPlaying: () => setAudioStarted(true),
        onSilentFailure: () => {
          // iOS rejected play() — tear the engine down and let the
          // overlay's tap-to-wake handler retry from a real gesture.
          // We KEEP isRinging=true so the overlay stays up and the
          // user can rescue the alarm with one tap.
          try { engine.stop(); } catch { /* ignore */ }
          if (engineRef.current === engine) engineRef.current = null;
          setAudioStarted(false);
          setStage('idle');
          setIntensity(0);
        },
      });
      engineRef.current = engine;
      setAudioStarted(false);

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
          rampDurationSec: rampDurationOverrideSec ?? config.rampSec,
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
  // We deliberately use a polling tick instead of a single
  // setTimeout. iOS PWA timers get throttled or paused outright
  // (native time picker open, low-power mode, app inactive but
  // visible, etc.) and a one-shot setTimeout for "fire in 60 s"
  // sometimes never resolves. A 500 ms wall-clock poll is robust
  // against every flavour of throttling we've seen on iPadOS 17/18
  // — worst case the alarm fires up to ~500 ms late.
  const TICK_MS = 500;
  // After the user edits the alarm config we wait this long before
  // allowing an auto-fire. Lets the picker scroll through the
  // current minute without ringing, and gives the user time to
  // adjust the ramp/days/volume after setting the time.
  const CONFIG_EDIT_DEBOUNCE_MS = 1500;

  const clearTick = () => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  useEffect(() => {
    clearTick();

    if (!config.enabled || !config.days.some(Boolean)) {
      void disarmSystemFallback();
      return;
    }

    // System notification fallback (fires at peak time, whether or not
    // the JS timer below survives backgrounding).
    void armSystemFallback(config);

    const tick = () => {
      // Already firing? Nothing to do.
      if (engineRef.current) return;

      const now = Date.now();

      // Debounce: wait until the user has been still for a beat.
      if (now - lastUserChangeAtRef.current < CONFIG_EDIT_DEBOUNCE_MS) return;

      // Snooze handling: while snoozeUntil is in the future, skip
      // the whole fire path. Once it elapses, fire IMMEDIATELY —
      // snooze means "ring again in N min from now", independent
      // of the configured wake time.
      const snoozeUntilRaw = typeof window !== 'undefined' ? localStorage.getItem(SNOOZE_KEY) : null;
      const snoozeUntil = snoozeUntilRaw ? parseInt(snoozeUntilRaw, 10) : 0;
      if (snoozeUntil > now) return;
      if (snoozeUntil > 0 && now >= snoozeUntil) {
        try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
        clearTick();
        void fireAlarmInternal(0);
        return;
      }

      const { peakAt } = nextFireInfo(config, new Date(now));
      if (!Number.isFinite(peakAt) || peakAt === 0) return;

      const peakDelay = peakAt - now;
      const rampMs = config.rampSec * 1000;

      if (peakDelay <= 0) {
        // peakAt already past — nextFireInfo() should have rolled us to
        // the next active weekday. If not (degenerate case), skip.
        return;
      }

      // We fire when wall-clock crosses (peakAt - rampMs), i.e. the
      // moment the gentle ramp is supposed to start. The engine then
      // ramps from 0 to peak over rampSec, landing audibly at peakAt.
      // For "set 2 min ahead with 5-min ramp" peakDelay (120 s) is
      // less than rampMs (300 s) so we're already past the ideal
      // ramp start — fire immediately with a SHORTENED ramp so peak
      // still hits at the requested HH:MM.
      if (peakDelay <= rampMs) {
        // Inside the ramp window. Fire now; engine ramps for the
        // remaining peakDelay so the audible peak lands at peakAt.
        // Engine clamps to a 5 s minimum internally for safety.
        clearTick();
        void fireAlarmInternal(0, peakDelay / 1000);
      }
      // else: pre-ramp. Keep ticking; we'll catch the threshold cross.
    };

    // First check happens immediately so a freshly-mounted hook can
    // recover an in-progress alarm without waiting for the first tick.
    tick();
    tickIntervalRef.current = window.setInterval(tick, TICK_MS);

    // ── Recovery on app resume ─────────────────────────
    // iOS pauses setInterval too when the PWA is backgrounded. On
    // visibility/pageshow/focus we manually re-tick so the alarm
    // never "oversleeps" the wake threshold.
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      // Re-arm the SW fallback (safe: it's idempotent).
      void armSystemFallback(config);
      tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearTick();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('focus', onVisible);
    };
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
    setAudioStarted(false);
    // Clear any stale snooze marker.
    try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
  }, [releaseWakeLock]);

  // ── Tap to wake (iOS gesture rescue) ──────────────────
  // Called from the overlay when audio failed to start automatically.
  // The user's tap IS the gesture, so we synchronously unlock + restart
  // the engine. Must run inside the same microtask as the React tap
  // handler — do NOT await anything before fireAlarmInternal.
  const tapToWake = useCallback(async () => {
    if (engineRef.current && audioStarted) return;
    // Hard reset any zombie engine so the next start() is clean.
    if (engineRef.current) {
      try { engineRef.current.stop(); } catch { /* ignore */ }
      engineRef.current = null;
    }
    await fireAlarmInternal(0);
  }, [audioStarted, fireAlarmInternal]);

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
      setAudioStarted(false);
      const until = Date.now() + minutes * 60 * 1000;
      try { localStorage.setItem(SNOOZE_KEY, String(until)); } catch { /* ignore */ }
      // No explicit timer here — the polling scheduler picks the
      // SNOOZE_KEY up automatically: it skips firing while
      // `snoozeUntil > now` and re-fires as soon as that window
      // elapses (and we're inside the ramp window again).
    },
    [releaseWakeLock],
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
  // Starts the full sequence from the very beginning of the ramp so
  // the user actually experiences the configured `rampSec` seconds
  // of gentle fade-in BEFORE reaching peak (previous behaviour used
  // `rampSec - 2`, which made it look like the ramp only lasted
  // 2 seconds — the user reported "se cambia después de 2 o 3s y
  // comienza el peak").
  const fireNow = useCallback(async () => {
    unlockAlarmAudio();
    await fireAlarmInternal(0);
  }, [fireAlarmInternal]);

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
      clearTick();
    };
  }, [releaseWakeLock]);

  return {
    config,
    setConfig,
    isRinging,
    stage,
    intensity,
    audioStarted,
    tapToWake,
    preview,
    fireNow,
    fireTest,
    dismiss,
    dismissWithWakeup,
    snooze,
  };
}
