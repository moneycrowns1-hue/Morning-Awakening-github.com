'use client';

// ═══════════════════════════════════════════════════════════
// RemindersPanel · sección "Próximos avisos" del CoachScreen.
//
// Tres estados visuales:
//   · permission === 'default' o 'denied'/'unsupported' sin
//     reminders → no renderiza nada (el coach ya muestra
//     acciones críticas; no queremos ruido).
//   · permission === 'default' Y hay reminders en cola →
//     CTA "Activar avisos" para iOS PWA.
//   · permission === 'granted' Y hay reminders → lista compacta
//     con relativa + clock.
// ═══════════════════════════════════════════════════════════

import { Bell, BellOff, Clock, Clock4, X, ArrowUpRight } from 'lucide-react';
import {
  type CoachReminder,
  reminderClockLabel,
  reminderRelativeLabel,
} from '@/lib/coach/reminders';
import type { NotifPermission } from '@/lib/common/notifications';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';

interface RemindersPanelProps {
  reminders: CoachReminder[];
  permission: NotifPermission;
  firedIds: Set<string>;
  onRequestPermission: () => void;
  onSnooze: (id: string, minutes?: number) => void;
  onDismiss: (id: string) => void;
}

const KIND_ICON_LABEL: Record<CoachReminder['kind'], { label: string }> = {
  brushing: { label: 'Cepillado' },
  water: { label: 'Hidratación' },
  spf_window_close: { label: 'Cierre AM · SPF' },
  skincare_pm: { label: 'Skincare PM' },
  pill: { label: 'Pastilla' },
  flare_step: { label: 'Brote · paso' },
};

export default function RemindersPanel({
  reminders,
  permission,
  firedIds,
  onRequestPermission,
  onSnooze,
  onDismiss,
}: RemindersPanelProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const hasReminders = reminders.length > 0;

  // No renderizar si no hay nada que decir.
  if (!hasReminders && permission !== 'default') return null;

  // CTA para pedir permiso · estilo hero card dorado-filled (acorde a HeroActionCard).
  if (permission === 'default' && hasReminders) {
    return (
      <button
        type="button"
        onClick={() => { haptics.tap(); onRequestPermission(); }}
        className="w-full text-left transition-transform active:scale-[0.99]"
        style={{
          background: SUNRISE.rise2,
          color: SUNRISE.night,
          padding: '16px 18px 14px',
          borderRadius: 24,
          boxShadow: `0 14px 32px -12px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
        }}
      >
        {/* Top row · icon kicker + arrow */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: hexToRgba(SUNRISE.night, 0.16) }}
            >
              <Bell size={13} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
            </span>
            <span
              className="font-ui text-[10px] tracking-[0.32em] uppercase font-[700] truncate"
              style={{ color: SUNRISE.night, opacity: 0.7 }}
            >
              notificaciones
            </span>
          </div>
          <ArrowUpRight
            size={18}
            strokeWidth={2.4}
            style={{ color: SUNRISE.night, flexShrink: 0 }}
          />
        </div>

        {/* Big title */}
        <div
          className="font-headline font-[700] leading-[0.95] lowercase tracking-[-0.02em]"
          style={{
            fontSize: 'clamp(1.55rem, 6vw, 1.9rem)',
            color: SUNRISE.night,
          }}
        >
          activar avisos
        </div>

        {/* Body */}
        <p
          className="font-mono text-[11.5px] leading-[1.4] mt-2"
          style={{ color: SUNRISE.night, opacity: 0.72 }}
        >
          {reminders.length} recordatorio{reminders.length === 1 ? '' : 's'} en cola
          para hoy. Permití notificaciones para que la app te avise aunque
          esté cerrada.
        </p>

        {/* Bottom row · contexto + cta */}
        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.night, 0.2)}` }}
        >
          <span
            className="font-ui text-[10px] tracking-[0.3em] uppercase font-[700]"
            style={{ color: SUNRISE.night, opacity: 0.65 }}
          >
            ios pwa · safari
          </span>
          <span
            className="font-ui text-[11px] tracking-[0.3em] uppercase font-[700]"
            style={{ color: SUNRISE.night }}
          >
            permitir →
          </span>
        </div>
      </button>
    );
  }

  if (!hasReminders) return null;

  // Lista compacta — máximo 4 items.
  const visible = reminders.slice(0, 4);
  const denied = permission === 'denied' || permission === 'unsupported';

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
      <div className="px-4 py-2.5 flex items-center gap-2">
        <Bell size={12} strokeWidth={1.85} style={{ color: SUNRISE.rise2 }} />
        <span
          className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Próximos avisos · {reminders.length}
        </span>
        {denied && (
          <span
            className="ml-auto inline-flex items-center gap-1 font-ui text-[8.5px] tracking-[0.24em] uppercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            <BellOff size={10} strokeWidth={1.85} /> Solo in-app
          </span>
        )}
      </div>
      <div
        className="flex flex-col"
        style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}` }}
      >
        {visible.map(r => {
          const fired = firedIds.has(r.id);
          return (
            <div
              key={r.id}
              className="px-4 py-2.5 flex flex-col gap-2"
              style={{
                borderBottom: `1px solid ${hexToRgba(SUNRISE.rise2, 0.08)}`,
                opacity: fired ? 0.55 : 1,
              }}
            >
            <div className="flex items-start gap-3">
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: hexToRgba(SUNRISE.rise2, 0.14),
                  color: SUNRISE.rise2,
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
                }}
              >
                <Clock size={12} strokeWidth={1.85} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[11.5px] leading-tight"
                    style={{ color: SUNRISE_TEXT.primary }}
                  >
                    {r.title}
                  </span>
                  <span
                    className="font-ui text-[8.5px] tracking-[0.28em] uppercase"
                    style={{ color: SUNRISE_TEXT.muted }}
                  >
                    {KIND_ICON_LABEL[r.kind].label}
                  </span>
                </div>
                <p
                  className="font-mono text-[10.5px] leading-snug mt-0.5"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  {r.body}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-headline font-[700] text-[16px] leading-none lowercase tracking-[-0.01em] tabular-nums"
                  style={{ color: fired ? SUNRISE_TEXT.muted : SUNRISE.rise2 }}
                >
                  {reminderClockLabel(r)}
                </div>
                <div
                  className="font-mono text-[9.5px] tracking-wider mt-0.5"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  {fired ? 'enviado' : reminderRelativeLabel(r)}
                </div>
              </div>
            </div>
            {!fired && (
              <div className="flex items-center gap-1.5 pl-10">
                <ChipButton
                  label="+30 min"
                  icon={<Clock4 size={11} strokeWidth={1.85} />}
                  onClick={() => { haptics.tick(); onSnooze(r.id, 30); }}
                />
                <ChipButton
                  label="Posponer 2 h"
                  icon={<Clock4 size={11} strokeWidth={1.85} />}
                  onClick={() => { haptics.tick(); onSnooze(r.id, 120); }}
                />
                <ChipButton
                  label="Descartar"
                  icon={<X size={11} strokeWidth={1.85} />}
                  variant="danger"
                  onClick={() => { haptics.tick(); onDismiss(r.id); }}
                />
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChipButton({
  label,
  icon,
  onClick,
  variant = 'default',
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const isDanger = variant === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-transform active:scale-[0.96]"
      style={{
        background: isDanger
          ? hexToRgba('#ff6b6b', 0.1)
          : hexToRgba(SUNRISE.night, 0.5),
        border: `1px solid ${
          isDanger ? hexToRgba('#ff6b6b', 0.3) : hexToRgba(SUNRISE.rise2, 0.18)
        }`,
        color: isDanger ? '#ff6b6b' : SUNRISE_TEXT.soft,
      }}
    >
      {icon}
      <span className="font-ui text-[9px] tracking-[0.18em] uppercase">{label}</span>
    </button>
  );
}
