// ═══════════════════════════════════════════════════════════
// ritualAdapter.ts · adapta los parámetros del ritual al
// contexto del usuario antes de iniciarlo.
//
// Este es el lugar único donde la "inteligencia" de la mañana
// se concentra: leemos `HealthSnapshot` (sueño de anoche) y
// señales del Coach (stress reportado) y devolvemos un
// `RitualParams` ya ajustado.
//
// Reglas (intencionalmente conservadoras, si dudás → default):
//
//   sleepDebt > 120 min   → ramp ×1.3, peakVolume ×0.85, voiceTone='gentle'
//   sleepDebt > 60 min    → ramp ×1.15
//   stress === 'high'     → voiceTone='calm', peakVolume ×0.9
//
// Si no hay datos de salud, devolvemos los params del config
// sin alterar (zero-info → no decisions).
// ═══════════════════════════════════════════════════════════

import type { RitualConfig, RitualVoiceTone } from './ritualSchedule';
import type { HealthSnapshot } from '../common/healthkitBridge';
import type { Stress } from '../coach/signals';

/** Resultado computado: lo que `useMorningRitual.start()` consume. */
export interface RitualParams {
  rampSec: number;
  peakVolume: number;
  voiceTone: RitualVoiceTone;
  /** Texto explicativo (1 línea) de por qué se adaptó. Vacío si no hubo. */
  rationale: string;
}

/** Sueño-deuda objetivo (min) — debajo de esto es deuda. */
const TARGET_SLEEP_MIN = 480; // 8h

/**
 * Calcula la deuda de sueño en minutos a partir de la última noche
 * registrada en el HealthSnapshot. Devuelve `null` si no hay datos.
 */
export function computeSleepDebtMin(snap: HealthSnapshot | null): number | null {
  if (!snap || !snap.nights || snap.nights.length === 0) return null;
  const lastNight = snap.nights[0];
  if (!lastNight || !Number.isFinite(lastNight.durationMin)) return null;
  return Math.max(0, TARGET_SLEEP_MIN - lastNight.durationMin);
}

/**
 * Adapta los params del ritual al contexto.
 *
 * @param cfg     Config base persistida del usuario.
 * @param health  Snapshot de Apple Health (puede ser null).
 * @param stress  Señal de stress reportada por el usuario hoy (puede ser null).
 */
export function adaptRitualParams(
  cfg: RitualConfig,
  health: HealthSnapshot | null,
  stress: Stress | null = null,
): RitualParams {
  let rampSec = cfg.rampSec;
  let peakVolume = cfg.peakVolume;
  let voiceTone: RitualVoiceTone = cfg.voiceTone;
  const reasons: string[] = [];

  // ── Sleep debt ──
  const debt = computeSleepDebtMin(health);
  if (debt !== null) {
    if (debt > 120) {
      rampSec = Math.round(rampSec * 1.3);
      peakVolume = peakVolume * 0.85;
      voiceTone = 'gentle';
      reasons.push(`anoche dormiste poco (${Math.round(debt)} min de deuda) — vamos despacio`);
    } else if (debt > 60) {
      rampSec = Math.round(rampSec * 1.15);
      reasons.push('anoche dormiste justo — ramp un poco más largo');
    }
  }

  // ── Stress ──
  if (stress === 'high') {
    voiceTone = 'calm';
    peakVolume = peakVolume * 0.9;
    reasons.push('stress reportado alto — tono calmo');
  }

  // Clamps de seguridad.
  rampSec = Math.max(60, Math.min(1800, Math.round(rampSec)));
  peakVolume = Math.max(0.2, Math.min(1, Number(peakVolume.toFixed(3))));

  return {
    rampSec,
    peakVolume,
    voiceTone,
    rationale: reasons.join(' · '),
  };
}

/**
 * Devuelve el coach text adaptado al voiceTone. Sigue siendo el mismo
 * texto de afirmación, sólo cambia el modificador prosódico que el
 * `RitualEngine.speakCoach` aplicará vía `rate`/`pitch` (no implementado
 * todavía aquí — por ahora seleccionamos texto distinto). El motor
 * mp3-first sigue tomando `voz-proposito.mp3` cuando está disponible.
 */
export function coachTextForTone(tone: RitualVoiceTone): string {
  switch (tone) {
    case 'gentle':
      return (
        'Buenos días. Hoy empezamos despacio, sin prisa. ' +
        'Tu cuerpo necesitó descanso; respeta lo que pide. ' +
        'Hoy no se trata de hacer más, sino de hacer presente.'
      );
    case 'calm':
      return (
        'Buenos días. Inhala profundo. Suelta. ' +
        'Hoy elijo soltar lo que no me corresponde cargar. ' +
        'Mi mente está clara, mi enfoque vuelve cuando lo llamo.'
      );
    case 'default':
    default:
      return (
        'Al despertar es reclamar los cinco minutos de tu día antes de pensar o volver a dormir. ' +
        'Hoy elijo ser el arquitecto de mi experiencia. ' +
        'Mi mente es poderosa, mi enfoque es claro. ' +
        'Cada desafío que enfrente es una oportunidad de crecer y demostrar mi fortaleza interior.'
      );
  }
}
