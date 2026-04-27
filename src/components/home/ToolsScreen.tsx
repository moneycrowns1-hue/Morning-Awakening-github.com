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
  Heart, Check, Zap, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import BreathingGuide from '../common/BreathingGuide';
import NightBreathing from '../night/NightBreathing';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
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
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={40} />

      {/* Header */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <span
          className="font-ui text-[10px] uppercase tracking-[0.42em]"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Herramientas
        </span>
        <div
          className="font-display italic font-[400] text-[26px] leading-tight mt-0.5"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          Bienestar · Respiración · Soporte
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 max-w-3xl mx-auto mt-5">
          {/* ── Coach launcher ───────────────── */}
          <SectionLabel>Coach</SectionLabel>
          <button
            type="button"
            onClick={() => { haptics.tap(); onLaunchCoach(); }}
            className="w-full mt-2 mb-6 text-left rounded-2xl p-4 flex items-start gap-4 transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.32)}`,
            }}
          >
            <span
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: hexToRgba(SUNRISE.rise2, 0.18),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
                color: SUNRISE.rise2,
              }}
            >
              <Sparkles size={20} strokeWidth={1.7} />
            </span>
            <div className="flex-1 min-w-0">
              <span
                className="font-display italic font-[400] text-[18px] leading-tight"
                style={{ color: SUNRISE_TEXT.primary }}
              >
                Coach de bienestar
              </span>
              <div
                className="font-mono text-[10.5px] tracking-wider mt-0.5"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                Skincare · oral · hidratación · bruxismo · brote
              </div>
            </div>
          </button>

          {/* ── Wellness routines ──────────────── */}
          <SectionLabel>Bienestar</SectionLabel>
          <div className="mt-2 mb-6 flex flex-col gap-3">
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
                  className="text-left rounded-2xl p-4 flex items-start gap-4 transition-transform active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
                    border: `1px solid ${done
                      ? hexToRgba(SUNRISE.rise2, 0.45)
                      : hexToRgba(SUNRISE.rise2, 0.15)}`,
                  }}
                >
                  <span
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: hexToRgba(SUNRISE.rise2, 0.16),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
                      color: SUNRISE.rise2,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className="font-display italic font-[400] text-[18px] leading-tight"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {routine.title}
                      </span>
                      {done && (
                        <span
                          className="inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background: hexToRgba(SUNRISE.rise2, 0.22),
                            color: SUNRISE.rise2,
                            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
                          }}
                        >
                          <Check size={10} strokeWidth={2.4} />
                          Hoy
                        </span>
                      )}
                    </div>
                    <div
                      className="font-mono text-[10.5px] tracking-wider"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {routine.kicker} · {minutes}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Breathing & NSDR shortcuts ─────────────────── */}
          <SectionLabel>Respiración &amp; NSDR</SectionLabel>
          <div className="mt-2 mb-6 grid grid-cols-2 gap-2.5">
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

          {/* ── Support tools ──────────────────────────────── */}
          <SectionLabel>Soporte</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
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

      {/* Wim Hof overlay */}
      {breathOverlay === 'wim_hof' && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
          style={{
            background: hexToRgba(SUNRISE.night, 0.96),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <button
            type="button"
            onClick={() => { haptics.tap(); setBreathOverlay(null); }}
            className="absolute top-5 right-5 rounded-full px-3 py-1.5 font-ui text-[10px] tracking-[0.28em] uppercase"
            style={{
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.5)}`,
              background: hexToRgba(SUNRISE.rise2, 0.1),
              color: SUNRISE.rise2,
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
            }}
          >
            Cerrar
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
  return (
    <h2
      className="font-ui text-[10px] tracking-[0.34em] uppercase"
      style={{ color: SUNRISE_TEXT.muted }}
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-transform active:scale-[0.97]"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, accent ? 0.4 : 0.18)}`,
      }}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, accent ? 0.22 : 0.14),
          color: SUNRISE.rise2,
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="font-display italic font-[400] text-[15px] leading-tight truncate"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {title}
        </div>
        <div
          className="font-ui text-[10.5px] tracking-wider"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {hint}
        </div>
      </div>
    </button>
  );
}
