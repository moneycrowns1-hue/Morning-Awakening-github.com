'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import type { OperatorClass } from '@/lib/progression';

interface OnboardingModalProps {
  onComplete: (name: string, cls: OperatorClass) => void;
}

interface ClassOption {
  id: OperatorClass;
  kanji: string;
  label: string;
  bonus: string;
  color: string;
  description: string;
}

const CLASSES: ClassOption[] = [
  {
    id: 'WARRIOR',
    kanji: '武',
    label: 'GUERRERO',
    bonus: '+5 Energía',
    color: '#bc002d',
    description: 'Fuerza y cardio son tu terreno.',
  },
  {
    id: 'SCHOLAR',
    kanji: '学',
    label: 'ERUDITO',
    bonus: '+5 Enfoque',
    color: '#c9a227',
    description: 'Lectura, escritura, conocimiento.',
  },
  {
    id: 'MYSTIC',
    kanji: '禅',
    label: 'MÍSTICO',
    bonus: '+5 Disciplina',
    color: '#7a8c5a',
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
      gsap.fromTo(panelRef.current,
        { y: 20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
    }
  }, [step]);

  const handleNext = () => {
    if (step === 'intro') setStep('name');
    else if (step === 'name') {
      if (name.trim().length >= 2) setStep('class');
    } else if (step === 'class' && selected) {
      onComplete(name.trim(), selected);
    }
  };

  const canAdvance =
    step === 'intro' ||
    (step === 'name' && name.trim().length >= 2) ||
    (step === 'class' && selected !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'rgba(10,9,8,0.94)', backdropFilter: 'blur(8px)' }}
    >
      {/* Giant watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="kanji-watermark" style={{ fontSize: 'min(58vw, 58vh)' }}>道</span>
      </div>

      <div
        ref={panelRef}
        key={step}
        className="relative w-full max-w-md rounded p-6"
        style={{
          background: 'rgba(21,18,14,0.92)',
          border: '1px solid rgba(201,162,39,0.3)',
          boxShadow: '0 0 40px rgba(0,0,0,0.7), 0 0 24px rgba(201,162,39,0.15)',
        }}
      >
        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-5">
          {(['intro', 'name', 'class'] as const).map(s => (
            <div
              key={s}
              className="h-[3px] w-8 rounded-full transition-colors"
              style={{ background: s === step ? '#c9a227' : 'rgba(201,162,39,0.2)' }}
            />
          ))}
        </div>

        {step === 'intro' && (
          <div className="text-center">
            <div
              className="kanji-seal mx-auto mb-5"
              style={{ width: '4.5rem', height: '4.5rem', fontSize: '2.6rem' }}
            >
              始
            </div>
            <h2
              className="text-2xl font-bold tracking-[0.2em] mb-3"
              style={{ color: '#e8dcc4', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              BIENVENIDO AL DŌJŌ
            </h2>
            <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'rgba(232,220,196,0.7)' }}>
              Un protocolo matutino de 12 fases diseñado para forjar disciplina, enfoque y energía.
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(232,220,196,0.5)' }}>
              Antes de empezar, el sistema necesita registrar tu identidad de jugador.
            </p>
          </div>
        )}

        {step === 'name' && (
          <div>
            <div
              className="text-[11px] tracking-[0.3em] mb-2 text-center"
              style={{ color: 'rgba(201,162,39,0.6)' }}
            >
              IDENTIFICACIÓN DEL JUGADOR
            </div>
            <h2
              className="text-xl font-bold tracking-[0.2em] mb-5 text-center"
              style={{ color: '#e8dcc4', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              ¿CUÁL ES TU NOMBRE?
            </h2>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) handleNext(); }}
              placeholder="Jugador..."
              maxLength={20}
              className="w-full px-4 py-3 rounded text-lg text-center tracking-[0.15em] focus:outline-none"
              style={{
                background: 'rgba(10,9,8,0.6)',
                border: '1px solid rgba(201,162,39,0.3)',
                color: '#e8dcc4',
                fontFamily: 'var(--font-cinzel), Georgia, serif',
              }}
            />
            <p className="text-[11px] mt-3 text-center" style={{ color: 'rgba(232,220,196,0.35)' }}>
              El sistema te llamará por este nombre.
            </p>
          </div>
        )}

        {step === 'class' && (
          <div>
            <div
              className="text-[11px] tracking-[0.3em] mb-2 text-center"
              style={{ color: 'rgba(201,162,39,0.6)' }}
            >
              ASIGNACIÓN DE CLASE
            </div>
            <h2
              className="text-xl font-bold tracking-[0.2em] mb-4 text-center"
              style={{ color: '#e8dcc4', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            >
              ELIGE TU CAMINO
            </h2>
            <div className="space-y-2">
              {CLASSES.map(c => {
                const isActive = selected === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="w-full flex items-center gap-3 p-3 rounded text-left transition-all hover:brightness-110"
                    style={{
                      border: `1px solid ${isActive ? c.color : 'rgba(201,162,39,0.15)'}`,
                      background: isActive ? `${c.color}12` : 'rgba(10,9,8,0.4)',
                      boxShadow: isActive ? `0 0 14px ${c.color}40, inset 0 0 8px ${c.color}10` : 'none',
                    }}
                  >
                    <div
                      className="shrink-0 w-11 h-11 flex items-center justify-center rounded text-2xl"
                      style={{
                        color: c.color,
                        border: `1px solid ${c.color}55`,
                        fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
                      }}
                    >
                      {c.kanji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[14px] font-bold tracking-[0.2em]"
                          style={{ color: c.color, fontFamily: 'var(--font-cinzel), Georgia, serif' }}
                        >
                          {c.label}
                        </span>
                        <span
                          className="text-[11px] tracking-widest font-semibold"
                          style={{ color: c.color, opacity: 0.85 }}
                        >
                          {c.bonus}
                        </span>
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: 'rgba(232,220,196,0.55)' }}>
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
          className="mt-6 w-full py-3 rounded text-sm font-bold tracking-[0.25em] transition-all inline-flex items-center justify-center gap-2"
          style={{
            border: `1px solid ${canAdvance ? 'rgba(188,0,45,0.6)' : 'rgba(201,162,39,0.15)'}`,
            background: canAdvance ? 'rgba(188,0,45,0.1)' : 'rgba(201,162,39,0.03)',
            color: canAdvance ? '#e8dcc4' : 'rgba(232,220,196,0.3)',
            boxShadow: canAdvance ? '0 0 16px rgba(188,0,45,0.22)' : 'none',
            fontFamily: 'var(--font-cinzel), Georgia, serif',
            cursor: canAdvance ? 'pointer' : 'not-allowed',
          }}
        >
          {step === 'class' ? (
            <>
              <ShieldCheck size={16} strokeWidth={1.8} />
              SELLAR IDENTIDAD
            </>
          ) : (
            <>
              CONTINUAR
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
