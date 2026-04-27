'use client';

// ═══════════════════════════════════════════════════════════
// QuickLogPanel · botones para registrar tomas rápidas.
//
// Acciones disponibles:
//   · +250 / +500 ml de agua
//   · Marcar slot de cepillado actual
//   · Marcar bruxismo AM/PM
//   · Registrar pastilla oral común
// ═══════════════════════════════════════════════════════════

import { Droplet, Smile, Brain, Pill, type LucideIcon } from 'lucide-react';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import type { UseCoachReturn } from '@/hooks/useCoach';
import { CURRENT_PLAN, type BrushingSlot } from '@/lib/coach/brushing';

interface QuickLogPanelProps {
  coach: UseCoachReturn;
}

const SLOT_LABEL: Record<BrushingSlot, string> = {
  after_breakfast: 'Tras desayuno',
  after_lunch: 'Tras almuerzo',
  after_snack: 'Tras merienda',
  before_bed: 'Antes de dormir',
};

export default function QuickLogPanel({ coach }: QuickLogPanelProps) {
  const { addWater, logBrushing, logBruxism, logOral, briefing } = coach;
  const dateISO = briefing?.context.dateISO ?? '';
  const brushedToday = new Set(Object.keys(coach.state.brushing[dateISO] ?? {}));
  const bruxismToday = coach.state.bruxism[dateISO] ?? {};

  return (
    <div className="mt-2 flex flex-col gap-3">
      {/* Agua */}
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

      {/* Cepillado */}
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

      {/* Bruxismo */}
      {coach.state.conditions.includes('bruxism') && (
        <Group label="Bruxismo">
          <ChipRow>
            <Chip
              icon={Brain}
              label="Sesión AM"
              done={!!bruxismToday.amExercise}
              onClick={() => {
                if (bruxismToday.amExercise) return;
                haptics.tap();
                logBruxism({ amExercise: true });
              }}
            />
            <Chip
              icon={Brain}
              label="Sesión PM"
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

      {/* Pastillas comunes */}
      <Group label="Pastillas">
        <ChipRow>
          <Chip
            icon={Pill}
            label="Loratadina"
            onClick={() => { haptics.tap(); logOral('loratadine_10'); }}
          />
          <Chip
            icon={Pill}
            label="Triptófano AML"
            onClick={() => { haptics.tap(); logOral('tryptophan_mg_b6_lajusticia'); }}
          />
          <Chip
            icon={Pill}
            label="Vit E"
            onClick={() => { haptics.tap(); logOral('vitamin_e_400'); }}
          />
          <Chip
            icon={Pill}
            label="Omega 3"
            onClick={() => { haptics.tap(); logOral('omega3_1000'); }}
          />
          <Chip
            icon={Pill}
            label="Ca + D3"
            onClick={() => { haptics.tap(); logOral('calcium_d3'); }}
          />
          <Chip
            icon={Pill}
            label="Gelcavit"
            onClick={() => { haptics.tap(); logOral('gelcavit_student'); }}
          />
        </ChipRow>
      </Group>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
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
  return <div className="flex flex-wrap gap-2">{children}</div>;
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-transform active:scale-[0.95]"
      style={{
        background: done
          ? hexToRgba(SUNRISE.rise2, 0.18)
          : hexToRgba(SUNRISE.predawn2, 0.6),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, done ? 0.5 : 0.18)}`,
        opacity: done ? 0.85 : 1,
      }}
    >
      <Icon
        size={13}
        strokeWidth={1.85}
        style={{ color: done ? SUNRISE.rise2 : SUNRISE_TEXT.soft }}
      />
      <span
        className="font-mono text-[11px] tracking-wider"
        style={{ color: done ? SUNRISE.rise2 : SUNRISE_TEXT.primary }}
      >
        {label}{done && ' ✓'}
      </span>
    </button>
  );
}
