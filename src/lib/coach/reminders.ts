// ═══════════════════════════════════════════════════════════
// reminders.ts · scheduler de recordatorios contextuales del Coach
//
// Genera y arma recordatorios best-effort basados en el estado
// del coach: cepillado por slot, hidratación a media tarde, cierre
// de ventana SPF AM. Reutiliza la API de notificaciones que ya
// existe en `lib/common/notifications.ts` para disparar la
// notificación nativa cuando el permiso está concedido.
//
// LIMITACIONES (importantes para iOS PWA):
//   · setTimeout solo funciona mientras el SW/tab está vivo. En
//     PWA instalada en iOS suele persistir > 1h; en navegador
//     casual puede expirar.
//   · La entrega exacta a la hora requeriría Web Push con backend.
//     Out of scope hoy. Lo asumimos como "best effort".
//   · Si el permiso es 'denied' o 'unsupported', mostramos los
//     recordatorios solo dentro de la app (panel UI).
// ═══════════════════════════════════════════════════════════

import {
  getNotifPermission,
  type NotifPermission,
} from '@/lib/common/notifications';
import type { CoachState } from './state';
import { CURRENT_PLAN, type BrushingSlot } from './brushing';

// ─── PERSISTENCIA DE META (fired / dismissed / snoozed) ──────

const META_KEY = 'ma-coach-reminder-meta';

interface ReminderMetaForDate {
  fired: string[];
  dismissed: string[];
  /** id → dueAt ms cuando el snooze venció. */
  snoozed: Record<string, number>;
}

type ReminderMetaStore = Record<string, ReminderMetaForDate>;

const EMPTY_DAY: ReminderMetaForDate = { fired: [], dismissed: [], snoozed: {} };

function readMeta(): ReminderMetaStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as ReminderMetaStore) : {};
  } catch {
    return {};
  }
}

function writeMeta(store: ReminderMetaStore): void {
  if (typeof window === 'undefined') return;
  try {
    // Drop entries de fechas anteriores a ayer (autopurga).
    const yesterday = todayISO(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const trimmed: ReminderMetaStore = {};
    for (const [date, day] of Object.entries(store)) {
      if (date >= yesterday) trimmed[date] = day;
    }
    window.localStorage.setItem(META_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

function getDay(store: ReminderMetaStore, date: string): ReminderMetaForDate {
  return store[date] ?? { ...EMPTY_DAY };
}

export function loadMetaForToday(): ReminderMetaForDate {
  const store = readMeta();
  return getDay(store, todayISO(new Date()));
}

export function markReminderFired(id: string, when: Date = new Date()): void {
  const store = readMeta();
  const date = todayISO(when);
  const day = getDay(store, date);
  if (!day.fired.includes(id)) day.fired = [...day.fired, id];
  store[date] = day;
  writeMeta(store);
}

export function dismissReminder(id: string, when: Date = new Date()): void {
  const store = readMeta();
  const date = todayISO(when);
  const day = getDay(store, date);
  if (!day.dismissed.includes(id)) day.dismissed = [...day.dismissed, id];
  // Si estaba snoozeado, lo retiramos.
  delete day.snoozed[id];
  store[date] = day;
  writeMeta(store);
}

/** Pospone un reminder por `minutes` minutos a partir de ahora. */
export function snoozeReminder(id: string, minutes: number = 30, when: Date = new Date()): number {
  const newDueAt = when.getTime() + minutes * 60 * 1000;
  const store = readMeta();
  const date = todayISO(when);
  const day = getDay(store, date);
  day.snoozed = { ...day.snoozed, [id]: newDueAt };
  store[date] = day;
  writeMeta(store);
  return newDueAt;
}

// ─── TIPOS ───────────────────────────────────────────────────

export type ReminderKind =
  | 'brushing'
  | 'water'
  | 'spf_window_close'
  | 'skincare_pm'
  | 'pill'
  | 'flare_step';

export interface CoachReminder {
  id: string;
  kind: ReminderKind;
  /** Timestamp absoluto (ms epoch). */
  dueAt: number;
  title: string;
  body: string;
  /** Producto asociado, cuando aplica (ej: pastilla específica). */
  productId?: string;
  /** Slot relacionado, cuando aplica (cepillado). */
  slot?: BrushingSlot;
  /** Si se canceló manualmente. */
  cancelled?: boolean;
}

// ─── CONFIG ──────────────────────────────────────────────────

/** Hora aproximada de cada slot de cepillado (formato 24h, hora local).
 *  Usado solo para programar recordatorios; el log real usa marca de
 *  tiempo precisa al tap. */
const BRUSHING_SLOT_HOUR: Record<BrushingSlot, number> = {
  after_breakfast: 9,
  after_lunch: 14,
  after_snack: 18,
  before_bed: 22,
};

const BRUSHING_SLOT_LABEL: Record<BrushingSlot, string> = {
  after_breakfast: 'tras el desayuno',
  after_lunch: 'tras el almuerzo',
  after_snack: 'tras la merienda',
  before_bed: 'antes de dormir',
};

/** Hora a la que damos el primer aviso si no llegamos a 1.5 L. */
const WATER_MIDDAY_CHECK_HOUR = 14;

/** Hora a la que damos el aviso de cierre de SPF AM. */
const SPF_WINDOW_CLOSE_HOUR = 11;

/** Hora del recordatorio de rutina PM. */
const SKINCARE_PM_HOUR = 21;

/** Hora del paso AM del protocolo brote. */
const FLARE_AM_HOUR = 8;

/** Hora del paso PM del protocolo brote (oclusivo nocturno). */
const FLARE_PM_HOUR = 21;

// ─── UTILS ───────────────────────────────────────────────────

function atHourToday(hour: number, minute: number = 0, ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function todayISO(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ─── GENERADOR DE RECORDATORIOS ──────────────────────────────
//
// Toma el estado del coach + ahora + plan de cepillado y devuelve
// los recordatorios futuros del día actual. Pure function — no
// toca DOM ni storage.

export function generateReminders(state: CoachState, now: Date = new Date()): CoachReminder[] {
  const reminders: CoachReminder[] = [];
  const today = todayISO(now);
  const meta = loadMetaForToday();
  const dismissed = new Set(meta.dismissed);

  const push = (r: CoachReminder) => {
    if (dismissed.has(r.id)) return;
    // Si tiene snooze activo, sustituye el dueAt.
    const snoozedUntil = meta.snoozed[r.id];
    const finalDueAt = snoozedUntil && snoozedUntil > now.getTime() ? snoozedUntil : r.dueAt;
    if (finalDueAt <= now.getTime()) return;
    reminders.push({ ...r, dueAt: finalDueAt });
  };

  // ── 1. Cepillado: para cada slot del plan, si aún no se hizo y
  //                  la hora prevista está en el futuro, programar.
  const brushDay = state.brushing[today] ?? {};
  for (const slot of CURRENT_PLAN.slots) {
    if (brushDay[slot]) continue;
    const due = atHourToday(BRUSHING_SLOT_HOUR[slot], 0, now);
    push({
      id: `brush_${today}_${slot}`,
      kind: 'brushing',
      dueAt: due.getTime(),
      slot,
      title: 'Cepillado pendiente',
      body: `Es hora del cepillado ${BRUSHING_SLOT_LABEL[slot]}. ${
        slot === 'before_bed'
          ? 'Hilo primero, después cepillo y enjuague.'
          : '2 minutos, técnica de Bass.'
      }`,
    });
  }

  // ── 2. Hidratación: a las 14:00 si todavía está bajo de los 1.5L.
  const todayWaterMl = state.water[today] ?? 0;
  if (todayWaterMl < 1500) {
    const middayDue = atHourToday(WATER_MIDDAY_CHECK_HOUR, 0, now);
    push({
      id: `water_midday_${today}`,
      kind: 'water',
      dueAt: middayDue.getTime(),
      title: 'Hidratación a media jornada',
      body: 'Vas bajo de los 1.5 L. Toma un vaso ahora; queda media jornada para llegar al target de 3 L.',
    });
  }

  // ── 3. SPF AM: a las 11:00 si no se logueó la rutina AM hoy.
  //      Proxy: ningún cepillado after_breakfast Y agua < 250 ml.
  const skincareAmLikely =
    !!brushDay['after_breakfast'] || todayWaterMl >= 250;
  if (!skincareAmLikely) {
    const spfDue = atHourToday(SPF_WINDOW_CLOSE_HOUR, 0, now);
    push({
      id: `spf_close_${today}`,
      kind: 'spf_window_close',
      dueAt: spfDue.getTime(),
      title: 'Cierre de la ventana AM',
      body: 'Si no aplicaste SPF, hacelo ahora. El UV sube fuerte después de las 11.',
    });
  }

  // ── 4. Skincare PM: a las 21:00 todos los días — la rutina de
  //      noche es donde más se gana barrera. Si hay flare activo,
  //      el siguiente generador la reemplaza por uno más específico.
  if (state.flare.phase === 'resolved') {
    const pmDue = atHourToday(SKINCARE_PM_HOUR, 0, now);
    push({
      id: `skincare_pm_${today}`,
      kind: 'skincare_pm',
      dueAt: pmDue.getTime(),
      title: 'Rutina PM',
      body: 'Limpieza, serum nocturno y oclusivo. Si tomaste Deriva-C, recordá la fina capa después de hidratar.',
    });
  }

  // ── 5. Brote: protocolo AM (8:00) + PM (21:00). Mientras la fase
  //      esté `active` o `recovery`, repetimos cada día. El usuario
  //      puede dismissarlos individualmente cuando los cumpla.
  if (state.flare.phase !== 'resolved') {
    const isStrong = state.flare.severity === 'strong';
    const phaseLabel = state.flare.phase === 'recovery' ? 'recuperación' : isStrong ? 'severo' : 'leve';

    const flareAmDue = atHourToday(FLARE_AM_HOUR, 0, now);
    push({
      id: `flare_am_${today}`,
      kind: 'flare_step',
      dueAt: flareAmDue.getTime(),
      title: `Protocolo brote · AM (${phaseLabel})`,
      body: state.flare.phase === 'recovery'
        ? 'Limpieza con Lipikar Syndet, hidratante reparador y SPF mineral. Reintroducí activos suaves si la piel los acepta.'
        : isStrong
          ? 'Lipikar Syndet, capa generosa de Cicaplast Baume B5 y SPF mineral 50+. Sin activos.'
          : 'Limpieza suave + Cicaplast B5 + SPF mineral. Evitar fragancias y exfoliantes.',
    });

    const flarePmDue = atHourToday(FLARE_PM_HOUR, 0, now);
    push({
      id: `flare_pm_${today}`,
      kind: 'flare_step',
      dueAt: flarePmDue.getTime(),
      title: `Protocolo brote · PM (${phaseLabel})`,
      body: state.flare.phase === 'recovery'
        ? 'Lipikar Syndet, serum reparador y oclusivo (Cicaplast o vaselina). Activos en pausa o muy diluidos.'
        : isStrong
          ? 'Sello oclusivo: Cicaplast Baume B5 + vaselina sobre zonas más afectadas. Cero activos.'
          : 'Limpieza, Cicaplast B5 generoso, oclusivo en parches secos.',
    });
  }

  // Ordenar por hora.
  reminders.sort((a, b) => a.dueAt - b.dueAt);
  return reminders;
}

// ─── SCHEDULER (efectos colaterales: setTimeout + Notification) ─

interface ScheduledHandle {
  id: string;
  timeoutId: number;
}

const scheduledRef: { handles: ScheduledHandle[] } = { handles: [] };

/** Limpia todos los timeouts armados. */
export function clearScheduled(): void {
  for (const h of scheduledRef.handles) {
    clearTimeout(h.timeoutId);
  }
  scheduledRef.handles = [];
}

/** Programa una lista de recordatorios. Cancela los previos antes. */
export function scheduleReminders(reminders: CoachReminder[]): void {
  if (typeof window === 'undefined') return;
  clearScheduled();
  const permission = getNotifPermission();
  // Cap: solo programamos los próximos 6h hacia adelante para no
  // tener timers que la pestaña no podría sostener de todas formas.
  const horizonMs = 6 * 60 * 60 * 1000;
  const now = Date.now();
  for (const r of reminders) {
    if (r.cancelled) continue;
    const delay = r.dueAt - now;
    if (delay <= 0 || delay > horizonMs) continue;
    const timeoutId = window.setTimeout(() => {
      fireReminder(r, permission);
    }, delay);
    scheduledRef.handles.push({ id: r.id, timeoutId });
  }
}

function fireReminder(r: CoachReminder, permission: NotifPermission): void {
  // Persistir firedId para que sobreviva reload/refresh.
  markReminderFired(r.id);
  // Notificación nativa cuando se permitió.
  if (permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(r.title, {
            body: r.body,
            tag: `ma-coach-${r.id}`,
            requireInteraction: false,
          });
        });
      } else if (typeof Notification !== 'undefined') {
        new Notification(r.title, { body: r.body, tag: `ma-coach-${r.id}` });
      }
    } catch {
      /* ignore — caemos al evento in-app */
    }
  }
  // Evento in-app siempre — para que el panel del coach refleje el fired.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ma-coach-reminder-fired', { detail: { id: r.id } }),
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

export function reminderRelativeLabel(r: CoachReminder, now: Date = new Date()): string {
  const diffMs = r.dueAt - now.getTime();
  if (diffMs <= 0) return 'ahora';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hours = Math.floor(mins / 60);
  const restMin = mins % 60;
  if (restMin === 0) return `en ${hours} h`;
  return `en ${hours} h ${restMin} min`;
}

export function reminderClockLabel(r: CoachReminder): string {
  const d = new Date(r.dueAt);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
