// ═══════════════════════════════════════════════════════
// AudioEngine v2 — Dōjō Operator
// 3 biological layers (ignition / bridge / cognitive) with
// crossfade, convolver reverb (generated IR), and marcial SFX.
// 100% Web Audio — zero external files. Works offline.
// ═══════════════════════════════════════════════════════

import type { AudioLayer } from './constants';

type Nullable<T> = T | null;

interface LayerBus {
  input: GainNode;
  output: GainNode;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
  running: boolean;
}

export class AudioEngine {
  private ctx: Nullable<AudioContext> = null;
  private master: Nullable<GainNode> = null;
  private convolver: Nullable<ConvolverNode> = null;
  private wetGain: Nullable<GainNode> = null;
  private dryGain: Nullable<GainNode> = null;
  private layers = new Map<AudioLayer, LayerBus>();
  private currentLayer: Nullable<AudioLayer> = null;
  private voiceDuckGain: Nullable<GainNode> = null;

  // Volumes (0-1)
  private masterVolume = 0.6;
  private sfxVolume = 0.5;

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();

    // Master chain: [all sources] → voiceDuckGain → master → destination
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(this.ctx.destination);

    this.voiceDuckGain = this.ctx.createGain();
    this.voiceDuckGain.gain.value = 1;
    this.voiceDuckGain.connect(this.master);

    // Reverb bus
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.generateImpulseResponse(3.4, 2.2);
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0.35;
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0;

    this.convolver.connect(this.wetGain).connect(this.voiceDuckGain);
    this.dryGain.connect(this.voiceDuckGain);
  }

  // ════════════ Impulse Response (decaying noise) ════════════
  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const length = Math.floor(rate * duration);
    const buffer = this.ctx!.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // pink-ish noise with exponential decay + slight early reflections
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buffer;
  }

  // ════════════ Public API ════════════

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(this.masterVolume, this.ctx.currentTime + 0.3);
    }
  }

  /** Starts the first layer and the master chain. */
  startAmbient(layer: AudioLayer = 'ignition') {
    if (!this.ctx) return;
    void this.ctx.resume();
    this.switchLayer(layer, 2.5);
  }

  /** Crossfade to a new layer over `fadeSec`. */
  switchLayer(target: AudioLayer, fadeSec = 4) {
    if (!this.ctx) return;
    if (target === this.currentLayer) return;

    // Build target layer if not alive yet
    let next = this.layers.get(target);
    if (!next || !next.running) {
      next = this.buildLayer(target);
      this.layers.set(target, next);
    }

    const now = this.ctx.currentTime;

    // Fade in target
    next.output.gain.cancelScheduledValues(now);
    next.output.gain.setValueAtTime(next.output.gain.value, now);
    next.output.gain.linearRampToValueAtTime(1, now + fadeSec);

    // Fade out previous
    if (this.currentLayer) {
      const prev = this.layers.get(this.currentLayer);
      if (prev) {
        prev.output.gain.cancelScheduledValues(now);
        prev.output.gain.setValueAtTime(prev.output.gain.value, now);
        prev.output.gain.linearRampToValueAtTime(0, now + fadeSec);
        // Stop prev sources shortly after fadeout
        const prevRef = prev;
        setTimeout(() => this.stopLayer(prevRef), (fadeSec + 0.4) * 1000);
      }
    }

    this.currentLayer = target;
  }

  /** Temporary volume duck for voice overlay. */
  duckForVoice(factor = 0.35, attack = 0.25) {
    if (!this.ctx || !this.voiceDuckGain) return;
    const t = this.ctx.currentTime;
    this.voiceDuckGain.gain.cancelScheduledValues(t);
    this.voiceDuckGain.gain.setValueAtTime(this.voiceDuckGain.gain.value, t);
    this.voiceDuckGain.gain.linearRampToValueAtTime(factor, t + attack);
  }

  /** Restore duck after voice ends. */
  unduck(release = 0.6) {
    if (!this.ctx || !this.voiceDuckGain) return;
    const t = this.ctx.currentTime;
    this.voiceDuckGain.gain.cancelScheduledValues(t);
    this.voiceDuckGain.gain.setValueAtTime(this.voiceDuckGain.gain.value, t);
    this.voiceDuckGain.gain.linearRampToValueAtTime(1, t + release);
  }

  stopAll() {
    for (const [, layer] of this.layers) this.stopLayer(layer);
    this.layers.clear();
    this.currentLayer = null;
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.linearRampToValueAtTime(0, t + 1.2);
    }
  }

  dispose() {
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private stopLayer(layer: LayerBus) {
    if (!layer.running) return;
    layer.running = false;
    for (const s of layer.sources) {
      try { s.stop(); } catch { /* already stopped */ }
    }
    layer.sources = [];
    try { layer.input.disconnect(); } catch { /* ignore */ }
    try { layer.output.disconnect(); } catch { /* ignore */ }
  }

  // ════════════ Layer factories ════════════

  private buildLayer(layer: AudioLayer): LayerBus {
    const bus = this.createBus();
    if (layer === 'ignition') this.fillIgnition(bus);
    else if (layer === 'bridge') this.fillBridge(bus);
    else this.fillCognitive(bus);
    return bus;
  }

  private createBus(): LayerBus {
    const input = this.ctx!.createGain();
    const output = this.ctx!.createGain();
    output.gain.value = 0; // fade in from 0
    input.connect(output);
    // split to dry + wet
    output.connect(this.dryGain!);
    output.connect(this.convolver!);
    return { input, output, nodes: [], sources: [], running: true };
  }

  private osc(freq: number, type: OscillatorType, destGain: number, bus: LayerBus, detune = 0): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = this.ctx!.createGain();
    g.gain.value = destGain;
    o.connect(g).connect(bus.input);
    o.start();
    bus.sources.push(o);
    bus.nodes.push(g);
    return o;
  }

  /** Low-frequency oscillator modulating a target AudioParam. */
  private lfo(rate: number, depth: number, target: AudioParam, bus: LayerBus) {
    const o = this.ctx!.createOscillator();
    o.type = 'sine';
    o.frequency.value = rate;
    const g = this.ctx!.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    bus.sources.push(o);
    bus.nodes.push(g);
  }

  private noise(bus: LayerBus, gainVal: number, filter?: { type: BiquadFilterType; freq: number; q?: number }): AudioBufferSourceNode {
    const buf = this.ctx!.createBuffer(1, this.ctx!.sampleRate * 2, this.ctx!.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const g = this.ctx!.createGain();
    g.gain.value = gainVal;

    if (filter) {
      const f = this.ctx!.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.freq;
      if (filter.q !== undefined) f.Q.value = filter.q;
      src.connect(f).connect(g).connect(bus.input);
      bus.nodes.push(f);
    } else {
      src.connect(g).connect(bus.input);
    }

    src.start();
    bus.sources.push(src);
    bus.nodes.push(g);
    return src;
  }

  // ── Layer 1: IGNITION (ignición — fuerza, cardio) ──
  private fillIgnition(bus: LayerBus) {
    // Sub-bass drone, D1 = 36.7Hz, plus 2nd harmonic
    this.osc(36.7, 'sine', 0.3, bus);
    this.osc(73.4, 'sine', 0.12, bus);
    // Mid tension, Dm root + slight detune
    this.osc(146.83, 'triangle', 0.06, bus, -5);
    this.osc(146.83, 'triangle', 0.05, bus, +5);

    // Rhythmic pulse via LFO on a dedicated gain
    const pulseGain = this.ctx!.createGain();
    pulseGain.gain.value = 0;
    pulseGain.connect(bus.input);
    bus.nodes.push(pulseGain);

    // Kick-like: low-passed noise burst loop via LFO (~80 BPM → 1.33Hz)
    this.noise(bus, 0.08, { type: 'lowpass', freq: 160, q: 1.2 });
    // LFO modulating noise amplitude
    const subPulse = this.ctx!.createOscillator();
    subPulse.type = 'square';
    subPulse.frequency.value = 1.33;
    const subPulseGain = this.ctx!.createGain();
    subPulseGain.gain.value = 0.18;
    subPulse.connect(subPulseGain).connect(pulseGain.gain);
    subPulse.start();
    bus.sources.push(subPulse);
    bus.nodes.push(subPulseGain);
  }

  // ── Layer 2: BRIDGE (puente — respiración, meditación, frío) ──
  private fillBridge(bus: LayerBus) {
    // Oscuro, expansivo, sin ritmo. Drone Dm (D, F, A) con reverb largo.
    this.osc(146.83, 'sine', 0.18, bus);      // D3
    this.osc(174.61, 'sine', 0.10, bus);      // F3 (menor)
    this.osc(220.0,  'sine', 0.07, bus);      // A3
    this.osc(293.66, 'sine', 0.04, bus);      // D4 shimmer

    // Isocrónico Theta 6Hz — AM sobre portadora 174Hz
    const carrier = this.osc(174, 'sine', 0, bus);
    const carrierGain = this.ctx!.createGain();
    carrierGain.gain.value = 0.05;
    carrier.disconnect();
    carrier.connect(carrierGain).connect(bus.input);
    bus.nodes.push(carrierGain);
    this.lfo(6, 0.05, carrierGain.gain, bus);

    // Whisper-wind noise for space
    this.noise(bus, 0.025, { type: 'bandpass', freq: 900, q: 0.8 });
  }

  // ── Layer 3: COGNITIVE (filo cognitivo — desayuno, luz, lectura) ──
  private fillCognitive(bus: LayerBus) {
    // D mixolidio: D F# G A C — clear, open
    this.osc(146.83, 'sine',     0.12, bus);  // D3
    this.osc(220.0,  'sine',     0.06, bus);  // A3
    this.osc(277.18, 'triangle', 0.04, bus);  // C#4 (leading)
    this.osc(369.99, 'sine',     0.03, bus);  // F#4

    // Binaural 10Hz Alpha: 210L / 220R
    const binL = this.ctx!.createOscillator();
    binL.type = 'sine';
    binL.frequency.value = 210;
    const binR = this.ctx!.createOscillator();
    binR.type = 'sine';
    binR.frequency.value = 220;
    const panL = this.ctx!.createStereoPanner();
    panL.pan.value = -1;
    const panR = this.ctx!.createStereoPanner();
    panR.pan.value = 1;
    const binGain = this.ctx!.createGain();
    binGain.gain.value = 0.04;
    binL.connect(panL).connect(binGain).connect(bus.input);
    binR.connect(panR).connect(binGain).connect(bus.input);
    binL.start();
    binR.start();
    bus.sources.push(binL, binR);
    bus.nodes.push(panL, panR, binGain);

    // Gamma 40Hz low-amp pulse for cognitive edge
    const gamma = this.ctx!.createOscillator();
    gamma.type = 'sine';
    gamma.frequency.value = 40;
    const gammaGain = this.ctx!.createGain();
    gammaGain.gain.value = 0.012;
    gamma.connect(gammaGain).connect(bus.input);
    gamma.start();
    bus.sources.push(gamma);
    bus.nodes.push(gammaGain);
  }

  // ════════════ SFX (marcial palette) ════════════

  /** Taiko-like strike — used for UI confirmations / transitions. */
  playStrike(intensity = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Body: low noise burst through LPF with rapid pitch drop
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    f.Q.value = 2.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.45 * intensity * this.sfxVolume, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    src.connect(f).connect(g).connect(this.voiceDuckGain || this.master!);
    src.start(t);
    src.stop(t + 0.4);
  }

  /** Meditation bowl — additive with inharmonic partials. */
  playBowl() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const partials = [
      { ratio: 1,    gain: 0.25 },
      { ratio: 2.76, gain: 0.12 },
      { ratio: 5.4,  gain: 0.05 },
    ];
    const fundamental = 432;

    for (const p of partials) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fundamental * p.ratio;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.gain * this.sfxVolume, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 6);
      o.connect(g).connect(this.convolver || this.master!);
      o.start(t);
      o.stop(t + 6.2);
    }
  }

  /** Pentatonic chime success (D-F-G-A-C japanese scale). */
  playChime() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [587.33, 698.46, 783.99, 880.0]; // D5 F5 G5 A5
    notes.forEach((freq, i) => {
      const o = this.ctx!.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = this.ctx!.createGain();
      const t = t0 + i * 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g).connect(this.convolver || this.master!);
      o.start(t);
      o.stop(t + 0.6);
    });
  }

  /** Transition whoosh — filtered noise sweep. */
  playTransition() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.7, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2800, t + 0.55);
    f.Q.value = 3.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    src.connect(f).connect(g).connect(this.convolver || this.master!);
    src.start(t);
    src.stop(t + 0.7);
  }

  /** Final gong — bowl + deep sub-bass + long reverb. */
  playGong() {
    if (!this.ctx) return;
    this.playBowl();
    const t = this.ctx.currentTime;
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 54;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4 * this.sfxVolume, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 5);
    sub.connect(g).connect(this.convolver || this.master!);
    sub.start(t);
    sub.stop(t + 5.5);
  }

  // Legacy aliases so existing callsites keep working.
  playSuccess() { this.playChime(); }
  playComplete() { this.playGong(); }
}
