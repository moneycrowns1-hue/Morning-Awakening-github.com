// ═══════════════════════════════════════════════════════
// alarmEngine.ts · stem-based gentle alarm (v2)
//
// v1 was pure Web Audio synthesis (drone + arp + bells).
// v2 replaces that with real mp3 stems mixed cinematically:
//
//   ramp       Tycho · Sunrise Projector (loop), fades from
//              0 to peakVolume over rampDurationSec.
//   peak       ramp stays at peakVolume; a coach voice
//              ("voz con propósito") speaks on top while the
//              music ducks to ~30 %. Restores when voice ends.
//   reaseguro  Hans Zimmer · Time (loop) fades up to 1.0 while
//              the ramp stem fades out. Only triggers if the
//              user hasn't dismissed within reaseguroDelaySec.
//   wakeup    "musica principal.mp3" plays once (voice + music
//              already mixed). Triggered explicitly by
//              playWakeup() when the user dismisses — this is
//              the "orden del día" moment before the protocol.
//
// Everything routes through HTMLAudioElement → WebAudio
// MediaElementSource → per-stem GainNode → destination. This
// keeps iOS happy (it classifies <audio> playback as active
// media) while still giving us smooth AudioParam ramps.
// ═══════════════════════════════════════════════════════

export type AlarmStage = 'idle' | 'ramp' | 'peak' | 'reaseguro' | 'wakeup';

/** URLs for the five stems. All three music stems + voz-proposito are required;
 *  wake-up is the "musica principal.mp3" that already contains the voice. */
export interface StemPaths {
  ramp: string;
  reaseguro: string;
  wakeup: string;
  /** Optional premium mp3 for the coach voice. If missing or 404, we fall
   *  back to speechSynthesis with `coachText`. */
  coachVoice?: string;
}

export interface AlarmCallbacks {
  onStageChange?: (stage: AlarmStage) => void;
  /** 0..1, the "intensity" bar driver (music volume relative to peak). */
  onProgress?: (volume: number, stage: AlarmStage) => void;
}

export interface AlarmStartOptions {
  /** Seconds of gentle ramp before the peak. */
  rampDurationSec: number;
  /** Seconds to wait at peak before firing reaseguro (0 = disabled). */
  reaseguroDelaySec: number;
  /** Peak master volume 0..1 (default 0.8). */
  peakVolume?: number;
  /** If > 0, start partway through the ramp (used when the user opens
   *  the app after the pre-alarm time has already begun). */
  startOffsetSec?: number;
  /** Text for the voz-con-propósito. Read via speechSynthesis if no
   *  coachVoice mp3 is configured (or if that mp3 404s). */
  coachText?: string;
}

/** How much music ducks while the coach voice is speaking. */
const DUCK_RATIO = 0.28;
/** Length of the reaseguro crossfade. */
const REASEGURO_XFADE_SEC = 8;
/** Length of the wake-up fade-out for active stems. */
const WAKEUP_FADE_SEC = 1.5;

interface Stem {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

export class AlarmEngine {
  private ctx: AudioContext | null = null;
  private ramp: Stem | null = null;
  private reaseguro: Stem | null = null;
  private wakeup: Stem | null = null;

  private stage: AlarmStage = 'idle';
  private cb: AlarmCallbacks;
  private stems: StemPaths;

  private timers: number[] = [];
  private progressTimer: number | null = null;
  private peakVolume = 0.8;
  private coachText: string | undefined;
  private coachAudio: HTMLAudioElement | null = null;
  private coachSpeaking = false;

  constructor(stems: StemPaths, callbacks: AlarmCallbacks = {}) {
    this.stems = stems;
    this.cb = callbacks;
  }

  // ─────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────

  isRunning(): boolean {
    return this.stage !== 'idle';
  }

  getStage(): AlarmStage {
    return this.stage;
  }

  async start(opts: AlarmStartOptions): Promise<void> {
    if (this.stage !== 'idle') this.stop();

    const rampSec = Math.max(5, opts.rampDurationSec);
    const reaseguroSec = Math.max(0, opts.reaseguroDelaySec);
    const peak = opts.peakVolume ?? 0.8;
    const offset = Math.max(0, Math.min(rampSec, opts.startOffsetSec ?? 0));
    this.peakVolume = peak;
    this.coachText = opts.coachText;

    await this.ensureCtx();

    // Build the ramp stem and start it.
    this.ramp = this.makeStem(this.stems.ramp, true);
    const now = this.ctx!.currentTime;
    const startVol = Math.max(0.0001, (offset / rampSec) * peak);
    this.ramp.gain.gain.setValueAtTime(startVol, now);
    // Seek into the track so the Tycho intro doesn't always start from 0.
    try { this.ramp.el.currentTime = Math.min(15, this.ramp.el.duration || 15); } catch { /* ignore */ }
    try { await this.ramp.el.play(); } catch (err) { console.warn('[AlarmEngine] ramp play failed', err); }

    const remaining = rampSec - offset;
    this.ramp.gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, peak),
      now + Math.max(0.05, remaining),
    );

    this.stage = 'ramp';
    this.cb.onStageChange?.('ramp');

    // Peak transition.
    this.timers.push(window.setTimeout(() => this.enterPeak(), remaining * 1000));

    // Reaseguro (optional).
    if (reaseguroSec > 0) {
      this.timers.push(window.setTimeout(
        () => this.enterReaseguro(),
        (remaining + reaseguroSec) * 1000,
      ));
    }

    // Progress ticker (music gain → 0..1 normalized against peak).
    this.progressTimer = window.setInterval(() => this.emitProgress(), 250);
  }

  /**
   * Stop ramp/peak/reaseguro and play the wake-up stem once. Calls
   * `onComplete` when the wake-up ends (or on error so the protocol
   * still starts).
   */
  async playWakeup(onComplete: () => void): Promise<void> {
    try {
      await this.ensureCtx();
      this.clearTimers();
      this.cancelCoach();

      // Fade out ramp + reaseguro.
      const ctx = this.ctx!;
      const t = ctx.currentTime;
      for (const s of [this.ramp, this.reaseguro]) {
        if (!s) continue;
        try {
          s.gain.gain.cancelScheduledValues(t);
          s.gain.gain.setValueAtTime(Math.max(0.0001, s.gain.gain.value), t);
          s.gain.gain.exponentialRampToValueAtTime(0.0001, t + WAKEUP_FADE_SEC);
        } catch { /* ignore */ }
      }
      await new Promise<void>((r) => window.setTimeout(r, WAKEUP_FADE_SEC * 1000));
      try { this.ramp?.el.pause(); } catch { /* ignore */ }
      try { this.reaseguro?.el.pause(); } catch { /* ignore */ }

      this.stage = 'wakeup';
      this.cb.onStageChange?.('wakeup');
      this.cb.onProgress?.(1, 'wakeup');

      this.wakeup = this.makeStem(this.stems.wakeup, false);
      this.wakeup.gain.gain.setValueAtTime(1, this.ctx!.currentTime);
      const wk = this.wakeup;
      wk.el.onended = () => {
        onComplete();
      };
      try {
        await wk.el.play();
      } catch (err) {
        console.warn('[AlarmEngine] wakeup play failed', err);
        onComplete();
      }
    } catch (err) {
      console.error('[AlarmEngine] playWakeup error', err);
      onComplete();
    }
  }

  stop(): void {
    this.clearTimers();
    this.cancelCoach();

    const ctx = this.ctx;
    if (ctx) {
      const t = ctx.currentTime;
      for (const s of [this.ramp, this.reaseguro, this.wakeup]) {
        if (!s) continue;
        try {
          s.gain.gain.cancelScheduledValues(t);
          s.gain.gain.setValueAtTime(Math.max(0.0001, s.gain.gain.value), t);
          s.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        } catch { /* ignore */ }
      }
      window.setTimeout(() => this.teardown(), 900);
    } else {
      this.teardown();
    }

    this.stage = 'idle';
    this.cb.onStageChange?.('idle');
  }

  /** ~6s preview of the ramp stem near peak volume. */
  async preview(durationSec = 6, previewVol = 0.6): Promise<void> {
    try {
      await this.ensureCtx();
      const stem = this.makeStem(this.stems.ramp, false);
      const ctx = this.ctx!;
      const t = ctx.currentTime;
      stem.gain.gain.setValueAtTime(0.0001, t);
      stem.gain.gain.exponentialRampToValueAtTime(previewVol, t + durationSec / 2);
      try { stem.el.currentTime = 30; } catch { /* ignore */ }
      try { await stem.el.play(); } catch { /* ignore */ }
      await new Promise((r) => window.setTimeout(r, durationSec * 1000));
      const t2 = ctx.currentTime;
      stem.gain.gain.cancelScheduledValues(t2);
      stem.gain.gain.setValueAtTime(Math.max(0.0001, stem.gain.gain.value), t2);
      stem.gain.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.8);
      await new Promise((r) => window.setTimeout(r, 900));
      try { stem.el.pause(); stem.el.src = ''; } catch { /* ignore */ }
      try { stem.source.disconnect(); stem.gain.disconnect(); } catch { /* ignore */ }
    } catch (err) {
      console.error('[AlarmEngine] preview failed', err);
    }
  }

  // ─────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────

  private async ensureCtx(): Promise<AudioContext> {
    if (!this.ctx) {
      const AC = (window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    return this.ctx;
  }

  private makeStem(url: string, loop: boolean): Stem {
    const ctx = this.ctx!;
    // encode spaces / accents in filenames so the browser fetches them.
    const el = new Audio(encodeURI(url));
    el.loop = loop;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(ctx.destination);
    return { el, source, gain };
  }

  private enterPeak(): void {
    if (this.stage === 'idle') return;
    this.stage = 'peak';
    this.cb.onStageChange?.('peak');
    // Give the music ~2s at peak before the coach starts talking.
    this.timers.push(window.setTimeout(() => this.playCoach(), 2000));
  }

  private enterReaseguro(): void {
    if (this.stage === 'idle' || !this.ctx) return;
    this.stage = 'reaseguro';
    this.cb.onStageChange?.('reaseguro');

    // Cancel coach if it's still speaking when reaseguro hits.
    this.cancelCoach();

    this.reaseguro = this.makeStem(this.stems.reaseguro, true);
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.reaseguro.gain.gain.setValueAtTime(0.0001, t);
    this.reaseguro.gain.gain.exponentialRampToValueAtTime(1.0, t + REASEGURO_XFADE_SEC);
    try { this.reaseguro.el.play().catch(() => {}); } catch { /* ignore */ }

    if (this.ramp) {
      try {
        this.ramp.gain.gain.cancelScheduledValues(t);
        this.ramp.gain.gain.setValueAtTime(Math.max(0.0001, this.ramp.gain.gain.value), t);
        this.ramp.gain.gain.exponentialRampToValueAtTime(0.0001, t + REASEGURO_XFADE_SEC);
      } catch { /* ignore */ }
      this.timers.push(window.setTimeout(() => {
        try { this.ramp?.el.pause(); } catch { /* ignore */ }
      }, REASEGURO_XFADE_SEC * 1000));
    }
  }

  /** Ducks the music and plays the coach voice. Tries premium mp3 first,
   *  then speechSynthesis. Restores music volume when done. */
  private playCoach(): void {
    if (this.stage === 'idle') return;
    if (!this.coachText && !this.stems.coachVoice) return;

    this.duckMusic(true);
    const restore = () => { this.coachSpeaking = false; this.duckMusic(false); };
    this.coachSpeaking = true;

    if (this.stems.coachVoice) {
      this.tryCoachMp3(this.stems.coachVoice, restore);
    } else if (this.coachText) {
      this.speakCoach(this.coachText, restore);
    } else {
      restore();
    }
  }

  private async tryCoachMp3(url: string, onDone: () => void): Promise<void> {
    try {
      const ctx = await this.ensureCtx();
      // Probe with HEAD first so a 404 falls back to TTS cleanly.
      const probe = await fetch(encodeURI(url), { method: 'HEAD' });
      if (!probe.ok) throw new Error(`coach mp3 HTTP ${probe.status}`);
      const el = new Audio(encodeURI(url));
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      this.coachAudio = el;
      const source = ctx.createMediaElementSource(el);
      const g = ctx.createGain();
      g.gain.value = 1;
      source.connect(g).connect(ctx.destination);
      el.onended = () => { onDone(); };
      el.onerror = () => { onDone(); };
      await el.play();
    } catch (err) {
      console.warn('[AlarmEngine] coach mp3 unavailable, using TTS', err);
      if (this.coachText) this.speakCoach(this.coachText, onDone);
      else onDone();
    }
  }

  private speakCoach(text: string, onDone: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 0.9;
    u.pitch = 1.02;
    u.volume = 1.0;
    try {
      const voices = window.speechSynthesis.getVoices();
      const prefer = voices.find((v) => v.lang.startsWith('es') && /female|monica|paulina|helena|lupe/i.test(v.name))
        ?? voices.find((v) => v.lang.startsWith('es'));
      if (prefer) u.voice = prefer;
    } catch { /* ignore */ }
    u.onend = () => onDone();
    u.onerror = () => onDone();
    try { window.speechSynthesis.speak(u); }
    catch { onDone(); }
  }

  private cancelCoach(): void {
    if (this.coachSpeaking) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      try { this.coachAudio?.pause(); } catch { /* ignore */ }
      this.coachAudio = null;
      this.coachSpeaking = false;
      // Restore music volume without waiting for onend.
      this.duckMusic(false);
    }
  }

  private duckMusic(ducking: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = ducking ? this.peakVolume * DUCK_RATIO : this.peakVolume;

    const apply = (stem: Stem | null, base: number) => {
      if (!stem) return;
      const tgt = ducking ? base * DUCK_RATIO : base;
      try {
        stem.gain.gain.cancelScheduledValues(t);
        stem.gain.gain.setValueAtTime(Math.max(0.0001, stem.gain.gain.value), t);
        stem.gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, tgt),
          t + (ducking ? 0.8 : 1.2),
        );
      } catch { /* ignore */ }
    };
    apply(this.ramp, this.peakVolume);
    apply(this.reaseguro, 1.0);
    // Avoid unused-var for `target` — kept for readability.
    void target;
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
  }

  private teardown(): void {
    const disconnect = (s: Stem | null) => {
      if (!s) return;
      try { s.el.pause(); s.el.src = ''; } catch { /* ignore */ }
      try { s.source.disconnect(); s.gain.disconnect(); } catch { /* ignore */ }
    };
    disconnect(this.ramp);
    disconnect(this.reaseguro);
    disconnect(this.wakeup);
    this.ramp = null;
    this.reaseguro = null;
    this.wakeup = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) {
      ctx.close().catch(() => { /* ignore */ });
    }
  }

  private emitProgress(): void {
    if (this.stage === 'idle') return;
    let v = 0;
    if (this.stage === 'reaseguro' && this.reaseguro) {
      v = this.reaseguro.gain.gain.value;
    } else if (this.ramp) {
      v = this.ramp.gain.gain.value / Math.max(0.01, this.peakVolume);
    }
    this.cb.onProgress?.(Math.min(1, Math.max(0, v)), this.stage);
  }
}

// ─────────────────────────────────────────────────────
// Shared constants / defaults used across UI + engine.
// ─────────────────────────────────────────────────────

/** Paths relative to /public. Kept here so AlarmScreen / controller
 *  can preload-ping them and surface missing-file warnings. Spaces
 *  and dots are encoded at fetch time inside the engine. */
export const DEFAULT_STEMS: StemPaths = {
  ramp: '/audio/voices/premium/SpotiDown.App - Sunrise Projector - Tycho.mp3',
  reaseguro: '/audio/voices/premium/SpotiDown.App - Time - Hans Zimmer.mp3',
  wakeup: '/audio/voices/premium/musica principal.mp3',
  coachVoice: '/audio/voices/premium/voz-proposito.mp3',
};

/** Voz con propósito — read via speechSynthesis until voz-proposito.mp3
 *  lands in public/audio/voices/premium/. The text is phrased as a coach
 *  speaking to the user, not as a narrator. */
export const DEFAULT_COACH_TEXT =
  'Al despertar es reclamar los cinco minutos de tu día antes de pensar o volver a dormir. ' +
  'Hoy elijo ser el arquitecto de mi experiencia. ' +
  'Mi mente es poderosa, mi enfoque es claro. ' +
  'Cada desafío que enfrente es una oportunidad de crecer y demostrar mi fortaleza interior.';
