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
import { Sun, Moon, Layers, Check } from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { isHabitDone } from '@/lib/common/habits';
import { isNucleusWindow, getCurrentBlock } from '@/lib/nucleus/nucleusConstants';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';

interface ProtocolsScreenProps {
  onLaunchMorning: () => void;
  onLaunchNucleus: () => void;
  onLaunchNight: () => void;
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
}: ProtocolsScreenProps) {
  const dayCtx = useMemo(() => getDayContext(), []);
  const dayLabel = getDayProfileLabel(dayCtx);

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
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col">
            <span
              className="font-ui text-[10px] uppercase tracking-[0.42em]"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Protocolos
            </span>
            <span
              className="font-display italic font-[400] text-[26px] leading-tight mt-0.5"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              Hoy
            </span>
          </div>
          <span
            className="shrink-0 inline-flex items-center font-ui text-[10px] tracking-[0.24em] uppercase px-3 py-1 rounded-full"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.12),
              color: SUNRISE.rise2,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.34)}`,
            }}
          >
            {dayLabel}
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

  const accent = isNow
    ? SUNRISE.rise2
    : isDone
    ? SUNRISE.rise2
    : SUNRISE_TEXT.soft;

  const opacity = isClosed ? 0.6 : 1;

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); onLaunch(); }}
      className="text-left rounded-2xl p-5 flex items-start gap-4 transition-transform active:scale-[0.98] sunrise-fade-up"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.65)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
        border: `1px solid ${isNow
          ? hexToRgba(SUNRISE.rise2, 0.55)
          : isDone
          ? hexToRgba(SUNRISE.rise2, 0.3)
          : hexToRgba(SUNRISE.rise2, 0.14)}`,
        boxShadow: isNow
          ? `0 14px 40px -18px ${hexToRgba(SUNRISE.rise2, 0.55)}`
          : `0 14px 40px -22px ${hexToRgba(SUNRISE.night, 0.7)}`,
        opacity,
      }}
    >
      <span
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, isNow ? 0.22 : 0.12),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, isNow ? 0.5 : 0.28)}`,
          color: accent,
        }}
      >
        <Icon size={22} strokeWidth={1.7} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className="font-display italic font-[400] text-[20px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {title}
          </span>
          <StatusPill status={status} />
        </div>
        <div
          className="font-mono text-[10.5px] tracking-wider mb-1.5"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {kicker}
        </div>
        <p
          className="font-ui text-[12.5px] leading-[1.5]"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === 'now') {
    return (
      <span
        className="inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.22),
          color: SUNRISE.rise2,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
        }}
      >
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{
            background: SUNRISE.rise2,
            boxShadow: `0 0 6px ${SUNRISE.rise2}`,
          }}
        />
        Activo ahora
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span
        className="inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.16),
          color: SUNRISE.rise2,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
        }}
      >
        <Check size={10} strokeWidth={2.4} />
        Hoy
      </span>
    );
  }
  if (status === 'window-closed') {
    return (
      <span
        className="inline-flex items-center font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
        style={{
          color: SUNRISE_TEXT.muted,
          border: `1px solid rgba(255,250,240,0.18)`,
        }}
      >
        Fuera de ventana
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
      style={{
        color: SUNRISE_TEXT.soft,
        border: `1px solid rgba(255,250,240,0.22)`,
      }}
    >
      Pendiente
    </span>
  );
}
