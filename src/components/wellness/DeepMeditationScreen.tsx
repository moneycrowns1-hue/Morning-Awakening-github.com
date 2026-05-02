'use client';

// ═══════════════════════════════════════════════════════════
// DeepMeditationScreen · 3-mode meditation with selectable
// duration (10/15/20 min).
//
// v2 — Enhanced with:
//   · SVG mini-icon per mode in the picker (waves / silhouette / heart)
//   · Ambient background gradient that shifts with selected mode
//   · Live preview of the MeditationScene above the hero title
//   · Science motivational quote rotator
//   · Subtitle toggle (off by default) — persisted in localStorage
//
// Paleta · useNightPalette() for global sync.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ChevronLeft, Play, Check, Type } from 'lucide-react';
import { useNightPalette } from '@/lib/night/nightPalette';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import {
  buildDeepMeditationRoutine,
  DEEP_MEDITATION_MODES,
  type DeepMeditationMode,
} from '@/lib/wellness/wellnessRoutines';
import WellnessSessionRunner from './WellnessSessionRunner';

const MODE_KEY = 'ma-deepmed-mode';
const DURATION_KEY = 'ma-deepmed-duration';
const SUBTITLES_KEY = 'ma-deepmed-subtitles';

type Duration = 10 | 15 | 20;
const DURATIONS: Duration[] = [10, 15, 20];

// Motivational science quotes shown below the hero title
const SCIENCE_QUOTES: { text: string; source: string }[] = [
  {
    text: '12 min diarios × 8 semanas = −22% reactividad emocional.',
    source: 'Hölzel et al., 2011',
  },
  {
    text: 'La meditación aumenta la densidad de materia gris en el hipocampo.',
    source: 'Harvard / Massachusetts General Hospital',
  },
  {
    text: 'Mindfulness reduce cortisol hasta un 25% en 8 semanas.',
    source: 'Turakitwanakan et al., 2013',
  },
  {
    text: 'Body scan activa la ínsula, mejorando la interocepción corporal.',
    source: 'Farb et al., 2013',
  },
  {
    text: 'Metta fortalece circuitos de empatía y reduce sesgo inconsciente.',
    source: 'Kang et al., 2014',
  },
];

// Ambient gradient per mode — defines the subtle bg shift
const MODE_AMBIENTS: Record<DeepMeditationMode, { radial: string; accent: string }> = {
  mindfulness: {
    radial: 'radial-gradient(ellipse at 50% 20%, rgba(100, 140, 180, 0.08) 0%, transparent 65%)',
    accent: 'rgba(100, 160, 220, 0.06)',
  },
  body_scan: {
    radial: 'radial-gradient(ellipse at 50% 20%, rgba(180, 140, 100, 0.08) 0%, transparent 65%)',
    accent: 'rgba(220, 160, 100, 0.06)',
  },
  metta: {
    radial: 'radial-gradient(ellipse at 50% 20%, rgba(180, 100, 140, 0.08) 0%, transparent 65%)',
    accent: 'rgba(220, 100, 160, 0.06)',
  },
};

interface DeepMeditationScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function DeepMeditationScreen({ onComplete, onCancel }: DeepMeditationScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();
  const [mode, setMode] = useState<DeepMeditationMode>('mindfulness');
  const [duration, setDuration] = useState<Duration>(15);
  const [started, setStarted] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * SCIENCE_QUOTES.length));

  // Hydrate persisted picks.
  useEffect(() => {
    try {
      const m = window.localStorage.getItem(MODE_KEY);
      if (m === 'mindfulness' || m === 'body_scan' || m === 'metta') setMode(m);
      const d = window.localStorage.getItem(DURATION_KEY);
      if (d === '10' || d === '15' || d === '20') setDuration(parseInt(d, 10) as Duration);
      const sub = window.localStorage.getItem(SUBTITLES_KEY);
      if (sub === 'true') setSubtitlesEnabled(true);
    } catch { /* ignore */ }
  }, []);

  const handleStart = () => {
    haptics.tap();
    try {
      window.localStorage.setItem(MODE_KEY, mode);
      window.localStorage.setItem(DURATION_KEY, String(duration));
    } catch { /* ignore */ }
    setStarted(true);
  };

  const handleToggleSubtitles = () => {
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    haptics.tap();
    try { window.localStorage.setItem(SUBTITLES_KEY, String(next)); } catch { /* ignore */ }
  };

  if (started) {
    const routine = buildDeepMeditationRoutine(mode, duration);
    return (
      <WellnessSessionRunner
        routine={routine}
        onComplete={onComplete}
        onCancel={onCancel}
        subtitlesEnabled={subtitlesEnabled}
      />
    );
  }

  const modeContent = DEEP_MEDITATION_MODES[mode];
  const ambient = MODE_AMBIENTS[mode];
  const quote = SCIENCE_QUOTES[quoteIdx];

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: NT.primary, background: N.void }}
    >
      {/* ─── Ambient background that shifts with mode ─── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: ambient.radial }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 80% 80%, ${ambient.accent} 0%, transparent 50%)`,
        }}
      />

      {/* ─── Header · MASTHEAD editorial ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        {/* Top folio · back + brand mono · clock-style indicator */}
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onCancel(); }}
            aria-label="Volver"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: NT.muted }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              wellness · meditación
            </span>
          </button>
          <div className="flex items-center gap-3">
            {/* Subtitle toggle */}
            <button
              onClick={handleToggleSubtitles}
              aria-label={subtitlesEnabled ? 'Desactivar subtítulos' : 'Activar subtítulos'}
              className="flex items-center gap-1.5 transition-opacity active:opacity-60"
              style={{ color: subtitlesEnabled ? N.amber : NT.muted }}
            >
              <Type size={12} strokeWidth={2} />
              <span
                className="font-mono uppercase tracking-[0.28em] font-[600]"
                style={{ fontSize: 8 }}
              >
                sub
              </span>
            </button>
            <span
              className="font-mono tabular-nums tracking-[0.18em] font-[500]"
              style={{ color: NT.muted, fontSize: 10 }}
            >
              <span style={{ color: NT.primary, fontWeight: 600 }}>
                {String(duration).padStart(2, '0')}
              </span>
              <span style={{ color: hexToRgba(N.amber, 0.5), margin: '0 6px' }}>—</span>
              min
            </span>
          </div>
        </div>
        {/* Hairline divider */}
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
      </div>

      {/* ─── Body unificado ──────────────────────────────────── */}
      <div className="scroll-area flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 pb-4">
        {/* Top corners · numeral + cue label */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{
              color: NT.primary,
              fontSize: 13,
              letterSpacing: '0.02em',
            }}
          >
            00
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · {modeContent.shortLabel.toLowerCase()} ·
          </span>
        </div>

        {/* ─── Wave preview ─────────────────────────────── */}
        <div className="flex justify-center mt-4 mb-2" style={{ height: 100 }}>
          <WavePreview mode={mode} N={N} />
        </div>

        {/* Hero title · lowercase grande con punto ámbar */}
        <h1
          className="font-headline font-[700] lowercase tracking-[-0.04em] mt-1"
          style={{
            color: NT.primary,
            fontSize: 'clamp(2rem, 7.5vw, 2.8rem)',
            lineHeight: 0.95,
            textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
            textWrap: 'balance' as never,
            maxWidth: '14ch',
          }}
        >
          meditación profunda
          <span style={{ color: N.amber }}>.</span>
        </h1>

        <p
          className="mt-3 font-ui text-[12.5px] leading-[1.55] max-w-[36ch]"
          style={{ color: NT.soft }}
        >
          {modeContent.description}
        </p>

        {/* Science quote */}
        <div
          className="mt-3 flex items-start gap-2"
          style={{
            padding: '8px 12px',
            background: hexToRgba(N.amber, 0.06),
            borderLeft: `2px solid ${hexToRgba(N.amber, 0.35)}`,
          }}
        >
          <div>
            <p
              className="font-ui text-[11px] leading-[1.5] italic"
              style={{ color: NT.soft }}
            >
              {quote.text}
            </p>
            <p
              className="font-mono text-[8.5px] tracking-[0.2em] uppercase mt-1"
              style={{ color: NT.muted }}
            >
              {quote.source}
            </p>
          </div>
        </div>

        {/* ─── Mode picker · jeton-style rows ───────────────── */}
        <SectionHeader N={N} NT={NT}>técnica</SectionHeader>
        <div className="flex flex-col">
          {(Object.keys(DEEP_MEDITATION_MODES) as DeepMeditationMode[]).map((id, i) => {
            const m = DEEP_MEDITATION_MODES[id];
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => { haptics.tap(); setMode(id); }}
                className="w-full text-left py-3.5 flex items-center gap-4 transition-opacity active:opacity-70"
                style={{ borderBottom: `1px solid ${hexToRgba(N.amber, 0.1)}` }}
              >
                {/* Mode mini-blob icon */}
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: active ? hexToRgba(N.amber, 0.12) : hexToRgba(N.amber, 0.04),
                    border: `1.5px solid ${active ? hexToRgba(N.amber, 0.5) : hexToRgba(N.amber, 0.12)}`,
                    boxShadow: active ? `0 0 16px ${hexToRgba(N.amber, 0.2)}` : 'none',
                  }}
                >
                  <ModeBlobIcon mode={id} color={active ? N.amber : hexToRgba(N.amber, 0.4)} />
                </div>
                {/* Numeral tabular */}
                <span
                  className="font-mono tabular-nums shrink-0"
                  style={{
                    color: active ? N.amber : hexToRgba(N.amber, 0.35),
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    fontWeight: active ? 700 : 500,
                    minWidth: '2ch',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* Label + description */}
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-headline font-[600] lowercase tracking-[-0.01em]"
                    style={{
                      color: active ? NT.primary : NT.soft,
                      fontSize: 15,
                    }}
                  >
                    {m.shortLabel.toLowerCase()}
                  </span>
                  <span
                    className="block mt-0.5 font-ui leading-[1.5]"
                    style={{
                      color: NT.muted,
                      fontSize: 11.5,
                    }}
                  >
                    {m.description}
                  </span>
                </span>
                {/* Active marker */}
                {active && (
                  <Check size={14} strokeWidth={2.4} style={{ color: N.amber, marginTop: 4 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Duration picker · grid 3 ──────────────────────── */}
        <SectionHeader N={N} NT={NT}>duración</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <button
                key={d}
                onClick={() => { haptics.tap(); setDuration(d); }}
                className="py-3.5 transition-transform active:scale-[0.97]"
                style={{
                  background: active ? hexToRgba(N.amber, 0.14) : 'transparent',
                  border: `1px solid ${active ? hexToRgba(N.amber, 0.55) : hexToRgba(N.amber, 0.14)}`,
                }}
              >
                <div
                  className="font-headline font-[700] tabular-nums"
                  style={{
                    color: active ? NT.primary : NT.soft,
                    fontSize: 28,
                    lineHeight: 0.95,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {d}
                </div>
                <div
                  className="font-mono text-[9px] tracking-[0.32em] uppercase mt-1.5 font-[600]"
                  style={{ color: active ? hexToRgba(N.amber, 0.85) : NT.muted }}
                >
                  min
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── Estructura preview ─────────────────────── */}
        <SectionHeader N={N} NT={NT}>estructura</SectionHeader>
        <div>
          <HitoRow label="apertura" hint="60s · postura + intención" index={0} N={N} NT={NT} />
          {modeContent.milestones.map((m, i) => (
            <HitoRow
              key={m.id}
              label={m.label}
              hint={m.description}
              index={i + 1}
              N={N}
              NT={NT}
            />
          ))}
          <HitoRow
            label="cierre"
            hint="90s · expansión + retorno"
            index={modeContent.milestones.length + 1}
            N={N}
            NT={NT}
            last
          />
        </div>

        <div className="h-4" />
      </div>

      {/* ─── Footer · CTA iniciar V5 ─────────────────── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            onClick={handleStart}
            className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center justify-center gap-2.5"
            style={{
              padding: '14px 28px',
              background: N.amber,
              color: N.void,
              fontSize: 10.5,
              boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
            }}
          >
            <Play size={13} strokeWidth={2.4} fill="currentColor" />
            iniciar · {duration} min
          </button>
        </div>
        {/* Subtitle status hint */}
        <div className="flex justify-center mt-2">
          <span
            className="font-mono text-[8px] tracking-[0.28em] uppercase"
            style={{ color: NT.muted, opacity: 0.6 }}
          >
            subtítulos: {subtitlesEnabled ? 'activados' : 'desactivados'}
          </span>
        </div>
      </div>
    </div>
  );
}


// ─── Mode icons for picker ──────────────────────────────────────

function ModeBlobIcon({ mode, color }: { mode: DeepMeditationMode; color: string }) {
  const s = 20; // icon size
  switch (mode) {
    case 'mindfulness':
      // Wind / breath — three flowing curved lines
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 8c4-3 8 3 12 0s5-2 6-1"
            stroke={color} strokeWidth={1.5} strokeLinecap="round"
          />
          <path
            d="M3 12c3-2 6 2 10 0s5-1 8 0"
            stroke={color} strokeWidth={1.5} strokeLinecap="round"
            opacity={0.7}
          />
          <path
            d="M3 16c5-3 7 3 11 0s4-1 7 0"
            stroke={color} strokeWidth={1.5} strokeLinecap="round"
            opacity={0.4}
          />
        </svg>
      );
    case 'body_scan':
      // Person outline with horizontal scan line
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          {/* Head */}
          <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth={1.4} />
          {/* Body */}
          <path
            d="M12 7.5v3M9 11l3-0.5 3 0.5M9 11l-1 6M15 11l1 6M10.5 13l-0.5 8M13.5 13l0.5 8"
            stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Scan line */}
          <line
            x1="5" y1="13" x2="19" y2="13"
            stroke={color} strokeWidth={0.8} strokeDasharray="2 2"
            opacity={0.5}
          />
        </svg>
      );
    case 'metta':
      // Heart with soft glow rays
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20s-7-5.5-7-10c0-2.5 2-4.5 4.5-4.5 1.5 0 2.5 0.8 3 1.8 0.5-1 1.5-1.8 3-1.8C18 5.5 20 7.5 20 10c0 4.5-8 10-8 10z"
            stroke={color} strokeWidth={1.4} fill={color} fillOpacity={0.12}
            strokeLinejoin="round"
          />
          {/* Radiating warmth lines */}
          <line x1="12" y1="2" x2="12" y2="3.5" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.35} />
          <line x1="5.5" y1="4" x2="6.5" y2="5" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.25} />
          <line x1="18.5" y1="4" x2="17.5" y2="5" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.25} />
        </svg>
      );
  }
}

// ─── Wave Preview for picker ─────────────────────────────────────

const WAVE_COLORS: Record<DeepMeditationMode, { bg: string; w1: string; w2: string; w3: string }> = {
  mindfulness: { bg: '#0c0a14', w1: '#1e1640', w2: '#2a1f5c', w3: '#362878' },
  body_scan:   { bg: '#0a0e14', w1: '#0f1e3a', w2: '#162d52', w3: '#1c3a6a' },
  metta:       { bg: '#140c08', w1: '#2a1810', w2: '#3d2418', w3: '#503020' },
};

function WavePreview({ mode, N }: { mode: DeepMeditationMode; N: PaletteProps['N'] }) {
  const c = WAVE_COLORS[mode];
  return (
    <div
      className="relative overflow-hidden transition-all duration-700"
      style={{
        width: 280,
        height: 100,
        borderRadius: 16,
        background: c.bg,
      }}
    >
      {/* Wave 3 — back */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 280 60" preserveAspectRatio="none"
        style={{ height: '55%', animation: 'med-wave-drift 8s ease-in-out infinite alternate' }}
      >
        <path d="M0 35 C50 20,90 45,140 30 C190 15,230 40,280 28 L280 60 L0 60 Z" fill={c.w1} />
      </svg>
      {/* Wave 2 — mid */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 280 60" preserveAspectRatio="none"
        style={{ height: '48%', animation: 'med-wave-drift 6s ease-in-out infinite alternate-reverse' }}
      >
        <path d="M0 30 C60 15,100 40,150 25 C200 10,240 35,280 22 L280 60 L0 60 Z" fill={c.w2} />
      </svg>
      {/* Wave 1 — front */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 280 60" preserveAspectRatio="none"
        style={{ height: '40%', animation: 'med-wave-drift 10s ease-in-out infinite alternate' }}
      >
        <path d="M0 25 C70 10,110 38,160 20 C210 5,250 30,280 18 L280 60 L0 60 Z" fill={c.w3} />
      </svg>
      {/* Subtle center glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 70%, ${hexToRgba(N.amber, 0.06)} 0%, transparent 60%)`,
        }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

function SectionHeader({
  children,
  N,
  NT,
}: { children: React.ReactNode } & PaletteProps) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-3">
      <span
        className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
        style={{ color: NT.muted, fontSize: 9 }}
      >
        ─ · {children} · ─
      </span>
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.amber, 0.12) }}
      />
    </div>
  );
}

function HitoRow({
  label,
  hint,
  index,
  N,
  NT,
  last,
}: {
  label: string;
  hint: string;
  index: number;
  last?: boolean;
} & PaletteProps) {
  return (
    <div
      className="py-2.5 flex items-baseline gap-4"
      style={{ borderBottom: last ? 'none' : `1px solid ${hexToRgba(N.amber, 0.08)}` }}
    >
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: hexToRgba(N.amber, 0.45),
          fontSize: 10,
          letterSpacing: '0.1em',
          minWidth: '2ch',
        }}
      >
        {String(index).padStart(2, '0')}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{ color: NT.soft, fontSize: 13.5 }}
        >
          {label.toLowerCase()}
        </span>
        <span
          className="block mt-0.5 font-ui leading-[1.45]"
          style={{ color: NT.muted, fontSize: 11 }}
        >
          {hint}
        </span>
      </span>
    </div>
  );
}
