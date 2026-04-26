// ═══════════════════════════════════════════════════════
// mediaSession.ts · lockscreen / bluetooth controls
//
// Wraps navigator.mediaSession so the current phase appears
// on the iOS / Android lockscreen while a session is active.
// Users get:
//   - "Morning Awakening · Despertar (fase 1 / 12)" title
//   - Play / Pause from the lock screen or Bluetooth headphones
//   - Skip forward button jumps to the next phase
//
// Gracefully degrades: if mediaSession is unavailable (older
// browsers) all calls are no-ops.
// ═══════════════════════════════════════════════════════

export interface MediaSessionState {
  title: string;
  artist?: string;
  album?: string;
  artwork?: Array<{ src: string; sizes?: string; type?: string }>;
}

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNextTrack?: () => void;
  onSeekForward?: () => void;
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

export function updateMediaSession(state: MediaSessionState): void {
  if (!isSupported()) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.title,
      artist: state.artist ?? 'Morning Awakening',
      album: state.album ?? 'Protocolo matutino',
      artwork: state.artwork ?? [],
    });
  } catch { /* ignore */ }
}

export function setMediaSessionHandlers(handlers: MediaSessionHandlers): void {
  if (!isSupported()) return;
  try {
    if (handlers.onPlay) navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    if (handlers.onPause) navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    if (handlers.onNextTrack) navigator.mediaSession.setActionHandler('nexttrack', handlers.onNextTrack);
    if (handlers.onSeekForward) navigator.mediaSession.setActionHandler('seekforward', handlers.onSeekForward);
  } catch { /* ignore */ }
}

export function setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!isSupported()) return;
  try { navigator.mediaSession.playbackState = state; } catch { /* ignore */ }
}

export function clearMediaSession(): void {
  if (!isSupported()) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    const actions: MediaSessionAction[] = ['play', 'pause', 'nexttrack', 'seekforward'];
    for (const a of actions) {
      try { navigator.mediaSession.setActionHandler(a, null); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}
