'use client';

// ═══════════════════════════════════════════════════════════
// ProtocolsScreen · tab "Protocolos" del dock.
//
// Tres tarjetas grandes con el protocolo del día:
//   · Génesis (mañana)   → handleInitialize
//   · NUCLEUS (día)      → modo día
//   · Modo Noche         → flujo nocturno
//
// Cada tarjeta indica estado: ACTIVO AHORA · HECHO HOY ·
// PENDIENTE · FUERA DE VENTANA. Pill superior con day profile
// (Laboral / Sábado / Domingo / Feriado) para contexto.
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { Sun, Moon, Layers, Check, Sparkles, ArrowUpRight, AlertTriangle, Bell as BellIcon } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { isHabitDone } from '@/lib/common/habits';
import { isNucleusWindow, getCurrentBlock } from '@/lib/nucleus/nucleusConstants';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';
import { useCoach } from '@/hooks/useCoach';

interface ProtocolsScreenProps {
  onLaunchMorning: () => void;
  onLaunchNucleus: () => void;
  onLaunchNight: () => void;
  onLaunchCoach: () => void;
}

type Status = 'now' | 'done' | 'pending' | 'window-closed';

interface ProtocolCardData {
  id: 'morning' | 'nucleus' | 'night';
  title: string;
  kicker: string;
  description: string;
  Icon: typeof Sun;
  status: Status;
  onLaunch: () => void;
}

export default function ProtocolsScreen({
  onLaunchMorning,
  onLaunchNucleus,
  onLaunchNight,
  onLaunchCoach,
}: ProtocolsScreenProps) {
  const dayCtx = useMemo(() => getDayContext(), []);
  const dayLabel = getDayProfileLabel(dayCtx);
  const { briefing } = useCoach();

  const cards: ProtocolCardData[] = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const morningDone = isHabitDone('morning_protocol');
    const nightDone = isHabitDone('night_protocol');
    const inNucleus = isNucleusWindow(now);
    const block = getCurrentBlock(now);

    // Morning: ACTIVE between 4-9; otherwise pending/done.
    const morningStatus: Status =
      morningDone ? 'done'
      : hour >= 4 && hour < 10 ? 'now'
      : hour >= 10 && hour < 20 ? 'window-closed'
      : 'pending';

    // NUCLEUS: ACTIVE during the window.
    const nucleusStatus: Status =
      inNucleus ? 'now'
      : hour < 7 ? 'pending'
      : 'window-closed';

    // Night: ACTIVE after 20h; done flag from habit.
    const nightStatus: Status =
      nightDone ? 'done'
      : hour >= 20 || hour < 3 ? 'now'
      : 'pending';

    return [
      {
        id: 'morning',
        title: 'Génesis',
        kicker: 'Protocolo matutino · 13 fases · ~1h 50min',
        description:
          morningDone
            ? 'Completado hoy. La mañana ya quedó anclada.'
            : 'Anclaje matutino: hidratación, frío, respiración, foco.',
        Icon: Sun,
        status: morningStatus,
        onLaunch: onLaunchMorning,
      },
      {
        id: 'nucleus',
        title: 'NUCLEUS',
        kicker: 'Modo día · 06:50 → 18:00 · 6 bloques',
        description:
          block
            ? `Activo ahora: ${block.codename} (${block.startHHMM}–${block.endHHMM}).`
            : 'Línea de tiempo del día con micro-hábitos por franja.',
        Icon: Layers,
        status: nucleusStatus,
        onLaunch: onLaunchNucleus,
      },
      {
        id: 'night',
        title: 'Modo Noche',
        kicker: 'Protocolo nocturno · cierre + descanso',
        description:
          nightDone
            ? 'Cerrado hoy. Sueño en buenas condiciones.'
            : 'Sonidos ambientales, respiración 4-7-8, descarga mental.',
        Icon: Moon,
        status: nightStatus,
        onLaunch: onLaunchNight,
      },
    ];
  }, [onLaunchMorning, onLaunchNucleus, onLaunchNight]);

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={40} />

      {/* Header */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <span
              className="font-ui text-[10px] uppercase tracking-[0.42em]"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Protocolos
            </span>
            <div
              className="font-headline font-[600] text-[28px] md:text-[34px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              hoy
            </div>
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1.5 font-ui text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 rounded-full font-[600] mt-1"
            style={{
              background: hexToRgba(SUNRISE.night, 0.55),
              color: SUNRISE.rise2,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: SUNRISE.rise2 }}
            />
            {dayLabel.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 max-w-3xl mx-auto mt-5 flex flex-col gap-3">
          {cards.map(card => (
            <ProtocolCard key={card.id} {...card} />
          ))}

          {/* Coach del bienestar — alimentado por el engine */}
          {briefing && (
            <CoachProtocolCard
              mode={briefing.mode}
              modeReason={briefing.modeReason}
              actionsCount={briefing.actions.length}
              criticalCount={briefing.actions.filter(a => a.priority === 'critical').length}
              warningsCount={briefing.warnings.length}
              onLaunch={onLaunchCoach}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProtocolCard({
  title,
  kicker,
  description,
  Icon,
  status,
  onLaunch,
}: ProtocolCardData) {
  const isNow = status === 'now';
  const isDone = status === 'done';
  const isClosed = status === 'window-closed';

  const opacity = isClosed ? 0.55 : 1;

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); onLaunch(); }}
      className="text-left flex items-stretch overflow-hidden transition-transform active:scale-[0.99] sunrise-fade-up"
      style={{
        borderRadius: 22,
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${isNow
          ? hexToRgba(SUNRISE.rise2, 0.55)
          : isDone
          ? hexToRgba(SUNRISE.rise2, 0.3)
          : hexToRgba(SUNRISE.rise2, 0.14)}`,
        boxShadow: isNow
          ? `0 16px 36px -12px ${hexToRgba(SUNRISE.rise2, 0.5)}`
          : `0 12px 32px -22px ${hexToRgba(SUNRISE.night, 0.6)}`,
        opacity,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* LEFT · dark glass content */}
      <div className="flex-1 min-w-0 flex items-start gap-3.5 px-4 py-4">
        <span
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, isNow ? 0.2 : 0.12),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, isNow ? 0.5 : 0.28)}`,
            color: SUNRISE.rise2,
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-headline font-[600] text-[20px] leading-tight lowercase tracking-[-0.02em]"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {title.toLowerCase()}
          </div>
          <div
            className="mt-1 font-mono text-[10.5px] tracking-wider lowercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            {kicker.toLowerCase()}
          </div>
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.45]"
            style={{ color: SUNRISE_TEXT.soft }}
          >
            {description}
          </p>
        </div>
      </div>
      {/* RIGHT · status block */}
      <StatusBlock status={status} />
    </button>
  );
}

function StatusBlock({ status }: { status: Status }) {
  if (status === 'now') {
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3"
        style={{ minWidth: 78, background: SUNRISE.rise2 }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: SUNRISE.night, boxShadow: `0 0 8px ${hexToRgba(SUNRISE.night, 0.4)}` }}
        />
        <span
          className="font-headline font-[700] text-[13px] lowercase tracking-[-0.01em] leading-none"
          style={{ color: SUNRISE.night }}
        >
          ahora
        </span>
        <ArrowUpRight size={14} strokeWidth={2.4} style={{ color: SUNRISE.night, opacity: 0.7 }} />
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-center gap-1 px-3"
        style={{ minWidth: 78, background: hexToRgba(SUNRISE.rise2, 0.18) }}
      >
        <Check size={18} strokeWidth={2.6} style={{ color: SUNRISE.rise2 }} />
        <span
          className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700]"
          style={{ color: SUNRISE.rise2 }}
        >
          hecho
        </span>
      </div>
    );
  }
  if (status === 'window-closed') {
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-center px-3"
        style={{ minWidth: 78, background: hexToRgba(SUNRISE.rise2, 0.04) }}
      >
        <span
          className="font-ui text-[9px] tracking-[0.28em] uppercase font-[600] text-center leading-tight"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          fuera de<br />ventana
        </span>
      </div>
    );
  }
  return (
    <div
      className="shrink-0 flex flex-col items-center justify-center px-3"
      style={{ minWidth: 78, background: hexToRgba(SUNRISE.rise2, 0.06) }}
    >
      <span
        className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700]"
        style={{ color: SUNRISE_TEXT.soft }}
      >
        pendiente
      </span>
    </div>
  );
}


// ─── Coach card driven by engine briefing ────────────────────

const COACH_MODE_LABEL: Record<string, string> = {
  normal: 'Normal',
  acne_treatment: 'Tratamiento Deriva-C',
  flare_strong: 'Brote severo',
  flare_mild: 'Brote leve',
  recovery: 'Recovery',
};

function CoachProtocolCard({
  mode,
  modeReason,
  actionsCount,
  criticalCount,
  warningsCount,
  onLaunch,
}: {
  mode: string;
  modeReason: string;
  actionsCount: number;
  criticalCount: number;
  warningsCount: number;
  onLaunch: () => void;
}) {
  const isFlare = mode.startsWith('flare');
  const danger = '#ff6b6b';
  const warn = '#ffb44d';
  const accent = isFlare ? danger : SUNRISE.rise2;
  const label = COACH_MODE_LABEL[mode] ?? mode;
  const hasAlerts = criticalCount > 0 || warningsCount > 0;

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); onLaunch(); }}
      className="text-left flex items-stretch overflow-hidden transition-transform active:scale-[0.99] sunrise-fade-up mt-1"
      style={{
        borderRadius: 22,
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(accent, isFlare ? 0.5 : 0.25)}`,
        boxShadow: isFlare
          ? `0 16px 36px -12px ${hexToRgba(accent, 0.5)}`
          : `0 12px 32px -22px ${hexToRgba(SUNRISE.night, 0.6)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* LEFT · content */}
      <div className="flex-1 min-w-0 flex items-start gap-3.5 px-4 py-4">
        <span
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(accent, 0.16),
            border: `1px solid ${hexToRgba(accent, 0.45)}`,
            color: accent,
          }}
        >
          <Sparkles size={20} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="font-headline font-[600] text-[20px] leading-tight lowercase tracking-[-0.02em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              coach
            </span>
            <span
              className="font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full font-[700]"
              style={{
                background: hexToRgba(accent, 0.18),
                color: accent,
                border: `1px solid ${hexToRgba(accent, 0.45)}`,
              }}
            >
              {label.toLowerCase()}
            </span>
          </div>
          <div
            className="font-mono text-[10.5px] tracking-wider lowercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            skincare · oral · hidratación · {actionsCount} acción{actionsCount === 1 ? '' : 'es'}
          </div>
          {(criticalCount > 0 || warningsCount > 0) && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {criticalCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full font-[700]"
                  style={{
                    background: hexToRgba(danger, 0.2),
                    color: danger,
                    border: `1px solid ${hexToRgba(danger, 0.45)}`,
                  }}
                >
                  <AlertTriangle size={9} strokeWidth={2.6} />
                  {criticalCount} crítico{criticalCount === 1 ? '' : 's'}
                </span>
              )}
              {warningsCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full font-[700]"
                  style={{
                    background: hexToRgba(warn, 0.2),
                    color: warn,
                    border: `1px solid ${hexToRgba(warn, 0.45)}`,
                  }}
                >
                  <BellIcon size={9} strokeWidth={2.6} />
                  {warningsCount} aviso{warningsCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
          <p
            className="mt-2 font-ui text-[12.5px] leading-[1.45]"
            style={{ color: SUNRISE_TEXT.soft }}
          >
            {modeReason}
          </p>
        </div>
      </div>
      {/* RIGHT · CTA block (golden when alerts, dark when normal) */}
      <div
        className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3"
        style={{
          minWidth: 78,
          background: hasAlerts ? accent : hexToRgba(accent, 0.12),
        }}
      >
        <ArrowUpRight
          size={20}
          strokeWidth={2.4}
          style={{ color: hasAlerts ? SUNRISE.night : accent }}
        />
        <span
          className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700] text-center leading-tight"
          style={{ color: hasAlerts ? SUNRISE.night : accent }}
        >
          {hasAlerts ? 'abrir' : 'ver'}
        </span>
      </div>
    </button>
  );
}
