// ═══════════════════════════════════════════════════════
// nightMode.ts · persistence for the Night Mode screen.
//
// Kept deliberately small: the screen is mostly stateless
// day-to-day, we only persist what the user would be annoyed
// to re-pick every night.
// ═══════════════════════════════════════════════════════

export type SleepTrackId =
  | 'rain'
  | 'ocean'
  | 'forest'
  | 'whitenoise'
  | 'fire'
  | 'drone';

/** Sleep timer options shown to the user, in minutes. `0` is "infinite". */
export const SLEEP_TIMER_OPTIONS = [15, 30, 60, 90, 0] as const;
export type SleepTimerMinutes = (typeof SLEEP_TIMER_OPTIONS)[number];

export interface NightModeConfig {
  /** Last sound picked. `null` means the user never picked one → no
   *  "Dormir ya" shortcut until they've chosen at least once. */
  lastTrackId: SleepTrackId | null;
  /** Last timer the user chose (minutes). 0 means infinite. */
  lastTimerMin: SleepTimerMinutes;
  /** Last volume (0..1). */
  lastVolume: number;
  /** Warm filter ON inside the NightModeScreen. */
  warmFilter: boolean;
  /** ISO date (YYYY-MM-DD) of the last "hoy no me muestres la
   *  sugerencia nocturna" dismissal. Null if never silenced today. */
  suggestionSilencedDate: string | null;
}

const STORAGE_KEY = 'morning-awakening-night';

export const DEFAULT_NIGHT_CONFIG: NightModeConfig = {
  lastTrackId: null,
  lastTimerMin: 30,
  lastVolume: 0.55,
  warmFilter: false,
  suggestionSilencedDate: null,
};

const VALID_TRACKS: SleepTrackId[] = ['rain', 'ocean', 'forest', 'whitenoise', 'fire', 'drone'];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function loadNightConfig(): NightModeConfig {
  if (typeof window === 'undefined') return DEFAULT_NIGHT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NIGHT_CONFIG;
    const p = JSON.parse(raw) as Partial<NightModeConfig>;
    const lastTrackId =
      p.lastTrackId && VALID_TRACKS.includes(p.lastTrackId as SleepTrackId)
        ? (p.lastTrackId as SleepTrackId)
        : null;
    const rawTimer = typeof p.lastTimerMin === 'number' ? p.lastTimerMin : 30;
    const lastTimerMin = (SLEEP_TIMER_OPTIONS as readonly number[]).includes(rawTimer)
      ? (rawTimer as SleepTimerMinutes)
      : 30;
    return {
      lastTrackId,
      lastTimerMin,
      lastVolume: clamp(typeof p.lastVolume === 'number' ? p.lastVolume : 0.55, 0, 1),
      warmFilter: !!p.warmFilter,
      suggestionSilencedDate:
        typeof p.suggestionSilencedDate === 'string' ? p.suggestionSilencedDate : null,
    };
  } catch {
    return DEFAULT_NIGHT_CONFIG;
  }
}

export function saveNightConfig(cfg: NightModeConfig): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** Today in local time as YYYY-MM-DD (for the suggestion silence key). */
export function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** The auto-suggestion in WelcomeScreen shows only when:
 *    - it's night time (>= 21:00 or < 04:00)
 *    - the user hasn't silenced it today
 *    - they're not already inside Night Mode (caller's concern) */
export function isNightSuggestionAppropriate(
  cfg: NightModeConfig = loadNightConfig(),
  now: Date = new Date(),
): boolean {
  const hour = now.getHours();
  const isNight = hour >= 21 || hour < 4;
  if (!isNight) return false;
  return cfg.suggestionSilencedDate !== todayKey();
}

export function silenceNightSuggestionToday(): void {
  const cfg = loadNightConfig();
  saveNightConfig({ ...cfg, suggestionSilencedDate: todayKey() });
}

// ─── Sound catalog (metadata only; files live in public/audio/sleep) ──

export interface SleepSound {
  id: SleepTrackId;
  label: string;
  /** Short one-liner shown as secondary text on the picker card. */
  blurb: string;
  /** Lucide icon name for the picker card. */
  icon: 'CloudRain' | 'Waves' | 'Trees' | 'Radio' | 'Flame' | 'Disc';
  /** Relative URL (served from /public). */
  src: string;
}

export const SLEEP_SOUNDS: readonly SleepSound[] = [
  { id: 'rain',       label: 'Lluvia',       blurb: 'Suave contra el techo',    icon: 'CloudRain', src: '/audio/sleep/rain.mp3' },
  { id: 'ocean',      label: 'Océano',       blurb: 'Olas que regresan',        icon: 'Waves',     src: '/audio/sleep/ocean.mp3' },
  { id: 'forest',     label: 'Bosque',       blurb: 'Grillos y hojas',          icon: 'Trees',     src: '/audio/sleep/forest.mp3' },
  { id: 'whitenoise', label: 'Ruido blanco', blurb: 'Aislamiento uniforme',     icon: 'Radio',     src: '/audio/sleep/whitenoise.mp3' },
  { id: 'fire',       label: 'Chimenea',     blurb: 'Madera crepitando',        icon: 'Flame',     src: '/audio/sleep/fire.mp3' },
  { id: 'drone',      label: 'Drone ambient',blurb: 'Capas cálidas',            icon: 'Disc',      src: '/audio/sleep/drone.mp3' },
];

export function findSound(id: SleepTrackId): SleepSound | undefined {
  return SLEEP_SOUNDS.find((s) => s.id === id);
}
