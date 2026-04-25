'use client';

// ═══════════════════════════════════════════════════════════
// NucleusTimelineScreen · day-mode home (full screen)
//
// Anatomy:
//   1. Header: clock + day-of-week + "saltar hoy" toggle.
//   2. Sun arc: animated SVG of a sun travelling across an
//      arc, projecting its position from the current real time
//      between 06:50 and 18:00. Trail particles.
//   3. Timeline: 6 NucleusBlockCard stacked vertically, with
//      stagger reveal on mount.
//   4. Footer: progress chip + CTA "Lanzar TÉRMINUS" enabled
//      only after 18:00.
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft, EyeOff, Eye, Moon } from 'lucide-react';
import {
  NUCLEUS_BLOCKS,
  getCurrentBlock,
  hhmmToMinutes,
  isWeekend,
  type NucleusBlock,
} from '@/lib/nucleusConstants';
import { NUCLEUS, NUCLEUS_TEXT, getNucleusStageColors, nucleusRgba } from '@/lib/nucleusTheme';
import {
  isSkippedToday,
  setSkipToday,
  isNucleusEnabled,
  setNucleusEnabled,
  scheduleNucleusPings,
  cancelNucleusPings,
  requestNucleusPermission,
  permissionStatus,
} from '@/lib/nucleusPings';
import NucleusBlockCard from './NucleusBlockCard';
import { haptics } from '@/lib/haptics';

interface NucleusTimelineScreenProps {
  onClose: () => void;
  onLaunchNSDR: () => void;
  onLaunchNight?: () => void;
}

export default function NucleusTimelineScreen({ onClose, onLaunchNight, onLaunchNSDR }: NucleusTimelineScreenProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [skipped, setSkipped] = useState<boolean>(() => isSkippedToday());
  const [pingsOn, setPingsOn] = useState<boolean>(() => isNucleusEnabled());
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => permissionStatus());

  // Tick every 30 s for the sun arc + active progress.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const current = useMemo(() => getCurrentBlock(now), [now]);
  const stage = useMemo(() => getNucleusStageColors(current?.id ?? 'idle'), [current?.id]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stagger reveal of cards on mount.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll<HTMLElement>('[data-block-card]');
    gsap.fromTo(
      cards,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out', stagger: 0.07, delay: 0.15 },
    );
  }, []);

  const toggleSkip = () => {
    haptics.tap();
    const next = !skipped;
    setSkipped(next);
    setSkipToday(next);
    if (next) cancelNucleusPings();
    else if (pingsOn) scheduleNucleusPings();
  };

  const togglePings = async () => {
    haptics.tap();
    if (!pingsOn) {
      const granted = await requestNucleusPermission();
      setPerm(granted);
      if (granted !== 'granted') return;
      setNucleusEnabled(true);
      setPingsOn(true);
      await scheduleNucleusPings();
    } else {
      setNucleusEnabled(false);
      setPingsOn(false);
      await cancelNucleusPings();
    }
  };

  const dayDone = (() => {
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= hhmmToMinutes('18:00');
  })();

  const completedBlocks = NUCLEUS_BLOCKS.filter((b) => {
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= hhmmToMinutes(b.endHHMM);
  }).length;

  const weekend = isWeekend(now);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${stage.sky} 0%, ${stage.horizon} 65%, ${nucleusRgba(NUCLEUS.sky_deep, 0.95)} 100%)`,
        color: NUCLEUS_TEXT.primary,
      }}
    >
      {/* ─── Sun arc background ─────────────────────────── */}
      <SunArc now={now} />

      {/* Subtle vignette for legibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${nucleusRgba(NUCLEUS.sky_deep, 0.55)} 0%, transparent 60%)`,
        }}
      />

      {/* ─── Header ──────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          aria-label="Volver"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: NUCLEUS_TEXT.soft }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.38em]"
            style={{ color: NUCLEUS_TEXT.muted }}
          >
            Día · NUCLEUS
          </span>
          <span
            className="font-display italic font-[400] text-[22px] leading-none mt-1"
            style={{ color: NUCLEUS_TEXT.primary }}
          >
            {formatLongDate(now)}
          </span>
        </div>
        <button
          onClick={togglePings}
          aria-label={pingsOn ? 'Notificaciones activas' : 'Activar notificaciones'}
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: pingsOn ? NUCLEUS.sun_gold : NUCLEUS_TEXT.muted }}
          title={
            perm === 'unsupported'
              ? 'Notificaciones no soportadas'
              : perm === 'denied'
              ? 'Permiso denegado en el navegador'
              : pingsOn
              ? 'Pings activos · pulsa para silenciar'
              : 'Activar pings de micro-hábitos'
          }
        >
          {pingsOn ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Skip-today + weekend pill */}
      <div className="relative z-10 px-5 mt-1 mb-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={toggleSkip}
          className="font-ui text-[10px] tracking-[0.28em] uppercase rounded-full px-3 py-1.5"
          style={{
            background: skipped ? nucleusRgba(NUCLEUS.cloud, 0.15) : nucleusRgba(NUCLEUS.sky_deep, 0.6),
            border: `1px solid ${skipped ? NUCLEUS.sun_halo : nucleusRgba(NUCLEUS.cloud, 0.18)}`,
            color: skipped ? NUCLEUS.sun_halo : NUCLEUS_TEXT.soft,
          }}
        >
          {skipped ? '✓ NUCLEUS pausado hoy' : 'Pausar NUCLEUS hoy'}
        </button>
        {weekend && (
          <span
            className="font-ui text-[10px] tracking-[0.28em] uppercase rounded-full px-3 py-1.5"
            style={{
              background: nucleusRgba(NUCLEUS.cloud, 0.06),
              border: `1px solid ${nucleusRgba(NUCLEUS.cloud, 0.14)}`,
              color: NUCLEUS_TEXT.muted,
            }}
          >
            Fin de semana · ARENA / PRE-ARENA en off
          </span>
        )}
      </div>

      {/* ─── Timeline body ───────────────────────────────── */}
      <div
        ref={containerRef}
        className="scroll-area flex-1 relative z-10 min-h-0 px-4 flex flex-col gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        {/* Anchor: GÉNESIS (above) */}
        <Anchor label="GÉNESIS" sub="Protocolo matutino · 5:00 – 6:50" topOrBottom="top" />

        {NUCLEUS_BLOCKS.map((block) => (
          <NucleusBlockCard
            key={block.id}
            block={block}
            now={now}
            defaultExpanded={current?.id === block.id}
            onAction={(b: NucleusBlock) => {
              if (b.action === 'nsdr') onLaunchNSDR();
            }}
          />
        ))}

        {/* Footer · launch TÉRMINUS */}
        <div
          className="mt-2 rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{
            background: nucleusRgba(NUCLEUS.sky_deep, 0.6),
            border: `1px solid ${dayDone ? nucleusRgba(NUCLEUS.sun_halo, 0.5) : nucleusRgba(NUCLEUS.cloud, 0.12)}`,
            opacity: dayDone ? 1 : 0.85,
          }}
        >
          <div className="min-w-0">
            <div
              className="font-ui text-[10px] tracking-[0.32em] uppercase"
              style={{ color: NUCLEUS_TEXT.muted }}
            >
              Lanzamiento
            </div>
            <div
              className="mt-1 font-display italic font-[400] text-[18px]"
              style={{ color: NUCLEUS_TEXT.primary }}
            >
              TÉRMINUS · 18:00
            </div>
            <div
              className="mt-0.5 font-mono text-[10.5px]"
              style={{ color: NUCLEUS_TEXT.soft }}
            >
              {dayDone ? 'El núcleo fue conquistado.' : `Bloques cerrados · ${completedBlocks} / 6`}
            </div>
          </div>
          {onLaunchNight && (
            <button
              onClick={() => { haptics.tick(); onLaunchNight(); }}
              disabled={!dayDone}
              className="rounded-full px-4 py-2.5 transition-transform active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: dayDone
                  ? `linear-gradient(180deg, ${nucleusRgba(NUCLEUS.sun_gold, 0.18)} 0%, ${nucleusRgba(NUCLEUS.sun_gold, 0.4)} 100%)`
                  : nucleusRgba(NUCLEUS.cloud, 0.08),
                border: `1px solid ${dayDone ? NUCLEUS.sun_halo : nucleusRgba(NUCLEUS.cloud, 0.14)}`,
                color: NUCLEUS_TEXT.primary,
              }}
            >
              <Moon size={14} strokeWidth={1.8} />
              <span className="font-ui font-[500] text-[11px] tracking-[0.3em] uppercase">
                Términus
              </span>
            </button>
          )}
        </div>

        {/* Anchor: TÉRMINUS marker at bottom */}
        <Anchor label="TÉRMINUS" sub="Protocolo nocturno · 18:00 →" topOrBottom="bottom" />
      </div>
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────

function Anchor({ label, sub, topOrBottom }: { label: string; sub: string; topOrBottom: 'top' | 'bottom' }) {
  return (
    <div
      className={`relative flex items-center gap-3 px-3 py-2.5 ${topOrBottom === 'top' ? 'mt-1' : 'mb-2'}`}
      style={{
        opacity: 0.78,
      }}
    >
      <span
        className="block w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: NUCLEUS.sun_gold,
          boxShadow: `0 0 8px ${NUCLEUS.sun_gold}`,
        }}
      />
      <div className="flex-1 h-px" style={{ background: nucleusRgba(NUCLEUS.cloud, 0.22) }} />
      <div className="text-right">
        <div
          className="font-ui text-[10px] tracking-[0.34em] uppercase"
          style={{ color: NUCLEUS.sun_halo }}
        >
          {label}
        </div>
        <div
          className="font-mono text-[9.5px] mt-0.5"
          style={{ color: NUCLEUS_TEXT.muted }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function SunArc({ now }: { now: Date }) {
  // Map the day window 06:50 → 18:00 to a 0..1 ratio. Outside
  // the window the sun is parked at the start (just below dawn
  // line) or end (just past dusk).
  const m = now.getHours() * 60 + now.getMinutes();
  const start = hhmmToMinutes('06:50');
  const end = hhmmToMinutes('18:00');
  const t = Math.max(0, Math.min(1, (m - start) / (end - start)));

  // Arc geometry: half-circle from (0, 280) to (400, 280), peak at (200, 80).
  // Parametric: x = 200 - 200*cos(πt), y = 280 - 200*sin(πt).
  const x = 200 - 200 * Math.cos(Math.PI * t);
  const y = 280 - 200 * Math.sin(Math.PI * t);

  return (
    <svg
      viewBox="0 0 400 320"
      preserveAspectRatio="xMidYMin slice"
      className="absolute inset-0 w-full h-[55%] pointer-events-none"
      aria-hidden="true"
      style={{ opacity: 0.85 }}
    >
      <defs>
        <radialGradient id="sun-arc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={NUCLEUS.sun_halo} stopOpacity="0.95" />
          <stop offset="55%" stopColor={NUCLEUS.sun_gold} stopOpacity="0.55" />
          <stop offset="100%" stopColor={NUCLEUS.sun_gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={NUCLEUS.cloud} stopOpacity="0" />
          <stop offset="50%" stopColor={NUCLEUS.cloud} stopOpacity="0.3" />
          <stop offset="100%" stopColor={NUCLEUS.cloud} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 280 A 200 200 0 0 1 400 280"
        fill="none"
        stroke="url(#arc-line)"
        strokeWidth={1}
        strokeDasharray="3 5"
      />
      {/* Sun glow */}
      <circle cx={x} cy={y} r={52} fill="url(#sun-arc-glow)" />
      <circle cx={x} cy={y} r={14} fill={NUCLEUS.sun_halo} />
      <circle cx={x} cy={y} r={9} fill={NUCLEUS.sun_gold} />
    </svg>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatLongDate(d: Date): string {
  const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const out = fmt.format(d);
  return out.charAt(0).toUpperCase() + out.slice(1);
}
