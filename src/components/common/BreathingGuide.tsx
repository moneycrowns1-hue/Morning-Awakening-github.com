'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Play } from 'lucide-react';

type BreathPhase = 'POWER' | 'HOLD' | 'RECOVERY' | 'REST';

interface WimHofState {
  round: number;
  phase: BreathPhase;
  breathCount: number;
  holdTimer: number;
  isInhaling: boolean;
}

export default function BreathingGuide() {
  const [state, setState] = useState<WimHofState>({
    round: 1, phase: 'POWER', breathCount: 0, holdTimer: 0, isInhaling: true,
  });
  const [active, setActive] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalRounds = 3;
  const breathsPerRound = 30;
  const holdDuration = 30;
  const recoveryHold = 15;

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Circle animation based on phase
  useEffect(() => {
    if (!circleRef.current || !active) return;
    const el = circleRef.current;

    if (state.phase === 'POWER') {
      if (state.isInhaling) {
        gsap.to(el, { scale: 1.3, duration: 0.8, ease: 'power1.inOut' });
      } else {
        gsap.to(el, { scale: 0.8, duration: 0.7, ease: 'power1.inOut' });
      }
    } else if (state.phase === 'HOLD') {
      gsap.to(el, { scale: 0.6, duration: 1, ease: 'power2.out' });
    } else if (state.phase === 'RECOVERY') {
      gsap.to(el, { scale: 1.4, duration: 2, ease: 'power1.inOut' });
    } else if (state.phase === 'REST') {
      gsap.to(el, { scale: 1, duration: 1, ease: 'power2.inOut' });
    }
  }, [state.phase, state.isInhaling, state.breathCount, active]);

  const startPowerBreathing = useCallback((round: number) => {
    let count = 0;
    let inhaling = true;

    setState(s => ({ ...s, round, phase: 'POWER', breathCount: 0, isInhaling: true }));

    intervalRef.current = setInterval(() => {
      if (inhaling) {
        inhaling = false;
        setState(s => ({ ...s, isInhaling: false }));
      } else {
        count++;
        inhaling = true;
        setState(s => ({ ...s, breathCount: count, isInhaling: true }));

        if (count >= breathsPerRound) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          startHoldPhase(round);
        }
      }
    }, 750);
  }, []);

  const startHoldPhase = useCallback((round: number) => {
    let timer = 0;
    setState(s => ({ ...s, phase: 'HOLD', holdTimer: 0 }));

    intervalRef.current = setInterval(() => {
      timer++;
      setState(s => ({ ...s, holdTimer: timer }));
      if (timer >= holdDuration) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        startRecoveryPhase(round);
      }
    }, 1000);
  }, []);

  const startRecoveryPhase = useCallback((round: number) => {
    let timer = 0;
    setState(s => ({ ...s, phase: 'RECOVERY', holdTimer: 0 }));

    intervalRef.current = setInterval(() => {
      timer++;
      setState(s => ({ ...s, holdTimer: timer }));
      if (timer >= recoveryHold) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (round < totalRounds) {
          setState(s => ({ ...s, phase: 'REST' }));
          timeoutRef.current = setTimeout(() => startPowerBreathing(round + 1), 3000);
        } else {
          setState(s => ({ ...s, phase: 'REST' }));
        }
      }
    }, 1000);
  }, [startPowerBreathing]);

  const handleStart = useCallback(() => {
    setActive(true);
    startPowerBreathing(1);
  }, [startPowerBreathing]);

  const getPhaseLabel = (): string => {
    switch (state.phase) {
      case 'POWER': return state.isInhaling ? 'INHALA' : 'EXHALA';
      case 'HOLD': return 'RETÉN';
      case 'RECOVERY': return 'RECUPERACIÓN';
      case 'REST': return state.round >= totalRounds ? 'COMPLETO' : 'PREPARANDO...';
    }
  };

  const getPhaseDescription = (): string => {
    switch (state.phase) {
      case 'POWER': return `Respiración ${state.breathCount}/${breathsPerRound}`;
      case 'HOLD': return `Exhala y mantén — ${state.holdTimer}s`;
      case 'RECOVERY': return `Inhala profundo y mantén — ${state.holdTimer}s`;
      case 'REST': return state.round >= totalRounds ? 'Todas las rondas completadas' : 'Siguiente ronda en 3s...';
    }
  };

  if (!active) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-[13px] tracking-[0.3em]" style={{ color: 'rgba(201,162,39,0.55)' }}>
          MÉTODO WIM HOF · 3 RONDAS
        </div>
        <div className="text-[13px] max-w-xs text-center leading-relaxed" style={{ color: 'rgba(232,220,196,0.45)' }}>
          30 respiraciones profundas rápidas → Retención tras exhalar → Respiración de recuperación
        </div>
        <button
          onClick={handleStart}
          className="mt-2 px-6 py-3 rounded text-sm tracking-[0.25em] transition-all animate-ember-pulse hover:brightness-125 inline-flex items-center gap-2"
          style={{
            border: '1px solid rgba(201,162,39,0.4)',
            color: '#c9a227',
            background: 'rgba(201,162,39,0.06)',
            fontFamily: 'var(--font-cinzel), Georgia, serif',
          }}
        >
          <Play size={14} strokeWidth={1.8} fill="#c9a227" />
          INICIAR RESPIRACIÓN
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Round indicator */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map(r => (
          <div key={r} className="flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full border ${r === state.round ? 'animate-pulse' : ''}`}
              style={{
                borderColor: r <= state.round ? '#c9a227' : 'rgba(232,220,196,0.18)',
                background: r < state.round ? '#c9a227' : 'transparent',
              }}
            />
            <span className="text-[12px] tracking-wider" style={{ color: 'rgba(201,162,39,0.4)' }}>R{r}</span>
          </div>
        ))}
      </div>

      {/* Breathing circle */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-4">
        <div
          ref={circleRef}
          className="w-24 h-24 rounded-full border-2 flex items-center justify-center"
          style={{
            boxShadow: state.phase === 'HOLD'
              ? '0 0 30px rgba(188,0,45,0.4)'
              : '0 0 30px rgba(201,162,39,0.35)',
            borderColor: state.phase === 'HOLD' ? '#bc002d' : '#c9a227',
          }}
        >
          <span
            className="text-[14px] tracking-[0.2em] font-bold"
            style={{ color: state.phase === 'HOLD' ? '#bc002d' : '#c9a227' }}
          >
            {state.phase === 'POWER' ? state.breathCount : state.holdTimer + 's'}
          </span>
        </div>
      </div>

      {/* Phase label */}
      <div
        className="text-lg font-bold tracking-wider mb-1 ember-text"
        style={{
          color: state.phase === 'HOLD' ? '#bc002d' : '#c9a227',
          fontFamily: 'var(--font-cinzel), Georgia, serif',
        }}
      >
        {getPhaseLabel()}
      </div>
      <div className="text-[14px] tracking-wider" style={{ color: 'rgba(232,220,196,0.5)' }}>
        {getPhaseDescription()}
      </div>
      <div className="text-[12px] mt-2 tracking-[0.25em]" style={{ color: 'rgba(201,162,39,0.4)' }}>
        RONDA {state.round}/{totalRounds}
      </div>
    </div>
  );
}
