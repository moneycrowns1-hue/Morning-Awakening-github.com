'use client';

// ═══════════════════════════════════════════════════════════
// NightProtocolFlow · parent state machine for the night flow
// States: WELCOME → MISSION (n phases) → SUMMARY → LOCK → exit
//
// Owns the Operator instance for TTS (shared pipeline as morning),
// the mode selection (full / express), the filtered mission list,
// and the current phase index. Also coordinates with the parent
// (MorningAwakening) so the alarm can still ring over the top.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import NightWelcomeScreen, { type NightMode } from './NightWelcomeScreen';
import NightMissionPhase from './NightMissionPhase';
import NightSummaryScreen from './NightSummaryScreen';
import SlumberLockScreen from './SlumberLockScreen';
import type { NightMission } from '@/lib/night/nightConstants';
import type { NightAdaptedPlan } from '@/lib/night/nightAdapter';
import type { AlarmConfig } from '@/lib/ritual/ritualSchedule';
import { AudioEngine } from '@/lib/common/audioEngine';
import { Operator } from '@/lib/genesis/operator';
import { markHabit, isHabitDone } from '@/lib/common/habits';
import { ownedToolIds } from '@/lib/looksmax/inventory';

type FlowState = 'WELCOME' | 'MISSION' | 'SUMMARY' | 'LOCK';

interface NightProtocolFlowProps {
  alarmConfig: AlarmConfig;
  voiceEnabled: boolean;
  masterVolume: number;
  onClose: () => void;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NightProtocolFlow({
  alarmConfig,
  voiceEnabled,
  masterVolume,
  onClose,
}: NightProtocolFlowProps) {
  const [state, setState] = useState<FlowState>('WELCOME');
  // Plan resuelto por el adapter cuando el usuario entra al protocolo.
  // Mientras está null el flow sigue en WELCOME, así que es seguro.
  const [plan, setPlan] = useState<NightAdaptedPlan | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const audioRef = useRef<AudioEngine | null>(null);
  const operatorRef = useRef<Operator | null>(null);

  const mode: NightMode = plan?.mode ?? 'full';
  const missions: NightMission[] = plan?.missions ?? [];
  const currentMission: NightMission | undefined = missions[phaseIdx];

  const completedToday = typeof window !== 'undefined' ? isHabitDone('night_protocol') : false;

  // Tear down audio when the flow unmounts.
  useEffect(() => {
    return () => {
      try { operatorRef.current?.cancel(); } catch { /* ignore */ }
      try { audioRef.current?.stopAll(); } catch { /* ignore */ }
    };
  }, []);

  const ensureAudio = async () => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
      audioRef.current.init();
      audioRef.current.setMasterVolume(masterVolume);
    }
    if (!operatorRef.current) {
      operatorRef.current = new Operator(audioRef.current);
      operatorRef.current.setEnabled(voiceEnabled);
    }
    operatorRef.current.unlockForIOS();
    await audioRef.current.resume();
  };

  const handleEnter = async (nextPlan: NightAdaptedPlan) => {
    setPlan(nextPlan);
    setPhaseIdx(0);
    await ensureAudio();
    setState('MISSION');
  };

  const handleEnterSlumberDirect = async () => {
    // Shortcut: skip protocol, go straight to lock.
    await ensureAudio();
    setState('LOCK');
  };

  const handleMissionComplete = () => {
    // Per-phase habit marking (looksmax night layer).
    // Free-tier siempre se trackea; gated por tool solo si está
    // en el inventario. Nunca debe romper el flow → try/catch.
    try {
      const finished = missions[phaseIdx];
      if (finished) {
        const today = todayISO();
        const owned = ownedToolIds();
        switch (finished.id) {
          case 'hygiene':
            // Hilo dental siempre (asume cualquier hilo como free).
            markHabit('floss', today);
            // Gated por inventario: retinoide, BHA, derma-roller, minox.
            if (owned.has('tretinoin') || owned.has('retinoid_otc')) {
              markHabit('retinoid_pm', today);
            }
            if (owned.has('salicylic_acid')) {
              // Exfoliación semanal: se trackea, pero el usuario sabe
              // que la ejecuta solo 1-2 noches/semana. El hábito
              // refleja el acto, no la obligación diaria.
              markHabit('exfoliation_weekly', today);
            }
            if (owned.has('derma_roller_05')) {
              markHabit('derma_roller_week', today);
            }
            if (owned.has('minoxidil_5')) {
              markHabit('minoxidil_application', today);
            }
            break;
          case 'stasis':
            markHabit('sleep_supine', today);
            if (owned.has('mouth_tape')) markHabit('mouth_tape', today);
            break;
          default:
            break;
        }
      }
    } catch { /* ignore */ }

    const nextIdx = phaseIdx + 1;
    if (nextIdx >= missions.length) {
      // All phases done → summary. Mark night_protocol habit now
      // (the SlumberLockScreen also marks it on mount as a safety net).
      markHabit('night_protocol', todayISO());
      // Track breathing / journaling habits if those phases ran.
      if (missions.some((m) => m.interaction === 'breath')) {
        markHabit('breathing', todayISO());
      }
      if (missions.some((m) => m.interaction === 'journal')) {
        markHabit('journaling', todayISO());
      }
      setState('SUMMARY');
    } else {
      setPhaseIdx(nextIdx);
    }
  };

  const handleSkipPhase = () => {
    // Treat skip identically to complete for flow purposes.
    handleMissionComplete();
  };

  if (state === 'WELCOME') {
    return (
      <NightWelcomeScreen
        alarmConfig={alarmConfig}
        onEnter={handleEnter}
        onEnterSlumber={handleEnterSlumberDirect}
        onClose={onClose}
        completedToday={completedToday}
      />
    );
  }

  if (state === 'MISSION' && currentMission) {
    const duration = mode === 'express'
      ? (currentMission.durationExpress ?? currentMission.duration)
      : currentMission.duration;
    return (
      <NightMissionPhase
        key={currentMission.id}
        mission={currentMission}
        durationSec={duration}
        totalPhases={missions.length}
        phaseIndex={phaseIdx + 1}
        onComplete={handleMissionComplete}
        operator={operatorRef.current}
        onSkipPhase={handleSkipPhase}
      />
    );
  }

  if (state === 'SUMMARY') {
    return (
      <NightSummaryScreen
        mode={mode}
        onEnterSlumber={() => setState('LOCK')}
      />
    );
  }

  // LOCK
  return (
    <SlumberLockScreen
      alarmConfig={alarmConfig}
      onExit={onClose}
    />
  );
}
