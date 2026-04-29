'use client';

// ═══════════════════════════════════════════════════════════
// useCoach · hook de estado para el Coach
//
// Implementa un store externo a nivel de módulo + el patrón
// `useSyncExternalStore` (React 18+). Esto:
//   · Evita el anti-patrón "setState dentro de useEffect" que
//     este Next.js trata como error.
//   · Soporta SSR — en server devuelve el estado vacío.
//   · Permite que cualquier componente que llame `useCoach()`
//     reciba la misma snapshot y re-renderice cuando los
//     mutadores notifican un cambio.
//
// El motor (`coachEngine.buildBriefing`) sigue siendo PURO;
// este hook es el ÚNICO punto donde se toca window/localStorage.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  loadCoachState,
  saveFlare,
  saveDerivaC,
  saveConditions,
  logOralTake as persistOralTake,
  setOralScheduleEntry as persistOralScheduleEntry,
  clearOralScheduleEntry as persistClearOralScheduleEntry,
  logBrushing as persistBrushing,
  addWater as persistWater,
  logBruxism as persistBruxism,
  saveTodos,
  updateCheckIn as persistCheckIn,
  markTipSeen as persistTipSeen,
  activateManualSubRoutine as persistActivateSub,
  deactivateManualSubRoutine as persistDeactivateSub,
  logActiveApplication as persistLogActive,
  logSubRoutineDismissal as persistSubDismissal,
  type CoachState,
  type DerivaCState,
  type BruxismDayEntry,
  type OralScheduleEntry,
  type Todo,
  type DailyCheckIn,
  type SubRoutineId,
} from '@/lib/coach/state';
import { buildBriefing, type Briefing } from '@/lib/coach/coachEngine';
import type { FlareState } from '@/lib/coach/flareProtocol';
import type { ConditionId } from '@/lib/coach/conditions';
import type { BrushingSlot } from '@/lib/coach/brushing';

const REFRESH_INTERVAL_MS = 60_000; // 1 min — refresca ventanas horarias del briefing

const EMPTY_STATE: CoachState = {
  flare: { severity: null, phase: 'resolved', startedAt: null },
  derivaC: { active: false, startedAt: null, plannedEndAt: null },
  oral: {},
  oralSchedule: {},
  brushing: {},
  water: {},
  conditions: [],
  bruxism: {},
  todos: [],
  signals: null,
  tipsSeen: [],
  manualSubRoutines: [],
  activesLog: [],
  dismissals: [],
};

// ═══════════════════════════════════════════════════════════
// Store externo (module-level)
// ═══════════════════════════════════════════════════════════

let cachedState: CoachState = EMPTY_STATE;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

/** Lee disco y publica nueva snapshot. Llamar tras cada mutación. */
function refreshFromDisk(): void {
  if (typeof window === 'undefined') return;
  cachedState = loadCoachState();
  notify();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function getSnapshot(): CoachState {
  return cachedState;
}

function getServerSnapshot(): CoachState {
  return EMPTY_STATE;
}

// Cargar inmediatamente en el primer require del módulo en cliente.
if (typeof window !== 'undefined') {
  cachedState = loadCoachState();
}

// ═══════════════════════════════════════════════════════════
// API del hook
// ═══════════════════════════════════════════════════════════

export interface UseCoachReturn {
  state: CoachState;
  briefing: Briefing | null;
  hydrated: boolean;
  toggleCondition: (id: ConditionId) => void;
  setConditions: (ids: ConditionId[]) => void;
  setFlare: (state: FlareState) => void;
  setDerivaC: (state: DerivaCState) => void;
  logOral: (productId: string) => void;
  setOralSchedule: (productId: string, entry: OralScheduleEntry) => void;
  clearOralSchedule: (productId: string) => void;
  logBrushing: (slot: BrushingSlot) => void;
  addWater: (ml: number) => void;
  logBruxism: (entry: Partial<BruxismDayEntry>) => void;
  setTodos: (todos: Todo[]) => void;
  /** Actualiza parcialmente el check-in del día (skinFeel/sleep/stress). */
  setCheckIn: (patch: Partial<Pick<DailyCheckIn, 'skinFeel' | 'sleep' | 'stress'>>) => void;
  /** Marca un tip como visto (anti-repetición). */
  markTipSeen: (id: string) => void;
  /** Activa una sub-rutina manualmente con su TTL en horas. */
  activateSubRoutine: (id: SubRoutineId, ttlH: number) => void;
  /** Desactiva una sub-rutina manualmente (toggle off). */
  deactivateSubRoutine: (id: SubRoutineId) => void;
  /**
   * Loguea una aplicación de un activo rotable. Si el producto
   * no es rotable (humectante/SPF/etc.) es no-op silencioso.
   * Devuelve `true` si efectivamente se logueó.
   */
  logActiveApplication: (productId: string) => boolean;
  /**
   * Marca una sub-rutina como ignorada hoy (telemetría pasiva).
   * Idempotente por (id, fecha). Persistencia silenciosa: NO
   * refrescamos el snapshot — el efecto se siente al día
   * siguiente cuando el motor recalcula con el nuevo log.
   */
  logSubRoutineDismissal: (id: SubRoutineId) => void;
  refresh: () => void;
}

export function useCoach(): UseCoachReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Tick periódico para que las ventanas horarias del briefing
  // (mañana / lunch / snack / night) se recalculen sin pulsar nada.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // ── Setters ─────────────────────────────────────────────
  const setConditions = useCallback((ids: ConditionId[]) => {
    saveConditions(ids);
    refreshFromDisk();
  }, []);

  const toggleCondition = useCallback((id: ConditionId) => {
    const current = cachedState.conditions;
    const next = current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id];
    saveConditions(next);
    refreshFromDisk();
  }, []);

  const setFlare = useCallback((next: FlareState) => {
    saveFlare(next);
    refreshFromDisk();
  }, []);

  const setDerivaC = useCallback((next: DerivaCState) => {
    saveDerivaC(next);
    refreshFromDisk();
  }, []);

  const logOral = useCallback((productId: string) => {
    persistOralTake(productId);
    refreshFromDisk();
  }, []);

  const setOralSchedule = useCallback((productId: string, entry: OralScheduleEntry) => {
    persistOralScheduleEntry(productId, entry);
    refreshFromDisk();
  }, []);

  const clearOralSchedule = useCallback((productId: string) => {
    persistClearOralScheduleEntry(productId);
    refreshFromDisk();
  }, []);

  const logBrushing = useCallback((slot: BrushingSlot) => {
    persistBrushing(slot);
    refreshFromDisk();
  }, []);

  const addWater = useCallback((ml: number) => {
    persistWater(ml);
    refreshFromDisk();
  }, []);

  const logBruxism = useCallback((entry: Partial<BruxismDayEntry>) => {
    persistBruxism(entry);
    refreshFromDisk();
  }, []);

  const setTodos = useCallback((todos: Todo[]) => {
    saveTodos(todos);
    refreshFromDisk();
  }, []);

  const setCheckIn = useCallback(
    (patch: Partial<Pick<DailyCheckIn, 'skinFeel' | 'sleep' | 'stress'>>) => {
      persistCheckIn(patch);
      refreshFromDisk();
    },
    [],
  );

  const markTipSeen = useCallback((id: string) => {
    // Persistencia silenciosa: NO refrescamos el snapshot. Si lo
    // hiciéramos, el motor recomputaría el briefing, el selector
    // excluiría este tip recién visto y elegiría otro → loop
    // infinito de TipCard montándose con tip distinto cada vez.
    // El historial solo importa para días futuros.
    persistTipSeen(id);
  }, []);

  const activateSubRoutine = useCallback((id: SubRoutineId, ttlH: number) => {
    persistActivateSub(id, ttlH);
    refreshFromDisk();
  }, []);

  const deactivateSubRoutine = useCallback((id: SubRoutineId) => {
    persistDeactivateSub(id);
    refreshFromDisk();
  }, []);

  const logActiveApplication = useCallback((productId: string): boolean => {
    const ok = persistLogActive(productId);
    if (ok) refreshFromDisk();
    return ok;
  }, []);

  const logSubRoutineDismissal = useCallback((id: SubRoutineId) => {
    // Persistencia silenciosa intencional: si refrescáramos,
    // el motor recalcularía evaluateSubRoutines con el dismissal
    // ya contado y la sub-rutina podría desaparecer en pleno
    // día — inconsistencia visual. La penalty entra a partir de
    // mañana cuando se vuelve a cargar el estado.
    persistSubDismissal(id);
  }, []);

  const refresh = useCallback(() => {
    refreshFromDisk();
    setNow(new Date());
  }, []);

  // ── Briefing memoizado ──────────────────────────────────
  const hydrated = typeof window !== 'undefined';
  const briefing = useMemo<Briefing | null>(() => {
    if (!hydrated) return null;
    return buildBriefing(now, state);
  }, [hydrated, now, state]);

  return {
    state,
    briefing,
    hydrated,
    toggleCondition,
    setConditions,
    setFlare,
    setDerivaC,
    logOral,
    setOralSchedule,
    clearOralSchedule,
    logBrushing,
    addWater,
    logBruxism,
    setTodos,
    setCheckIn,
    markTipSeen,
    activateSubRoutine,
    deactivateSubRoutine,
    logActiveApplication,
    logSubRoutineDismissal,
    refresh,
  };
}
