'use client';

// ═══════════════════════════════════════════════════════════
// WonderwakeClockScreen · circular 24h dial, inspired by the
// Wonderwake alarm visual. Shows:
//   - Top card: sleep duration pill + sleep-gate range.
//   - Circular dial: 24 h ring, violet arc from bedtime to
//     wake, moon handle at bedtime, alarm handle at wake.
//   - Center: "Alarma · HH:MM am/pm" + settings button that
//     opens the detailed AlarmScreen modal.
//   - Bottom pill: "Alarma activa / apagada" toggle.
//
// Read-only for bedtime/wake handles in v1 (values come from
// AlarmConfig + SleepConfig). Dragging is a future iteration.
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { X, Settings as SettingsIcon, AlarmClock, ChevronRight, Sparkles } from 'lucide-react';
import type { AlarmConfig } from '@/lib/alarmSchedule';
import { computeSleepGate, loadSleepConfig } from '@/lib/sleepGate';
import { NIGHT, NIGHT_TEXT } from '@/lib/nightTheme';
import { hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import IconosBackground from './IconosBackground';

interface WonderwakeClockScreenProps {
  alarmConfig: AlarmConfig;
  onToggleAlarm: (enabled: boolean) => void;
  /** Opens the underlying detail screen (current AlarmScreen). */
  onOpenDetails: () => void;
  onClose: () => void;
}

// Dial geometry — all derived from these constants.
const DIAL_SIZE = 320;
const DIAL_R_OUTER = 150;  // radius of the label ring centre
const ARC_R = 142;          // radius at which the sleep arc is stroked
const ARC_WIDTH = 24;       // violet stroke width
const HANDLE_R = 16;        // radius of the moon/alarm handle circles
const TICK_OUTER = 135;
const TICK_INNER = 128;

// Convert a 24h time to an angle in degrees, where 12am = -90° (top).
function timeToAngle(hour24: number, minute: number): number {
  const h = (hour24 + minute / 60) % 24;
  return (h / 24) * 360 - 90;
}

// Polar → Cartesian around the dial centre.
function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: DIAL_SIZE / 2 + radius * Math.cos(rad),
    y: DIAL_SIZE / 2 + radius * Math.sin(rad),
  };
}

// Format "10:40 am".
function formatAmPm(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'pm' : 'am';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

// Format "11h 45m".
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function WonderwakeClockScreen({
  alarmConfig,
  onToggleAlarm,
  onOpenDetails,
  onClose,
}: WonderwakeClockScreenProps) {
  const sleepCfg = useMemo(() => loadSleepConfig(), []);
  const gate = useMemo(() => computeSleepGate(alarmConfig, sleepCfg), [alarmConfig, sleepCfg]);

  // Bedtime = middle of the gate. Wake = alarm time.
  const bedtime = gate.ideal;
  const wake = new Date(bedtime.getTime() + sleepCfg.sleepNeedMin * 60 * 1000);

  const bedAngle = timeToAngle(bedtime.getHours(), bedtime.getMinutes());
  const wakeAngle = timeToAngle(wake.getHours(), wake.getMinutes());

  // Arc SVG path — always "forwards" from bed to wake, possibly >180°.
  const arcPath = useMemo(() => buildArcPath(bedAngle, wakeAngle, ARC_R), [bedAngle, wakeAngle]);

  // Hour labels, every 2 h.
  const hourLabels = useMemo(() => {
    const out: Array<{ text: string; angle: number }> = [];
    for (let h = 0; h < 24; h += 2) {
      const text = h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}` : `${h - 12}`;
      out.push({ text, angle: timeToAngle(h, 0) });
    }
    return out;
  }, []);

  const bedPos = polar(bedAngle, ARC_R);
  const wakePos = polar(wakeAngle, ARC_R);

  const sleepDurationMin = sleepCfg.sleepNeedMin;

  const [alarmEnabled, setAlarmEnabled] = useState(alarmConfig.enabled);

  const handleToggle = () => {
    haptics.tap();
    const next = !alarmEnabled;
    setAlarmEnabled(next);
    onToggleAlarm(next);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${NIGHT.violet_1} 0%, ${NIGHT.abyss} 75%)`,
        color: NIGHT_TEXT.primary,
      }}
    >
      <IconosBackground haloY={0.58} bottomGlow={0.85} starCount={55} />

      {/* ─── Header close button ─────────────────────────── */}
      <div
        className="relative z-10 flex items-start justify-end px-5 pt-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-[0.92]"
          style={{
            border: `1px solid ${NIGHT_TEXT.divider}`,
            background: hexToRgba(NIGHT.violet_2, 0.3),
            color: NIGHT_TEXT.soft,
          }}
          aria-label="Cerrar"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* ─── Duration + gate card ────────────────────────── */}
      <div className="relative z-10 px-5 mt-3 w-full max-w-md mx-auto">
        <div
          className="rounded-3xl p-4"
          style={{
            background: hexToRgba(NIGHT.violet_2, 0.42),
            border: `1px solid ${NIGHT_TEXT.divider}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <button
            onClick={onOpenDetails}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors"
            style={{
              background: hexToRgba(NIGHT.abyss, 0.5),
              border: `1px solid ${NIGHT_TEXT.divider}`,
            }}
          >
            <span className="text-[14px]">😌</span>
            <span className="font-ui text-[12px]" style={{ color: NIGHT_TEXT.primary }}>
              Duración del sueño: <span className="font-[600]">{formatDuration(sleepDurationMin)}</span>
            </span>
            <ChevronRight size={13} strokeWidth={1.8} style={{ color: NIGHT_TEXT.muted }} />
          </button>

          {/* Sleep gate range */}
          <div className="mt-3 flex items-center gap-2">
            <Sparkles size={12} strokeWidth={1.8} style={{ color: NIGHT.moon_halo }} />
            <div className="font-ui text-[12px]" style={{ color: NIGHT_TEXT.soft }}>
              Puerta de sueño
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[13px] tabular-nums" style={{ color: NIGHT_TEXT.primary }}>
              {formatAmPm(gate.start.getHours(), gate.start.getMinutes())}
            </span>
            <div
              className="flex-1 mx-3 h-[1px] relative"
              style={{ background: NIGHT_TEXT.divider }}
            >
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 w-[2px] h-[2px] rounded-full -translate-y-1/2"
                  style={{
                    left: `${(i + 1) * 11.11}%`,
                    background: NIGHT_TEXT.muted,
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[13px] tabular-nums" style={{ color: NIGHT_TEXT.primary }}>
              {formatAmPm(gate.end.getHours(), gate.end.getMinutes())}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Circular dial ──────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0">
        <svg
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          style={{ maxWidth: '90vw', maxHeight: '50vh' }}
        >
          <defs>
            <linearGradient id="ww-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={NIGHT.dusk_rose} />
              <stop offset="50%" stopColor={NIGHT.moon_core} />
              <stop offset="100%" stopColor="#a88fff" />
            </linearGradient>
            <filter id="ww-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer soft ring (track) */}
          <circle
            cx={DIAL_SIZE / 2}
            cy={DIAL_SIZE / 2}
            r={ARC_R}
            fill="none"
            stroke={hexToRgba(NIGHT.violet_2, 0.55)}
            strokeWidth={ARC_WIDTH}
          />

          {/* Sleep arc (bed → wake) */}
          <path
            d={arcPath}
            fill="none"
            stroke="url(#ww-arc)"
            strokeWidth={ARC_WIDTH}
            strokeLinecap="round"
            filter="url(#ww-glow)"
          />

          {/* Tiny sparkle dots along the arc (3 evenly spaced) */}
          {[0.25, 0.5, 0.75].map((t) => {
            const a = bedAngle + t * sweep(bedAngle, wakeAngle);
            const p = polar(a, ARC_R);
            return (
              <circle
                key={t}
                cx={p.x}
                cy={p.y}
                r={1.4}
                fill={NIGHT.petal}
                opacity={0.9}
              />
            );
          })}

          {/* Hour ticks */}
          {Array.from({ length: 48 }, (_, i) => {
            const a = timeToAngle(i / 2, 0);
            const p1 = polar(a, TICK_OUTER);
            const p2 = polar(a, TICK_INNER);
            const major = i % 2 === 0;
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={hexToRgba(NIGHT.petal, major ? 0.55 : 0.25)}
                strokeWidth={major ? 1.2 : 0.8}
              />
            );
          })}

          {/* Hour labels (every 2h) */}
          {hourLabels.map(({ text, angle }) => {
            const p = polar(angle, 108);
            return (
              <text
                key={text}
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono), monospace"
                fontSize="11"
                fill={hexToRgba(NIGHT.petal, 0.6)}
              >
                {text}
              </text>
            );
          })}

          {/* Bed handle (moon) */}
          <g>
            <circle cx={bedPos.x} cy={bedPos.y} r={HANDLE_R} fill={NIGHT.violet_2} stroke={NIGHT.moon_halo} strokeWidth={1.5} />
            <g transform={`translate(${bedPos.x - 8}, ${bedPos.y - 8})`}>
              <path
                d="M14 10.5a6 6 0 1 1-6.5-6.5 5 5 0 0 0 6.5 6.5z"
                fill="none"
                stroke={NIGHT.petal}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* Wake handle (alarm) */}
          <g>
            <circle cx={wakePos.x} cy={wakePos.y} r={HANDLE_R} fill={NIGHT.moon_halo} stroke={NIGHT.moon_core} strokeWidth={1.5} />
            <g transform={`translate(${wakePos.x - 8}, ${wakePos.y - 8})`}>
              <circle cx="8" cy="9" r="5.5" fill="none" stroke={NIGHT.abyss} strokeWidth={1.5} />
              <path d="M8 6.5v3l2 1.5" stroke={NIGHT.abyss} strokeWidth={1.5} strokeLinecap="round" fill="none" />
              <path d="M4 3L2 5M12 3l2 2" stroke={NIGHT.abyss} strokeWidth={1.5} strokeLinecap="round" fill="none" />
            </g>
          </g>
        </svg>

        {/* Center overlay absolutely positioned over the dial */}
        <div
          className="absolute flex flex-col items-center pointer-events-none"
          style={{ transform: 'translateY(-6px)' }}
        >
          <div
            className="flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.3em]"
            style={{ color: NIGHT_TEXT.muted }}
          >
            <AlarmClock size={12} strokeWidth={1.6} />
            Alarma
          </div>
          <div
            className="mt-1 font-display italic font-[500] tabular-nums"
            style={{
              fontSize: 'clamp(28px, 7vw, 34px)',
              color: NIGHT_TEXT.primary,
              letterSpacing: '-0.01em',
            }}
          >
            {formatAmPm(alarmConfig.hour, alarmConfig.minute)}
          </div>
          <button
            onClick={onOpenDetails}
            className="mt-2 w-11 h-9 rounded-full flex items-center justify-center pointer-events-auto transition-transform active:scale-[0.94]"
            style={{
              background: hexToRgba(NIGHT.abyss, 0.7),
              border: `1px solid ${NIGHT_TEXT.divider}`,
              color: NIGHT_TEXT.soft,
            }}
            aria-label="Ajustes de alarma"
          >
            <SettingsIcon size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ─── Bottom enable pill ─────────────────────────── */}
      <div
        className="relative z-10 px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <button
          onClick={handleToggle}
          className="w-full max-w-md mx-auto flex items-center justify-between rounded-full px-5 py-4 transition-colors"
          style={{
            background: alarmEnabled
              ? `linear-gradient(180deg, ${hexToRgba(NIGHT.moon_halo, 0.25)} 0%, ${hexToRgba(NIGHT.dusk_rose, 0.5)} 100%)`
              : hexToRgba(NIGHT.violet_2, 0.5),
            border: `1px solid ${alarmEnabled ? hexToRgba(NIGHT.moon_halo, 0.55) : NIGHT_TEXT.divider}`,
            color: NIGHT_TEXT.primary,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-6 rounded-full relative transition-colors"
              style={{
                background: alarmEnabled ? NIGHT.moon_core : hexToRgba(NIGHT.violet_1, 0.8),
                border: `1px solid ${NIGHT_TEXT.divider}`,
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: alarmEnabled ? '20px' : '2px',
                  background: alarmEnabled ? NIGHT.abyss : NIGHT_TEXT.muted,
                }}
              />
            </div>
            <span className="font-ui text-[13px] tracking-wider" style={{ color: NIGHT_TEXT.primary }}>
              {alarmEnabled ? 'Alarma activa' : 'Alarma apagada'}
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={1.8} style={{ color: NIGHT_TEXT.muted }} />
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/** Sweep from a1 to a2 going clockwise; always positive 0..360 degrees. */
function sweep(a1: number, a2: number): number {
  let d = a2 - a1;
  while (d < 0) d += 360;
  return d;
}

/** Build an SVG arc path from angle a1 → a2 (clockwise) at radius r. */
function buildArcPath(a1: number, a2: number, r: number): string {
  const d = sweep(a1, a2);
  const p1 = polar(a1, r);
  const p2 = polar(a2, r);
  const largeArc = d > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

