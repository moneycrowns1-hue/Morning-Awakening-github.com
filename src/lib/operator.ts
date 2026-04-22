// ═══════════════════════════════════════════════════════
// Operator — narrator for Morning Awakening.
//
// Three-tier playback strategy:
//
//   0) PREMIUM OVERRIDE: /public/audio/voices/premium/ holds hand-dropped
//      mp3s (e.g. opening.mp3 / closing.mp3) recorded with the "slow"
//      voice the user prefers for the ceremonial opener and close.
//      premium/manifest.json maps exact spoken text → file. Loaded with
//      cache:'no-cache' because the user replaces these files manually.
//
//   1) HASH MANIFEST: /public/audio/voices/manifest.json with Qwen3-TTS
//      Alek pre-generated mp3s, keyed by sha hash of the text. These are
//      the per-phase briefings. Manifest is cache:'force-cache' because
//      content-addressed.
//
//   2) FALLBACK: native SpeechSynthesis, only if neither manifest has a
//      match (first deploy before generation, or an unseen line).
//
// All mp3 playback is routed through the shared AudioEngine AudioContext
// (decodeAudioData → AudioBufferSourceNode → voiceBus → master →
// destination). This is critical: HTMLAudioElement respects the iPhone
// physical silent-ringer switch while WebAudio does not, so the previous
// HTMLAudio path made the voice silently disappear on iPhones held in
// mute. Using WebAudio for voice too means the user hears both ambient
// and voice regardless of the ringer switch.
// ═══════════════════════════════════════════════════════

import type { AudioEngine } from './audioEngine';

export interface OperatorOptions {
  rate?: number;    // playbackRate for mp3 / rate for synth (default 1 / 0.92)
  pitch?: number;   // synth-only, 0 - 2 (default 0.85)
  volume?: number;  // 0 - 1 (default 1)
  duck?: boolean;   // duck AudioEngine ambient (default true)
}

interface HashManifest {
  voice?: string;
  lines: Record<string, { file: string }>;
}

interface PremiumManifest {
  lines: Record<string, { file: string }>;
}

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? '';
const HASH_MANIFEST_URL = `${BASE_PATH}/audio/voices/manifest.json`;
const HASH_VOICES_DIR = `${BASE_PATH}/audio/voices/`;
const PREMIUM_MANIFEST_URL = `${BASE_PATH}/audio/voices/premium/manifest.json`;
const PREMIUM_VOICES_DIR = `${BASE_PATH}/audio/voices/premium/`;

export class Operator {
  private voice: SpeechSynthesisVoice | null = null;
  private engine: AudioEngine | null;
  private enabled = true;
  private ready = false;
  private queuedReady?: () => void;

  // Manifests
  private hashManifest: HashManifest | null = null;
  private premiumManifest: PremiumManifest | null = null;

  // Decoded AudioBuffer cache, keyed by file URL.
  private bufferCache = new Map<string, AudioBuffer>();
  // In-flight decode promises keyed by URL, to dedupe concurrent loads.
  private bufferInFlight = new Map<string, Promise<AudioBuffer | null>>();

  // Current playing source, for cancellation.
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private currentResolve: (() => void) | null = null;

  constructor(engine?: AudioEngine) {
    this.engine = engine ?? null;
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      this.loadVoice();
      window.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoice());
    }
    this.loadManifests();
  }

  private async loadManifests() {
    // Hash manifest — immutable by content, can be cached hard.
    try {
      const res = await fetch(HASH_MANIFEST_URL, { cache: 'force-cache' });
      if (res.ok) this.hashManifest = (await res.json()) as HashManifest;
    } catch {
      /* no hash manifest — fallback to synth */
    }
    // Premium manifest — hand-maintained, freshness matters.
    try {
      const res = await fetch(PREMIUM_MANIFEST_URL, { cache: 'no-cache' });
      if (res.ok) this.premiumManifest = (await res.json()) as PremiumManifest;
    } catch {
      /* no premium manifest — fine, optional */
    }
  }

  /**
   * iOS Safari requires the first audio activity to happen inside a user
   * gesture. Called from the INICIAR click. Resumes the shared AudioContext
   * and primes SpeechSynthesis for the tier-2 fallback.
   */
  unlockForIOS() {
    // Resume the shared AudioContext (used for voice too now).
    void this.engine?.resume();

    // Prime SpeechSynthesis in case we need the fallback later.
    if (this.isSynthAvailable()) {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
        this.loadVoice();
      } catch {
        /* ignore */
      }
    }
  }

  private loadVoice() {
    if (!this.isSynthAvailable()) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
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
    this.voice = voices[0];
    this.ready = true;
    this.queuedReady?.();
  }

  private isSynthAvailable(): boolean {
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
   * Queue a line. Returns a promise resolved when playback ends or is
   * cancelled. Resolution order:
   *   1. premium manifest match → premium mp3 via WebAudio
   *   2. hash manifest match → hash mp3 via WebAudio
   *   3. SpeechSynthesis fallback
   */
  speak(text: string, opts: OperatorOptions = {}): Promise<void> {
    if (!this.enabled || !text) return Promise.resolve();
    if (typeof window === 'undefined') return Promise.resolve();

    // Always cancel in-flight speech so we never overlap voices.
    this.cancel();

    // Tier 0: premium override
    const premium = this.premiumManifest?.lines?.[text];
    if (premium) {
      return this.playMp3(`${PREMIUM_VOICES_DIR}${premium.file}`, opts, text);
    }
    // Tier 1: hash manifest
    const hash = this.hashManifest?.lines?.[text];
    if (hash) {
      return this.playMp3(`${HASH_VOICES_DIR}${hash.file}`, opts, text);
    }
    // Tier 2: speechSynthesis fallback
    return this.speakViaSynth(text, opts);
  }

  // ─── WebAudio mp3 playback ────────────────────────────

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;
    const inFlight = this.bufferInFlight.get(url);
    if (inFlight) return inFlight;
    const ctx = this.engine?.getContext();
    if (!ctx) return null;

    const p = (async () => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        this.bufferCache.set(url, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.bufferInFlight.delete(url);
      }
    })();
    this.bufferInFlight.set(url, p);
    return p;
  }

  private async playMp3(
    url: string,
    opts: OperatorOptions,
    textForFallback: string,
  ): Promise<void> {
    const ctx = this.engine?.getContext();
    const bus = this.engine?.getVoiceBus();
    if (!ctx || !bus) {
      // AudioEngine not initialised yet (e.g. speak before INICIAR).
      // Fall back to synth so the user still hears something.
      return this.speakViaSynth(textForFallback, opts);
    }

    // iOS: ensure context is running before scheduling playback.
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

    const buf = await this.loadBuffer(url);
    if (!buf) {
      // Network / decode failure. Fall through to synth so the user still
      // gets some audio feedback.
      return this.speakViaSynth(textForFallback, opts);
    }

    const duck = opts.duck ?? true;
    const volume = Math.max(0, Math.min(1, opts.volume ?? 1));

    if (duck) this.engine?.duckForVoice(0.32, 0.2);

    return new Promise<void>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;

      const gain = ctx.createGain();
      gain.gain.value = volume;

      src.connect(gain).connect(bus);

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { src.disconnect(); } catch { /* ignore */ }
        try { gain.disconnect(); } catch { /* ignore */ }
        if (this.currentSource === src) {
          this.currentSource = null;
          this.currentGain = null;
          this.currentResolve = null;
        }
        if (duck) this.engine?.unduck(0.6);
        resolve();
      };
      src.onended = finish;

      this.currentSource = src;
      this.currentGain = gain;
      this.currentResolve = finish;

      try {
        src.start();
      } catch {
        finish();
      }
    });
  }

  private stopCurrentAudio() {
    if (this.currentSource) {
      try { this.currentSource.onended = null; } catch { /* ignore */ }
      try { this.currentSource.stop(); } catch { /* ignore */ }
      try { this.currentSource.disconnect(); } catch { /* ignore */ }
    }
    if (this.currentGain) {
      try { this.currentGain.disconnect(); } catch { /* ignore */ }
    }
    const resolver = this.currentResolve;
    this.currentSource = null;
    this.currentGain = null;
    this.currentResolve = null;
    // Resolve the outstanding speak() promise so awaiters don't hang.
    resolver?.();
  }

  // ─── Tier 2: SpeechSynthesis ──────────────────────────

  private speakViaSynth(text: string, opts: OperatorOptions): Promise<void> {
    if (!this.isSynthAvailable()) return Promise.resolve();
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
    if (this.isSynthAvailable()) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    if (this.engine) this.engine.unduck(0.3);
  }
}
