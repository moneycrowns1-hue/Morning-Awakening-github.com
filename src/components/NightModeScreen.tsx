'use client';

// ═══════════════════════════════════════════════════════
// NightModeScreen · bedtime companion, inspired by
// WonderWake. Starfield, giant clock, "Dormir ya"
// shortcut, ambient sound picker, sleep timer, and
// quick-launch for 4-7-8 breathing + night journal.
//
// Audio persists via the shared SleepEngine singleton:
// the user can back out of this screen and the loop
// keeps playing until the timer finishes or the alarm
// fires.
// ═══════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  BookOpen,
  ChevronLeft,
  Moon,
  Play,
  Sun,
  Volume2,
  VolumeX,
  Wind,
  ZapOff,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { SUNRISE, hexToRgba } from '@/lib/theme';
import {
  loadNightConfig,
  saveNightConfig,
  type NightModeConfig,
  type SleepTrackId,
  type SleepTimerMinutes,
  findSound,
} from '@/lib/nightMode';
import { getSleepEngine, type SleepEngineState } from '@/lib/sleepEngine';
import {
  describeDays,
  loadAlarm,
  nextFireInfo,
} from '@/lib/alarmSchedule';
import NightStarfield from './NightStarfield';
import SleepSoundPicker from './SleepSoundPicker';
import SleepTimerSelector from './SleepTimerSelector';
import NightBreathing from './NightBreathing';
import NightJournal from './NightJournal';

interface NightModeScreenProps {
  operatorName: string;
  onClose: () => void;
  /** Invoked when the user taps "Configurar alarma" in the
   *  alarm-reminder card. Lets the parent switch to AlarmScreen. */
  onOpenAlarm: () => void;
}

const IDLE_TIMEOUT_MS = 20_000;

export default function NightModeScreen({ operatorName, onClose, onOpenAlarm }: NightModeScreenProps) {
  const [cfg, setCfg] = useState<NightModeConfig>(() => loadNightConfig());
  const [engineState, setEngineState] = useState<SleepEngineState>(() => getSleepEngine().getState());
  const [clock, setClock] = useState(() => new Date());
  const [showBreathing, setShowBreathing] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [isDim, setIsDim] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const lastTimerChoiceRef = useRef<SleepTimerMinutes>(cfg.lastTimerMin);

  // ── Engine subscription ────────────────────────────
  useEffect(() => {
    const unsubscribe = getSleepEngine().subscribe(setEngineState);
    return unsubscribe;
  }, []);

  // ── Persist cfg on change ─────────────────────────
  const patchCfg = useCallback((patch: Partial<NightModeConfig>) => {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      saveNightConfig(next);
      return next;
    });
  }, []);

  // ── Ticking clock (30 s resolution is enough) ─────
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Dim on idle ───────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isDim) setIsDim(false);
    idleTimerRef.current = window.setTimeout(() => setIsDim(true), IDLE_TIMEOUT_MS);
  }, [isDim]);

  useEffect(() => {
    // Initial timer (no setState call here — the "dim on mount" is
    // always false at mount so resetIdleTimer() would be a no-op
    // for React state; we only need the setTimeout side of it).
    idleTimerRef.current = window.setTimeout(() => setIsDim(true), IDLE_TIMEOUT_MS);
    const handler = () => resetIdleTimer();
    window.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('mousemove', handler, { passive: true });
    window.addEventListener('keydown', handler);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!rootRef.current) return;
    gsap.to(rootRef.current, {
      filter: isDim ? 'brightness(0.45) saturate(0.8)' : 'brightness(1) saturate(1)',
      duration: 1.6,
      ease: 'power2.inOut',
    });
  }, [isDim]);

  // ── Actions ───────────────────────────────────────
  const handlePickSound = useCallback((id: SleepTrackId) => {
    const engine = getSleepEngine();
    void engine.play(id, cfg.lastVolume, 800);
    patchCfg({ lastTrackId: id });
    // Also arm the timer with the last choice (if not ∞) so a first
    // tap does "play + timer" in one gesture — matching Wonderwake.
    if (cfg.lastTimerMin > 0) {
      engine.scheduleFadeOut(cfg.lastTimerMin * 60, 30);
    } else {
      engine.clearTimer();
    }
  }, [cfg.lastVolume, cfg.lastTimerMin, patchCfg]);

  const handleTimerChange = useCallback((min: SleepTimerMinutes) => {
    lastTimerChoiceRef.current = min;
    patchCfg({ lastTimerMin: min });
    const engine = getSleepEngine();
    // Only actually schedule if audio is playing.
    if (engineState.trackId) {
      if (min === 0) engine.clearTimer();
      else engine.scheduleFadeOut(min * 60, 30);
    }
  }, [engineState.trackId, patchCfg]);

  const handleDormirYa = useCallback(() => {
    if (!cfg.lastTrackId) return;
    haptics.tap();
    const engine = getSleepEngine();
    void engine.play(cfg.lastTrackId, cfg.lastVolume, 800);
    const min = cfg.lastTimerMin === 0 ? 30 : cfg.lastTimerMin;
    engine.scheduleFadeOut(min * 60, 30);
  }, [cfg.lastTrackId, cfg.lastVolume, cfg.lastTimerMin]);

  const handleVolumeChange = useCallback((v: number) => {
    patchCfg({ lastVolume: v });
    getSleepEngine().setVolume(v);
  }, [patchCfg]);

  const handleTogglePlayback = useCallback(() => {
    const engine = getSleepEngine();
    haptics.tick();
    if (engineState.playing) engine.pause();
    else void engine.resume();
  }, [engineState.playing]);

  // ── Alarm reminder info ───────────────────────────
  const alarmCfg = loadAlarm();
  const alarmInfo = alarmCfg.enabled && alarmCfg.days.some(Boolean) ? nextFireInfo(alarmCfg) : null;
  const alarmTimeStr = `${String(alarmCfg.hour).padStart(2, '0')}:${String(alarmCfg.minute).padStart(2, '0')}`;

  // ── Current clock ─────────────────────────────────
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');

  // ── Warm filter ───────────────────────────────────
  const warmFilter = cfg.warmFilter
    ? 'sepia(0.3) hue-rotate(-15deg) saturate(1.12) brightness(0.92)'
    : 'none';

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        color: 'var(--sunrise-text)',
        background: `linear-gradient(180deg, ${SUNRISE.night} 0%, ${SUNRISE.predawn1} 60%, ${SUNRISE.predawn2} 100%)`,
        filter: warmFilter,
        transition: 'filter 800ms ease',
      }}
    >
      <NightStarfield count={90} shooting />

      {/* ─── Header ───────────────────────────────── */}
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
            Modo noche
          </div>
          <h1
            className="font-display italic font-[400] text-[22px] leading-none mt-0.5 truncate"
            style={{ color: 'var(--sunrise-text)' }}
          >
            Wind-down
          </h1>
        </div>
        <button
          onClick={() => { haptics.tick(); patchCfg({ warmFilter: !cfg.warmFilter }); }}
          aria-label={cfg.warmFilter ? 'Quitar filtro cálido' : 'Activar filtro cálido'}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition-all"
          style={{
            border: `1px solid ${cfg.warmFilter ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.12)'}`,
            background: cfg.warmFilter ? hexToRgba(SUNRISE.rise2, 0.12) : 'rgba(255,250,240,0.04)',
            color: cfg.warmFilter ? SUNRISE.rise2 : 'var(--sunrise-text-soft)',
          }}
        >
          {cfg.warmFilter ? <Sun size={14} strokeWidth={1.9} /> : <Moon size={14} strokeWidth={1.9} />}
          <span className="font-ui text-[11px] tracking-[0.24em] uppercase">
            {cfg.warmFilter ? 'Cálido' : 'Frío'}
          </span>
        </button>
      </div>

      {/* ─── Scrollable body ──────────────────────── */}
      <div className="scroll-area relative z-10 flex-1 min-h-0 px-5 pb-8">
        {/* ─── Hero: clock + greeting ───────────── */}
        <div className="flex flex-col items-center justify-center py-8 sunrise-fade-up">
          <div
            className="font-display italic font-[200] leading-none tabular-nums"
            style={{
              fontSize: 'clamp(84px, 22vw, 128px)',
              color: 'var(--sunrise-text)',
              textShadow: `0 0 40px ${hexToRgba(SUNRISE.rise2, 0.3)}`,
              letterSpacing: '-0.02em',
            }}
          >
            {hh}:{mm}
          </div>
          <div
            className="font-ui text-[13px] tracking-[0.22em] mt-2"
            style={{ color: 'var(--sunrise-text-soft)' }}
          >
            Buenas noches, <span style={{ color: 'var(--sunrise-text)' }}>{firstName(operatorName)}</span>.
          </div>
        </div>

        {/* ─── Alarm reminder ──────────────────── */}
        <div
          className="rounded-2xl p-4 mb-5 flex items-start gap-3 sunrise-fade-up"
          style={{
            animationDelay: '80ms',
            border: `1px solid ${alarmInfo ? hexToRgba(SUNRISE.rise2, 0.25) : 'rgba(255,250,240,0.08)'}`,
            background: alarmInfo ? hexToRgba(SUNRISE.rise2, 0.04) : 'rgba(255,250,240,0.03)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.14),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.35)}`,
              color: SUNRISE.rise2,
            }}
          >
            <Moon size={16} strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            {alarmInfo ? (
              <>
                <div
                  className="font-ui text-[11px] uppercase tracking-[0.26em] mb-0.5"
                  style={{ color: 'var(--sunrise-text-muted)' }}
                >
                  Tu alarma
                </div>
                <div
                  className="font-ui text-[14px] font-[500]"
                  style={{ color: 'var(--sunrise-text)' }}
                >
                  {alarmTimeStr} · {describeDays(alarmCfg.days)}
                </div>
                <div
                  className="font-ui text-[11px] mt-0.5"
                  style={{ color: 'var(--sunrise-text-muted)' }}
                >
                  {formatUntilAlarm(alarmInfo.msUntilRampStart, alarmCfg.rampSec)}
                </div>
              </>
            ) : (
              <>
                <div
                  className="font-ui text-[13px] font-[500] mb-1"
                  style={{ color: 'var(--sunrise-text)' }}
                >
                  Sin alarma armada
                </div>
                <button
                  onClick={() => { haptics.tap(); onOpenAlarm(); }}
                  className="font-ui text-[11px] tracking-[0.18em] uppercase"
                  style={{ color: SUNRISE.rise2 }}
                >
                  Configurar alarma →
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── "Dormir ya" shortcut ─────────────── */}
        {cfg.lastTrackId && (
          <button
            onClick={handleDormirYa}
            className="w-full rounded-2xl p-5 mb-5 flex items-center gap-4 text-left transition-transform active:scale-[0.98] sunrise-fade-up relative overflow-hidden"
            style={{
              animationDelay: '120ms',
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.5)}`,
              background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.rise2, 0.22)} 0%, ${hexToRgba(SUNRISE.dawn1, 0.15)} 100%)`,
              boxShadow: `0 14px 40px -12px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
            }}
          >
            <span
              className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: hexToRgba(SUNRISE.night, 0.55),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.6)}`,
                color: SUNRISE.rise2,
              }}
            >
              <Play size={20} strokeWidth={2} fill={SUNRISE.rise2} />
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="font-ui text-[10px] uppercase tracking-[0.32em] mb-0.5"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                Dormir ya
              </div>
              <div
                className="font-display italic font-[400] text-[22px] leading-tight truncate"
                style={{ color: 'var(--sunrise-text)' }}
              >
                {findSound(cfg.lastTrackId)?.label ?? 'Sonido'}
              </div>
              <div
                className="font-ui text-[11px] mt-0.5"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                {cfg.lastTimerMin === 0 ? 'Temporizador 30 min' : `Temporizador ${cfg.lastTimerMin} min`}
              </div>
            </div>
          </button>
        )}

        {/* ─── Sound picker ─────────────────────── */}
        <Section title="Paisaje sonoro" delay={160}>
          <SleepSoundPicker
            activeId={engineState.trackId}
            onPick={handlePickSound}
          />
        </Section>

        {/* ─── Volume + play/pause (only when a track is loaded) ─── */}
        {engineState.trackId && (
          <Section title="Volumen" delay={200}>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlayback}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
                  background: hexToRgba(SUNRISE.rise2, 0.12),
                  color: SUNRISE.rise2,
                }}
                aria-label={engineState.playing ? 'Pausar' : 'Reanudar'}
              >
                {engineState.playing ? <VolumeX size={16} strokeWidth={1.8} /> : <Volume2 size={16} strokeWidth={1.8} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={cfg.lastVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 sunrise-slider"
                aria-label="Volumen"
              />
              <span
                className="w-12 text-right font-mono text-[11px] tabular-nums"
                style={{ color: 'var(--sunrise-text-muted)' }}
              >
                {Math.round(cfg.lastVolume * 100)}%
              </span>
            </div>
          </Section>
        )}

        {/* ─── Sleep timer ─────────────────────── */}
        <Section title="Temporizador de apagado" delay={240}>
          <SleepTimerSelector
            value={cfg.lastTimerMin}
            onChange={handleTimerChange}
            totalSec={cfg.lastTimerMin === 0 ? null : cfg.lastTimerMin * 60}
            remainingSec={engineState.timerRemainingSec}
          />
          {engineState.fadingOut && (
            <div
              className="font-ui text-[10px] tracking-[0.2em] uppercase mt-2"
              style={{ color: SUNRISE.rise2 }}
            >
              Bajando audio…
            </div>
          )}
        </Section>

        {/* ─── Quick actions ───────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 sunrise-fade-up" style={{ animationDelay: '280ms' }}>
          <QuickAction
            icon={<Wind size={18} strokeWidth={1.8} />}
            title="Respirar 4-7-8"
            hint="4 ciclos · 3 min"
            onClick={() => { haptics.tap(); setShowBreathing(true); }}
          />
          <QuickAction
            icon={<BookOpen size={18} strokeWidth={1.8} />}
            title="Escribir"
            hint="Descarga mental"
            onClick={() => { haptics.tap(); setShowJournal(true); }}
          />
        </div>

        {/* ─── Dim hint ─────────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl sunrise-fade-up"
          style={{
            animationDelay: '320ms',
            border: '1px solid rgba(255,250,240,0.06)',
            background: 'rgba(255,250,240,0.02)',
          }}
        >
          <ZapOff size={12} strokeWidth={1.7} style={{ color: 'var(--sunrise-text-muted)' }} />
          <span
            className="font-ui text-[10px] leading-relaxed"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            La pantalla se oscurece sola después de 20 s sin tocarla. Toca para restaurar.
          </span>
        </div>
      </div>

      {/* ─── Overlays ───────────────────────────── */}
      {showBreathing && <NightBreathing onClose={() => setShowBreathing(false)} />}
      {showJournal && <NightJournal onClose={() => setShowJournal(false)} />}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────
function firstName(full: string): string {
  return full.split(' ')[0] ?? full;
}

function formatUntilAlarm(msUntilRampStart: number, rampSec: number): string {
  if (!Number.isFinite(msUntilRampStart)) return 'Sin próxima alarma programada.';
  const peakMs = msUntilRampStart + rampSec * 1000;
  const totalMin = Math.round(peakMs / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 1) return `Sonará en ${h}h ${m}m.`;
  return `Sonará en ${m} min.`;
}

// ─── Local sub-components ──────────────────────────────

function Section({
  title,
  delay = 0,
  children,
}: {
  title: string;
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
      <div
        className="font-ui text-[10px] uppercase tracking-[0.32em] mb-3"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function QuickAction({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 text-left transition-transform active:scale-[0.97]"
      style={{
        border: '1px solid rgba(255,250,240,0.1)',
        background: 'rgba(255,250,240,0.03)',
      }}
    >
      <span
        className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.1),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.28)}`,
          color: SUNRISE.rise2,
        }}
      >
        {icon}
      </span>
      <div
        className="font-ui text-[13px] font-[500]"
        style={{ color: 'var(--sunrise-text)' }}
      >
        {title}
      </div>
      <div
        className="font-ui text-[10.5px] mt-0.5"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {hint}
      </div>
    </button>
  );
}
