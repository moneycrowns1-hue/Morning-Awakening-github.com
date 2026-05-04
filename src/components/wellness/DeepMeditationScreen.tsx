'use client';

// ═══════════════════════════════════════════════════════════
// DeepMeditationScreen · v3 — Headspace-inspired meditation
// picker with immersive wave background, glassmorphic cards,
// and seamless visual continuity with the full-screen player.
//
// Redesigned to match the Headspace iOS aesthetic: the picker
// itself has waves in the background so the transition into
// the meditation player feels natural.
//
// Paleta · useNightPalette() for global sync.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Play, Type, ChevronDown } from 'lucide-react';
import {
  IconFocusCentered,
  IconBodyScan,
  IconHeartHandshake,
} from '@tabler/icons-react';
import gsap from 'gsap';
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

// Wave-style color palettes per mode.
// Cada ola es notablemente más clara que el fondo para crear
// contraste real y profundidad visual.
const WAVE_COLORS: Record<DeepMeditationMode, {
  bg: string; w1: string; w2: string; w3: string; w4: string;
  accent: string; accentSoft: string;
}> = {
  mindfulness: {
    bg:    '#09071a',
    w4:    '#18104a',  // indigo profundo
    w3:    '#2b1c72',  // violeta medio
    w2:    '#402a98',  // violeta rico
    w1:    '#5238bc',  // indigo vivo (frente)
    accent: '#a094f5',
    accentSoft: 'rgba(160, 148, 245, 0.20)',
  },
  body_scan: {
    bg:    '#060918',
    w4:    '#0e1e4a',  // azul marino profundo
    w3:    '#163268',  // azul medio
    w2:    '#1e4882',  // cerúleo rico
    w1:    '#26609e',  // cerúleo vivo (frente)
    accent: '#72b8f8',
    accentSoft: 'rgba(114, 184, 248, 0.20)',
  },
  metta: {
    bg:    '#120800',
    w4:    '#2e1508',  // ámbar oscuro
    w3:    '#4c2210',  // ámbar medio
    w2:    '#6e3218',  // ámbar rico
    w1:    '#904224',  // ámbar vivo (frente)
    accent: '#eba06e',
    accentSoft: 'rgba(235, 160, 110, 0.20)',
  },
};

// Mode icon components (Tabler · semántico por modo)
type ModeIcon = typeof IconFocusCentered;
const MODE_ICONS: Record<DeepMeditationMode, ModeIcon> = {
  mindfulness: IconFocusCentered,
  body_scan:   IconBodyScan,
  metta:       IconHeartHandshake,
};

// Mode metadata for display
const MODE_DISPLAY: Record<DeepMeditationMode, { tagline: string }> = {
  mindfulness: { tagline: 'foco · respiración · conciencia' },
  body_scan:   { tagline: 'cuerpo · tensión · liberación' },
  metta:       { tagline: 'bondad · conexión · calidez' },
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
  const [showStructure, setShowStructure] = useState(false);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * SCIENCE_QUOTES.length));
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Animate background waves
  useEffect(() => {
    const waves = waveRefs.current.filter(Boolean) as HTMLDivElement[];
    waves.forEach((w) => gsap.killTweensOf(w));

    waves.forEach((w, i) => {
      const dur = 12 + i * 3.5;
      const yRange = 20 + i * 8;
      gsap.to(w, {
        y: -yRange,
        duration: dur,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 1.5,
      });
      gsap.to(w, {
        x: (i % 2 === 0 ? 5 : -5),
        duration: dur * 1.3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.7,
      });
    });

    return () => {
      waves.forEach((w) => gsap.killTweensOf(w));
    };
  }, [mode]);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
    );
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
  const colors = WAVE_COLORS[mode];
  const modeDisplay = MODE_DISPLAY[mode];
  const quote = SCIENCE_QUOTES[quoteIdx];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: colors.bg }}
    >
      {/* ─── Background waves ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Capa superior atmosférica · tinte sutil del accent hacia abajo */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: '-10%',
            right: '-10%',
            height: '55%',
            background: `radial-gradient(ellipse at 50% -5%, ${hexToRgba(colors.accent, 0.07)} 0%, transparent 60%)`,
            filter: 'blur(50px)',
          }}
        />

        {/* Cuatro capas de ondas · colores vivos + opacidades altas */}
        {[colors.w4, colors.w3, colors.w2, colors.w1].map((fill, i) => (
          <div
            key={i}
            ref={(el) => { waveRefs.current[i] = el; }}
            className="absolute"
            style={{
              bottom: `${-10 - i * 4}%`,
              left: `${-2 - i}%`,
              right: `${-2 - i}%`,
              opacity: 0.7 + i * 0.08,
            }}
          >
            <svg
              viewBox="0 0 1440 600"
              preserveAspectRatio="none"
              className="w-full h-auto block"
              style={{
                minHeight: `${50 + i * 7}vh`,
              }}
            >
              <path
                d={WAVE_PATHS[i]}
                fill={fill}
              />
            </svg>
          </div>
        ))}

        {/* Glow ambiental inferior · ilumina el cuerpo de las ondas */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: 0,
            left: '-5%',
            right: '-5%',
            height: '50%',
            background: `radial-gradient(ellipse at 50% 85%, ${hexToRgba(colors.accent, 0.22)} 0%, transparent 68%)`,
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ─── Scrollable content over waves ─── */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">

        {/* ─── Top bar ─── */}
        <div
          className="shrink-0 px-5 flex items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <button
            onClick={() => { haptics.tap(); onCancel(); }}
            aria-label="Volver"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <ChevronLeft size={16} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>

          <div className="flex items-center gap-3">
            {/* Subtitle toggle */}
            <button
              onClick={handleToggleSubtitles}
              aria-label={subtitlesEnabled ? 'Desactivar subtítulos' : 'Activar subtítulos'}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                background: subtitlesEnabled
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Type
                size={12}
                strokeWidth={2}
                style={{ color: subtitlesEnabled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}
              />
            </button>
          </div>
        </div>

        {/* ─── Main scrollable area ─── */}
        <div className="scroll-area flex-1 flex flex-col items-center px-5 pb-28 min-h-0">

          {/* Hero · title + description */}
          <div className="flex flex-col items-center mt-6 mb-5">
            <span
              className="font-mono uppercase tracking-[0.4em] font-[500] mb-4"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8.5 }}
            >
              meditación profunda
            </span>
            <h1
              className="font-headline font-[700] lowercase tracking-[-0.04em] text-center"
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 'clamp(1.8rem, 7vw, 2.4rem)',
                lineHeight: 1,
                textWrap: 'balance' as never,
                maxWidth: '16ch',
              }}
            >
              {modeContent.shortLabel.toLowerCase()}
              <span style={{ color: colors.accent }}>.</span>
            </h1>
            <p
              className="font-ui text-[12px] text-center mt-2.5 max-w-[32ch] leading-[1.55]"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              {modeContent.description}
            </p>
          </div>

          {/* ─── Mode selector · horizontal pill cards ─── */}
          <div className="w-full max-w-sm flex gap-2 mb-6">
            {(Object.keys(DEEP_MEDITATION_MODES) as DeepMeditationMode[]).map((id) => {
              const active = mode === id;
              const display = MODE_DISPLAY[id];
              const mc = DEEP_MEDITATION_MODES[id];
              const mColors = WAVE_COLORS[id];
              const ModeIcon = MODE_ICONS[id];
              return (
                <button
                  key={id}
                  onClick={() => { haptics.tap(); setMode(id); }}
                  className="flex-1 py-3 px-2 flex flex-col items-center gap-1.5 transition-all duration-500 active:scale-[0.97]"
                  style={{
                    borderRadius: 16,
                    background: active
                      ? `linear-gradient(145deg, ${hexToRgba(mColors.accent, 0.18)}, ${hexToRgba(mColors.accent, 0.06)})`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active
                      ? hexToRgba(mColors.accent, 0.35)
                      : 'rgba(255,255,255,0.06)'}`,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: active
                      ? `0 4px 20px ${hexToRgba(mColors.accent, 0.15)}, inset 0 1px 0 ${hexToRgba(mColors.accent, 0.1)}`
                      : 'none',
                  }}
                >
                  <ModeIcon
                    size={20}
                    stroke={1.5}
                    style={{
                      color: active ? mColors.accent : 'rgba(255,255,255,0.22)',
                      transition: 'color 0.3s',
                    }}
                  />
                  <span
                    className="font-headline font-[600] lowercase tracking-[-0.01em]"
                    style={{
                      color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                      fontSize: 12.5,
                      transition: 'color 0.3s',
                    }}
                  >
                    {mc.shortLabel.toLowerCase()}
                  </span>
                  <span
                    className="font-mono tracking-[0.15em] uppercase"
                    style={{
                      color: active ? hexToRgba(mColors.accent, 0.7) : 'rgba(255,255,255,0.15)',
                      fontSize: 7,
                      transition: 'color 0.3s',
                    }}
                  >
                    {display.tagline.split(' · ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Duration selector · circular-ish pills ─── */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="font-mono uppercase tracking-[0.3em] font-[500] mr-2"
              style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8 }}
            >
              duración
            </span>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <button
                  key={d}
                  onClick={() => { haptics.tap(); setDuration(d); }}
                  className="transition-all duration-300 active:scale-95"
                  style={{
                    width: active ? 56 : 48,
                    height: active ? 56 : 48,
                    borderRadius: '50%',
                    background: active
                      ? `linear-gradient(145deg, ${hexToRgba(colors.accent, 0.22)}, ${hexToRgba(colors.accent, 0.08)})`
                      : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${active
                      ? hexToRgba(colors.accent, 0.5)
                      : 'rgba(255,255,255,0.08)'}`,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: active
                      ? `0 4px 18px ${hexToRgba(colors.accent, 0.2)}`
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <span
                    className="font-headline font-[700] tabular-nums"
                    style={{
                      color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                      fontSize: active ? 19 : 16,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      transition: 'all 0.3s',
                    }}
                  >
                    {d}
                  </span>
                  <span
                    className="font-mono tracking-[0.2em] uppercase"
                    style={{
                      color: active ? hexToRgba(colors.accent, 0.7) : 'rgba(255,255,255,0.15)',
                      fontSize: 6.5,
                      transition: 'color 0.3s',
                    }}
                  >
                    min
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Science quote · subtle card ─── */}
          <div
            className="w-full max-w-sm mb-4 px-4 py-3"
            style={{
              borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <p
              className="font-ui text-[11px] leading-[1.5] italic text-center"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              &ldquo;{quote.text}&rdquo;
            </p>
            <p
              className="font-mono text-[7.5px] tracking-[0.2em] uppercase mt-1.5 text-center"
              style={{ color: 'rgba(255,255,255,0.18)' }}
            >
              {quote.source}
            </p>
          </div>

          {/* ─── Structure accordion ─── */}
          <div className="w-full max-w-sm mb-4">
            <button
              onClick={() => { haptics.tap(); setShowStructure(!showStructure); }}
              className="w-full flex items-center justify-between py-2.5 transition-opacity active:opacity-70"
            >
              <span
                className="font-mono uppercase tracking-[0.3em] font-[600]"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}
              >
                estructura · {modeContent.milestones.length + 2} pasos
              </span>
              <ChevronDown
                size={13}
                strokeWidth={2}
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  transform: showStructure ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>

            {showStructure && (
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '8px 14px',
                }}
              >
                <StructureStep
                  index={0}
                  label="apertura"
                  hint="postura + intención"
                  time="60s"
                  colors={colors}
                />
                {modeContent.milestones.map((m, i) => {
                  const totalPracticeSec = duration * 60 - 60 - 90;
                  const stepSec = Math.round(totalPracticeSec * m.weight);
                  return (
                    <StructureStep
                      key={m.id}
                      index={i + 1}
                      label={m.label}
                      hint={m.description}
                      time={formatDuration(stepSec)}
                      colors={colors}
                    />
                  );
                })}
                <StructureStep
                  index={modeContent.milestones.length + 1}
                  label="cierre"
                  hint="expansión + retorno"
                  time="90s"
                  colors={colors}
                  last
                />
              </div>
            )}
          </div>

          {/* Subtitle status */}
          <span
            className="font-mono text-[7px] tracking-[0.25em] uppercase"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            subtítulos: {subtitlesEnabled ? 'activados' : 'desactivados'}
          </span>
        </div>

        {/* ─── Floating CTA ─── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-6 flex justify-center"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
            background: `linear-gradient(to top, ${colors.bg} 40%, transparent 100%)`,
            paddingTop: 28,
          }}
        >
          <button
            onClick={handleStart}
            className="w-full max-w-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
            style={{
              padding: '16px 32px',
              borderRadius: 50,
              background: `linear-gradient(135deg, ${colors.accent}, ${hexToRgba(colors.accent, 0.7)})`,
              boxShadow: `0 8px 30px ${hexToRgba(colors.accent, 0.35)}, 0 2px 8px ${hexToRgba(colors.accent, 0.2)}`,
            }}
          >
            <Play size={14} strokeWidth={2.4} fill="currentColor" style={{ color: 'rgba(0,0,0,0.7)' }} />
            <span
              className="font-mono font-[700] tracking-[0.3em] uppercase"
              style={{
                color: 'rgba(0,0,0,0.7)',
                fontSize: 10.5,
              }}
            >
              iniciar · {duration} min
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Wave paths · rutas SVG con mayor cobertura vertical ────
// Cada ola cubre ~60-75% de la pantalla (antes 40-55%).
// Orden: [w4 profunda, w3, w2, w1 frente]
const WAVE_PATHS = [
  'M0 340 C200 260, 420 390, 620 320 C820 250, 1020 370, 1200 300 C1310 265, 1400 330, 1440 315 L1440 600 L0 600 Z',
  'M0 280 C180 200, 380 330, 580 260 C780 185, 960 310, 1140 240 C1270 190, 1380 265, 1440 250 L1440 600 L0 600 Z',
  'M0 210 C240 140, 460 275, 700 195 C940 115, 1100 255, 1300 175 C1380 145, 1420 205, 1440 195 L1440 600 L0 600 Z',
  'M0 155 C280 85, 520 225, 760 140 C1000 55, 1160 210, 1360 125 C1408 100, 1432 150, 1440 142 L1440 600 L0 600 Z',
];


// ─── Sub-components ──────────────────────────────────────────

function StructureStep({
  index,
  label,
  hint,
  time,
  colors,
  last,
}: {
  index: number;
  label: string;
  hint: string;
  time: string;
  colors: typeof WAVE_COLORS[DeepMeditationMode];
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Step number */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: hexToRgba(colors.accent, 0.75),
          fontSize: 10,
          letterSpacing: '0.1em',
          minWidth: '2ch',
        }}
      >
        {String(index).padStart(2, '0')}
      </span>
      {/* Label + hint */}
      <div className="flex-1 min-w-0">
        <span
          className="block font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
        >
          {label.toLowerCase()}
        </span>
        <span
          className="block font-ui leading-[1.4] mt-0.5"
          style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}
        >
          {hint}
        </span>
      </div>
      {/* Duration */}
      <span
        className="font-mono tabular-nums shrink-0"
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10,
        }}
      >
        {time}
      </span>
    </div>
  );
}


// ─── helpers ────────────────────────────────────────────────

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
