export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;

  init() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.audioContext.destination);
  }

  startAmbient() {
    if (!this.audioContext || !this.masterGain || this.isPlaying) return;
    this.isPlaying = true;

    // Deep sub-bass drone
    const osc1 = this.createOsc('sine', 60, 0.25);
    // Mid harmonic
    const osc2 = this.createOsc('sine', 120, 0.12);
    // Solfeggio 528Hz shimmer
    const osc3 = this.createOsc('sine', 528, 0.04);

    this.oscillators = [osc1, osc2, osc3];

    // Binaural beat pair (10Hz alpha wave)
    const binL = this.audioContext.createOscillator();
    binL.type = 'sine';
    binL.frequency.value = 210;
    const binR = this.audioContext.createOscillator();
    binR.type = 'sine';
    binR.frequency.value = 220;

    const panL = this.audioContext.createStereoPanner();
    panL.pan.value = -1;
    const panR = this.audioContext.createStereoPanner();
    panR.pan.value = 1;
    const binGain = this.audioContext.createGain();
    binGain.gain.value = 0.06;

    binL.connect(panL).connect(binGain).connect(this.masterGain);
    binR.connect(panR).connect(binGain).connect(this.masterGain);
    binL.start();
    binR.start();
    this.oscillators.push(binL, binR);

    // Fade in
    this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 3);
  }

  private createOsc(type: OscillatorType, freq: number, vol: number): OscillatorNode {
    const osc = this.audioContext!.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.audioContext!.createGain();
    gain.gain.value = vol;
    osc.connect(gain).connect(this.masterGain!);
    osc.start();
    return osc;
  }

  playTransition() {
    if (!this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.25);
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);
  }

  playSuccess() {
    if (!this.audioContext || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.audioContext!.createGain();
      const t = this.audioContext!.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  playComplete() {
    if (!this.audioContext || !this.masterGain) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = this.audioContext!.createGain();
      const t = this.audioContext!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.8);
    });
  }

  stopAll() {
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.oscillators = [];
    this.isPlaying = false;
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    }
  }

  dispose() {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
