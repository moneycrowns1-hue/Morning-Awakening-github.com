'use client';

// ═══════════════════════════════════════════════════════════════
// WeeklyHistorySheet · vista semanal del Coach
//
// Muestra los últimos 7 días con:
//   · grid de cumplimiento (cepillado, agua, oral, activos)
//   · racha de cada categoría rotable
//   · sub-rutinas auto más ruidosas (con su penalty actual)
//   · tips más vistos
//
// Solo lectura. La inteligencia consume estos datos vía
// `weeklyHistory.ts` y `dismissalLog.ts`.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { X, Droplet, Pill, Flame, AlertTriangle, Sparkles } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import type { CoachState } from '@/lib/coach/state';
import {
  buildWeeklyHistory,
  type WeeklyHistory,
  type WeeklyDay,
} from '@/lib/coach/weeklyHistory';
import type { ActiveCategory } from '@/lib/coach/activesLog';

interface WeeklyHistorySheetProps {
  open: boolean;
  state: CoachState;
  onClose: () => void;
}

// ── Pequeñas constantes de UI ──────────────────────────────────

const CATEGORY_DOT_COLOR: Record<ActiveCategory, string> = {
  retinoid: '#c084fc', // violeta · retinoide
  aha:      '#f472b6', // rosa · ácido glicólico/láctico
  bha:      '#facc15', // ámbar · ácido salicílico
  corticoid:'#f87171', // rojo · corticoide
};

// Umbrales de cumplimiento por hábito.
const BRUSH_TARGET = 2;
const WATER_TARGET_ML = 2000;

export default function WeeklyHistorySheet({
  open,
  state,
  onClose,
}: WeeklyHistorySheetProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isAnimatingOut = useRef(false);

  // Recalcula solo al abrir (al cerrar no necesitamos refresco).
  const history: WeeklyHistory | null = useMemo(
    () => (open ? buildWeeklyHistory(state) : null),
    [open, state],
  );

  // Entrada animada.
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

  if (!open || !history) return null;

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
        className="absolute inset-x-0 bottom-0 max-h-[92vh] flex flex-col rounded-t-3xl overflow-hidden"
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
              Histórico
            </span>
            <div
              className="font-headline font-[600] text-[26px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              últimos 7 días
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
            }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Body — scroll */}
        <div className="scroll-area flex-1 min-h-0 overflow-y-auto px-5 pb-6">
          {/* ── 1. Grid de días ── */}
          <SectionLabel>cumplimiento diario</SectionLabel>
          <div
            className="rounded-2xl p-3 mb-4"
            style={{
              background: hexToRgba(SUNRISE.night, 0.55),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div className="grid grid-cols-7 gap-1.5">
              {history.days.map((d) => (
                <DayCell key={d.dateISO} day={d} />
              ))}
            </div>
            <Legend />
          </div>

          {/* ── 2. Rotación · streaks ── */}
          <SectionLabel>activos · rotación</SectionLabel>
          <div className="flex flex-col gap-2 mb-4">
            {history.rotationStreaks
              .filter((s) => s.lastAppliedISO || s.consecutiveDays > 0)
              .length === 0 ? (
              <EmptyHint>Sin aplicaciones registradas en 7 días.</EmptyHint>
            ) : (
              history.rotationStreaks
                .filter((s) => s.lastAppliedISO || s.consecutiveDays > 0)
                .map((s) => (
                  <div
                    key={s.category}
                    className="rounded-xl px-3 py-2 flex items-center gap-3"
                    style={{
                      background: hexToRgba(SUNRISE.night, 0.5),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: CATEGORY_DOT_COLOR[s.category] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-mono text-[12px] lowercase"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {s.label}
                      </div>
                      <div
                        className="font-mono text-[10px] tracking-wider mt-0.5"
                        style={{ color: SUNRISE_TEXT.muted }}
                      >
                        total semana: {history.totalsByCategory[s.category]}
                        {' · '}
                        {s.consecutiveDays > 0
                          ? `${s.consecutiveDays} día${s.consecutiveDays === 1 ? '' : 's'} seguido${s.consecutiveDays === 1 ? '' : 's'}`
                          : 'no aplicado hoy'}
                      </div>
                    </div>
                    {s.consecutiveDays >= 5 && s.category === 'corticoid' && (
                      <span
                        className="font-mono uppercase tracking-[0.2em] font-[600] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                        style={{
                          fontSize: 8.5,
                          background: hexToRgba('#f87171', 0.18),
                          color: '#fca5a5',
                        }}
                      >
                        <AlertTriangle size={9} strokeWidth={2.4} />
                        racha
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>

          {/* ── 3. Sub-rutinas ruidosas ── */}
          {history.noisyAutoSubRoutines.length > 0 && (
            <>
              <SectionLabel>sub-rutinas que ignoraste</SectionLabel>
              <div className="flex flex-col gap-2 mb-4">
                {history.noisyAutoSubRoutines.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl px-3 py-2 flex items-center gap-3"
                    style={{
                      background: hexToRgba(SUNRISE.night, 0.5),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-mono text-[12px] lowercase"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {s.label}
                      </div>
                      <div
                        className="font-mono text-[10px] tracking-wider mt-0.5"
                        style={{ color: SUNRISE_TEXT.muted }}
                      >
                        descartada {s.dismissCount}× · penalty {Math.round(s.penalty * 100)}%
                      </div>
                    </div>
                    {s.penalty >= 1 && (
                      <span
                        className="font-mono uppercase tracking-[0.2em] font-[600] px-1.5 py-0.5 rounded"
                        style={{
                          fontSize: 8.5,
                          background: hexToRgba(SUNRISE.rise2, 0.18),
                          color: SUNRISE.rise2,
                        }}
                      >
                        suprimida
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 4. Tips top ── */}
          {history.topTips.length > 0 && (
            <>
              <SectionLabel>tips más vistos</SectionLabel>
              <div className="flex flex-col gap-1.5 mb-2">
                {history.topTips.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg px-3 py-1.5 flex items-center gap-2"
                    style={{
                      background: hexToRgba(SUNRISE.rise2, 0.06),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
                    }}
                  >
                    <Sparkles size={12} strokeWidth={2} style={{ color: SUNRISE.rise2 }} />
                    <span
                      className="font-mono text-[10.5px] flex-1 min-w-0 truncate"
                      style={{ color: SUNRISE_TEXT.soft }}
                    >
                      {t.id}
                    </span>
                    <span
                      className="font-mono tabular-nums text-[10px]"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {t.count}×
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div
      className="font-mono uppercase tracking-[0.32em] font-[600] mb-1.5 mt-1"
      style={{ color: SUNRISE_TEXT.muted, fontSize: 9.5 }}
    >
      · {children} ·
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div
      className="rounded-xl px-3 py-3 font-mono text-[11px] italic"
      style={{
        background: hexToRgba(SUNRISE.night, 0.4),
        border: `1px dashed ${hexToRgba(SUNRISE.rise2, 0.18)}`,
        color: SUNRISE_TEXT.muted,
      }}
    >
      {children}
    </div>
  );
}

function DayCell({ day }: { day: WeeklyDay }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();

  const brushPct = Math.min(1, day.brushSlots / BRUSH_TARGET);
  const waterPct = Math.min(1, day.waterMl / WATER_TARGET_ML);

  return (
    <div
      className="rounded-lg flex flex-col items-stretch gap-1 p-1.5 text-center"
      style={{
        background: day.isToday
          ? hexToRgba(SUNRISE.rise2, 0.14)
          : hexToRgba(SUNRISE.night, 0.4),
        border: `1px solid ${
          day.isToday
            ? hexToRgba(SUNRISE.rise2, 0.4)
            : hexToRgba(SUNRISE.rise2, 0.1)
        }`,
        minHeight: 78,
      }}
    >
      <div
        className="font-mono uppercase font-[600]"
        style={{
          fontSize: 8.5,
          color: day.isToday ? SUNRISE.rise2 : SUNRISE_TEXT.muted,
          letterSpacing: '0.18em',
        }}
      >
        {day.weekdayShort}
      </div>

      {/* Mini-bars cepillado / agua */}
      <div className="flex gap-1 items-end justify-center" style={{ height: 14 }}>
        <Bar pct={brushPct} icon={<Flame size={7} strokeWidth={2.6} />} />
        <Bar pct={waterPct} icon={<Droplet size={7} strokeWidth={2.6} />} />
      </div>

      {/* Pill oral */}
      {day.oralAnyTake && (
        <div className="flex justify-center">
          <Pill size={9} strokeWidth={2.4} style={{ color: SUNRISE.rise2 }} />
        </div>
      )}

      {/* Activos rotables aplicados (puntos de color) */}
      {day.activesApplied.length > 0 && (
        <div className="flex justify-center gap-0.5 flex-wrap">
          {day.activesApplied.map((c, idx) => (
            <span
              key={`${c}-${idx}`}
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: CATEGORY_DOT_COLOR[c],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Bar({ pct, icon }: { pct: number; icon: React.ReactNode }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const filled = pct >= 1;
  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: 12, height: 14 }}
    >
      <div
        className="rounded-sm w-full"
        style={{
          height: `${Math.max(2, pct * 12)}px`,
          background: filled
            ? SUNRISE.rise2
            : hexToRgba(SUNRISE.rise2, 0.4),
          opacity: pct === 0 ? 0.25 : 1,
        }}
      />
      <span
        className="mt-0.5"
        style={{ color: filled ? SUNRISE.rise2 : SUNRISE_TEXT.muted }}
      >
        {icon}
      </span>
    </div>
  );
}

function Legend() {
  const { SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div
      className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 mt-2 pt-2"
      style={{
        borderTop: `1px solid ${hexToRgba('#fff', 0.08)}`,
        color: SUNRISE_TEXT.muted,
        fontSize: 8.5,
      }}
    >
      <LegendItem dotColor={CATEGORY_DOT_COLOR.retinoid} label="retinoide" />
      <LegendItem dotColor={CATEGORY_DOT_COLOR.aha} label="aha" />
      <LegendItem dotColor={CATEGORY_DOT_COLOR.bha} label="bha" />
      <LegendItem dotColor={CATEGORY_DOT_COLOR.corticoid} label="corticoide" />
    </div>
  );
}

function LegendItem({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.18em]">
      <span
        className="rounded-full"
        style={{ width: 5, height: 5, background: dotColor }}
      />
      {label}
    </span>
  );
}
