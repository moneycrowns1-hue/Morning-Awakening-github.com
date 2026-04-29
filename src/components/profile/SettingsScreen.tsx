'use client';

// ═══════════════════════════════════════════════════════════
// SettingsScreen · ajustes editorial.
//
// Diseño · poppr/jeton/craftsmen showcase con paleta de día:
//   - Header masthead · dot accent + caption.
//   - Hairline 1px decorativo.
//   - Hero "ajustes." big lowercase con punto accent.
//   - Section dividers newspaper `─ · OPERATOR · ─` etc.
//   - Cards rounded-22 glass por grupo.
//   - Toggle / Slider / Action / TimePicker / Palette rows.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Bell, ChevronLeft, Download, RotateCcw, Sun } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import NightPalettePicker from '../common/NightPalettePicker';
import { haptics } from '@/lib/common/haptics';
import { loadSessions } from '@/lib/genesis/sessionHistory';
import {
  disableReminder,
  enableReminder,
  loadConfig as loadReminderConfig,
  permissionStatus,
  type ReminderConfig,
} from '@/lib/alarm/morningReminder';
import {
  isNucleusEnabled,
  setNucleusEnabled,
  scheduleNucleusPings,
  cancelNucleusPings,
  requestNucleusPermission,
  isSkippedToday,
  setSkipToday,
  permissionStatus as nucleusPermissionStatus,
} from '@/lib/nucleus/nucleusPings';

interface SettingsScreenProps {
  voiceEnabled: boolean;
  masterVolume: number;
  onToggleVoice: (on: boolean) => void;
  onVolumeChange: (v: number) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export default function SettingsScreen({
  voiceEnabled,
  masterVolume,
  onToggleVoice,
  onVolumeChange,
  onResetProgress,
  onClose,
}: SettingsScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const [hapticsOn, setHapticsOn] = useState<boolean>(haptics.isEnabled());
  const [reminder, setReminder] = useState<ReminderConfig>({ enabled: false, hour: 5, minute: 0 });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [nucleusOn, setNucleusOn] = useState<boolean>(false);
  const [nucleusPerm, setNucleusPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [skipToday, setSkipTodayState] = useState<boolean>(false);

  useEffect(() => {
    setReminder(loadReminderConfig());
    setPermission(permissionStatus());
    setNucleusOn(isNucleusEnabled());
    setNucleusPerm(nucleusPermissionStatus());
    setSkipTodayState(isSkippedToday());
  }, []);

  const handleToggleNucleus = async (on: boolean) => {
    haptics.tap();
    if (on) {
      const granted = await requestNucleusPermission();
      setNucleusPerm(granted);
      if (granted !== 'granted') return;
      setNucleusEnabled(true);
      setNucleusOn(true);
      await scheduleNucleusPings();
    } else {
      setNucleusEnabled(false);
      setNucleusOn(false);
      await cancelNucleusPings();
    }
  };

  const handleToggleSkip = async (on: boolean) => {
    haptics.tap();
    setSkipToday(on);
    setSkipTodayState(on);
    if (on) await cancelNucleusPings();
    else if (nucleusOn) await scheduleNucleusPings();
  };

  const handleToggleReminder = async (on: boolean) => {
    haptics.tap();
    if (on) {
      const ok = await enableReminder(reminder.hour, reminder.minute);
      if (ok) {
        setReminder({ ...reminder, enabled: true });
        setPermission('granted');
      } else {
        setPermission(permissionStatus());
      }
    } else {
      await disableReminder();
      setReminder({ ...reminder, enabled: false });
    }
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    const next = { ...reminder, hour, minute };
    setReminder(next);
    if (next.enabled) await enableReminder(hour, minute);
  };

  const handleToggleHaptics = (on: boolean) => {
    haptics.setEnabled(on);
    setHapticsOn(on);
    if (on) haptics.tick();
  };

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), sessions: loadSessions() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morning-awakening-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    haptics.tick();
  };

  const handleReset = () => {
    if (typeof window !== 'undefined' && window.confirm(
      '¿Seguro que quieres borrar tu progreso? Se perderán perfil, racha e historial. Esta acción no se puede deshacer.',
    )) {
      haptics.warn();
      onResetProgress();
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: DT.primary, background: D.paper }}
    >
      {/* Soft warm radial */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.08)} 0%, transparent 55%)`,
        }}
      />

      {/* ─── Header · masthead ────────── */}
      <div
        className="relative z-10 px-5 md:px-8 shrink-0 max-w-3xl w-full mx-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Volver"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: DT.muted }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: D.accent,
                borderRadius: 99,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              perfil · ajustes
            </span>
          </button>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            v8.0—α3
          </span>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }} />
      </div>

      {/* ─── Body ──────────────────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Top corners */}
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className="font-mono tabular-nums font-[600]"
              style={{ color: DT.primary, fontSize: 13, letterSpacing: '0.02em' }}
            >
              ⚙
              <span style={{ color: D.accent }}>.</span>
            </span>
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              · configuración ·
            </span>
          </div>

          {/* Hero · "ajustes." */}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em] mt-3"
            style={{
              color: DT.primary,
              fontSize: 'clamp(2.6rem, 11vw, 4.5rem)',
              lineHeight: 0.92,
            }}
          >
            ajustes
            <span style={{ color: D.accent }}>.</span>
          </h1>

          {/* Operator */}
          <SectionHeader N={D} NT={DT}>· operator ·</SectionHeader>
          <SettingsCard>
            <ToggleRow
              label="voz del narrador"
              hint="briefing al inicio de cada fase"
              value={voiceEnabled}
              onChange={(on) => { haptics.tap(); onToggleVoice(on); }}
            />
            <Hairline />
            <SliderRow
              label="volumen master"
              value={masterVolume}
              onChange={onVolumeChange}
              display={`${Math.round(masterVolume * 100)}%`}
            />
          </SettingsCard>

          {/* Recordatorio matutino */}
          <SectionHeader N={D} NT={DT}>· recordatorio ·</SectionHeader>
          <SettingsCard>
            <ToggleRow
              label="aviso matutino"
              hint={
                permission === 'unsupported'
                  ? 'este navegador no soporta notificaciones'
                  : permission === 'denied'
                  ? 'permiso denegado · habilita en ajustes del navegador'
                  : 'notificación diaria a la hora elegida'
              }
              value={reminder.enabled && permission === 'granted'}
              onChange={handleToggleReminder}
            />
            {reminder.enabled && permission === 'granted' && (
              <>
                <Hairline />
                <TimePickerRow
                  hour={reminder.hour}
                  minute={reminder.minute}
                  onChange={handleTimeChange}
                />
              </>
            )}
            {permission !== 'granted' && reminder.enabled === false && (
              <div
                className="px-4 pb-4 -mt-2 font-ui leading-relaxed"
                style={{ color: DT.muted, fontSize: 10.5 }}
              >
                <span style={{ color: DT.soft, fontWeight: 600 }}>tip iPad: </span>
                instala la app al home screen (compartir → añadir a inicio) para que el aviso funcione con la pantalla bloqueada.
              </div>
            )}
          </SettingsCard>

          {/* NUCLEUS · Día */}
          <SectionHeader N={D} NT={DT}>· NUCLEUS · día ·</SectionHeader>
          <SettingsCard>
            <ToggleRow
              label="pings de micro-hábitos"
              hint={
                nucleusPerm === 'unsupported'
                  ? 'notificaciones no soportadas'
                  : nucleusPerm === 'denied'
                  ? 'permiso denegado · habilita en ajustes del navegador'
                  : 'café · 20-20-20 · retracciones · NSDR · optic flow'
              }
              value={nucleusOn && nucleusPerm === 'granted'}
              onChange={handleToggleNucleus}
            />
            <Hairline />
            <ToggleRow
              label="pausar NUCLEUS hoy"
              hint="sin pings · útil para días anómalos"
              value={skipToday}
              onChange={handleToggleSkip}
            />
            <div
              className="px-4 pb-4 pt-1 font-ui leading-relaxed"
              style={{ color: DT.muted, fontSize: 10.5 }}
            >
              <Sun size={12} strokeWidth={1.8} className="inline-block mr-1 -mt-0.5" style={{ color: D.accent }} />
              <span style={{ color: DT.soft, fontWeight: 600 }}>horario: </span>
              06:50 → 18:00 · sáb/dom: ARENA y PRE-ARENA en off automático.
            </div>
          </SettingsCard>

          {/* Dispositivo */}
          <SectionHeader N={D} NT={DT}>· dispositivo ·</SectionHeader>
          <SettingsCard>
            <ToggleRow
              label="vibración táctil"
              hint="feedback al interactuar (solo Android)"
              value={hapticsOn}
              onChange={handleToggleHaptics}
            />
          </SettingsCard>

          {/* Apariencia · paleta · disponible también desde el header de inicio */}
          <SectionHeader N={D} NT={DT}>· apariencia ·</SectionHeader>
          <SettingsCard>
            <div className="px-4 py-4">
              <p
                className="font-ui leading-[1.55] mb-3"
                style={{ color: DT.soft, fontSize: 12 }}
              >
                Modo claro / oscuro y selector de paleta también disponibles en el header de inicio para acceso rápido.
              </p>
              <NightPalettePicker mode="inline" caption="· paleta · global ·" />
            </div>
          </SettingsCard>

          {/* Datos */}
          <SectionHeader N={D} NT={DT}>· datos ·</SectionHeader>
          <SettingsCard>
            <ActionRow
              label="exportar historial"
              hint="descargar sesiones como JSON"
              icon={<Download size={16} strokeWidth={1.8} />}
              onClick={handleExport}
            />
            <Hairline />
            <ActionRow
              label="reiniciar progreso"
              hint="borra perfil · racha · sesiones"
              icon={<RotateCcw size={16} strokeWidth={1.8} />}
              onClick={handleReset}
              destructive
            />
          </SettingsCard>

          {/* Acerca */}
          <SectionHeader N={D} NT={DT}>· acerca ·</SectionHeader>
          <SettingsCard>
            <div className="flex flex-col gap-2 px-4 py-4">
              <InfoRow label="versión" value="8.0—α3" />
              <Hairline tight />
              <InfoRow label="protocolo" value="13 fases · 1h 50m" />
              <p
                className="mt-3 font-ui leading-relaxed"
                style={{ color: DT.muted, fontSize: 10.5 }}
              >
                Protocolo Génesis: 110 minutos en tres bloques (fragua oscura · ventana anabólica · filo cognitivo) y el anclaje final. Diseñado para ejecutarse entre 5:00 y 6:50 AM.
              </p>
            </div>
          </SettingsCard>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

// ═══ small building blocks ═════════════════════════════

interface PaletteProps {
  N: ReturnType<typeof useAppTheme>['day'];
  NT: ReturnType<typeof useAppTheme>['dayText'];
}

function SectionHeader({ children, N }: { children: React.ReactNode } & PaletteProps) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-3">
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.accent, 0.18) }}
      />
      <span
        className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
        style={{ color: hexToRgba(N.accent, 0.85), fontSize: 9 }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.accent, 0.18) }}
      />
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const { day: D } = useAppTheme();
  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 22,
        border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
        background: hexToRgba(D.tint, 0.7),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </div>
  );
}

function Hairline({ tight }: { tight?: boolean }) {
  const { day: D } = useAppTheme();
  return (
    <div
      className="w-full"
      style={{
        height: 1,
        marginTop: tight ? 4 : 0,
        marginBottom: tight ? 4 : 0,
        background: hexToRgba(D.accent, 0.12),
      }}
    />
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: { label: string; hint?: string; value: boolean; onChange: (on: boolean) => void }) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-4 cursor-pointer">
      <div className="min-w-0">
        <div
          className="font-headline font-[600] lowercase tracking-[-0.015em]"
          style={{ color: DT.primary, fontSize: 15 }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="mt-1 font-mono uppercase tracking-[0.22em] font-[600] leading-tight"
            style={{ color: DT.muted, fontSize: 9.5 }}
          >
            {hint}
          </div>
        )}
      </div>
      <span
        className="shrink-0 w-12 h-7 rounded-full p-[3px] transition-colors"
        style={{
          background: value ? D.accent : hexToRgba(D.ink, 0.14),
          boxShadow: value ? `0 4px 12px -2px ${hexToRgba(D.accent, 0.4)}` : 'none',
        }}
      >
        <span
          className="block w-[22px] h-[22px] rounded-full transition-transform"
          style={{
            background: value ? D.paper : hexToRgba(D.ink, 0.4),
            transform: value ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function TimePickerRow({
  hour,
  minute,
  onChange,
}: { hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  const { day: D, dayText: DT } = useAppTheme();
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{
            color: D.accent,
            background: hexToRgba(D.accent, 0.14),
            border: `1px solid ${hexToRgba(D.accent, 0.4)}`,
            borderRadius: 10,
          }}
        >
          <Bell size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div
            className="font-headline font-[600] lowercase tracking-[-0.015em]"
            style={{ color: DT.primary, fontSize: 15 }}
          >
            hora
          </div>
          <div
            className="mt-1 font-mono uppercase tracking-[0.22em] font-[600]"
            style={{ color: DT.muted, fontSize: 9.5 }}
          >
            se repite cada día
          </div>
        </div>
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map((s) => parseInt(s, 10));
          if (!Number.isNaN(h) && !Number.isNaN(m)) onChange(h, m);
        }}
        className="font-mono px-3 py-1.5 focus:outline-none tabular-nums font-[700]"
        style={{
          background: hexToRgba(D.accent, 0.16),
          border: `1px solid ${hexToRgba(D.accent, 0.45)}`,
          color: D.accent_deep,
          fontSize: 14,
          borderRadius: 10,
        }}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  display,
}: { label: string; value: number; onChange: (v: number) => void; display: string }) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <div className="px-4 py-4">
      <div className="flex justify-between items-baseline mb-2.5">
        <div
          className="font-headline font-[600] lowercase tracking-[-0.015em]"
          style={{ color: DT.primary, fontSize: 15 }}
        >
          {label}
        </div>
        <div
          className="font-mono tabular-nums font-[700]"
          style={{ color: D.accent, fontSize: 13 }}
        >
          {display}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full sunrise-slider"
      />
    </div>
  );
}

function ActionRow({
  label,
  hint,
  icon,
  onClick,
  destructive,
}: { label: string; hint?: string; icon?: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  const { day: D, dayText: DT } = useAppTheme();
  const danger = '#c44a3c';
  const accent = destructive ? danger : D.accent;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-70"
    >
      {icon && (
        <span
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{
            color: accent,
            background: hexToRgba(accent, 0.14),
            border: `1px solid ${hexToRgba(accent, 0.4)}`,
            borderRadius: 10,
          }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div
          className="font-headline font-[600] lowercase tracking-[-0.015em]"
          style={{ color: destructive ? danger : DT.primary, fontSize: 15 }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="mt-1 font-mono uppercase tracking-[0.22em] font-[600]"
            style={{ color: DT.muted, fontSize: 9.5 }}
          >
            {hint}
          </div>
        )}
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { dayText: DT } = useAppTheme();
  return (
    <div className="flex justify-between items-center">
      <span
        className="font-mono uppercase tracking-[0.32em] font-[600]"
        style={{ color: DT.soft, fontSize: 10 }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular-nums font-[700]"
        style={{ color: DT.primary, fontSize: 12.5 }}
      >
        {value}
      </span>
    </div>
  );
}
