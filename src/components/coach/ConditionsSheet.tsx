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
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
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
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
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
          <div className="flex-1 min-w-0">
            <span
              className="font-ui text-[10px] tracking-[0.42em] uppercase"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Condiciones
            </span>
            <div
              className="font-headline font-[600] text-[26px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              mi perfil clínico
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
            style={{
              background: SUNRISE.rise2,
              color: SUNRISE.night,
              boxShadow: `0 6px 18px -4px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
            }}
          >
            <X size={18} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
          </button>
        </div>

        {/* Body — scroll */}
        <div className="scroll-area flex-1 min-h-0 overflow-y-auto px-5 pb-6">
          {/* Microcopy explainer + status */}
          <div
            className="rounded-2xl p-3.5 mb-4"
            style={{
              background: hexToRgba(SUNRISE.night, 0.55),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <p
              className="font-mono text-[11.5px] leading-[1.45]"
              style={{ color: SUNRISE_TEXT.soft }}
            >
              Marcá las condiciones que tenés. Esto{' '}
              <span style={{ color: SUNRISE.rise2 }}>silencia ingredientes prohibidos</span>{' '}
              en tu catálogo y{' '}
              <span style={{ color: SUNRISE.rise2 }}>reordena la rutina del día</span>{' '}
              en tiempo real.
            </p>
            <div
              className="flex items-center gap-2 mt-2.5 pt-2.5"
              style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}` }}
            >
              <span
                className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                tu perfil
              </span>
              <span
                className="font-headline font-[700] text-[14px] lowercase tracking-[-0.01em] tabular-nums ml-auto"
                style={{ color: SUNRISE.rise2 }}
              >
                {active.length}
                <span style={{ color: SUNRISE_TEXT.muted, fontWeight: 400 }} className="ml-1">
                  / {all.length} activas
                </span>
              </span>
            </div>
          </div>

          {/* Lista agrupada por dominio · Piel · Oral · Mente·cuerpo */}
          {(['skin', 'oral', 'mind_body'] as const).map(domain => {
            const items = all.filter(c => c.domain === domain);
            if (items.length === 0) return null;
            const domainActive = items.filter(c => active.includes(c.id)).length;
            return (
              <div key={domain} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    className="font-ui text-[9.5px] tracking-[0.34em] uppercase"
                    style={{ color: SUNRISE_TEXT.muted }}
                  >
                    {DOMAIN_LABEL[domain].toLowerCase()}
                  </span>
                  <span
                    className="font-mono text-[9.5px] tabular-nums"
                    style={{ color: SUNRISE_TEXT.muted, opacity: 0.6 }}
                  >
                    · {domainActive}/{items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(cond => {
                    const isActive = active.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => { haptics.tick(); onToggle(cond.id); }}
                        className="text-left rounded-2xl p-3.5 flex items-start gap-3 transition-transform active:scale-[0.99]"
                        style={{
                          background: isActive
                            ? hexToRgba(SUNRISE.rise2, 0.12)
                            : hexToRgba(SUNRISE.night, 0.5),
                          border: `1px solid ${hexToRgba(SUNRISE.rise2, isActive ? 0.5 : 0.16)}`,
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          boxShadow: isActive
                            ? `0 6px 18px -10px ${hexToRgba(SUNRISE.rise2, 0.5)}`
                            : undefined,
                        }}
                      >
                        <span
                          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background: isActive ? SUNRISE.rise2 : hexToRgba(SUNRISE.rise2, 0.08),
                            color: isActive ? SUNRISE.night : SUNRISE_TEXT.muted,
                            border: isActive
                              ? 'none'
                              : `1px solid ${hexToRgba(SUNRISE.rise2, 0.2)}`,
                          }}
                        >
                          {isActive
                            ? <Check size={15} strokeWidth={2.6} style={{ color: SUNRISE.night }} />
                            : <AlertCircle size={14} strokeWidth={1.7} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.01em]"
                            style={{ color: SUNRISE_TEXT.primary }}
                          >
                            {cond.label.toLowerCase()}
                          </div>
                          <p
                            className="font-mono text-[11px] leading-[1.4] mt-1"
                            style={{ color: SUNRISE_TEXT.soft }}
                          >
                            {cond.oneLiner}
                          </p>
                          {cond.forbiddenIngredients && cond.forbiddenIngredients.length > 0 && (
                            <div
                              className="mt-2 inline-flex items-start gap-1.5 px-2 py-1 rounded-md"
                              style={{
                                background: isActive
                                  ? hexToRgba('#ff6b6b', 0.1)
                                  : hexToRgba(SUNRISE.night, 0.45),
                                border: `1px solid ${hexToRgba('#ff6b6b', isActive ? 0.32 : 0.18)}`,
                              }}
                            >
                              <span
                                className="font-ui text-[8.5px] tracking-[0.28em] uppercase font-[700] shrink-0 mt-px"
                                style={{ color: '#ff6b6b' }}
                              >
                                evita
                              </span>
                              <span
                                className="font-mono text-[10px] leading-snug"
                                style={{ color: SUNRISE_TEXT.muted }}
                              >
                                {cond.forbiddenIngredients.slice(0, 4).join(' · ')}
                                {cond.forbiddenIngredients.length > 4 && '…'}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
