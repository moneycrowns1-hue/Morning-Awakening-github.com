// ═══════════════════════════════════════════════════════════
// HealthKit Bridge · Apple Shortcut → PWA
//
// Como una PWA no puede leer HealthKit directamente, usamos
// un Atajo de Apple (Shortcuts) que ejecuta en el iPhone:
//   1. Busca "Sleep Analysis" de los últimos N días.
//   2. Formatea cada muestra como { startMs, endMs }.
//   3. Serializa a JSON → base64url → urlencode.
//   4. Abre:  <appUrl>/#hk=<encoded>
//
// Esta lib se encarga de:
//   - Detectar el hash al montar la app y parsearlo.
//   - Persistir un HealthSnapshot en localStorage.
//   - Exponer status (connected/stale/missing) para la UI.
//   - Calcular agregados (promedio duración, mediana bed/wake)
//     que luego se pueden usar en el Sleep Gate.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'ma-healthkit-snapshot';
const STALE_MS = 48 * 60 * 60 * 1000; // > 48h sin sync → pedir permisos

export interface HealthSleepSample {
  /** Inicio real de sueño (milliseconds). */
  start: number;
  /** Fin real de sueño (milliseconds). */
  end: number;
  /** Duración en minutos. */
  durationMin: number;
}

export interface HealthSnapshot {
  /** Versión del schema. Subir al romper compat. */
  v: 1;
  /** Timestamp (ms) en que el atajo generó el export. */
  exportedAt: number;
  /** Última vez que la PWA recibió el snapshot. */
  receivedAt: number;
  /** Lista de noches crudas, ordenadas de más reciente a más vieja. */
  nights: HealthSleepSample[];
  /** Promedio de duración (min) de las últimas N. */
  avgDurationMin: number;
  /** Mediana de hora de acostarse, formato "HH:MM". */
  bedtimeMedian: string;
  /** Mediana de hora de despertar, formato "HH:MM". */
  waketimeMedian: string;
}

export type HealthStatus =
  | { kind: 'missing' }
  | { kind: 'connected'; snapshot: HealthSnapshot }
  | { kind: 'stale'; snapshot: HealthSnapshot; ageMs: number };

// ─── Persistence ──────────────────────────────────────────

export function loadHealthSnapshot(): HealthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.v !== 1 || !Array.isArray(p.nights)) return null;
    return p as HealthSnapshot;
  } catch {
    return null;
  }
}

export function saveHealthSnapshot(snap: HealthSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

export function clearHealthSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getHealthStatus(now: number = Date.now()): HealthStatus {
  const snap = loadHealthSnapshot();
  if (!snap) return { kind: 'missing' };
  const age = now - snap.receivedAt;
  if (age > STALE_MS) return { kind: 'stale', snapshot: snap, ageMs: age };
  return { kind: 'connected', snapshot: snap };
}

// ─── URL hash ingestion ──────────────────────────────────

/**
 * Runs once on app load. If the URL hash carries `hk=<payload>`,
 * decodes + validates + persists it, then strips the hash from
 * the address bar so reloads don't re-trigger.
 *
 * Returns the parsed snapshot (if any) so callers can react
 * (e.g. toast "Datos importados · N noches").
 */
export function consumeHealthHashIfPresent(): HealthSnapshot | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('hk=')) return null;

  try {
    // Accept both `#hk=...` and `#foo&hk=...` forms.
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const raw = params.get('hk');
    if (!raw) return null;

    const json = decodeShortcutPayload(raw);
    const snap = validatePayload(json);
    if (!snap) return null;

    const finalSnap: HealthSnapshot = { ...snap, receivedAt: Date.now() };
    saveHealthSnapshot(finalSnap);

    // Clear hash so reloads don't reprocess.
    try {
      const clean = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', clean);
    } catch {
      /* ignore */
    }
    return finalSnap;
  } catch {
    return null;
  }
}

// ─── Payload decode / validate ───────────────────────────

function decodeShortcutPayload(raw: string): unknown {
  // The Shortcut produces base64url of UTF-8 JSON.
  // Try that first; fall back to raw JSON (in case user pasted it).
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const text = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

interface IncomingNight {
  start: number;
  end: number;
}

function validatePayload(obj: unknown): HealthSnapshot | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const nightsRaw = Array.isArray(o.nights) ? (o.nights as IncomingNight[]) : [];
  if (nightsRaw.length === 0) return null;

  const nights: HealthSleepSample[] = nightsRaw
    .filter(
      (n) =>
        n &&
        typeof n.start === 'number' &&
        typeof n.end === 'number' &&
        n.end > n.start &&
        n.end - n.start < 18 * 60 * 60 * 1000, // sanity: < 18h
    )
    .map((n) => ({
      start: n.start,
      end: n.end,
      durationMin: Math.round((n.end - n.start) / 60000),
    }))
    .sort((a, b) => b.start - a.start);

  if (nights.length === 0) return null;

  const durations = nights.map((n) => n.durationMin);
  const avgDurationMin = Math.round(
    durations.reduce((acc, d) => acc + d, 0) / durations.length,
  );

  const bedtimeMedian = medianHHMM(nights.map((n) => n.start));
  const waketimeMedian = medianHHMM(nights.map((n) => n.end));

  const exportedAt = typeof o.exportedAt === 'number' ? o.exportedAt : Date.now();

  return {
    v: 1,
    exportedAt,
    receivedAt: Date.now(),
    nights,
    avgDurationMin,
    bedtimeMedian,
    waketimeMedian,
  };
}

function medianHHMM(timestamps: number[]): string {
  // Convert each timestamp to minutes-of-day, handling the wrap at
  // midnight carefully: values in [18:00..23:59] are kept, values
  // in [00:00..12:00] shift +24h so the median is meaningful for a
  // person who usually goes to bed past midnight.
  if (timestamps.length === 0) return '23:00';
  const mins = timestamps.map((t) => {
    const d = new Date(t);
    let m = d.getHours() * 60 + d.getMinutes();
    if (m < 12 * 60) m += 24 * 60;
    return m;
  });
  mins.sort((a, b) => a - b);
  const mid = mins[Math.floor(mins.length / 2)] % (24 * 60);
  const hh = Math.floor(mid / 60);
  const mm = mid % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ─── Helpers for UI ──────────────────────────────────────

export function describeStatus(status: HealthStatus): string {
  switch (status.kind) {
    case 'missing':
      return 'Sin conectar';
    case 'connected': {
      const mins = Math.round((Date.now() - status.snapshot.receivedAt) / 60000);
      if (mins < 1) return 'Sincronizado ahora';
      if (mins < 60) return `Sincronizado hace ${mins} min`;
      const hours = Math.round(mins / 60);
      return `Sincronizado hace ${hours} h`;
    }
    case 'stale': {
      const hours = Math.round(status.ageMs / 3600000);
      return `Última sync hace ${hours} h`;
    }
  }
}
