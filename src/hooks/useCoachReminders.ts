// ═══════════════════════════════════════════════════════════
// useCoachReminders · capa reactiva sobre el scheduler.
//
// Recibe el snapshot del estado del coach (CoachState) ya
// hidratado y devuelve:
//   · `reminders`      — lista futura para hoy, ordenada.
//   · `permission`     — estado actual del permiso de notif.
//   · `requestPermission()` — pide el permiso (debe correr
//                              dentro de un user gesture).
//   · `firedIds`       — set de ids ya disparados (in-session).
//
// Reprograma timeouts cada vez que cambia el estado o cada
// 60 s (para que un slot que vence "en 4 min" se respete).
// ═══════════════════════════════════════════════════════════

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getNotifPermission,
  requestNotifPermission,
  type NotifPermission,
} from '@/lib/common/notifications';
import {
  generateReminders,
  scheduleReminders,
  clearScheduled,
  loadMetaForToday,
  snoozeReminder as snoozeReminderApi,
  dismissReminder as dismissReminderApi,
  type CoachReminder,
} from '@/lib/coach/reminders';
import type { CoachState } from '@/lib/coach/state';

export interface UseCoachRemindersResult {
  reminders: CoachReminder[];
  permission: NotifPermission;
  requestPermission: () => Promise<NotifPermission>;
  firedIds: Set<string>;
  snooze: (id: string, minutes?: number) => void;
  dismiss: (id: string) => void;
}

export function useCoachReminders(
  state: CoachState | null,
  hydrated: boolean,
): UseCoachRemindersResult {
  const [permission, setPermission] = useState<NotifPermission>(() =>
    typeof window === 'undefined' ? 'unsupported' : getNotifPermission(),
  );
  const [tick, setTick] = useState(0);
  const [firedIds, setFiredIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(loadMetaForToday().fired);
    } catch {
      return new Set();
    }
  });

  // Re-evaluar cada 60s para que el "atraso" se vea correctamente.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setInterval(() => setTick(t => (t + 1) % 1_000_000), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Suscribirse al evento que el scheduler dispara al firearse un reminder.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      setFiredIds(prev => {
        if (prev.has(detail.id)) return prev;
        const next = new Set(prev);
        next.add(detail.id);
        return next;
      });
    };
    window.addEventListener('ma-coach-reminder-fired', handler);
    return () => window.removeEventListener('ma-coach-reminder-fired', handler);
  }, []);

  // Reactividad al cambio de visibilidad (al volver del background,
  // refrescamos para reprogramar).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        setPermission(getNotifPermission());
        setTick(t => (t + 1) % 1_000_000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Generar la lista (puro).
  const reminders = useMemo<CoachReminder[]>(() => {
    if (!hydrated || !state) return [];
    return generateReminders(state, new Date());
    // tick fuerza recomputación cada minuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hydrated, tick]);

  // Reprogramar timeouts cuando cambia la lista.
  useEffect(() => {
    if (!hydrated) return;
    scheduleReminders(reminders);
    return () => {
      clearScheduled();
    };
  }, [reminders, hydrated]);

  const requestPermission = useCallback(async (): Promise<NotifPermission> => {
    const next = await requestNotifPermission();
    setPermission(next);
    return next;
  }, []);

  const snooze = useCallback((id: string, minutes: number = 30) => {
    snoozeReminderApi(id, minutes);
    // Forzar regeneración inmediata.
    setTick(t => (t + 1) % 1_000_000);
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissReminderApi(id);
    setTick(t => (t + 1) % 1_000_000);
  }, []);

  return { reminders, permission, requestPermission, firedIds, snooze, dismiss };
}
