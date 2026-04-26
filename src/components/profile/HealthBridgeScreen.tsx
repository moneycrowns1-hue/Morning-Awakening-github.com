'use client';

// ═══════════════════════════════════════════════════════════
// HealthBridgeScreen · Apple Health (vía Shortcut) modal
//
// Two visual modes, both as a centered "sheet" card that sits
// over the night screen's dark violet background:
//
//   mode='connect'     → first-time onboarding. Matches the
//                        Wonderwake "Conectar Apple Health"
//                        screen: two steps, mocked Health dialog,
//                        lavender CTA "Conectar".
//
//   mode='permissions' → shown when the last sync is stale (>48h)
//                        or the shortcut failed. Matches the
//                        "Necesitamos permisos" variant with
//                        Cerrar / Salud buttons.
//
// Tapping "Conectar" runs the user's shortcut via the URL
// scheme `shortcuts://run-shortcut?name=…`. If the shortcut
// isn't installed yet, we fall back to opening the iCloud
// shortcut import URL configured below.
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { X, ArrowUpRight, Heart } from 'lucide-react';
import { NIGHT, NIGHT_TEXT } from '@/lib/night/nightTheme';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { withBasePath } from '@/lib/common/publicPath';

type Mode = 'connect' | 'permissions';

interface HealthBridgeScreenProps {
  mode: Mode;
  onClose: () => void;
  /** Called after the user taps the primary action. Parent can
   *  decide to close and let the shortcut open the URL, then
   *  the hash-ingest on page return imports the data. */
  onAction?: () => void;
}

/** Name of the user-created shortcut on their iPhone. Must
 *  match exactly (case-insensitive, spaces preserved) what
 *  they named it while following the setup guide. */
const SHORTCUT_NAME = 'Morning Awakening Sync';

/** Optional iCloud share URL — once you export your own
 *  Shortcut and publish it, paste the link here. Until then
 *  the primary action falls back to running the shortcut by
 *  name (requires prior manual setup). */
const SHORTCUT_ICLOUD_URL = '';

export default function HealthBridgeScreen({ mode, onClose, onAction }: HealthBridgeScreenProps) {
  const handlePrimary = () => {
    haptics.tick();
    onAction?.();
    if (mode === 'connect') {
      // Try running the shortcut directly. On iOS this prompts
      // the user once per session with "Allow this site to open
      // Shortcuts?".
      const runUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
      try { window.location.href = runUrl; } catch { /* ignore */ }
    } else {
      // Permissions mode → open Apple Health app.
      try { window.location.href = 'x-apple-health://'; } catch { /* ignore */ }
    }
  };

  const handleInstall = () => {
    haptics.tap();
    if (SHORTCUT_ICLOUD_URL) {
      window.open(SHORTCUT_ICLOUD_URL, '_blank');
    } else {
      // Fallback: open the in-repo setup guide.
      window.open(withBasePath('/atajo-apple-health.html'), '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(5,2,15,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(NIGHT.violet_2, 0.92)} 0%, ${hexToRgba(NIGHT.abyss, 0.98)} 100%)`,
          border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.18)}`,
          boxShadow: `0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px ${hexToRgba(NIGHT.moon_halo, 0.08)} inset`,
        }}
      >
        {/* Drag handle hint */}
        <div
          className="mx-auto mt-3 w-10 h-[4px] rounded-full"
          style={{ background: hexToRgba(NIGHT.petal, 0.25) }}
        />

        {mode === 'connect' ? (
          <ConnectBody onInstall={handleInstall} />
        ) : (
          <PermissionsBody />
        )}

        {/* ─── Primary CTA ─── */}
        <div className="px-6 pb-5 pt-2">
          {mode === 'connect' ? (
            <button
              onClick={handlePrimary}
              className="w-full rounded-full py-4 font-ui font-[500] text-[14px] tracking-wider transition-transform active:scale-[0.98]"
              style={{
                background: NIGHT.moon_halo,
                color: NIGHT.abyss,
                boxShadow: `0 12px 32px -8px ${hexToRgba(NIGHT.moon_halo, 0.6)}`,
              }}
            >
              Conectar
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full py-3.5 font-ui text-[13px] tracking-wider transition-transform active:scale-[0.98]"
                style={{
                  background: hexToRgba(NIGHT.abyss, 0.6),
                  border: `1px solid ${NIGHT_TEXT.divider}`,
                  color: NIGHT_TEXT.primary,
                }}
              >
                Cerrar
              </button>
              <button
                onClick={handlePrimary}
                className="flex-1 rounded-full py-3.5 font-ui font-[500] text-[13px] tracking-wider inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
                style={{
                  background: NIGHT.moon_halo,
                  color: NIGHT.abyss,
                  boxShadow: `0 12px 32px -8px ${hexToRgba(NIGHT.moon_halo, 0.6)}`,
                }}
              >
                Salud
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        {mode === 'connect' && (
          <p
            className="px-6 pb-5 text-center text-[11px] leading-relaxed"
            style={{ color: NIGHT_TEXT.muted }}
          >
            Tus datos se procesan directamente en tu dispositivo y se usan únicamente para habilitar funciones personalizadas.
          </p>
        )}

        {/* X close (top-right), subtle */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(NIGHT.abyss, 0.5),
            color: NIGHT_TEXT.muted,
          }}
          aria-label="Cerrar"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Connect body
// ────────────────────────────────────────────────────────────

function ConnectBody({ onInstall }: { onInstall: () => void }) {
  return (
    <div className="px-6 pt-6 pb-3 text-center">
      <h2
        className="font-display italic font-[400] text-[22px] leading-tight"
        style={{ color: NIGHT_TEXT.primary }}
      >
        Conectar Apple Health
      </h2>
      <p
        className="mt-2 text-[13px] leading-relaxed"
        style={{ color: NIGHT_TEXT.soft }}
      >
        Morning Awakening usa tus datos de Apple Health para entender tus patrones de sueño.
      </p>

      {/* Steps */}
      <div className="mt-5 flex justify-center gap-5">
        <Step n={1} text={<>Toque<br/>&ldquo;Ejecutar&rdquo;</>} />
        <Step n={2} text={<>Toque<br/>&ldquo;Permitir&rdquo;</>} />
      </div>

      {/* Health app mock */}
      <HealthDialogMock />

      {/* Helper link — only visible when shortcut isn't installed yet */}
      <button
        onClick={onInstall}
        className="mt-3 inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80"
        style={{ color: NIGHT.moon_halo }}
      >
        ¿Primera vez? Instalá el atajo
        <ArrowUpRight size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-[600] tabular-nums"
        style={{
          background: hexToRgba(NIGHT.abyss, 0.7),
          border: `1px solid ${hexToRgba(NIGHT.moon_halo, 0.35)}`,
          color: NIGHT.moon_halo,
        }}
      >
        {n}
      </div>
      <div
        className="text-left text-[11px] leading-snug"
        style={{ color: NIGHT_TEXT.soft }}
      >
        {text}
      </div>
    </div>
  );
}

function HealthDialogMock() {
  return (
    <div
      className="mt-5 mx-auto w-[200px] rounded-2xl overflow-hidden"
      style={{
        background: '#1c1626',
        border: `1px solid ${hexToRgba(NIGHT.petal, 0.08)}`,
        boxShadow: `0 12px 28px -12px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Top bar with Allow */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div />
        <span className="font-ui text-[10px] font-[500]" style={{ color: '#6aa9ff' }}>
          Allow
        </span>
      </div>
      {/* Health badge */}
      <div className="flex justify-center pb-3">
        <div
          className="w-14 h-14 rounded-[14px] flex items-center justify-center"
          style={{
            background: '#fff',
            boxShadow: `0 4px 12px -4px rgba(0,0,0,0.4)`,
          }}
        >
          <Heart size={28} strokeWidth={0} fill="#ff375f" />
        </div>
      </div>
      {/* Skeleton rows */}
      <div className="px-4 pb-2 space-y-1.5">
        <div className="h-1.5 rounded-full w-3/4 mx-auto" style={{ background: '#2d2438' }} />
        <div className="h-1.5 rounded-full w-1/2 mx-auto" style={{ background: '#2d2438' }} />
      </div>
      {/* Turn on all pill */}
      <div
        className="mx-3 my-3 rounded-lg py-2 text-center"
        style={{ background: hexToRgba(NIGHT.moon_halo, 0.3) }}
      >
        <span className="font-ui text-[10px] font-[600]" style={{ color: '#6aa9ff' }}>
          Turn on all
        </span>
      </div>
      {/* Bottom skeleton */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="h-1.5 rounded-full w-full" style={{ background: '#2d2438' }} />
        <div className="h-1.5 rounded-full w-2/3" style={{ background: '#2d2438' }} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Permissions body
// ────────────────────────────────────────────────────────────

function PermissionsBody() {
  return (
    <div className="px-6 pt-6 pb-3 text-center">
      <h2
        className="font-display italic font-[400] text-[22px] leading-tight"
        style={{ color: NIGHT_TEXT.primary }}
      >
        Necesitamos permisos
      </h2>
      <p
        className="mt-2 text-[13px] leading-relaxed"
        style={{ color: NIGHT_TEXT.soft }}
      >
        Parece que no tenemos permiso para acceder a tus datos de Apple Health. Deberás habilitarlo en la app Salud, dentro de tu perfil.
      </p>

      <HealthPrivacyPathMock />
    </div>
  );
}

function HealthPrivacyPathMock() {
  // Recreates the "Health app → Privacy → Apps → Wonderwake"
  // visual from the Wonderwake reference, adapted to our app.
  return (
    <div className="relative mt-5 mx-auto w-[220px]">
      {/* Top card: Health app */}
      <div
        className="flex items-center justify-between rounded-xl px-3 py-2.5"
        style={{
          background: '#1c1626',
          border: `1px solid ${hexToRgba(NIGHT.petal, 0.08)}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-[6px] flex items-center justify-center"
            style={{ background: '#fff' }}
          >
            <Heart size={11} strokeWidth={0} fill="#ff375f" />
          </div>
          <span className="font-ui text-[11px]" style={{ color: NIGHT_TEXT.primary }}>
            Health app
          </span>
        </div>
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: hexToRgba(NIGHT.petal, 0.1) }}
        />
      </div>

      {/* Small label */}
      <div className="mt-3 mb-1 text-left text-[9px] uppercase tracking-[0.2em]" style={{ color: NIGHT_TEXT.muted }}>
        Privacy
      </div>

      {/* Apps row */}
      <div
        className="flex items-center justify-between rounded-xl px-3 py-2.5"
        style={{
          background: '#1c1626',
          border: `1px solid ${hexToRgba(NIGHT.petal, 0.08)}`,
        }}
      >
        <span className="font-ui text-[11px]" style={{ color: NIGHT_TEXT.primary }}>Apps</span>
        <span style={{ color: NIGHT_TEXT.muted }}>›</span>
      </div>

      {/* Morning Awakening row */}
      <div
        className="mt-2 flex items-center justify-between rounded-xl px-3 py-2"
        style={{
          background: '#1c1626',
          border: `1px solid ${hexToRgba(NIGHT.petal, 0.08)}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full"
            style={{ background: `radial-gradient(circle, ${NIGHT.moon_core} 0%, ${NIGHT.violet_2} 100%)` }}
          />
          <span className="font-ui text-[11px]" style={{ color: NIGHT_TEXT.primary }}>
            Morning Awakening
          </span>
        </div>
        <div
          className="rounded-full px-2 py-0.5 text-[9px] font-[600]"
          style={{
            background: hexToRgba(NIGHT.moon_halo, 0.25),
            color: '#6aa9ff',
          }}
        >
          Turn on all
        </div>
      </div>

      {/* Decorative arrows between cards */}
      <svg
        className="absolute top-8 left-[60%] pointer-events-none"
        width="30" height="22" viewBox="0 0 30 22"
      >
        <path
          d="M 2 2 C 16 2, 24 10, 24 20"
          fill="none"
          stroke={hexToRgba(NIGHT.petal, 0.4)}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
      <svg
        className="absolute top-[88px] left-[58%] pointer-events-none"
        width="30" height="22" viewBox="0 0 30 22"
      >
        <path
          d="M 2 2 C 16 2, 24 10, 24 20"
          fill="none"
          stroke={hexToRgba(NIGHT.petal, 0.4)}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
}
