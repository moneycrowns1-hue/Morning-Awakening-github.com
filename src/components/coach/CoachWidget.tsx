'use client';

// ═══════════════════════════════════════════════════════════
// CoachWidget · tarjeta resumen del briefing del Coach.
//
// Diseñada para inserción en WelcomeScreen (home) o
// ProtocolsScreen. Muestra:
//   · Badge del modo activo
//   · La acción top (más prioritaria + urgente)
//   · Status compacto: cepillado · agua
//   · CTA "Abrir Coach"
//
// Solo se renderiza si hay algo accionable hoy. Si todo está
// hecho y el modo es `normal`, devuelve `null` para no añadir
// ruido visual.
// ═══════════════════════════════════════════════════════════

import { Sparkles, ChevronRight, type LucideIcon } from 'lucide-react';
import { Sun, Moon, Droplet, Brain, Smile, Pill, Flame, Activity } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import { useCoach } from '@/hooks/useCoach';
import type { CoachAction } from '@/lib/coach/coachEngine';

interface CoachWidgetProps {
  onOpen: () => void;
  /** Si true, oculta automáticamente cuando no hay acciones críticas. */
  autoHide?: boolean;
}

const ACTION_ICON: Record<CoachAction['kind'], LucideIcon> = {
  flare_step: Flame,
  skincare_routine: Sun,
  brushing: Smile,
  water: Droplet,
  bruxism: Brain,
  breathing: Activity,
  meditation: Moon,
  oral_take: Pill,
  todo: Sparkles,
};

export default function CoachWidget({ onOpen, autoHide = true }: CoachWidgetProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const { briefing, hydrated } = useCoach();
  if (!hydrated || !briefing) return null;

  const topAction = briefing.actions[0] ?? null;
  const isFlare = briefing.mode.startsWith('flare');
  const accent = isFlare ? '#ff6b6b' : SUNRISE.rise2;

  // Auto-hide: si modo normal + sin acciones críticas/atrasadas + sin warnings, no mostrar.
  if (autoHide && !isFlare && briefing.warnings.length === 0) {
    const hasUrgent = briefing.actions.some(
      a => a.priority === 'critical' || a.urgency === 'overdue',
    );
    if (!hasUrgent) return null;
  }

  const brushing = briefing.status.find(s => s.id === 'brushing');
  const water = briefing.status.find(s => s.id === 'water');
  const Icon = topAction ? ACTION_ICON[topAction.kind] ?? Activity : Sparkles;

  return (
    <button
      type="button"
      onClick={() => { haptics.tap(); onOpen(); }}
      className="w-full text-left rounded-2xl p-3.5 flex items-start gap-3 transition-transform active:scale-[0.98]"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.predawn2, 0.7)}, ${hexToRgba(SUNRISE.night, 0.8)})`,
        border: `1px solid ${hexToRgba(accent, 0.4)}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isFlare
          ? `0 14px 40px -18px ${hexToRgba(accent, 0.5)}`
          : `0 14px 40px -22px ${hexToRgba(SUNRISE.night, 0.7)}`,
      }}
    >
      <span
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(accent, 0.16),
          border: `1px solid ${hexToRgba(accent, 0.45)}`,
          color: accent,
        }}
      >
        <Icon size={18} strokeWidth={1.7} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span
            className="font-ui text-[9px] tracking-[0.32em] uppercase px-1.5 py-0.5 rounded-full"
            style={{
              background: hexToRgba(accent, 0.18),
              color: accent,
              border: `1px solid ${hexToRgba(accent, 0.45)}`,
            }}
          >
            Coach · {modeShort(briefing.mode)}
          </span>
          {briefing.warnings.length > 0 && (
            <span
              className="font-ui text-[9px] tracking-[0.28em] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: hexToRgba('#ffb44d', 0.18),
                color: '#ffb44d',
                border: `1px solid ${hexToRgba('#ffb44d', 0.45)}`,
              }}
            >
              {briefing.warnings.length} avisos
            </span>
          )}
        </div>
        {topAction ? (
          <>
            <div
              className="font-ui text-[12.5px] font-[500] leading-snug truncate"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              {topAction.title}
            </div>
            <div
              className="font-ui text-[10.5px] mt-0.5 truncate"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              {brushing && `Cepillado ${brushing.value}`}
              {brushing && water && ' · '}
              {water && `Agua ${water.value}`}
            </div>
          </>
        ) : (
          <div
            className="font-ui text-[12px] leading-snug"
            style={{ color: SUNRISE_TEXT.soft }}
          >
            Todo en orden hoy. Toca para revisar tu rutina.
          </div>
        )}
      </div>

      <ChevronRight
        size={16}
        strokeWidth={1.85}
        style={{ color: SUNRISE_TEXT.muted, marginTop: 8, flexShrink: 0 }}
      />
    </button>
  );
}

function modeShort(mode: string): string {
  switch (mode) {
    case 'normal': return 'Normal';
    case 'acne_treatment': return 'Deriva-C';
    case 'flare_strong': return 'Brote severo';
    case 'flare_mild': return 'Brote leve';
    case 'recovery': return 'Recovery';
    default: return mode;
  }
}
