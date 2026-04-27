'use client';

// ═══════════════════════════════════════════════════════════
// FlareControls · iniciar/detener brote y curso de Deriva-C.
//
// Estos toggles disparan inmediatamente el cambio de modo en
// las rutinas (ej: activar `flare_strong` cambia AM/PM al
// protocolo de rescate y silencia productos con activos).
// ═══════════════════════════════════════════════════════════

import { Flame, Pill, RotateCcw, Check } from 'lucide-react';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import type { UseCoachReturn } from '@/hooks/useCoach';
import type { FlareState, FlareSeverity, FlarePhase } from '@/lib/coach/flareProtocol';

interface FlareControlsProps {
  coach: UseCoachReturn;
}

export default function FlareControls({ coach }: FlareControlsProps) {
  const { state, setFlare, setDerivaC } = coach;
  const flare = state.flare;
  const derivaC = state.derivaC;

  const setSeverity = (severity: FlareSeverity) => {
    haptics.tap();
    setFlare({
      severity,
      phase: 'active',
      startedAt: flare.startedAt ?? new Date().toISOString(),
    } as FlareState);
  };

  const setPhase = (phase: FlarePhase) => {
    haptics.tap();
    if (phase === 'resolved') {
      setFlare({ severity: null, phase: 'resolved', startedAt: null });
    } else {
      setFlare({ ...flare, phase });
    }
  };

  const toggleDerivaC = () => {
    haptics.tap();
    if (derivaC.active) {
      setDerivaC({ active: false, startedAt: null, plannedEndAt: null });
    } else {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 84); // 12 semanas
      setDerivaC({
        active: true,
        startedAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Brote */}
      <div
        className="rounded-xl p-3"
        style={{
          background: hexToRgba(SUNRISE.predawn2, 0.5),
          border: `1px solid ${hexToRgba('#ff6b6b', flare.phase !== 'resolved' ? 0.4 : 0.15)}`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame size={14} strokeWidth={1.85} style={{ color: '#ff6b6b' }} />
          <span
            className="font-display italic font-[400] text-[15px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            Brote atópico
          </span>
          <span
            className="font-mono text-[10.5px] tracking-wider ml-auto"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            {flare.phase === 'resolved'
              ? 'sin brote'
              : flare.phase === 'recovery'
              ? 'recovery'
              : `activo · ${flare.severity}`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <ToggleButton
            label="Brote leve"
            active={flare.phase === 'active' && flare.severity === 'mild'}
            onClick={() => setSeverity('mild')}
            color="#ffb44d"
          />
          <ToggleButton
            label="Brote severo"
            active={flare.phase === 'active' && flare.severity === 'strong'}
            onClick={() => setSeverity('strong')}
            color="#ff6b6b"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            icon={RotateCcw}
            label="Pasar a recovery"
            active={flare.phase === 'recovery'}
            onClick={() => setPhase('recovery')}
            color={SUNRISE.rise2}
          />
          <ToggleButton
            icon={Check}
            label="Resuelto"
            active={flare.phase === 'resolved'}
            onClick={() => setPhase('resolved')}
            color={SUNRISE.cool}
          />
        </div>

        {flare.startedAt && (
          <p
            className="font-mono text-[10px] tracking-wider mt-2"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Iniciado: {flare.startedAt.slice(0, 10)}
          </p>
        )}
      </div>

      {/* Deriva-C */}
      <div
        className="rounded-xl p-3"
        style={{
          background: hexToRgba(SUNRISE.predawn2, 0.5),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, derivaC.active ? 0.42 : 0.15)}`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Pill size={14} strokeWidth={1.85} style={{ color: SUNRISE.rise2 }} />
          <span
            className="font-display italic font-[400] text-[15px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            Curso Deriva-C Micro
          </span>
        </div>
        <p
          className="font-mono text-[11px] leading-snug mb-2"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Adapaleno + clindamicina · 12 semanas. Mientras esté activo, la PM se
          simplifica y AM exige SPF 50+. No combinable con brote activo.
        </p>
        <button
          type="button"
          onClick={toggleDerivaC}
          className="w-full rounded-full py-2 font-ui text-[10.5px] tracking-[0.28em] uppercase transition-transform active:scale-[0.98]"
          style={{
            background: derivaC.active
              ? hexToRgba('#ff6b6b', 0.18)
              : hexToRgba(SUNRISE.rise2, 0.18),
            color: derivaC.active ? '#ff6b6b' : SUNRISE.rise2,
            border: `1px solid ${hexToRgba(derivaC.active ? '#ff6b6b' : SUNRISE.rise2, 0.5)}`,
          }}
        >
          {derivaC.active ? 'Detener curso' : 'Iniciar curso'}
        </button>
        {derivaC.active && derivaC.startedAt && (
          <DerivaCProgress
            startedAt={derivaC.startedAt}
            plannedEndAt={derivaC.plannedEndAt}
          />
        )}
      </div>
    </div>
  );
}

// ─── Progreso del curso Deriva-C ─────────────────────────────

const DERIVA_C_MILESTONES: { weekFrom: number; weekTo: number; label: string }[] = [
  { weekFrom: 1, weekTo: 2,  label: 'Adaptación · puede haber retinización (descamación, tirantez).' },
  { weekFrom: 3, weekTo: 6,  label: 'Reducción de comedones; mantén SPF 50+ todos los días.' },
  { weekFrom: 7, weekTo: 10, label: 'Mejora visible. No subir frecuencia sin indicación médica.' },
  { weekFrom: 11, weekTo: 12, label: 'Cierre del curso · valoración con dermatóloga.' },
];

function DerivaCProgress({
  startedAt,
  plannedEndAt,
}: {
  startedAt: string;
  plannedEndAt: string | null;
}) {
  const start = new Date(startedAt);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerDay));
  const week = Math.min(12, Math.floor(elapsedDays / 7) + 1);
  const totalDays = 84;
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const progress = Math.min(1, elapsedDays / totalDays);

  const milestone = DERIVA_C_MILESTONES.find(m => week >= m.weekFrom && week <= m.weekTo);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Semana {week} / 12
        </span>
        <span
          className="font-mono text-[10px] tracking-wider"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {daysRemaining} días restantes
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: hexToRgba(SUNRISE.rise2, 0.14) }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: SUNRISE.rise2,
            boxShadow: `0 0 8px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
          }}
        />
      </div>
      {milestone && (
        <p
          className="font-mono text-[10.5px] leading-snug mt-2"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          <span style={{ color: SUNRISE.rise2 }}>•</span> {milestone.label}
        </p>
      )}
      <p
        className="font-mono text-[10px] tracking-wider mt-1.5"
        style={{ color: SUNRISE_TEXT.muted }}
      >
        Inicio: {startedAt.slice(0, 10)}
        {plannedEndAt && ` · fin previsto: ${plannedEndAt.slice(0, 10)}`}
      </p>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
  icon: Icon,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: typeof Flame;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-full py-1.5 transition-transform active:scale-[0.97]"
      style={{
        background: active ? hexToRgba(color, 0.22) : hexToRgba(SUNRISE.night, 0.4),
        color: active ? color : SUNRISE_TEXT.soft,
        border: `1px solid ${hexToRgba(color, active ? 0.55 : 0.22)}`,
      }}
    >
      {Icon && <Icon size={12} strokeWidth={1.85} />}
      <span className="font-ui text-[10px] tracking-[0.22em] uppercase">{label}</span>
    </button>
  );
}
