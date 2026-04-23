// ═══════════════════════════════════════════════════════
// alarmEngine.ts · Web Audio "gentle alarm" engine.
//
// Two-stage alarm inspired by WonderWake:
//
//   Stage A · RAMP (minutes before target)
//     A warm pad drone + slow arpeggio in a major pentatonic.
//     Volume ramps exponentially from 0 to target over
//     `rampDurationSec`. Peaks at the configured alarm time.
//
//   Stage B · REASEGURO (minutes after target, optional)
//     Launches if the user hasn't dismissed within
//     `reaseguroDelaySec`. Adds a slightly brighter bell
//     motif and a gentle swell on top of the base drone so
//     it's unmistakably an alarm without being abrasive.
//
// Pure Web Audio — no sample files needed. Works in any
// modern browser. The host page is responsible for keeping
// the AudioContext alive (silentKeepalive.ts) and the screen
// on (Wake Lock API) while the alarm is active.
// ═══════════════════════════════════════════════════════

export type AlarmStage = 'idle' | 'ramp' | 'peak' | 'reaseguro';

export interface AlarmCallbacks {
  onStageChange?: (stage: AlarmStage) => void;
  onProgress?: (volume: number, stage: AlarmStage) => void;
}

export interface AlarmStartOptions {
  /** Seconds of gentle ramp before the peak (default 300 = 5 min). */
  rampDurationSec: number;
  /** Seconds to wait at peak before firing reaseguro (0 = disabled). */
  reaseguroDelaySec: number;
  /** Peak master volume 0..1 (default 0.7). */
  peakVolume?: number;
  /** If > 0, start partway through the ramp (used when the user
   *  opens the app after the pre-alarm time has already begun). */
  startOffsetSec?: number;
}

// Major-pentatonic motif in A (A C# E F# A) — warm, consonant,
// never dissonant no matter which notes overlap.
const BASE_FREQS_HZ = [220.0, 277.18, 329.63, 369.99, 440.0];
const BELL_FREQS_HZ = [523.25, 659.25, 783.99]; // C5 E5 G5

export class AlarmEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneNodes: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private bellGain: GainNode | null = null;

  private rampTimer: number | null = null;
  private reaseguroTimer: number | null = null;
  private arpTimer: number | null = null;
  private bellTimer: number | null = null;
  private progressTimer: number | null = null;

  private stage: AlarmStage = 'idle';
  private cb: AlarmCallbacks = {};

  private startedAt = 0;
  private peakAt = 0;
  private reaseguroAt = 0;
  private peakVolume = 0.7;

  constructor(callbacks: AlarmCallbacks = {}) {
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

  /**
   * Starts the ramp. Must be called from a user gesture on iOS
   * or the AudioContext won't start.
   */
  async start(opts: AlarmStartOptions): Promise<void> {
    if (this.stage !== 'idle') this.stop();

    const rampSec = Math.max(5, opts.rampDurationSec);
    const reaseguroSec = Math.max(0, opts.reaseguroDelaySec);
    const peak = opts.peakVolume ?? 0.7;
    const offset = Math.max(0, Math.min(rampSec, opts.startOffsetSec ?? 0));

    this.peakVolume = peak;

    const AudioCtx =
      typeof window !== 'undefined' &&
      ((window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error('AudioContext unavailable');

    this.ctx = new AudioCtx();
    try { await this.ctx.resume(); } catch { /* ignore */ }
    const now = this.ctx.currentTime;

    // Master gain controls the overall alarm volume.
    this.master = this.ctx.createGain();
    this.master.gain.setValueAtTime(0, now);
    this.master.connect(this.ctx.destination);

    // ── Drone: three detuned sines + low sub ───────────
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.35;
    this.droneGain.connect(this.master);

    const droneFreqs = [110, 110.3, 165]; // A2 + detuned + E3
    for (const f of droneFreqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      // Slow LFO vibrato for warmth.
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.18 + Math.random() * 0.1;
      lfoGain.gain.value = f * 0.0035;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      osc.connect(this.droneGain);
      osc.start(now);
      this.droneNodes.push(osc, lfo);
    }

    // ── Arpeggio bus (triggered periodically) ──────────
    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.22;
    this.arpGain.connect(this.master);

    // ── Bell bus (only during reaseguro) ───────────────
    this.bellGain = this.ctx.createGain();
    this.bellGain.gain.value = 0;
    this.bellGain.connect(this.master);

    // ── Exponential ramp to peak ───────────────────────
    const remaining = rampSec - offset;
    const startVol = Math.max(0.001, (offset / rampSec) * peak);
    this.master.gain.setValueAtTime(startVol, now);
    // Exponential feels more natural (perception is log-scaled).
    this.master.gain.exponentialRampToValueAtTime(peak, now + remaining);

    this.stage = 'ramp';
    this.startedAt = Date.now();
    this.peakAt = this.startedAt + remaining * 1000;
    this.reaseguroAt = reaseguroSec > 0 ? this.peakAt + reaseguroSec * 1000 : 0;

    this.cb.onStageChange?.('ramp');

    // Start the arpeggio once the ramp is meaningfully audible.
    this.scheduleArpeggio();

    // Schedule the peak transition.
    this.rampTimer = window.setTimeout(() => this.enterPeak(), remaining * 1000);

    // Progress ticker for the UI.
    this.progressTimer = window.setInterval(() => this.emitProgress(), 250);
  }

  /**
   * Stop the alarm and tear down the AudioContext.
   * Used both for "dismiss" and "snooze" paths.
   */
  stop(): void {
    if (this.rampTimer) { clearTimeout(this.rampTimer); this.rampTimer = null; }
    if (this.reaseguroTimer) { clearTimeout(this.reaseguroTimer); this.reaseguroTimer = null; }
    if (this.arpTimer) { clearTimeout(this.arpTimer); this.arpTimer = null; }
    if (this.bellTimer) { clearTimeout(this.bellTimer); this.bellTimer = null; }
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }

    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      const now = ctx.currentTime;
      // Fade out over 0.8s to avoid a pop.
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      } catch { /* ignore */ }
      window.setTimeout(() => {
        try {
          for (const n of this.droneNodes) {
            try { n.stop(); } catch { /* already stopped */ }
            try { n.disconnect(); } catch { /* ignore */ }
          }
          this.droneNodes = [];
          ctx.close().catch(() => { /* ignore */ });
        } catch { /* ignore */ }
      }, 900);
    }

    this.ctx = null;
    this.master = null;
    this.droneGain = null;
    this.arpGain = null;
    this.bellGain = null;
    this.stage = 'idle';
    this.cb.onStageChange?.('idle');
  }

  /**
   * Preview: plays ~6 seconds of the ramp starting near the peak
   * so the user can audition the tone without waiting.
   */
  async preview(durationSec = 6, peakVolume = 0.55): Promise<void> {
    await this.start({
      rampDurationSec: Math.max(12, durationSec + 4),
      reaseguroDelaySec: 0,
      peakVolume,
      startOffsetSec: Math.max(12, durationSec + 4) - 2,
    });
    window.setTimeout(() => this.stop(), durationSec * 1000);
  }

  // ─────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────

  private enterPeak(): void {
    if (!this.ctx || !this.master) return;
    this.stage = 'peak';
    this.cb.onStageChange?.('peak');
    if (this.reaseguroAt > 0) {
      const wait = Math.max(0, this.reaseguroAt - Date.now());
      this.reaseguroTimer = window.setTimeout(() => this.enterReaseguro(), wait);
    }
  }

  private enterReaseguro(): void {
    if (!this.ctx || !this.master || !this.bellGain) return;
    this.stage = 'reaseguro';
    this.cb.onStageChange?.('reaseguro');

    const now = this.ctx.currentTime;
    // Gentle swell of the master to +25% and bring in the bell bus.
    try {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.exponentialRampToValueAtTime(
        Math.min(1, this.peakVolume * 1.25),
        now + 8,
      );
    } catch { /* ignore */ }
    this.bellGain.gain.setValueAtTime(0, now);
    this.bellGain.gain.exponentialRampToValueAtTime(0.28, now + 6);

    this.scheduleBells();
  }

  private scheduleArpeggio(): void {
    const step = () => {
      if (!this.ctx || !this.arpGain || this.stage === 'idle') return;
      const now = this.ctx.currentTime;
      const f = BASE_FREQS_HZ[Math.floor(Math.random() * BASE_FREQS_HZ.length)];
      this.pluck(this.arpGain, f, now, 2.4);
      // Tempo slows at first then speeds slightly toward peak.
      const intervalMs = this.stage === 'ramp' ? 1800 : 1200;
      this.arpTimer = window.setTimeout(step, intervalMs + Math.random() * 400);
    };
    step();
  }

  private scheduleBells(): void {
    const step = () => {
      if (!this.ctx || !this.bellGain || this.stage !== 'reaseguro') return;
      const now = this.ctx.currentTime;
      // Two-note chime.
      const f1 = BELL_FREQS_HZ[Math.floor(Math.random() * BELL_FREQS_HZ.length)];
      const f2 = BELL_FREQS_HZ[Math.floor(Math.random() * BELL_FREQS_HZ.length)];
      this.pluck(this.bellGain, f1, now, 3.2, 'triangle');
      this.pluck(this.bellGain, f2, now + 0.35, 3.2, 'triangle');
      this.bellTimer = window.setTimeout(step, 2200 + Math.random() * 600);
    };
    step();
  }

  private pluck(
    bus: GainNode,
    freq: number,
    startAt: number,
    decaySec: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, startAt);
    env.gain.linearRampToValueAtTime(1, startAt + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, startAt + decaySec);
    osc.connect(env);
    env.connect(bus);
    osc.start(startAt);
    osc.stop(startAt + decaySec + 0.1);
  }

  private emitProgress(): void {
    if (!this.master || this.stage === 'idle') return;
    try {
      const v = this.master.gain.value;
      this.cb.onProgress?.(v, this.stage);
    } catch { /* ignore */ }
  }
}
