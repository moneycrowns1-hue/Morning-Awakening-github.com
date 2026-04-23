'use client';

// ═══════════════════════════════════════════════════════
// OnboardingModal · sunrise reskin. Three-step flow on first
// run: intro → name → class. Replaces the previous dōjō
// styling with the sunrise glass card system and Fraunces
// display type used everywhere else in v8.
//
// Same API (onComplete(name, cls)) so MorningAwakening does
// not change.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import type { OperatorClass } from '@/lib/progression';
import GradientBackground from './GradientBackground';
import { SUNRISE, hexToRgba } from '@/lib/theme';

interface OnboardingModalProps {
  onComplete: (name: string, cls: OperatorClass) => void;
}

interface ClassOption {
  id: OperatorClass;
  label: string;
  bonus: string;
  color: string;
  description: string;
}

const CLASSES: ClassOption[] = [
  {
    id: 'WARRIOR',
    label: 'Guerrero',
    bonus: '+5 Energía',
    color: SUNRISE.dawn2,
    description: 'Fuerza y cardio son tu terreno.',
  },
  {
    id: 'SCHOLAR',
    label: 'Erudito',
    bonus: '+5 Enfoque',
    color: SUNRISE.rise2,
    description: 'Lectura, escritura, conocimiento.',
  },
  {
    id: 'MYSTIC',
    label: 'Místico',
    bonus: '+5 Disciplina',
    color: SUNRISE.rise1,
    description: 'Respiración, frío, meditación.',
  },
];

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<'intro' | 'name' | 'class'>('intro');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<OperatorClass | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { y: 20, opacity: 0, filter: 'blur(6px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out' },
      );
    }
  }, [step]);

  const canAdvance =
    step === 'intro' ||
    (step === 'name' && name.trim().length >= 2) ||
    (step === 'class' && selected !== null);

  const handleNext = () => {
    if (step === 'intro') setStep('name');
    else if (step === 'name') {
      if (name.trim().length >= 2) setStep('class');
    } else if (step === 'class' && selected) {
      onComplete(name.trim(), selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ color: 'var(--sunrise-text)' }}>
      <GradientBackground stage="welcome" particleCount={40} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(5,3,15,0.2) 0%, rgba(5,3,15,0.65) 70%)' }}
      />

      <div
        ref={panelRef}
        key={step}
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(26,15,46,0.92), rgba(11,6,24,0.94))',
          border: '1px solid rgba(255,250,240,0.1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 40px rgba(244,194,103,0.08)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-6">
          {(['intro', 'name', 'class'] as const).map((s) => (
            <span
              key={s}
              className="h-[3px] rounded-full transition-all"
              style={{
                width: s === step ? 28 : 18,
                background: s === step ? SUNRISE.rise2 : 'rgba(255,250,240,0.15)',
              }}
            />
          ))}
        </div>

        {step === 'intro' && (
          <div className="text-center">
            <div
              className="font-ui text-[10px] uppercase tracking-[0.42em] mb-3"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Morning Awakening
            </div>
            <h2
              className="font-display italic font-[400] text-[28px] leading-tight mb-4"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Bienvenido al despertar
            </h2>
            <p
              className="font-ui text-[13px] leading-relaxed mb-2"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              Un protocolo matutino de 12 fases diseñado para forjar disciplina, enfoque y energía.
            </p>
            <p
              className="font-ui text-[12px] leading-relaxed"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Antes de empezar, necesitamos dos datos para personalizar la experiencia.
            </p>
          </div>
        )}

        {step === 'name' && (
          <div>
            <div
              className="font-ui text-[10px] uppercase tracking-[0.38em] mb-2 text-center"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Identidad del operador
            </div>
            <h2
              className="font-display italic font-[400] text-[24px] mb-5 text-center"
              style={{ color: 'var(--sunrise-text)' }}
            >
              ¿Cómo te llamamos?
            </h2>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) handleNext(); }}
              placeholder="Tu nombre"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl text-[17px] text-center focus:outline-none font-ui"
              style={{
                background: 'rgba(5,3,15,0.55)',
                border: '1px solid rgba(255,250,240,0.12)',
                color: 'var(--sunrise-text)',
                letterSpacing: '0.04em',
              }}
            />
            <p
              className="font-ui text-[11px] mt-3 text-center"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              El narrador te llamará así.
            </p>
          </div>
        )}

        {step === 'class' && (
          <div>
            <div
              className="font-ui text-[10px] uppercase tracking-[0.38em] mb-2 text-center"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Asignación de clase
            </div>
            <h2
              className="font-display italic font-[400] text-[24px] mb-5 text-center"
              style={{ color: 'var(--sunrise-text)' }}
            >
              Elige tu camino
            </h2>
            <div className="space-y-2">
              {CLASSES.map((c) => {
                const isActive = selected === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                    style={{
                      border: `1px solid ${isActive ? hexToRgba(c.color, 0.55) : 'rgba(255,250,240,0.08)'}`,
                      background: isActive ? hexToRgba(c.color, 0.1) : 'rgba(255,250,240,0.03)',
                      boxShadow: isActive ? `0 0 18px ${hexToRgba(c.color, 0.25)}` : 'none',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-ui text-[15px] font-[500] tracking-[0.08em]"
                          style={{ color: isActive ? c.color : 'var(--sunrise-text)' }}
                        >
                          {c.label}
                        </span>
                        <span
                          className="font-mono text-[11px] shrink-0"
                          style={{ color: c.color }}
                        >
                          {c.bonus}
                        </span>
                      </div>
                      <div
                        className="font-ui text-[12px] mt-0.5"
                        style={{ color: 'var(--sunrise-text-muted)' }}
                      >
                        {c.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className="group relative mt-6 w-full rounded-full overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            padding: '14px 28px',
            background: canAdvance
              ? `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.18)} 0%, ${hexToRgba(SUNRISE.rise2, 0.34)} 100%)`
              : 'rgba(255,250,240,0.04)',
            border: `1px solid ${canAdvance ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.1)'}`,
          }}
        >
          {canAdvance && <span className="absolute inset-0 rounded-full sunrise-cta-halo pointer-events-none" />}
          <span className="relative flex items-center justify-center gap-2">
            {step === 'class' ? <ShieldCheck size={15} strokeWidth={1.8} /> : null}
            <span
              className="font-ui font-[500] text-[13px] tracking-[0.3em] uppercase"
              style={{ color: canAdvance ? 'var(--sunrise-text)' : 'var(--sunrise-text-muted)' }}
            >
              {step === 'class' ? 'Sellar identidad' : 'Continuar'}
            </span>
            {step !== 'class' && <ArrowRight size={15} strokeWidth={2} />}
          </span>
        </button>
      </div>
    </div>
  );
}
