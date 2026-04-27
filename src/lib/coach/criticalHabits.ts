// ═══════════════════════════════════════════════════════════
// criticalHabits.ts · hábitos críticos del usuario
//
// Capa declarativa de los hábitos NO-NEGOCIABLES que el coach
// va a vigilar todos los días. Cada hábito apunta a un `HabitId`
// (de `lib/common/habits.ts`) o a un nuevo ID que extendemos
// cuando hace falta. La prioridad la usa el coachEngine para
// ordenar el briefing.
//
// Resumen de lo dictado por el usuario:
//   1. Hidratación: 3 L de agua al día
//   2. Cepillado dental 3× (vacaciones) o 2× (facultad)
//   3. Bruxismo: ejercicios mañana + noche, respiración, meditación
//   4. Estrés: gestión activa para mejorar bruxismo y atopia
//
// La piel atópica empeora con estrés (eje HPA → cortisol → barrera
// deficiente; Choi 2005). Por eso el coach trata estrés y bruxismo
// como un mismo bloque "mind_body" que retroalimenta a la piel.
// ═══════════════════════════════════════════════════════════

export type CriticalHabitId =
  | 'water_3l'
  | 'brush_after_breakfast'
  | 'brush_after_lunch'
  | 'brush_after_snack'
  | 'brush_before_bed'
  | 'floss_daily'
  | 'mouthwash_daily'
  | 'bruxism_am'
  | 'bruxism_pm'
  | 'breathing_morning'
  | 'breathing_night'
  | 'meditation_daily';

export type Priority = 'critical' | 'high' | 'medium';

export type Domain = 'hydration' | 'oral' | 'mind_body' | 'skin';

export interface CriticalHabit {
  id: CriticalHabitId;
  label: string;
  domain: Domain;
  priority: Priority;
  /** Frecuencia por día (1, 2, 3) o `as_needed`. */
  perDay: number | 'as_needed';
  /** Slot temporal sugerido. */
  whenSuggested?: 'morning' | 'lunch' | 'snack' | 'evening' | 'night' | 'flexible';
  /** Por qué importa (lo que se mostrará al expandir). */
  why: string;
}

export const CRITICAL_HABITS: CriticalHabit[] = [
  {
    id: 'water_3l',
    label: 'Beber 3 L de agua',
    domain: 'hydration',
    priority: 'critical',
    perDay: 1,
    whenSuggested: 'flexible',
    why:
      'Hidratación sistémica sostiene barrera cutánea, salivación (anti-bruxismo) y función cognitiva. ' +
      '3 L cubre demanda en clima ecuatoriano + entrenamiento.',
  },

  // ── Cepillado · cada slot es un check independiente ──
  {
    id: 'brush_after_breakfast',
    label: 'Cepillado · post-desayuno',
    domain: 'oral',
    priority: 'critical',
    perDay: 1,
    whenSuggested: 'morning',
    why: '2 min · técnica de Bass. Esperar ≥ 30 min si hubo cítrico o jugo.',
  },
  {
    id: 'brush_after_lunch',
    label: 'Cepillado · post-almuerzo',
    domain: 'oral',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'lunch',
    why: '2 min. Disciplina del 3× durante vacaciones.',
  },
  {
    id: 'brush_after_snack',
    label: 'Cepillado · post-merienda',
    domain: 'oral',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'snack',
    why: '2 min. Si la merienda fue dulce, enjuagar con agua primero.',
  },
  {
    id: 'brush_before_bed',
    label: 'Cepillado nocturno (con hilo + Listerine)',
    domain: 'oral',
    priority: 'critical',
    perDay: 1,
    whenSuggested: 'night',
    why:
      'Hilo PRIMERO, cepillado 2 min, Listerine Cool Mint sin alcohol 30 s. ' +
      'El cepillado nocturno es el más importante (saliva baja durante la noche).',
  },
  {
    id: 'floss_daily',
    label: 'Hilo dental (≥ 1×/día)',
    domain: 'oral',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'night',
    why: 'Reduce placa interproximal y gingivitis. Antes del cepillado funciona mejor.',
  },
  {
    id: 'mouthwash_daily',
    label: 'Listerine sin alcohol',
    domain: 'oral',
    priority: 'medium',
    perDay: 1,
    whenSuggested: 'night',
    why: 'Antiplaca sin xerostomía. Apto para mucosa sensible/atópica.',
  },

  // ── Bruxismo y estrés (mind_body) ──
  {
    id: 'bruxism_am',
    label: 'Ejercicios de bruxismo · mañana',
    domain: 'mind_body',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'morning',
    why:
      'Liberación de músculos masetero y temporal al despertar previene tensión acumulada del día. ' +
      'Lobbezoo 2018: manejo conservador con ejercicios posturales reduce dolor mandibular.',
  },
  {
    id: 'bruxism_pm',
    label: 'Ejercicios de bruxismo · noche',
    domain: 'mind_body',
    priority: 'critical',
    perDay: 1,
    whenSuggested: 'night',
    why:
      'Bruxismo es predominantemente nocturno. Liberar mandíbula antes de dormir y separar conscientemente dientes ' +
      'reduce la frecuencia de episodios.',
  },
  {
    id: 'breathing_morning',
    label: 'Respiración · mañana',
    domain: 'mind_body',
    priority: 'medium',
    perDay: 1,
    whenSuggested: 'morning',
    why:
      'Respiración diafragmática 5 min activa parasimpático y baja cortisol basal (Goyal 2014). ' +
      'Cortisol elevado deteriora barrera atópica (Choi 2005).',
  },
  {
    id: 'breathing_night',
    label: 'Respiración · noche (4-7-8)',
    domain: 'mind_body',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'night',
    why: '4-7-8 facilita transición al sueño y reduce activación simpática previa a la cama.',
  },
  {
    id: 'meditation_daily',
    label: 'Meditación · 10-20 min',
    domain: 'mind_body',
    priority: 'high',
    perDay: 1,
    whenSuggested: 'flexible',
    why:
      'Meta-análisis Goyal 2014 (JAMA Intern Med): mindfulness reduce estrés con efecto moderado, ' +
      'lo que retroalimenta positivamente bruxismo y atopia.',
  },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function habitsByPriority(priority: Priority): CriticalHabit[] {
  return CRITICAL_HABITS.filter(h => h.priority === priority);
}

export function habitsByDomain(domain: Domain): CriticalHabit[] {
  return CRITICAL_HABITS.filter(h => h.domain === domain);
}

/** Suma simple de checks "críticos" del día — el coach lo muestra como meta. */
export const TOTAL_CRITICAL_PER_DAY = CRITICAL_HABITS.filter(h => h.priority === 'critical').length;
