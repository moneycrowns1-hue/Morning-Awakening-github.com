// ═══════════════════════════════════════════════════════════
// subRoutines.ts · contextos disparables que MODULAN la rutina
//
// Una sub-rutina describe un "estado del día" (post-gym, sol
// fuerte, dormí mal, evento esta noche…). Cada una declara:
//   · triggers.auto(ctx) → predicado puro sobre signals/clima/health
//   · triggers.manual    → habilita el chip-row del usuario
//   · inject(ctx)        → CoachAction[] extra a fusionar al briefing
//   · rationale(ctx)     → línea humana para el insights drawer
//
// El motor las recorre todas, evalúa triggers y suma los outputs.
// No reescribe la rutina base — solo agrega acciones, anota
// rationale, y opcionalmente sube prioridad de habits existentes.
// ═══════════════════════════════════════════════════════════

import type { ResolvedSignals } from './signals';
import type { ClimateContext } from '../common/climateEC';
import type { DerivedHealthSignals } from './healthSignals';
import type { CoachAction, Urgency } from './coachEngine';
import type { Priority, Domain } from './criticalHabits';

// ─── IDs ────────────────────────────────────────────────────

export type SubRoutineId =
  | 'pre_gym'
  | 'post_gym'
  | 'high_uv'
  | 'cold_dry'
  | 'humid_warm'
  | 'travel_altitude'
  | 'event_eve'
  | 'poor_sleep'
  | 'high_stress'
  | 'micro_flare';

// ─── Manual activation persistence ──────────────────────────

export interface ManualSubRoutine {
  id: SubRoutineId;
  /** ISO datetime cuando el usuario lo activó. */
  activatedAtISO: string;
  /** Time-to-live en horas desde activatedAt. */
  ttlH: number;
}

/** Devuelve solo los manuales aún vigentes. */
export function activeManualIds(
  manual: ManualSubRoutine[],
  now: Date = new Date(),
): Set<SubRoutineId> {
  const out = new Set<SubRoutineId>();
  for (const m of manual) {
    const start = new Date(m.activatedAtISO).getTime();
    if (Number.isNaN(start)) continue;
    const end = start + m.ttlH * 60 * 60 * 1000;
    if (now.getTime() <= end) out.add(m.id);
  }
  return out;
}

// ─── Context passed to every sub-routine ────────────────────

export interface SubRoutineCtx {
  now: Date;
  signals: ResolvedSignals;
  climate: ClimateContext;
  health: DerivedHealthSignals;
  /** ¿Hay flare en curso? — el motor evita stackear contextos durante un brote. */
  flareActive: boolean;
  /** IDs activadas manualmente por el usuario y aún vigentes. */
  manualActive: Set<SubRoutineId>;
}

// ─── Definition ─────────────────────────────────────────────

export interface SubRoutine {
  id: SubRoutineId;
  /** Texto del chip + label en UI. */
  label: string;
  /** Pista corta cuando se muestra en chip-row. */
  hint: string;
  /** Dominio para tinta del chip. */
  domain: Domain;
  /** Para sub-rutinas manuales, cuántas horas dura su efecto. */
  ttlH: number;
  /** Si está disponible para activación manual. */
  manualEnabled: boolean;
  /** Predicado de auto-trigger (puro). `false` si solo manual. */
  auto: (ctx: SubRoutineCtx) => boolean;
  /** Acciones extra a inyectar cuando esta sub-rutina está activa. */
  inject: (ctx: SubRoutineCtx) => CoachAction[];
  /** Línea legible para el rationale[] del briefing. */
  rationale: (ctx: SubRoutineCtx) => string;
}

// ─── Helpers ────────────────────────────────────────────────

const action = (
  id: string,
  title: string,
  reason: string,
  opts: {
    priority?: Priority;
    urgency?: Urgency;
    domain?: Domain | 'skin';
    kind?: CoachAction['kind'];
  } = {},
): CoachAction => ({
  id,
  kind: opts.kind ?? 'breathing',
  title,
  reason,
  priority: opts.priority ?? 'high',
  urgency: opts.urgency ?? 'today',
  domain: opts.domain ?? 'mind_body',
});

// ─── Catalog ────────────────────────────────────────────────

export const SUB_ROUTINES: SubRoutine[] = [
  // ── pre_gym (manual) ─────────────────────────────────────
  {
    id: 'pre_gym',
    label: 'voy al gym',
    hint: 'piel fresca · sin oclusivos pesados',
    domain: 'skin',
    ttlH: 3,
    manualEnabled: true,
    auto: () => false,
    inject: () => [
      action(
        'sub_pregym_cleanse',
        'Limpieza ligera antes del gym',
        'Quitar SPF y sebo previene poros tapados con sudor; no usar exfoliantes ahora.',
        { priority: 'high', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Pre-gym activado · evito oclusivos y exfoliantes ácidos antes del esfuerzo.',
  },

  // ── post_gym (auto si exerciseMin > 30) ───────────────────
  {
    id: 'post_gym',
    label: 'post-gym',
    hint: 'limpieza + agua termal + emoliente',
    domain: 'skin',
    ttlH: 2,
    manualEnabled: true,
    auto: (ctx) =>
      !!ctx.health.exerciseMinToday && ctx.health.exerciseMinToday >= 30,
    inject: (ctx) => {
      const out: CoachAction[] = [
        action(
          'sub_postgym_cleanse',
          'Limpieza post-entreno',
          'El sudor + sebo retenido en pliegues es caldo de cultivo para pústulas y dermatitis seborreica.',
          { priority: 'high', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
        ),
        action(
          'sub_postgym_thermal',
          'Agua termal · selladora',
          'Calma microinflamación post-esfuerzo y baja el "calor" en piel atópica.',
          { priority: 'medium', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
        ),
      ];
      if (ctx.climate.uvLabel === 'high' && ctx.now.getHours() < 17) {
        out.push(
          action(
            'sub_postgym_spf_reapply',
            'Re-aplicar SPF',
            'El sudor desplaza el fotoprotector — re-aplica si vas a seguir al sol.',
            { priority: 'high', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
          ),
        );
      }
      return out;
    },
    rationale: (ctx) =>
      ctx.manualActive.has('post_gym')
        ? 'Post-gym manual: limpieza + agua termal + emoliente al volver.'
        : `Post-gym auto · detecté ${ctx.health.exerciseMinToday} min de ejercicio hoy en Apple Fitness.`,
  },

  // ── high_uv (auto: 10-15h + uvLabel=high) ────────────────
  {
    id: 'high_uv',
    label: 'sol fuerte',
    hint: 'SPF cada 2 h · labio + cuello',
    domain: 'skin',
    ttlH: 3,
    manualEnabled: true,
    auto: (ctx) =>
      ctx.climate.uvLabel === 'high' &&
      ctx.now.getHours() >= 10 &&
      ctx.now.getHours() < 15,
    inject: () => [
      action(
        'sub_highuv_reapply',
        'Re-aplicar SPF (UV pico)',
        'En franja 10–15 h en Quito el UV es alto; sin reaplicar, la protección efectiva cae a la mitad.',
        { priority: 'critical', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
      ),
      action(
        'sub_highuv_lip',
        'Bálsamo labial con SPF',
        'El labio no produce melanina suficiente y es zona de queilitis actínica si se descuida.',
        { priority: 'medium', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Sol fuerte (UV alto + hora pico) · reaplico SPF y cubro labio + cuello.',
  },

  // ── cold_dry (auto: humedad seca + banda fría) ───────────
  {
    id: 'cold_dry',
    label: 'frío + seco',
    hint: 'oclusivo extra · evita agua caliente',
    domain: 'skin',
    ttlH: 6,
    manualEnabled: false,
    auto: (ctx) =>
      ctx.climate.humidity === 'dry' && ctx.climate.band === 'cold',
    inject: () => [
      action(
        'sub_colddry_occlusive',
        'Sello oclusivo extra',
        'En frío seco la TEWL aumenta — un oclusivo fino sobre el humectante reduce pérdida de agua nocturna.',
        { priority: 'high', urgency: 'tonight', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Frío + seco · agrego sello oclusivo fino para frenar pérdida de agua transepidérmica.',
  },

  // ── humid_warm (auto: húmedo + UV alto) ──────────────────
  {
    id: 'humid_warm',
    label: 'húmedo + UV',
    hint: 'texturas ligeras · doble sello no',
    domain: 'skin',
    ttlH: 3,
    manualEnabled: false,
    auto: (ctx) =>
      ctx.climate.humidity === 'humid' && ctx.climate.uvLabel === 'high',
    inject: () => [
      action(
        'sub_humid_light',
        'Capas finas · evitar oclusión',
        'Con humedad alta, doble sello atrapa sudor y favorece foliculitis: prefiere gel-cream + SPF fluido.',
        { priority: 'medium', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Ambiente húmedo + UV alto · prefiero capas finas y SPF fluido.',
  },

  // ── travel_altitude (manual) ─────────────────────────────
  {
    id: 'travel_altitude',
    label: 'viaje',
    hint: '+agua · emoliente extra · labio',
    domain: 'hydration',
    ttlH: 24,
    manualEnabled: true,
    auto: () => false,
    inject: () => [
      action(
        'sub_travel_water',
        '+500 ml de agua hoy',
        'Vuelos y altitud aceleran la deshidratación; sumar 0.5 L sostiene la barrera.',
        { priority: 'high', urgency: 'today', domain: 'hydration', kind: 'water' },
      ),
      action(
        'sub_travel_emollient',
        'Emoliente rico antes de dormir',
        'Aire seco de cabina/altitud reseca; un sello rico previene picazón nocturna.',
        { priority: 'high', urgency: 'tonight', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Modo viaje · subo hidratación, sello rico de noche y bálsamo labial.',
  },

  // ── event_eve (manual: gala/evento esta noche) ────────────
  {
    id: 'event_eve',
    label: 'evento esta noche',
    hint: 'rutina suave · máx hidratación',
    domain: 'skin',
    ttlH: 18,
    manualEnabled: true,
    auto: () => false,
    inject: () => [
      action(
        'sub_event_no_actives',
        'Sin activos hoy',
        'Antes de un evento, evita ácidos/retinoides que pueden provocar enrojecimiento o descamación inesperada.',
        { priority: 'high', urgency: 'today', domain: 'skin', kind: 'skincare_routine' },
      ),
      action(
        'sub_event_hydration',
        'Hidratación máxima · capa por capa',
        'Esencias + serum humectante + sello fino dejan piel luminosa sin grasa visible.',
        { priority: 'medium', urgency: 'tonight', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Evento esta noche · rutina suave, sin activos, hidratación máxima.',
  },

  // ── poor_sleep (auto: dormiste mal o deuda alta) ─────────
  {
    id: 'poor_sleep',
    label: 'dormí mal',
    hint: 'respiración + meditación al frente',
    domain: 'mind_body',
    ttlH: 8,
    manualEnabled: true,
    auto: (ctx) =>
      ctx.health.sleepLastNight === 'poor' ||
      ctx.health.sleepDebtMin >= 120 ||
      ctx.signals.sleep === 'poor',
    inject: (ctx) => {
      const min = ctx.health.sleepLastNightMin;
      const minLabel = min ? ` (${Math.floor(min / 60)} h ${min % 60} m)` : '';
      return [
        action(
          'sub_poorsleep_breath',
          `Respiración 5 min${minLabel}`,
          'Dormiste poco: 5 min de respiración diafragmática bajan cortisol basal y reducen tensión mandibular.',
          { priority: 'high', urgency: 'now', domain: 'mind_body', kind: 'breathing' },
        ),
      ];
    },
    rationale: (ctx) => {
      if (ctx.health.sleepLastNight === 'poor' && ctx.health.sleepLastNightMin) {
        const m = ctx.health.sleepLastNightMin;
        return `Dormí mal · ${Math.floor(m / 60)} h ${m % 60} m según Apple Health → priorizo respiración + meditación.`;
      }
      if (ctx.health.sleepDebtMin >= 120) {
        return `Deuda de sueño alta (${Math.round(ctx.health.sleepDebtMin / 60)} h en 7 días) → recovery prioritario.`;
      }
      return 'Sueño pobre marcado en check-in → respiración y meditación suben.';
    },
  },

  // ── high_stress (auto: signals.stress = high) ────────────
  {
    id: 'high_stress',
    label: 'estrés alto',
    hint: 'bruxism crítico · 4-7-8',
    domain: 'mind_body',
    ttlH: 6,
    manualEnabled: true,
    auto: (ctx) => ctx.signals.stress === 'high',
    inject: (ctx) => {
      const h = ctx.now.getHours();
      return [
        action(
          'sub_stress_478',
          'Respiración 4-7-8 · 3 ciclos',
          'Activa el parasimpático y descomprime mandíbula en menos de 2 min.',
          {
            priority: h >= 20 ? 'critical' : 'high',
            urgency: h >= 20 ? 'tonight' : 'now',
            domain: 'mind_body',
            kind: 'breathing',
          },
        ),
      ];
    },
    rationale: () => 'Estrés alto · 4-7-8 + bruxism a crítico, mandíbula vigilada.',
  },

  // ── micro_flare (auto: skinFeel reactiva) ─────────────────
  {
    id: 'micro_flare',
    label: 'piel reactiva',
    hint: 'sin activos · solo calmar',
    domain: 'skin',
    ttlH: 12,
    manualEnabled: false,
    auto: (ctx) =>
      !ctx.flareActive &&
      (ctx.signals.skinFeel === 'red' ||
        ctx.signals.skinFeel === 'itchy' ||
        ctx.signals.skinFeel === 'stinging'),
    inject: () => [
      action(
        'sub_microflare_thermal',
        'Agua termal + Cicalfate',
        'Capa fina sobre la zona reactiva, sin frotar — calma sin ocluir activos irritantes.',
        { priority: 'high', urgency: 'now', domain: 'skin', kind: 'skincare_routine' },
      ),
    ],
    rationale: () => 'Micro-flare · sin activos hoy, solo calmantes hasta que pase la reactividad.',
  },
];

// ─── Map for quick lookup ───────────────────────────────────

export const SUB_ROUTINE_BY_ID: Record<SubRoutineId, SubRoutine> = SUB_ROUTINES
  .reduce((acc, sr) => {
    acc[sr.id] = sr;
    return acc;
  }, {} as Record<SubRoutineId, SubRoutine>);

/**
 * Recorre todas las sub-rutinas y devuelve las que están activas
 * (auto-disparadas o manualmente activas).
 */
export function evaluateSubRoutines(ctx: SubRoutineCtx): SubRoutine[] {
  const out: SubRoutine[] = [];
  for (const sr of SUB_ROUTINES) {
    const auto = sr.auto(ctx);
    const manual = ctx.manualActive.has(sr.id);
    if (auto || manual) out.push(sr);
  }
  return out;
}
