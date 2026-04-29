// ═══════════════════════════════════════════════════════════
// useMorningRitual · controlador del ritual matutino.
//
// Diferencias clave vs el viejo `useAlarmController`:
//
//   1. NO HAY TIMER que dispare el ritual sin gesto. iOS no
//      garantiza ejecución JS background → asumimos que el
//      usuario abre la app por su cuenta (después de que su
//      alarma nativa lo despertó).
//   2. NO HAY WAKE LOCK (no estamos rescatando un timer).
//   3. NO HAY SILENT KEEPALIVE específico del ritual (Génesis
//      mantiene el suyo cuando arranca).
//   4. NO HAY SNOOZE (es un ritual, no una alarma).
//   5. NO HAY ARM/DISARM SYSTEM FALLBACK (la PWA no es el
//      sistema operativo).
//
// La superficie es chica:
//   - `config` / `setConfig`              · persistencia.
//   - `shouldOffer(now)`                  · ¿estamos en la ventana?
//   - `start(params?)` / `dismiss()`      · ciclo de vida del audio.
//   - `dismissWithWakeup(onDone)`         · cierra con wakeup mp3.
//   - `preview()`                         · 6s probar el ramp.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadRitual,
  saveRitual,
  isInRitualWindow,
  type RitualConfig,
} from './ritualSchedule';
import {
  RitualEngine,
  DEFAULT_STEMS,
  DEFAULT_COACH_TEXT,
  unlockRitualAudio,
  type RitualStage,
  type PreviewResult,
} from './ritualEngine';
import {
  rescheduleMorningPing,
  enableMorningPing,
  disableMorningPing,
} from './morningPing';
import type { RitualParams } from './ritualAdapter';

export interface UseMorningRitual {
  config: RitualConfig;
  setConfig: (next: RitualConfig | ((prev: RitualConfig) => RitualConfig)) => void;

  /** ¿Estamos en la ventana ±60/90min del target HOY? */
  shouldOffer: boolean;
  /** True mientras el ritual está corriendo (audio audible). */
  isRunning: boolean;
  stage: RitualStage;
  /** 0..1 intensity para una bar visual. */
  intensity: number;
  /** True cuando el ramp confirmó playback. False mientras esperamos
   *  el primer gesto en iOS. */
  audioStarted: boolean;
  /** Para iOS: si el primer play() fue rechazado por timing del gesto,
   *  el overlay expone un fullscreen tap target que llama a esto. */
  tapToWake: () => Promise<void>;

  /**
   * Arranca el ritual. Debe ejecutarse DESDE un user-gesture handler.
   * `params` es opcional: si no se pasa, usa los del config sin
   * adaptación. Pasá el resultado de `adaptRitualParams()` para
   * ritual contextual.
   */
  start: (params?: RitualParams) => Promise<void>;
  /** Para todo, sin wakeup. */
  dismiss: () => void;
  /** Reproduce wakeup mp3 una vez y luego llama `onComplete`. */
  dismissWithWakeup: (onComplete: () => void) => Promise<void>;
  /** Preview de 6s del ramp (botón "probar mi ritual"). */
  preview: () => Promise<PreviewResult>;
}

export function useMorningRitual(): UseMorningRitual {
  const [config, setConfigState] = useState<RitualConfig>(() => loadRitual());
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState<RitualStage>('idle');
  const [intensity, setIntensity] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [shouldOffer, setShouldOffer] = useState(() => isInRitualWindow(loadRitual()));

  const engineRef = useRef<RitualEngine | null>(null);
  const lastParamsRef = useRef<RitualParams | null>(null);

  // ── Persistencia + sincronización del push diario ───────
  const setConfig = useCallback(
    (updater: RitualConfig | ((prev: RitualConfig) => RitualConfig)) => {
      setConfigState((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (p: RitualConfig) => RitualConfig)(prev)
          : updater;
        saveRitual(next);

        // Sincronizar el push del SW con la nueva hora/enabled.
        // Sin await: si el permiso no fue concedido todavía, el call
        // se vuelve no-op silencioso.
        if (next.enabled) {
          void enableMorningPing(next.hour, next.minute);
        } else if (prev.enabled) {
          void disableMorningPing();
        }

        // Actualizar shouldOffer ya mismo (no esperamos al próximo tick).
        setShouldOffer(isInRitualWindow(next));

        return next;
      });
    },
    [],
  );

  // ── Re-evaluar la ventana cada minuto + en visibility ───
  useEffect(() => {
    const tick = () => setShouldOffer(isInRitualWindow(config));
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [config]);

  // ── Re-program SW push on mount (timers no sobreviven) ──
  useEffect(() => {
    void rescheduleMorningPing();
  }, []);

  // ── Engine lifecycle ────────────────────────────────────

  const buildEngine = useCallback(() => {
    return new RitualEngine(DEFAULT_STEMS, {
      onStageChange: (s) => setStage(s),
      onProgress: (v) => setIntensity(Math.min(1, Math.max(0, v))),
      onPlaying: () => setAudioStarted(true),
      onSilentFailure: () => {
        // iOS rejected play(): tear engine down but mantener `isRunning`
        // así el overlay sigue arriba con su tap-to-wake. El usuario
        // toca y `tapToWake` rebuild + retry.
        const eng = engineRef.current;
        if (eng) { try { eng.stop(); } catch { /* ignore */ } }
        engineRef.current = null;
        setAudioStarted(false);
        setStage('idle');
        setIntensity(0);
      },
    });
  }, []);

  const start = useCallback(async (params?: RitualParams) => {
    if (engineRef.current) return; // ya corriendo
    unlockRitualAudio();

    const rampSec = params?.rampSec ?? config.rampSec;
    const peakVolume = params?.peakVolume ?? config.peakVolume;
    lastParamsRef.current = params ?? null;

    const engine = buildEngine();
    engineRef.current = engine;
    setAudioStarted(false);

    try {
      const startPromise = engine.start({
        rampDurationSec: rampSec,
        peakVolume,
        startOffsetSec: 0,
        coachText: DEFAULT_COACH_TEXT,
      });
      setIsRunning(true);
      await startPromise;
    } catch {
      // El audio falló pero igual mantenemos el overlay para que
      // el siguiente gesto del usuario destrabe.
      setIsRunning(true);
    }
  }, [config, buildEngine]);

  const tapToWake = useCallback(async () => {
    if (engineRef.current && audioStarted) return;
    if (engineRef.current) {
      try { engineRef.current.stop(); } catch { /* ignore */ }
      engineRef.current = null;
    }
    await start(lastParamsRef.current ?? undefined);
  }, [audioStarted, start]);

  const dismiss = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setIsRunning(false);
    setStage('idle');
    setIntensity(0);
    setAudioStarted(false);
  }, []);

  const dismissWithWakeup = useCallback(async (onComplete: () => void) => {
    const engine = engineRef.current;
    if (!engine) {
      setIsRunning(false);
      onComplete();
      return;
    }
    setStage('wakeup');
    try {
      await engine.playWakeup(() => {
        engine.stop();
        engineRef.current = null;
        setIsRunning(false);
        setStage('idle');
        setIntensity(0);
        onComplete();
      });
    } catch {
      engine.stop();
      engineRef.current = null;
      setIsRunning(false);
      setStage('idle');
      setIntensity(0);
      onComplete();
    }
  }, []);

  const preview = useCallback(async (): Promise<PreviewResult> => {
    unlockRitualAudio();
    const engine = new RitualEngine(DEFAULT_STEMS);
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

  // ── Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  return {
    config,
    setConfig,
    shouldOffer,
    isRunning,
    stage,
    intensity,
    audioStarted,
    tapToWake,
    start,
    dismiss,
    dismissWithWakeup,
    preview,
  };
}
