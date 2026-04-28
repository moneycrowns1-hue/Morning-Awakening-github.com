'use client';

// ═══════════════════════════════════════════════════════════
// HistoryScreen · vista histórica de la práctica.
//
// Diseño · poppr/jeton/craftsmen showcase con paleta de día:
//   - Header masthead · dot accent + caption.
//   - Hairline 1px decorativo.
//   - Hero "historial." big lowercase con punto accent.
//   - Stats grid 2×2 (cards rounded-22).
//   - Section: heatmap 16w (card rounded-22).
//   - Section: sparkline 30 sesiones.
//   - Section: logros grid 2 col.
//   - Section: últimas sesiones rows hairline.
//   - Section dividers newspaper `─ · NAME · ─`.
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import {
  Award,
  ChevronLeft,
  Clock,
  Flame,
  Lock,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { loadSessions, type SessionRecord } from '@/lib/genesis/sessionHistory';
import { hexToRgba, mixHex } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import type { DayPalette, DayPaletteText } from '@/lib/common/dayPalette';
import { ACHIEVEMENTS, loadUnlocked, type AchievementDef } from '@/lib/genesis/achievements';
import { haptics } from '@/lib/common/haptics';

const ICONS = { Award, Clock, Flame, Sparkles, Sunrise, Target, Trophy, Zap } as const;
const TONE_HEX: Record<AchievementDef['tone'], string> = {
  gold:  '#f4c267',
  coral: '#c4612d',
  amber: '#e08a3c',
  rose:  '#6b2c3d',
  cool:  '#8ec5e8',
};

interface HistoryScreenProps {
  onClose: () => void;
}

export default function HistoryScreen({ onClose }: HistoryScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const sessions = useMemo<SessionRecord[]>(() => loadSessions(), []);

  // ── Aggregate stats ──────────────────────────────────
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return { avg7: null, best: null, total: 0, longestStreak: 0 };
    }
    const last7 = sessions.slice(-7);
    const avg7 = Math.round(last7.reduce((s, r) => s + r.score, 0) / last7.length);
    const best = sessions.reduce((m, r) => Math.max(m, r.score), 0);
    const longestStreak = sessions.reduce((m, r) => Math.max(m, r.streak), 0);
    return { avg7, best, total: sessions.length, longestStreak };
  }, [sessions]);

  // ── 16-week heatmap grid ─────────────────────────────
  const byDate = useMemo(() => {
    const map = new Map<string, SessionRecord>();
    for (const r of sessions) map.set(r.date, r);
    return map;
  }, [sessions]);

  const heatmap = useMemo(() => {
    const WEEKS = 16;
    const DAYS = 7;
    const today = new Date();
    const cells: Array<{ date: string; score: number | null }> = [];
    const start = new Date(today);
    start.setDate(today.getDate() - (WEEKS * DAYS - 1));
    for (let i = 0; i < WEEKS * DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoDate(d);
      const rec = byDate.get(iso);
      cells.push({ date: iso, score: rec ? rec.score : null });
    }
    const columns: Array<Array<{ date: string; score: number | null }>> = [];
    for (let c = 0; c < WEEKS; c++) {
      columns.push(cells.slice(c * DAYS, (c + 1) * DAYS));
    }
    return columns;
  }, [byDate]);

  const recent = useMemo(() => sessions.slice(-14).reverse(), [sessions]);
  const sparkline = useMemo(() => sessions.slice(-30).map((r) => r.score), [sessions]);
  const unlockedMap = useMemo(() => loadUnlocked(), []);
  const unlockedCount = Object.keys(unlockedMap).length;

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ color: DT.primary, background: D.paper }}
    >
      {/* Soft warm radial */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.08)} 0%, transparent 55%)`,
        }}
      />

      {/* ─── Header · masthead ────────── */}
      <div
        className="relative z-10 px-5 md:px-8 shrink-0 max-w-3xl w-full mx-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Volver"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: DT.muted }}
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
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
              perfil · historial
            </span>
          </button>
          <span
            className="font-mono tabular-nums uppercase tracking-[0.32em] font-[700]"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            · {stats.total} {stats.total === 1 ? 'sesión' : 'sesiones'} ·
          </span>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }} />
      </div>

      {/* ─── Body scrollable ───────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Top corners */}
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className="font-mono tabular-nums font-[600]"
              style={{ color: DT.primary, fontSize: 13, letterSpacing: '0.02em' }}
            >
              ⌬
              <span style={{ color: D.accent }}>.</span>
            </span>
            <span
              className="font-mono uppercase tracking-[0.32em] font-[700]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              · 16 semanas ·
            </span>
          </div>

          {/* Hero · "historial." */}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em] mt-3"
            style={{
              color: DT.primary,
              fontSize: 'clamp(2.6rem, 11vw, 4.5rem)',
              lineHeight: 0.92,
            }}
          >
            historial
            <span style={{ color: D.accent }}>.</span>
          </h1>

          {sessions.length === 0 ? (
            <EmptyState D={D} DT={DT} />
          ) : (
            <>
              {/* ── Stats grid ─────────────────────────────── */}
              <SectionHeader N={D} NT={DT}>· resumen ·</SectionHeader>
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard
                  label="promedio 7d"
                  value={stats.avg7 !== null ? String(stats.avg7) : '—'}
                  suffix={stats.avg7 !== null ? '/100' : undefined}
                />
                <StatCard
                  label="mejor score"
                  value={stats.best !== null ? String(stats.best) : '—'}
                  suffix={stats.best !== null ? '/100' : undefined}
                  highlight
                />
                <StatCard
                  label="protocolos"
                  value={String(stats.total)}
                />
                <StatCard
                  label="mejor racha"
                  value={String(stats.longestStreak)}
                  suffix="días"
                />
              </div>

              {/* ── Heatmap ────────────────────────────────── */}
              <SectionHeader N={D} NT={DT}>· últimas 16 semanas ·</SectionHeader>
              <div
                className="p-4"
                style={{
                  borderRadius: 22,
                  border: `1px solid ${hexToRgba(D.accent, 0.18)}`,
                  background: hexToRgba(D.tint, 0.65),
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <div className="flex gap-[3px]">
                  {heatmap.map((week, c) => (
                    <div key={c} className="flex flex-col gap-[3px] flex-1">
                      {week.map((cell, r) => (
                        <HeatCell key={`${c}-${r}`} score={cell.score} date={cell.date} D={D} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <span className="font-mono uppercase tracking-[0.28em] font-[600]" style={{ color: DT.muted, fontSize: 9 }}>menos</span>
                  {[0.2, 0.45, 0.7, 0.95].map((s) => (
                    <span
                      key={s}
                      className="block w-3 h-3 rounded-sm"
                      style={{ background: heatColor(Math.round(s * 100), D) }}
                    />
                  ))}
                  <span className="font-mono uppercase tracking-[0.28em] font-[600]" style={{ color: DT.muted, fontSize: 9 }}>más</span>
                </div>
              </div>

              {/* ── Sparkline ──────────────────────────────── */}
              {sparkline.length >= 2 && (
                <>
                  <SectionHeader N={D} NT={DT}>· tendencia · 30 sesiones ·</SectionHeader>
                  <div
                    className="p-4"
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${hexToRgba(D.accent, 0.18)}`,
                      background: hexToRgba(D.tint, 0.65),
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }}
                  >
                    <Sparkline values={sparkline} D={D} DT={DT} />
                  </div>
                </>
              )}

              {/* ── Achievements ───────────────────────────── */}
              <SectionHeader N={D} NT={DT}>
                · logros · {unlockedCount}/{ACHIEVEMENTS.length} ·
              </SectionHeader>
              <div className="grid grid-cols-2 gap-2.5">
                {ACHIEVEMENTS.map((a) => {
                  const Icon = ICONS[a.icon];
                  const hex = TONE_HEX[a.tone];
                  const unlocked = a.id in unlockedMap;
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 p-3"
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${unlocked ? hexToRgba(hex, 0.45) : hexToRgba(D.ink, 0.08)}`,
                        background: unlocked ? hexToRgba(hex, 0.1) : hexToRgba(D.tint_deep, 0.4),
                        opacity: unlocked ? 1 : 0.6,
                      }}
                    >
                      <span
                        className="shrink-0 w-9 h-9 flex items-center justify-center"
                        style={{
                          background: unlocked ? hexToRgba(hex, 0.2) : hexToRgba(D.ink, 0.04),
                          color: unlocked ? hex : DT.muted,
                          border: `1px solid ${unlocked ? hexToRgba(hex, 0.5) : hexToRgba(D.ink, 0.08)}`,
                          borderRadius: 10,
                        }}
                      >
                        {unlocked ? <Icon size={14} strokeWidth={1.9} /> : <Lock size={11} strokeWidth={1.8} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-headline font-[600] lowercase tracking-[-0.01em] leading-tight"
                          style={{ color: unlocked ? DT.primary : DT.soft, fontSize: 12.5 }}
                        >
                          {a.title.toLowerCase()}
                        </div>
                        <div
                          className="mt-0.5 font-ui leading-snug"
                          style={{ color: DT.muted, fontSize: 10 }}
                        >
                          {a.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Last sessions ──────────────────────────── */}
              <SectionHeader N={D} NT={DT}>· últimas sesiones ·</SectionHeader>
              <div className="flex flex-col">
                {recent.map((rec) => (
                  <SessionRow key={rec.completedAt} record={rec} D={D} DT={DT} />
                ))}
              </div>

              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ internals ═══════════════════════════════════════════════

interface PaletteProps {
  N: DayPalette;
  NT: DayPaletteText;
}

function SectionHeader({ children, N }: { children: React.ReactNode } & PaletteProps) {
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

function StatCard({
  label,
  value,
  suffix,
  highlight,
}: { label: string; value: string; suffix?: string; highlight?: boolean }) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <div
      className="px-4 py-4"
      style={{
        borderRadius: 22,
        border: `1px solid ${highlight ? hexToRgba(D.accent, 0.5) : hexToRgba(D.accent, 0.18)}`,
        background: highlight ? hexToRgba(D.accent, 0.1) : hexToRgba(D.tint, 0.65),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.32em] font-[700]"
        style={{ color: highlight ? D.accent : DT.muted, fontSize: 8.5 }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="font-headline font-[700] tabular-nums tracking-[-0.03em]"
          style={{
            color: highlight ? D.accent : DT.primary,
            fontSize: 28,
            lineHeight: 0.95,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="font-mono"
            style={{ color: DT.muted, fontSize: 11 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ D, DT }: { D: DayPalette; DT: DayPaletteText }) {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center py-16">
      <div
        className="font-headline font-[600] lowercase tracking-[-0.02em]"
        style={{ color: DT.soft, fontSize: 22, maxWidth: '22ch' }}
      >
        aún no hay sesiones registradas
        <span style={{ color: D.accent }}>.</span>
      </div>
      <div
        className="mt-3 font-mono uppercase tracking-[0.28em] font-[600]"
        style={{ color: DT.muted, fontSize: 10, maxWidth: '32ch' }}
      >
        · completa tu primer protocolo y los datos aparecerán aquí ·
      </div>
    </div>
  );
}

function HeatCell({ score, date, D }: { score: number | null; date: string; D: DayPalette }) {
  const today = isoDate(new Date());
  const isToday = date === today;
  return (
    <span
      title={`${formatDisplayDate(date)}${score !== null ? ` · ${score}/100` : ' · sin sesión'}`}
      className="block w-full rounded-sm aspect-square"
      style={{
        background: score !== null ? heatColor(score, D) : hexToRgba(D.ink, 0.05),
        outline: isToday ? `1px solid ${hexToRgba(D.accent, 0.9)}` : 'none',
        outlineOffset: isToday ? 1 : 0,
      }}
      aria-label={`${date} score ${score ?? 'sin sesión'}`}
    />
  );
}

function heatColor(score: number, D: DayPalette): string {
  const t = Math.max(0, Math.min(1, score / 100));
  const base = mixHex(D.accent_deep, D.accent, t);
  const hot = mixHex(base, D.accent_warm, Math.pow(t, 1.8));
  return hexToRgba(hot, 0.35 + t * 0.6);
}

function Sparkline({ values, D, DT }: { values: number[]; D: DayPalette; DT: DayPaletteText }) {
  const W = 100;
  const H = 36;
  const PAD_Y = 4;

  if (values.length < 2) return null;

  const max = 100;
  const min = 0;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;

  const last = values[values.length - 1];
  const first = values[0];
  const delta = last - first;
  const deltaColor = delta >= 0 ? D.accent : D.accent_deep;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hexToRgba(D.accent, 0.35)} />
            <stop offset="1" stopColor={hexToRgba(D.accent, 0)} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path
          d={path}
          fill="none"
          stroke={D.accent}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between mt-2 font-mono tabular-nums" style={{ color: DT.muted, fontSize: 10 }}>
        <span>inicio · {first}</span>
        <span style={{ color: deltaColor, fontWeight: 700 }}>
          {delta >= 0 ? '+' : ''}{delta}
        </span>
        <span>último · {last}</span>
      </div>
    </div>
  );
}

function SessionRow({ record, D, DT }: { record: SessionRecord; D: DayPalette; DT: DayPaletteText }) {
  const mins = Math.round(record.durationSec / 60);
  const scoreHex = mixHex(D.accent_deep, D.accent, record.score / 100);
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: `1px solid ${hexToRgba(D.accent, 0.1)}` }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="font-headline font-[600] lowercase tracking-[-0.01em]"
          style={{ color: DT.primary, fontSize: 14 }}
        >
          {formatDisplayDate(record.date).toLowerCase()}
        </div>
        <div
          className="mt-0.5 font-mono tabular-nums"
          style={{ color: DT.muted, fontSize: 10.5 }}
        >
          {mins}m · {record.phasesCompleted} fases · +{record.xp} xp
          {record.skippedPhases.length > 0 && (
            <span> · {record.skippedPhases.length} skip</span>
          )}
        </div>
      </div>
      <div
        className="px-3 py-1 font-mono tabular-nums font-[700]"
        style={{
          background: hexToRgba(scoreHex, 0.16),
          color: scoreHex,
          border: `1px solid ${hexToRgba(scoreHex, 0.5)}`,
          borderRadius: 99,
          fontSize: 12,
          minWidth: '3ch',
          textAlign: 'center',
        }}
      >
        {record.score}
      </div>
    </div>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  } catch {
    return iso;
  }
}
