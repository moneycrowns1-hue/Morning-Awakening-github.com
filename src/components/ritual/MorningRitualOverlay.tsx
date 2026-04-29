'use client';

// ═══════════════════════════════════════════════════════════
// MorningRitualOverlay · pantalla full-screen mientras el
// ritual está sonando.
//
// Reemplaza al antiguo `AlarmRingingOverlay`. Diferencias
// clave:
//   - "Apagar" → "cerrar ritual"
//   - "Posponer 9 min" → eliminado (no es una alarma)
//   - Si el config tiene chainProtocol: el botón principal
//     dice "comenzar Génesis"; sino, "cerrar ritual".
//   - El tap-to-wake sigue para iOS rescate.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import GradientBackground from '../common/GradientBackground';
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, hexToRgba } from '@/lib/common/theme';
import type { RitualStage } from '@/lib/ritual/ritualEngine';

interface MorningRitualOverlayProps {
  stage: RitualStage;
  intensity: number;
  /** Acción primaria: cerrar el ritual. Si chainProtocol, encadena. */
  onClose: () => void;
  willChainProtocol?: boolean;
  audioStarted: boolean;
  /** iOS gesture rescue. */
  onTapToWake: () => void;
  /** Texto opcional de rationale del adapter (1 línea). */
  rationale?: string;
}

export default function MorningRitualOverlay({
  stage,
  intensity,
  onClose,
  willChainProtocol,
  audioStarted,
  onTapToWake,
  rationale,
}: MorningRitualOverlayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const stageLabel =
    stage === 'wakeup' ? 'Voz de cierre'
    : stage === 'peak' ? 'Voz con propósito'
    : 'Subiendo suavemente';

  const halo = Math.max(0.15, Math.min(1, 0.15 + intensity * 0.85));

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-between px-6 py-10"
      style={{ color: 'var(--sunrise-text)' }}
    >
      <GradientBackground stage="welcome" particleCount={60} />

      {!audioStarted && (
        <button
          type="button"
          onClick={() => { haptics.tick(); onTapToWake(); }}
          onTouchStart={() => { haptics.tick(); onTapToWake(); }}
          aria-label="Tocar para activar el ritual"
          className="absolute inset-0 z-[5] cursor-pointer"
          style={{ background: 'transparent', border: 'none' }}
        />
      )}

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

      {/* Top: stage label + rationale */}
      <div
        className="relative z-10 text-center mt-6 sunrise-fade-up"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div
          className="font-ui text-[10px] uppercase tracking-[0.5em]"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          Ritual matutino
        </div>
        <div
          className="font-ui text-[12px] tracking-[0.25em] mt-2"
          style={{
            color: !audioStarted ? SUNRISE.rise2 : SUNRISE.rise2,
          }}
        >
          {!audioStarted ? 'Toca para activar' : stageLabel}
        </div>
        {rationale && audioStarted && (
          <div
            className="font-mono text-[10px] mt-2 max-w-[280px] mx-auto leading-[1.45]"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            {rationale}
          </div>
        )}
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

      {/* Bottom: action */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-3 pb-4">
        <button
          onClick={() => { haptics.warn(); onClose(); }}
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
            {willChainProtocol ? 'Comenzar Génesis' : 'Cerrar ritual'}
          </span>
        </button>
      </div>
    </div>
  );
}
