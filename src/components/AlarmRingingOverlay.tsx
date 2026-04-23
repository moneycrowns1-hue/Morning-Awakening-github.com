'use client';

// ═══════════════════════════════════════════════════════
// AlarmRingingOverlay · full-screen takeover shown while
// the alarm is audibly ringing. Sunrise gradient that
// "blooms" with the ramp intensity. Dismiss / snooze
// buttons below the clock.
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import GradientBackground from './GradientBackground';
import { haptics } from '@/lib/haptics';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import type { AlarmStage } from '@/lib/alarmEngine';

interface AlarmRingingOverlayProps {
  stage: AlarmStage;
  intensity: number;
  onDismiss: () => void;
  onSnooze: () => void;
  /** Whether dismissing should also chain into the protocol. */
  willChainProtocol?: boolean;
}

export default function AlarmRingingOverlay({
  stage,
  intensity,
  onDismiss,
  onSnooze,
  willChainProtocol,
}: AlarmRingingOverlayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const stageLabel =
    stage === 'wakeup' ? 'Orden del día'
    : stage === 'reaseguro' ? 'Reaseguro activo'
    : stage === 'peak' ? 'Voz con propósito'
    : 'Subiendo suavemente';

  // Map intensity (0..1) to a bloom opacity for the halo.
  const halo = Math.max(0.15, Math.min(1, 0.15 + intensity * 0.85));

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-between px-6 py-10"
      style={{ color: 'var(--sunrise-text)' }}
    >
      <GradientBackground stage="welcome" particleCount={60} />
      {/* Pulsing bloom that gets brighter with intensity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${hexToRgba(SUNRISE.rise2, 0.35 * halo)} 0%, ${hexToRgba(SUNRISE.dawn1, 0.18 * halo)} 35%, transparent 70%)`,
          transition: 'background 0.8s ease',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(5,3,15,0.1) 0%, rgba(5,3,15,0.5) 100%)',
        }}
      />

      {/* Top: stage label */}
      <div
        className="relative z-10 text-center mt-6 sunrise-fade-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div
          className="font-ui text-[10px] uppercase tracking-[0.5em]"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Alarma
        </div>
        <div
          className="font-ui text-[12px] tracking-[0.25em] mt-2"
          style={{
            color: stage === 'reaseguro' ? SUNRISE.dawn2 : SUNRISE.rise2,
          }}
        >
          {stageLabel}
        </div>
      </div>

      {/* Middle: clock */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="font-display italic font-[300] leading-none tabular-nums text-center"
          style={{
            fontSize: 'clamp(96px, 28vw, 180px)',
            color: 'var(--sunrise-text)',
            textShadow: `0 0 ${40 + intensity * 40}px ${hexToRgba(SUNRISE.rise2, 0.3 + intensity * 0.4)}`,
          }}
        >
          {hh}:{mm}
        </div>

        {/* Intensity bar */}
        <div
          className="mt-8 w-56 h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,250,240,0.08)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(intensity * 100)}%`,
              background: `linear-gradient(90deg, ${hexToRgba(SUNRISE.dawn1, 0.6)}, ${SUNRISE.rise2})`,
              boxShadow: `0 0 8px ${hexToRgba(SUNRISE.rise2, 0.6)}`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Bottom: actions */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-3 pb-4">
        <button
          onClick={() => { haptics.warn(); onDismiss(); }}
          className="group relative w-full rounded-full overflow-hidden transition-transform active:scale-[0.98]"
          style={{
            padding: '16px 32px',
            background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.24)} 0%, ${hexToRgba(SUNRISE.rise2, 0.42)} 100%)`,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
          }}
        >
          <span className="absolute inset-0 rounded-full sunrise-cta-halo pointer-events-none" />
          <span
            className="relative font-ui font-[500] text-[14px] tracking-[0.28em] uppercase"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {willChainProtocol ? 'Despertar y empezar' : 'Apagar alarma'}
          </span>
        </button>
        <button
          onClick={() => { haptics.tap(); onSnooze(); }}
          className="w-full py-3 rounded-full font-ui text-[12px] tracking-[0.25em] uppercase transition-transform active:scale-[0.98]"
          style={{
            border: '1px solid rgba(255,250,240,0.15)',
            background: 'rgba(255,250,240,0.04)',
            color: 'var(--sunrise-text-soft)',
          }}
        >
          Posponer 9 min
        </button>
      </div>
    </div>
  );
}
