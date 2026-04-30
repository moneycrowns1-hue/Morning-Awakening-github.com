'use client';

// ═══════════════════════════════════════════════════════════
// MorningCheckInPrompt · auto-encuesta de 3 ejes que aparece
// la PRIMERA vez que el usuario abre la app cada mañana.
//
// Sustituye al "saludo automático" inexistente: hasta que el
// puente con Apple Health / Fitness esté conectado, esta es la
// única vía para que los adapters (Génesis, Núcleo, ritualV2)
// reciban una señal real de cómo amaneciste.
//
// Triggers · todos deben cumplirse:
//   1. `appState === 'IDLE'` (no estamos en una sesión).
//   2. Hora local entre 04:00 y 11:00 (ventana matutina).
//   3. `loadCheckIn()` devuelve null (sin entrada para hoy).
//   4. Flag `ma-morning-checkin-shown-{YYYY-MM-DD}` ausente
//      (el usuario no lo cerró ya hoy).
//
// Persistencia: tap → `updateCheckIn({ ... })` en coach/state.
// Cierre: marca el flag para no re-aparecer hoy aunque el
// usuario haya saltado los chips. La siguiente check-in
// puede hacerla manualmente desde CoachScreen.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useAppTheme } from '@/lib/common/appTheme';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import {
  SKIN_FEEL_LABEL,
  SKIN_FEEL_ORDER,
  SLEEP_LABEL,
  SLEEP_ORDER,
  STRESS_LABEL,
  STRESS_ORDER,
  type SkinFeel,
  type Sleep,
  type Stress,
} from '@/lib/coach/signals';
import { updateCheckIn, todayISO } from '@/lib/coach/state';

const SHOWN_KEY_PREFIX = 'ma-morning-checkin-shown-';

interface MorningCheckInPromptProps {
  onDone: () => void;
}

/** Marca el prompt como mostrado hoy (no volverá a aparecer). */
function markShownToday(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${SHOWN_KEY_PREFIX}${todayISO()}`, '1');
  } catch { /* ignore */ }
}

/** ¿Debería mostrarse el prompt ahora mismo? Llamado desde el padre. */
export function shouldShowMorningCheckIn(now: Date = new Date()): boolean {
  if (typeof window === 'undefined') return false;
  const hour = now.getHours();
  if (hour < 4 || hour >= 11) return false;
  try {
    const flag = window.localStorage.getItem(`${SHOWN_KEY_PREFIX}${todayISO(now)}`);
    if (flag) return false;
    // No re-preguntar si ya hay check-in del día (usuario lo hizo
    // desde CoachScreen antes que acá).
    const checkInRaw = window.localStorage.getItem('ma-coach-checkin');
    if (checkInRaw) {
      try {
        const parsed = JSON.parse(checkInRaw);
        if (parsed?.dateISO === todayISO(now)) {
          if (parsed.skinFeel || parsed.sleep || parsed.stress) return false;
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return true;
}

export default function MorningCheckInPrompt({ onDone }: MorningCheckInPromptProps) {
  const { day: D, dayText: DT } = useAppTheme();
  const [sleep, setSleep] = useState<Sleep | null>(null);
  const [stress, setStress] = useState<Stress | null>(null);
  const [skin, setSkin] = useState<SkinFeel | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'antes del amanecer';
    if (h < 9) return 'amanecer';
    return 'mañana';
  }, []);

  const handleClose = () => {
    haptics.tap();
    markShownToday();
    onDone();
  };

  const handleSubmit = () => {
    haptics.tick();
    const patch: { sleep?: Sleep; stress?: Stress; skinFeel?: SkinFeel } = {};
    if (sleep) patch.sleep = sleep;
    if (stress) patch.stress = stress;
    if (skin) patch.skinFeel = skin;
    if (Object.keys(patch).length > 0) {
      updateCheckIn(patch);
    }
    markShownToday();
    onDone();
  };

  const hasAnySelection = sleep !== null || stress !== null || skin !== null;

  return (
    <div
      className="fixed inset-0 z-[70] w-full h-full flex flex-col"
      style={{ background: D.paper, color: DT.primary }}
    >
      {/* Background tints (matching Welcome / Nucleus editorial) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(D.accent, 0.18)} 0%, transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(D.tint_strong, 0.30)} 0%, transparent 45%)`,
        }}
      />

      {/* ─── Header ─────────────────────────────────────── */}
      <div
        className="relative z-10 px-5 md:px-8 max-w-3xl w-full mx-auto shrink-0 sunrise-fade-up"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: D.accent,
                borderRadius: 99,
                boxShadow: `0 0 6px ${hexToRgba(D.accent, 0.7)}`,
              }}
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[600]"
              style={{ color: DT.muted, fontSize: 9 }}
            >
              check-in · {greeting}
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Saltar"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ color: DT.muted }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="relative h-[1px]" style={{ background: hexToRgba(D.accent, 0.14) }}>
          <div className="absolute inset-y-0 left-0 w-1/3" style={{ background: D.accent }} />
        </div>
      </div>

      {/* ─── Body (scroll) ──────────────────────────────────── */}
      <div
        className="scroll-area flex-1 relative z-10 min-h-0 w-full overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="px-5 md:px-8 max-w-3xl mx-auto">
          {/* Hero */}
          <h1
            className="font-headline font-[700] lowercase tracking-[-0.045em] mt-6 sunrise-fade-up"
            style={{
              color: DT.primary,
              fontSize: 'clamp(2.2rem, 8.5vw, 3.6rem)',
              lineHeight: 0.92,
              animationDelay: '60ms',
            }}
          >
            ¿cómo<br />amaneciste<span style={{ color: D.accent }}>?</span>
          </h1>
          <p
            className="mt-3 font-mono lowercase tracking-[0.05em] sunrise-fade-up"
            style={{ color: DT.soft, fontSize: 12, animationDelay: '120ms' }}
          >
            tres taps. el coach calibra Génesis y Núcleo con tu respuesta · <span style={{ color: DT.muted }}>opcional · puedes saltar</span>
          </p>

          {/* ── Sueño ────────────────────────────────────── */}
          <Section
            label="sueño"
            description="cómo dormiste anoche"
            D={D}
            DT={DT}
            delay={200}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {SLEEP_ORDER.map((s) => (
                <Chip
                  key={s}
                  active={sleep === s}
                  onClick={() => { haptics.tap(); setSleep(s); }}
                  D={D}
                  DT={DT}
                >
                  {SLEEP_LABEL[s]}
                </Chip>
              ))}
            </div>
          </Section>

          {/* ── Estrés ───────────────────────────────────── */}
          <Section
            label="estrés"
            description="tensión o calma al despertar"
            D={D}
            DT={DT}
            delay={280}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {STRESS_ORDER.map((s) => (
                <Chip
                  key={s}
                  active={stress === s}
                  onClick={() => { haptics.tap(); setStress(s); }}
                  D={D}
                  DT={DT}
                >
                  {STRESS_LABEL[s]}
                </Chip>
              ))}
            </div>
          </Section>

          {/* ── Piel ──────────────────────────────────────── */}
          <Section
            label="piel"
            description="señal del rostro al levantarte"
            D={D}
            DT={DT}
            delay={360}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {SKIN_FEEL_ORDER.map((s) => (
                <Chip
                  key={s}
                  active={skin === s}
                  onClick={() => { haptics.tap(); setSkin(s); }}
                  D={D}
                  DT={DT}
                >
                  {SKIN_FEEL_LABEL[s]}
                </Chip>
              ))}
            </div>
          </Section>

          {/* ── CTA ───────────────────────────────────────── */}
          <div
            className="mt-7 flex items-center gap-3 sunrise-fade-up"
            style={{ animationDelay: '440ms' }}
          >
            <button
              onClick={handleSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full transition-transform active:scale-[0.97]"
              style={{
                padding: '13px 19px',
                background: hasAnySelection ? D.accent : hexToRgba(D.accent, 0.22),
                color: hasAnySelection ? D.paper : DT.muted,
                border: `1px solid ${hasAnySelection ? D.accent : hexToRgba(D.accent, 0.32)}`,
              }}
            >
              <span
                className="font-mono uppercase tracking-[0.32em] font-[700]"
                style={{ fontSize: 10 }}
              >
                {hasAnySelection ? 'guardar y continuar' : 'continuar sin marcar'}
              </span>
              <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          </div>

          <div
            className="mt-4 font-mono lowercase tracking-[0.04em] sunrise-fade-up"
            style={{ color: DT.muted, fontSize: 10.5, animationDelay: '500ms' }}
          >
            · esto reemplaza al saludo automático hasta que conectes Apple Health.
            cuando enlaces el puente, el coach detectará sueño y HRV directo desde el reloj.
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Sub-componentes locales
// ───────────────────────────────────────────────────────────

interface SectionProps {
  label: string;
  description: string;
  children: React.ReactNode;
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
  delay: number;
}

function Section({ label, description, children, D, DT, delay }: SectionProps) {
  return (
    <div
      className="mt-7 sunrise-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-baseline justify-between mb-2.5">
        <span
          className="font-mono uppercase tracking-[0.34em] font-[700]"
          style={{ color: D.accent, fontSize: 10 }}
        >
          {label}
        </span>
        <span
          className="font-mono lowercase tracking-[0.04em]"
          style={{ color: DT.muted, fontSize: 10 }}
        >
          {description}
        </span>
      </div>
      {children}
    </div>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  D: ReturnType<typeof useAppTheme>['day'];
  DT: ReturnType<typeof useAppTheme>['dayText'];
}

function Chip({ active, onClick, children, D, DT }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className="font-mono uppercase tracking-[0.28em] font-[700] transition-opacity active:opacity-70"
      style={{
        padding: '7px 13px',
        borderRadius: 99,
        fontSize: 10,
        background: active ? D.accent : 'transparent',
        border: `1px solid ${active ? D.accent : hexToRgba(D.accent, 0.22)}`,
        color: active ? D.paper : DT.soft,
      }}
    >
      {children}
    </button>
  );
}
