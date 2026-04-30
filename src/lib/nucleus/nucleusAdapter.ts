// ═══════════════════════════════════════════════════════════
// nucleusAdapter.ts · adaptive resolver para los micro-hábitos
// del modo NUCLEUS (día completo · 06:50 → 18:00).
//
// A diferencia del genesisAdapter (que decide un MODO),
// el nucleusAdapter opera a nivel de MICRO-HÁBITO:
//
//   · INYECTA pings condicionales del catálogo
//     `contextualHabits.ts` cuando se detectan señales:
//        ▸ stress === 'high'      → jaw release + 4-7-8
//        ▸ sleep debt ≥ 90 min   → light extra + NSDR extra
//
//   · MODIFICA la frecuencia de pings recurrentes:
//        ▸ stress === 'high'      → 20-20-20 cada 20 min
//
//   · SUPRIME pings de hábitos one-shot ya cumplidos hoy
//     (ej: si marcaste `coffee_9am` antes de las 9, no
//     suena la notificación).
//
// Pure function. No localStorage / no fetch. Devuelve la lista
// completa de bloques resueltos para que `nucleusPings.ts`
// expanda triggers y postee al SW.
// ═══════════════════════════════════════════════════════════

import type { HealthSnapshot } from '../common/healthkitBridge';
import type { DailyCheckIn } from '../coach/signals';
import type { DayProfile } from '../common/dayProfile';
import type { HabitId } from '../common/habits';
import {
  NUCLEUS_BLOCKS,
  type NucleusBlock,
  type NucleusMicroHabit,
} from './nucleusConstants';
import { CONTEXTUAL_HABITS } from './contextualHabits';

// ─── Constantes de política ─────────────────────────────────
const HIGH_SLEEP_DEBT_MIN = 90;       // Trigger para inyectar light + NSDR extra.
const STRESS_2020_TIGHTER_MIN = 20;   // 20-20-20 sube de 25 → 20 min.

export interface NucleusAdapterInput {
  now: Date;
  health: HealthSnapshot | null;
  checkIn: DailyCheckIn | null;
  dayProfile: DayProfile;
  /** HabitIds ya marcados como hechos HOY. El adapter usa esto
   *  para suprimir pings one-shot de hábitos ya cumplidos. */
  habitsDoneToday: Set<HabitId>;
}

/** Razón breve por la que el adapter inyectó / suprimió algo. */
export interface AdapterDecision {
  /** Categoría de la decisión (para telemetría / UI). */
  kind: 'inject' | 'suppress' | 'tighten';
  /** Habit / micro-habit afectado. */
  microHabitId: string;
  /** Texto humano para mostrar como hint. */
  reason: string;
}

export interface NucleusAdaptedPlan {
  /** Lista completa de bloques con `microHabits` ajustados.
   *  Los inyectados llevan `contextual: true` + `contextualReason`. */
  blocks: NucleusBlock[];
  /** Trazabilidad de las decisiones que tomó el adapter. */
  decisions: AdapterDecision[];
  /** Resumen humano para chip en UI (puede ser ''). */
  rationale: string;
}

// ─── Helpers ────────────────────────────────────────────────

/** Sleep debt = 480 − duración de la última noche (min).
 *  Devuelve 0 si no hay data o la noche es de hace > 24 h. */
function computeSleepDebtMin(health: HealthSnapshot | null): number {
  if (!health || health.nights.length === 0) return 0;
  const lastNight = health.nights[0];
  const lastEnd = new Date(lastNight.end);
  const ageHours = (Date.now() - lastEnd.getTime()) / 3_600_000;
  if (ageHours > 24) return 0;
  return Math.max(0, 480 - lastNight.durationMin);
}

/** Marca un micro-hábito como contextual con su razón legible. */
function annotate(mh: NucleusMicroHabit, reason: string): NucleusMicroHabit {
  return { ...mh, contextual: true, contextualReason: reason };
}

/**
 * Aplica las modificaciones a UN bloque (clon, no muta el catálogo).
 * `injects`: micro-hábitos a appendear, ya anotados.
 * `suppress`: ids de micro-hábitos a remover.
 * `tighten2020`: si true y este bloque tiene `rule_20_20_20`,
 *                baja la cadencia a 20 min.
 */
function transformBlock(
  block: NucleusBlock,
  injects: NucleusMicroHabit[],
  suppress: Set<string>,
  tighten2020: boolean,
): NucleusBlock {
  const microHabits = block.microHabits
    .filter((mh) => !suppress.has(mh.id))
    .map((mh) => {
      if (
        tighten2020 &&
        mh.id === 'rule_20_20_20' &&
        mh.trigger.kind === 'recurring'
      ) {
        return {
          ...mh,
          trigger: { ...mh.trigger, everyMinutes: STRESS_2020_TIGHTER_MIN },
        };
      }
      return mh;
    });
  return { ...block, microHabits: [...microHabits, ...injects] };
}

// ─── API pública ────────────────────────────────────────────

/**
 * Resuelve el plan NUCLEUS de hoy según contexto.
 * Pure: no toca localStorage ni red. El caller persiste si
 * lo desea, y se encarga del scheduling de pings.
 */
export function adaptNucleusPlan(input: NucleusAdapterInput): NucleusAdaptedPlan {
  const { now, health, checkIn, habitsDoneToday } = input;
  const decisions: AdapterDecision[] = [];
  const rationaleParts: string[] = [];

  // ── Señales ────────────────────────────────────────
  const debtMin = computeSleepDebtMin(health);
  const highStress = checkIn?.stress === 'high';
  const highDebt = debtMin >= HIGH_SLEEP_DEBT_MIN;

  // ── Suppress pings ya cumplidos ────────────────────
  // Sólo aplica a triggers `once` de hábitos en el catálogo
  // base. Los recurrentes (rule_20_20_20, scapular) NO se
  // suprimen aunque el habit esté marcado, porque cada slot
  // del día es una repetición distinta.
  const suppress = new Set<string>();
  for (const block of NUCLEUS_BLOCKS) {
    for (const mh of block.microHabits) {
      if (mh.trigger.kind !== 'once') continue;
      if (!habitsDoneToday.has(mh.habitId)) continue;
      // Sólo suprimimos si el ping aún no ha pasado (si ya pasó
      // tampoco lo agendaríamos, pero esto evita decisiones
      // ruidosas en el log).
      const [h, m] = mh.trigger.atHHMM.split(':').map((s) => parseInt(s, 10));
      const slot = new Date(now);
      slot.setHours(h, m, 0, 0);
      if (slot.getTime() <= now.getTime()) continue;
      suppress.add(mh.id);
      decisions.push({
        kind: 'suppress',
        microHabitId: mh.id,
        reason: 'ya marcado como hecho hoy',
      });
    }
  }

  // ── Inyecciones por stress alto ────────────────────
  const injectsByBlock: Record<string, NucleusMicroHabit[]> = {};
  if (highStress) {
    const stressReason = 'estrés alto';
    const jaw = annotate(CONTEXTUAL_HABITS.jawRelease.microHabit, stressReason);
    const breath = annotate(CONTEXTUAL_HABITS.breath478.microHabit, stressReason);
    (injectsByBlock[CONTEXTUAL_HABITS.jawRelease.blockId] ??= []).push(jaw);
    (injectsByBlock[CONTEXTUAL_HABITS.breath478.blockId] ??= []).push(breath);
    decisions.push({ kind: 'inject', microHabitId: jaw.id, reason: stressReason });
    decisions.push({ kind: 'inject', microHabitId: breath.id, reason: stressReason });
    decisions.push({
      kind: 'tighten',
      microHabitId: 'rule_20_20_20',
      reason: 'estrés alto · 20-20-20 cada 20 min',
    });
    rationaleParts.push('estrés alto · respiración + 20-20-20 más frecuente');
  }

  // ── Inyecciones por sleep debt ─────────────────────
  if (highDebt) {
    const debtReason = `dormiste ${debtMin} min menos`;
    const light = annotate(CONTEXTUAL_HABITS.lightExposureExtra.microHabit, debtReason);
    const nsdr = annotate(CONTEXTUAL_HABITS.extraNsdr.microHabit, debtReason);
    (injectsByBlock[CONTEXTUAL_HABITS.lightExposureExtra.blockId] ??= []).push(light);
    (injectsByBlock[CONTEXTUAL_HABITS.extraNsdr.blockId] ??= []).push(nsdr);
    decisions.push({ kind: 'inject', microHabitId: light.id, reason: debtReason });
    decisions.push({ kind: 'inject', microHabitId: nsdr.id, reason: debtReason });
    rationaleParts.push(`sleep debt ${debtMin} min · luz extra + NSDR extra`);
  }

  // ── Construir bloques resueltos ────────────────────
  const blocks = NUCLEUS_BLOCKS.map((b) =>
    transformBlock(b, injectsByBlock[b.id] ?? [], suppress, highStress),
  );

  return {
    blocks,
    decisions,
    rationale: rationaleParts.join(' · '),
  };
}
