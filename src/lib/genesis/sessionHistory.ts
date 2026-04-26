// ═══════════════════════════════════════════════════════
// sessionHistory.ts · per-session record persistence
//
// Stores an append-only list of SessionRecord objects in
// localStorage. Consumed by SummaryScreen (last session +
// comparison metrics) and the upcoming HistoryScreen
// (heatmap + 30-day line chart).
//
// Quality score (0..100) is also computed here so both
// the summary and history use the same formula.
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'morning-awakening-sessions';
const MAX_KEPT = 365; // ~1 year of daily sessions

export interface SessionRecord {
  /** ISO YYYY-MM-DD of local date when the session completed. */
  date: string;
  /** Unix ms timestamp of completion. */
  completedAt: number;
  /** Total elapsed seconds across all phases. */
  durationSec: number;
  /** Quality score 0..100. */
  score: number;
  /** Index of phases that were skipped (dev skip or manual skip). */
  skippedPhases: number[];
  /** Total phases completed (normally 12). */
  phasesCompleted: number;
  /** XP earned in this session. */
  xp: number;
  /** Streak length at the moment of completion (post-increment). */
  streak: number;
}

/** Ideal protocol duration in seconds. Used to score timing. */
const IDEAL_DURATION_SEC = 105 * 60;
/** Tolerance window for "on target" duration scoring. */
const DURATION_WINDOW = 0.15; // ±15%

export interface ScoreInput {
  phasesCompleted: number;
  totalPhases: number;
  skippedCount: number;
  durationSec: number;
  streak: number;
}

/**
 * Quality score 0..100, built from:
 *   - Completion ratio  (0..50)
 *   - No-skip bonus     (0..20)
 *   - Duration fit      (0..20)
 *   - Streak multiplier (0..10)
 */
export function computeQualityScore({
  phasesCompleted,
  totalPhases,
  skippedCount,
  durationSec,
  streak,
}: ScoreInput): number {
  const completion = (phasesCompleted / Math.max(1, totalPhases)) * 50;

  const skipRatio = skippedCount / Math.max(1, totalPhases);
  const noSkip = Math.max(0, 1 - skipRatio) * 20;

  // Duration score: peak at ideal, decays linearly until 2x the
  // window at which point it's 0.
  const delta = Math.abs(durationSec - IDEAL_DURATION_SEC) / IDEAL_DURATION_SEC;
  const durationFit = Math.max(0, 1 - delta / (DURATION_WINDOW * 2)) * 20;

  // Streak bonus maxes out at 30 days.
  const streakBonus = Math.min(10, (streak / 30) * 10);

  return Math.round(completion + noSkip + durationFit + streakBonus);
}

function safeLoad(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SessionRecord[];
  } catch {
    return [];
  }
}

function safeSave(list: SessionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* quota / private mode; ignore */ }
}

export function loadSessions(): SessionRecord[] {
  return safeLoad();
}

export function appendSession(record: SessionRecord): SessionRecord[] {
  const list = safeLoad();
  list.push(record);
  // Trim to the most recent MAX_KEPT to bound storage.
  const trimmed = list.length > MAX_KEPT ? list.slice(-MAX_KEPT) : list;
  safeSave(trimmed);
  return trimmed;
}

export function getLastNDays(n: number): SessionRecord[] {
  const list = safeLoad();
  return list.slice(-n);
}

/** Average score across the last N sessions (null if empty). */
export function averageScore(n = 7): number | null {
  const list = getLastNDays(n);
  if (list.length === 0) return null;
  const sum = list.reduce((s, r) => s + r.score, 0);
  return Math.round(sum / list.length);
}
