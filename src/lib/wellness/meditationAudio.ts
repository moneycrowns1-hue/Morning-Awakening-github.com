// ═══════════════════════════════════════════════════════════
// meditationAudio · helper para reproducir audios de voz
// guiada durante sesiones de meditación profunda.
//
// Busca archivos mp3 en /audio/meditation/{mode}/{stepId}.mp3
// Si no existen, falla silenciosamente (degradación elegante).
// El usuario puede depositar sus archivos generados ahí.
// ═══════════════════════════════════════════════════════════

import type { DeepMeditationMode } from './wellnessRoutines';

const BASE_PATH = '/audio/meditation';

/** Cached set of paths we've already confirmed don't exist. */
const missingCache = new Set<string>();
/** Current audio element, if any. */
let currentAudio: HTMLAudioElement | null = null;

/**
 * Build the expected path for a meditation step audio file.
 * Convention: /audio/meditation/{mode}/{stepId}.mp3
 *
 * The stepId maps as follows:
 *   - 'opening'   → opening.mp3
 *   - 'practice_anchor' → anchor.mp3  (strips 'practice_' prefix)
 *   - 'closing'   → closing.mp3
 */
function buildPath(mode: DeepMeditationMode, stepId: string): string {
  // Strip the 'practice_' prefix that buildDeepMeditationRoutine adds.
  const cleanId = stepId.replace(/^practice_/, '');
  return `${BASE_PATH}/${mode}/${cleanId}.mp3`;
}

/**
 * Try to play the voice audio for a meditation step.
 * Returns true if audio was found and playback started.
 * Returns false if the file doesn't exist (silent fallback).
 */
export async function playStepAudio(
  mode: DeepMeditationMode,
  stepId: string,
  volume = 0.85,
): Promise<boolean> {
  const path = buildPath(mode, stepId);

  // Skip if we already know this file is missing.
  if (missingCache.has(path)) return false;

  // Stop any currently playing step audio first.
  stopStepAudio();

  try {
    // Probe the file with a HEAD request to avoid 404 console errors.
    const probe = await fetch(path, { method: 'HEAD' });
    if (!probe.ok) {
      missingCache.add(path);
      return false;
    }

    const audio = new Audio(path);
    audio.volume = volume;
    audio.preload = 'auto';

    await audio.play();
    currentAudio = audio;

    // Clean up reference when done.
    audio.addEventListener('ended', () => {
      if (currentAudio === audio) currentAudio = null;
    }, { once: true });

    return true;
  } catch {
    missingCache.add(path);
    return false;
  }
}

/**
 * Stop the currently playing step audio, if any.
 */
export function stopStepAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch { /* ignore */ }
    currentAudio = null;
  }
}

/**
 * Check whether an audio file exists for a given mode + step.
 * Uses the missingCache and a HEAD probe.
 */
export async function hasStepAudio(
  mode: DeepMeditationMode,
  stepId: string,
): Promise<boolean> {
  const path = buildPath(mode, stepId);
  if (missingCache.has(path)) return false;
  try {
    const probe = await fetch(path, { method: 'HEAD' });
    if (!probe.ok) {
      missingCache.add(path);
      return false;
    }
    return true;
  } catch {
    missingCache.add(path);
    return false;
  }
}

/**
 * Set volume on the currently playing audio.
 */
export function setStepAudioVolume(volume: number): void {
  if (currentAudio) {
    currentAudio.volume = Math.max(0, Math.min(1, volume));
  }
}
