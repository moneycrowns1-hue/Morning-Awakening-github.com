'use client';

// ═══════════════════════════════════════════════════════
// SettingsScreen · full-screen replacement for SettingsModal
//
// Sunrise-themed, scrollable. Groups:
//   - Operator: voz on/off, volumen master.
//   - Dispositivo: haptics on/off, reduce-motion note.
//   - Datos: exportar historial (JSON), reiniciar progreso.
//   - Acerca: versión, créditos.
// ═══════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Bell, ChevronLeft, Download, RotateCcw } from 'lucide-react';
import GradientBackground from './GradientBackground';
import { haptics } from '@/lib/haptics';
import { loadSessions } from '@/lib/sessionHistory';
import {
  disableReminder,
  enableReminder,
  loadConfig as loadReminderConfig,
  permissionStatus,
  type ReminderConfig,
} from '@/lib/morningReminder';

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
  const [hapticsOn, setHapticsOn] = useState<boolean>(haptics.isEnabled());
  const [reminder, setReminder] = useState<ReminderConfig>({ enabled: false, hour: 5, minute: 0 });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // Hydrate reminder config + permission state on mount (client-only).
  useEffect(() => {
    setReminder(loadReminderConfig());
    setPermission(permissionStatus());
  }, []);

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
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      <GradientBackground stage="welcome" particleCount={30} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={onClose}
          aria-label="Volver"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: 'var(--sunrise-text-soft)' }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.38em]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Morning Awakening
          </span>
          <span className="font-display italic font-[400] text-[22px] leading-none mt-1" style={{ color: 'var(--sunrise-text)' }}>
            Ajustes
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 px-5 flex flex-col gap-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)', paddingTop: '0.5rem' }}
      >
        {/* Operator */}
        <SettingsGroup title="Operator">
          <ToggleRow
            label="Voz del narrador"
            hint="Briefing al inicio de cada fase"
            value={voiceEnabled}
            onChange={(on) => { haptics.tap(); onToggleVoice(on); }}
          />
          <div className="h-px w-full" style={{ background: 'rgba(255,250,240,0.06)' }} />
          <SliderRow
            label="Volumen master"
            value={masterVolume}
            onChange={onVolumeChange}
            display={`${Math.round(masterVolume * 100)}%`}
          />
        </SettingsGroup>

        {/* Recordatorio matutino */}
        <SettingsGroup title="Recordatorio">
          <ToggleRow
            label="Aviso matutino"
            hint={
              permission === 'unsupported'
                ? 'Este navegador no soporta notificaciones'
                : permission === 'denied'
                  ? 'Permiso denegado · habilita notificaciones en ajustes del navegador'
                  : 'Notificación diaria a la hora elegida'
            }
            value={reminder.enabled && permission === 'granted'}
            onChange={handleToggleReminder}
          />
          {reminder.enabled && permission === 'granted' && (
            <>
              <div className="h-px w-full" style={{ background: 'rgba(255,250,240,0.06)' }} />
              <TimePickerRow
                hour={reminder.hour}
                minute={reminder.minute}
                onChange={handleTimeChange}
              />
            </>
          )}
          {permission !== 'granted' && reminder.enabled === false && (
            <div
              className="px-4 pb-4 -mt-2 font-ui text-[10px] leading-relaxed"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              <span style={{ color: 'var(--sunrise-text-soft)' }}>Tip iPad: </span>
              instala la app al home screen (Compartir → Añadir a inicio) para que el aviso funcione con la pantalla bloqueada.
            </div>
          )}
        </SettingsGroup>

        {/* Dispositivo */}
        <SettingsGroup title="Dispositivo">
          <ToggleRow
            label="Vibración táctil"
            hint="Feedback al interactuar (solo Android)"
            value={hapticsOn}
            onChange={handleToggleHaptics}
          />
        </SettingsGroup>

        {/* Datos */}
        <SettingsGroup title="Datos">
          <ActionRow
            label="Exportar historial"
            hint="Descargar sesiones como JSON"
            icon={<Download size={16} strokeWidth={1.8} />}
            onClick={handleExport}
          />
          <div className="h-px w-full" style={{ background: 'rgba(255,250,240,0.06)' }} />
          <ActionRow
            label="Reiniciar progreso"
            hint="Borra perfil, racha y sesiones"
            icon={<RotateCcw size={16} strokeWidth={1.8} />}
            onClick={handleReset}
            destructive
          />
        </SettingsGroup>

        {/* Acerca */}
        <SettingsGroup title="Acerca">
          <div className="flex flex-col gap-2 px-4 py-4">
            <div className="flex justify-between font-ui text-[13px]">
              <span style={{ color: 'var(--sunrise-text-soft)' }}>Versión</span>
              <span className="font-mono" style={{ color: 'var(--sunrise-text)' }}>8.0-α3</span>
            </div>
            <div className="flex justify-between font-ui text-[13px]">
              <span style={{ color: 'var(--sunrise-text-soft)' }}>Protocolo</span>
              <span className="font-mono" style={{ color: 'var(--sunrise-text)' }}>13 fases · 1h 50m</span>
            </div>
            <p
              className="mt-3 font-ui text-[11px] leading-relaxed"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Protocolo Génesis: 110 minutos en tres bloques (fragua oscura · ventana anabólica · filo cognitivo) y el anclaje final. Diseñado para ejecutarse entre 5:00 y 6:50 AM.
            </p>
          </div>
        </SettingsGroup>
      </div>
    </div>
  );
}

// ═══ small building blocks ═════════════════════════════

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sunrise-fade-up">
      <div
        className="font-ui text-[10px] uppercase tracking-[0.38em] mb-2 px-1"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {title}
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(255,250,240,0.08)',
          background: 'rgba(255,250,240,0.03)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: { label: string; hint?: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-4 cursor-pointer">
      <div className="min-w-0">
        <div className="font-ui text-[14px] font-[500]" style={{ color: 'var(--sunrise-text)' }}>
          {label}
        </div>
        {hint && (
          <div className="font-ui text-[11px] mt-0.5" style={{ color: 'var(--sunrise-text-muted)' }}>
            {hint}
          </div>
        )}
      </div>
      <span
        className="shrink-0 w-11 h-6 rounded-full p-[3px] transition-colors"
        style={{ background: value ? 'var(--sunrise-rise-2, #f4c267)' : 'rgba(255,250,240,0.12)' }}
      >
        <span
          className="block w-[18px] h-[18px] rounded-full transition-transform"
          style={{
            background: value ? '#0b0618' : 'rgba(255,250,240,0.75)',
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
  // Native <input type="time"> is the right call here: on iOS it
  // surfaces the wheel picker which is the best UX for this, and on
  // desktop / Android it's a clean 24h input. Value is "HH:MM".
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            color: 'var(--sunrise-rise-2, #f4c267)',
            background: 'rgba(244,194,103,0.12)',
            border: '1px solid rgba(244,194,103,0.35)',
          }}
        >
          <Bell size={14} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <div className="font-ui text-[14px] font-[500]" style={{ color: 'var(--sunrise-text)' }}>
            Hora
          </div>
          <div className="font-ui text-[11px] mt-0.5" style={{ color: 'var(--sunrise-text-muted)' }}>
            Se repite cada día
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
        className="font-mono text-[15px] px-3 py-1.5 rounded-lg focus:outline-none"
        style={{
          background: 'rgba(5,3,15,0.55)',
          border: '1px solid rgba(255,250,240,0.12)',
          color: 'var(--sunrise-text)',
          colorScheme: 'dark',
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
  return (
    <div className="px-4 py-4">
      <div className="flex justify-between items-center mb-2">
        <div className="font-ui text-[14px] font-[500]" style={{ color: 'var(--sunrise-text)' }}>
          {label}
        </div>
        <div className="font-mono text-[11px]" style={{ color: 'var(--sunrise-text-muted)' }}>
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
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors active:bg-white/5"
    >
      {icon && (
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            color: destructive ? '#ff6b6b' : 'var(--sunrise-text-soft)',
            background: 'rgba(255,250,240,0.05)',
            border: '1px solid rgba(255,250,240,0.08)',
          }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div
          className="font-ui text-[14px] font-[500]"
          style={{ color: destructive ? '#ff6b6b' : 'var(--sunrise-text)' }}
        >
          {label}
        </div>
        {hint && (
          <div className="font-ui text-[11px] mt-0.5" style={{ color: 'var(--sunrise-text-muted)' }}>
            {hint}
          </div>
        )}
      </div>
    </button>
  );
}
