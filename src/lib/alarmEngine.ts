// ═══════════════════════════════════════════════════════
// alarmEngine.ts · stem-based gentle alarm (v3)
//
// v2 routed every stem through a WebAudio MediaElementSource +
// GainNode chain. That gives beautiful AudioParam ramps on
// desktop Safari but fails silently on iPad Safari in several
// cases:
//   1. `createMediaElementSource` disconnects the element's own
//      output. If the AudioContext is suspended (which happens
//      any time we can't finish ctx.resume() inside the gesture
//      microtask), nothing reaches the speakers.
//   2. iPadOS Safari sometimes drops audio routed through
//      MediaElementSource when the page was just loaded and the
//      element hasn't buffered yet.
//
// v3 drops MediaElementSource entirely and uses plain
// HTMLAudioElement with `el.volume` ramped by a JS animation
// loop. Same behaviour, one fewer thing to break, and iOS
// treats element playback as a first-class citizen.
//
// We keep one tiny AudioContext purely for the "unlock" trick:
// playing a 1-sample silent buffer inside a user gesture so
// later timer-driven element plays are allowed.
//
// Stages
//   ramp       Tycho · Sunrise Projector (loop), 0 → peakVolume
//   peak       coach voice speaks; music ducks to ~28 %
//   reaseguro  Hans Zimmer · Time (loop) fades up to 1.0 while
//              Tycho fades down
//   wakeup    "musica principal.mp3" plays once on dismiss
// ═══════════════════════════════════════════════════════

export type AlarmStage = 'idle' | 'ramp' | 'peak' | 'reaseguro' | 'wakeup';

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

/** Diagnostic returned by AlarmEngine.preview so the UI can show
 *  the user exactly why no sound was heard (buffering, autoplay
 *  policy rejection, MediaError, etc). */
export interface PreviewResult {
  ok: boolean;
  playStarted: boolean;
  /** Seconds of audio the browser managed to buffer during the preview. */
  bufferedSec: number;
  error: string | null;
}

export interface AlarmStartOptions {
  rampDurationSec: number;
  reaseguroDelaySec: number;
  peakVolume?: number;
  startOffsetSec?: number;
  coachText?: string;
}

/** How much music ducks while the coach voice is speaking. */
const DUCK_RATIO = 0.28;
/** Length of the reaseguro crossfade. */
const REASEGURO_XFADE_SEC = 8;
/** Length of the wake-up fade-out for active stems. */
const WAKEUP_FADE_SEC = 1.5;

/** Tycho · Sunrise Projector has a very quiet ambient intro. Seeking
 *  here when the metadata loads puts playback into the melodic part
 *  so the preview and the ramp actually feel audible. */
const TYCHO_SEEK_SEC = 55;

// ─── Shared AudioContext (unlock-only) ────────────────
// Not used for playback any more — only to play a silent buffer
// inside a gesture so HTMLAudioElement.play() triggered from a
// timer is accepted by iOS later on.
let sharedCtx: AudioContext | null = null;

export function getAlarmCtx(): AudioContext {
  if (!sharedCtx) {
    const AC = (window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/**
 * Warm the HTTP cache for the alarm stems. Call once when the
 * AlarmScreen mounts so the 7 MB Tycho file is already buffered
 * by the time the user taps "Probar 6s" — otherwise the preview
 * finishes before the fetch does and no audio reaches the ear.
 *
 * Returns a Promise so callers can await if they want, but it's
 * safe to fire-and-forget (errors are swallowed).
 */
export function prefetchAlarmAudio(stems: StemPaths = DEFAULT_STEMS): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const urls = [stems.ramp, stems.wakeup, stems.reaseguro].filter(Boolean);
  return Promise.all(
    urls.map((u) =>
      fetch(encodeURI(u), { cache: 'force-cache', credentials: 'same-origin' })
        .then((r) => r.ok ? r.blob() : null)  // consume so browser actually caches
        .catch(() => null),
    ),
  ).then(() => undefined);
}

/**
 * Call from a user-gesture handler. Creates or resumes the
 * shared AudioContext and plays a 1-sample silent buffer so
 * subsequent HTMLAudioElement.play() calls are allowed.
 */
export function unlockAlarmAudio(): void {
  try {
    const ctx = getAlarmCtx();
    void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

// ─── Stem with JS-driven volume ramps ─────────────────
interface Stem {
  el: HTMLAudioElement;
  /** Target volume 0..1 — the current ramp's destination. */
  target: number;
  /** Raf handle for the active ramp, or null. */
  rafHandle: number | null;
}

function makeStemEl(url: string, loop: boolean): HTMLAudioElement {
  // encodeURI handles spaces/accents in paths.
  const el = new Audio(encodeURI(url));
  el.loop = loop;
  el.preload = 'auto';
  // iOS Safari mandatory flags for inline audio playback.
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  // Do NOT set crossOrigin — same-origin /public assets don't need it
  // and setting 'anonymous' can trigger CORS preflight on some hosts.
  el.volume = 0;
  return el;
}

function cancelRamp(stem: Stem): void {
  if (stem.rafHandle !== null) {
    cancelAnimationFrame(stem.rafHandle);
    stem.rafHandle = null;
  }
}

/** Ramp stem.el.volume to `target` over `durSec`. Cancels any ramp
 *  currently in progress on this stem. */
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
    // Smoother than linear — tweak feels closer to WebAudio's
    // exponentialRampToValueAtTime for fade-ins.
    const eased = to > from
      ? Math.pow(p, 0.7)              // fade in (fast early, slow tail)
      : 1 - Math.pow(1 - p, 0.7);     // fade out (mirror)
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

export class AlarmEngine {
  private ramp: Stem | null = null;
  private reaseguro: Stem | null = null;
  private wakeup: Stem | null = null;
  private wakeupFired = false;          // one-shot guard on dismiss

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

  isRunning(): boolean { return this.stage !== 'idle'; }
  getStage(): AlarmStage { return this.stage; }

  /**
   * Synchronous start: the element's play() is called BEFORE any
   * await so iOS honors the gesture. Ramps and scheduling follow.
   */
  async start(opts: AlarmStartOptions): Promise<void> {
    if (this.stage !== 'idle') this.stop();

    const rampSec = Math.max(5, opts.rampDurationSec);
    const reaseguroSec = Math.max(0, opts.reaseguroDelaySec);
    const peak = opts.peakVolume ?? 0.8;
    const offset = Math.max(0, Math.min(rampSec, opts.startOffsetSec ?? 0));
    this.peakVolume = peak;
    this.coachText = opts.coachText;

    // Build + start the ramp stem SYNCHRONOUSLY.
    const rampEl = makeStemEl(this.stems.ramp, true);
    this.ramp = { el: rampEl, target: 0, rafHandle: null };

    // Seek to the melodic part once metadata is available. On iOS
    // metadata may not yet be loaded, so the handler seeks as soon
    // as it can.
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

    // Kick playback — synchronous call, iOS-safe.
    const pp = rampEl.play();
    if (pp && typeof pp.then === 'function') {
      pp.catch((err) => console.warn('[AlarmEngine] ramp play rejected', err));
    }

    const remaining = rampSec - offset;
    rampVolume(this.ramp, peak, Math.max(0.5, remaining));

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

    // Intensity ticker.
    this.progressTimer = window.setInterval(() => this.emitProgress(), 250);
  }

  /**
   * Stop ramp/peak/reaseguro and play the wake-up stem once. Calls
   * `onComplete` when the wake-up ends (or on error so the protocol
   * still starts). Guarded: onComplete fires exactly once even if
   * the audio element emits 'ended' twice.
   */
  async playWakeup(onComplete: () => void): Promise<void> {
    if (this.wakeupFired) return;        // one-shot
    this.wakeupFired = true;

    let fired = false;
    const done = () => {
      if (fired) return;
      fired = true;
      try { onComplete(); } catch (err) { console.error('[AlarmEngine] onComplete error', err); }
    };

    try {
      this.clearTimers();
      this.cancelCoach();

      // Fade ramp + reaseguro out. Schedule pause after fade.
      if (this.ramp) rampVolume(this.ramp, 0, WAKEUP_FADE_SEC);
      if (this.reaseguro) rampVolume(this.reaseguro, 0, WAKEUP_FADE_SEC);
      window.setTimeout(() => {
        try { this.ramp?.el.pause(); } catch { /* ignore */ }
        try { this.reaseguro?.el.pause(); } catch { /* ignore */ }
      }, WAKEUP_FADE_SEC * 1000);

      this.stage = 'wakeup';
      this.cb.onStageChange?.('wakeup');
      this.cb.onProgress?.(1, 'wakeup');

      // Create + play wakeup stem SYNCHRONOUSLY (iOS gesture rule).
      const wkEl = makeStemEl(this.stems.wakeup, false);
      this.wakeup = { el: wkEl, target: 0, rafHandle: null };
      wkEl.volume = 0.0001;
      wkEl.addEventListener('ended', done, { once: true });
      wkEl.addEventListener('error', done, { once: true });

      const pp = wkEl.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err) => {
          console.warn('[AlarmEngine] wakeup play rejected', err);
          done();
        });
      }
      rampVolume(this.wakeup, 1, WAKEUP_FADE_SEC);
    } catch (err) {
      console.error('[AlarmEngine] playWakeup error', err);
      done();
    }
  }

  stop(): void {
    this.clearTimers();
    this.cancelCoach();
    const fade = 0.6;
    for (const s of [this.ramp, this.reaseguro, this.wakeup]) {
      if (!s) continue;
      rampVolume(s, 0, fade);
    }
    window.setTimeout(() => this.teardown(), fade * 1000 + 100);
    this.stage = 'idle';
    this.cb.onStageChange?.('idle');
  }

  /**
   * 6 s preview of the ramp stem near peak volume.
   *
   * Returns a diagnostic object describing what actually happened —
   * `AlarmScreen` renders the result so the user can see whether the
   * audio played, errored, or never buffered. This is the only way
   * to debug iOS audio without a Mac + Safari Web Inspector.
   */
  async preview(
    durationSec = 6,
    previewVol = 0.7,
  ): Promise<PreviewResult> {
    const result: PreviewResult = {
      ok: false,
      playStarted: false,
      bufferedSec: 0,
      error: null,
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

      // Sync play() kick first — iOS demands it.
      el.volume = 0.0001;
      const pp = el.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err: unknown) => {
          result.error = err instanceof Error ? err.message : String(err);
          console.warn('[AlarmEngine] preview play rejected', err);
        });
      }
      rampVolume(stem, previewVol, durationSec / 2);
      await new Promise((r) => window.setTimeout(r, durationSec * 1000));

      // Snapshot buffered range for diagnostics before fading out.
      try {
        if (el.buffered.length > 0) {
          result.bufferedSec = el.buffered.end(el.buffered.length - 1) - el.buffered.start(0);
        }
      } catch { /* ignore */ }

      rampVolume(stem, 0, 0.8);
      await new Promise((r) => window.setTimeout(r, 900));
      // Pause only — do NOT set src='' or call load(), those abort any
      // still-running fetch and were the reason early previews produced
      // zero audio on slow connections.
      try { el.pause(); } catch { /* ignore */ }
      result.ok = result.playStarted && !result.error;
      return result;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      console.error('[AlarmEngine] preview failed', err);
      return result;
    }
  }

  // ─────────────────────────────────────────────────────
  // Stages
  // ─────────────────────────────────────────────────────

  private enterPeak(): void {
    if (this.stage === 'idle') return;
    this.stage = 'peak';
    this.cb.onStageChange?.('peak');
    this.timers.push(window.setTimeout(() => this.playCoach(), 2000));
  }

  private enterReaseguro(): void {
    if (this.stage === 'idle') return;
    this.stage = 'reaseguro';
    this.cb.onStageChange?.('reaseguro');
    this.cancelCoach();

    const reEl = makeStemEl(this.stems.reaseguro, true);
    this.reaseguro = { el: reEl, target: 0, rafHandle: null };
    reEl.volume = 0.0001;
    const pp = reEl.play();
    if (pp && typeof pp.then === 'function') {
      pp.catch((err) => console.warn('[AlarmEngine] reaseguro play rejected', err));
    }
    rampVolume(this.reaseguro, 1, REASEGURO_XFADE_SEC);
    if (this.ramp) {
      rampVolume(this.ramp, 0, REASEGURO_XFADE_SEC);
      this.timers.push(window.setTimeout(() => {
        try { this.ramp?.el.pause(); } catch { /* ignore */ }
      }, REASEGURO_XFADE_SEC * 1000));
    }
  }

  // ─── Coach voice ──────────────────────────────────────

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

  private async tryCoachMp3(url: string, onDone: () => void): Promise<void> {
    try {
      const probe = await fetch(encodeURI(url), { method: 'HEAD' });
      if (!probe.ok) throw new Error(`coach mp3 HTTP ${probe.status}`);
      const el = makeStemEl(url, false);
      el.volume = 1;
      this.coachAudio = el;
      el.addEventListener('ended', onDone, { once: true });
      el.addEventListener('error', onDone, { once: true });
      const pp = el.play();
      if (pp && typeof pp.then === 'function') pp.catch(() => onDone());
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
    const apply = (stem: Stem | null, base: number) => {
      if (!stem) return;
      const tgt = ducking ? base * DUCK_RATIO : base;
      rampVolume(stem, tgt, ducking ? 0.8 : 1.2);
    };
    apply(this.ramp, this.peakVolume);
    apply(this.reaseguro, 1.0);
  }

  // ─── Lifecycle ────────────────────────────────────────

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
  }

  private teardown(): void {
    for (const s of [this.ramp, this.reaseguro, this.wakeup]) {
      if (!s) continue;
      cancelRamp(s);
      try { s.el.pause(); s.el.src = ''; s.el.load(); } catch { /* ignore */ }
    }
    this.ramp = null;
    this.reaseguro = null;
    this.wakeup = null;
    this.wakeupFired = false;
  }

  private emitProgress(): void {
    if (this.stage === 'idle') return;
    let v = 0;
    if (this.stage === 'reaseguro' && this.reaseguro) {
      v = this.reaseguro.el.volume;
    } else if (this.ramp) {
      v = this.ramp.el.volume / Math.max(0.01, this.peakVolume);
    }
    this.cb.onProgress?.(Math.min(1, Math.max(0, v)), this.stage);
  }
}

// ─── Defaults ─────────────────────────────────────────

// Filenames are plain ASCII with no spaces or extra dots. Previously
// named "SpotiDown.App - Sunrise Projector - Tycho.mp3" etc., which
// iPad Safari rejected with MediaError code 4 (SRC_NOT_SUPPORTED) —
// the combination of spaces + dots + long paths trips iOS's stricter
// URL/MIME sniffing.
export const DEFAULT_STEMS: StemPaths = {
  ramp: '/audio/voices/premium/ramp-tycho.mp3',
  reaseguro: '/audio/voices/premium/reaseguro-zimmer.mp3',
  wakeup: '/audio/voices/premium/wakeup-principal.mp3',
  coachVoice: '/audio/voices/premium/voz-proposito.mp3',
};

export const DEFAULT_COACH_TEXT =
  'Al despertar es reclamar los cinco minutos de tu día antes de pensar o volver a dormir. ' +
  'Hoy elijo ser el arquitecto de mi experiencia. ' +
  'Mi mente es poderosa, mi enfoque es claro. ' +
  'Cada desafío que enfrente es una oportunidad de crecer y demostrar mi fortaleza interior.';
