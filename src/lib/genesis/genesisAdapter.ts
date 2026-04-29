// ═══════════════════════════════════════════════════════════
// genesisAdapter.ts · adaptive resolver para el protocolo
// matutino (Génesis).
//
// Decide en una sola función pura qué modo y qué fases ejecutar
// dado el contexto:
//   · sleep debt de anoche (Health snapshot)
//   · day profile (workday / saturday / rest)
//   · time pressure (hora actual vs ventana óptima 5–6:30 am)
//   · check-in coach (stress)
//   · override explícito del usuario (sticky por día)
//
// Espejo conceptual de `nightAdapter.ts`. Vive separado para que
// `MorningAwakening` (orquestador) y `WelcomeScreen` (preview UI)
// compartan la misma decisión sin duplicar lógica.
//
// Diseño:
//   - Pura. NO toca localStorage, NO usa el reloj global directo.
//   - Devuelve `missions` ya filtradas y con duraciones ajustadas
//     (clones; los originales en `MISSIONS` no se mutan jamás).
//   - Devuelve un `rationale` breve para mostrar como hint en UI.
// ═══════════════════════════════════════════════════════════

import type { HealthSnapshot } from '../common/healthkitBridge';
import type { DailyCheckIn } from '../coach/signals';
import type { DayProfile } from '../common/dayProfile';
import { MISSIONS, type GenesisMode, type Mission } from './constants';

/** Por qué el adapter eligió este modo. */
export type GenesisAutoReason =
  | 'override'   // El usuario tappeó un modo explícitamente hoy.
  | 'late'       // Está demasiado tarde para el flow completo.
  | 'debt'       // Sleep debt alto → modo recovery.
  | 'rest'       // Día de descanso (domingo / feriado).
  | 'default';   // Nada se gatilló — modo full.

export interface GenesisAdapterInput {
  /** Reloj de referencia (default: ahora). */
  now: Date;
  /** Snapshot de Apple Health (puede ser null). */
  health: HealthSnapshot | null;
  /** Check-in del coach para hoy (puede ser null). */
  checkIn: DailyCheckIn | null;
  /** Profile del día (workday / saturday / rest). */
  dayProfile: DayProfile;
  /** Override del usuario para ESTE día, si tappeó un modo. */
  userOverride: GenesisMode | null;
}

export interface GenesisAdaptedPlan {
  mode: GenesisMode;
  missions: Mission[];
  rationale: string;
  autoReason: GenesisAutoReason;
  /** Total de segundos planeados, ya con ajustes. */
  totalSec: number;
}

// ─── Constantes de política ─────────────────────────────────
// Centralizadas para que sea evidente cómo cambiar el comportamiento.

/** Hora límite para iniciar el flow `full` (todo lo cardio + fuerza
 *  encaja antes de 7 am cuando se empieza ~5 am). Pasada esta hora,
 *  forzamos `express` por compresión de la ventana. */
const LATE_START_HOUR = 6.5; // 6:30 am
const HIGH_SLEEP_DEBT_MIN = 120;
const STRESS_BOOST_FACTOR = 1.3; // ×1.3 a SILENTIUM si stress=high.

// ═══════════════════════════════════════════════════════════
// Helpers internos.
// ═══════════════════════════════════════════════════════════

/**
 * Sleep debt = need (480 min) − duración de la última noche.
 * Si no hay data o la noche más reciente es de hace > 24 h, devuelve 0.
 */
function computeSleepDebtMin(health: HealthSnapshot | null): number {
  if (!health || health.nights.length === 0) return 0;
  const lastNight = health.nights[0];
  const lastEnd = new Date(lastNight.end);
  const ageHours = (Date.now() - lastEnd.getTime()) / 3_600_000;
  if (ageHours > 24) return 0;
  return Math.max(0, 480 - lastNight.durationMin);
}

/** Hora decimal (e.g. 6:45 → 6.75) para comparar contra LATE_START_HOUR. */
function hourDecimal(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/** Suma de duraciones de la lista (segundos). */
function sumDuration(list: Mission[]): number {
  return list.reduce((acc, m) => acc + m.duration, 0);
}

/**
 * Aplica boost por stress alto a la fase de meditación SILENTIUM.
 * Stress alto + meditación más larga = mejor estabilización dopamínica.
 * Sólo aplica si SILENTIUM está incluida en la lista (los tres modos
 * la incluyen, pero defendemos por si cambia el catálogo).
 */
function applyStressBoost(missions: Mission[]): Mission[] {
  return missions.map((m) => {
    if (m.id === 'silentium') {
      return { ...m, duration: Math.round(m.duration * STRESS_BOOST_FACTOR) };
    }
    return m;
  });
}

// ═══════════════════════════════════════════════════════════
// API pública.
// ═══════════════════════════════════════════════════════════

/**
 * Computa el plan adaptativo para el protocolo Génesis de hoy.
 *
 * Precedencia de reglas (alta → baja):
 *   1. userOverride: respeto literal, sin adaptar.
 *   2. now ≥ 6:30 am → `express` (ventana cardio/fuerza ya cerrada).
 *   3. sleep debt ≥ 120 min → `recovery` (drop CRYO/SURGE/FORGE).
 *   4. dayProfile === 'rest' → `recovery` (sin gym).
 *   5. Default: `full`.
 *
 * Modificadores (independientes del modo):
 *   · stress === 'high' → SILENTIUM ×1.3 (más meditación).
 */
export function adaptGenesisProtocol(input: GenesisAdapterInput): GenesisAdaptedPlan {
  const { now, health, checkIn, dayProfile, userOverride } = input;

  // ── Resolver el modo base ────────────────────────────
  let mode: GenesisMode;
  let autoReason: GenesisAutoReason;
  const rationaleParts: string[] = [];

  if (userOverride) {
    mode = userOverride;
    autoReason = 'override';
    // Sin rationale automático — el usuario eligió.
  } else {
    const debtMin = computeSleepDebtMin(health);
    const h = hourDecimal(now);

    if (h >= LATE_START_HOUR) {
      mode = 'express';
      autoReason = 'late';
      rationaleParts.push(`empezaste a las ${formatHHMM(now)} · sólo lo esencial`);
    } else if (debtMin >= HIGH_SLEEP_DEBT_MIN) {
      mode = 'recovery';
      autoReason = 'debt';
      rationaleParts.push(
        `anoche dormiste ${Math.round(debtMin)} min menos · sin cardio ni frío`,
      );
    } else if (dayProfile === 'rest') {
      mode = 'recovery';
      autoReason = 'rest';
      rationaleParts.push('día de descanso · sin cardio ni fuerza');
    } else {
      mode = 'full';
      autoReason = 'default';
    }
  }

  // ── Filtrar fases por modo ───────────────────────────
  let missions = MISSIONS.filter((m) => m.includeIn.includes(mode));

  // ── Modificadores ortogonales ────────────────────────
  if (checkIn?.stress === 'high') {
    missions = applyStressBoost(missions);
    rationaleParts.push('estrés alto · más silencio');
  }

  const rationale = rationaleParts.join(' · ');

  return {
    mode,
    missions,
    rationale,
    autoReason,
    totalSec: sumDuration(missions),
  };
}

/** Helper interno: HH:MM 24h. Exportado por si la UI lo necesita. */
function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
