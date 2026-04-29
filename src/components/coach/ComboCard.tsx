'use client';

// ═══════════════════════════════════════════════════════════════
// ComboCard · "combo del día" · 2-4 productos/hábitos curados
// ═══════════════════════════════════════════════════════════════

import { Sparkles } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import { findTopical, findOral } from '@/lib/coach/catalog';
import type { Combo } from '@/lib/coach/combos';

interface ComboCardProps {
  combo: Combo;
  onSelectProduct?: (id: string) => void;
}

export default function ComboCard({ combo, onSelectProduct }: ComboCardProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.22)}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 px-4 py-3"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.06),
          borderBottom: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
        }}
      >
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.18),
            color: SUNRISE.rise2,
          }}
        >
          <Sparkles size={14} strokeWidth={2.2} />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div
            className="font-mono uppercase tracking-[0.32em] font-[600]"
            style={{ color: SUNRISE_TEXT.muted, fontSize: 9 }}
          >
            combo del día
          </div>
          <div
            className="font-headline font-[600] lowercase tracking-[-0.01em]"
            style={{ color: SUNRISE_TEXT.primary, fontSize: 16 }}
          >
            {combo.title.toLowerCase()}
          </div>
          <p
            className="font-ui text-[12px] leading-snug mt-0.5"
            style={{ color: SUNRISE_TEXT.soft }}
          >
            {combo.pitch}
          </p>
        </div>
      </div>

      {/* Items */}
      <ul className="flex flex-col">
        {combo.items.map((item, idx) => {
          const product = item.productId
            ? findTopical(item.productId) ?? findOral(item.productId)
            : null;
          const title = product ? product.name : item.habit ?? '';
          const clickable = !!item.productId && !!product && !!onSelectProduct;
          return (
            <li
              key={idx}
              className="flex items-start gap-3 px-4 py-2.5"
              style={{
                borderTop: idx > 0 ? `1px solid ${hexToRgba(SUNRISE.rise2, 0.08)}` : 'none',
              }}
            >
              <span
                className="shrink-0 mt-1 w-5 h-5 rounded-full flex items-center justify-center font-mono"
                style={{
                  background: hexToRgba(SUNRISE.rise2, 0.12),
                  color: SUNRISE.rise2,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      onSelectProduct!(item.productId!);
                    }}
                    className="text-left font-ui font-[600] lowercase tracking-[-0.01em]"
                    style={{ color: SUNRISE_TEXT.primary, fontSize: 13 }}
                  >
                    {title.toLowerCase()}
                  </button>
                ) : (
                  <div
                    className="font-ui font-[600] lowercase tracking-[-0.01em]"
                    style={{ color: SUNRISE_TEXT.primary, fontSize: 13 }}
                  >
                    {title.toLowerCase()}
                  </div>
                )}
                <p
                  className="font-ui text-[11.5px] leading-snug mt-0.5"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  {item.why}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
