'use client';

// ═══════════════════════════════════════════════════════════
// ConditionsSheet · bottom sheet GSAP para activar/desactivar
// condiciones del usuario.
//
// Reemplaza el panel inline plano. Animación:
//   · Backdrop: fade 0 → 1 en 220 ms
//   · Sheet: translateY(100%) → 0 con cubic-bezier easeOutQuint
//             en 360 ms; sale en 280 ms al cerrar.
//
// Tap en backdrop o botón "X" cierra. Cada toggle tiene
// feedback háptico inmediato y muta el catálogo en vivo.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X, Check, AlertCircle } from 'lucide-react';
import { CONDITIONS, type ConditionId } from '@/lib/coach/conditions';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

interface ConditionsSheetProps {
  open: boolean;
  active: ConditionId[];
  onToggle: (id: ConditionId) => void;
  onClose: () => void;
}

const DOMAIN_LABEL: Record<'skin' | 'oral' | 'mind_body', string> = {
  skin: 'Piel',
  oral: 'Oral',
  mind_body: 'Mente · cuerpo',
};

export default function ConditionsSheet({
  open,
  active,
  onToggle,
  onClose,
}: ConditionsSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isAnimatingOut = useRef(false);

  // Entrada (cuando open pasa a true).
  useEffect(() => {
    if (!open) return;
    const backdrop = backdropRef.current;
    const sheet = sheetRef.current;
    if (!backdrop || !sheet) return;

    isAnimatingOut.current = false;

    gsap.set(backdrop, { opacity: 0 });
    gsap.set(sheet, { yPercent: 100 });

    const tl = gsap.timeline();
    tl.to(backdrop, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0);
    tl.to(sheet, { yPercent: 0, duration: 0.36, ease: 'expo.out' }, 0.04);

    return () => { tl.kill(); };
  }, [open]);

  const close = () => {
    if (isAnimatingOut.current) return;
    const backdrop = backdropRef.current;
    const sheet = sheetRef.current;
    if (!backdrop || !sheet) {
      onClose();
      return;
    }
    isAnimatingOut.current = true;
    haptics.tick();
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingOut.current = false;
        onClose();
      },
    });
    tl.to(sheet, { yPercent: 100, duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);
  };

  if (!open) return null;

  const all = Object.values(CONDITIONS);

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={close}
        className="absolute inset-0"
        style={{
          background: hexToRgba(SUNRISE.night, 0.78),
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.predawn2, 0.96)} 0%, ${hexToRgba(SUNRISE.night, 0.98)} 100%)`,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
          borderBottom: 'none',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            aria-hidden
            className="block w-10 h-1 rounded-full"
            style={{ background: hexToRgba(SUNRISE_TEXT.muted as unknown as string, 0.5) }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
          <div>
            <span
              className="font-ui text-[10px] tracking-[0.42em] uppercase"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Condiciones
            </span>
            <div
              className="font-display italic font-[400] text-[22px] leading-tight mt-0.5"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              Mi perfil
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: hexToRgba(SUNRISE.predawn2, 0.55),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
              color: SUNRISE_TEXT.primary,
            }}
          >
            <X size={16} strokeWidth={1.85} />
          </button>
        </div>

        {/* Body — scroll */}
        <div className="scroll-area flex-1 min-h-0 overflow-y-auto px-5 pb-6">
          <p
            className="font-mono text-[11px] leading-snug px-3 py-2 mb-3 rounded-lg"
            style={{
              color: SUNRISE_TEXT.soft,
              background: hexToRgba(SUNRISE.rise2, 0.06),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
            }}
          >
            Activar/desactivar condiciones cambia los ingredientes prohibidos
            y reordena la rutina del día en tiempo real.
          </p>

          <div className="flex flex-col gap-2.5">
            {all.map(cond => {
              const isActive = active.includes(cond.id);
              return (
                <button
                  key={cond.id}
                  type="button"
                  onClick={() => { haptics.tick(); onToggle(cond.id); }}
                  className="text-left rounded-xl p-3 flex items-start gap-3 transition-transform active:scale-[0.99]"
                  style={{
                    background: isActive
                      ? hexToRgba(SUNRISE.rise2, 0.08)
                      : hexToRgba(SUNRISE.predawn2, 0.45),
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, isActive ? 0.42 : 0.14)}`,
                  }}
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: isActive
                        ? hexToRgba(SUNRISE.rise2, 0.22)
                        : hexToRgba(SUNRISE.rise2, 0.08),
                      color: isActive ? SUNRISE.rise2 : SUNRISE_TEXT.muted,
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, isActive ? 0.5 : 0.2)}`,
                    }}
                  >
                    {isActive
                      ? <Check size={14} strokeWidth={2.4} />
                      : <AlertCircle size={14} strokeWidth={1.7} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className="font-display italic font-[400] text-[15px] leading-tight"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {cond.label}
                      </span>
                      <span
                        className="font-ui text-[8.5px] tracking-[0.28em] uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          background: hexToRgba(SUNRISE.cool, 0.12),
                          color: SUNRISE.cool,
                          border: `1px solid ${hexToRgba(SUNRISE.cool, 0.32)}`,
                        }}
                      >
                        {DOMAIN_LABEL[cond.domain]}
                      </span>
                    </div>
                    <p
                      className="font-mono text-[11px] leading-snug"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {cond.oneLiner}
                    </p>
                    {cond.forbiddenIngredients && cond.forbiddenIngredients.length > 0 && (
                      <p
                        className="font-mono text-[10px] tracking-wider mt-1.5"
                        style={{ color: SUNRISE_TEXT.muted }}
                      >
                        ⊘ Evita: {cond.forbiddenIngredients.slice(0, 4).join(' · ')}
                        {cond.forbiddenIngredients.length > 4 && '…'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
