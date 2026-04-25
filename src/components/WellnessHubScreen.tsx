'use client';

// ═══════════════════════════════════════════════════════════
// WellnessHubScreen · entry point del Hub Bienestar.
//
// Muestra 3 tarjetas grandes (Bruxismo, Meditación profunda,
// Drenaje linfático), enlaces a las respiraciones existentes
// (Wim Hof y 4-7-8) y el estado de hábitos de hoy con dots.
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { ChevronLeft, Smile, Brain, Droplet, Wind, Activity, Check } from 'lucide-react';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import GradientBackground from './GradientBackground';
import {
  WELLNESS_ROUTINES,
  formatRoutineMinutes,
  type WellnessRoutine,
} from '@/lib/wellnessRoutines';
import { isHabitDone, type HabitId } from '@/lib/habits';
import BreathingGuide from './BreathingGuide';
import NightBreathing from './NightBreathing';

interface WellnessHubScreenProps {
  onClose: () => void;
  onLaunchBruxism: () => void;
  onLaunchDeepMeditation: () => void;
  onLaunchLymphatic: () => void;
}

type BreathOverlay = 'wim_hof' | 'four_seven_eight' | null;

const ROUTINE_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  bruxism: Smile,
  deep_meditation: Brain,
  lymphatic_facial: Droplet,
};

export default function WellnessHubScreen({
  onClose,
  onLaunchBruxism,
  onLaunchDeepMeditation,
  onLaunchLymphatic,
}: WellnessHubScreenProps) {
  const [breathOverlay, setBreathOverlay] = useState<BreathOverlay>(null);

  // Snapshot of which habits are done today, used for the dot indicators.
  const habitsToday = useMemo<Record<HabitId, boolean>>(() => {
    return {
      bruxism_exercise: isHabitDone('bruxism_exercise'),
      deep_meditation: isHabitDone('deep_meditation'),
      lymphatic_facial: isHabitDone('lymphatic_facial'),
    } as Record<HabitId, boolean>;
  }, []);

  const cards: {
    routine: WellnessRoutine;
    onLaunch: () => void;
  }[] = [
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
      className="fixed inset-0 z-[60] w-full h-full flex flex-col"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={40} />

      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => { haptics.tap(); onClose(); }}
          aria-label="Volver"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: SUNRISE_TEXT.soft }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.4em]"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Hub
          </span>
          <span
            className="font-display italic font-[400] text-[24px] leading-none mt-0.5"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            Bienestar
          </span>
        </div>
      </div>

      {/* Body (scroll) */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Routine cards */}
          <div className="mt-3 mb-7 flex flex-col gap-3">
            {cards.map(({ routine, onLaunch }) => {
              const Icon = ROUTINE_ICON[routine.id] ?? Activity;
              const done = !!habitsToday[routine.habitId];
              const minutes = routine.steps.length > 0
                ? formatRoutineMinutes(routine)
                : '10–20 min';
              return (
                <button
                  key={routine.id}
                  onClick={() => { haptics.tap(); onLaunch(); }}
                  className="text-left rounded-2xl p-5 flex items-start gap-4 transition-transform active:scale-[0.98] sunrise-fade-up"
                  style={{
                    background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
                    border: `1px solid ${done
                      ? hexToRgba(SUNRISE.rise2, 0.45)
                      : hexToRgba(SUNRISE.rise2, 0.15)}`,
                    boxShadow: `0 14px 40px -22px ${hexToRgba(SUNRISE.rise2, 0.4)}`,
                  }}
                >
                  <span
                    className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: hexToRgba(SUNRISE.rise2, 0.16),
                      border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
                      color: SUNRISE.rise2,
                    }}
                  >
                    <Icon size={22} strokeWidth={1.7} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-display italic font-[400] text-[19px] truncate"
                        style={{ color: SUNRISE_TEXT.primary }}
                      >
                        {routine.title}
                      </span>
                      {done && (
                        <span
                          className="shrink-0 inline-flex items-center gap-1 font-ui text-[9px] tracking-[0.28em] uppercase px-2 py-0.5 rounded-full"
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
                      className="font-mono text-[10.5px] tracking-wider mb-1.5"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {routine.kicker} · {minutes}
                    </div>
                    {routine.scienceNote && (
                      <p
                        className="font-ui text-[12px] leading-[1.5] line-clamp-3"
                        style={{ color: SUNRISE_TEXT.soft }}
                      >
                        {routine.scienceNote}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Breathing shortcuts */}
          <div className="mb-7">
            <h2
              className="font-ui text-[10px] tracking-[0.34em] uppercase mb-3"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Respiración
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <BreathChip
                icon={<Activity size={16} strokeWidth={1.85} />}
                title="Wim Hof"
                hint="3 rondas · energizante"
                onClick={() => { haptics.tap(); setBreathOverlay('wim_hof'); }}
              />
              <BreathChip
                icon={<Wind size={16} strokeWidth={1.85} />}
                title="4-7-8"
                hint="4 ciclos · calmante"
                onClick={() => { haptics.tap(); setBreathOverlay('four_seven_eight'); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Wim Hof overlay (uses the existing component, full-screen styled). */}
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

      {/* 4-7-8 overlay (already self-contained). */}
      {breathOverlay === 'four_seven_eight' && (
        <NightBreathing onClose={() => setBreathOverlay(null)} />
      )}
    </div>
  );
}

function BreathChip({
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
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-transform active:scale-[0.97]"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
      }}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.14),
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
