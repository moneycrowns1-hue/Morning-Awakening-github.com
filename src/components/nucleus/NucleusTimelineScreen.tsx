'use client';

// ═══════════════════════════════════════════════════════════
// NucleusTimelineScreen · day-mode home (full screen)
//
// Diseño · poppr.be / jeton.com / thecraftsmen.tech editorial:
//   - Bg: D.paper (paleta diurna activa).
//   - Header: brand caption izq · pings toggle der.
//   - Hairline progress 1px del día (06:50 → 18:00).
//   - Hero: fecha lowercase XL con punto accent.
//   - Status chips: pausar nucleus · day profile.
//   - Grid 1col / 2col md+ de NucleusBlockCard rounded-22.
//   - Footer split-bento launch TÉRMINUS (estilo welcome).
//   - SIN azul · SIN kanji · SIN sun arc.
// ═══════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ChevronLeft, EyeOff, Eye, Moon, ArrowUpRight } from 'lucide-react';
import {
  NUCLEUS_BLOCKS,
  getCurrentBlock,
  hhmmToMinutes,
  isBlockActiveOnProfile,
  type NucleusBlock,
} from '@/lib/nucleus/nucleusConstants';
import { getDayContext, getDayProfileLabel } from '@/lib/common/dayProfile';
import { useAppTheme } from '@/lib/common/appTheme';
import { hexToRgba } from '@/lib/common/theme';
import {
  isSkippedToday,
  setSkipToday,
  isNucleusEnabled,
  setNucleusEnabled,
  scheduleNucleusPings,
  cancelNucleusPings,
  requestNucleusPermission,
  permissionStatus,
  buildTodayPlan,
} from '@/lib/nucleus/nucleusPings';
import NucleusBlockCard from './NucleusBlockCard';
import { haptics } from '@/lib/common/haptics';

interface NucleusTimelineScreenProps {
  onClose: () => void;
  onLaunchNSDR: () => void;
  onLaunchNight?: () => void;
}

export default function NucleusTimelineScreen({ onClose, onLaunchNight, onLaunchNSDR }: NucleusTimelineScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const [now, setNow] = useState<Date>(() => new Date());
  const [skipped, setSkipped] = useState<boolean>(() => isSkippedToday());
  const [pingsOn, setPingsOn] = useState<boolean>(() => isNucleusEnabled());
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => permissionStatus());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const current = useMemo(() => getCurrentBlock(now), [now]);
  // Plan resuelto por el adapter (incluye micro-hábitos contextuales
  // y supresiones por hábitos ya hechos). Se recomputa cada `now`
  // tick (30 s) para que las inyecciones queden vivas si cambias el
  // check-in del coach o marcas un hábito como hecho.
  const plan = useMemo(() => buildTodayPlan(now), [now]);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const dayCtx = useMemo(() => getDayContext(now), [now]);
  const profile = dayCtx.profile;

  // Daily progress · 06:50 → 18:00
  const dailyProgress = (() => {
    const m = now.getHours() * 60 + now.getMinutes();
    const start = hhmmToMinutes('06:50');
    const end = hhmmToMinutes('18:00');
    return Math.max(0, Math.min(1, (m - start) / (end - start)));
  })();

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* Soft warm radial background tint (very subtle) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.08)} 0%, transparent 55%)`,
        }}
      />

      {/* ─── Header · masthead editorial ─── */}
      <div
        className="relative z-10 px-5 md:px-8 shrink-0 max-w-4xl w-full mx-auto"
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
              día · NUCLEUS
            </span>
          </button>

          {/* Pings toggle · jeton mono */}
          <button
            onClick={togglePings}
            aria-label={pingsOn ? 'Notificaciones activas' : 'Activar notificaciones'}
            className="flex items-center gap-1.5 transition-opacity active:opacity-70"
            style={{
              padding: '6px 12px',
              borderRadius: 99,
              background: pingsOn ? hexToRgba(D.accent, 0.14) : 'transparent',
              border: `1px solid ${pingsOn ? hexToRgba(D.accent, 0.5) : hexToRgba(D.accent, 0.18)}`,
              color: pingsOn ? D.accent : DT.muted,
            }}
            title={
              perm === 'unsupported'
                ? 'Notificaciones no soportadas'
                : perm === 'denied'
                ? 'Permiso denegado'
                : pingsOn
                ? 'Pings activos'
                : 'Activar pings'
            }
          >
            {pingsOn ? <Eye size={11} strokeWidth={2.2} /> : <EyeOff size={11} strokeWidth={2.2} />}
            <span className="font-mono uppercase tracking-[0.32em] font-[700]" style={{ fontSize: 9 }}>
              {pingsOn ? 'pings on' : 'pings off'}
            </span>
          </button>
        </div>

        {/* Hairline progress · daily 06:50 → 18:00 */}
        <div className="relative h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${dailyProgress * 100}%`,
              background: D.accent,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="scroll-area flex-1 relative z-10 min-h-0 w-full overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="px-5 md:px-8 max-w-4xl mx-auto">
          {/* Top corners · clock numeral + bloques counter */}
          <div className="mt-4 flex items-baseline justify-between">
            <span
              className="font-mono tabular-nums font-[600]"
              style={{ color: DT.primary, fontSize: 13, letterSpacing: '0.02em' }}
            >
              {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              <span style={{ color: D.accent }}>.</span>
            </span>
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              · {completedBlocks}/{NUCLEUS_BLOCKS.length} bloques ·
            </span>
          </div>

          {/* Hero · fecha del día */}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em] mt-3"
            style={{
              color: DT.primary,
              fontSize: 'clamp(2.4rem, 9vw, 4rem)',
              lineHeight: 0.92,
              maxWidth: '14ch',
            }}
          >
            {formatLongDate(now).toLowerCase()}
            <span style={{ color: D.accent }}>.</span>
          </h1>

          {/* Status chips · skip + day profile */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleSkip}
              className="font-mono uppercase tracking-[0.32em] font-[700] transition-opacity active:opacity-70"
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                fontSize: 9,
                background: skipped ? hexToRgba(D.accent, 0.14) : 'transparent',
                border: `1px solid ${skipped ? hexToRgba(D.accent, 0.5) : hexToRgba(D.accent, 0.18)}`,
                color: skipped ? D.accent : DT.soft,
              }}
            >
              {skipped ? '· nucleus en pausa hoy ·' : 'pausar nucleus hoy'}
            </button>
            {profile !== 'workday' && (
              <span
                className="font-mono uppercase tracking-[0.32em] font-[700]"
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  fontSize: 9,
                  background: hexToRgba(D.accent_warm, 0.12),
                  border: `1px solid ${hexToRgba(D.accent_warm, 0.4)}`,
                  color: D.accent_warm,
                }}
              >
                · {getDayProfileLabel(dayCtx).toLowerCase()} ·
              </span>
            )}
          </div>

          {/* Adaptive hint del nucleusAdapter · chip hairline.
              Aparece sólo cuando el adapter inyectó micro-hábitos
              o ajustó cadencias por contexto (stress, sleep debt). */}
          {plan.rationale && (
            <div
              className="mt-4 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full"
              style={{
                background: hexToRgba(D.accent, 0.08),
                border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: D.accent,
                  boxShadow: `0 0 6px ${hexToRgba(D.accent, 0.7)}`,
                }}
              />
              <span
                className="font-mono uppercase tracking-[0.32em] font-[700]"
                style={{ color: D.accent, fontSize: 9 }}
              >
                adaptado
              </span>
              <span
                className="font-mono lowercase tracking-[0.05em]"
                style={{ color: DT.soft, fontSize: 10.5 }}
              >
                {plan.rationale}
              </span>
            </div>
          )}

          {/* ── Block grid ──────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.blocks.map((block, idx) => {
              const active = isBlockActiveOnProfile(block, profile);
              return (
                <NucleusBlockCard
                  key={block.id}
                  block={block}
                  index={idx + 1}
                  now={now}
                  defaultExpanded={active && current?.id === block.id}
                  pausedToday={!active}
                  onAction={(b: NucleusBlock) => {
                    if (b.action === 'nsdr') onLaunchNSDR();
                  }}
                />
              );
            })}
          </div>

          {/* ── Footer · launch TÉRMINUS · split bento ──────── */}
          {onLaunchNight && (
            <div
              className="mt-6 flex items-stretch overflow-hidden"
              style={{
                borderRadius: 22,
                background: hexToRgba(D.tint, 0.6),
                border: `1px solid ${hexToRgba(D.accent, dayDone ? 0.5 : 0.16)}`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {/* LEFT · info */}
              <div className="flex-1 min-w-0 px-5 py-5">
                <div
                  className="font-mono uppercase tracking-[0.42em] font-[700]"
                  style={{ color: DT.muted, fontSize: 9 }}
                >
                  lanzamiento nocturno
                </div>
                <div
                  className="mt-2 font-headline font-[700] lowercase tracking-[-0.03em]"
                  style={{ color: DT.primary, fontSize: 28, lineHeight: 0.95 }}
                >
                  términus
                  <span style={{ color: D.accent }}>.</span>
                </div>
                <div
                  className="mt-2 font-mono tabular-nums tracking-[0.1em]"
                  style={{
                    color: dayDone ? D.accent : DT.soft,
                    fontSize: 11,
                  }}
                >
                  {dayDone
                    ? '· el núcleo fue conquistado ·'
                    : `${completedBlocks} / ${NUCLEUS_BLOCKS.length} bloques cerrados`}
                </div>
              </div>
              {/* RIGHT · CTA */}
              <button
                onClick={() => { haptics.tick(); onLaunchNight(); }}
                disabled={!dayDone}
                aria-label="Lanzar TÉRMINUS"
                className="shrink-0 flex flex-col items-center justify-center gap-2 px-6 transition-transform active:scale-[0.97] disabled:cursor-not-allowed"
                style={{
                  minWidth: 110,
                  background: dayDone ? D.accent : hexToRgba(D.accent, 0.06),
                  color: dayDone ? D.paper : DT.muted,
                  opacity: dayDone ? 1 : 0.55,
                }}
              >
                <Moon
                  size={20}
                  strokeWidth={2.2}
                  style={{ color: dayDone ? D.paper : DT.muted }}
                />
                <span
                  className="font-mono uppercase tracking-[0.32em] font-[700]"
                  style={{ color: dayDone ? D.paper : DT.muted, fontSize: 9.5 }}
                >
                  iniciar
                </span>
                <ArrowUpRight
                  size={14}
                  strokeWidth={2.4}
                  style={{ color: dayDone ? D.paper : DT.muted }}
                />
              </button>
            </div>
          )}

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────

function formatLongDate(d: Date): string {
  const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const out = fmt.format(d);
  return out.charAt(0).toUpperCase() + out.slice(1);
}
