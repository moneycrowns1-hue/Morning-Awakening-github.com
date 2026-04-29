'use client';

// ═══════════════════════════════════════════════════════════════
// CheckInBanner · 1-tap check-in del día (skin-feel + sueño +
// estrés). Cada chip guarda al toque, no hay botón "guardar".
//
// Comportamiento:
//   · Si todavía falta algún eje → banner visible.
//   · Cuando el usuario marca al menos un chip de cada uno de los
//     tres ejes O cuando completa todos, el banner se colapsa
//     a una pill compacta "ya marcaste hoy · editar".
//   · Sin entrada y motor con defaults → banner expandido pero
//     no bloquea nada (es opcional).
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import {
  SKIN_FEEL_LABEL,
  SKIN_FEEL_ORDER,
  SLEEP_LABEL,
  SLEEP_ORDER,
  STRESS_LABEL,
  STRESS_ORDER,
  type DailyCheckIn,
  type SkinFeel,
  type Sleep,
  type Stress,
} from '@/lib/coach/signals';

interface CheckInBannerProps {
  checkIn: DailyCheckIn | null;
  onSet: (
    patch: Partial<Pick<DailyCheckIn, 'skinFeel' | 'sleep' | 'stress'>>,
  ) => void;
}

export default function CheckInBanner({ checkIn, onSet }: CheckInBannerProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();

  // ¿Cuántos ejes tiene el usuario marcados hoy? Si los 3 → colapsado.
  const filled = useMemo(() => {
    const c = checkIn ?? null;
    return [c?.skinFeel, c?.sleep, c?.stress].filter(Boolean).length;
  }, [checkIn]);

  const allFilled = filled === 3;
  const [expanded, setExpanded] = useState<boolean>(!allFilled);

  // Si en algún momento se llena todo, colapsamos auto la primera vez.
  useMemo(() => {
    if (allFilled) setExpanded(false);
  }, [allFilled]);

  return (
    <div
      className="rounded-[22px] overflow-hidden"
      style={{
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Cabecera · siempre visible */}
      <button
        type="button"
        onClick={() => {
          haptics.tick();
          setExpanded((v) => !v);
        }}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex flex-col min-w-0">
          <span
            className="font-mono uppercase tracking-[0.32em] font-[600]"
            style={{ color: SUNRISE_TEXT.muted, fontSize: 9 }}
          >
            · check-in del día ·
          </span>
          <span
            className="font-headline font-[600] lowercase tracking-[-0.01em] mt-0.5"
            style={{ color: SUNRISE_TEXT.primary, fontSize: 14 }}
          >
            {allFilled
              ? summary(checkIn)
              : '¿cómo amaneciste hoy?'}
          </span>
        </div>
        <span
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            color: SUNRISE.rise2,
          }}
        >
          {expanded ? (
            <ChevronUp size={14} strokeWidth={2.2} />
          ) : (
            <ChevronDown size={14} strokeWidth={2.2} />
          )}
        </span>
      </button>

      {/* Cuerpo · chips */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-1 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.1)}` }}
        >
          <ChipGroup<SkinFeel>
            label="piel"
            options={SKIN_FEEL_ORDER}
            labels={SKIN_FEEL_LABEL}
            value={checkIn?.skinFeel}
            onPick={(v) => {
              haptics.tap();
              onSet({ skinFeel: v });
            }}
          />
          <ChipGroup<Sleep>
            label="sueño"
            options={SLEEP_ORDER}
            labels={SLEEP_LABEL}
            value={checkIn?.sleep}
            onPick={(v) => {
              haptics.tap();
              onSet({ sleep: v });
            }}
          />
          <ChipGroup<Stress>
            label="estrés"
            options={STRESS_ORDER}
            labels={STRESS_LABEL}
            value={checkIn?.stress}
            onPick={(v) => {
              haptics.tap();
              onSet({ stress: v });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente · grupo de chips ────────────────────────────

interface ChipGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | undefined;
  onPick: (v: T) => void;
}

function ChipGroup<T extends string>({
  label,
  options,
  labels,
  value,
  onPick,
}: ChipGroupProps<T>) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div>
      <div
        className="font-mono uppercase tracking-[0.32em] font-[600] mb-1.5"
        style={{ color: SUNRISE_TEXT.muted, fontSize: 8.5 }}
      >
        · {label} ·
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onPick(opt)}
              aria-pressed={active}
              className="inline-flex items-center rounded-full px-3 py-1.5 transition-transform active:scale-[0.95]"
              style={{
                background: active ? SUNRISE.rise2 : hexToRgba(SUNRISE.rise2, 0.06),
                border: `1px solid ${
                  active ? SUNRISE.rise2 : hexToRgba(SUNRISE.rise2, 0.18)
                }`,
                color: active ? SUNRISE.night : SUNRISE_TEXT.soft,
              }}
            >
              <span
                className="font-ui lowercase tracking-[0.02em] font-[600]"
                style={{ fontSize: 11 }}
              >
                {labels[opt]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function summary(c: DailyCheckIn | null): string {
  if (!c) return 'sin datos hoy';
  const parts: string[] = [];
  if (c.skinFeel) parts.push(SKIN_FEEL_LABEL[c.skinFeel]);
  if (c.sleep) parts.push(`durmió ${SLEEP_LABEL[c.sleep]}`);
  if (c.stress) parts.push(`estrés ${STRESS_LABEL[c.stress]}`);
  return parts.join(' · ');
}
