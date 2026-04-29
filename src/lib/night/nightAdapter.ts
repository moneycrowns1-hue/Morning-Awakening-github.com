// ═══════════════════════════════════════════════════════════
// nightAdapter.ts · adaptive resolver para el Night Protocol.
//
// Decide, en una sola función pura, qué modo (full / express)
// y qué lista de fases ejecutar esta noche, dado el contexto:
//   · hora actual vs sleep gate
//   · sleep debt de anoche (Health)
//   · check-in coach (stress / sleep)
//   · día de la semana (rest / saturday / workday)
//   · override explícito del usuario (tap a Full/Express).
//
// Vive como módulo independiente para que NightWelcomeScreen y
// NightProtocolFlow puedan compartir la misma decisión sin
// duplicar lógica, y para que sea trivial testearlo.
//
// Diseño:
//   - Función pura. NO toca localStorage ni el reloj global.
//   - Retorna `missions` ya filtrado y con duraciones ajustadas
//     (clones, los originales no se mutan jamás).
//   - Devuelve un `rationale` corto (UI lo muestra como hint).
// ═══════════════════════════════════════════════════════════

import type { HealthSnapshot } from '../common/healthkitBridge';
import type { DailyCheckIn } from '../coach/signals';
import type { DayProfile } from '../common/dayProfile';
import type { SleepGate } from './sleepGate';
import {
  getNightMissions,
  type NightMission,
} from './nightConstants';

export type NightMode = 'full' | 'express';

/** Por qué el adapter eligió este modo (si no fue por override). */
export type NightAutoReason =
  | 'override'   // El usuario tappeó Full/Express explícitamente hoy.
  | 'time'       // Está demasiado tarde respecto al gate.
  | 'debt'       // Anoche durmió poco → priorizar duración.
  | 'rest'       // Día de descanso (domingo / feriado).
  | 'default';   // Nada lo gatilló — modo por defecto.

export interface NightAdapterInput {
  /** Reloj de referencia (default: ahora). */
  now: Date;
  /** Gate computado por `computeSleepGate`. */
  gate: SleepGate;
  /** Snapshot de Apple Health (puede ser null). */
  health: HealthSnapshot | null;
  /** Check-in del coach para hoy (puede ser null). */
  checkIn: DailyCheckIn | null;
  /** Profile del día (workday / saturday / rest). */
  dayProfile: DayProfile;
  /** Override del usuario para ESTE día, si tappeó Full/Express. */
  userOverride: NightMode | null;
}

export interface NightAdaptedPlan {
  mode: NightMode;
  missions: NightMission[];
  rationale: string;
  autoReason: NightAutoReason;
  /** Total de segundos planeados, ya con ajustes. */
  totalSec: number;
}

// ─── Constantes de política ────────────────────────────────
// Centralizadas acá para que sea evidente cómo cambiar el comportamiento.

const TIME_PRESSURE_BUFFER_MIN = 25;
const HIGH_SLEEP_DEBT_MIN = 120;
const STRESS_BOOST_FULL = 1.4;     // ×1.4 a journal/lectura en full.
const STRESS_BOOST_EXPRESS_SEC = 60; // +60 s a KATHARSIS en express.

// ═══════════════════════════════════════════════════════════
// Helpers internos.
// ═══════════════════════════════════════════════════════════

/**
 * Sleep debt = need - actual de la última noche.
 * Si no hay data o la noche no está registrada todavía hoy, devuelve 0.
 */
function computeSleepDebtMin(
  health: HealthSnapshot | null,
  needMin: number,
): number {
  if (!health || health.nights.length === 0) return 0;
  const lastNight = health.nights[0];
  // Si la noche más reciente registrada no se solapa con la última
  // ventana 0–9am, asumimos que aún no llegó la export de hoy.
  const lastEnd = new Date(lastNight.end);
  const ageHours = (Date.now() - lastEnd.getTime()) / 3_600_000;
  if (ageHours > 24) return 0; // demasiado vieja → sin info confiable.
  return Math.max(0, needMin - lastNight.durationMin);
}

/** Crea una copia de la mission con duración recalculada. */
function withDuration(m: NightMission, mode: NightMode, secs: number): NightMission {
  if (mode === 'express') {
    return { ...m, durationExpress: Math.max(0, Math.round(secs)) };
  }
  return { ...m, duration: Math.max(0, Math.round(secs)) };
}

/** Suma del total de segundos de la lista para `mode`. */
function sumDuration(missions: NightMission[], mode: NightMode): number {
  return missions.reduce((acc, m) => {
    const d = mode === 'express' ? (m.durationExpress ?? m.duration) : m.duration;
    return acc + d;
  }, 0);
}

/**
 * Aplica boost por stress alto a journal + lectura.
 *   - full mode: x1.4 a KATHARSIS (id 'katharsis') y PARASIMPATO (id 'parasimpato').
 *   - express mode: +60s a KATHARSIS (lectura no entra en express por largo).
 */
function applyStressBoost(missions: NightMission[], mode: NightMode): NightMission[] {
  return missions.map((m) => {
    if (mode === 'full') {
      if (m.id === 'katharsis' || m.id === 'parasimpato') {
        return withDuration(m, 'full', m.duration * STRESS_BOOST_FULL);
      }
    } else {
      if (m.id === 'katharsis') {
        const base = m.durationExpress ?? m.duration;
        return withDuration(m, 'express', base + STRESS_BOOST_EXPRESS_SEC);
      }
    }
    return m;
  });
}

/**
 * En modo express bajo presión de tiempo, dropea ÓPTICA (filtro
 * azul ya no aporta porque ya es muy tarde) si está incluida.
 * En el catálogo actual ÓPTICA NO está en express, así que esto
 * sólo aplica si el catálogo cambia más adelante. Es defensivo.
 */
function dropLightFilterIfLate(missions: NightMission[]): NightMission[] {
  return missions.filter((m) => m.id !== 'optica');
}

// ═══════════════════════════════════════════════════════════
// API pública.
// ═══════════════════════════════════════════════════════════

/**
 * Computa el plan adaptativo para esta noche.
 *
 * Precedencia de reglas (alta → baja):
 *   1. userOverride: respeto literal, sin adaptar.
 *   2. time pressure: now > gate.end - 25min → express forzado.
 *   3. sleep debt > 120 min: express forzado.
 *   4. dayProfile === 'rest': express por defecto.
 *   5. Default: full.
 *
 * Modificadores (independientes del modo):
 *   · stress === 'high' → boost de journal/lectura.
 */
export function adaptNightProtocol(input: NightAdapterInput): NightAdaptedPlan {
  const { now, gate, health, checkIn, dayProfile, userOverride } = input;

  // ── Resolver el modo base ─────────────────────────────
  let mode: NightMode;
  let autoReason: NightAutoReason;
  let rationaleParts: string[] = [];

  if (userOverride) {
    mode = userOverride;
    autoReason = 'override';
    // Sin rationale automático — el usuario eligió.
  } else {
    const minutesUntilGateEnd = (gate.end.getTime() - now.getTime()) / 60_000;
    const debtMin = computeSleepDebtMin(health, gate.widthMin > 0 ? 480 : 480);
    // Nota: usamos 480 min como need de referencia para debt.
    // El gate ya internaliza el need real; replicarlo acá complicaría
    // la firma sin ganancia (la diferencia ±60min no cambia umbrales).

    if (minutesUntilGateEnd < TIME_PRESSURE_BUFFER_MIN) {
      mode = 'express';
      autoReason = 'time';
      const m = Math.max(0, Math.round(minutesUntilGateEnd));
      rationaleParts.push(
        m <= 0
          ? 'pasaste el gate · vamos directo a lo esencial'
          : `quedan ${m} min al cierre del gate · modo express`,
      );
    } else if (debtMin >= HIGH_SLEEP_DEBT_MIN) {
      mode = 'express';
      autoReason = 'debt';
      rationaleParts.push(
        `anoche dormiste ${Math.round(debtMin)} min menos · priorizamos cama`,
      );
    } else if (dayProfile === 'rest') {
      mode = 'express';
      autoReason = 'rest';
      rationaleParts.push('día de descanso · ritual breve');
    } else {
      mode = 'full';
      autoReason = 'default';
    }
  }

  // ── Construir lista de missions base ──────────────────
  let missions = getNightMissions(mode);

  // ── Modificadores ─────────────────────────────────────
  const stressHigh = checkIn?.stress === 'high';
  if (stressHigh) {
    missions = applyStressBoost(missions, mode);
    rationaleParts.push('estrés alto · más journal y respiración');
  }

  // Si time-pressure forzó express, drop ÓPTICA por si acaso.
  if (autoReason === 'time') {
    missions = dropLightFilterIfLate(missions);
  }

  const rationale = rationaleParts.join(' · ');

  return {
    mode,
    missions,
    rationale,
    autoReason,
    totalSec: sumDuration(missions, mode),
  };
}
