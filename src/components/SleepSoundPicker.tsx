'use client';

// ═══════════════════════════════════════════════════════
// SleepSoundPicker · grid of ambient sound cards. Tapping
// a card tells the parent to play that track (crossfade
// handled by the SleepEngine).
//
// Each card:
//   - Lucide icon in its own tinted gradient.
//   - Label + short blurb.
//   - "PLACEHOLDER" badge when the underlying MP3 is the
//     stub file (< 3 s long).
//   - Ring-glow pulse when this card is the active track.
// ═══════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CloudRain, Disc, Flame, Radio, Trees, Waves } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { SLEEP_SOUNDS, type SleepSound, type SleepTrackId } from '@/lib/nightMode';
import { SUNRISE, hexToRgba } from '@/lib/theme';

const ICONS = {
  CloudRain, Disc, Flame, Radio, Trees, Waves,
} as const;

interface SleepSoundPickerProps {
  activeId: SleepTrackId | null;
  onPick: (id: SleepTrackId) => void;
}

export default function SleepSoundPicker({ activeId, onPick }: SleepSoundPickerProps) {
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Stagger entry.
  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean) as HTMLButtonElement[];
    if (!cards.length) return;
    gsap.from(cards, {
      opacity: 0,
      y: 12,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power2.out',
    });
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {SLEEP_SOUNDS.map((s, i) => (
        <SoundCard
          key={s.id}
          sound={s}
          active={s.id === activeId}
          onTap={() => { haptics.tick(); onPick(s.id); }}
          ref={(el) => { cardsRef.current[i] = el; }}
        />
      ))}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────

import { forwardRef } from 'react';

interface SoundCardProps {
  sound: SleepSound;
  active: boolean;
  onTap: () => void;
}

const SoundCard = forwardRef<HTMLButtonElement, SoundCardProps>(function SoundCard(
  { sound, active, onTap },
  ref,
) {
  const Icon = ICONS[sound.icon];
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  // Probe the file size via HEAD to decide if it's the silent stub.
  // Any placeholder we ship is < 2 KB; real loops are > 100 KB.
  useEffect(() => {
    let cancelled = false;
    fetch(sound.src, { method: 'HEAD' })
      .then((r) => {
        const lenStr = r.headers.get('content-length');
        const len = lenStr ? parseInt(lenStr, 10) : NaN;
        if (!cancelled && Number.isFinite(len) && len < 2048) setIsPlaceholder(true);
      })
      .catch(() => { /* offline etc. — don't mark */ });
    return () => { cancelled = true; };
  }, [sound.src]);

  return (
    <button
      ref={ref}
      onClick={onTap}
      className="relative aspect-[1.35] rounded-2xl p-3 text-left transition-transform active:scale-[0.97] overflow-hidden"
      style={{
        border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.55) : 'rgba(255,250,240,0.08)'}`,
        background: active
          ? `linear-gradient(160deg, ${hexToRgba(SUNRISE.rise2, 0.18)} 0%, ${hexToRgba(SUNRISE.predawn2, 0.6)} 100%)`
          : 'rgba(255,250,240,0.035)',
        boxShadow: active ? `0 0 20px -6px ${hexToRgba(SUNRISE.rise2, 0.5)}` : 'none',
      }}
      aria-pressed={active}
    >
      {/* Active pulse */}
      {active && (
        <span
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 32px ${hexToRgba(SUNRISE.rise2, 0.18)}`,
            animation: 'sunrise-ember-pulse 2.4s ease-in-out infinite',
          }}
        />
      )}

      {/* Icon chip */}
      <span
        className="flex items-center justify-center w-9 h-9 rounded-xl mb-2"
        style={{
          background: active
            ? hexToRgba(SUNRISE.rise2, 0.22)
            : 'rgba(255,250,240,0.05)',
          border: `1px solid ${active ? hexToRgba(SUNRISE.rise2, 0.45) : 'rgba(255,250,240,0.1)'}`,
          color: active ? SUNRISE.rise2 : 'var(--sunrise-text-soft)',
        }}
      >
        <Icon size={18} strokeWidth={1.7} />
      </span>

      <div
        className="font-ui text-[13px] font-[500] leading-tight"
        style={{ color: 'var(--sunrise-text)' }}
      >
        {sound.label}
      </div>
      <div
        className="font-ui text-[10px] leading-snug mt-0.5"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {sound.blurb}
      </div>

      {isPlaceholder && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full font-mono text-[8px] tracking-[0.2em]"
          style={{
            background: 'rgba(255, 180, 80, 0.15)',
            color: 'rgba(255, 220, 170, 0.9)',
            border: '1px solid rgba(255, 180, 80, 0.35)',
          }}
          title="Reemplaza este archivo en public/audio/sleep/"
        >
          DEMO
        </span>
      )}
    </button>
  );
});
