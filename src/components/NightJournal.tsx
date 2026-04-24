'use client';

// ═══════════════════════════════════════════════════════
// NightJournal · short end-of-day mental download.
// Three prompts rotate by date so the user isn't staring
// at the same page every night. Entries are appended to
// localStorage under 'morning-awakening-night-journal'
// as {date, prompt, text} records — kept simple, no
// sessionHistory integration yet.
// ═══════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { SUNRISE, hexToRgba } from '@/lib/theme';

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
    // Keep only the last 90 nights to bound storage.
    const trimmed = arr.slice(-90);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export default function NightJournal({ onClose }: NightJournalProps) {
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
    // Give the user 900 ms to see the confirmation before closing.
    window.setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col px-6 pt-6 pb-8"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.night, 0.94)}, ${hexToRgba(SUNRISE.predawn1, 0.96)})`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="night-journal-title"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div
            className="font-ui text-[10px] tracking-[0.42em] uppercase"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Escribir antes de dormir
          </div>
          <h2
            id="night-journal-title"
            className="font-display italic font-[400] text-[20px] leading-snug mt-1"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {prompt}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar journal"
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{
            border: '1px solid rgba(255,250,240,0.12)',
            background: 'rgba(255,250,240,0.04)',
            color: 'var(--sunrise-text-soft)',
          }}
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe sin pensar mucho…"
        className="flex-1 rounded-2xl p-4 font-ui text-[14px] leading-relaxed resize-none outline-none"
        style={{
          border: '1px solid rgba(255,250,240,0.08)',
          background: 'rgba(255,250,240,0.03)',
          color: 'var(--sunrise-text)',
          caretColor: SUNRISE.rise2,
        }}
        autoFocus
      />

      <div className="flex items-center justify-between mt-4">
        <span
          className="font-mono text-[10px] tracking-[0.18em]"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {text.length} caracteres
        </span>
        <button
          onClick={save}
          disabled={saved}
          className="px-5 py-3 rounded-full font-ui text-[12px] tracking-[0.22em] uppercase transition-transform active:scale-[0.97] disabled:opacity-60"
          style={{
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.55)}`,
            background: saved
              ? hexToRgba(SUNRISE.rise2, 0.28)
              : `linear-gradient(180deg, ${hexToRgba(SUNRISE.rise2, 0.18)}, ${hexToRgba(SUNRISE.rise2, 0.32)})`,
            color: 'var(--sunrise-text)',
          }}
        >
          {saved ? 'Guardado ✓' : text.trim() ? 'Guardar y salir' : 'Saltar'}
        </button>
      </div>
    </div>
  );
}
