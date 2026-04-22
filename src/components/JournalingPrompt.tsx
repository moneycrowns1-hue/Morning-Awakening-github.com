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
      <div
        className="rounded p-5"
        style={{ border: '1px solid rgba(201,162,39,0.2)', background: 'rgba(201,162,39,0.03)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span style={{ color: 'rgba(201,162,39,0.7)' }}>✎</span>
          <span
            className="text-[12px] tracking-[0.3em] font-bold"
            style={{ color: 'rgba(201,162,39,0.6)', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            PROMPT DEL DÍA
          </span>
        </div>

        <p
          className="text-sm leading-relaxed tracking-wide font-medium italic"
          style={{ color: 'rgba(232,220,196,0.9)' }}
        >
          &ldquo;{revealed}
          {revealed.length < prompt.length && (
            <span className="animate-pulse" style={{ color: '#c9a227' }}>█</span>
          )}&rdquo;
        </p>

        <div
          className="mt-4 pt-3"
          style={{ borderTop: '1px solid rgba(201,162,39,0.12)' }}
        >
          <p className="text-[13px] tracking-wider leading-relaxed" style={{ color: 'rgba(232,220,196,0.4)' }}>
            Escribe en tu cuaderno a mano. Sin censurar, sin juzgar.
            Deja que las ideas fluyan durante los 5 minutos completos.
          </p>
        </div>
      </div>
    </div>
  );
}
