// ═══════════════════════════════════════════════════════════
// activesLog.ts · log append-only de aplicaciones de activos
// potencialmente irritantes (retinoide, AHA, BHA, corticoide).
//
// Sirve al `rotationEngine` para decidir días de descanso. Solo
// loguemos productos topicales con `IngredientFunction` rotable;
// el resto (humectantes, oclusivos, calmantes) no consume cupo.
//
// Política de retención: últimas 90 entradas o 90 días, lo que
// llegue primero. Lo justo para detectar rachas y descanso sin
// crecer indefinido.
// ═══════════════════════════════════════════════════════════

import { findTopical } from './catalog';

export type ActiveCategory = 'retinoid' | 'aha' | 'bha' | 'corticoid';

export interface ActiveApplication {
  /** Producto del catálogo de topicals. */
  productId: string;
  /** Categoría rotable derivada de sus `actives.function`. */
  category: ActiveCategory;
  /** ISO datetime cuando el usuario marcó "apliqué". */
  appliedAtISO: string;
}

/** Log lineal, más reciente primero. */
export type ActivesLog = ActiveApplication[];

// ─── Mapeo función → categoría ──────────────────────────────

/**
 * Devuelve la categoría rotable del producto, o `null` si no es
 * un activo que requiera rotación. Si un producto tiene varias
 * funciones rotables, prima retinoide > corticoide > BHA > AHA
 * (orden de severidad clínica).
 */
export function rotationCategoryFor(productId: string): ActiveCategory | null {
  const product = findTopical(productId);
  if (!product) return null;
  const fns = product.actives.map((a) => a.function);
  if (fns.includes('active_retinoid')) return 'retinoid';
  if (fns.includes('active_corticoid')) return 'corticoid';
  if (fns.includes('active_bha')) return 'bha';
  if (fns.includes('active_aha')) return 'aha';
  return null;
}

// ─── Operaciones puras ──────────────────────────────────────

/**
 * Inserta una aplicación al inicio del log y trunca por edad
 * (90 días) y por largo (90 entradas). Devuelve un nuevo array.
 */
export function appendApplication(
  log: ActivesLog,
  productId: string,
  at: Date = new Date(),
  maxEntries: number = 90,
  maxAgeDays: number = 90,
): ActivesLog {
  const category = rotationCategoryFor(productId);
  if (!category) return log; // producto sin rol rotable: no-op

  const entry: ActiveApplication = {
    productId,
    category,
    appliedAtISO: at.toISOString(),
  };
  const cutoff = at.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  const next = [entry, ...log]
    .filter((e) => {
      const t = new Date(e.appliedAtISO).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    })
    .slice(0, maxEntries);
  return next;
}

/** Última aplicación de una categoría. `null` si no hay ninguna. */
export function lastApplicationOf(
  log: ActivesLog,
  category: ActiveCategory,
): ActiveApplication | null {
  for (const e of log) if (e.category === category) return e;
  return null;
}

/** Horas desde la última aplicación de la categoría, o `null`. */
export function hoursSinceLast(
  log: ActivesLog,
  category: ActiveCategory,
  now: Date = new Date(),
): number | null {
  const last = lastApplicationOf(log, category);
  if (!last) return null;
  const t = new Date(last.appliedAtISO).getTime();
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / (60 * 60 * 1000);
}

/**
 * Cuenta días distintos consecutivos terminando en `today` con
 * al menos UNA aplicación de la categoría. Útil para detectar
 * rachas largas de corticoide ("máx 2 semanas seguidas").
 */
export function streakDaysOf(
  log: ActivesLog,
  category: ActiveCategory,
  now: Date = new Date(),
): number {
  const days = new Set<string>();
  for (const e of log) {
    if (e.category !== category) continue;
    const d = e.appliedAtISO.slice(0, 10);
    days.add(d);
  }
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0); // mediodía local para evitar problemas DST
  for (let i = 0; i < 60; i++) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Si hoy mismo no hay aplicación, todavía contamos la racha
      // que termina ayer (común en evening retinoides).
      if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

/** Etiqueta humana corta para UI/rationale. */
export const CATEGORY_LABEL: Record<ActiveCategory, string> = {
  retinoid: 'retinoide',
  corticoid: 'corticoide',
  bha: 'BHA',
  aha: 'AHA',
};
