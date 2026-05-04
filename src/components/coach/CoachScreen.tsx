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
  ArrowLeft, ArrowUpRight, Sun, Moon, Droplet, Brain, Smile, Pill, Flame,
  ChevronDown, ChevronUp, Plus, Check, AlertTriangle, Activity, History,
  type LucideIcon,
} from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import { useCoach } from '@/hooks/useCoach';
import { CONDITIONS, type ConditionId } from '@/lib/coach/conditions';
import { findTopical } from '@/lib/coach/catalog';
import type { Routine, RoutineStep } from '@/lib/coach/routines';
import type { SubRoutineId } from '@/lib/coach/subRoutines';
import { rotationCategoryFor, CATEGORY_LABEL } from '@/lib/coach/activesLog';
import type { CoachAction, StatusCard, Briefing } from '@/lib/coach/coachEngine';
import type { BrushingSlot } from '@/lib/coach/brushing';
import { CURRENT_PLAN } from '@/lib/coach/brushing';
import ConditionsSheet from './ConditionsSheet';
import WeeklyHistorySheet from './WeeklyHistorySheet';
import ProductDetailSheet from './ProductDetailSheet';
import QuickLogPanel from './QuickLogPanel';
import FlareControls from './FlareControls';
import RemindersPanel from './RemindersPanel';
import PillSchedulePanel from './PillSchedulePanel';
import CheckInBanner from './CheckInBanner';
import SubRoutineChipRow from './SubRoutineChipRow';
import TipCard from './TipCard';
import ComboCard from './ComboCard';
import { useCoachReminders } from '@/hooks/useCoachReminders';
import LooksmaxDashboard from '../looksmax/LooksmaxDashboard';

interface CoachScreenProps {
  onClose: () => void;
}

export default function CoachScreen({ onClose }: CoachScreenProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const coach = useCoach();
  const { briefing, state, hydrated } = coach;
  const {
    reminders,
    permission: notifPermission,
    requestPermission: requestNotifPermission,
    firedIds: firedReminderIds,
    snooze: snoozeReminder,
    dismiss: dismissReminder,
  } = useCoachReminders(state, hydrated);

  const [openSection, setOpenSection] = useState<'am' | 'pm' | 'controls' | null>(null);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Sub-rutinas auto que el usuario descartó visualmente HOY.
  // No reset entre re-renders del briefing (mismo componente);
  // el motor del día siguiente las penalizará vía dismissalLog.
  const [dismissedToday, setDismissedToday] = useState<Set<SubRoutineId>>(
    () => new Set<SubRoutineId>(),
  );

  const openProduct = (id: string) => { haptics.tap(); setActiveProductId(id); };

  const dismissAutoSubRoutine = (id: SubRoutineId) => {
    coach.logSubRoutineDismissal(id);
    setDismissedToday((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggle = (s: typeof openSection) => {
    haptics.tick();
    setOpenSection(prev => (prev === s ? null : s));
  };

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: SUNRISE.night, color: SUNRISE_TEXT.primary }}
    >
      {/* Background mode-aware · sigue paleta global día/noche */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(SUNRISE.rise2, 0.14)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(SUNRISE.dawn1, 0.08)} 0%, transparent 40%, ${hexToRgba(SUNRISE.cool, 0.06)} 100%)`,
        }}
      />

      {/* Header — back button + tagline */}
      <div
        className="relative z-10 px-5 pt-5 max-w-3xl w-full mx-auto shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <button
            type="button"
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Volver"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
            style={{
              background: SUNRISE.rise2,
              color: SUNRISE.night,
              boxShadow: `0 6px 18px -4px ${hexToRgba(SUNRISE.rise2, 0.5)}`,
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
          </button>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-ui text-[10px] uppercase tracking-[0.42em]"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                Coach
              </span>
              {hydrated && briefing && (
                <span
                  className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.22em] font-[600] px-2 py-0.5 rounded-full"
                  title={`Mes ${briefing.signals.climate.month} · ${briefing.signals.climate.rainSeason ? 'lluviosa' : 'seca'}`}
                  style={{
                    background: hexToRgba(SUNRISE.rise2, 0.08),
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.22)}`,
                    color: SUNRISE_TEXT.soft,
                    fontSize: 8.5,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: SUNRISE.rise2 }}
                  />
                  {briefing.signals.climate.summary}
                </span>
              )}
            </div>
            <div
              className="font-headline font-[600] text-[28px] leading-[0.95] tracking-[-0.025em] lowercase mt-1"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              {hydrated && briefing ? briefing.headline.toLowerCase() : 'cargando…'}
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
              {/* Check-in del día · 1-tap chips opcionales */}
              <div className="mt-4">
                <CheckInBanner
                  checkIn={briefing.signals.checkIn}
                  onSet={coach.setCheckIn}
                />
              </div>

              {/* Chip-row "tu día" · sub-rutinas manuales + auto */}
              <div className="mt-3">
                <SubRoutineChipRow
                  activeIds={new Set(briefing.activeSubRoutines.map(s => s.id))}
                  manualIds={new Set(state.manualSubRoutines.map(m => m.id))}
                  dismissedToday={dismissedToday}
                  onActivate={coach.activateSubRoutine}
                  onDeactivate={coach.deactivateSubRoutine}
                  onDismissAuto={dismissAutoSubRoutine}
                />
              </div>

              {/* Rationale del día · explicabilidad de los ajustes */}
              {briefing.signals.rationale.length > 0 && (
                <RationaleDrawer rationale={briefing.signals.rationale} />
              )}

              {/* Warnings (si hay) */}
              {briefing.warnings.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {briefing.warnings.map(w => (
                    <WarningCard key={w.id} severity={w.severity} message={w.message} />
                  ))}
                </div>
              )}

              {/* ESTADO DE HOY · 3 métricas + 4ta tile = motivo/modo (dorada) */}
              <SectionLabel className="mt-4">Estado de hoy</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {briefing.status
                  .filter(c => c.id !== 'flare') /* el modo card cubre el flare info */
                  .slice(0, 3)
                  .map(card => (
                    <StatusCardView key={card.id} card={card} />
                  ))}
                <ModeStatusCard briefing={briefing} />
              </div>

              {/* QUICK LOG · strip + dropdown "más" */}
              <div className="mt-5">
                <QuickLogPanel coach={coach} />
              </div>

              {/* Combo del día · 2-4 productos/hábitos curados */}
              {briefing.combo && (
                <div className="mt-5">
                  <ComboCard combo={briefing.combo} onSelectProduct={openProduct} />
                </div>
              )}

              {/* Tip del día · 1 frase relevante al contexto */}
              {briefing.tip && (
                <div className="mt-3">
                  <TipCard tip={briefing.tip} onSeen={coach.markTipSeen} />
                </div>
              )}

              {/* HERO · acción protagónica del día (la más urgente) */}
              {briefing.actions.length > 0 && (
                <HeroActionCard
                  action={briefing.actions[0]}
                  onSelectProduct={openProduct}
                />
              )}

              {/* Acciones restantes (más allá del hero) */}
              {briefing.actions.length > 1 && (
                <>
                  <SectionLabel className="mt-5">Siguientes</SectionLabel>
                  <div className="mt-2 flex flex-col gap-2">
                    {briefing.actions.slice(1).map(a => (
                      <ActionRow
                        key={a.id}
                        action={a}
                        onSelectProduct={openProduct}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Rutinas AM/PM colapsables */}
              <SectionLabel className="mt-5">Rutinas de hoy · modo {modeLabel(briefing.mode)}</SectionLabel>
              <div className="mt-2 flex flex-col gap-2.5">
                <RoutineSection
                  slot="am"
                  routine={briefing.routine.am}
                  open={openSection === 'am'}
                  onToggle={() => toggle('am')}
                  onSelectProduct={openProduct}
                  onLogApplied={coach.logActiveApplication}
                />
                <RoutineSection
                  slot="pm"
                  routine={briefing.routine.pm}
                  open={openSection === 'pm'}
                  onToggle={() => toggle('pm')}
                  onSelectProduct={openProduct}
                  onLogApplied={coach.logActiveApplication}
                />
              </div>

              {/* Recordatorios programados (sólo si hay o falta permiso) */}
              {(reminders.length > 0 || notifPermission === 'default') && (
                <div className="mt-5">
                  <RemindersPanel
                    reminders={reminders}
                    permission={notifPermission}
                    firedIds={firedReminderIds}
                    onRequestPermission={() => { void requestNotifPermission(); }}
                    onSnooze={snoozeReminder}
                    onDismiss={dismissReminder}
                  />
                </div>
              )}

              {/* Pastillas programadas */}
              <div className="mt-5">
                <PillSchedulePanel
                  schedule={state.oralSchedule}
                  onSet={coach.setOralSchedule}
                  onClear={coach.clearOralSchedule}
                />
              </div>

              {/* Looksmax · hábitos activos hoy (compacto) */}
              <div className="mt-5">
                <SectionLabel>Looksmax · hoy</SectionLabel>
                <div
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
                    background: hexToRgba(SUNRISE.night, 0.45),
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    padding: '14px 14px',
                  }}
                >
                  <LooksmaxDashboard days={7} compact />
                </div>
              </div>

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

              {/* Condiciones activas — abre bottom sheet GSAP */}
              <button
                type="button"
                onClick={() => { haptics.tap(); setConditionsOpen(true); }}
                className="w-full mt-4 overflow-hidden flex transition-transform active:scale-[0.995]"
                style={{
                  borderRadius: 22,
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
                }}
              >
                {/* LEFT · dark · info */}
                <div
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  style={{
                    padding: '14px 16px',
                    background: hexToRgba(SUNRISE.night, 0.55),
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: hexToRgba(SUNRISE.rise2, 0.16),
                      color: SUNRISE.rise2,
                    }}
                  >
                    <Activity size={16} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-headline font-[600] text-[18px] leading-tight lowercase tracking-[-0.02em]"
                      style={{ color: SUNRISE_TEXT.primary }}
                    >
                      mis condiciones
                    </div>
                    <div
                      className="font-mono text-[10.5px] tracking-wider mt-0.5"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {state.conditions.length} activa{state.conditions.length === 1 ? '' : 's'} · toca para ajustar
                    </div>
                  </div>
                </div>
                {/* RIGHT · dorado · arrow */}
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 64,
                    background: SUNRISE.rise2,
                    color: SUNRISE.night,
                  }}
                >
                  <Plus size={20} strokeWidth={2.5} style={{ color: SUNRISE.night }} />
                </div>
              </button>

              {/* Histórico semanal — abre bottom sheet GSAP */}
              <button
                type="button"
                onClick={() => { haptics.tap(); setHistoryOpen(true); }}
                className="w-full mt-2.5 overflow-hidden flex transition-transform active:scale-[0.995]"
                style={{
                  borderRadius: 22,
                  border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
                }}
              >
                <div
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  style={{
                    padding: '14px 16px',
                    background: hexToRgba(SUNRISE.night, 0.55),
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: hexToRgba(SUNRISE.rise2, 0.16),
                      color: SUNRISE.rise2,
                    }}
                  >
                    <History size={16} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-headline font-[600] text-[18px] leading-tight lowercase tracking-[-0.02em]"
                      style={{ color: SUNRISE_TEXT.primary }}
                    >
                      últimos 7 días
                    </div>
                    <div
                      className="font-mono text-[10.5px] tracking-wider mt-0.5"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      hábitos · activos · rachas
                    </div>
                  </div>
                </div>
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 64,
                    background: SUNRISE.rise2,
                    color: SUNRISE.night,
                  }}
                >
                  <ArrowUpRight size={20} strokeWidth={2.5} style={{ color: SUNRISE.night }} />
                </div>
              </button>

              <div className="h-12" />
            </>
          )}
        </div>
      </div>

      {/* Bottom sheets con animación GSAP */}
      <ConditionsSheet
        open={conditionsOpen}
        active={state.conditions}
        onToggle={coach.toggleCondition}
        onClose={() => setConditionsOpen(false)}
      />
      <WeeklyHistorySheet
        open={historyOpen}
        state={state}
        onClose={() => setHistoryOpen(false)}
      />
      <ProductDetailSheet
        productId={activeProductId}
        onClose={() => setActiveProductId(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════

// Hero action card · estilo Image 1 (número · label · título grande · CTA con flecha)
// Toma la primera acción del briefing y la pone como protagonista del día.
function HeroActionCard({
  action,
  onSelectProduct,
}: {
  action: CoachAction;
  onSelectProduct?: (productId: string) => void;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const Icon = ACTION_ICON[action.kind] ?? Activity;
  const isOverdue = action.urgency === 'overdue';
  const accent = isOverdue ? '#ff6b6b' : SUNRISE.rise2;
  const firstProductId = action.productIds?.[0];
  const tappable = !!firstProductId;
  return (
    <button
      type="button"
      disabled={!tappable}
      onClick={tappable && onSelectProduct ? () => onSelectProduct(firstProductId!) : undefined}
      className="mt-4 w-full text-left transition-transform active:scale-[0.99] disabled:cursor-default"
      style={{
        background: accent,
        color: SUNRISE.night,
        padding: '18px 20px 16px',
        borderRadius: 28,
        boxShadow: `0 16px 36px -10px ${hexToRgba(accent, 0.55)}`,
      }}
    >
      {/* Top row · number + kicker + arrow */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-mono text-[12px] font-[700] tabular-nums"
            style={{ color: SUNRISE.night, opacity: 0.55 }}
          >
            01.
          </span>
          <span
            className="font-ui text-[10px] tracking-[0.34em] uppercase font-[700] truncate"
            style={{ color: SUNRISE.night, opacity: 0.72 }}
          >
            {isOverdue ? 'atraso · ahora' : 'siguiente acción'}
          </span>
        </div>
        {tappable && (
          <ArrowUpRight
            size={20}
            strokeWidth={2.4}
            style={{ color: SUNRISE.night, flexShrink: 0 }}
          />
        )}
      </div>

      {/* Big title */}
      <div
        className="font-headline font-[700] leading-[0.95] lowercase tracking-[-0.025em]"
        style={{
          fontSize: 'clamp(2.1rem, 9vw, 2.8rem)',
          color: SUNRISE.night,
        }}
      >
        {action.title.toLowerCase()}
      </div>

      {/* Reason */}
      <p
        className="font-mono text-[12.5px] leading-[1.4] mt-2.5"
        style={{ color: SUNRISE.night, opacity: 0.75 }}
      >
        {action.reason}
      </p>

      {/* Bottom row · icon + kind label + cta */}
      <div
        className="flex items-center justify-between mt-5 pt-3.5"
        style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.night, 0.2)}` }}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: hexToRgba(SUNRISE.night, 0.16),
              color: SUNRISE.night,
            }}
          >
            <Icon size={13} strokeWidth={2.2} />
          </span>
          <span
            className="font-ui text-[10px] tracking-[0.3em] uppercase font-[700] truncate"
            style={{ color: SUNRISE.night, opacity: 0.7 }}
          >
            {kindLabel(action.kind)}
          </span>
        </span>
        {tappable && (
          <span
            className="font-ui text-[11px] tracking-[0.3em] uppercase font-[700] shrink-0"
            style={{ color: SUNRISE.night }}
          >
            ver detalle →
          </span>
        )}
      </div>
    </button>
  );
}

function kindLabel(kind: CoachAction['kind']): string {
  switch (kind) {
    case 'flare_step': return 'brote';
    case 'skincare_routine': return 'rutina';
    case 'brushing': return 'cepillado';
    case 'water': return 'hidratación';
    case 'bruxism': return 'bruxismo';
    case 'breathing': return 'respiración';
    case 'meditation': return 'meditación';
    case 'oral_take': return 'pastilla';
    case 'todo': return 'tarea';
    default: return kind;
  }
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { SUNRISE_TEXT } = useLegacyTheme();
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
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
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

// 4ta tile del grid "Estado de hoy" · dorada filled · ocupa el slot que
// antes ocupaba la card de motivo+modo separada arriba.
function ModeStatusCard({ briefing }: { briefing: Briefing }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const isFlare = briefing.mode.startsWith('flare');
  const accent = isFlare ? '#ff6b6b' : SUNRISE.rise2;
  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-2.5"
      style={{
        background: accent,
        color: SUNRISE.night,
        boxShadow: `0 10px 26px -10px ${hexToRgba(accent, 0.55)}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.night, 0.16),
          color: SUNRISE.night,
        }}
      >
        <Activity size={16} strokeWidth={2} />
      </div>
      <span
        className="font-ui text-[10px] tracking-[0.3em] uppercase font-[700]"
        style={{ color: SUNRISE.night, opacity: 0.7 }}
      >
        modo
      </span>
      <span
        className="font-headline font-[700] text-[20px] leading-tight lowercase tracking-[-0.02em] mt-auto"
        style={{ color: SUNRISE.night }}
      >
        {modeLabel(briefing.mode).toLowerCase()}
      </span>
      <p
        className="font-mono text-[10.5px] leading-[1.35]"
        style={{
          color: SUNRISE.night,
          opacity: 0.7,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {briefing.modeReason}
      </p>
    </div>
  );
}

function WarningCard({ severity, message }: { severity: 'info' | 'caution' | 'danger'; message: string }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
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

/**
 * Drawer colapsable que lista los motivos legibles que el motor
 * usó hoy (rationale[]). Cada línea es una decisión explicada.
 */
function RationaleDrawer({ rationale }: { rationale: string[] }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{
        background: hexToRgba(SUNRISE.night, 0.45),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
      }}
    >
      <button
        type="button"
        onClick={() => { haptics.tick(); setOpen(v => !v); }}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: SUNRISE.rise2 }}
          />
          <span
            className="font-mono uppercase tracking-[0.32em] font-[600]"
            style={{ color: SUNRISE_TEXT.muted, fontSize: 9 }}
          >
            ajustes de hoy · {rationale.length}
          </span>
        </div>
        <span style={{ color: SUNRISE_TEXT.muted }}>
          {open ? <ChevronUp size={14} strokeWidth={2.2} /> : <ChevronDown size={14} strokeWidth={2.2} />}
        </span>
      </button>
      {open && (
        <ul
          className="px-4 pb-3 pt-1 flex flex-col gap-1.5"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.1)}` }}
        >
          {rationale.map((line, i) => (
            <li
              key={i}
              className="font-ui text-[12px] leading-snug flex items-start gap-2"
              style={{ color: SUNRISE_TEXT.soft }}
            >
              <span
                aria-hidden
                className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                style={{ background: hexToRgba(SUNRISE.rise2, 0.6) }}
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusCardView({ card }: { card: StatusCard }) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const Icon = STATUS_ICON[card.id] ?? Activity;
  const pct = card.progress !== undefined ? Math.round(card.progress * 100) : null;
  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-2.5"
      style={{
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.18),
          color: SUNRISE.rise2,
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </div>
      <span
        className="font-ui text-[10px] tracking-[0.3em] uppercase"
        style={{ color: SUNRISE_TEXT.muted }}
      >
        {card.label}
      </span>
      <span
        className="font-headline font-[600] text-[20px] leading-tight lowercase tracking-[-0.02em] mt-auto"
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

function ActionRow({
  action,
  onSelectProduct,
}: {
  action: CoachAction;
  onSelectProduct?: (productId: string) => void;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const Icon = ACTION_ICON[action.kind] ?? Activity;
  const isCritical = action.priority === 'critical';
  const isOverdue = action.urgency === 'overdue';
  // Solid fill for urgency: overdue=red, critical=dorado, normal=dark glass
  const filled = isOverdue || isCritical;
  const fillBg = isOverdue ? '#ff6b6b' : SUNRISE.rise2;
  const firstProductId = action.productIds?.[0];
  const tappable = !!firstProductId;
  const Tag = tappable ? 'button' : 'div';
  return (
    <Tag
      type={tappable ? 'button' : undefined}
      onClick={tappable && onSelectProduct ? () => onSelectProduct(firstProductId!) : undefined}
      className={`rounded-2xl px-4 py-3.5 flex items-start gap-3 text-left w-full ${tappable ? 'transition-transform active:scale-[0.99]' : ''}`}
      style={{
        background: filled ? fillBg : hexToRgba(SUNRISE.night, 0.55),
        border: filled ? 'none' : `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        color: filled ? SUNRISE.night : SUNRISE_TEXT.primary,
        backdropFilter: filled ? undefined : 'blur(10px)',
        WebkitBackdropFilter: filled ? undefined : 'blur(10px)',
        boxShadow: filled ? `0 8px 24px -8px ${hexToRgba(fillBg, 0.5)}` : undefined,
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: filled ? hexToRgba(SUNRISE.night, 0.16) : hexToRgba(SUNRISE.rise2, 0.16),
          color: filled ? SUNRISE.night : SUNRISE.rise2,
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className="font-headline font-[600] text-[16px] leading-tight lowercase tracking-[-0.015em]"
            style={{ color: filled ? SUNRISE.night : SUNRISE_TEXT.primary }}
          >
            {action.title.toLowerCase()}
          </span>
          {(isOverdue || isCritical) && (
            <span
              className="font-ui text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full font-[700]"
              style={{
                background: hexToRgba(SUNRISE.night, 0.18),
                color: SUNRISE.night,
              }}
            >
              {isOverdue ? 'atraso' : 'crítico'}
            </span>
          )}
        </div>
        <p
          className="font-mono text-[11.5px] leading-snug"
          style={{ color: filled ? hexToRgba(SUNRISE.night, 0.72) : SUNRISE_TEXT.muted }}
        >
          {action.reason}
        </p>
        {tappable && (
          <span
            className="font-ui text-[9.5px] tracking-[0.28em] uppercase mt-2 inline-flex items-center gap-1 font-[600]"
            style={{ color: filled ? SUNRISE.night : SUNRISE.rise2, opacity: filled ? 0.75 : 1 }}
          >
            ver detalle →
          </span>
        )}
      </div>
    </Tag>
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
  onSelectProduct,
  onLogApplied,
}: {
  slot: 'am' | 'pm';
  routine: Routine;
  open: boolean;
  onToggle: () => void;
  onSelectProduct: (id: string) => void;
  /** Log de aplicación de un activo rotable (retinoide/AHA/BHA/corticoide). */
  onLogApplied: (productId: string) => boolean;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const Icon = slot === 'am' ? Sun : Moon;
  const label = slot === 'am' ? 'Mañana' : 'Noche';
  const stepCount = routine.steps.length;
  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 22,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex transition-transform active:scale-[0.995]"
      >
        {/* LEFT · dark glass · info */}
        <div
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
          style={{
            padding: '14px 16px',
            background: hexToRgba(SUNRISE.night, 0.55),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.16),
              color: SUNRISE.rise2,
            }}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-headline font-[600] text-[18px] leading-tight lowercase tracking-[-0.02em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              rutina {label.toLowerCase()}
            </div>
            <div
              className="font-mono text-[10.5px] tracking-wider mt-0.5"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              {stepCount} pasos · {routine.mode === 'normal' ? 'estándar' : routine.mode}
            </div>
          </div>
        </div>
        {/* RIGHT · dorado · chevron */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 64,
            background: SUNRISE.rise2,
            color: SUNRISE.night,
          }}
        >
          <ChevronDown
            size={20}
            strokeWidth={2.5}
            style={{
              color: SUNRISE.night,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 220ms',
            }}
          />
        </div>
      </button>
      {open && (
        <div
          className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2"
          style={{
            background: hexToRgba(SUNRISE.night, 0.55),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
          }}
        >
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
          {routine.steps.map((step, idx) => (
            <RoutineStepRow
              key={idx}
              step={step}
              index={idx}
              onSelectProduct={onSelectProduct}
              onLogApplied={onLogApplied}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fila individual de un paso de rutina. Tap en la zona principal
 * abre el sheet del producto. Si el producto es un activo rotable
 * (retinoide / AHA / BHA / corticoide), aparece un sub-botón
 * "apliqué" que loguea la aplicación al `activesLog` para que el
 * rotation engine sepa cuándo descansar.
 */
function RoutineStepRow({
  step,
  index,
  onSelectProduct,
  onLogApplied,
}: {
  step: RoutineStep;
  index: number;
  onSelectProduct: (id: string) => void;
  onLogApplied: (productId: string) => boolean;
}) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  const [logged, setLogged] = useState(false);

  const product = step.productId ? findTopical(step.productId) : null;
  const stepTappable = !!step.productId;
  const rotationCategory = step.productId
    ? rotationCategoryFor(step.productId)
    : null;
  const showLogButton = !!rotationCategory;

  const onRowClick = () => {
    if (!stepTappable) return;
    onSelectProduct(step.productId!);
  };

  const onLogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!step.productId) return;
    haptics.tap();
    const ok = onLogApplied(step.productId);
    if (ok) setLogged(true);
  };

  return (
    <div
      role={stepTappable ? 'button' : undefined}
      tabIndex={stepTappable ? 0 : undefined}
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (!stepTappable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick();
        }
      }}
      className={`flex items-start gap-3 px-1 py-1 rounded-lg text-left ${stepTappable ? 'transition-transform active:scale-[0.99] cursor-pointer' : ''}`}
      style={{
        background: stepTappable ? hexToRgba(SUNRISE.rise2, 0.04) : 'transparent',
        border: stepTappable
          ? `1px solid ${hexToRgba(SUNRISE.rise2, 0.1)}`
          : '1px solid transparent',
      }}
    >
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px]"
        style={{
          background: hexToRgba(SUNRISE.rise2, 0.14),
          color: SUNRISE.rise2,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
        }}
      >
        {index + 1}
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
            {rotationCategory && ` · ${CATEGORY_LABEL[rotationCategory]}`}
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
      {showLogButton && (
        <button
          type="button"
          onClick={onLogClick}
          aria-pressed={logged}
          aria-label={logged ? 'Aplicación registrada' : 'Marcar como aplicado'}
          title={logged ? 'Registrado' : 'Marcar como aplicado'}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-transform active:scale-[0.95] self-center"
          style={{
            background: logged
              ? SUNRISE.rise2
              : hexToRgba(SUNRISE.rise2, 0.06),
            border: `1px solid ${
              logged ? SUNRISE.rise2 : hexToRgba(SUNRISE.rise2, 0.3)
            }`,
            color: logged ? SUNRISE.night : SUNRISE.rise2,
          }}
        >
          <Check size={11} strokeWidth={2.4} />
          <span
            className="font-mono uppercase tracking-[0.2em] font-[600]"
            style={{ fontSize: 9 }}
          >
            {logged ? 'hecho' : 'apliqué'}
          </span>
        </button>
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
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full overflow-hidden flex transition-transform active:scale-[0.995]"
        style={{
          borderRadius: 22,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        }}
      >
        {/* LEFT · dark glass · info */}
        <div
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
          style={{
            padding: '14px 16px',
            background: hexToRgba(SUNRISE.night, 0.55),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.16),
              color: SUNRISE.rise2,
            }}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-headline font-[600] text-[18px] leading-tight lowercase tracking-[-0.02em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              {label.toLowerCase()}
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
        </div>
        {/* RIGHT · dorado · chevron */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 64,
            background: SUNRISE.rise2,
            color: SUNRISE.night,
          }}
        >
          <ChevronDown
            size={20}
            strokeWidth={2.5}
            style={{
              color: SUNRISE.night,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 220ms',
            }}
          />
        </div>
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
