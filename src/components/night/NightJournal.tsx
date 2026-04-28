'use client';

// ═══════════════════════════════════════════════════════
// NightJournal · short end-of-day mental download.
// V5 cosmos · paleta dinámica (useNightPalette).
// Three prompts rotate by date so the user isn't staring
// at the same page every night. Entries are appended to
// localStorage under 'morning-awakening-night-journal'.
// ═══════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { haptics } from '@/lib/common/haptics';
import { hexToRgba } from '@/lib/common/theme';
import { useNightPalette } from '@/lib/night/nightPalette';
import NightStarfield from './NightStarfield';

interface NightJournalProps {
  onClose: () => void;
}

const PROMPTS = [
  'Un momento del día por el que agradeces.',
  'Algo que sueltas antes de dormir.',
  'La victoria más pequeña de hoy.',
  'Una pregunta que dejas para mañana.',
  '¿Qué quieres recordar de este día dentro de un año?',
  'Una persona a la que le mandarías luz esta noche.',
  '¿Cómo está tu cuerpo justo ahora?',
];

function promptForToday(): string {
  const day = Math.floor(Date.now() / 86_400_000);
  return PROMPTS[day % PROMPTS.length];
}

const STORE_KEY = 'morning-awakening-night-journal';

interface JournalEntry {
  date: string;
  prompt: string;
  text: string;
}

function appendEntry(entry: JournalEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr: JournalEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    const trimmed = arr.slice(-90);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export default function NightJournal({ onClose }: NightJournalProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const prompt = useMemo(() => promptForToday(), []);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!text.trim()) { onClose(); return; }
    haptics.tap();
    appendEntry({
      date: new Date().toISOString(),
      prompt,
      text: text.trim(),
    });
    setSaved(true);
    window.setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col px-6 pt-6 pb-8 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${N.ember_1} 0%, ${N.void} 70%)`,
        color: NT.primary,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-journal-title"
    >
      {/* Starfield ambient */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <NightStarfield count={50} shooting={false} />
      </div>
      {/* Soft amber glow at top */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: -120,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 380,
          height: 240,
          background: `radial-gradient(ellipse, ${hexToRgba(N.amber, 0.18)} 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between mb-7">
        <div className="flex-1 pr-4">
          <div
            className="font-mono uppercase tracking-[0.42em] font-[600]"
            style={{ color: hexToRgba(N.amber, 0.7), fontSize: 9 }}
          >
            vaciado mental
          </div>
          <div
            aria-hidden
            className="mt-2 mb-3"
            style={{
              width: 28,
              height: 1,
              background: hexToRgba(N.amber, 0.55),
            }}
          />
          <h2
            id="night-journal-title"
            className="font-headline font-[500] leading-[1.2]"
            style={{
              color: NT.primary,
              fontSize: 'clamp(20px, 5.5vw, 26px)',
              letterSpacing: '-0.01em',
            }}
          >
            {prompt}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar journal"
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{
            border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            background: hexToRgba(N.void, 0.4),
            color: NT.soft,
          }}
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe sin pensar mucho…"
        className="relative z-10 flex-1 rounded-[18px] p-4 font-ui text-[14px] leading-relaxed resize-none outline-none transition-colors"
        style={{
          border: `1px solid ${hexToRgba(N.amber, 0.14)}`,
          background: hexToRgba(N.void, 0.55),
          color: NT.primary,
          caretColor: N.amber,
        }}
        autoFocus
      />

      {/* Footer */}
      <div
        className="relative z-10 flex items-center justify-between mt-5 pt-4"
        style={{ borderTop: `1px solid ${hexToRgba(N.amber, 0.12)}` }}
      >
        <span
          className="font-mono tabular-nums tracking-[0.18em]"
          style={{ color: NT.muted, fontSize: 10 }}
        >
          {String(text.length).padStart(3, '0')} caracteres
        </span>
        <button
          onClick={save}
          disabled={saved}
          className="px-5 py-3 transition-transform active:scale-[0.97] disabled:opacity-60"
          style={{
            background: saved ? hexToRgba(N.amber, 0.4) : N.amber,
            color: N.void,
            boxShadow: saved ? 'none' : `0 10px 28px -6px ${hexToRgba(N.amber, 0.5)}`,
          }}
        >
          <span className="font-ui font-[700] uppercase tracking-[0.3em]" style={{ fontSize: 11 }}>
            {saved ? 'guardado' : text.trim() ? 'guardar y salir' : 'saltar'}
          </span>
        </button>
      </div>
    </div>
  );
}
