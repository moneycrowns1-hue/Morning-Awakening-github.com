// ═══════════════════════════════════════════════════════
// Progression — Operator XP / Levels / Stats
// Triangular XP curve: xpForLevel(n) = 100 * n * (n+1) / 2
// Stats (Disciplina, Enfoque, Energía) grow by mission layer:
//   ignition  → Energía
//   bridge    → Disciplina
//   cognitive → Enfoque
// ═══════════════════════════════════════════════════════

import type { AudioLayer, Mission } from './constants';

export interface OperatorStats {
  disciplina: number;
  enfoque: number;
  energia: number;
}

export type OperatorClass = 'WARRIOR' | 'SCHOLAR' | 'MYSTIC';

export interface OperatorProfile {
  name: string;
  operatorClass: OperatorClass;
  xp: number;
  level: number;
  stats: OperatorStats;
  totalMinutes: number;
  phasesCompleted: number;
  createdAt: string;
  lastSessionAt: string | null;
}

export const PROFILE_KEY = 'morning-awakening-profile';

export const DEFAULT_STATS: OperatorStats = {
  disciplina: 0,
  enfoque: 0,
  energia: 0,
};

export const DEFAULT_PROFILE: OperatorProfile = {
  name: 'Jugador',
  operatorClass: 'WARRIOR',
  xp: 0,
  level: 1,
  stats: { ...DEFAULT_STATS },
  totalMinutes: 0,
  phasesCompleted: 0,
  createdAt: new Date().toISOString(),
  lastSessionAt: null,
};

/** Total XP required to reach `level` (triangular). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

/** Level corresponding to a given total-xp accumulation. */
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

/** XP progress toward next level as { current, required, ratio 0-1 }. */
export function levelProgress(xp: number): { current: number; required: number; ratio: number } {
  const lvl = levelFromXp(xp);
  const base = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  const current = xp - base;
  const required = next - base;
  return { current, required, ratio: required > 0 ? current / required : 1 };
}

export interface XpAward {
  xp: number;
  statsDelta: OperatorStats;
  statName: keyof OperatorStats;
}

/** Compute XP + stats for completing a mission. */
export function computeReward(mission: Mission, streak: number): XpAward {
  // Base 50 + 1 per 30s of mission duration (manual missions counted as 30s).
  const durationBonus = Math.max(0, Math.floor((mission.duration || 30) / 30));
  const streakBonus = Math.min(streak * 2, 40); // cap +40
  const xp = 50 + durationBonus + streakBonus;

  const statName: keyof OperatorStats =
    mission.layer === 'ignition' ? 'energia' :
    mission.layer === 'bridge' ? 'disciplina' : 'enfoque';

  const statsDelta: OperatorStats = { disciplina: 0, enfoque: 0, energia: 0 };
  statsDelta[statName] = 1;

  return { xp, statsDelta, statName };
}

/** Apply an award and return new profile (immutable). */
export function applyAward(profile: OperatorProfile, award: XpAward, mission: Mission): OperatorProfile {
  const xp = profile.xp + award.xp;
  const level = levelFromXp(xp);
  const stats: OperatorStats = {
    disciplina: profile.stats.disciplina + award.statsDelta.disciplina,
    enfoque: profile.stats.enfoque + award.statsDelta.enfoque,
    energia: profile.stats.energia + award.statsDelta.energia,
  };
  const minuteBump = Math.ceil((mission.duration || 30) / 60);
  return {
    ...profile,
    xp,
    level,
    stats,
    totalMinutes: profile.totalMinutes + minuteBump,
    phasesCompleted: profile.phasesCompleted + 1,
    lastSessionAt: new Date().toISOString(),
  };
}

export function loadProfile(): OperatorProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<OperatorProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      stats: { ...DEFAULT_STATS, ...(parsed.stats || {}) },
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: OperatorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* storage full */
  }
}

/** Class-to-starting-stat bonus. */
export function applyClassBonus(profile: OperatorProfile, cls: OperatorClass): OperatorProfile {
  const stats = { ...profile.stats };
  if (cls === 'WARRIOR') stats.energia += 5;
  else if (cls === 'SCHOLAR') stats.enfoque += 5;
  else stats.disciplina += 5;
  return { ...profile, operatorClass: cls, stats };
}

export type { AudioLayer };
