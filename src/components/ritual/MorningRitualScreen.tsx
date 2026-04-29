'use client';

// ═══════════════════════════════════════════════════════════
// MorningRitualScreen · pantalla de configuración del ritual
// matutino. Reemplaza al antiguo `AlarmScreen`.
//
// Diseño · masthead editorial NightMissionPhase (igual que el
// AlarmScreen original, para mantener identidad visual):
//   · Top folio dot ámbar + caption "soporte · ritual".
//   · Hero · time picker grande + halo ámbar pulsante.
//   · Timeline ramp → peak → wakeup (sin reaseguro).
//   · PillSelector hairline para ramp.
//   · Slider para peak volume.
//   · Toggle "encadenar a Génesis".
//   · Estado del push notification + permisos.
//   · Botón "probar mi ritual" (6 s preview).
//   · Botón "comenzar ritual ahora" (gesto que arranca el
//     audio realmente).
//
// La diferencia conceptual clave vs el original: ya no hay
// sección "días activos" (irrelevante), no hay "reaseguro"
// (la confianza viene del push, no del tiempo), no hay test
// de 1 min (cada arranque ES el test), no hay "honesty card"
// sobre dejar la app abierta (el flujo nuevo no la necesita).
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, ChevronLeft, Play, Sun, Sparkles, Info } from 'lucide-react';
import { haptics } from '@/lib/common/haptics';
import {
  formatTargetHHMM,
  type RitualConfig,
  type RitualVoiceTone,
} from '@/lib/ritual/ritualSchedule';
import { prefetchRitualAudio, type PreviewResult } from '@/lib/ritual/ritualEngine';
import { permissionStatus, requestPermission } from '@/lib/ritual/morningPing';
import { hexToRgba } from '@/lib/common/theme';
import { useNightPalette } from '@/lib/night/nightPalette';

interface MorningRitualScreenProps {
  config: RitualConfig;
  onChange: (next: RitualConfig) => void;
  onPreview: () => Promise<PreviewResult>;
  onStartNow: () => void;
  onClose: () => void;
}

export default function MorningRitualScreen({
  config,
  onChange,
  onPreview,
  onStartNow,
  onClose,
}: MorningRitualScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();

  const [previewState, setPreviewState] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: PreviewResult }
  >({ status: 'idle' });

  const [notifPerm, setNotifPerm] =
    useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');

  useEffect(() => { setNotifPerm(permissionStatus()); }, []);
  useEffect(() => { void prefetchRitualAudio(); }, []);

  const rampMin = Math.round(config.rampSec / 60);
  const timeValue = formatTargetHHMM(config);

  // Timeline labels.
  const peak = useMemo(() => {
    const d = new Date();
    d.setHours(config.hour, config.minute, 0, 0);
    return d;
  }, [config.hour, config.minute]);
  const rampStart = useMemo(
    () => new Date(peak.getTime() - config.rampSec * 1000),
    [peak, config.rampSec],
  );
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const update = (patch: Partial<RitualConfig>) => {
    haptics.tick();
    onChange({ ...config, ...patch });
  };

  const handleToggleEnabled = () => {
    haptics.tick();
    const next = !config.enabled;
    onChange({ ...config, enabled: next });
    if (next) {
      void requestPermission().then((p) => setNotifPerm(p));
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* ─── Header · MASTHEAD ─────────────────────────────── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Volver"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: NT.muted }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            <span
              aria-hidden
              style={{
                width: 5, height: 5, background: N.amber, borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              soporte · ritual
            </span>
          </button>
          <button
            onClick={handleToggleEnabled}
            className="flex items-center gap-1.5 transition-opacity active:opacity-70"
            style={{
              padding: '6px 12px',
              background: config.enabled ? hexToRgba(N.amber, 0.14) : 'transparent',
              border: `1px solid ${config.enabled ? hexToRgba(N.amber, 0.55) : hexToRgba(N.amber, 0.18)}`,
              color: config.enabled ? N.amber : NT.muted,
            }}
          >
            {config.enabled ? <Bell size={11} strokeWidth={2.2} /> : <BellOff size={11} strokeWidth={2.2} />}
            <span className="font-mono uppercase tracking-[0.32em] font-[700]" style={{ fontSize: 9 }}>
              {config.enabled ? 'activo' : 'apagado'}
            </span>
          </button>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
      </div>

      {/* ─── Body scrolleable ───────────────────────────────── */}
      <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4 overflow-y-auto">
        {/* Hero · time display */}
        <div className="relative flex flex-col items-center justify-center py-6 mt-4">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${180 + rampMin * 8}px`,
              height: `${180 + rampMin * 8}px`,
              background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.32)} 0%, ${hexToRgba(N.candle, 0.1)} 40%, transparent 72%)`,
              filter: 'blur(8px)',
              opacity: config.enabled ? 1 : 0.3,
              transition: 'all 0.5s ease',
            }}
          />
          <label
            className="relative z-10 flex flex-col items-center cursor-pointer"
            htmlFor="ritual-time-input"
          >
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600] mb-2"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              hora del ritual
            </span>
            <h1
              className="font-headline font-[700] tabular-nums tracking-[-0.04em]"
              style={{
                color: NT.primary,
                fontSize: 'clamp(4rem, 14vw, 6rem)',
                lineHeight: 0.95,
                textShadow: config.enabled
                  ? `0 0 40px ${hexToRgba(N.amber, 0.42)}`
                  : 'none',
              }}
            >
              {timeValue}
              <span style={{ color: N.amber }}>.</span>
            </h1>
            <input
              id="ritual-time-input"
              type="time"
              value={timeValue}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map((s) => parseInt(s, 10));
                if (!Number.isNaN(h) && !Number.isNaN(m)) update({ hour: h, minute: m });
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
            <span
              className="font-mono uppercase tracking-[0.32em] font-[500] mt-2.5"
              style={{ color: hexToRgba(N.amber, 0.65), fontSize: 9 }}
            >
              · toca para cambiar ·
            </span>
          </label>
        </div>

        {/* ─── Cómo funciona · honesty short ─────────── */}
        <div
          className="mt-1 px-4 py-3 flex items-start gap-3"
          style={{
            border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            background: hexToRgba(N.amber, 0.04),
          }}
        >
          <Info size={13} strokeWidth={1.9} style={{ color: N.amber, marginTop: 2 }} />
          <p
            className="font-ui leading-[1.5]"
            style={{ color: NT.soft, fontSize: 11.5 }}
          >
            Tu alarma nativa de iOS te despierta como siempre. A esta hora,
            esta app te envía una notificación silenciosa. Cuando la abras,
            empezás tu ritual: ramp musical, voz de propósito, y enlace al
            protocolo Génesis si querés.
          </p>
        </div>

        {/* ─── Timeline ─────────────────────────────── */}
        <SectionHeader N={N} NT={NT}>flujo del ritual</SectionHeader>
        <div className="flex flex-col">
          <TimelineRow
            time={fmt(rampStart)}
            label="ramp musical empieza"
            hint={`Tycho · Sunrise Projector · ${rampMin} min fade in`}
            N={N}
            NT={NT}
          />
          <TimelineRow
            time={timeValue}
            label="peak · voz con propósito"
            hint="La música baja y entra la voz coach"
            highlight
            N={N}
            NT={NT}
          />
          <TimelineRow
            time="→"
            label={config.chainProtocol ? 'wakeup → Génesis' : 'wakeup'}
            hint={
              config.chainProtocol
                ? 'musica principal.mp3 · luego abre Génesis'
                : 'musica principal.mp3 cierra el ritual'
            }
            last
            N={N}
            NT={NT}
          />
        </div>

        {/* ─── Ramp duration ────────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          right={`${rampMin} min antes`}
          icon={<Sun size={11} strokeWidth={2.2} />}
        >
          ramp musical
        </SectionHeader>
        <PillSelector
          value={config.rampSec}
          options={[
            { label: '2m', value: 120 },
            { label: '5m', value: 300 },
            { label: '10m', value: 600 },
            { label: '15m', value: 900 },
            { label: '20m', value: 1200 },
          ]}
          onChange={(v) => update({ rampSec: v })}
          N={N}
          NT={NT}
        />
        <p
          className="font-ui text-[11.5px] leading-[1.55] mt-3"
          style={{ color: NT.muted }}
        >
          Sunrise Projector de Tycho subiendo desde el silencio hasta el peak.
          Si dormiste mal, la app puede alargarlo automáticamente.
        </p>

        {/* ─── Voice tone ──────────────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          icon={<Sparkles size={11} strokeWidth={2.2} />}
        >
          tono de la voz
        </SectionHeader>
        <PillSelector
          value={voiceToneToNum(config.voiceTone)}
          options={[
            { label: 'default', value: 0 },
            { label: 'gentle',  value: 1 },
            { label: 'calm',    value: 2 },
          ]}
          onChange={(v) => update({ voiceTone: numToVoiceTone(v) })}
          N={N}
          NT={NT}
        />
        <p
          className="font-ui text-[11.5px] leading-[1.55] mt-3"
          style={{ color: NT.muted }}
        >
          La app puede cambiar este tono automáticamente si detecta sueño
          insuficiente o stress alto, pero acá fijás el default.
        </p>

        {/* ─── Peak volume ──────────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          right={`${Math.round(config.peakVolume * 100)}%`}
          icon={<Play size={11} strokeWidth={2.2} />}
        >
          volumen peak
        </SectionHeader>
        <input
          type="range"
          min={0.3}
          max={1}
          step={0.05}
          value={config.peakVolume}
          onChange={(e) => update({ peakVolume: parseFloat(e.target.value) })}
          className="w-full sunrise-slider mt-1"
          aria-label="Volumen peak"
        />
        <p
          className="font-ui text-[11.5px] leading-[1.55] mt-3"
          style={{ color: NT.muted }}
        >
          Nivel máximo al que llega la rampa. El volumen del dispositivo
          también influye.
        </p>

        {/* ─── Chain to protocol toggle ─────────────── */}
        <SectionHeader N={N} NT={NT}>encadenar protocolo</SectionHeader>
        <button
          onClick={() => update({ chainProtocol: !config.chainProtocol })}
          className="w-full text-left py-3.5 flex items-center gap-4 transition-opacity active:opacity-70"
          style={{ borderBottom: `1px solid ${hexToRgba(N.amber, 0.1)}` }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: config.chainProtocol ? hexToRgba(N.amber, 0.18) : hexToRgba(N.amber, 0.06),
              border: `1px solid ${hexToRgba(N.amber, config.chainProtocol ? 0.5 : 0.18)}`,
              color: config.chainProtocol ? N.amber : NT.muted,
            }}
          >
            <Sun size={15} strokeWidth={1.9} />
          </span>
          <span className="flex-1 min-w-0">
            <span
              className="block font-headline font-[600] lowercase tracking-[-0.01em]"
              style={{ color: NT.primary, fontSize: 14 }}
            >
              encadenar a Génesis
            </span>
            <span
              className="block mt-0.5 font-ui leading-[1.5]"
              style={{ color: NT.muted, fontSize: 11 }}
            >
              Al cerrar el ritual, abre el protocolo matutino sin pasos extra.
            </span>
          </span>
          <ToggleVisual active={config.chainProtocol} N={N} />
        </button>

        {/* ─── Acciones ──────────────────────────────── */}
        <SectionHeader N={N} NT={NT}>acciones</SectionHeader>
        <div className="flex gap-2">
          <button
            onClick={() => {
              haptics.tap();
              setPreviewState({ status: 'running' });
              void onPreview().then((result) => {
                setPreviewState({ status: 'done', result });
              });
            }}
            disabled={previewState.status === 'running'}
            className="flex-1 font-mono font-[600] tracking-[0.28em] uppercase transition-opacity active:opacity-70 disabled:opacity-40"
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: `1px solid ${hexToRgba(N.amber, 0.25)}`,
              color: NT.soft,
              fontSize: 9.5,
            }}
          >
            {previewState.status === 'running' ? 'sonando…' : 'probar 6 s'}
          </button>
          <button
            onClick={() => { haptics.warn(); onStartNow(); }}
            className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
            style={{
              padding: '12px 16px',
              background: N.amber,
              color: N.void,
              fontSize: 10,
              boxShadow: `0 6px 18px -6px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            comenzar ahora
          </button>
        </div>

        {/* Preview diagnostic */}
        {previewState.status === 'done' && (
          <div
            className="mt-3 px-4 py-3"
            style={{
              border: `1px solid ${previewState.result.ok
                ? hexToRgba(N.amber, 0.35)
                : 'rgba(255, 120, 120, 0.35)'}`,
              background: previewState.result.ok
                ? hexToRgba(N.amber, 0.06)
                : 'rgba(255, 120, 120, 0.06)',
            }}
          >
            <div
              className="font-mono uppercase tracking-[0.32em] font-[700] mb-1"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              {previewState.result.ok ? '· preview OK ·' : '· preview falló ·'}
            </div>
            <div
              className="font-mono leading-relaxed"
              style={{ color: NT.soft, fontSize: 11 }}
            >
              play started: <b>{previewState.result.playStarted ? 'sí' : 'NO'}</b>{' '}
              · buffered: <b>{previewState.result.bufferedSec.toFixed(1)} s</b>
              {previewState.result.error && (
                <>
                  <br />error: <b>{previewState.result.error}</b>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notification permission hint */}
        {config.enabled && (notifPerm === 'default' || notifPerm === 'denied') && (
          <div
            className="mt-3 px-4 py-3.5 flex items-start gap-3"
            style={{
              border: `1px solid ${notifPerm === 'denied'
                ? 'rgba(255, 120, 120, 0.35)'
                : hexToRgba(N.amber, 0.35)}`,
              background: notifPerm === 'denied'
                ? 'rgba(255, 120, 120, 0.05)'
                : hexToRgba(N.amber, 0.05),
            }}
          >
            <Bell
              size={13}
              strokeWidth={1.9}
              style={{
                color: notifPerm === 'denied' ? '#ff7878' : N.amber,
                marginTop: 2,
              }}
            />
            <div className="flex-1">
              <div
                className="font-headline font-[600] lowercase tracking-[-0.01em] mb-1"
                style={{ color: NT.primary, fontSize: 12.5 }}
              >
                {notifPerm === 'denied'
                  ? 'notificaciones bloqueadas'
                  : 'activa las notificaciones'}
              </div>
              <div
                className="font-ui leading-[1.55] mb-2"
                style={{ color: NT.muted, fontSize: 10.5 }}
              >
                {notifPerm === 'denied'
                  ? 'iOS está bloqueando las notificaciones de esta app. Ajustes → Notificaciones → Morning Awakening → Permitir.'
                  : 'Sin este permiso no recibís el aviso silencioso a la hora del ritual.'}
              </div>
              {notifPerm === 'default' && (
                <button
                  onClick={() => {
                    haptics.tap();
                    void requestPermission().then((p) => setNotifPerm(p));
                  }}
                  className="font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
                  style={{
                    padding: '8px 16px',
                    background: N.amber,
                    color: N.void,
                    fontSize: 9,
                  }}
                >
                  activar notificaciones
                </button>
              )}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

function SectionHeader({
  children,
  N,
  NT,
  icon,
  right,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  right?: string;
} & PaletteProps) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-3">
      <span className="flex items-center gap-1.5 shrink-0" style={{ color: hexToRgba(N.amber, 0.85) }}>
        {icon}
        <span
          className="font-mono uppercase tracking-[0.42em] font-[700]"
          style={{ color: NT.muted, fontSize: 9 }}
        >
          {children}
        </span>
      </span>
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.amber, 0.12) }}
      />
      {right && (
        <span
          className="font-mono tabular-nums tracking-[0.18em] font-[600] shrink-0"
          style={{ color: NT.soft, fontSize: 10 }}
        >
          {right}
        </span>
      )}
    </div>
  );
}

function PillSelector({
  value,
  options,
  onChange,
  N,
  NT,
}: {
  value: number;
  options: Array<{ label: string; value: number }>;
  onChange: (v: number) => void;
} & PaletteProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="font-mono uppercase tracking-[0.22em] font-[600] transition-transform active:scale-[0.97]"
            style={{
              padding: '8px 14px',
              fontSize: 10,
              background: active ? hexToRgba(N.amber, 0.16) : 'transparent',
              border: `1px solid ${active ? hexToRgba(N.amber, 0.55) : hexToRgba(N.amber, 0.18)}`,
              color: active ? N.amber : NT.soft,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TimelineRow({
  time,
  label,
  hint,
  last,
  highlight,
  N,
  NT,
}: {
  time: string;
  label: string;
  hint: string;
  last?: boolean;
  highlight?: boolean;
} & PaletteProps) {
  return (
    <div
      className="flex items-baseline gap-4 py-2.5"
      style={{ borderBottom: last ? 'none' : `1px solid ${hexToRgba(N.amber, 0.1)}` }}
    >
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: highlight ? N.amber : hexToRgba(N.amber, 0.5),
          fontSize: highlight ? 12.5 : 11,
          letterSpacing: '0.05em',
          fontWeight: highlight ? 700 : 500,
          minWidth: '5ch',
        }}
      >
        {time}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{ color: highlight ? NT.primary : NT.soft, fontSize: 13.5 }}
        >
          {label.toLowerCase()}
        </span>
        <span
          className="block mt-0.5 font-ui leading-[1.45]"
          style={{ color: NT.muted, fontSize: 10.5 }}
        >
          {hint}
        </span>
      </span>
      {highlight && (
        <span
          aria-hidden
          style={{
            width: 6, height: 6, borderRadius: 99,
            background: N.amber,
            boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.7)}`,
            marginTop: 6,
          }}
        />
      )}
    </div>
  );
}

function ToggleVisual({ active, N }: { active: boolean } & { N: PaletteProps['N'] }) {
  return (
    <span
      className="shrink-0 w-12 h-7 rounded-full p-[3px] transition-colors"
      style={{
        background: active ? N.amber : hexToRgba(N.amber, 0.14),
        boxShadow: active ? `0 4px 12px -2px ${hexToRgba(N.amber, 0.4)}` : 'none',
      }}
    >
      <span
        className="block w-[22px] h-[22px] rounded-full transition-transform"
        style={{
          background: active ? N.void : hexToRgba(N.amber, 0.4),
          transform: active ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </span>
  );
}

// El PillSelector trabaja con `value: number`, así que codificamos el
// voice tone como 0/1/2 para ese widget.
function voiceToneToNum(t: RitualVoiceTone): number {
  return t === 'gentle' ? 1 : t === 'calm' ? 2 : 0;
}
function numToVoiceTone(n: number): RitualVoiceTone {
  return n === 1 ? 'gentle' : n === 2 ? 'calm' : 'default';
}
