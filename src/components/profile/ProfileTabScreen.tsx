'use client';

// ═══════════════════════════════════════════════════════════
// ProfileTabScreen · tab "Perfil" del dock.
//
// Diseño · poppr/jeton/craftsmen showcase con paleta de día:
//   - Bg: D.paper.
//   - Header masthead: dot accent + "perfil" mono caption.
//   - Hairline 1px progress (XP del nivel).
//   - Hero: nombre lowercase XL con punto accent.
//   - Showcase card grande: split bento info izq + rank CTA der.
//   - Stats hairline (disciplina · enfoque · energía).
//   - Counter grid 3: racha · fases · minutos.
//   - Quick links bento: historial. / ajustes. con flecha.
//   - SIN kanji · SIN azul · SIN GradientBackground.
// ═══════════════════════════════════════════════════════════

import { ArrowUpRight, ChartBar, Settings as SettingsIcon, Package } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { haptics } from '@/lib/common/haptics';
import { levelProgress, type OperatorProfile } from '@/lib/genesis/progression';
import { getRankByLevel } from '@/lib/genesis/constants';

interface ProfileTabScreenProps {
  profile: OperatorProfile;
  streak: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

const STAT_LABELS: Array<{ key: keyof OperatorProfile['stats']; label: string }> = [
  { key: 'disciplina', label: 'disciplina' },
  { key: 'enfoque',    label: 'enfoque'    },
  { key: 'energia',    label: 'energía'    },
];

export default function ProfileTabScreen({
  profile,
  streak,
  onOpenHistory,
  onOpenSettings,
}: ProfileTabScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const rank = getRankByLevel(profile.level);
  const prog = levelProgress(profile.xp);
  const maxStat = Math.max(1, ...STAT_LABELS.map(s => profile.stats[s.key]));

  const firstName = (profile.name.split(' ')[0] || 'operador').toLowerCase();

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* Soft warm radial */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.08)} 0%, transparent 55%)`,
        }}
      />

      {/* ─── Header · masthead editorial ─── */}
      <div
        className="relative z-10 px-5 md:px-8 shrink-0 max-w-3xl w-full mx-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <span className="flex items-center gap-2" style={{ color: DT.muted }}>
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: D.accent,
                borderRadius: 99,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              perfil · operador
            </span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            v8.0—α3
          </span>
        </div>

        {/* Hairline level progress */}
        <div className="relative h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(0, Math.min(100, prog.ratio * 100))}%`,
              background: D.accent,
              transition: 'width 0.6s cubic-bezier(0.22, 0.8, 0.28, 1)',
            }}
          />
        </div>
      </div>

      {/* ─── Body scrollable ─────────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Top corners · class · level */}
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className="font-mono tabular-nums font-[600]"
              style={{ color: DT.primary, fontSize: 13, letterSpacing: '0.02em' }}
            >
              clase {rank.class}
              <span style={{ color: D.accent }}>.</span>
            </span>
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              · lv {String(profile.level).padStart(2, '0')} ·
            </span>
          </div>

          {/* Hero · firstname */}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em] mt-3"
            style={{
              color: DT.primary,
              fontSize: 'clamp(2.6rem, 11vw, 4.5rem)',
              lineHeight: 0.92,
              maxWidth: '14ch',
            }}
          >
            {firstName}
            <span style={{ color: D.accent }}>.</span>
          </h1>

          <p
            className="mt-3 font-mono uppercase tracking-[0.28em] font-[600]"
            style={{ color: DT.soft, fontSize: 10.5 }}
          >
            {rank.titleEs.toLowerCase()} · {profile.operatorClass.toLowerCase()}
          </p>

          {/* ── Showcase card · operator ────────────────── */}
          <div
            className="mt-6 flex items-stretch overflow-hidden"
            style={{
              borderRadius: 22,
              background: hexToRgba(D.tint, 0.7),
              border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {/* LEFT · stats info */}
            <div className="flex-1 min-w-0 px-5 py-5">
              <div
                className="font-mono uppercase tracking-[0.42em] font-[700]"
                style={{ color: DT.muted, fontSize: 9 }}
              >
                experiencia
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  className="font-headline font-[700] tabular-nums tracking-[-0.03em]"
                  style={{ color: DT.primary, fontSize: 28, lineHeight: 0.95 }}
                >
                  {prog.current.toLocaleString()}
                </span>
                <span
                  className="font-mono"
                  style={{ color: DT.muted, fontSize: 11 }}
                >
                  / {prog.required.toLocaleString()} xp
                </span>
              </div>

              {/* XP bar hairline */}
              <div
                className="mt-3 h-[3px] overflow-hidden"
                style={{ background: hexToRgba(D.accent, 0.14) }}
              >
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${Math.max(0, Math.min(100, prog.ratio * 100))}%`,
                    background: D.accent,
                  }}
                />
              </div>

              <div
                className="mt-2 font-mono tabular-nums tracking-[0.06em]"
                style={{ color: DT.soft, fontSize: 10.5 }}
              >
                {Math.round(prog.ratio * 100)}% · siguiente nivel
              </div>
            </div>

            {/* RIGHT · rank CTA solid */}
            <div
              className="shrink-0 flex flex-col items-center justify-center px-5 py-5 gap-1"
              style={{
                minWidth: 96,
                background: D.accent,
                color: D.paper,
              }}
            >
              <span
                className="font-mono uppercase tracking-[0.32em] font-[700]"
                style={{ color: hexToRgba(D.paper, 0.7), fontSize: 8.5 }}
              >
                rango
              </span>
              <span
                className="font-headline font-[700] tabular-nums"
                style={{
                  color: D.paper,
                  fontSize: 38,
                  lineHeight: 0.9,
                  letterSpacing: '-0.02em',
                }}
              >
                {rank.class}
              </span>
              <span
                className="font-mono uppercase tracking-[0.28em] font-[600] text-center"
                style={{ color: hexToRgba(D.paper, 0.85), fontSize: 8 }}
              >
                {rank.titleEs.slice(0, 8).toLowerCase()}
              </span>
            </div>
          </div>

          {/* ── Stats hairline ──────────────────────────── */}
          <SectionHeader N={D} NT={DT}>· estadísticas ·</SectionHeader>
          <div className="flex flex-col">
            {STAT_LABELS.map((s) => {
              const val = profile.stats[s.key];
              const ratio = val / maxStat;
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-4 py-3"
                  style={{ borderBottom: `1px solid ${hexToRgba(D.accent, 0.1)}` }}
                >
                  <span
                    className="font-headline font-[600] lowercase tracking-[-0.01em] shrink-0"
                    style={{ color: DT.primary, fontSize: 14, minWidth: '7ch' }}
                  >
                    {s.label}
                  </span>
                  <div
                    className="flex-1 h-[2px]"
                    style={{ background: hexToRgba(D.accent, 0.14) }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, ratio * 100)}%`,
                        background: D.accent,
                      }}
                    />
                  </div>
                  <span
                    className="font-mono tabular-nums font-[700] shrink-0"
                    style={{ color: D.accent, fontSize: 13, minWidth: '3ch', textAlign: 'right' }}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Counters grid ──────────────────────────── */}
          <SectionHeader N={D} NT={DT}>· contadores ·</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            <Counter label="racha" value={streak} suffix="d" highlight />
            <Counter label="fases" value={profile.phasesCompleted} />
            <Counter label="minutos" value={profile.totalMinutes} />
          </div>

          {/* ── Quick links · bento split ───────────────── */}
          <SectionHeader N={D} NT={DT}>· navegación ·</SectionHeader>
          <div className="flex flex-col gap-2.5">
            <LinkRow
              icon={<ChartBar size={18} strokeWidth={1.85} />}
              title="historial"
              hint="sesiones · hábitos · rachas"
              onClick={() => { haptics.tap(); onOpenHistory(); }}
            />
            <LinkRow
              icon={<SettingsIcon size={18} strokeWidth={1.85} />}
              title="ajustes"
              hint="voz · volumen · paleta · datos"
              onClick={() => { haptics.tap(); onOpenSettings(); }}
            />
          </div>

          {/* Version footer mono */}
          <div
            className="mt-8 text-center font-mono uppercase tracking-[0.32em] font-[600]"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            · morning awakening · v8 sunrise ·
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useAppTheme>['day'];
  NT: ReturnType<typeof useAppTheme>['dayText'];
}

function SectionHeader({ children, N, NT }: { children: React.ReactNode } & PaletteProps) {
  return (
    <div className="flex items-center gap-3 pt-7 pb-3">
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.accent, 0.18) }}
      />
      <span
        className="font-mono uppercase tracking-[0.42em] font-[700] shrink-0"
        style={{ color: hexToRgba(N.accent, 0.85), fontSize: 9 }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="flex-1 h-[1px]"
        style={{ background: hexToRgba(N.accent, 0.18) }}
      />
    </div>
  );
}

function Counter({
  label,
  value,
  suffix,
  highlight,
}: { label: string; value: number; suffix?: string; highlight?: boolean }) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <div
      className="px-3 py-4 text-center"
      style={{
        borderRadius: 18,
        border: `1px solid ${highlight ? hexToRgba(D.accent, 0.5) : hexToRgba(D.accent, 0.14)}`,
        background: highlight ? hexToRgba(D.accent, 0.1) : hexToRgba(D.tint, 0.5),
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.32em] font-[700]"
        style={{ color: highlight ? D.accent : DT.muted, fontSize: 8.5 }}
      >
        {label}
      </div>
      <div
        className="font-headline font-[700] mt-2 tabular-nums tracking-[-0.03em]"
        style={{
          color: highlight ? D.accent : DT.primary,
          fontSize: 28,
          lineHeight: 0.95,
        }}
      >
        {value.toLocaleString()}
        {suffix && (
          <span
            className="font-mono ml-0.5 font-[400]"
            style={{ color: DT.muted, fontSize: 12 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function LinkRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-stretch overflow-hidden text-left transition-transform active:scale-[0.99]"
      style={{
        borderRadius: 22,
        background: hexToRgba(D.tint, 0.7),
        border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* LEFT info */}
      <div className="flex-1 min-w-0 flex items-center gap-3.5 px-4 py-4">
        <span
          className="shrink-0 w-10 h-10 flex items-center justify-center"
          style={{
            background: hexToRgba(D.accent, 0.14),
            border: `1px solid ${hexToRgba(D.accent, 0.38)}`,
            color: D.accent,
            borderRadius: 12,
          }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-headline font-[700] lowercase tracking-[-0.025em]"
            style={{ color: DT.primary, fontSize: 20, lineHeight: 1 }}
          >
            {title}
            <span style={{ color: D.accent }}>.</span>
          </div>
          <div
            className="mt-1 font-mono uppercase tracking-[0.28em] font-[600] truncate"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            {hint}
          </div>
        </div>
      </div>
      {/* RIGHT arrow CTA */}
      <div
        className="shrink-0 flex items-center justify-center px-5"
        style={{ background: D.accent }}
      >
        <ArrowUpRight size={18} strokeWidth={2.4} style={{ color: D.paper }} />
      </div>
    </button>
  );
}
