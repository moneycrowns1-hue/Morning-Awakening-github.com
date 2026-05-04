'use client';

// ═══════════════════════════════════════════════════════════
// LooksmaxDashboard · resumen de hábitos looksmax activos.
//
// Reglas de visibilidad (gating):
//  - Free-tier: siempre visibles.
//  - Gated: solo visibles cuando el tool vive en el inventario.
//  - Si un hábito gated no está en inventario aparece en la
//    sección "por activar" con pill de bloqueo, sin datos.
//
// Uso:
//   <LooksmaxDashboard days={7} />          ← full (HistoryScreen)
//   <LooksmaxDashboard days={7} compact />  ← compacto (CoachScreen)
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import {
  IconSunHigh,
  IconMoon,
  IconMoonStars,
  IconBed,
  IconDroplet,
  IconDroplets,
  IconApple,
  IconScissors,
  IconPill,
  IconEye,
  IconLeaf,
  IconBolt,
  IconMoodSmile,
  IconNeedle,
  IconBubble,
  IconBarbell,
  IconActivity,
  IconMinus,
  IconCircle,
  IconCircleFilled,
  IconWind,
  IconArrowUp,
  IconHeart,
  IconDental,
  IconLock,
} from '@tabler/icons-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import {
  HABIT_META,
  HABIT_REQUIRES_TOOL,
  isHabitDone,
  currentStreak,
  adherence,
  type HabitId,
} from '@/lib/common/habits';
import { useInventory } from '@/lib/looksmax/inventory';

// ── Mapeo HabitId → icono Tabler (semántico por hábito) ────────
type TablerIcon = typeof IconSunHigh;
const LOOKSMAX_ICON: Partial<Record<HabitId, TablerIcon>> = {
  // Free-tier
  mewing_check:          IconDental,
  jaw_release:           IconActivity,
  chin_tuck:             IconArrowUp,
  face_yoga:             IconMoodSmile,
  chewing_apples:        IconApple,
  sleep_supine:          IconBed,
  hydration_3L:          IconDroplets,
  sodium_low:            IconMinus,
  floss:                 IconDental,
  // Gated
  tongue_scraper:        IconWind,
  cinnamon_paste:        IconLeaf,
  mouth_tape:            IconMoon,
  chewing_advanced:      IconBarbell,
  spf_am:                IconSunHigh,
  vitc_am:               IconDroplet,
  retinoid_pm:           IconMoonStars,
  exfoliation_weekly:    IconBubble,
  eye_drops_am:          IconEye,
  brow_grooming_week:    IconScissors,
  derma_roller_week:     IconNeedle,
  minoxidil_application: IconDroplet,
  finasteride_dose:      IconPill,
  potassium_intake:      IconHeart,
  electrolyte_intake:    IconBolt,
};

// ── HabitIds del subsistema looksmax ─────────────────────────
const FREE_HABITS: HabitId[] = [
  'mewing_check',
  'jaw_release',
  'chin_tuck',
  'face_yoga',
  'chewing_apples',
  'sleep_supine',
  'hydration_3L',
  'sodium_low',
  'floss',
];

const GATED_HABITS: HabitId[] = [
  'tongue_scraper',
  'cinnamon_paste',
  'mouth_tape',
  'chewing_advanced',
  'spf_am',
  'vitc_am',
  'retinoid_pm',
  'exfoliation_weekly',
  'eye_drops_am',
  'brow_grooming_week',
  'derma_roller_week',
  'minoxidil_application',
  'finasteride_dose',
  'potassium_intake',
  'electrolyte_intake',
];

interface LooksmaxDashboardProps {
  days?: number;
  compact?: boolean;
}

export default function LooksmaxDashboard({ days = 7, compact = false }: LooksmaxDashboardProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const inv = useInventory();

  const { active, locked } = useMemo(() => {
    const active: HabitId[] = [];
    const locked: HabitId[] = [];
    for (const id of FREE_HABITS) active.push(id);
    for (const id of GATED_HABITS) {
      const toolId = HABIT_REQUIRES_TOOL[id];
      if (toolId && inv.has(toolId as Parameters<typeof inv.has>[0])) active.push(id);
      else locked.push(id);
    }
    return { active, locked };
  }, [inv]);

  const habitData = useMemo(() => {
    const today = new Date();
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }
    return active.map((id) => ({
      id,
      meta: HABIT_META[id],
      streak: currentStreak(id),
      adh21: Math.round(adherence(id, 21) * 100),
      doneToday: isHabitDone(id),
      series: dates.map((iso) => isHabitDone(id, iso)),
    }));
  }, [active, days]);

  const totalActive = active.length;
  const doneToday = habitData.filter((h) => h.doneToday).length;
  const avgAdh = totalActive > 0
    ? Math.round(habitData.reduce((s, h) => s + h.adh21, 0) / totalActive)
    : 0;

  return (
    <div>
      {/* ── Header · tres cifras clave ───────────────────── */}
      <div className="flex items-stretch gap-2 mb-4">
        <StatTile
          kicker="completados hoy"
          value={`${doneToday}`}
          suffix={`/ ${totalActive}`}
          D={D} DT={DT}
        />
        <StatTile
          kicker="adherencia · 21d"
          value={`${avgAdh}`}
          suffix="%"
          accent
          D={D} DT={DT}
        />
        <StatTile
          kicker="por activar"
          value={`${locked.length}`}
          dim
          D={D} DT={DT}
        />
      </div>

      {/* ── Lista de hábitos activos ──────────────────────── */}
      {habitData.length > 0 && (
        <div className={compact ? 'flex flex-col gap-[1px]' : 'flex flex-col gap-[1px]'}>
          {habitData.map((h, i) => (
            <HabitRow
              key={h.id}
              {...h}
              days={days}
              compact={compact}
              first={i === 0}
              last={i === habitData.length - 1}
            />
          ))}
        </div>
      )}

      {/* ── Bloqueados · chips lineales ──────────────────── */}
      {locked.length > 0 && !compact && (
        <div className="mt-5">
          <div
            className="font-mono uppercase tracking-[0.36em] font-[700] mb-2.5"
            style={{ color: DT.muted, fontSize: 8 }}
          >
            · por activar en inventario ·
          </div>
          <div className="flex flex-wrap gap-1.5">
            {locked.map((id) => {
              const meta = HABIT_META[id];
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 font-mono lowercase tracking-[0.04em]"
                  style={{
                    borderRadius: 6,
                    border: `1px solid ${hexToRgba(D.accent, 0.1)}`,
                    background: hexToRgba(D.tint, 0.35),
                    color: DT.muted,
                    fontSize: 9.5,
                    padding: '3px 8px',
                  }}
                >
                  <IconLock size={9} stroke={1.5} style={{ opacity: 0.45, flexShrink: 0 }} />
                  {meta.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatTile ─────────────────────────────────────────────────
// Tarjeta de cifra grande · misma estructura que StatCard de HistoryScreen.

function StatTile({
  kicker,
  value,
  suffix,
  accent,
  dim,
  D,
  DT,
}: {
  kicker: string;
  value: string;
  suffix?: string;
  accent?: boolean;
  dim?: boolean;
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
}) {
  return (
    <div
      className="flex-1 px-3 py-3 flex flex-col gap-1"
      style={{
        borderRadius: 18,
        border: `1px solid ${accent ? hexToRgba(D.accent, 0.4) : hexToRgba(D.accent, 0.14)}`,
        background: accent ? hexToRgba(D.accent, 0.08) : hexToRgba(D.tint, 0.6),
      }}
    >
      <span
        className="font-mono uppercase tracking-[0.3em] font-[700] leading-none"
        style={{ color: dim ? DT.muted : accent ? D.accent : DT.muted, fontSize: 7.5 }}
      >
        {kicker}
      </span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className="font-headline font-[700] tabular-nums tracking-[-0.04em] leading-none"
          style={{ color: dim ? DT.soft : accent ? D.accent : DT.primary, fontSize: 22 }}
        >
          {value}
        </span>
        {suffix && (
          <span
            className="font-mono tracking-[0.04em]"
            style={{ color: DT.muted, fontSize: 10 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── HabitRow ─────────────────────────────────────────────────
// Fila editorial con icono, label, racha y mini-barras.
// Sin pills de texto — estado comunicado con indicador geométrico.

function HabitRow({
  id,
  meta,
  streak,
  adh21,
  doneToday,
  series,
  compact,
  first,
  last,
}: {
  id: HabitId;
  meta: (typeof HABIT_META)[HabitId];
  streak: number;
  adh21: number;
  doneToday: boolean;
  series: boolean[];
  days: number;
  compact: boolean;
  first: boolean;
  last: boolean;
}) {
  const { day: D, dayText: DT } = useAppTheme();

  const radius = `${first ? '12px 12px' : '3px 3px'} ${last ? '12px 12px' : '3px 3px'}`;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        borderRadius: radius,
        border: `1px solid ${hexToRgba(D.accent, doneToday ? 0.28 : 0.1)}`,
        background: doneToday ? hexToRgba(D.accent, 0.05) : hexToRgba(D.tint, 0.5),
      }}
    >
      {/* Dot indicador de estado */}
      <span aria-hidden className="shrink-0 flex items-center">
        {doneToday
          ? <IconCircleFilled size={9} style={{ color: D.accent }} />
          : <IconCircle size={9} stroke={1.5} style={{ color: hexToRgba(D.accent, 0.3) }} />}
      </span>

      {/* Icono semántico Tabler */}
      {LOOKSMAX_ICON[id] ? (
        <span aria-hidden className="shrink-0 flex items-center">
          {(() => {
            const I = LOOKSMAX_ICON[id]!;
            return <I size={14} stroke={1.5} style={{ color: doneToday ? D.accent : DT.muted, opacity: doneToday ? 1 : 0.55 }} />;
          })()}
        </span>
      ) : null}

      {/* Label */}
      <span
        className="flex-1 min-w-0 font-headline font-[600] lowercase tracking-[-0.01em] truncate"
        style={{ color: DT.primary, fontSize: compact ? 11.5 : 12.5, lineHeight: 1.2 }}
      >
        {meta.label.toLowerCase()}
      </span>

      {/* Stats: racha + adherencia */}
      {!compact && (
        <div className="shrink-0 flex items-center gap-3">
          <span
            className="font-mono tabular-nums tracking-[0.02em]"
            style={{ color: streak > 0 ? D.accent : hexToRgba(D.accent, 0.3), fontSize: 9.5 }}
          >
            {streak > 0 ? `↑ ${streak}d` : '· ·'}
          </span>
          <span
            className="font-mono tabular-nums tracking-[0.02em]"
            style={{ color: DT.muted, fontSize: 9.5 }}
          >
            {adh21}%
          </span>
        </div>
      )}

      {/* Mini sparkline horizontal · solo en full */}
      {!compact && (
        <div className="shrink-0 flex items-end gap-[2px]" style={{ width: 28, height: 14 }}>
          {series.map((done, i) => (
            <span
              key={i}
              className="flex-1 rounded-[1px]"
              style={{
                height: done ? 12 : 3,
                background: done ? hexToRgba(D.accent, 0.7) : hexToRgba(D.accent, 0.1),
              }}
            />
          ))}
        </div>
      )}

      {/* Track pill · solo en full */}
      {!compact && (
        <span
          className="shrink-0 font-mono uppercase tracking-[0.22em] font-[700]"
          style={{ color: DT.muted, fontSize: 7, minWidth: 28, textAlign: 'right' }}
        >
          {meta.track === 'morning' ? 'am' : meta.track === 'night' ? 'pm' : meta.track === 'both' ? 'am·pm' : 'day'}
        </span>
      )}
    </div>
  );
}
