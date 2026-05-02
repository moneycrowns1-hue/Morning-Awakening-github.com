'use client';

// ═══════════════════════════════════════════════════════════
// InventoryScreen · catálogo de herramientas físicas adquiridas.
//
// El usuario marca qué tools posee. Cada tool desbloquea uno
// o más hábitos del registro `habits.ts`. Estilo editorial
// D.paper coherente con CalendarScreen / SettingsScreen.
//
// Tools `medical` requieren confirmación adicional ("ya
// consulté con un profesional") antes de marcarse como
// poseídas, vía un mini-prompt inline. Sin pedir esa
// confirmación, el toggle no avanza.
//
// Sprint 1 surface: solo lista, toggles y disclaimers. Sin
// dashboards ni gráficos — esos llegan en Sprint 3.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useAppTheme } from '@/lib/common/appTheme';
import { haptics } from '@/lib/common/haptics';
import {
  TOOLS,
  PILLAR_LABEL,
  COST_TIER_LABEL,
  COST_TIER_ORDER,
  useInventory,
  type Tool,
  type ToolPillar,
} from '@/lib/looksmax/inventory';
import { HABIT_META, type HabitId } from '@/lib/common/habits';

interface InventoryScreenProps {
  onClose: () => void;
}

const PILLAR_ORDER: ToolPillar[] = [
  'oral',
  'structure',
  'skin',
  'eyes',
  'hair',
  'metabolism',
];

export default function InventoryScreen({ onClose }: InventoryScreenProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const inv = useInventory();

  // Tool ID en confirmación médica activa, o null si ninguna.
  const [pendingMedical, setPendingMedical] = useState<string | null>(null);

  const ownedCount = inv.owned.size;
  const totalCount = TOOLS.length;

  function toggle(tool: Tool) {
    haptics.tap();
    if (inv.has(tool.id)) {
      inv.remove(tool.id);
      return;
    }
    if (tool.medicalGate) {
      setPendingMedical(tool.id);
      return;
    }
    inv.add(tool.id);
  }

  function confirmMedical(toolId: string) {
    haptics.warn();
    inv.add(toolId as Tool['id'], { medicalConfirmed: true });
    setPendingMedical(null);
  }

  // Agrupar TOOLS por pillar y ordenar por costTier.
  const byPillar = new Map<ToolPillar, Tool[]>();
  for (const t of TOOLS) {
    const list = byPillar.get(t.pillar) ?? [];
    list.push(t);
    byPillar.set(t.pillar, list);
  }
  for (const list of byPillar.values()) {
    list.sort((a, b) =>
      COST_TIER_ORDER.indexOf(a.costTier) - COST_TIER_ORDER.indexOf(b.costTier),
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] w-full h-full flex flex-col overflow-hidden"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* ─── Background · paleta global ─────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.10)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(D.tint_strong, 0.25)} 0%, transparent 45%, ${hexToRgba(D.accent_soft, 0.06)} 100%)`,
        }}
      />

      {/* ─── Header · masthead ─────────────────────────── */}
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
              perfil · inventario
            </span>
          </button>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700] tabular-nums"
            style={{ color: DT.muted, fontSize: 9 }}
          >
            {ownedCount.toString().padStart(2, '0')} / {totalCount}
          </span>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }} />

        {/* Hero */}
        <div className="pt-5 pb-3">
          <div
            className="font-[700] leading-[0.92] tracking-[-0.035em] lowercase"
            style={{ color: DT.primary, fontSize: 'clamp(2rem, 8vw, 2.6rem)' }}
          >
            inventario
            <span style={{ color: D.accent }}>.</span>
          </div>
          <p
            className="mt-3 font-mono lowercase leading-[1.55]"
            style={{ color: DT.soft, fontSize: 12, maxWidth: 480 }}
          >
            marca lo que ya tienes. el coach activa los hábitos
            ligados a cada herramienta sólo cuando aparecen en tu
            inventario — el resto se queda gris hasta que llegue.
          </p>
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {PILLAR_ORDER.map((pillar) => {
            const list = byPillar.get(pillar) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={pillar} className="mt-7">
                <SectionHeader>· {PILLAR_LABEL[pillar]} ·</SectionHeader>
                <div className="flex flex-col gap-2">
                  {list.map((tool) => (
                    <ToolRow
                      key={tool.id}
                      tool={tool}
                      owned={inv.has(tool.id)}
                      pendingMedical={pendingMedical === tool.id}
                      onToggle={() => toggle(tool)}
                      onConfirmMedical={() => confirmMedical(tool.id)}
                      onCancelMedical={() => setPendingMedical(null)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Footer note */}
          <div className="mt-10 mb-4">
            <p
              className="font-mono lowercase leading-[1.55]"
              style={{ color: DT.muted, fontSize: 11 }}
            >
              · seguridad · bonesmashing y eye pulling están
              fuera del catálogo a propósito. son técnicas con
              riesgo documentado de daño irreversible y sin
              respaldo clínico. la app no las soporta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  const { day: D, dayText: DT } = useAppTheme();
  return (
    <div className="flex items-center gap-3 pt-1 pb-3">
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: hexToRgba(D.accent, 0.18) }}
      />
      <span
        className="font-mono uppercase tracking-[0.34em] font-[700] shrink-0"
        style={{ color: DT.muted, fontSize: 9 }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: hexToRgba(D.accent, 0.18) }}
      />
    </div>
  );
}

function ToolRow({
  tool,
  owned,
  pendingMedical,
  onToggle,
  onConfirmMedical,
  onCancelMedical,
}: {
  tool: Tool;
  owned: boolean;
  pendingMedical: boolean;
  onToggle: () => void;
  onConfirmMedical: () => void;
  onCancelMedical: () => void;
}) {
  const { day: D, dayText: DT } = useAppTheme();

  // Etiqueta de tier coloreada (medical más prominente).
  const tierIsMedical = tool.costTier === 'medical';

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 18,
        background: owned
          ? hexToRgba(D.accent, 0.06)
          : hexToRgba(D.tint, 0.55),
        border: `1px solid ${owned ? hexToRgba(D.accent, 0.36) : hexToRgba(D.accent, 0.12)}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-stretch text-left transition-transform active:scale-[0.995]"
        aria-pressed={owned}
      >
        {/* LEFT info */}
        <div className="flex-1 min-w-0 px-4 py-3.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-[700] lowercase tracking-[-0.02em]"
              style={{ color: DT.primary, fontSize: 15, lineHeight: 1.15 }}
            >
              {tool.label.toLowerCase()}
            </span>
            <span
              className="font-mono uppercase tracking-[0.26em] font-[700]"
              style={{
                color: tierIsMedical ? '#c44a3c' : D.accent,
                fontSize: 8.5,
                opacity: tierIsMedical ? 1 : 0.78,
              }}
            >
              · {COST_TIER_LABEL[tool.costTier]}
            </span>
          </div>
          <p
            className="mt-1.5 font-mono lowercase leading-[1.5]"
            style={{ color: DT.soft, fontSize: 11 }}
          >
            {tool.notes}
          </p>
          {tool.enables.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tool.enables.map((habit) => (
                <HabitChip key={habit} habit={habit} owned={owned} />
              ))}
            </div>
          )}
        </div>
        {/* RIGHT toggle */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 56,
            background: owned ? D.accent : 'transparent',
            borderLeft: `1px solid ${hexToRgba(D.accent, 0.16)}`,
          }}
        >
          {owned ? (
            <Check size={18} strokeWidth={2.6} style={{ color: D.paper }} />
          ) : (
            <span
              aria-hidden
              className="rounded-full"
              style={{
                width: 18,
                height: 18,
                border: `1px solid ${hexToRgba(D.accent, 0.45)}`,
              }}
            />
          )}
        </div>
      </button>

      {/* Medical confirmation prompt */}
      {pendingMedical && (
        <div
          className="px-4 py-3 flex flex-col gap-2"
          style={{
            borderTop: `1px solid ${hexToRgba(D.accent, 0.18)}`,
            background: hexToRgba('#c44a3c', 0.08),
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={14}
              strokeWidth={2.2}
              style={{ color: '#c44a3c', marginTop: 2, flexShrink: 0 }}
            />
            <p
              className="font-mono lowercase leading-[1.55]"
              style={{ color: DT.primary, fontSize: 11 }}
            >
              <strong style={{ fontWeight: 700 }}>requiere supervisión médica.</strong>{' '}
              {tool.notes} confirma que ya consultaste con un
              profesional antes de activarlo en tu inventario.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={onConfirmMedical}
              className="flex-1 font-mono uppercase tracking-[0.28em] font-[700] py-2.5 rounded-lg transition-transform active:scale-[0.97]"
              style={{
                background: '#c44a3c',
                color: D.paper,
                fontSize: 10,
              }}
            >
              ya consulté · activar
            </button>
            <button
              type="button"
              onClick={onCancelMedical}
              className="flex-1 font-mono uppercase tracking-[0.28em] font-[700] py-2.5 rounded-lg transition-opacity active:opacity-70"
              style={{
                background: 'transparent',
                color: DT.muted,
                border: `1px solid ${hexToRgba(D.accent, 0.22)}`,
                fontSize: 10,
              }}
            >
              cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HabitChip({ habit, owned }: { habit: HabitId; owned: boolean }) {
  const { day: D, dayText: DT } = useAppTheme();
  const meta = HABIT_META[habit];
  if (!meta) return null;
  return (
    <span
      className="font-mono lowercase tracking-[0.18em] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
      style={{
        background: owned ? hexToRgba(D.accent, 0.16) : hexToRgba(D.accent, 0.05),
        border: `1px solid ${hexToRgba(D.accent, owned ? 0.32 : 0.14)}`,
        color: owned ? D.accent : DT.muted,
        fontSize: 9,
      }}
    >
      <span aria-hidden style={{ opacity: 0.7 }}>{meta.icon}</span>
      {meta.label.toLowerCase()}
    </span>
  );
}
