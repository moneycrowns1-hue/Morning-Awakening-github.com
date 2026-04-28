'use client';

// ═══════════════════════════════════════════════════════════
// AlarmScreen · full-screen alarm configurator.
//
// Diseño · masthead editorial NightMissionPhase:
//   - Top folio dot ámbar + caption "soporte · alarma".
//   - Hairline progress bar (sin progreso real, decorativo).
//   - Hero · giant time tabular-nums + halo ámbar pulsante.
//   - Sections con SectionHeader newspaper "─ · NAME · ─".
//   - PillSelector hairline + TimelineRow jeton + ToggleRow.
//   - V5 actions footer.
// Paleta · useNightPalette() para vivir en sync.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, BellOff, CalendarDays, ChevronLeft,
  Play, Sparkles, Sun,
} from 'lucide-react';
import { haptics } from '@/lib/common/haptics';
import {
  describeAlarm,
  describeDays,
  hasAnyDay,
  nextFireInfo,
  type AlarmConfig,
} from '@/lib/alarm/alarmSchedule';
import { prefetchAlarmAudio, type PreviewResult } from '@/lib/alarm/alarmEngine';
import { hexToRgba } from '@/lib/common/theme';
import { useNightPalette } from '@/lib/night/nightPalette';
import AppCloseWarningModal, { shouldShowAppCloseWarning } from './AppCloseWarningModal';
import { requestPermission, permissionStatus } from '@/lib/alarm/morningReminder';
import WeekdaySelector from './WeekdaySelector';

interface AlarmScreenProps {
  config: AlarmConfig;
  onChange: (next: AlarmConfig) => void;
  onPreview: () => Promise<PreviewResult>;
  onFireNow: () => Promise<void>;
  onFireTest: () => Promise<void>;
  onClose: () => void;
}

export default function AlarmScreen({
  config,
  onChange,
  onPreview,
  onFireNow,
  onFireTest,
  onClose,
}: AlarmScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const info = useMemo(() => nextFireInfo(config), [config]);

  const [previewState, setPreviewState] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: PreviewResult }
  >({ status: 'idle' });

  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');

  useEffect(() => {
    setNotifPerm(permissionStatus());
  }, []);

  useEffect(() => {
    void prefetchAlarmAudio();
  }, []);

  const rampMin = Math.round(config.rampSec / 60);
  const reaseguroMin = Math.round(config.reaseguroSec / 60);

  const timeValue = `${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}`;
  const rampStart = new Date(info.peakAt - config.rampSec * 1000);
  const reaseguroAt = new Date(info.peakAt + config.reaseguroSec * 1000);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const update = (patch: Partial<AlarmConfig>) => {
    haptics.tick();
    onChange({ ...config, ...patch });
  };

  const handleToggleEnabled = () => {
    haptics.tick();
    const next = !config.enabled;
    onChange({ ...config, enabled: next });
    if (next) {
      if (shouldShowAppCloseWarning()) setShowCloseWarning(true);
      void requestPermission().then((p) => setNotifPerm(p));
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* ─── Header · MASTHEAD editorial ─── */}
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
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              soporte · alarma
            </span>
          </button>
          {/* Enable toggle · jeton mono */}
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
              {config.enabled ? 'armada' : 'apagada'}
            </span>
          </button>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
      </div>

      {/* ─── Body scrolleable ────────────────────────────────── */}
      <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4 overflow-y-auto">
        {/* Top corners */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            ⏰
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · despertar suave ·
          </span>
        </div>

        {/* ─── Hero · time display tabular ─────────── */}
        <div className="relative flex flex-col items-center justify-center py-6 mt-4">
          {/* Halo crece con ramp duration */}
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
            htmlFor="alarm-time-input"
          >
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600] mb-2"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              hora del peak
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
              id="alarm-time-input"
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

        {/* ─── Timeline summary ─────────────────────── */}
        <SectionHeader N={N} NT={NT}>cómo despertarás</SectionHeader>
        <div className="flex flex-col">
          <TimelineRow
            time={fmt(rampStart)}
            label="subida suave empieza"
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
          {config.reaseguroSec > 0 && (
            <TimelineRow
              time={fmt(reaseguroAt)}
              label="reaseguro"
              hint="Hans Zimmer · Time (si no te despertaste)"
              last={!config.chainProtocol}
              N={N}
              NT={NT}
            />
          )}
          {config.chainProtocol && (
            <TimelineRow
              time="→"
              label="despertar · orden del día"
              hint="musica principal.mp3 antes del protocolo"
              last
              N={N}
              NT={NT}
            />
          )}
          {config.reaseguroSec === 0 && (
            <p
              className="font-mono uppercase tracking-[0.28em] font-[500] mt-1"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              · sin reaseguro · activa abajo si quieres respaldo audible ·
            </p>
          )}
        </div>

        {/* ─── Weekday selector ─────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          right={describeDays(config.days)}
          icon={<CalendarDays size={11} strokeWidth={2.2} />}
        >
          días activos
        </SectionHeader>
        <div className="pt-1">
          <WeekdaySelector
            value={config.days}
            onChange={(days) => update({ days })}
          />
          {!hasAnyDay(config) && (
            <p
              className="font-mono uppercase tracking-[0.28em] font-[600] mt-3"
              style={{ color: '#ff7878', fontSize: 9 }}
            >
              · sin días activos la alarma no sonará ·
            </p>
          )}
        </div>

        {/* ─── Ramp duration ────────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          right={`${rampMin} min antes`}
          icon={<Sun size={11} strokeWidth={2.2} />}
        >
          subida suave
        </SectionHeader>
        <PillSelector
          value={config.rampSec}
          options={[
            { label: '2m', value: 120 },
            { label: '5m', value: 300 },
            { label: '10m', value: 600 },
            { label: '15m', value: 900 },
            { label: '20m', value: 1200 },
            { label: '30m', value: 1800 },
          ]}
          onChange={(v) => update({ rampSec: v })}
          N={N}
          NT={NT}
        />
        <p
          className="font-ui text-[11.5px] leading-[1.55] mt-3"
          style={{ color: NT.muted }}
        >
          Sunrise Projector de Tycho en loop, subiendo desde el silencio
          hasta el peak. Mientras más largo, más gradual el despertar.
        </p>

        {/* ─── Reaseguro ────────────────────────────── */}
        <SectionHeader
          N={N}
          NT={NT}
          right={config.reaseguroSec > 0 ? `+${reaseguroMin}m` : 'apagado'}
          icon={<Sparkles size={11} strokeWidth={2.2} />}
        >
          reaseguro
        </SectionHeader>
        <PillSelector
          value={config.reaseguroSec}
          options={[
            { label: 'no', value: 0 },
            { label: '+3m', value: 180 },
            { label: '+5m', value: 300 },
            { label: '+8m', value: 480 },
            { label: '+12m', value: 720 },
            { label: '+15m', value: 900 },
          ]}
          onChange={(v) => update({ reaseguroSec: v })}
          N={N}
          NT={NT}
        />
        <p
          className="font-ui text-[11.5px] leading-[1.55] mt-3"
          style={{ color: NT.muted }}
        >
          Si no descartaste la alarma pasado este tiempo después del peak,
          entra Hans Zimmer — Time (crossfade 8s) más cinemático.
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
          Nivel máximo al que llegará la rampa. El volumen del dispositivo
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
              encadenar al protocolo
            </span>
            <span
              className="block mt-0.5 font-ui leading-[1.5]"
              style={{ color: NT.muted, fontSize: 11 }}
            >
              Al descartar, voz de orden del día y abre el protocolo matutino.
            </span>
          </span>
          <ToggleVisual active={config.chainProtocol} N={N} />
        </button>

        {/* ─── Actions ──────────────────────────────── */}
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
            {previewState.status === 'running' ? 'sonando…' : 'probar 6s'}
          </button>
          <button
            onClick={() => { haptics.warn(); void onFireNow(); }}
            className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
            style={{
              padding: '12px 16px',
              background: N.amber,
              color: N.void,
              fontSize: 10,
              boxShadow: `0 6px 18px -6px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            empezar ahora
          </button>
        </div>

        {/* Test 1 min · dashed */}
        <button
          onClick={() => { haptics.tick(); void onFireTest(); }}
          className="w-full mt-2 font-mono font-[600] tracking-[0.28em] uppercase transition-opacity active:opacity-70"
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: `1px dashed ${hexToRgba(N.amber, 0.4)}`,
            color: NT.soft,
            fontSize: 9.5,
          }}
        >
          test completo · 1 min · ramp → peak → reaseguro
        </button>

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
              · buffered: <b>{previewState.result.bufferedSec.toFixed(1)}s</b>
              {previewState.result.error && (
                <>
                  <br />error: <b>{previewState.result.error}</b>
                </>
              )}
            </div>
          </div>
        )}

        {/* Status active card */}
        {config.enabled && (
          <div
            className="mt-5 px-4 py-3.5 flex items-start gap-3"
            style={{
              border: `1px solid ${hexToRgba(N.amber, 0.28)}`,
              background: hexToRgba(N.amber, 0.05),
            }}
          >
            <Bell size={13} strokeWidth={1.9} style={{ color: N.amber, marginTop: 2 }} />
            <div>
              <div
                className="font-headline font-[600] lowercase tracking-[-0.01em]"
                style={{ color: NT.primary, fontSize: 13 }}
              >
                {describeAlarm(config).toLowerCase()}
              </div>
              <div
                className="font-ui mt-0.5"
                style={{ color: NT.muted, fontSize: 11 }}
              >
                {formatCountdown(info.msUntilRampStart, info.offsetSec)}
              </div>
            </div>
          </div>
        )}

        {/* Honesty card */}
        <div
          className="mt-3 px-4 py-3.5 flex items-start gap-3"
          style={{
            border: `1px solid ${hexToRgba(N.candle, 0.4)}`,
            background: hexToRgba(N.candle, 0.05),
          }}
        >
          <AlertTriangle size={13} strokeWidth={1.9} style={{ color: N.candle, marginTop: 2 }} />
          <div>
            <div
              className="font-headline font-[600] lowercase tracking-[-0.01em] mb-2"
              style={{ color: NT.primary, fontSize: 13 }}
            >
              para que suene de verdad
            </div>
            <ol
              className="font-ui leading-[1.55] space-y-1 list-decimal pl-4"
              style={{ color: NT.muted, fontSize: 10.5 }}
            >
              <li>Instala la app al home screen (Compartir → Añadir a inicio).</li>
              <li>Acepta el permiso de notificaciones la primera vez que armes la alarma.</li>
              <li>
                Deja la app <b>abierta en primer plano</b> al dormir — iOS detiene
                el audio de cualquier PWA en segundo plano. Bloquear el iPad
                está OK; <b>no cierres la app</b> deslizándola fuera.
              </li>
              <li>
                Como respaldo, al peak se dispara una notificación del sistema
                (banner + sonido corto) aunque iOS haya matado el proceso.
              </li>
            </ol>
            <div
              className="font-ui leading-[1.55] mt-2 pt-2"
              style={{
                color: NT.muted,
                fontSize: 10,
                borderTop: `1px solid ${hexToRgba(N.amber, 0.1)}`,
              }}
            >
              Si no sonó nada, lo más probable es que iOS haya descargado la
              pestaña. Usa el test de 1 min arriba para confirmar.
            </div>
          </div>
        </div>

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
                  ? 'iOS está bloqueando las notificaciones de esta app. Ajustes del sistema → Notificaciones → Morning Awakening → Permitir.'
                  : 'Sin este permiso, el respaldo del sistema a la hora del peak no suena aunque la app esté cerrada.'}
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

      {/* "No cierres la app" advisory */}
      {showCloseWarning && (
        <AppCloseWarningModal onClose={() => setShowCloseWarning(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

// Newspaper section header: ─ · NAME · ─── (con ícono opcional + right caption)
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
            width: 6,
            height: 6,
            borderRadius: 99,
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

function formatCountdown(ms: number, offsetSec: number): string {
  if (ms === 0 && offsetSec > 0) {
    return `La rampa ya está corriendo (${Math.floor(offsetSec / 60)} min).`;
  }
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `La subida suave empezará en ${h}h ${m}m.`;
  return `La subida suave empezará en ${m} min.`;
}
