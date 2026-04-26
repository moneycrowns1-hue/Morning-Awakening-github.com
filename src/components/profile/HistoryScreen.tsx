'use client';

// ═══════════════════════════════════════════════════════
// HistoryScreen · long-form look back at the user's practice
//
// Three sections, stacked vertically in a scrollable column:
//   1. Summary strip: avg score (7d), best score ever,
//      total protocols, longest streak.
//   2. 16-week heatmap (16 x 7 grid). Each cell shaded by the
//      score of that day; empty cells are a hairline square.
//      Reads well on mobile since it fills the full width.
//   3. Sparkline chart of the last 30 scores + a scrollable
//      list of the last 14 sessions (date, duration, skips,
//      score pill).
//
// Reached from WelcomeScreen "historial" button. Fully self-
// contained: only depends on sessionHistory + theme.
// ═══════════════════════════════════════════════════════

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
import GradientBackground from '../common/GradientBackground';
import { loadSessions, type SessionRecord } from '@/lib/genesis/sessionHistory';
import { SUNRISE, hexToRgba, mixHex } from '@/lib/common/theme';
import { ACHIEVEMENTS, loadUnlocked, type AchievementDef } from '@/lib/genesis/achievements';

const ICONS = { Award, Clock, Flame, Sparkles, Sunrise, Target, Trophy, Zap } as const;
const TONE_HEX: Record<AchievementDef['tone'], string> = {
  gold: SUNRISE.rise2,
  coral: SUNRISE.dawn2,
  amber: SUNRISE.rise1,
  rose: SUNRISE.dawn1,
  cool: SUNRISE.cool,
};

interface HistoryScreenProps {
  onClose: () => void;
}

export default function HistoryScreen({ onClose }: HistoryScreenProps) {
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
  // Build a map date -> score so we can O(1) look up per cell.
  const byDate = useMemo(() => {
    const map = new Map<string, SessionRecord>();
    for (const r of sessions) map.set(r.date, r);
    return map;
  }, [sessions]);

  const heatmap = useMemo(() => {
    const WEEKS = 16;
    const DAYS = 7;
    const today = new Date();
    // Align the right-most column to today's weekday so "today" sits
    // in the last column.
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
    // Group into columns of 7 (week columns).
    const columns: Array<Array<{ date: string; score: number | null }>> = [];
    for (let c = 0; c < WEEKS; c++) {
      columns.push(cells.slice(c * DAYS, (c + 1) * DAYS));
    }
    return columns;
  }, [byDate]);

  const recent = useMemo(() => sessions.slice(-14).reverse(), [sessions]);
  const sparkline = useMemo(() => sessions.slice(-30).map((r) => r.score), [sessions]);
  const unlockedMap = useMemo(() => loadUnlocked(), [sessions]);
  const unlockedCount = Object.keys(unlockedMap).length;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ color: 'var(--sunrise-text)' }}>
      <GradientBackground stage="welcome" particleCount={35} />
      <div className="absolute inset-0 sunrise-vignette pointer-events-none" />

      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={onClose}
          aria-label="Volver"
          className="rounded-full p-2 transition-colors hover:bg-white/5"
          style={{ color: 'var(--sunrise-text-soft)' }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="flex flex-col">
          <span
            className="font-ui text-[10px] uppercase tracking-[0.38em]"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            Morning Awakening
          </span>
          <span className="font-display italic font-[400] text-[22px] leading-none mt-1" style={{ color: 'var(--sunrise-text)' }}>
            Historial
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 px-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        {/* Empty state */}
        {sessions.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center text-center py-16 sunrise-fade-up">
            <div
              className="font-display italic font-[300] text-[22px] max-w-[22ch]"
              style={{ color: 'var(--sunrise-text-soft)' }}
            >
              Aún no hay sesiones registradas.
            </div>
            <div
              className="mt-3 font-ui text-[12px] tracking-wider max-w-[26ch]"
              style={{ color: 'var(--sunrise-text-muted)' }}
            >
              Completa tu primer protocolo y los datos aparecerán aquí.
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats strip ──────────────────────── */}
            <div className="grid grid-cols-2 gap-3 mt-4 sunrise-fade-up" style={{ animationDelay: '40ms' }}>
              <StatBlock label="Promedio 7 días" value={stats.avg7 !== null ? String(stats.avg7) : '—'} suffix={stats.avg7 !== null ? '/ 100' : undefined} />
              <StatBlock label="Mejor score" value={stats.best !== null ? String(stats.best) : '—'} suffix={stats.best !== null ? '/ 100' : undefined} accent={SUNRISE.rise2} />
              <StatBlock label="Protocolos" value={String(stats.total)} />
              <StatBlock label="Mejor racha" value={String(stats.longestStreak)} suffix="días" />
            </div>

            {/* ── Heatmap ──────────────────────────── */}
            <section className="mt-8 sunrise-fade-up" style={{ animationDelay: '100ms' }}>
              <SectionHeader title="Últimas 16 semanas" hint="Cuadros iluminados = días con sesión" />
              <div
                className="rounded-2xl p-4"
                style={{
                  border: '1px solid rgba(255,250,240,0.08)',
                  background: 'rgba(255,250,240,0.03)',
                }}
              >
                <div className="flex gap-[3px]">
                  {heatmap.map((week, c) => (
                    <div key={c} className="flex flex-col gap-[3px] flex-1">
                      {week.map((cell, r) => (
                        <HeatCell key={`${c}-${r}`} score={cell.score} date={cell.date} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <span className="font-ui text-[9px] tracking-[0.28em] uppercase" style={{ color: 'var(--sunrise-text-muted)' }}>Menos</span>
                  {[0.2, 0.45, 0.7, 0.95].map((s) => (
                    <span
                      key={s}
                      className="block w-3 h-3 rounded-sm"
                      style={{ background: heatColor(Math.round(s * 100)) }}
                    />
                  ))}
                  <span className="font-ui text-[9px] tracking-[0.28em] uppercase" style={{ color: 'var(--sunrise-text-muted)' }}>Más</span>
                </div>
              </div>
            </section>

            {/* ── Sparkline ───────────────────────── */}
            {sparkline.length >= 2 && (
              <section className="mt-7 sunrise-fade-up" style={{ animationDelay: '160ms' }}>
                <SectionHeader title="Tendencia de score" hint="Últimas 30 sesiones" />
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: '1px solid rgba(255,250,240,0.08)',
                    background: 'rgba(255,250,240,0.03)',
                  }}
                >
                  <Sparkline values={sparkline} />
                </div>
              </section>
            )}

            {/* ── Achievements grid ────────────────── */}
            <section className="mt-7 sunrise-fade-up" style={{ animationDelay: '200ms' }}>
              <SectionHeader
                title="Logros"
                hint={`${unlockedCount} / ${ACHIEVEMENTS.length}`}
              />
              <div
                className="rounded-2xl p-4 grid grid-cols-2 gap-2"
                style={{
                  border: '1px solid rgba(255,250,240,0.08)',
                  background: 'rgba(255,250,240,0.03)',
                }}
              >
                {ACHIEVEMENTS.map((a) => {
                  const Icon = ICONS[a.icon];
                  const hex = TONE_HEX[a.tone];
                  const unlocked = a.id in unlockedMap;
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl"
                      style={{
                        border: `1px solid ${unlocked ? hexToRgba(hex, 0.35) : 'rgba(255,250,240,0.06)'}`,
                        background: unlocked ? hexToRgba(hex, 0.08) : 'rgba(255,250,240,0.02)',
                        opacity: unlocked ? 1 : 0.55,
                      }}
                    >
                      <span
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: unlocked ? hexToRgba(hex, 0.18) : 'rgba(255,250,240,0.04)',
                          color: unlocked ? hex : 'var(--sunrise-text-muted)',
                          border: unlocked ? `1px solid ${hexToRgba(hex, 0.4)}` : '1px solid rgba(255,250,240,0.08)',
                        }}
                      >
                        {unlocked ? <Icon size={14} strokeWidth={1.9} /> : <Lock size={12} strokeWidth={1.8} />}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="font-ui text-[12px] font-[500] leading-tight"
                          style={{ color: unlocked ? 'var(--sunrise-text)' : 'var(--sunrise-text-soft)' }}
                        >
                          {a.title}
                        </div>
                        <div
                          className="font-ui text-[10px] mt-0.5 leading-snug"
                          style={{ color: 'var(--sunrise-text-muted)' }}
                        >
                          {a.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Session list ────────────────────── */}
            <section className="mt-7 sunrise-fade-up" style={{ animationDelay: '260ms' }}>
              <SectionHeader title="Últimas sesiones" />
              <div className="flex flex-col gap-2">
                {recent.map((rec) => (
                  <SessionRow key={rec.completedAt} record={rec} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ═══ internals ═══════════════════════════════════════════════

function StatBlock({
  label,
  value,
  suffix,
  accent,
}: { label: string; value: string; suffix?: string; accent?: string }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        border: '1px solid rgba(255,250,240,0.08)',
        background: 'rgba(255,250,240,0.03)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="font-ui text-[10px] uppercase tracking-[0.3em]"
        style={{ color: 'var(--sunrise-text-muted)' }}
      >
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-display text-[28px] leading-none tracking-[-0.02em]"
          style={{ color: accent ?? 'var(--sunrise-text)' }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="font-ui text-[11px] tracking-wider"
            style={{ color: 'var(--sunrise-text-muted)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-1">
      <span
        className="font-ui text-[11px] uppercase tracking-[0.34em]"
        style={{ color: 'var(--sunrise-text-soft)' }}
      >
        {title}
      </span>
      {hint && (
        <span
          className="font-ui text-[10px] tracking-wider"
          style={{ color: 'var(--sunrise-text-muted)' }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function HeatCell({ score, date }: { score: number | null; date: string }) {
  const today = isoDate(new Date());
  const isToday = date === today;
  return (
    <span
      title={`${formatDisplayDate(date)}${score !== null ? ` · ${score}/100` : ' · sin sesión'}`}
      className="block w-full rounded-sm aspect-square"
      style={{
        background: score !== null ? heatColor(score) : 'rgba(255,250,240,0.05)',
        outline: isToday ? `1px solid ${hexToRgba(SUNRISE.rise2, 0.9)}` : 'none',
        outlineOffset: isToday ? 1 : 0,
      }}
      aria-label={`${date} score ${score ?? 'sin sesión'}`}
    />
  );
}

function heatColor(score: number): string {
  // 0..100 -> colour from cool/dark to warm/bright
  const t = Math.max(0, Math.min(1, score / 100));
  const base = mixHex(SUNRISE.predawn2, SUNRISE.dawn2, t);
  const hot = mixHex(base, SUNRISE.rise2, Math.pow(t, 1.8));
  return hexToRgba(hot, 0.35 + t * 0.6);
}

function Sparkline({ values }: { values: number[] }) {
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
  const deltaColor = delta >= 0 ? SUNRISE.rise2 : SUNRISE.dawn2;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hexToRgba(SUNRISE.rise2, 0.35)} />
            <stop offset="1" stopColor={hexToRgba(SUNRISE.rise2, 0)} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke={SUNRISE.rise2} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between mt-1 font-ui text-[10px] tracking-wider" style={{ color: 'var(--sunrise-text-muted)' }}>
        <span>Inicio: {first}</span>
        <span style={{ color: deltaColor }}>
          {delta >= 0 ? '+' : ''}{delta}
        </span>
        <span>Último: {last}</span>
      </div>
    </div>
  );
}

function SessionRow({ record }: { record: SessionRecord }) {
  const mins = Math.round(record.durationSec / 60);
  const scoreHex = mixHex(SUNRISE.dawn2, SUNRISE.rise2, record.score / 100);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        border: '1px solid rgba(255,250,240,0.07)',
        background: 'rgba(255,250,240,0.025)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-ui text-[13px] font-[500]" style={{ color: 'var(--sunrise-text)' }}>
          {formatDisplayDate(record.date)}
        </div>
        <div className="font-ui text-[10px] tracking-wider mt-0.5" style={{ color: 'var(--sunrise-text-muted)' }}>
          {mins} min · {record.phasesCompleted} fases · +{record.xp} XP
          {record.skippedPhases.length > 0 && (
            <span> · {record.skippedPhases.length} saltada{record.skippedPhases.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div
        className="px-2.5 py-1 rounded-full font-mono text-[12px] font-[500]"
        style={{
          background: hexToRgba(scoreHex, 0.18),
          color: scoreHex,
          border: `1px solid ${hexToRgba(scoreHex, 0.45)}`,
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
