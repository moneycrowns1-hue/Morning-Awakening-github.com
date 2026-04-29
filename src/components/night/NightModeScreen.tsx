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
  ArrowUpRight,
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
import { haptics } from '@/lib/common/haptics';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import {
  loadNightConfig,
  saveNightConfig,
  type NightModeConfig,
  type SleepTrackId,
  type SleepTimerMinutes,
  findSound,
} from '@/lib/night/nightMode';
import { getSleepEngine, type SleepEngineState } from '@/lib/night/sleepEngine';
import {
  loadRitual,
  nextTargetAt,
  formatTargetHHMM,
} from '@/lib/ritual/ritualSchedule';
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
    haptics.tick();
    const engine = getSleepEngine();
    if (engineState.playing) engine.pause();
    else void engine.resume();
  }, [engineState.playing]);

  // ── Ritual reminder info ───────────────────────────────
  // El ritual matutino ya no tiene reaseguro/días: si está
  // habilitado, mostramos cuánto falta para el target.
  const alarmCfg = loadRitual();
  const alarmInfo = alarmCfg.enabled
    ? { msUntilTarget: nextTargetAt(alarmCfg).getTime() - Date.now() }
    : null;
  const alarmTimeStr = formatTargetHHMM(alarmCfg);

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
        className="relative z-10 flex items-start gap-3 px-4 pt-4 pb-2 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: SUNRISE.rise2,
            color: SUNRISE.night,
            boxShadow: `0 6px 18px -4px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={18} strokeWidth={2.4} style={{ color: SUNRISE.night }} />
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          <div
            className="font-ui text-[10px] uppercase tracking-[0.42em] font-[600]"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            modo noche
          </div>
          <h1
            className="font-headline font-[600] text-[26px] md:text-[30px] leading-[0.95] tracking-[-0.025em] lowercase mt-1 truncate"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            wind-down
          </h1>
        </div>
        <button
          onClick={() => { haptics.tick(); patchCfg({ warmFilter: !cfg.warmFilter }); }}
          aria-label={cfg.warmFilter ? 'Quitar filtro cálido' : 'Activar filtro cálido'}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full transition-all mt-1"
          style={{
            border: `1px solid ${cfg.warmFilter ? hexToRgba(SUNRISE.rise2, 0.5) : hexToRgba(SUNRISE_TEXT.primary, 0.14)}`,
            background: cfg.warmFilter ? hexToRgba(SUNRISE.rise2, 0.16) : hexToRgba(SUNRISE.night, 0.5),
            color: cfg.warmFilter ? SUNRISE.rise2 : SUNRISE_TEXT.soft,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {cfg.warmFilter ? <Sun size={13} strokeWidth={2.2} /> : <Moon size={13} strokeWidth={2.2} />}
          <span className="font-ui text-[10px] tracking-[0.28em] uppercase font-[700]">
            {cfg.warmFilter ? 'cálido' : 'frío'}
          </span>
        </button>
      </div>

      {/* ─── Scrollable body ──────────────────────── */}
      <div className="scroll-area relative z-10 flex-1 min-h-0 px-5 pb-8">
        {/* ─── Hero: clock + greeting ───────────── */}
        <div className="flex flex-col items-center justify-center py-8 sunrise-fade-up">
          <div
            className="font-headline font-[300] leading-none tabular-nums"
            style={{
              fontSize: 'clamp(96px, 24vw, 144px)',
              color: SUNRISE_TEXT.primary,
              textShadow: `0 0 50px ${hexToRgba(SUNRISE.rise2, 0.35)}`,
              letterSpacing: '-0.05em',
            }}
          >
            {hh}:{mm}
          </div>
          <div
            className="font-mono text-[12px] tracking-[0.24em] mt-3 lowercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            buenas noches
          </div>
          <div
            className="font-headline font-[600] text-[22px] leading-tight lowercase tracking-[-0.02em] mt-1"
            style={{ color: SUNRISE.rise2 }}
          >
            {firstName(operatorName).toLowerCase()}
          </div>
        </div>

        {/* ─── Alarm reminder · split bento ──────────────────── */}
        {alarmInfo ? (
          <div
            className="mb-5 overflow-hidden flex items-stretch sunrise-fade-up"
            style={{
              animationDelay: '80ms',
              borderRadius: 20,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.32)}`,
              background: hexToRgba(SUNRISE.night, 0.55),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: `0 14px 30px -18px ${hexToRgba(SUNRISE.rise2, 0.4)}`,
            }}
          >
            <div className="flex-1 min-w-0 flex items-start gap-3 p-4">
              <span
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: hexToRgba(SUNRISE.rise2, 0.16),
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
                  color: SUNRISE.rise2,
                }}
              >
                <Moon size={16} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="font-ui text-[10px] uppercase tracking-[0.32em] font-[700] mb-0.5"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  tu alarma
                </div>
                <div
                  className="font-headline font-[600] text-[20px] leading-tight tabular-nums tracking-[-0.02em]"
                  style={{ color: SUNRISE_TEXT.primary }}
                >
                  {alarmTimeStr}
                </div>
                <div
                  className="font-mono text-[10.5px] tracking-wider mt-1 lowercase"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  {formatUntilAlarm(alarmInfo.msUntilTarget).toLowerCase()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { haptics.tap(); onOpenAlarm(); }}
            className="w-full mb-5 overflow-hidden flex items-stretch text-left sunrise-fade-up transition-transform active:scale-[0.99]"
            style={{
              animationDelay: '80ms',
              borderRadius: 20,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
              background: hexToRgba(SUNRISE.night, 0.55),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex-1 min-w-0 flex items-center gap-3 p-4">
              <span
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: hexToRgba(SUNRISE.rise2, 0.14),
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.32)}`,
                  color: SUNRISE.rise2,
                }}
              >
                <Moon size={16} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="font-headline font-[600] text-[16px] leading-tight lowercase tracking-[-0.015em]"
                  style={{ color: SUNRISE_TEXT.primary }}
                >
                  sin alarma armada
                </div>
                <div
                  className="mt-0.5 font-mono text-[10.5px] tracking-wider lowercase"
                  style={{ color: SUNRISE_TEXT.muted }}
                >
                  configura tu próxima
                </div>
              </div>
            </div>
            <div
              className="shrink-0 flex items-center justify-center px-4"
              style={{ background: hexToRgba(SUNRISE.rise2, 0.14) }}
            >
              <ArrowUpRight size={18} strokeWidth={2.2} style={{ color: SUNRISE.rise2 }} />
            </div>
          </button>
        )}

        {/* ─── "Dormir ya" hero CTA · split bento ─────────────── */}
        {cfg.lastTrackId && (
          <button
            onClick={handleDormirYa}
            className="w-full mb-5 overflow-hidden flex items-stretch text-left transition-transform active:scale-[0.99] sunrise-fade-up"
            style={{
              animationDelay: '120ms',
              borderRadius: 22,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
              boxShadow: `0 14px 40px -12px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
            }}
          >
            {/* Left golden play block */}
            <div
              className="shrink-0 flex flex-col items-center justify-center px-5 py-5 gap-2"
              style={{
                minWidth: 96,
                background: SUNRISE.rise2,
                color: SUNRISE.night,
              }}
            >
              <Play size={26} strokeWidth={2} fill={SUNRISE.night} style={{ color: SUNRISE.night }} />
              <span
                className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700]"
                style={{ color: SUNRISE.night, opacity: 0.7 }}
              >
                play
              </span>
            </div>
            {/* Right info */}
            <div
              className="flex-1 min-w-0 flex flex-col justify-center px-4 py-4"
              style={{
                background: hexToRgba(SUNRISE.night, 0.55),
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <div
                className="font-ui text-[10px] uppercase tracking-[0.32em] font-[700] mb-0.5"
                style={{ color: SUNRISE.rise2 }}
              >
                dormir ya
              </div>
              <div
                className="font-headline font-[600] text-[22px] leading-tight lowercase tracking-[-0.025em] truncate"
                style={{ color: SUNRISE_TEXT.primary }}
              >
                {(findSound(cfg.lastTrackId)?.label ?? 'sonido').toLowerCase()}
              </div>
              <div
                className="mt-0.5 font-mono text-[10.5px] tracking-wider lowercase"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                temporizador {cfg.lastTimerMin === 0 ? 30 : cfg.lastTimerMin} min
              </div>
            </div>
          </button>
        )}

        {/* ─── Sound picker ─────────────────────── */}
        <Section title="paisaje sonoro" delay={160}>
          <SleepSoundPicker
            activeId={engineState.trackId}
            onPick={handlePickSound}
          />
        </Section>

        {/* ─── Volume + play/pause (only when a track is loaded) ─── */}
        {engineState.trackId && (
          <Section title="volumen" delay={200}>
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
        <Section title="temporizador de apagado" delay={240}>
          <SleepTimerSelector
            value={cfg.lastTimerMin}
            onChange={handleTimerChange}
            totalSec={cfg.lastTimerMin === 0 ? null : cfg.lastTimerMin * 60}
            remainingSec={engineState.timerRemainingSec}
          />
          {engineState.fadingOut && (
            <div
              className="font-mono text-[10px] tracking-[0.24em] uppercase mt-2 font-[700] lowercase"
              style={{ color: SUNRISE.rise2 }}
            >
              bajando audio…
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
          className="flex items-center gap-2 px-4 py-3 sunrise-fade-up"
          style={{
            animationDelay: '320ms',
            borderRadius: 14,
            border: `1px solid ${hexToRgba(SUNRISE_TEXT.primary, 0.06)}`,
            background: hexToRgba(SUNRISE.night, 0.4),
          }}
        >
          <ZapOff size={12} strokeWidth={1.9} style={{ color: SUNRISE_TEXT.muted }} />
          <span
            className="font-mono text-[10px] leading-relaxed tracking-wider lowercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            la pantalla se oscurece sola tras 20 s sin tocarla. toca para restaurar.
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

function formatUntilAlarm(msUntilTarget: number): string {
  if (!Number.isFinite(msUntilTarget)) return 'Sin próximo ritual programado.';
  const totalMin = Math.round(msUntilTarget / 60_000);
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
      className="p-4 mb-3 sunrise-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        borderRadius: 20,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
        background: hexToRgba(SUNRISE.night, 0.55),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="font-ui text-[10px] uppercase tracking-[0.38em] mb-3 font-[700]"
        style={{ color: SUNRISE_TEXT.muted }}
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
      className="flex items-stretch overflow-hidden text-left transition-transform active:scale-[0.99]"
      style={{
        borderRadius: 18,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        background: hexToRgba(SUNRISE.night, 0.55),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex-1 min-w-0 px-4 py-3.5">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.32)}`,
            color: SUNRISE.rise2,
          }}
        >
          {icon}
        </span>
        <div
          className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.015em]"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {title.toLowerCase()}
        </div>
        <div
          className="mt-0.5 font-mono text-[10px] tracking-wider lowercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {hint.toLowerCase()}
        </div>
      </div>
      <div
        className="shrink-0 flex items-center justify-center px-3"
        style={{ background: hexToRgba(SUNRISE.rise2, 0.12) }}
      >
        <ArrowUpRight size={16} strokeWidth={2.2} style={{ color: SUNRISE.rise2 }} />
      </div>
    </button>
  );
}
