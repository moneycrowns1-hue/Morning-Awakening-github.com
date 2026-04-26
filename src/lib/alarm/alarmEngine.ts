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
  /** Fires the moment the ramp element confirms playback (HTMLAudioElement
   *  'playing' event). On iOS this is the truth signal that audio is
   *  actually reaching the speakers — distinct from start() resolving. */
  onPlaying?: () => void;
  /** Fires if the ramp element fails to start playing within ~1.5 s of
   *  start(). Typical cause on iPad PWA: timer-driven play() rejected
   *  because no fresh user gesture. The UI should respond by exposing
   *  a tap-to-wake target that re-invokes start() inside a gesture. */
  onSilentFailure?: () => void;
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

/**
 * Touch an HTMLAudioElement inside a user gesture so iOS Safari
 * allows later timer-driven play() calls on it. The element is
 * momentarily played while muted, then paused and rewound. After
 * this runs successfully the element is "unlocked" for the rest
 * of the page's lifetime.
 *
 * This is the fix for reaseguro/coach/wake-up not sounding on
 * iPad PWAs: those stems are created in setTimeout callbacks,
 * well after the original gesture's microtask ended, and iOS
 * would reject their play() without this priming.
 */
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
      }).catch(() => {
        // iOS refused even the muted play. Fall back to a
        // regular element — at least it's pre-loaded.
        el.muted = false;
      });
    } else {
      try { el.pause(); } catch { /* ignore */ }
      el.muted = false;
    }
  } catch {
    el.muted = false;
  }
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
  /** The currently-playing coach mp3 (if any). Set inside playCoach,
   *  cleared by cancelCoach. Distinct from coachPrimedEl below. */
  private coachAudio: HTMLAudioElement | null = null;
  private coachSpeaking = false;
  /**
   * Coach-mp3 element primed during the user gesture in `start()`.
   * iOS Safari inside an installed PWA is strict about timer-driven
   * play(): even after unlockAlarmAudio, creating a brand new Audio
   * element from a setTimeout callback and calling play() can be
   * rejected. The workaround is to touch the element during the
   * gesture (play()+pause() while muted) so iOS marks it as
   * user-initiated; then the timer can resume it freely. Same rule
   * applies to the reaseguro and wake-up stems — both are now
   * created + primed synchronously inside start() below. */
  private coachPrimedEl: HTMLAudioElement | null = null;

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
    let didStartPlaying = false;
    rampEl.addEventListener('playing', () => {
      didStartPlaying = true;
      try { this.cb.onPlaying?.(); } catch { /* ignore */ }
    }, { once: true });
    const pp = rampEl.play();
    if (pp && typeof pp.then === 'function') {
      pp.catch((err) => {
        console.warn('[AlarmEngine] ramp play rejected', err);
        if (!didStartPlaying) {
          try { this.cb.onSilentFailure?.(); } catch { /* ignore */ }
        }
      });
    }
    // Watchdog: if 'playing' hasn't fired in 1.5 s the audio is silent
    // (iOS rejected the play() without throwing, or buffering stalled).
    this.timers.push(window.setTimeout(() => {
      if (!didStartPlaying && this.stage !== 'idle') {
        try { this.cb.onSilentFailure?.(); } catch { /* ignore */ }
      }
    }, 1500));

    // ─── iOS priming ─────────────────────────────────
    // Create downstream stems SYNCHRONOUSLY inside this gesture so
    // iOS Safari honors later play() calls on them.
    //
    // REASEGURO uses a different, stronger strategy than the others:
    // instead of play()+pause() (which iOS inside an installed PWA
    // sometimes un-flags after the pause, causing silent failure
    // when the timer tries to resume it 5 minutes later), we simply
    // start playing it silently at volume 0 and NEVER pause it.
    // The element loops quietly in the background until
    // enterReaseguro ramps the volume up. This removes every point
    // of failure that was making reaseguro inaudible on iPad.
    //
    // WAKE-UP and COACH are one-shot (not looped), so we can't just
    // let them play through silently — they'd finish before the
    // user needs them. For these we fall back to the muted
    // play()+pause() prime, which works on most iOS versions and
    // gracefully falls back on the rest (wake-up is fired from a
    // user gesture anyway; coach falls back to TTS).
    if (reaseguroSec > 0) {
      const reEl = makeStemEl(this.stems.reaseguro, true);
      this.reaseguro = { el: reEl, target: 0, rafHandle: null };
      reEl.volume = 0;
      const rep = reEl.play();
      if (rep && typeof rep.then === 'function') {
        rep.catch((err) => console.warn('[AlarmEngine] reaseguro silent-prime rejected', err));
      }
    }
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
    // ─────────────────────────────────────────────────

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
    let safetyTimer: number | null = null;
    const done = () => {
      if (fired) return;
      fired = true;
      if (safetyTimer !== null) { clearTimeout(safetyTimer); safetyTimer = null; }
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

      // Reuse the primed wake-up stem from start(). Fall back to a
      // fresh element if priming didn't happen.
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
          console.warn('[AlarmEngine] wakeup play rejected', err);
          done();
        });
      }
      rampVolume(this.wakeup, 1, WAKEUP_FADE_SEC);

      // ─── Safety timeout ──────────────────────────────
      // iOS Safari (especially inside an installed PWA) occasionally
      // fails to emit 'ended' on short mp3s: the audio decoder
      // underruns at the very tail and the element transitions to
      // paused without firing the event. If that happens we'd hang
      // on the ringing overlay forever — the user reported exactly
      // that: "se quita después de un rato" / "aunque sea poner un
      // tiempo, se acaba ese tiempo y se va a la pantalla inicial".
      //
      // Compute a hard upper bound based on the file's real duration
      // (known once metadata has loaded) + 3 s slack, defaulting to
      // 90 s when metadata isn't available yet. When this timer
      // fires, done() chains to onComplete so the overlay dismisses
      // and the protocol (if chained) starts regardless.
      const scheduleSafety = () => {
        const dur = Number.isFinite(wkEl.duration) && wkEl.duration > 0
          ? wkEl.duration
          : 90;
        const ms = Math.ceil((dur + 3) * 1000);
        safetyTimer = window.setTimeout(() => {
          if (!fired) {
            console.warn('[AlarmEngine] wakeup safety timeout fired — ended event missed');
            done();
          }
        }, ms);
      };
      if (wkEl.readyState >= 1) scheduleSafety();
      else wkEl.addEventListener('loadedmetadata', scheduleSafety, { once: true });
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

    // Reaseguro has been playing silently at volume 0 since start().
    // Just rewind and ramp the volume up — NO play() call from this
    // timer callback, which is where iOS inside a PWA was rejecting
    // us before.
    if (!this.reaseguro) {
      // Defensive fallback: priming didn't happen (reaseguroSec was
      // 0 at start, or constructor bypassed the gesture path).
      const reEl = makeStemEl(this.stems.reaseguro, true);
      this.reaseguro = { el: reEl, target: 0, rafHandle: null };
    }
    const reEl = this.reaseguro.el;
    try { reEl.currentTime = 0; } catch { /* ignore */ }
    // If the silent-prime play() was actually rejected by iOS (very
    // rare — would only happen if the gesture check failed), try to
    // play now. Harmless when the element is already playing.
    if (reEl.paused) {
      reEl.volume = 0.0001;
      const pp = reEl.play();
      if (pp && typeof pp.then === 'function') {
        pp.catch((err) => console.warn('[AlarmEngine] reaseguro late play rejected', err));
      }
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

  private tryCoachMp3(url: string, onDone: () => void): void {
    try {
      // Reuse the primed coach element from start(). If priming
      // didn't happen (rare: engine instantiated without a user
      // gesture), create + play a fresh element — may fail on iOS
      // but works on desktop browsers.
      const el = this.coachPrimedEl ?? makeStemEl(url, false);
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.volume = 1;
      this.coachAudio = el;
      const onError = () => {
        // Fall back to TTS on media error.
        console.warn('[AlarmEngine] coach mp3 playback error, using TTS');
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
          console.warn('[AlarmEngine] coach mp3 play rejected, using TTS', err);
          el.removeEventListener('ended', handleEnd);
          el.removeEventListener('error', onError);
          if (this.coachText) this.speakCoach(this.coachText, onDone);
          else onDone();
        });
      }
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
    // Only duck whichever stem is currently audible. During peak
    // (where the coach voice runs) that's the ramp. If we ever add
    // coach-over-reaseguro, extend here. Critically: do NOT touch
    // this.reaseguro while it's silent-priming — pulling its
    // volume up to (1 × DUCK_RATIO) would leak Zimmer into the
    // peak/voice phase.
    const dur = ducking ? 0.8 : 1.2;
    if (this.stage === 'ramp' || this.stage === 'peak') {
      if (this.ramp) {
        rampVolume(this.ramp, ducking ? this.peakVolume * DUCK_RATIO : this.peakVolume, dur);
      }
    } else if (this.stage === 'reaseguro') {
      if (this.reaseguro) {
        rampVolume(this.reaseguro, ducking ? DUCK_RATIO : 1.0, dur);
      }
    }
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
    if (this.coachPrimedEl) {
      try { this.coachPrimedEl.pause(); this.coachPrimedEl.src = ''; this.coachPrimedEl.load(); } catch { /* ignore */ }
      this.coachPrimedEl = null;
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
//
// BASE_PATH must prefix every static-asset URL because this app is
// deployed to GitHub Pages under /Morning-Awakening-github.com/ —
// an absolute `/audio/...` path would 404 there, and iPad Safari
// reports 404 audio as MediaError code 4 (SRC_NOT_SUPPORTED), which
// is exactly what the diagnostic panel was showing. See operator.ts
// for the parallel prefixing on the phase-briefing voice files.
//
// STEM_VERSION is appended as `?v=<n>` so installed PWAs on iOS
// (which cache very aggressively through both our service worker AND
// iOS Safari's own HTTP cache) are forced to re-fetch whenever we
// re-encode or replace an audio file. Bump whenever the binary on
// disk changes.
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? '';
const STEM_VERSION = 3;
const stemUrl = (p: string) => `${BASE_PATH}${p}?v=${STEM_VERSION}`;

export const DEFAULT_STEMS: StemPaths = {
  ramp: stemUrl('/audio/voices/premium/ramp-tycho.mp3'),
  reaseguro: stemUrl('/audio/voices/premium/reaseguro-zimmer.mp3'),
  wakeup: stemUrl('/audio/voices/premium/wakeup-principal.mp3'),
  coachVoice: stemUrl('/audio/voices/premium/voz-proposito.mp3'),
};

export const DEFAULT_COACH_TEXT =
  'Al despertar es reclamar los cinco minutos de tu día antes de pensar o volver a dormir. ' +
  'Hoy elijo ser el arquitecto de mi experiencia. ' +
  'Mi mente es poderosa, mi enfoque es claro. ' +
  'Cada desafío que enfrente es una oportunidad de crecer y demostrar mi fortaleza interior.';
