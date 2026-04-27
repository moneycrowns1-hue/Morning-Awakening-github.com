'use client';

// ═══════════════════════════════════════════════════════════
// CoachScreen · pantalla completa del Coach de bienestar
//
// Consume `useCoach()` y muestra:
//   1. Header con modo activo + headline + perfil del día
//   2. Status grid (cepillado · agua · bruxismo · brote)
//   3. Lista priorizada de acciones (kind-aware)
//   4. Rutinas AM/PM colapsables (filtradas por engine)
//   5. Quick log (agua · cepillado · bruxismo)
//   6. Controles de modo (brote · Deriva-C)
//   7. Toggle de condiciones
//   8. Warnings de conflictos
//
// Estilo: lenguaje SUNRISE (theme.ts) — mismas convenciones
// que ToolsScreen/WelcomeScreen.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  ArrowLeft, Sun, Moon, Droplet, Brain, Smile, Pill, Flame,
  ChevronDown, Plus, Check, AlertTriangle, Activity,
  type LucideIcon,
} from 'lucide-react';
import GradientBackground from '../common/GradientBackground';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { useCoach } from '@/hooks/useCoach';
import { CONDITIONS, type ConditionId } from '@/lib/coach/conditions';
import { findTopical } from '@/lib/coach/catalog';
import type { Routine } from '@/lib/coach/routines';
import type { CoachAction, StatusCard, Briefing } from '@/lib/coach/coachEngine';
import type { BrushingSlot } from '@/lib/coach/brushing';
import { CURRENT_PLAN } from '@/lib/coach/brushing';
import ConditionsPanel from './ConditionsPanel';
import QuickLogPanel from './QuickLogPanel';
import FlareControls from './FlareControls';

interface CoachScreenProps {
  onClose: () => void;
}

export default function CoachScreen({ onClose }: CoachScreenProps) {
  const coach = useCoach();
  const { briefing, state, hydrated } = coach;

  const [openSection, setOpenSection] = useState<'am' | 'pm' | 'controls' | 'conditions' | null>(null);

  const toggle = (s: typeof openSection) => {
    haptics.tick();
    setOpenSection(prev => (prev === s ? null : s));
  };

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      <GradientBackground stage="welcome" particleCount={30} />

      {/* Header — back button + tagline */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Volver"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: hexToRgba(SUNRISE.predawn2, 0.55),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
              color: SUNRISE_TEXT.primary,
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.7} />
          </button>
          <div className="flex-1 min-w-0">
            <span
              className="font-ui text-[10px] uppercase tracking-[0.42em]"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              Coach
            </span>
            <div
              className="font-display italic font-[400] text-[22px] leading-tight mt-0.5"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              {hydrated && briefing ? briefing.headline : 'Cargando…'}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
      >
        <div className="px-5 max-w-3xl mx-auto">
          {!hydrated || !briefing ? (
            <LoadingState />
          ) : (
            <>
              {/* Modo + kicker */}
              <ModeBadge briefing={briefing} />

              {/* Warnings (si hay) */}
              {briefing.warnings.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {briefing.warnings.map(w => (
                    <WarningCard key={w.id} severity={w.severity} message={w.message} />
                  ))}
                </div>
              )}

              {/* Status grid */}
              <SectionLabel className="mt-6">Estado de hoy</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {briefing.status.map(card => (
                  <StatusCardView key={card.id} card={card} />
                ))}
              </div>

              {/* Acciones prioritarias */}
              {briefing.actions.length > 0 && (
                <>
                  <SectionLabel className="mt-6">Próximas acciones</SectionLabel>
                  <div className="mt-2 flex flex-col gap-2">
                    {briefing.actions.map(a => (
                      <ActionRow key={a.id} action={a} />
                    ))}
                  </div>
                </>
              )}

              {/* Rutinas AM/PM colapsables */}
              <SectionLabel className="mt-6">Rutinas de hoy · modo {modeLabel(briefing.mode)}</SectionLabel>
              <div className="mt-2 flex flex-col gap-2.5">
                <RoutineSection
                  slot="am"
                  routine={briefing.routine.am}
                  open={openSection === 'am'}
                  onToggle={() => toggle('am')}
                />
                <RoutineSection
                  slot="pm"
                  routine={briefing.routine.pm}
                  open={openSection === 'pm'}
                  onToggle={() => toggle('pm')}
                />
              </div>

              {/* Quick log */}
              <SectionLabel className="mt-6">Registrar rápido</SectionLabel>
              <QuickLogPanel coach={coach} />

              {/* Controles de modo (brote / Deriva-C) */}
              <CollapsibleSection
                label="Modo de tratamiento"
                icon={Flame}
                kicker="Brote · Deriva-C · Recovery"
                open={openSection === 'controls'}
                onToggle={() => toggle('controls')}
              >
                <FlareControls coach={coach} />
              </CollapsibleSection>

              {/* Condiciones activas */}
              <CollapsibleSection
                label="Mis condiciones"
                icon={Activity}
                kicker={`${state.conditions.length} activa${state.conditions.length === 1 ? '' : 's'}`}
                open={openSection === 'conditions'}
                onToggle={() => toggle('conditions')}
              >
                <ConditionsPanel
                  active={state.conditions}
                  onToggle={coach.toggleCondition}
                />
              </CollapsibleSection>

              <div className="h-12" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`font-ui text-[10px] tracking-[0.34em] uppercase ${className}`}
      style={{ color: SUNRISE_TEXT.muted }}
    >
      {children}
    </h2>
  );
}

function LoadingState() {
  return (
    <div
      className="mt-10 rounded-2xl px-5 py-6 text-center"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.4),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
        color: SUNRISE_TEXT.soft,
      }}
    >
      <span className="font-mono text-[11px] tracking-wider">Cargando estado…</span>
    </div>
  );
}

function ModeBadge({ briefing }: { briefing: Briefing }) {
  const isFlare = briefing.mode.startsWith('flare');
  const accent = isFlare ? '#ff6b6b' : SUNRISE.rise2;
  return (
    <div
      className="mt-2 rounded-2xl px-4 py-3"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
        border: `1px solid ${hexToRgba(accent, 0.32)}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-flex items-center font-ui text-[9.5px] tracking-[0.32em] uppercase px-2 py-0.5 rounded-full"
          style={{
            background: hexToRgba(accent, 0.18),
            color: accent,
            border: `1px solid ${hexToRgba(accent, 0.45)}`,
          }}
        >
          {modeLabel(briefing.mode)}
        </span>
        <span
          className="font-mono text-[10px] tracking-wider"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {briefing.context.dateISO}
        </span>
      </div>
      <p className="font-mono text-[11.5px] leading-snug" style={{ color: SUNRISE_TEXT.soft }}>
        {briefing.modeReason}
      </p>
    </div>
  );
}

function WarningCard({ severity, message }: { severity: 'info' | 'caution' | 'danger'; message: string }) {
  const color = severity === 'danger' ? '#ff6b6b' : severity === 'caution' ? '#ffb44d' : SUNRISE.cool;
  return (
    <div
      className="rounded-xl px-3.5 py-2.5 flex items-start gap-2.5"
      style={{
        background: hexToRgba(color, 0.1),
        border: `1px solid ${hexToRgba(color, 0.4)}`,
      }}
    >
      <AlertTriangle size={14} strokeWidth={1.85} style={{ color, marginTop: 2, flexShrink: 0 }} />
      <span className="font-mono text-[11.5px] leading-snug" style={{ color: SUNRISE_TEXT.primary }}>
        {message}
      </span>
    </div>
  );
}

function StatusCardView({ card }: { card: StatusCard }) {
  const Icon = STATUS_ICON[card.id] ?? Activity;
  const pct = card.progress !== undefined ? Math.round(card.progress * 100) : null;
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1.5"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} strokeWidth={1.85} style={{ color: SUNRISE.rise2 }} />
        <span
          className="font-ui text-[9.5px] tracking-[0.28em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {card.label}
        </span>
      </div>
      <span
        className="font-display italic font-[400] text-[18px] leading-none"
        style={{ color: SUNRISE_TEXT.primary }}
      >
        {card.value}
      </span>
      {pct !== null && (
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: hexToRgba(SUNRISE.rise2, 0.14) }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: SUNRISE.rise2,
              boxShadow: `0 0 8px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

const STATUS_ICON: Record<string, LucideIcon> = {
  brushing: Smile,
  water: Droplet,
  bruxism: Brain,
  flare: Flame,
};

function ActionRow({ action }: { action: CoachAction }) {
  const Icon = ACTION_ICON[action.kind] ?? Activity;
  const isCritical = action.priority === 'critical';
  const isOverdue = action.urgency === 'overdue';
  const accent = isOverdue ? '#ff6b6b' : isCritical ? SUNRISE.rise2 : SUNRISE_TEXT.soft as unknown as string;
  return (
    <div
      className="rounded-xl px-3.5 py-3 flex items-start gap-3"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.5),
        border: `1px solid ${hexToRgba(isOverdue ? '#ff6b6b' : SUNRISE.rise2, isCritical ? 0.32 : 0.16)}`,
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(isOverdue ? '#ff6b6b' : SUNRISE.rise2, 0.16),
          color: accent,
        }}
      >
        <Icon size={16} strokeWidth={1.85} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="font-display italic font-[400] text-[15px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {action.title}
          </span>
          {isOverdue && (
            <span
              className="font-ui text-[9px] tracking-[0.28em] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: hexToRgba('#ff6b6b', 0.2),
                color: '#ff6b6b',
                border: `1px solid ${hexToRgba('#ff6b6b', 0.4)}`,
              }}
            >
              Atraso
            </span>
          )}
          {action.priority === 'critical' && !isOverdue && (
            <span
              className="font-ui text-[9px] tracking-[0.28em] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: hexToRgba(SUNRISE.rise2, 0.2),
                color: SUNRISE.rise2,
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
              }}
            >
              Crítico
            </span>
          )}
        </div>
        <p
          className="font-mono text-[11px] leading-snug"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {action.reason}
        </p>
      </div>
    </div>
  );
}

const ACTION_ICON: Record<CoachAction['kind'], LucideIcon> = {
  flare_step: Flame,
  skincare_routine: Sun,
  brushing: Smile,
  water: Droplet,
  bruxism: Brain,
  breathing: Activity,
  meditation: Brain,
  oral_take: Pill,
  todo: Check,
};

function RoutineSection({
  slot,
  routine,
  open,
  onToggle,
}: {
  slot: 'am' | 'pm';
  routine: Routine;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = slot === 'am' ? Sun : Moon;
  const label = slot === 'am' ? 'Mañana' : 'Noche';
  const stepCount = routine.steps.length;
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3.5 flex items-center gap-3 text-left"
      >
        <span
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.16),
            color: SUNRISE.rise2,
          }}
        >
          <Icon size={16} strokeWidth={1.85} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-display italic font-[400] text-[16px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            Rutina {label}
          </div>
          <div
            className="font-mono text-[10.5px] tracking-wider mt-0.5"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            {stepCount} pasos · {routine.mode === 'normal' ? 'estándar' : routine.mode}
          </div>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={1.85}
          style={{
            color: SUNRISE_TEXT.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2">
          {routine.rationale && (
            <p
              className="font-mono text-[11px] leading-snug px-3 py-2 rounded-lg"
              style={{
                color: SUNRISE_TEXT.soft,
                background: hexToRgba(SUNRISE.rise2, 0.06),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
              }}
            >
              {routine.rationale}
            </p>
          )}
          {routine.steps.map((step, idx) => {
            const product = step.productId ? findTopical(step.productId) : null;
            return (
              <div
                key={idx}
                className="flex items-start gap-3 px-1"
              >
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px]"
                  style={{
                    background: hexToRgba(SUNRISE.rise2, 0.14),
                    color: SUNRISE.rise2,
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
                  }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono text-[12px] leading-snug"
                    style={{ color: SUNRISE_TEXT.primary }}
                  >
                    {step.action}
                  </div>
                  {product && (
                    <div
                      className="font-mono text-[10px] tracking-wider mt-0.5"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {product.name}
                      {step.applySkinState && ` · ${labelForSkinState(step.applySkinState)}`}
                      {step.optional && ' · opcional'}
                    </div>
                  )}
                  {step.note && (
                    <div
                      className="font-mono text-[10px] tracking-wider mt-0.5 italic"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {step.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  icon: Icon,
  kicker,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: LucideIcon;
  kicker?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3.5 rounded-2xl flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
        style={{
          background: hexToRgba(SUNRISE.predawn2, 0.5),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
        }}
      >
        <span
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.16),
            color: SUNRISE.rise2,
          }}
        >
          <Icon size={16} strokeWidth={1.85} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-display italic font-[400] text-[16px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {label}
          </div>
          {kicker && (
            <div
              className="font-mono text-[10.5px] tracking-wider mt-0.5"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              {kicker}
            </div>
          )}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={1.85}
          style={{
            color: SUNRISE_TEXT.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function modeLabel(mode: string): string {
  switch (mode) {
    case 'normal': return 'Normal';
    case 'acne_treatment': return 'Deriva-C';
    case 'flare_strong': return 'Brote severo';
    case 'flare_mild': return 'Brote leve';
    case 'recovery': return 'Recovery';
    default: return mode;
  }
}

function labelForSkinState(s: 'wet' | 'damp' | 'dry'): string {
  if (s === 'wet') return 'piel mojada';
  if (s === 'damp') return 'piel húmeda';
  return 'piel seca';
}

// Re-export types used by the action panel sub-components.
export type { ConditionId, BrushingSlot };
export { CONDITIONS, CURRENT_PLAN, Plus };
