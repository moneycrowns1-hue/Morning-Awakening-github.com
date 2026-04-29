'use client';

// ═══════════════════════════════════════════════════════════
// MorningRitualPrompt · banner que aparece sobre la
// `WelcomeScreen` cuando estás dentro de la ventana ±60min
// del target del ritual.
//
// Muy ligero. Único CTA: "comenzar mi ritual". Tap → arranca
// el RitualEngine en gesto user-initiated → el `MorningRitualOverlay`
// se monta y toma control.
//
// Estilo: full-bleed pero compacto. SUNRISE palette. Sin
// destruir la jerarquía de Welcome.
// ═══════════════════════════════════════════════════════════

import { Sparkles } from 'lucide-react';
import { hexToRgba, SUNRISE } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

interface MorningRitualPromptProps {
  /** Hora del peak en formato HH:MM. */
  targetHHMM: string;
  /** Texto opcional con el rationale del adapter ("dormiste poco · ramp más largo"). */
  rationale?: string;
  /** Tap → arranca el ritual (debe ejecutar dentro del gesto). */
  onStart: () => void;
}

export default function MorningRitualPrompt({
  targetHHMM,
  rationale,
  onStart,
}: MorningRitualPromptProps) {
  return (
    <div
      className="relative w-full px-5 pt-3 sunrise-fade-up"
      style={{ animationDelay: '40ms' }}
    >
      <button
        type="button"
        onClick={() => { haptics.warn(); onStart(); }}
        className="w-full overflow-hidden flex items-stretch text-left transition-transform active:scale-[0.99]"
        style={{
          borderRadius: 22,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
          boxShadow: `0 12px 30px -16px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
        }}
      >
        {/* LEFT · dark info */}
        <div
          className="flex-1 min-w-0 flex items-center gap-3"
          style={{
            padding: '14px 16px',
            background: hexToRgba(SUNRISE.night, 0.55),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.2),
              color: SUNRISE.rise2,
            }}
          >
            <Sparkles size={16} strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-ui text-[9.5px] tracking-[0.4em] uppercase"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              hora del ritual · {targetHHMM}
            </div>
            <div
              className="font-headline font-[600] text-[18px] leading-tight lowercase tracking-[-0.02em] mt-0.5"
              style={{ color: 'var(--sunrise-text)' }}
            >
              comenzar mi ritual
            </div>
            {rationale && (
              <div
                className="font-mono text-[10px] tracking-[0.05em] mt-0.5 truncate"
                style={{ color: 'var(--sunrise-text-soft)' }}
              >
                {rationale}
              </div>
            )}
          </div>
        </div>
        {/* RIGHT · dorado */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 64,
            background: SUNRISE.rise2,
            color: SUNRISE.night,
          }}
        >
          <span
            className="font-ui font-[700] text-[10px] tracking-[0.35em] uppercase"
            style={{ color: SUNRISE.night }}
          >
            ir
          </span>
        </div>
      </button>
    </div>
  );
}
