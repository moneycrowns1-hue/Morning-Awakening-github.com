// ═══════════════════════════════════════════════════════════
// ritualSchedule.ts · persistence + helpers para el
// "Morning Ritual Launcher".
//
// La filosofía cambia respecto al `alarmSchedule.ts` que
// reemplaza: este config NO intenta despertarte. Sirve sólo
// para:
//
//   1. Programar un push notification diario a la hora target
//      (uso `morningPing.ts`, que delega al SW).
//   2. Calcular si entraste a la app dentro de la "ventana
//      del ritual" (±60 min de target) → se ofrece arrancar
//      el ritual en lugar de la home normal.
//
// Sin `days[]` (todos los días el push es el mismo; si no
// querés, lo desactivás), sin `reaseguroSec` (reemplazado por
// adaptación contextual via `ritualAdapter.ts`), sin
// `armSystemFallback` (no fingimos ser una alarma del sistema).
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-ritual';

/** Tono de voz para el coach durante el ritual.
 *  · `default` → energía estándar.
 *  · `gentle`  → suave, para sleepDebt alto.
 *  · `calm`    → muy quieto, para stress alto. */
export type RitualVoiceTone = 'default' | 'gentle' | 'calm';

export interface RitualConfig {
  /** Si está activo, el push diario se programa y la ventana se evalúa. */
  enabled: boolean;
  /** 0..23 — hora target del ritual (idealmente justo después de
   *  que tu alarma nativa de iOS te despertó). */
  hour: number;
  /** 0..59. */
  minute: number;
  /** Segundos del ramp musical antes del peak. 60..1800.
   *  El `ritualAdapter` puede multiplicarlo según contexto. */
  rampSec: number;
  /** Volumen pico 0.2..1. */
  peakVolume: number;
  /** Tono base del coach (puede sobre-escribirse en runtime). */
  voiceTone: RitualVoiceTone;
  /** Si `true`, al terminar el ritual encadena directo al protocolo
   *  Génesis. Si `false`, vuelve a la home. */
  chainProtocol: boolean;
}

export const DEFAULT_RITUAL_CONFIG: RitualConfig = {
  enabled: false,
  hour: 5,
  minute: 30,
  rampSec: 300,        // 5 min
  peakVolume: 0.7,
  voiceTone: 'default',
  chainProtocol: true,
};

// ─── Back-compat alias ──────────────────────────────────────
// Varios componentes (`SlumberLockScreen`, `NightWelcomeScreen`,
// `NightProtocolFlow`, `computeSleepGate`) consumen un
// `AlarmConfig` con `{ enabled, hour, minute, rampSec }`. Como
// `RitualConfig` mantiene esos mismos campos, exportamos un
// alias para no obligar a migración masiva en night/*.
export type AlarmConfig = RitualConfig;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function loadRitual(): RitualConfig {
  if (typeof window === 'undefined') return DEFAULT_RITUAL_CONFIG;
  try {
    // Migración: leemos también la key vieja del alarm y la
    // adaptamos si la nueva no existe.
    const raw =
      localStorage.getItem(STORAGE_KEY)
      ?? localStorage.getItem('morning-awakening-alarm');
    if (!raw) return DEFAULT_RITUAL_CONFIG;
    const p = JSON.parse(raw);
    return {
      enabled: !!p.enabled,
      hour: clamp(p.hour ?? 5, 0, 23) | 0,
      minute: clamp(p.minute ?? 30, 0, 59) | 0,
      rampSec: clamp(p.rampSec ?? 300, 60, 1800) | 0,
      peakVolume: clamp(p.peakVolume ?? 0.7, 0.2, 1),
      voiceTone:
        p.voiceTone === 'gentle' || p.voiceTone === 'calm'
          ? p.voiceTone
          : 'default',
      chainProtocol: p.chainProtocol !== false,
    };
  } catch {
    return DEFAULT_RITUAL_CONFIG;
  }
}

/** Alias por compatibilidad para llamadores que aún importan `loadAlarm`. */
export const loadAlarm = loadRitual;

export function saveRitual(cfg: RitualConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

// ─── Ventana del ritual ─────────────────────────────────────

/** Cuánto antes del target el ritual ya está disponible (ms). */
export const RITUAL_WINDOW_BEFORE_MS = 60 * 60 * 1000; // 60 min antes
/** Cuánto después del target sigue ofreciéndose el ritual (ms).
 *  Más allá, asumimos que es tarde y vamos directo a home. */
export const RITUAL_WINDOW_AFTER_MS = 90 * 60 * 1000;  // 90 min después

/** Devuelve la fecha del próximo target a partir de `from`.
 *  El target es siempre HOY a HH:MM si todavía no pasó +
 *  `RITUAL_WINDOW_AFTER_MS`; si ya pasó, MAÑANA a HH:MM. */
export function nextTargetAt(cfg: RitualConfig, from: Date = new Date()): Date {
  const today = new Date(from);
  today.setHours(cfg.hour, cfg.minute, 0, 0);
  const cutoff = today.getTime() + RITUAL_WINDOW_AFTER_MS;
  if (from.getTime() <= cutoff) return today;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/** ¿Estamos en la ventana ±60/90 alrededor del target de hoy? */
export function isInRitualWindow(
  cfg: RitualConfig,
  now: Date = new Date(),
): boolean {
  if (!cfg.enabled) return false;
  const todayTarget = new Date(now);
  todayTarget.setHours(cfg.hour, cfg.minute, 0, 0);
  const t = todayTarget.getTime();
  const n = now.getTime();
  return n >= t - RITUAL_WINDOW_BEFORE_MS && n <= t + RITUAL_WINDOW_AFTER_MS;
}

/** Etiqueta `HH:MM` del target en formato 24h. */
export function formatTargetHHMM(cfg: RitualConfig): string {
  return `${String(cfg.hour).padStart(2, '0')}:${String(cfg.minute).padStart(2, '0')}`;
}
