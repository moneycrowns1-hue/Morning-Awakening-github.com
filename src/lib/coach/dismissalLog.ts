// ═══════════════════════════════════════════════════════════
// dismissalLog.ts · telemetría pasiva de sub-rutinas
//
// Cuando una sub-rutina (auto o manual) se mostró pero el
// usuario no consumió ninguna de sus acciones (no marcó hábito,
// no logueó aplicación, no abrió producto), eso es señal de
// baja relevancia subjetiva. Lo loggeamos para penalizar su
// score futuro y reducir ruido.
//
// Es estrictamente local: nunca sale del dispositivo.
// ═══════════════════════════════════════════════════════════

import type { SubRoutineId } from './subRoutines';

/** Una observación: la sub-rutina X estuvo activa el día Y y fue ignorada. */
export interface DismissalEntry {
  id: SubRoutineId;
  /** Fecha local YYYY-MM-DD del día en que se ignoró. */
  dateISO: string;
}

export type DismissalLog = DismissalEntry[];

/** Capacidad máxima del log (truncado FIFO al frente). */
export const MAX_DISMISSAL_ENTRIES = 60;

/**
 * Añade una observación de dismissal. Si ya existe la misma
 * combinación `id + dateISO`, no duplica.
 *
 * Devuelve siempre un array nuevo si hay cambios; o el mismo
 * array si fue no-op (idempotencia para no triggerear renders).
 */
export function appendDismissal(
  log: DismissalLog,
  id: SubRoutineId,
  dateISO: string,
): DismissalLog {
  if (log.some((e) => e.id === id && e.dateISO === dateISO)) return log;
  return [{ id, dateISO }, ...log].slice(0, MAX_DISMISSAL_ENTRIES);
}

/**
 * Cuenta cuántas veces una sub-rutina fue ignorada en los
 * últimos `windowDays` días.
 */
export function dismissalsInWindow(
  log: DismissalLog,
  id: SubRoutineId,
  now: Date = new Date(),
  windowDays: number = 14,
): number {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const e of log) {
    if (e.id !== id) continue;
    const t = new Date(e.dateISO).getTime();
    if (Number.isFinite(t) && t >= cutoff) count++;
  }
  return count;
}

/**
 * Penalty score para una sub-rutina basado en historial reciente.
 *
 *   0 dismissals   →  0.0 (sin penalty)
 *   1–2 dismissals →  0.4
 *   3–4 dismissals →  0.7
 *   5+ dismissals  →  1.0  (suprimir auto-trigger por completo)
 *
 * El consumidor decide cómo aplicarlo (multiplicador, umbral,
 * filtro). Aquí solo proveemos la magnitud.
 */
export function dismissalPenalty(
  log: DismissalLog,
  id: SubRoutineId,
  now: Date = new Date(),
  windowDays: number = 14,
): number {
  const n = dismissalsInWindow(log, id, now, windowDays);
  if (n <= 0) return 0;
  if (n <= 2) return 0.4;
  if (n <= 4) return 0.7;
  return 1;
}

/**
 * Devuelve `true` si la sub-rutina debe suprimirse hoy
 * (cuando alcanza el umbral máximo de penalty).
 *
 * Manuales nunca se suprimen: el usuario los activa explícitamente
 * y eso anula cualquier penalty pasivo.
 */
export function shouldSuppressAuto(
  log: DismissalLog,
  id: SubRoutineId,
  now: Date = new Date(),
): boolean {
  return dismissalPenalty(log, id, now) >= 1;
}
