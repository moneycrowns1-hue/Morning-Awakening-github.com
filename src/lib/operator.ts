// ═══════════════════════════════════════════════════════
// Operator — Text-to-speech narrator for Morning Awakening.
// Uses native SpeechSynthesis (zero external files, offline).
// Integrates with AudioEngine.duckForVoice() / unduck() for
// automatic ambient ducking when speaking.
// ═══════════════════════════════════════════════════════

import type { AudioEngine } from './audioEngine';

export interface OperatorOptions {
  rate?: number;    // 0.1 - 10 (default 0.92)
  pitch?: number;   // 0 - 2  (default 0.85)
  volume?: number;  // 0 - 1  (default 1)
  duck?: boolean;   // duck AudioEngine (default true)
}

export class Operator {
  private voice: SpeechSynthesisVoice | null = null;
  private engine: AudioEngine | null;
  private enabled = true;
  private ready = false;
  private queuedReady?: () => void;

  constructor(engine?: AudioEngine) {
    this.engine = engine ?? null;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.loadVoice();
    // Some browsers load voices async
    window.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoice());
  }

  /**
   * iOS Safari requires the first SpeechSynthesis call to be inside a user
   * gesture. Speaking an empty utterance "unlocks" synthesis and also
   * forces the voices list to populate on iOS.
   */
  unlockForIOS() {
    if (!this.isAvailable()) return;
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      // Re-query voices after the unlock
      this.loadVoice();
    } catch {
      /* ignore */
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

  /** Queue a line. Returns a promise resolved when speech ends (or skipped). */
  speak(text: string, opts: OperatorOptions = {}): Promise<void> {
    if (!this.enabled || !this.isAvailable() || !text) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const speakNow = () => {
        const u = new SpeechSynthesisUtterance(text);
        if (this.voice) u.voice = this.voice;
        u.lang = this.voice?.lang || 'es-MX';
        u.rate = opts.rate ?? 0.92;
        u.pitch = opts.pitch ?? 0.85;
        u.volume = opts.volume ?? 1;

        const duck = opts.duck ?? true;
        if (duck && this.engine) this.engine.duckForVoice(0.32, 0.2);

        const finish = () => {
          if (duck && this.engine) this.engine.unduck(0.6);
          resolve();
        };
        u.onend = finish;
        u.onerror = finish;

        try {
          // iOS: if paused (happens after cancel), resume first
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          window.speechSynthesis.speak(u);
        } catch {
          finish();
        }
      };

      if (this.ready) speakNow();
      else {
        // Wait up to 1.5s for voices
        this.queuedReady = speakNow;
        setTimeout(() => {
          if (!this.ready) resolve();
        }, 1500);
      }
    });
  }

  cancel() {
    if (!this.isAvailable()) return;
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    if (this.engine) this.engine.unduck(0.3);
  }
}
