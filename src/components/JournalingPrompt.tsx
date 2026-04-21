'use client';

import { useEffect, useState } from 'react';
import { getDailyPrompt } from '@/lib/dailyContent';

export default function JournalingPrompt() {
  const [prompt, setPrompt] = useState('');
  const [revealed, setRevealed] = useState('');

  useEffect(() => {
    setPrompt(getDailyPrompt());
  }, []);

  useEffect(() => {
    if (!prompt) return;
    let i = 0;
    setRevealed('');
    const interval = setInterval(() => {
      if (i <= prompt.length) {
        setRevealed(prompt.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [prompt]);

  return (
    <div className="w-full max-w-md mt-4">
      <div className="border border-accent/15 rounded p-5 bg-accent/[0.02]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-accent/60">✎</span>
          <span className="text-[13px] tracking-[0.3em] text-accent/50 font-bold">
            PROMPT DEL DÍA
          </span>
        </div>

        {/* Prompt */}
        <p className="text-sm leading-relaxed text-accent/90 tracking-wide font-medium italic">
          &ldquo;{revealed}{revealed.length < prompt.length && <span className="animate-pulse text-accent">█</span>}&rdquo;
        </p>

        {/* Instruction */}
        <div className="mt-4 pt-3 border-t border-accent/10">
          <p className="text-[13px] text-foreground/30 tracking-wider leading-relaxed">
            Escribe en tu cuaderno a mano. Sin censurar, sin juzgar.
            Deja que las ideas fluyan durante los 5 minutos completos.
          </p>
        </div>
      </div>
    </div>
  );
}
