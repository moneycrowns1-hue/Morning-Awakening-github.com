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

import { useState } from 'react';
import { ChevronLeft, Download, RotateCcw } from 'lucide-react';
import GradientBackground from './GradientBackground';
import { haptics } from '@/lib/haptics';
import { loadSessions } from '@/lib/sessionHistory';

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
              <span className="font-mono" style={{ color: 'var(--sunrise-text)' }}>12 fases · 1h 45m</span>
            </div>
            <p
              className="mt-3 font-ui text-[11px] leading-relaxed"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Un protocolo matutino de 105 minutos estructurado en tres bloques: ignición, ventana anabólica y filo cognitivo. Construido para ejecutarse entre 5:00 y 6:45 AM.
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
