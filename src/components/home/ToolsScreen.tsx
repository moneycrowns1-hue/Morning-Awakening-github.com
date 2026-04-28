'use client';

// ═══════════════════════════════════════════════════════════
// ToolsScreen · tab "Herramientas" del dock.
//
// Reúne todo lo que NO es protocolo central:
//   · Bienestar: bruxismo · meditación profunda · drenaje
//   · Respiración: Wim Hof · 4-7-8 · NSDR
//   · Soporte:    alarma suave · Apple Fitness
//
// Sustituye al antiguo WellnessHubScreen, ampliándolo.
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import {
  Smile, Brain, Droplet, Wind, Activity, Bell,
  Heart, Check, Zap, Sparkles, ArrowUpRight, X,
  type LucideIcon,
} from 'lucide-react';
import BreathingGuide from '../common/BreathingGuide';
import NightBreathing from '../night/NightBreathing';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { haptics } from '@/lib/common/haptics';
import {
  WELLNESS_ROUTINES,
  formatRoutineMinutes,
  type WellnessRoutine,
} from '@/lib/wellness/wellnessRoutines';
import { isHabitDone, type HabitId } from '@/lib/common/habits';

interface ToolsScreenProps {
  onLaunchBruxism: () => void;
  onLaunchDeepMeditation: () => void;
  onLaunchLymphatic: () => void;
  onLaunchNSDR: () => void;
  onLaunchCoach: () => void;
  onOpenAlarm: () => void;
  onOpenFitness: () => void;
  alarmArmed?: boolean;
}

type BreathOverlay = 'wim_hof' | 'four_seven_eight' | null;

const ROUTINE_ICON: Record<string, LucideIcon> = {
  bruxism: Smile,
  deep_meditation: Brain,
  lymphatic_facial: Droplet,
};

export default function ToolsScreen({
  onLaunchBruxism,
  onLaunchDeepMeditation,
  onLaunchLymphatic,
  onLaunchNSDR,
  onLaunchCoach,
  onOpenAlarm,
  onOpenFitness,
  alarmArmed,
}: ToolsScreenProps) {
  const { day: D, dayText: DT, pair } = useAppTheme();
  const [breathOverlay, setBreathOverlay] = useState<BreathOverlay>(null);

  const habitsToday = useMemo<Record<HabitId, boolean>>(() => {
    return {
      bruxism_exercise: isHabitDone('bruxism_exercise'),
      deep_meditation: isHabitDone('deep_meditation'),
      lymphatic_facial: isHabitDone('lymphatic_facial'),
    } as Record<HabitId, boolean>;
  }, []);

  const cards: { routine: WellnessRoutine; onLaunch: () => void }[] = [
    { routine: WELLNESS_ROUTINES.bruxism, onLaunch: onLaunchBruxism },
    {
      routine: {
        id: 'deep_meditation',
        title: 'Meditación profunda',
        kicker: 'Mindfulness · body scan · metta · 10–20 min',
        icon: 'Brain',
        habitId: 'deep_meditation',
        scienceNote: '',
        steps: [],
      },
      onLaunch: onLaunchDeepMeditation,
    },
    { routine: WELLNESS_ROUTINES.lymphatic_facial, onLaunch: onLaunchLymphatic },
  ];

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* Day-palette gradient background · sustituye a GradientBackground */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${D.tint} 0%, ${D.paper} 60%, ${D.tint_deep} 100%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 100% 100%, ${hexToRgba(D.accent_soft, 0.18)} 0%, transparent 55%)`,
        }}
      />

      {/* Header */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <span
          className="font-ui text-[10px] uppercase tracking-[0.42em]"
          style={{ color: DT.muted }}
        >
          Herramientas · {pair.label}
        </span>
        <div
          className="font-headline font-[600] text-[28px] md:text-[34px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
          style={{ color: DT.primary }}
        >
          bienestar · respiración · soporte
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 max-w-3xl mx-auto mt-5">
          {/* ── Coach launcher · hero dorado ───────────── */}
          <SectionLabel>Coach</SectionLabel>
          <button
            type="button"
            onClick={() => { haptics.tap(); onLaunchCoach(); }}
            className="w-full mt-2 mb-6 text-left transition-transform active:scale-[0.99]"
            style={{
              background: D.accent,
              color: D.paper,
              padding: '18px 20px 16px',
              borderRadius: 28,
              boxShadow: `0 16px 36px -10px ${hexToRgba(D.accent, 0.5)}`,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span
                className="font-ui text-[10px] tracking-[0.34em] uppercase font-[700]"
                style={{ color: D.paper, opacity: 0.78 }}
              >
                tu coach diario
              </span>
              <ArrowUpRight size={20} strokeWidth={2.4} style={{ color: D.paper, flexShrink: 0 }} />
            </div>
            <div
              className="font-headline font-[700] leading-[0.95] lowercase tracking-[-0.025em]"
              style={{ fontSize: 'clamp(2rem, 8.5vw, 2.6rem)', color: D.paper }}
            >
              coach de<br />bienestar
            </div>
            <div
              className="flex items-center justify-between mt-4 pt-3.5"
              style={{ borderTop: `1px solid ${hexToRgba(D.paper, 0.28)}` }}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: hexToRgba(D.paper, 0.2), color: D.paper }}
                >
                  <Sparkles size={13} strokeWidth={2.2} />
                </span>
                <span
                  className="font-mono text-[11.5px] tracking-wider truncate lowercase"
                  style={{ color: D.paper, opacity: 0.85 }}
                >
                  skincare · oral · hidratación · brote
                </span>
              </span>
            </div>
          </button>

          {/* ── Wellness routines · split bento cards ────────── */}
          <SectionLabel>Bienestar</SectionLabel>
          <div className="mt-2 mb-6 flex flex-col gap-2.5">
            {cards.map(({ routine, onLaunch }) => {
              const Icon = ROUTINE_ICON[routine.id] ?? Activity;
              const done = !!habitsToday[routine.habitId];
              const minutes = routine.steps.length > 0
                ? formatRoutineMinutes(routine)
                : '10–20 min';
              return (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => { haptics.tap(); onLaunch(); }}
                  className="text-left flex items-stretch overflow-hidden transition-transform active:scale-[0.99]"
                  style={{
                    borderRadius: 20,
                    background: hexToRgba(D.tint, 0.7),
                    border: `1px solid ${hexToRgba(D.accent, done ? 0.5 : 0.18)}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  {/* LEFT · day glass content */}
                  <div className="flex-1 min-w-0 flex items-start gap-3.5 px-4 py-3.5">
                    <span
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: hexToRgba(D.accent, 0.16),
                        border: `1px solid ${hexToRgba(D.accent, 0.4)}`,
                        color: D.accent,
                      }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-headline font-[600] text-[17px] leading-tight lowercase tracking-[-0.015em] truncate"
                        style={{ color: DT.primary }}
                      >
                        {routine.title.toLowerCase()}
                      </div>
                      <div
                        className="mt-1 font-mono text-[10.5px] tracking-wider lowercase"
                        style={{ color: DT.muted }}
                      >
                        {routine.kicker.toLowerCase()} · {minutes}
                      </div>
                    </div>
                  </div>
                  {/* RIGHT · status (accent sólido cuando done) */}
                  <div
                    className="shrink-0 flex flex-col items-center justify-center px-3 gap-1"
                    style={{
                      minWidth: 64,
                      background: done ? D.accent : hexToRgba(D.accent, 0.12),
                    }}
                  >
                    {done ? (
                      <>
                        <Check size={16} strokeWidth={2.6} style={{ color: D.paper }} />
                        <span
                          className="font-ui text-[9px] tracking-[0.3em] uppercase font-[700]"
                          style={{ color: D.paper, opacity: 0.78 }}
                        >
                          hoy
                        </span>
                      </>
                    ) : (
                      <ArrowUpRight size={18} strokeWidth={2.2} style={{ color: D.accent }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Breathing & NSDR shortcuts ─────────────── */}
          <SectionLabel>Respiración &amp; NSDR</SectionLabel>
          <div className="mt-2 mb-6 grid grid-cols-2 gap-2">
            <ToolChip
              icon={<Activity size={16} strokeWidth={1.85} />}
              title="Wim Hof"
              hint="3 rondas · energizante"
              onClick={() => { haptics.tap(); setBreathOverlay('wim_hof'); }}
            />
            <ToolChip
              icon={<Wind size={16} strokeWidth={1.85} />}
              title="4-7-8"
              hint="4 ciclos · calmante"
              onClick={() => { haptics.tap(); setBreathOverlay('four_seven_eight'); }}
            />
            <ToolChip
              icon={<Zap size={16} strokeWidth={1.85} />}
              title="NSDR"
              hint="20 min · siesta consciente"
              onClick={() => { haptics.tap(); onLaunchNSDR(); }}
            />
          </div>

          {/* ── Support tools ────────────────────── */}
          <SectionLabel>Soporte</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ToolChip
              icon={<Bell size={16} strokeWidth={1.85} />}
              title="Alarma suave"
              hint={alarmArmed ? 'Armada' : 'Configurar'}
              accent={alarmArmed}
              onClick={() => { haptics.tap(); onOpenAlarm(); }}
            />
            <ToolChip
              icon={<Heart size={16} strokeWidth={1.85} />}
              title="Apple Fitness"
              hint="Importar datos"
              onClick={() => { haptics.tap(); onOpenFitness(); }}
            />
          </div>
        </div>
      </div>

      {/* Wim Hof overlay (Wim Hof guide keeps its own internal palette;
          we only theme the wrapper backdrop + close button.) */}
      {breathOverlay === 'wim_hof' && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
          style={{
            background: hexToRgba(D.ink, 0.85),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <button
            type="button"
            onClick={() => { haptics.tap(); setBreathOverlay(null); }}
            aria-label="Cerrar"
            className="absolute right-5 w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
              background: D.accent,
              boxShadow: `0 6px 18px -4px ${hexToRgba(D.accent, 0.5)}`,
            }}
          >
            <X size={18} strokeWidth={2.4} style={{ color: D.paper }} />
          </button>
          <BreathingGuide />
        </div>
      )}

      {/* 4-7-8 overlay */}
      {breathOverlay === 'four_seven_eight' && (
        <NightBreathing onClose={() => setBreathOverlay(null)} />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { dayText: DT } = useAppTheme();
  return (
    <h2
      className="font-ui text-[10px] tracking-[0.34em] uppercase"
      style={{ color: DT.muted }}
    >
      {children}
    </h2>
  );
}

function ToolChip({
  icon,
  title,
  hint,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  accent?: boolean;
}) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-start gap-2.5 px-3.5 py-3 text-left transition-transform active:scale-[0.97] overflow-hidden"
      style={{
        borderRadius: 18,
        background: hexToRgba(D.tint, 0.7),
        border: `1px solid ${hexToRgba(D.accent, accent ? 0.55 : 0.18)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        minHeight: 92,
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: accent ? D.accent : hexToRgba(D.accent, 0.16),
          color: accent ? D.paper : D.accent,
          border: accent ? 'none' : `1px solid ${hexToRgba(D.accent, 0.4)}`,
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0 w-full">
        <div
          className="font-headline font-[600] text-[15px] leading-tight lowercase tracking-[-0.015em] truncate"
          style={{ color: DT.primary }}
        >
          {title.toLowerCase()}
        </div>
        <div
          className="mt-0.5 font-mono text-[10px] tracking-wider lowercase truncate"
          style={{ color: accent ? D.accent : DT.muted }}
        >
          {hint.toLowerCase()}
        </div>
      </div>
      {accent && (
        <span
          className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
          style={{ background: D.accent, boxShadow: `0 0 8px ${D.accent}` }}
        />
      )}
    </button>
  );
}
