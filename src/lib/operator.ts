// ═══════════════════════════════════════════════════════
// Operator — narrator for Morning Awakening.
//
// Two-tier strategy:
//  1) PRIMARY: pre-generated mp3s in /public/audio/voices/ (neural
//     Microsoft Edge TTS quality, JARVIS-ish es-ES-AlvaroNeural).
//     Loaded from a manifest keyed by the exact spoken text. Played
//     through a single HTMLAudioElement so volume/ducking keeps working.
//  2) FALLBACK: native SpeechSynthesis, used when the manifest is not
//     loaded yet, or the line was added after the last generation run.
//
// Integrates with AudioEngine.duckForVoice() / unduck() for automatic
// ambient ducking while speaking, same as before.
// ═══════════════════════════════════════════════════════

import type { AudioEngine } from './audioEngine';

export interface OperatorOptions {
  rate?: number;    // 0.1 - 10 (default 0.92)
  pitch?: number;   // 0 - 2  (default 0.85)
  volume?: number;  // 0 - 1  (default 1)
  duck?: boolean;   // duck AudioEngine (default true)
}

interface VoiceManifest {
  voice: string;
  lines: Record<string, { file: string }>;
}

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? '';
const MANIFEST_URL = `${BASE_PATH}/audio/voices/manifest.json`;
const VOICES_DIR = `${BASE_PATH}/audio/voices/`;

export class Operator {
  private voice: SpeechSynthesisVoice | null = null;
  private engine: AudioEngine | null;
  private enabled = true;
  private ready = false;
  private queuedReady?: () => void;

  // mp3 playback
  private manifest: VoiceManifest | null = null;
  // ONE reusable HTMLAudioElement, primed during unlockForIOS() so that
  // iOS Safari allows later programmatic .play() calls (outside of the
  // original user gesture). A freshly-constructed `new Audio()` would
  // be rejected by iOS autoplay policy. We swap `.src` for each line.
  private audioSlot: HTMLAudioElement | null = null;
  private audioUnlocked = false;

  constructor(engine?: AudioEngine) {
    this.engine = engine ?? null;
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      this.loadVoice();
      window.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoice());
    }
    // Kick off manifest fetch in parallel (non-blocking).
    this.loadManifest();
  }

  private async loadManifest() {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'force-cache' });
      if (!res.ok) return;
      this.manifest = (await res.json()) as VoiceManifest;
    } catch {
      /* manifest not deployed — fallback to SpeechSynthesis */
    }
  }

  /**
   * iOS Safari requires the first SpeechSynthesis call to be inside a user
   * gesture. Speaking an empty utterance "unlocks" synthesis and also
   * forces the voices list to populate on iOS.
   */
  unlockForIOS() {
    // ── SpeechSynthesis unlock ──
    if (this.isAvailable()) {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
        this.loadVoice();
      } catch {
        /* ignore */
      }
    }

    // ── HTMLAudioElement unlock (iOS Safari) ──
    // iOS rejects `audio.play()` called outside a user gesture. We create
    // ONE reusable element here (we're inside a click handler) and prime
    // it with a 1-frame silent payload so iOS whitelists it. Afterwards
    // we can change its `.src` and call `.play()` programmatically from
    // timers / promises / anywhere — iOS remembers that this element was
    // "approved". Tier-1 speak() reuses this same element.
    if (typeof window !== 'undefined' && !this.audioSlot) {
      try {
        const a = new Audio();
        a.preload = 'auto';
        // 0.1s of silence (valid tiny mp3).
        a.src =
          'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQABzAAAASDs90hvAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            a.pause();
            a.currentTime = 0;
            this.audioUnlocked = true;
          }).catch(() => {
            /* iOS blocked — will keep trying on next gesture */
          });
        }
        this.audioSlot = a;
      } catch {
        /* ignore */
      }
    }
  }

  private loadVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    // Priority: es-MX → es-US → es-* → any
    const prefs = [
      (v: SpeechSynthesisVoice) => v.lang === 'es-MX',
      (v: SpeechSynthesisVoice) => v.lang === 'es-US',
      (v: SpeechSynthesisVoice) => v.lang === 'es-ES',
      (v: SpeechSynthesisVoice) => v.lang?.startsWith('es'),
      (v: SpeechSynthesisVoice) => /spanish|español/i.test(v.name),
    ];
    for (const pref of prefs) {
      const match = voices.find(pref);
      if (match) {
        this.voice = match;
        this.ready = true;
        this.queuedReady?.();
        return;
      }
    }
    // Fallback: any voice
    this.voice = voices[0];
    this.ready = true;
    this.queuedReady?.();
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  isReady(): boolean {
    return this.ready;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.cancel();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Queue a line. Returns a promise resolved when speech ends (or skipped).
   * Tries pre-generated mp3 first; falls back to SpeechSynthesis.
   */
  speak(text: string, opts: OperatorOptions = {}): Promise<void> {
    if (!this.enabled || !text) return Promise.resolve();
    if (typeof window === 'undefined') return Promise.resolve();

    const duck = opts.duck ?? true;
    const volume = opts.volume ?? 1;

    const startDuck = () => {
      if (duck && this.engine) this.engine.duckForVoice(0.32, 0.2);
    };
    const endDuck = () => {
      if (duck && this.engine) this.engine.unduck(0.6);
    };

    // Always cancel any in-flight speech before starting a new one.
    // This guarantees we never hear two voices at once (mp3+synth, or
    // overlapping mp3s if speak() is called twice quickly).
    this.stopCurrentAudio();
    if (this.isAvailable()) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }

    // ─── Tier 1: pre-generated mp3 ───────────────────────
    const entry = this.manifest?.lines?.[text];
    if (entry) {
      // Reuse the unlocked HTMLAudioElement created during unlockForIOS().
      // If it's not there (e.g. unlockForIOS was never called because the
      // user never clicked INICIAR) we still attempt a fresh Audio() —
      // that works fine on desktop and non-iOS mobile.
      const audio = this.audioSlot ?? (this.audioSlot = new Audio());
      return new Promise<void>((resolve) => {
        try {
          // Detach any previous handlers from the reused element.
          audio.onended = null;
          audio.onerror = null;

          audio.src = `${VOICES_DIR}${entry.file}`;
          audio.volume = Math.max(0, Math.min(1, volume));
          audio.playbackRate = opts.rate ?? 1;
          audio.currentTime = 0;

          startDuck();
          const cleanup = () => {
            endDuck();
            resolve();
          };
          audio.onended = cleanup;
          audio.onerror = () => {
            // mp3 failed: resolve silently — do NOT fall back to synth
            // here because that caused overlapping voices in v7.0.
            cleanup();
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
              // Autoplay blocked or other failure — same policy.
              cleanup();
            });
          }
        } catch {
          endDuck();
          resolve();
        }
      });
    }

    // ─── Tier 2: native SpeechSynthesis ──────────────────
    return this.speakViaSynth(text, opts);
  }

  private stopCurrentAudio() {
    if (this.audioSlot) {
      try {
        this.audioSlot.onended = null;
        this.audioSlot.onerror = null;
        this.audioSlot.pause();
        // Don't clear src or null the element — we want to reuse it so
        // iOS keeps honouring the original unlock gesture.
      } catch { /* ignore */ }
    }
  }

  private speakViaSynth(text: string, opts: OperatorOptions): Promise<void> {
    if (!this.isAvailable()) return Promise.resolve();
    const duck = opts.duck ?? true;
    return new Promise<void>((resolve) => {
      const speakNow = () => {
        const u = new SpeechSynthesisUtterance(text);
        if (this.voice) u.voice = this.voice;
        u.lang = this.voice?.lang || 'es-MX';
        u.rate = opts.rate ?? 0.92;
        u.pitch = opts.pitch ?? 0.85;
        u.volume = opts.volume ?? 1;

        if (duck && this.engine) this.engine.duckForVoice(0.32, 0.2);

        const finish = () => {
          if (duck && this.engine) this.engine.unduck(0.6);
          resolve();
        };
        u.onend = finish;
        u.onerror = finish;

        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          window.speechSynthesis.speak(u);
        } catch {
          finish();
        }
      };

      if (this.ready) speakNow();
      else {
        this.queuedReady = speakNow;
        setTimeout(() => {
          if (!this.ready) resolve();
        }, 1500);
      }
    });
  }

  cancel() {
    this.stopCurrentAudio();
    if (this.isAvailable()) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    if (this.engine) this.engine.unduck(0.3);
  }
}
