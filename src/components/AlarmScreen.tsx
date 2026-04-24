'use client';

// ═══════════════════════════════════════════════════════
// AlarmScreen · full-screen alarm configurator. Inspired by
// WonderWake (gentle crescendo) + Routinery (clean card
// layout). Three main zones:
//
//   1. Hero · giant time display with a live halo that grows
//      as the ramp duration increases. Tap to edit the hour.
//   2. Controls · ramp duration slider, reaseguro slider,
//      volume slider, chain-to-protocol toggle.
//   3. Status & actions · next fire summary, test + manual
//      fire, platform caveat note.
// ═══════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CalendarDays, ChevronLeft, Play, Sparkles, Sun } from 'lucide-react';
import GradientBackground from './GradientBackground';
import { haptics } from '@/lib/haptics';
import {
  describeAlarm,
  describeDays,
  hasAnyDay,
  nextFireInfo,
  type AlarmConfig,
} from '@/lib/alarmSchedule';
import { prefetchAlarmAudio, type PreviewResult } from '@/lib/alarmEngine';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import AppCloseWarningModal, { shouldShowAppCloseWarning } from './AppCloseWarningModal';
import { requestPermission, permissionStatus } from '@/lib/morningReminder';
import WeekdaySelector from './WeekdaySelector';

interface AlarmScreenProps {
  config: AlarmConfig;
  onChange: (next: AlarmConfig) => void;
  onPreview: () => Promise<PreviewResult>;
  onFireNow: () => Promise<void>;
  /** Fire with compressed timings (~1 min total) so every phase
   *  (ramp → peak+coach → reaseguro → wake-up) is verifiable
   *  in one sitting. */
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
  const info = useMemo(() => nextFireInfo(config), [config]);

  // Preview diagnostic — surfaced in the UI so we can debug iOS audio
  // without Safari Web Inspector. Populated by the "Probar 6s" handler.
  const [previewState, setPreviewState] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'done'; result: PreviewResult }
  >({ status: 'idle' });

  // "No cierres la app" advisory modal. Shown the first time the
  // user arms the alarm (enabled flips from false → true) and
  // stays dismissed afterwards. Can be permanently silenced via
  // the in-modal checkbox.
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Surface the current Notification permission so the UI can
  // nudge the user towards granting it (fallback alarm at peak).
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');
  useEffect(() => {
    setNotifPerm(permissionStatus());
  }, []);

  // Warm the HTTP cache for the 7 MB Tycho file (+ Zimmer + musica
  // principal) the moment AlarmScreen mounts. This is the iOS fix for
  // "Probar 6s" completing before the fetch even finished on cellular.
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

  // Arming an alarm needs two side-effects beyond the config patch:
  //   1. Ask for Notification permission so the SW fallback at peak
  //      is actually delivered on iOS (silent otherwise).
  //   2. Surface the "No cierres la app" advisory exactly once.
  // Must run inside the tap gesture on iOS — do NOT await before
  // calling requestPermission().
  const handleToggleEnabled = () => {
    haptics.tick();
    const next = !config.enabled;
    onChange({ ...config, enabled: next });
    if (next) {
      if (shouldShowAppCloseWarning()) setShowCloseWarning(true);
      // Permission prompt: fire and forget; iOS will surface the
      // native dialog inside this gesture.
      void requestPermission().then((p) => setNotifPerm(p));
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: 'var(--sunrise-text)' }}
    >
      <GradientBackground stage="welcome" particleCount={40} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: 'var(--sunrise-text-soft)' }}
          aria-label="Volver"
        >
          <ChevronLeft size={22} strokeWidth={1.7} />
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="font-ui text-[10px] uppercase tracking-[0.32em]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Despertar suave
          </div>
          <h1
            className="font-display italic font-[400] text-[22px] leading-none mt-0.5 truncate"
            style={{ color: 'var(--sunrise-text)' }}
          >
            Alarma
          </h1>
        </div>
        {/* Enable toggle */}
        <button
          onClick={handleToggleEnabled}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition-all"
          style={{
            border: `1px solid ${config.enabled ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.12)'}`,
            background: config.enabled ? hexToRgba(SUNRISE.rise2, 0.12) : 'rgba(255,250,240,0.04)',
            color: config.enabled ? SUNRISE.rise2 : 'var(--sunrise-text-soft)',
          }}
        >
          {config.enabled ? <Bell size={14} strokeWidth={1.9} /> : <BellOff size={14} strokeWidth={1.9} />}
          <span className="font-ui text-[11px] tracking-[0.24em] uppercase">
            {config.enabled ? 'Armada' : 'Apagada'}
          </span>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6">
        {/* ─── Hero: time display with halo ─────────── */}
        <div className="relative flex flex-col items-center justify-center py-8 sunrise-fade-up">
          {/* Halo grows with ramp duration */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${180 + rampMin * 10}px`,
              height: `${180 + rampMin * 10}px`,
              background: `radial-gradient(circle, ${hexToRgba(SUNRISE.rise2, 0.22)} 0%, ${hexToRgba(SUNRISE.dawn1, 0.08)} 40%, transparent 72%)`,
              filter: 'blur(6px)',
              opacity: config.enabled ? 1 : 0.35,
              transition: 'all 0.5s ease',
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: '150px',
              height: '150px',
              background: `radial-gradient(circle, ${hexToRgba(SUNRISE.rise1, 0.35)} 0%, transparent 70%)`,
              filter: 'blur(10px)',
              opacity: config.enabled ? 1 : 0.25,
            }}
          />
          <label
            className="relative z-10 flex flex-col items-center cursor-pointer"
            htmlFor="alarm-time-input"
          >
            <div
              className="font-ui text-[10px] uppercase tracking-[0.42em] mb-2"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Hora del peak
            </div>
            <div
              className="font-display italic font-[300] text-[88px] leading-none tabular-nums"
              style={{
                color: 'var(--sunrise-text)',
                textShadow: config.enabled
                  ? `0 0 32px ${hexToRgba(SUNRISE.rise2, 0.4)}`
                  : 'none',
              }}
            >
              {timeValue}
            </div>
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
            <div
              className="font-ui text-[11px] mt-2"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Toca para cambiar
            </div>
          </label>
        </div>

        {/* ─── Timeline summary ─────────────────────── */}
        <div
          className="rounded-2xl p-4 mb-5 sunrise-fade-up"
          style={{
            animationDelay: '80ms',
            border: '1px solid rgba(255,250,240,0.08)',
            background: 'rgba(255,250,240,0.03)',
          }}
        >
          <div
            className="font-ui text-[10px] uppercase tracking-[0.32em] mb-3"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Cómo despertarás
          </div>
          <TimelineRow
            time={fmt(rampStart)}
            dotColor={SUNRISE.dawn1}
            label="Subida suave empieza"
            hint={`Tycho · Sunrise Projector • ${rampMin} min fade in`}
          />
          <TimelineRow
            time={timeValue}
            dotColor={SUNRISE.rise2}
            label="Peak · voz con propósito"
            hint="La música baja y entra la voz coach"
            highlight
          />
          {config.reaseguroSec > 0 && (
            <TimelineRow
              time={fmt(reaseguroAt)}
              dotColor={SUNRISE.dawn2}
              label="Reaseguro"
              hint="Hans Zimmer · Time (si no te despertaste)"
              last={!config.chainProtocol}
            />
          )}
          {config.chainProtocol && (
            <TimelineRow
              time="→"
              dotColor={SUNRISE.rise1}
              label="Despertar · orden del día"
              hint="musica principal.mp3 antes del protocolo"
              last
            />
          )}
          {config.reaseguroSec === 0 && (
            <div
              className="font-ui text-[10px] ml-6 mt-1"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Sin reaseguro. Activa abajo si quieres un respaldo audible.
            </div>
          )}
        </div>

        {/* ─── Weekday selector ─────────────────────── */}
        <SectionCard
          icon={<CalendarDays size={15} strokeWidth={1.9} />}
          title="Días activos"
          hint={describeDays(config.days)}
          delay={100}
        >
          <WeekdaySelector
            value={config.days}
            onChange={(days) => update({ days })}
          />
          {!hasAnyDay(config) && (
            <p
              className="font-ui text-[11px] leading-relaxed mt-3"
              style={{ color: '#ffaaaa' }}
            >
              Sin días activos la alarma no sonará. Selecciona al menos uno.
            </p>
          )}
        </SectionCard>

        {/* ─── Ramp duration ────────────────────────── */}
        <SectionCard
          icon={<Sun size={15} strokeWidth={1.9} />}
          title="Subida suave"
          hint={`${rampMin} min antes del peak`}
          delay={120}
        >
          <PillSelector
            value={config.rampSec}
            options={[
              { label: '2 min', value: 120 },
              { label: '5 min', value: 300 },
              { label: '10 min', value: 600 },
              { label: '15 min', value: 900 },
              { label: '20 min', value: 1200 },
              { label: '30 min', value: 1800 },
            ]}
            onChange={(v) => update({ rampSec: v })}
          />
          <p
            className="font-ui text-[11px] leading-relaxed mt-3"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Sunrise Projector de Tycho en loop, subiendo desde el
            silencio hasta el peak. Mientras más largo, más gradual el
            despertar.
          </p>
        </SectionCard>

        {/* ─── Reaseguro ────────────────────────────── */}
        <SectionCard
          icon={<Sparkles size={15} strokeWidth={1.9} />}
          title="Reaseguro"
          hint={config.reaseguroSec > 0 ? `+${reaseguroMin} min` : 'Apagado'}
          delay={160}
        >
          <PillSelector
            value={config.reaseguroSec}
            options={[
              { label: 'No', value: 0 },
              { label: '+3', value: 180 },
              { label: '+5', value: 300 },
              { label: '+8', value: 480 },
              { label: '+12', value: 720 },
              { label: '+15', value: 900 },
            ]}
            onChange={(v) => update({ reaseguroSec: v })}
          />
          <p
            className="font-ui text-[11px] leading-relaxed mt-3"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Si no descartaste la alarma pasado este tiempo después del
            peak, entra Hans Zimmer — Time (crossfade 8s) más cinématico
            para despertarte.
          </p>
        </SectionCard>

        {/* ─── Peak volume ──────────────────────────── */}
        <SectionCard
          icon={<Play size={14} strokeWidth={1.9} />}
          title="Volumen peak"
          hint={`${Math.round(config.peakVolume * 100)}%`}
          delay={200}
        >
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={config.peakVolume}
            onChange={(e) => update({ peakVolume: parseFloat(e.target.value) })}
            className="w-full sunrise-slider"
            aria-label="Volumen peak"
          />
          <p
            className="font-ui text-[11px] leading-relaxed mt-3"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Nivel máximo al que llegará la rampa. El volumen del
            dispositivo también influye.
          </p>
        </SectionCard>

        {/* ─── Chain to protocol ────────────────────── */}
        <button
          onClick={() => update({ chainProtocol: !config.chainProtocol })}
          className="w-full flex items-center gap-3 p-4 rounded-2xl mb-5 text-left sunrise-fade-up"
          style={{
            animationDelay: '240ms',
            border: `1px solid ${config.chainProtocol ? hexToRgba(SUNRISE.rise2, 0.35) : 'rgba(255,250,240,0.08)'}`,
            background: config.chainProtocol ? hexToRgba(SUNRISE.rise2, 0.06) : 'rgba(255,250,240,0.03)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: config.chainProtocol ? hexToRgba(SUNRISE.rise2, 0.18) : 'rgba(255,250,240,0.05)',
              border: `1px solid ${config.chainProtocol ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.12)'}`,
              color: config.chainProtocol ? SUNRISE.rise2 : 'var(--sunrise-text-muted)',
            }}
          >
            <Sun size={16} strokeWidth={1.9} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-ui text-[13px] font-[500]"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Encadenar al protocolo
            </div>
            <div
              className="font-ui text-[11px] mt-0.5 leading-snug"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Al descartar, reproduce la voz de orden del día (musica principal.mp3)
              y luego abre el protocolo matutino.
            </div>
          </div>
          <ToggleVisual active={config.chainProtocol} />
        </button>

        {/* ─── Actions ──────────────────────────────── */}
        <div className="flex gap-2 mb-5 sunrise-fade-up" style={{ animationDelay: '280ms' }}>
          <button
            onClick={() => {
              haptics.tap();
              setPreviewState({ status: 'running' });
              // Fire-and-display — onPreview itself unlocks audio
              // synchronously inside this click handler.
              void onPreview().then((result) => {
                setPreviewState({ status: 'done', result });
              });
            }}
            disabled={previewState.status === 'running'}
            className="flex-1 py-3 rounded-full font-ui text-[12px] tracking-[0.22em] uppercase transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{
              border: '1px solid rgba(255,250,240,0.15)',
              background: 'rgba(255,250,240,0.04)',
              color: 'var(--sunrise-text-soft)',
            }}
          >
            {previewState.status === 'running' ? 'Sonando…' : 'Probar 6s'}
          </button>
          <button
            onClick={() => { haptics.warn(); void onFireNow(); }}
            className="flex-1 py-3 rounded-full font-ui text-[12px] tracking-[0.22em] uppercase transition-transform active:scale-[0.98]"
            style={{
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.5)}`,
              background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.18)}, ${hexToRgba(SUNRISE.rise2, 0.32)})`,
              color: 'var(--sunrise-text)',
            }}
          >
            Empezar ahora
          </button>
        </div>

        {/* ─── Test completo (compressed ~1 min) ────── */}
        <button
          onClick={() => { haptics.tick(); void onFireTest(); }}
          className="w-full py-3 rounded-full font-ui text-[12px] tracking-[0.22em] uppercase transition-transform active:scale-[0.98] mb-5 sunrise-fade-up"
          style={{
            animationDelay: '300ms',
            border: `1px dashed ${hexToRgba(SUNRISE.dawn2, 0.5)}`,
            background: hexToRgba(SUNRISE.dawn2, 0.08),
            color: 'var(--sunrise-text-soft)',
          }}
        >
          Test completo · 1 min (ramp → peak → reaseguro)
        </button>

        {/* ─── Preview diagnostic ───────────────────── */}
        {previewState.status === 'done' && (
          <div
            className="rounded-xl p-3 mb-4 sunrise-fade-up"
            style={{
              border: `1px solid ${previewState.result.ok
                ? hexToRgba(SUNRISE.rise2, 0.35)
                : 'rgba(255, 120, 120, 0.35)'}`,
              background: previewState.result.ok
                ? hexToRgba(SUNRISE.rise2, 0.06)
                : 'rgba(255, 120, 120, 0.06)',
            }}
          >
            <div
              className="font-ui text-[10px] uppercase tracking-[0.28em] mb-1"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              {previewState.result.ok ? 'Preview OK' : 'Preview falló'}
            </div>
            <div
              className="font-mono text-[11px] leading-relaxed"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              play started: <b>{previewState.result.playStarted ? 'sí' : 'NO'}</b>{' '}
              · buffered: <b>{previewState.result.bufferedSec.toFixed(1)}s</b>
              {previewState.result.error && (
                <>
                  <br />error: <b>{previewState.result.error}</b>
                </>
              )}
            </div>
            {!previewState.result.ok && !previewState.result.playStarted && !previewState.result.error && (
              <div
                className="font-ui text-[10px] mt-1 leading-relaxed"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                play() no se ejecutó. Toca el botón más fuerte/directo — iOS necesita el gesto exactamente sobre el botón.
              </div>
            )}
            {!previewState.result.ok && previewState.result.bufferedSec < 1 && (
              <div
                className="font-ui text-[10px] mt-1 leading-relaxed"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                No se buffereó audio. Revisa conexión. El archivo Tycho pesa 7 MB.
              </div>
            )}
          </div>
        )}

        {/* ─── Status ───────────────────────────────── */}
        {config.enabled && (
          <div
            className="rounded-2xl p-4 sunrise-fade-up flex items-start gap-3"
            style={{
              animationDelay: '320ms',
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.25)}`,
              background: hexToRgba(SUNRISE.rise2, 0.05),
            }}
          >
            <Bell size={14} strokeWidth={1.9} style={{ color: SUNRISE.rise2, marginTop: 2 }} />
            <div>
              <div
                className="font-ui text-[12px] font-[500]"
                style={{ color: 'var(--sunrise-text)' }}
              >
                {describeAlarm(config)}
              </div>
              <div
                className="font-ui text-[10px] mt-0.5"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                {formatCountdown(info.msUntilRampStart, info.offsetSec)}
              </div>
            </div>
          </div>
        )}

        {/* ─── Honesty card: why an alarm can fail on iOS ── */}
        <div
          className="mt-5 rounded-2xl p-4 sunrise-fade-up flex items-start gap-3"
          style={{
            animationDelay: '360ms',
            border: `1px solid ${hexToRgba(SUNRISE.dawn2, 0.4)}`,
            background: hexToRgba(SUNRISE.dawn2, 0.05),
          }}
        >
          <AlertTriangle size={14} strokeWidth={1.9} style={{ color: SUNRISE.dawn2, marginTop: 2 }} />
          <div>
            <div
              className="font-ui text-[12px] font-[500] mb-2"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Para que suene de verdad
            </div>
            <ol
              className="font-ui text-[10.5px] leading-[1.55] space-y-1 list-decimal pl-4"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              <li>Instala la app al home screen (Compartir → Añadir a inicio).</li>
              <li>Acepta el permiso de notificaciones la primera vez que armes la alarma.</li>
              <li>
                Deja la app <b>abierta en primer plano</b> al dormir — iOS
                detiene el audio de cualquier PWA en segundo plano. Puedes
                bloquear el iPad, el audio sigue sonando; solo <b>no cierres
                la app</b> deslizándola fuera del selector.
              </li>
              <li>
                Como respaldo, al llegar al peak se dispara una notificación
                del sistema (banner + sonido corto del sistema) aunque iOS
                haya matado el proceso durante la noche.
              </li>
            </ol>
            <div
              className="font-ui text-[10px] leading-relaxed mt-2 pt-2"
              style={{
                color: 'var(--sunrise-text-muted)',
                borderTop: '1px solid rgba(255,250,240,0.06)',
              }}
            >
              Si no sonó nada, lo más probable es que iOS haya descargado la
              pestaña (PWA cerrada o iPad reiniciado). Usa el test de 1 min
              arriba para confirmar que audio + notificación funcionan antes
              de confiarle una noche entera.
            </div>
          </div>
        </div>

        {/* ─── Notification permission hint ──────────
            Only surfaces when the user armed the alarm but the OS
            hasn't granted notifications. Gives a manual "Activar
            notificaciones" button so the prompt can be retried
            (requestPermission() must run inside a user gesture;
            this button IS that gesture). */}
        {config.enabled && (notifPerm === 'default' || notifPerm === 'denied') && (
          <div
            className="mt-3 rounded-2xl p-4 sunrise-fade-up flex items-start gap-3"
            style={{
              animationDelay: '400ms',
              border: `1px solid ${notifPerm === 'denied'
                ? 'rgba(255, 120, 120, 0.35)'
                : hexToRgba(SUNRISE.rise2, 0.35)}`,
              background: notifPerm === 'denied'
                ? 'rgba(255, 120, 120, 0.05)'
                : hexToRgba(SUNRISE.rise2, 0.05),
            }}
          >
            <Bell size={13} strokeWidth={1.9} style={{
              color: notifPerm === 'denied' ? '#ff7878' : SUNRISE.rise2,
              marginTop: 2,
            }} />
            <div className="flex-1">
              <div
                className="font-ui text-[11px] font-[500] mb-1"
                style={{ color: 'var(--sunrise-text)' }}
              >
                {notifPerm === 'denied'
                  ? 'Notificaciones bloqueadas'
                  : 'Activa las notificaciones'}
              </div>
              <div
                className="font-ui text-[10px] leading-relaxed mb-2"
                style={{ color: 'var(--sunrise-text-muted)' }}
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
                  className="px-3 py-1.5 rounded-full font-ui text-[11px] tracking-[0.18em] uppercase transition-transform active:scale-[0.97]"
                  style={{
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
                    background: hexToRgba(SUNRISE.rise2, 0.18),
                    color: 'var(--sunrise-text)',
                  }}
                >
                  Activar notificaciones
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* "No cierres la app" one-shot advisory */}
      {showCloseWarning && (
        <AppCloseWarningModal onClose={() => setShowCloseWarning(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  hint,
  delay = 0,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-4 mb-3 sunrise-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        border: '1px solid rgba(255,250,240,0.08)',
        background: 'rgba(255,250,240,0.03)',
      }}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,250,240,0.05)',
              color: 'var(--sunrise-text-soft)',
              border: '1px solid rgba(255,250,240,0.1)',
            }}
          >
            {icon}
          </span>
          <span
            className="font-ui text-[13px] font-[500]"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {title}
          </span>
        </div>
        {hint && (
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            {hint}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function PillSelector({
  value,
  options,
  onChange,
}: {
  value: number;
  options: Array<{ label: string; value: number }>;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-full font-ui text-[11px] tracking-[0.1em] transition-all active:scale-[0.97]"
            style={{
              border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.55) : 'rgba(255,250,240,0.1)'}`,
              background: active ? hexToRgba(SUNRISE.rise2, 0.14) : 'rgba(255,250,240,0.03)',
              color: active ? 'var(--sunrise-text)' : 'var(--sunrise-text-soft)',
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
  dotColor,
  label,
  hint,
  last,
  highlight,
}: {
  time: string;
  dotColor: string;
  label: string;
  hint: string;
  last?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 relative">
      <div className="flex flex-col items-center shrink-0" style={{ width: 48 }}>
        <span
          className="font-mono text-[12px]"
          style={{ color: highlight ? 'var(--sunrise-text)' : 'var(--sunrise-text-soft)' }}
        >
          {time}
        </span>
      </div>
      <div className="relative flex flex-col items-center shrink-0" style={{ width: 12 }}>
        <span
          className="block rounded-full mt-1.5"
          style={{
            width: highlight ? 10 : 7,
            height: highlight ? 10 : 7,
            background: dotColor,
            boxShadow: highlight ? `0 0 10px ${hexToRgba(dotColor, 0.7)}` : 'none',
          }}
        />
        {!last && (
          <span
            className="absolute top-4 block w-px"
            style={{
              bottom: -10,
              background: 'rgba(255,250,240,0.12)',
            }}
          />
        )}
      </div>
      <div className="flex-1 pb-3">
        <div
          className="font-ui text-[12px] font-[500]"
          style={{ color: highlight ? 'var(--sunrise-text)' : 'var(--sunrise-text-soft)' }}
        >
          {label}
        </div>
        <div
          className="font-ui text-[10px] mt-0.5"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {hint}
        </div>
      </div>
    </div>
  );
}

function ToggleVisual({ active }: { active: boolean }) {
  return (
    <span
      className="shrink-0 w-10 h-6 rounded-full relative transition-colors"
      style={{
        background: active ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.1)',
      }}
    >
      <span
        className="absolute top-[2px] w-[20px] h-[20px] rounded-full transition-all"
        style={{
          left: active ? 18 : 2,
          background: active ? SUNRISE.rise2 : 'rgba(255,250,240,0.5)',
          boxShadow: active ? `0 0 6px ${hexToRgba(SUNRISE.rise2, 0.6)}` : 'none',
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
