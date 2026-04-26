// ═══════════════════════════════════════════════════════
// achievements.ts · badge definitions + evaluator
//
// Deterministic. Given the full sessions[] and the set of
// already-unlocked ids, returns the list of badges that
// should NOW be unlocked (not already in the set).
//
// Persistence: localStorage under MA_ACHIEVEMENTS_KEY as
//   { id: isoTimestamp } map.
//
// UI consumers (HistoryScreen, toast):
//   listDefinitions()  \u2192 full catalogue
//   loadUnlocked()     \u2192 { id: unlockedAt ISO }
//   evaluateAchievements(sessions, unlocked) \u2192 newly
//   persistNewlyUnlocked(ids) \u2192 merges into storage
// ═══════════════════════════════════════════════════════

import type { SessionRecord } from './sessionHistory';

const STORAGE_KEY = 'morning-awakening-achievements';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Lucide icon component name. Rendered by the consumer. */
  icon: 'Sunrise' | 'Flame' | 'Award' | 'Sparkles' | 'Target' | 'Trophy' | 'Zap' | 'Clock';
  /** Accent colour for the badge — uses SUNRISE palette hex values. */
  tone: 'gold' | 'coral' | 'amber' | 'rose' | 'cool';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_sunrise',
    title: 'Primer amanecer',
    description: 'Completa tu primer protocolo.',
    icon: 'Sunrise',
    tone: 'gold',
  },
  {
    id: 'streak_7',
    title: 'Disciplina semanal',
    description: 'Racha de 7 d\u00edas consecutivos.',
    icon: 'Flame',
    tone: 'amber',
  },
  {
    id: 'streak_30',
    title: 'Disciplina mensual',
    description: 'Racha de 30 d\u00edas consecutivos.',
    icon: 'Flame',
    tone: 'coral',
  },
  {
    id: 'flawless',
    title: 'Ejecuci\u00f3n impecable',
    description: 'Sesi\u00f3n sin skips con score 90 o m\u00e1s.',
    icon: 'Award',
    tone: 'gold',
  },
  {
    id: 'perfection',
    title: 'Perfecci\u00f3n',
    description: 'Alcanza un score de 100.',
    icon: 'Trophy',
    tone: 'gold',
  },
  {
    id: 'early_bird',
    title: 'Amanecer temprano',
    description: 'Completa el protocolo antes de las 6:00 AM.',
    icon: 'Clock',
    tone: 'amber',
  },
  {
    id: 'rhythm',
    title: 'Ritmo',
    description: '5 sesiones seguidas con score 80 o m\u00e1s.',
    icon: 'Zap',
    tone: 'rose',
  },
  {
    id: 'century',
    title: 'Centena',
    description: '100 protocolos completados.',
    icon: 'Target',
    tone: 'cool',
  },
];

export function listDefinitions(): AchievementDef[] {
  return ACHIEVEMENTS;
}

export function getDefinition(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export type UnlockedMap = Record<string, string>;

export function loadUnlocked(): UnlockedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as UnlockedMap) : {};
  } catch {
    return {};
  }
}

function saveUnlocked(map: UnlockedMap): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

/**
 * Returns the list of achievement ids that should be unlocked now
 * but are not yet present in `unlocked`. Pure function.
 */
export function evaluateAchievements(sessions: SessionRecord[], unlocked: UnlockedMap): string[] {
  const newly: string[] = [];
  const has = (id: string) => id in unlocked || newly.includes(id);
  if (sessions.length === 0) return newly;

  const last = sessions[sessions.length - 1];

  // first_sunrise
  if (!has('first_sunrise')) newly.push('first_sunrise');

  // streak_7 / streak_30: any session with streak >= threshold
  const maxStreak = sessions.reduce((m, r) => Math.max(m, r.streak), 0);
  if (maxStreak >= 7 && !has('streak_7')) newly.push('streak_7');
  if (maxStreak >= 30 && !has('streak_30')) newly.push('streak_30');

  // flawless: a session with 0 skips and score >= 90
  if (!has('flawless') && last.skippedPhases.length === 0 && last.score >= 90) {
    newly.push('flawless');
  }

  // perfection: any session with score === 100
  if (!has('perfection') && sessions.some((r) => r.score >= 100)) {
    newly.push('perfection');
  }

  // early_bird: completedAt local hour < 6
  if (!has('early_bird')) {
    const d = new Date(last.completedAt);
    if (d.getHours() < 6) newly.push('early_bird');
  }

  // rhythm: 5 consecutive sessions with score >= 80 (consecutive in
  // the sessions array order, not necessarily consecutive days).
  if (!has('rhythm') && sessions.length >= 5) {
    const lastFive = sessions.slice(-5);
    if (lastFive.every((r) => r.score >= 80)) newly.push('rhythm');
  }

  // century: >= 100 sessions total
  if (!has('century') && sessions.length >= 100) newly.push('century');

  return newly;
}

/** Merge newly unlocked ids into storage with current timestamp. */
export function persistNewlyUnlocked(ids: string[]): UnlockedMap {
  if (ids.length === 0) return loadUnlocked();
  const current = loadUnlocked();
  const now = new Date().toISOString();
  for (const id of ids) {
    if (!(id in current)) current[id] = now;
  }
  saveUnlocked(current);
  return current;
}

export function clearAchievements(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
