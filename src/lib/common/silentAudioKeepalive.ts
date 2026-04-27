// ═══════════════════════════════════════════════════════
// silentAudioKeepalive.ts · keeps iOS lock-screen "now playing"
// visible during a protocol session.
//
// Why this exists:
//   The Media Session API lets a web app advertise metadata and
//   transport handlers that appear on the iOS / Android lock
//   screen ("now playing"). However, iOS Safari only shows this
//   UI while the page is actively playing audio through an
//   HTMLAudioElement. Our AudioEngine is Web Audio only (no
//   <audio> elements), so iOS treats the page as "no audio" and
//   the lock-screen metadata never appears.
//
// Fix:
//   Synthesise a 1-second silent WAV (44-byte header + N zero
//   samples) as a Blob URL, feed it to a hidden <audio> element
//   with loop = true, and play it from a user gesture. The
//   element keeps the page classified as "playing media" for
//   the entire session, so updateMediaSession() calls are
//   honoured and the lock-screen UI appears.
//
// Cost: zero — the audio is bit-accurate silence, consumes
// ~16KB of memory and no CPU beyond the decode thread.
// ═══════════════════════════════════════════════════════

let audioEl: HTMLAudioElement | null = null;
let blobUrl: string | null = null;

function buildSilentWavBlob(durationSec = 1, sampleRate = 8000): Blob {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header.
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeAscii(view, 8, 'WAVE');

  // fmt sub-chunk (PCM, mono, 16-bit).
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);                 // PCM format
  view.setUint16(22, 1, true);                 // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);    // byte rate
  view.setUint16(32, 2, true);                 // block align
  view.setUint16(34, 16, true);                // bits per sample

  // data sub-chunk header. Samples stay zero (silence).
  writeAscii(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/**
 * Start the hidden silent-loop audio element. MUST be called from
 * inside a user-gesture callback (click/tap) on iOS or the .play()
 * promise will reject.
 *
 * Safe to call multiple times — no-op if already running.
 */
export function startSilentKeepalive(): void {
  if (typeof window === 'undefined') return;
  if (audioEl && !audioEl.paused) return;

  if (!audioEl) {
    const blob = buildSilentWavBlob();
    blobUrl = URL.createObjectURL(blob);
    audioEl = new Audio(blobUrl);
    audioEl.loop = true;
    audioEl.preload = 'auto';
    // Inline playback on iOS: mandatory for Safari to honour .play().
    audioEl.setAttribute('playsinline', '');
    audioEl.setAttribute('webkit-playsinline', '');
    // Volume is irrelevant (samples are zero) but set high so iOS
    // doesn't classify the audio as "silent" and ignore it.
    audioEl.volume = 1;
    // Attach to the live document. Without this, iOS standalone PWAs
    // never actually allocate an audio output session for the element
    // so the keepalive trick fails silently — and worse, the alarm
    // stems that depend on that session being warm also stay mute.
    if (typeof document !== 'undefined') {
      try {
        const host = document.createElement('div');
        host.setAttribute('data-keepalive-host', '');
        host.style.cssText =
          'position:fixed;left:-1px;top:-1px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;z-index:-1';
        host.appendChild(audioEl);
        document.body.appendChild(host);
      } catch { /* ignore */ }
    }
  }

  // The promise rejects outside a user gesture; callers should handle.
  audioEl.play().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[silentKeepalive] iOS rejected play():', err);
  });
}

export function stopSilentKeepalive(): void {
  if (audioEl) {
    try { audioEl.pause(); } catch { /* ignore */ }
    try { audioEl.removeAttribute('src'); audioEl.load(); } catch { /* ignore */ }
    // Detach the host wrapper if we attached one.
    try { audioEl.parentNode?.parentNode?.removeChild(audioEl.parentNode); } catch { /* ignore */ }
  }
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
  audioEl = null;
}

export function isKeepaliveRunning(): boolean {
  return audioEl !== null && !audioEl.paused;
}
