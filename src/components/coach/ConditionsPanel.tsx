'use client';

// ═══════════════════════════════════════════════════════════
// ConditionsPanel · toggle de condiciones del usuario.
//
// Cada toggle muta el catálogo en tiempo real (vía
// `forbiddenIngredientsFor`), por lo que activar/desactivar
// "Bruxismo" o "Estrés crónico" cambia la rutina mostrada.
//
// La animación GSAP "expand sheet" llegará en una iteración
// posterior — esta versión usa un grid simple con feedback
// háptico y bordes acentuados.
// ═══════════════════════════════════════════════════════════

import { CONDITIONS, type ConditionId } from '@/lib/coach/conditions';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { Check, AlertCircle } from 'lucide-react';

interface ConditionsPanelProps {
  active: ConditionId[];
  onToggle: (id: ConditionId) => void;
}

const DOMAIN_LABEL: Record<'skin' | 'oral' | 'mind_body', string> = {
  skin: 'Piel',
  oral: 'Oral',
  mind_body: 'Mente · cuerpo',
};

export default function ConditionsPanel({ active, onToggle }: ConditionsPanelProps) {
  const all = Object.values(CONDITIONS);

  return (
    <div className="flex flex-col gap-2.5">
      <p
        className="font-mono text-[11px] leading-snug px-3 py-2 rounded-lg"
        style={{
          color: SUNRISE_TEXT.soft,
          background: hexToRgba(SUNRISE.rise2, 0.06),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
        }}
      >
        Activar/desactivar condiciones cambia los ingredientes prohibidos
        y reordena la rutina del día en tiempo real.
      </p>

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
              {isActive ? <Check size={14} strokeWidth={2.4} /> : <AlertCircle size={14} strokeWidth={1.7} />}
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
  );
}
