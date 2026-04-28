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

  const flareActive = flare.phase !== 'resolved';
  const severityLabelMap = { mild: 'leve', strong: 'severo' } as const;

  return (
    <div className="flex flex-col gap-3">
      {/* ============== BROTE ============== */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: hexToRgba(SUNRISE.night, 0.55),
          border: `1px solid ${hexToRgba('#ff6b6b', flareActive ? 0.4 : 0.16)}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: hexToRgba('#ff6b6b', 0.16), color: '#ff6b6b' }}
          >
            <Flame size={15} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.01em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              brote atópico
            </div>
            <div
              className="font-mono text-[10px] tracking-wider mt-0.5"
              style={{ color: flareActive ? '#ff6b6b' : SUNRISE_TEXT.muted }}
            >
              {flare.phase === 'resolved'
                ? 'sin brote · modo normal'
                : flare.phase === 'recovery'
                ? 'recovery · piel cediendo'
                : `activo · ${severityLabelMap[flare.severity ?? 'mild']}`}
            </div>
          </div>
        </div>

        {/* Microcopy explainer */}
        <p
          className="font-mono text-[11px] leading-[1.45] mb-3.5 px-1"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          Activalo si la piel se inflama, pica o aparecen lesiones. Las rutinas
          se simplifican y se silencian activos irritantes
          {' '}<span style={{ color: '#ff6b6b' }}>(vitamina C, retinoides, exfoliantes)</span>.
        </p>

        {/* Step 1 · Iniciar brote */}
        <div
          className="font-ui text-[9px] tracking-[0.34em] uppercase mb-2 flex items-center gap-2"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full font-mono text-[8.5px] font-[700]"
            style={{ background: hexToRgba('#ff6b6b', 0.2), color: '#ff6b6b' }}
          >
            1
          </span>
          si aparece · eligí intensidad
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <ToggleButton
            label="leve"
            sublabel="picor / sequedad"
            active={flare.phase === 'active' && flare.severity === 'mild'}
            onClick={() => setSeverity('mild')}
            color="#ffb44d"
          />
          <ToggleButton
            label="severo"
            sublabel="eccema / eritema"
            active={flare.phase === 'active' && flare.severity === 'strong'}
            onClick={() => setSeverity('strong')}
            color="#ff6b6b"
          />
        </div>

        {/* Step 2 · Salida del brote */}
        <div
          className="font-ui text-[9px] tracking-[0.34em] uppercase mb-2 flex items-center gap-2"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full font-mono text-[8.5px] font-[700]"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.2), color: SUNRISE.rise2 }}
          >
            2
          </span>
          cuando ya cede
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            icon={RotateCcw}
            label="recovery"
            sublabel="cicatrizando"
            active={flare.phase === 'recovery'}
            onClick={() => setPhase('recovery')}
            color={SUNRISE.rise2}
          />
          <ToggleButton
            icon={Check}
            label="resuelto"
            sublabel="volver a normal"
            active={flare.phase === 'resolved'}
            onClick={() => setPhase('resolved')}
            color={SUNRISE.cool}
          />
        </div>

        {flare.startedAt && flare.phase !== 'resolved' && (
          <p
            className="font-mono text-[10px] tracking-wider mt-3 px-1"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            iniciado · {flare.startedAt.slice(0, 10)}
          </p>
        )}
      </div>

      {/* ============== DERIVA-C ============== */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: hexToRgba(SUNRISE.night, 0.55),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, derivaC.active ? 0.42 : 0.16)}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: hexToRgba(SUNRISE.rise2, 0.16), color: SUNRISE.rise2 }}
          >
            <Pill size={15} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.01em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              curso deriva-c micro
            </div>
            <div
              className="font-mono text-[10px] tracking-wider mt-0.5"
              style={{ color: derivaC.active ? SUNRISE.rise2 : SUNRISE_TEXT.muted }}
            >
              {derivaC.active ? 'activo · 12 semanas' : 'no iniciado · 12 semanas'}
            </div>
          </div>
        </div>

        {/* Microcopy */}
        <p
          className="font-mono text-[11px] leading-[1.45] mb-3.5 px-1"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          Adapaleno + clindamicina por 12 semanas. Mientras esté activo:{' '}
          <span style={{ color: SUNRISE.rise2 }}>la rutina PM se simplifica</span>
          {' '}y la AM exige{' '}
          <span style={{ color: SUNRISE.rise2 }}>SPF 50+ obligatorio</span>.
          No combinable con brote activo.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={toggleDerivaC}
          className="w-full rounded-full py-2.5 font-ui text-[10.5px] tracking-[0.3em] uppercase font-[700] transition-transform active:scale-[0.98]"
          style={{
            background: derivaC.active ? hexToRgba('#ff6b6b', 0.16) : SUNRISE.rise2,
            color: derivaC.active ? '#ff6b6b' : SUNRISE.night,
            border: derivaC.active ? `1px solid ${hexToRgba('#ff6b6b', 0.5)}` : 'none',
            boxShadow: derivaC.active ? undefined : `0 8px 22px -10px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
          }}
        >
          {derivaC.active ? 'detener curso' : 'iniciar curso'}
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
    <div className="mt-4">
      <div className="flex items-end justify-between mb-2">
        <div>
          <span
            className="font-ui text-[9px] tracking-[0.34em] uppercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            semana
          </span>
          <div
            className="font-headline font-[700] text-[22px] leading-none lowercase tracking-[-0.02em] mt-0.5"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {week}
            <span
              className="font-mono text-[12px] font-[400] ml-1"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              / 12
            </span>
          </div>
        </div>
        <span
          className="font-mono text-[10px] tracking-wider tabular-nums"
          style={{ color: SUNRISE.rise2 }}
        >
          {daysRemaining}d restantes
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
        <div
          className="mt-3 rounded-xl px-3 py-2.5"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.08),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.2)}`,
          }}
        >
          <span
            className="font-ui text-[9px] tracking-[0.32em] uppercase"
            style={{ color: SUNRISE.rise2 }}
          >
            fase actual
          </span>
          <p
            className="font-mono text-[11px] leading-[1.4] mt-1"
            style={{ color: SUNRISE_TEXT.soft }}
          >
            {milestone.label}
          </p>
        </div>
      )}
      <p
        className="font-mono text-[10px] tracking-wider mt-2.5 px-1"
        style={{ color: SUNRISE_TEXT.muted }}
      >
        inicio · {startedAt.slice(0, 10)}
        {plannedEndAt && ` · fin · ${plannedEndAt.slice(0, 10)}`}
      </p>
    </div>
  );
}

function ToggleButton({
  label,
  sublabel,
  active,
  onClick,
  icon: Icon,
  color,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
  icon?: typeof Flame;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-2xl px-3 py-2.5 text-left transition-transform active:scale-[0.97]"
      style={{
        background: active ? color : hexToRgba(SUNRISE.night, 0.4),
        border: active ? 'none' : `1px solid ${hexToRgba(color, 0.25)}`,
        boxShadow: active ? `0 6px 16px -8px ${hexToRgba(color, 0.55)}` : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={12}
            strokeWidth={2.2}
            style={{ color: active ? SUNRISE.night : color }}
          />
        )}
        <span
          className="font-ui text-[10px] tracking-[0.26em] uppercase font-[700]"
          style={{ color: active ? SUNRISE.night : color }}
        >
          {label}
        </span>
      </div>
      {sublabel && (
        <span
          className="font-mono text-[9.5px] leading-tight lowercase"
          style={{ color: active ? hexToRgba(SUNRISE.night, 0.7) : SUNRISE_TEXT.muted }}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}
