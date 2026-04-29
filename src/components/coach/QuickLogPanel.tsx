'use client';

// ═══════════════════════════════════════════════════════════
// QuickLogPanel · strip compacto + dropdown "más"
//
// Diseño bento (acorde a CoachScreen v3):
//   · STRIP visible siempre con SOLO los botones "más necesarios":
//       - +500 ml de agua (siempre)
//       - próximo slot de cepillado pendiente (auto-detectado)
//       - sesión de bruxismo pendiente según hora del día
//         (solo si la condición está activa)
//   · Botón dorado "más ⌄" expande el panel completo:
//       - todas las dosis de agua (250/500/750)
//       - todos los slots de cepillado
//       - ambas sesiones de bruxismo
//       - 6 pastillas comunes
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { Droplet, Smile, Brain, Pill, ChevronDown, type LucideIcon } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import type { UseCoachReturn } from '@/hooks/useCoach';
import { CURRENT_PLAN, type BrushingSlot } from '@/lib/coach/brushing';

interface QuickLogPanelProps {
  coach: UseCoachReturn;
}

const SLOT_LABEL: Record<BrushingSlot, string> = {
  after_breakfast: 'tras desayuno',
  after_lunch: 'tras almuerzo',
  after_snack: 'tras merienda',
  before_bed: 'antes de dormir',
};

export default function QuickLogPanel({ coach }: QuickLogPanelProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const [expanded, setExpanded] = useState(false);
  const { addWater, logBrushing, logBruxism, logOral, briefing, state } = coach;

  const dateISO = briefing?.context.dateISO ?? '';
  const brushedToday = new Set(Object.keys(state.brushing[dateISO] ?? {}));
  const bruxismToday = state.bruxism[dateISO] ?? {};
  const hasBruxism = state.conditions.includes('bruxism');

  // Próximo slot de cepillado: el primero del plan que aún no se hizo.
  const nextBrushSlot = CURRENT_PLAN.slots.find(s => !brushedToday.has(s));

  // Sesión de bruxismo según hora (>= 14h ⇒ PM) y si aún no se registró.
  const isPM = new Date().getHours() >= 14;
  const nextBruxKey: 'amExercise' | 'pmExercise' = isPM ? 'pmExercise' : 'amExercise';
  const nextBruxLabel = isPM ? 'sesión pm' : 'sesión am';
  const nextBruxPending = hasBruxism && !bruxismToday[nextBruxKey];

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 22,
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* ── STRIP COMPACTO (siempre visible) ─────────────── */}
      <div className="flex items-stretch">
        {/* Primary chips · solo los más necesarios */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 px-3.5 py-3">
          <PrimaryChip
            icon={Droplet}
            label="+500 ml"
            onClick={() => { haptics.tap(); addWater(500); }}
          />
          {nextBrushSlot && (
            <PrimaryChip
              icon={Smile}
              label={SLOT_LABEL[nextBrushSlot]}
              onClick={() => { haptics.tap(); logBrushing(nextBrushSlot); }}
            />
          )}
          {nextBruxPending && (
            <PrimaryChip
              icon={Brain}
              label={nextBruxLabel}
              onClick={() => {
                haptics.tap();
                logBruxism({ [nextBruxKey]: true });
              }}
            />
          )}
          {!nextBrushSlot && !nextBruxPending && (
            <span
              className="font-ui text-[10.5px] tracking-[0.28em] uppercase"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              hábitos del día completos
            </span>
          )}
        </div>

        {/* Dorado expand · "más ⌄" */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Cerrar registro' : 'Más opciones de registro'}
          onClick={() => { haptics.tick(); setExpanded(v => !v); }}
          className="shrink-0 flex flex-col items-center justify-center transition-transform active:scale-[0.97]"
          style={{
            width: 64,
            background: SUNRISE.rise2,
            color: SUNRISE.night,
          }}
        >
          <span
            className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700]"
            style={{ color: SUNRISE.night }}
          >
            más
          </span>
          <ChevronDown
            size={15}
            strokeWidth={2.5}
            style={{
              color: SUNRISE.night,
              marginTop: 2,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 220ms',
            }}
          />
        </button>
      </div>

      {/* ── DROPDOWN EXPANDIDO · panel completo ─────────── */}
      {expanded && (
        <div
          className="px-3.5 pt-3 pb-3.5 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}` }}
        >
          <Group label="Hidratación">
            <ChipRow>
              <Chip
                icon={Droplet}
                label="+250 ml"
                onClick={() => { haptics.tap(); addWater(250); }}
              />
              <Chip
                icon={Droplet}
                label="+500 ml"
                onClick={() => { haptics.tap(); addWater(500); }}
              />
              <Chip
                icon={Droplet}
                label="+750 ml"
                onClick={() => { haptics.tap(); addWater(750); }}
              />
            </ChipRow>
          </Group>

          <Group label={`Cepillado · ${CURRENT_PLAN.dailyTarget}× / día`}>
            <ChipRow>
              {CURRENT_PLAN.slots.map(slot => {
                const done = brushedToday.has(slot);
                return (
                  <Chip
                    key={slot}
                    icon={Smile}
                    label={SLOT_LABEL[slot]}
                    done={done}
                    onClick={() => {
                      if (done) return;
                      haptics.tap();
                      logBrushing(slot);
                    }}
                  />
                );
              })}
            </ChipRow>
          </Group>

          {hasBruxism && (
            <Group label="Bruxismo">
              <ChipRow>
                <Chip
                  icon={Brain}
                  label="sesión am"
                  done={!!bruxismToday.amExercise}
                  onClick={() => {
                    if (bruxismToday.amExercise) return;
                    haptics.tap();
                    logBruxism({ amExercise: true });
                  }}
                />
                <Chip
                  icon={Brain}
                  label="sesión pm"
                  done={!!bruxismToday.pmExercise}
                  onClick={() => {
                    if (bruxismToday.pmExercise) return;
                    haptics.tap();
                    logBruxism({ pmExercise: true });
                  }}
                />
              </ChipRow>
            </Group>
          )}

          <Group label="Pastillas">
            <ChipRow>
              <Chip icon={Pill} label="loratadina" onClick={() => { haptics.tap(); logOral('loratadine_10'); }} />
              <Chip icon={Pill} label="triptófano" onClick={() => { haptics.tap(); logOral('tryptophan_mg_b6_lajusticia'); }} />
              <Chip icon={Pill} label="vit e" onClick={() => { haptics.tap(); logOral('vitamin_e_400'); }} />
              <Chip icon={Pill} label="omega 3" onClick={() => { haptics.tap(); logOral('omega3_1000'); }} />
              <Chip icon={Pill} label="ca + d3" onClick={() => { haptics.tap(); logOral('calcium_d3'); }} />
              <Chip icon={Pill} label="gelcavit" onClick={() => { haptics.tap(); logOral('gelcavit_student'); }} />
            </ChipRow>
          </Group>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────

function PrimaryChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3.5 py-2 transition-transform active:scale-[0.95]"
      style={{
        background: hexToRgba(SUNRISE.rise2, 0.18),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.5)}`,
      }}
    >
      <Icon size={14} strokeWidth={2} style={{ color: SUNRISE.rise2 }} />
      <span
        className="font-ui text-[12px] font-[600] lowercase tracking-[0.02em]"
        style={{ color: SUNRISE_TEXT.primary }}
      >
        {label}
      </span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const { SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div>
      <h3
        className="font-ui text-[9.5px] tracking-[0.3em] uppercase mb-1.5"
        style={{ color: SUNRISE_TEXT.muted }}
      >
        {label}
      </h3>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  icon: Icon,
  label,
  done,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  done?: boolean;
  onClick: () => void;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-transform active:scale-[0.95]"
      style={{
        background: done
          ? hexToRgba(SUNRISE.rise2, 0.18)
          : hexToRgba(SUNRISE.night, 0.4),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, done ? 0.5 : 0.18)}`,
        opacity: done ? 0.85 : 1,
      }}
    >
      <Icon
        size={11}
        strokeWidth={2}
        style={{ color: done ? SUNRISE.rise2 : SUNRISE_TEXT.soft }}
      />
      <span
        className="font-mono text-[10.5px] tracking-wider lowercase"
        style={{ color: done ? SUNRISE.rise2 : SUNRISE_TEXT.primary }}
      >
        {label}{done && ' ✓'}
      </span>
    </button>
  );
}

