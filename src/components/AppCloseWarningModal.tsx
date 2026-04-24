'use client';

// ═══════════════════════════════════════════════════════
// AppCloseWarningModal · one-shot advisory modal shown the
// first time the user arms the gentle alarm. Tells them that
// force-closing the PWA disables the JS audio ramp (a hard
// platform limitation on iOS — no background JS without an
// active client). Inspired by WonderWake's "No cierres la
// app por completo" screen.
//
// Persistence:
//   - `morning-awakening-alarm-warning-seen` → the user
//     tapped "Entendido" at least once. Further toggles do
//     NOT re-open the modal.
//   - `morning-awakening-alarm-warning-silenced` → the user
//     checked "No me lo recuerdes otra vez". Alias of seen
//     but semantically explicit, kept separate so we can
//     decide later to bring the modal back if we ever add
//     a "Help" menu entry.
// ═══════════════════════════════════════════════════════

import { useState } from 'react';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';

interface AppCloseWarningModalProps {
  onClose: () => void;
}

export default function AppCloseWarningModal({ onClose }: AppCloseWarningModalProps) {
  const [dontRemind, setDontRemind] = useState(false);

  const handleDismiss = () => {
    haptics.tap();
    try {
      localStorage.setItem('morning-awakening-alarm-warning-seen', '1');
      if (dontRemind) {
        localStorage.setItem('morning-awakening-alarm-warning-silenced', '1');
      }
    } catch { /* ignore */ }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{
        background: 'rgba(8, 6, 18, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-close-warning-title"
    >
      <div
        className="relative w-full max-w-[380px] rounded-[28px] p-6 sunrise-fade-up"
        style={{
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.22)}`,
          background: 'linear-gradient(180deg, rgba(34, 20, 46, 0.92), rgba(20, 12, 30, 0.96))',
          boxShadow: `0 30px 60px -20px ${hexToRgba(SUNRISE.rise2, 0.35)}`,
        }}
      >
        {/* Illustration: phone silhouette with rising chevrons */}
        <div className="flex justify-center mb-5">
          <PhoneIllustration />
        </div>

        {/* Tag */}
        <div className="flex justify-center mb-3">
          <span
            className="px-3 py-1 rounded-full font-ui text-[10px] tracking-[0.24em] uppercase"
            style={{
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.35)}`,
              background: hexToRgba(SUNRISE.rise2, 0.08),
              color: 'var(--sunrise-text-soft)',
            }}
          >
            Una regla para recordar
          </span>
        </div>

        {/* Title */}
        <h2
          id="app-close-warning-title"
          className="font-display italic font-[500] text-[24px] leading-[1.15] text-center mb-3"
          style={{ color: 'var(--sunrise-text)' }}
        >
          No cierres la app
          <br />
          por completo
        </h2>

        {/* Body */}
        <p
          className="font-ui text-[13px] leading-relaxed text-center mb-5"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Forzar el cierre desactiva la alarma suave porque iOS no deja correr
          audio en segundo plano sin una pestaña viva. Puedes bloquear el
          iPad o usar otras apps sin problema — solo no la deslices fuera del
          selector.
        </p>

        {/* "Don't remind me" checkbox */}
        <button
          onClick={() => { haptics.tick(); setDontRemind((v) => !v); }}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl mb-4 text-left transition-colors"
          style={{
            border: '1px solid rgba(255,250,240,0.1)',
            background: 'rgba(255,250,240,0.03)',
          }}
        >
          <span
            className="font-ui text-[12px]"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            No me lo recuerdes otra vez
          </span>
          <span
            className="shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all"
            style={{
              border: `1px solid ${dontRemind ? SUNRISE.rise2 : 'rgba(255,250,240,0.28)'}`,
              background: dontRemind ? hexToRgba(SUNRISE.rise2, 0.22) : 'transparent',
            }}
          >
            {dontRemind && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6.2 L5 8.7 L9.8 3.5"
                  stroke={SUNRISE.rise2}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        {/* Confirm */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-full font-ui text-[13px] tracking-[0.2em] uppercase transition-transform active:scale-[0.98]"
          style={{
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
            background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.22)}, ${hexToRgba(SUNRISE.rise2, 0.38)})`,
            color: 'var(--sunrise-text)',
            boxShadow: `0 8px 24px -8px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── Inline illustration ──────────────────────────────────
// A stylised phone with three ascending chevrons + a dismiss
// X at the top, echoing the screenshot reference without
// pulling in an image asset.
function PhoneIllustration() {
  return (
    <svg
      width="108"
      height="132"
      viewBox="0 0 108 132"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="appCloseWarnPhone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="appCloseWarnScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(40, 28, 60, 1)" />
          <stop offset="100%" stopColor="rgba(24, 16, 38, 1)" />
        </linearGradient>
      </defs>

      {/* Phone body */}
      <rect
        x="14"
        y="6"
        width="80"
        height="120"
        rx="18"
        fill="url(#appCloseWarnPhone)"
        stroke="rgba(255,250,240,0.18)"
        strokeWidth="1.2"
      />
      {/* Notch */}
      <rect x="46" y="11" width="16" height="4" rx="2" fill="rgba(255,250,240,0.22)" />
      {/* Screen */}
      <rect x="20" y="20" width="68" height="100" rx="12" fill="url(#appCloseWarnScreen)" />

      {/* Dismiss X badge */}
      <circle cx="54" cy="46" r="9" fill={hexToRgba(SUNRISE.rise2, 0.92)} />
      <path
        d="M50.5 42.5 L57.5 49.5 M57.5 42.5 L50.5 49.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Ascending chevrons */}
      <ChevronUp cx={54} cy={74} color={hexToRgba(SUNRISE.rise2, 0.95)} />
      <ChevronUp cx={54} cy={88} color={hexToRgba(SUNRISE.rise2, 0.7)} />
      <ChevronUp cx={54} cy={102} color={hexToRgba(SUNRISE.rise2, 0.45)} />
    </svg>
  );
}

function ChevronUp({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <path
      d={`M ${cx - 7} ${cy + 3} L ${cx} ${cy - 4} L ${cx + 7} ${cy + 3}`}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────
// Decide whether the modal should be shown on a given
// AlarmScreen mount / toggle action. Call from the consumer
// (AlarmScreen) right after the user flips `enabled` to true.

export function shouldShowAppCloseWarning(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem('morning-awakening-alarm-warning-silenced') === '1') return false;
    if (localStorage.getItem('morning-awakening-alarm-warning-seen') === '1') return false;
  } catch { /* ignore */ }
  return true;
}
