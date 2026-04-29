// ═══════════════════════════════════════════════════════════
// ritualEngine.ts · stem-based morning ritual audio engine.
//
// Es la versión simplificada del antiguo `alarmEngine.ts`:
//   - se eliminó la fase `reaseguro` (ya no hace falta porque
//     el usuario inicia el ritual desde un gesto explícito; no
//     hay que "rescatar" un timer que pudo fallar).
//   - se eliminó toda la maquinaria de priming defensivo del
//     reaseguro stem.
//
// Stages del ritual:
//   ramp    Tycho · Sunrise Projector (loop), 0 → peakVolume
//   peak    coach voice habla; música baja a ~28 %
//   wakeup  "musica principal.mp3" suena una vez al cerrar
//
// Igual que antes, conservamos el truco de `unlockAudio` con
// un buffer silencioso de 1 sample para destrabar play() en
// iOS, y el host oculto de <audio> para que iOS PWA emita
// audio real (no sólo dispare 'playing' sin sonido).
// ═══════════════════════════════════════════════════════════

export type RitualStage = 'idle' | 'ramp' | 'peak' | 'wakeup';

export interface StemPaths {
  ramp: string;
  wakeup: string;
  /** Optional premium mp3 for the coach voice. Si falla, fallback a
   *  speechSynthesis con `coachText`. */
  coachVoice?: string;
}

export interface RitualCallbacks {
  onStageChange?: (stage: RitualStage) => void;
  /** 0..1 — volumen audible relativo a peak para una intensity bar. */
  onProgress?: (volume: number, stage: RitualStage) => void;
  /** Confirmación real de playback (HTMLAudioElement 'playing'). */
  onPlaying?: () => void;
  /** Disparado si el ramp no llega a sonar en ~1.5 s (autoplay rejected). */
  onSilentFailure?: () => void;
}

export interface PreviewResult {
  ok: boolean;
  playStarted: boolean;
  bufferedSec: number;
  error: string | null;
}

export interface RitualStartOptions {
  rampDurationSec: number;
  peakVolume?: number;
  startOffsetSec?: number;
  coachText?: string;
}

const DUCK_RATIO = 0.28;
const WAKEUP_FADE_SEC = 1.5;
const TYCHO_SEEK_SEC = 55;

// ─── Shared AudioContext (unlock-only) ──────────────────────
let sharedCtx: AudioContext | null = null;

export function getRitualCtx(): AudioContext {
  if (!sharedCtx) {
    const AC = (window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    sharedCtx = new AC();
  }
  return sharedCtx;
}

export function prefetchRitualAudio(stems: StemPaths = DEFAULT_STEMS): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const urls = [stems.ramp, stems.wakeup].filter(Boolean);
  return Promise.all(
    urls.map((u) =>
      fetch(encodeURI(u), { cache: 'force-cache', credentials: 'same-origin' })
        .then((r) => r.ok ? r.blob() : null)
        .catch(() => null),
    ),
  ).then(() => undefined);
}

/** Llamar desde un user-gesture handler. Inicializa o resume el
 *  AudioContext compartido y reproduce un buffer silencioso de 1
 *  muestra para destrabar HTMLAudioElement.play() posteriores. */
export function unlockRitualAudio(): void {
  try {
    const ctx = getRitualCtx();
    void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

// ─── Stem con ramps de volumen JS-driven ────────────────────
interface Stem {
  el: HTMLAudioElement;
  target: number;
  rafHandle: number | null;
}

let audioHost: HTMLDivElement | null = null;
function getAudioHost(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (audioHost && audioHost.isConnected) return audioHost;
  const host = document.createElement('div');
  host.setAttribute('data-ritual-audio-host', '');
  host.style.cssText = [
    'position:fixed', 'left:-1px', 'top:-1px',
    'width:1px', 'height:1px',
    'opacity:0', 'pointer-events:none',
    'overflow:hidden', 'z-index:-1',
  ].join(';');
  document.body.appendChild(host);
  audioHost = host;
  return host;
}

function makeStemEl(url: string, loop: boolean): HTMLAudioElement {
  const el = new Audio(encodeURI(url));
  el.loop = loop;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.volume = 0;
  const host = getAudioHost();
  if (host) {
    try { host.appendChild(el); } catch { /* ignore */ }
  }
  return el;
}

function disposeStemEl(el: HTMLAudioElement): void {
  try { el.pause(); } catch { /* ignore */ }
  try { el.removeAttribute('src'); el.load(); } catch { /* ignore */ }
  try { el.parentNode?.removeChild(el); } catch { /* ignore */ }
}

function cancelRamp(stem: Stem): void {
  if (stem.rafHandle !== null) {
    cancelAnimationFrame(stem.rafHandle);
    stem.rafHandle = null;
  }
}

function rampVolume(stem: Stem, target: number, durSec: number): void {
  cancelRamp(stem);
  const el = stem.el;
  const from = Math.max(0, Math.min(1, el.volume));
  const to = Math.max(0, Math.min(1, target));
  stem.target = to;
  if (durSec <= 0 || Math.abs(from - to) < 0.001) {
    try { el.volume = to; } catch { /* ignore */ }
    return;
  }
  const t0 = performance.now();
  const dur = durSec * 1000;
  const step = () => {
    const t = performance.now() - t0;
    const p = Math.min(1, t / dur);
    const eased = to > from
      ? Math.pow(p, 0.7)
      : 1 - Math.pow(1 - p, 0.7);
    const v = from + (to - from) * eased;
    try { el.volume = Math.max(0, Math.min(1, v)); } catch { /* ignore */ }
    if (p < 1) {
      stem.rafHandle = requestAnimationFrame(step);
    } else {
      stem.rafHandle = null;
      try { el.volume = to; } catch { /* ignore */ }
    }
  };
  stem.rafHandle = requestAnimationFrame(step);
}

function primeAudioElement(el: HTMLAudioElement): void {
  el.muted = true;
  try {
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        try { el.pause(); } catch { /* ignore */ }
        try { el.currentTime = 0; } catch { /* ignore */ }
        el.muted = false;
        el.volume = 0;
      }).catch(() => { el.muted = false; });
    } else {
      try { el.pause(); } catch { /* ignore */ }
      el.muted = false;
    }
  } catch { el.muted = false; }
}

export class RitualEngine {
  private ramp: Stem | null = null;
  private wakeup: Stem | null = null;
  private wakeupFired = false;

  private stage: RitualStage = 'idle';
  private cb: RitualCallbacks;
  private stems: StemPaths;

  private timers: number[] = [];
  private progressTimer: number | null = null;
  private peakVolume = 0.8;
  private coachText: string | undefined;
  private coachAudio: HTMLAudioElement | null = null;
  private coachSpeaking = false;
  private coachPrimedEl: HTMLAudioElement | null = null;

  constructor(stems: StemPaths, callbacks: RitualCallbacks = {}) {
    this.stems = stems;
    this.cb = callbacks;
  }

  isRunning(): boolean { return this.stage !== 'idle'; }
  getStage(): RitualStage { return this.stage; }

  /**
   * Inicio sincrónico. El play() del ramp se llama ANTES de cualquier
   * await para que iOS honre el gesture.
   */
  async start(opts: RitualStartOptions): Promise<void> {
    if (this.stage !== 'idle') this.stop();

    const rampSec = Math.max(5, opts.rampDurationSec);
    const peak = opts.peakVolume ?? 0.8;
    const offset = Math.max(0, Math.min(rampSec, opts.startOffsetSec ?? 0));
    this.peakVolume = peak;
    this.coachText = opts.coachText;

    const rampEl = makeStemEl(this.stems.ramp, true);
    this.ramp = { el: rampEl, target: 0, rafHandle: null };

    const seek = () => {
      try {
        if (rampEl.duration && rampEl.duration > TYCHO_SEEK_SEC + 5) {
          rampEl.currentTime = TYCHO_SEEK_SEC;
        }
      } catch { /* ignore */ }
    };
    if (rampEl.readyState >= 1) seek();
    else rampEl.addEventListener('loadedmetadata', seek, { once: true });

    const startVol = Math.max(0.0001, (offset / rampSec) * peak);
    rampEl.volume = startVol;
    this.ramp.target = startVol;

    let didStartPlaying = false;
    rampEl.addEventListener('playing', () => {
      didStartPlaying = true;
      try { this.cb.onPlaying?.(); } catch { /* ignore */ }
    }, { once: true });
    const pp = rampEl.play();
    if (pp && typeof pp.then === 'function') {
      pp.catch((err) => {
        console.warn('[RitualEngine] ramp play rejected', err);
        if (!didStartPlaying) {
          try { this.cb.onSilentFailure?.(); } catch { /* ignore */ }
        }
      });
    }
    this.timers.push(window.setTimeout(() => {
      if (!didStartPlaying && this.stage !== 'idle') {
        try { this.cb.onSilentFailure?.(); } catch { /* ignore */ }
      }
    }, 1500));

    // ─── iOS priming · wakeup + coach (sincrónico en gesture) ───
    {
      const wkEl = makeStemEl(this.stems.wakeup, false);
      this.wakeup = { el: wkEl, target: 0, rafHandle: null };
      primeAudioElement(wkEl);
    }
    if (this.stems.coachVoice) {
      const cvEl = makeStemEl(this.stems.coachVoice, false);
      this.coachPrimedEl = cvEl;
      primeAudioElement(cvEl);
    }

    const remaining = rampSec - offset;
    rampVolume(this.ramp, peak, Math.max(0.5, remaining));

    this.stage = 'ramp';
    this.cb.onStageChange?.('ramp');

    this.timers.push(window.setTimeout(() => this.enterPeak(), remaining * 1000));
    this.progressTimer = window.setInterval(() => this.emitProgress(), 250);
  }

  /** Para ramp/peak y reproduce el wakeup una vez. */
  async playWakeup(onComplete: () => void): Promise<void> {
    if (this.wakeupFired) return;
    this.wakeupFired = true;

    let fired = false;
    let safetyTimer: number | null = null;
    const done = () => {
      if (fired) return;
      fired = true;
      if (safetyTimer !== null) { clearTimeout(safetyTimer); safetyTimer = null; }
      try { onComplete(); } catch (err) { console.error('[RitualEngine] onComplete error', err); }
    };

    try {
      this.clearTimers();
      this.cancelCoach();

      if (this.ramp) rampVolume(this.ramp, 0, WAKEUP_FADE_SEC);
      window.setTimeout(() => {
        try { this.ramp?.el.pause(); } catch { /* ignore */ }
      }, WAKEUP_FADE_SEC * 1000);

      this.stage = 'wakeup';
      this.cb.onStageChange?.('wakeup');
      this.cb.onProgress?.(1, 'wakeup');

      if (!this.wakeup) {
        const wkEl = makeStemEl(this.stems.wakeup, false);
        this.wakeup = { el: wkEl, target: 0, rafHandle: null };
      }
      const wkEl = this.wakeup.el;
      try { wkEl.currentTime = 0; } catch { /* ignore */ }
      wkEl.volume = 0.0001;
      wkEl.addEventListener('ended', done, { once: true });
      wkEl.addEventListener('error', done, { once: true });

      const pp = wkEl.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err) => {
          console.warn('[RitualEngine] wakeup play rejected', err);
          done();
        });
      }
      rampVolume(this.wakeup, 1, WAKEUP_FADE_SEC);

      const scheduleSafety = () => {
        const dur = Number.isFinite(wkEl.duration) && wkEl.duration > 0
          ? wkEl.duration
          : 90;
        const ms = Math.ceil((dur + 3) * 1000);
        safetyTimer = window.setTimeout(() => {
          if (!fired) {
            console.warn('[RitualEngine] wakeup safety timeout fired');
            done();
          }
        }, ms);
      };
      if (wkEl.readyState >= 1) scheduleSafety();
      else wkEl.addEventListener('loadedmetadata', scheduleSafety, { once: true });
    } catch (err) {
      console.error('[RitualEngine] playWakeup error', err);
      done();
    }
  }

  stop(): void {
    this.clearTimers();
    this.cancelCoach();
    const fade = 0.6;
    for (const s of [this.ramp, this.wakeup]) {
      if (!s) continue;
      rampVolume(s, 0, fade);
    }
    window.setTimeout(() => this.teardown(), fade * 1000 + 100);
    this.stage = 'idle';
    this.cb.onStageChange?.('idle');
  }

  /** 6s preview del ramp. Usado por el botón "probar mi ritual". */
  async preview(durationSec = 6, previewVol = 0.7): Promise<PreviewResult> {
    const result: PreviewResult = {
      ok: false, playStarted: false, bufferedSec: 0, error: null,
    };
    try {
      const el = makeStemEl(this.stems.ramp, false);
      const stem: Stem = { el, target: 0, rafHandle: null };

      const seek = () => {
        try {
          if (el.duration && el.duration > TYCHO_SEEK_SEC + 5) {
            el.currentTime = TYCHO_SEEK_SEC;
          }
        } catch { /* ignore */ }
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener('loadedmetadata', seek, { once: true });

      el.addEventListener('playing', () => { result.playStarted = true; }, { once: true });
      el.addEventListener('error', () => {
        const e = el.error;
        result.error = e ? `media err ${e.code}` : 'media err';
      }, { once: true });

      el.volume = 0.0001;
      const pp = el.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err: unknown) => {
          result.error = err instanceof Error ? err.message : String(err);
          console.warn('[RitualEngine] preview play rejected', err);
        });
      }
      rampVolume(stem, previewVol, durationSec / 2);
      await new Promise((r) => window.setTimeout(r, durationSec * 1000));

      try {
        if (el.buffered.length > 0) {
          result.bufferedSec = el.buffered.end(el.buffered.length - 1) - el.buffered.start(0);
        }
      } catch { /* ignore */ }

      rampVolume(stem, 0, 0.8);
      await new Promise((r) => window.setTimeout(r, 900));
      try { el.pause(); } catch { /* ignore */ }
      result.ok = result.playStarted && !result.error;
      return result;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      console.error('[RitualEngine] preview failed', err);
      return result;
    }
  }

  // ─── Stages ─────────────────────────────────────────────

  private enterPeak(): void {
    if (this.stage === 'idle') return;
    this.stage = 'peak';
    this.cb.onStageChange?.('peak');
    this.timers.push(window.setTimeout(() => this.playCoach(), 2000));
  }

  private playCoach(): void {
    if (this.stage === 'idle') return;
    if (!this.coachText && !this.stems.coachVoice) return;

    this.duckMusic(true);
    this.coachSpeaking = true;
    const restore = () => { this.coachSpeaking = false; this.duckMusic(false); };

    if (this.stems.coachVoice) {
      this.tryCoachMp3(this.stems.coachVoice, restore);
    } else if (this.coachText) {
      this.speakCoach(this.coachText, restore);
    } else {
      restore();
    }
  }

  private tryCoachMp3(url: string, onDone: () => void): void {
    try {
      const el = this.coachPrimedEl ?? makeStemEl(url, false);
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.volume = 1;
      this.coachAudio = el;
      const onError = () => {
        console.warn('[RitualEngine] coach mp3 playback error, using TTS');
        el.removeEventListener('ended', handleEnd);
        if (this.coachText) this.speakCoach(this.coachText, onDone);
        else onDone();
      };
      const handleEnd = () => {
        el.removeEventListener('error', onError);
        onDone();
      };
      el.addEventListener('ended', handleEnd, { once: true });
      el.addEventListener('error', onError, { once: true });
      const pp = el.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err) => {
          console.warn('[RitualEngine] coach mp3 play rejected, using TTS', err);
          el.removeEventListener('ended', handleEnd);
          el.removeEventListener('error', onError);
          if (this.coachText) this.speakCoach(this.coachText, onDone);
          else onDone();
        });
      }
    } catch (err) {
      console.warn('[RitualEngine] coach mp3 unavailable, using TTS', err);
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
    try { window.speechSynthesis.speak(u); } catch { onDone(); }
  }

  private cancelCoach(): void {
    if (this.coachSpeaking) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      try { this.coachAudio?.pause(); } catch { /* ignore */ }
      this.coachAudio = null;
      this.coachSpeaking = false;
      this.duckMusic(false);
    }
  }

  private duckMusic(ducking: boolean): void {
    const dur = ducking ? 0.8 : 1.2;
    if (this.ramp && (this.stage === 'ramp' || this.stage === 'peak')) {
      rampVolume(this.ramp, ducking ? this.peakVolume * DUCK_RATIO : this.peakVolume, dur);
    }
  }

  // ─── Lifecycle ──────────────────────────────────────────

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
  }

  private teardown(): void {
    for (const s of [this.ramp, this.wakeup]) {
      if (!s) continue;
      cancelRamp(s);
      disposeStemEl(s.el);
    }
    if (this.coachPrimedEl) {
      disposeStemEl(this.coachPrimedEl);
      this.coachPrimedEl = null;
    }
    this.ramp = null;
    this.wakeup = null;
    this.wakeupFired = false;
  }

  private emitProgress(): void {
    if (this.stage === 'idle') return;
    const v = this.ramp
      ? this.ramp.el.volume / Math.max(0.01, this.peakVolume)
      : 0;
    this.cb.onProgress?.(Math.min(1, Math.max(0, v)), this.stage);
  }
}

// ─── Defaults ───────────────────────────────────────────────

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? '';
const STEM_VERSION = 3;
const stemUrl = (p: string) => `${BASE_PATH}${p}?v=${STEM_VERSION}`;

export const DEFAULT_STEMS: StemPaths = {
  ramp: stemUrl('/audio/voices/premium/ramp-tycho.mp3'),
  wakeup: stemUrl('/audio/voices/premium/wakeup-principal.mp3'),
  coachVoice: stemUrl('/audio/voices/premium/voz-proposito.mp3'),
};

export const DEFAULT_COACH_TEXT =
  'Al despertar es reclamar los cinco minutos de tu día antes de pensar o volver a dormir. ' +
  'Hoy elijo ser el arquitecto de mi experiencia. ' +
  'Mi mente es poderosa, mi enfoque es claro. ' +
  'Cada desafío que enfrente es una oportunidad de crecer y demostrar mi fortaleza interior.';
