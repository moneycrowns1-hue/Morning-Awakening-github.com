// ═══════════════════════════════════════════════════════════
// wellnessRoutines · datos de las rutinas guiadas del Hub
// Bienestar (bruxismo, meditación profunda, drenaje linfático).
//
// Cada rutina es una lista de pasos temporizados. Los sub-screens
// las consumen y orquestan el countdown / pulso visual.
// ═══════════════════════════════════════════════════════════

import type { HabitId } from '../common/habits';

export type WellnessCue =
  | 'inhale'
  | 'exhale'
  | 'hold'
  | 'massage'
  | 'stretch'
  | 'rest'
  | 'tap';

export interface WellnessStep {
  id: string;
  /** Short label, e.g. "Drop mandibular". */
  label: string;
  /** Concrete instruction (1–2 lines). */
  description: string;
  /** Seconds. */
  durationSec: number;
  /** Visual cue used by the runner to drive the pulse animation. */
  cue?: WellnessCue;
  /** Optional secondary tip rendered in muted text. */
  tip?: string;
}

export type WellnessRoutineId = 'bruxism' | 'deep_meditation' | 'lymphatic_facial';

export interface WellnessRoutine {
  id: WellnessRoutineId;
  /** Title shown in the hub card. */
  title: string;
  /** "Mandíbula libre · 8 min". */
  kicker: string;
  /** Lucide icon name for the hub card. */
  icon: string;
  /** Habit id marked when the routine completes. */
  habitId: HabitId;
  /** Physiology / neuroscience rationale (rendered as expandable). */
  scienceNote: string;
  /** Steps, in order. */
  steps: WellnessStep[];
}

// ─── A. Bruxismo + estrés (8 min) ───────────────────────────
const BRUXISM_STEPS: WellnessStep[] = [
  {
    id: 'jaw_reset',
    label: 'Reset mandibular',
    description:
      'Labios cerrados, dientes ligeramente separados, lengua apoyada en el paladar tras los incisivos. Respiración nasal lenta y profunda.',
    durationSec: 90,
    cue: 'inhale',
    tip: 'Esta es la posición de reposo correcta — entréñala todos los días.',
  },
  {
    id: 'masseter_massage',
    label: 'Auto-masaje del masetero',
    description:
      'Yemas de los dedos sobre el músculo de la mejilla (donde aprietas al masticar). Círculos firmes y lentos en ambos lados. Abre y cierra la boca despacio entre series.',
    durationSec: 120,
    cue: 'massage',
    tip: 'Si encuentras un punto que duele, mantén presión sostenida 10 s.',
  },
  {
    id: 'pterygoid_temporal',
    label: 'Pterigoideo + temporal',
    description:
      '60 s: dedo limpio dentro de la boca, presiona el pterigoideo medial (tras la última muela superior). 60 s: yemas en los temporales (encima de las orejas), círculos amplios.',
    durationSec: 120,
    cue: 'massage',
    tip: 'El pterigoideo es el músculo más oculto y suele ser el más tenso.',
  },
  {
    id: 'down_regulation_breathing',
    label: 'Respiración 4-6 calmante',
    description:
      'Inhala 4 s por la nariz. Exhala 6 s por la boca con un suspiro suave. Mandíbula colgando, hombros bajos, lengua arriba.',
    durationSec: 120,
    cue: 'exhale',
    tip: 'Exhalación más larga que inhalación = parasimpático activo.',
  },
];

// ─── B. Meditación profunda (genérica · duración variable) ──
//
// Para meditación, los "steps" son hitos relativos. El runner
// ajusta `durationSec` proporcionalmente al total elegido por el
// usuario (10 / 15 / 20 min) usando los pesos definidos abajo.
//
// El modo (mindfulness / body_scan / metta) sustituye solo la
// fase central (`practice`); apertura y cierre son comunes.

export type DeepMeditationMode = 'mindfulness' | 'body_scan' | 'metta';

export interface DeepMeditationModeContent {
  id: DeepMeditationMode;
  title: string;
  shortLabel: string;
  description: string;
  /** Practice milestones for the central phase. Rendered with
   *  proportional durations relative to total time. */
  milestones: { id: string; label: string; description: string; weight: number }[];
}

export const DEEP_MEDITATION_MODES: Record<DeepMeditationMode, DeepMeditationModeContent> = {
  mindfulness: {
    id: 'mindfulness',
    title: 'Mindfulness · Foco en la respiración',
    shortLabel: 'Mindfulness',
    description:
      'Ancla en la respiración nasal. Cuando aparezca un pensamiento, etiquétalo como "pensando" y vuelve al ancla, sin juicio.',
    milestones: [
      { id: 'anchor', label: 'Ancla en la respiración', description: 'Siente solo el aire entrando y saliendo por la nariz.', weight: 0.4 },
      { id: 'label', label: 'Etiquetar pensamientos', description: 'Cuando llegue un pensamiento, di "pensando" en silencio. Vuelve al aire.', weight: 0.4 },
      { id: 'open',  label: 'Conciencia abierta',      description: 'Sin objeto fijo. Lo que aparece, aparece. Sin perseguirlo.', weight: 0.2 },
    ],
  },
  body_scan: {
    id: 'body_scan',
    title: 'Body scan · Barrido corporal',
    shortLabel: 'Body scan',
    description:
      'Recorre el cuerpo de cabeza a pies. En cada zona, exhala y suelta la tensión que encuentres ahí.',
    milestones: [
      { id: 'head_neck', label: 'Cabeza y cuello',     description: 'Cráneo, frente, mandíbula, cuello. Suelta al exhalar.', weight: 0.25 },
      { id: 'torso',     label: 'Torso',               description: 'Hombros, pecho, espalda, abdomen.', weight: 0.3 },
      { id: 'arms',      label: 'Brazos y manos',      description: 'Brazos, codos, antebrazos, manos.', weight: 0.2 },
      { id: 'legs',      label: 'Piernas y pies',      description: 'Caderas, muslos, rodillas, pantorrillas, pies.', weight: 0.25 },
    ],
  },
  metta: {
    id: 'metta',
    title: 'Metta · Bondad amorosa',
    shortLabel: 'Metta',
    description:
      'Repite en silencio: "Que esté en paz · Que esté seguro · Que esté sano · Que viva con facilidad". Cuatro destinatarios.',
    milestones: [
      { id: 'self',     label: 'Hacia ti mismo',          description: 'Visualízate. Repite las cuatro frases.', weight: 0.25 },
      { id: 'loved',    label: 'Ser querido',             description: 'Alguien que amas. Repite las frases dirigidas a esa persona.', weight: 0.25 },
      { id: 'neutral',  label: 'Persona neutral',         description: 'Alguien que apenas conoces. Mismas frases.', weight: 0.25 },
      { id: 'difficult', label: 'Persona difícil',        description: 'Alguien con quien tienes fricción. Mismas frases — el ejercicio es para ti.', weight: 0.25 },
    ],
  },
};

/** Build the step list for a Deep Meditation session of given mode and total minutes. */
export function buildDeepMeditationRoutine(
  mode: DeepMeditationMode,
  totalMin: 10 | 15 | 20,
): WellnessRoutine {
  const totalSec = totalMin * 60;
  const openingSec = 60;
  const closingSec = 90;
  const practiceSec = Math.max(60, totalSec - openingSec - closingSec);

  const modeContent = DEEP_MEDITATION_MODES[mode];
  const milestoneSteps: WellnessStep[] = modeContent.milestones.map((m, idx) => ({
    id: `practice_${m.id}`,
    label: `${idx + 1}. ${m.label}`,
    description: m.description,
    durationSec: Math.round(practiceSec * m.weight),
    cue: 'rest',
  }));

  return {
    id: 'deep_meditation',
    title: modeContent.title,
    kicker: `${modeContent.shortLabel} · ${totalMin} min`,
    icon: 'Brain',
    habitId: 'deep_meditation',
    scienceNote:
      '12 minutos diarios de meditación durante 8 semanas reducen la activación de la amígdala ~22 % y aumentan la densidad de materia gris en el hipocampo (Hölzel et al., 2011). Alternar modos previene la habituación y entrena distintos circuitos atencionales.',
    steps: [
      {
        id: 'opening',
        label: 'Apertura',
        description: 'Postura recta. Ojos cerrados. Tres respiraciones profundas. Define una intención breve para esta práctica.',
        durationSec: openingSec,
        cue: 'inhale',
      },
      ...milestoneSteps,
      {
        id: 'closing',
        label: 'Cierre',
        description: 'Expande la conciencia: sonidos del entorno, sensación del cuerpo en el asiento. Lleva esta calma al día. Abre los ojos despacio.',
        durationSec: closingSec,
        cue: 'rest',
        tip: 'No te apures al levantarte. La transición es parte de la práctica.',
      },
    ],
  };
}

// ─── C. Drenaje linfático facial (10 min · 7 pasos) ─────────
const LYMPHATIC_STEPS: WellnessStep[] = [
  {
    id: 'cervical_open',
    label: 'Apertura cervical',
    description:
      'Palmas planas en el cuello. Desliza desde la mandíbula hacia las clavículas, ambos lados. Respiración profunda — abre la cisterna de Pecquet.',
    durationSec: 60,
    cue: 'stretch',
    tip: 'Siempre empieza por aquí. Es el "drenaje" donde todo va a parar.',
  },
  {
    id: 'submental',
    label: 'Drenaje submentoniano',
    description:
      'Bajo la mandíbula, desliza desde el centro del mentón hacia los lóbulos de las orejas. Presión muy ligera — peso de un dedo.',
    durationSec: 90,
    cue: 'tap',
  },
  {
    id: 'mouth_to_ears',
    label: 'Boca → orejas',
    description:
      'Comisura labial deslizada hacia los lóbulos. Reduce hinchazón de mejillas inferiores.',
    durationSec: 90,
    cue: 'tap',
  },
  {
    id: 'cheekbones_eyes',
    label: 'Pómulos y zona ocular',
    description:
      'Toques desde el ala nasal hacia las sienes. Bajo el ojo solo con dedo anular, peso pluma, hacia la sien.',
    durationSec: 120,
    cue: 'tap',
    tip: 'La zona del ojo es la más delicada — cero arrastre, solo toques.',
  },
  {
    id: 'forehead_temples',
    label: 'Frente → sienes',
    description:
      'Desde el entrecejo hacia las sienes, ambos lados. Borra arrugas de tensión.',
    durationSec: 90,
    cue: 'stretch',
  },
  {
    id: 'cervical_close',
    label: 'Cierre cervical',
    description:
      'Repite el drenaje del cuello para vaciar lo movilizado: mandíbula → clavículas, ambos lados.',
    durationSec: 90,
    cue: 'stretch',
  },
  {
    id: 'diaphragm_breath',
    label: 'Respiración diafragmática',
    description:
      '6 respiraciones profundas. El diafragma es la bomba linfática torácica. Sin él, todo lo movilizado se queda atrás.',
    durationSec: 60,
    cue: 'inhale',
  },
];

// ─── Routine registry ───────────────────────────────────────

export const WELLNESS_ROUTINES: Record<Exclude<WellnessRoutineId, 'deep_meditation'>, WellnessRoutine> = {
  bruxism: {
    id: 'bruxism',
    title: 'Bruxismo + estrés',
    kicker: 'Mandíbula libre · 8 min',
    icon: 'Smile',
    habitId: 'bruxism_exercise',
    scienceNote:
      'El bruxismo es ~80 % gestión emocional residual. Reentrenar la posición de reposo (lengua arriba, dientes separados, labios cerrados) durante 8 min al día reprograma el patrón motor en ~3 semanas. Inhalación corta + exhalación larga activa el sistema parasimpático (Brown & Gerbarg, 2005).',
    steps: BRUXISM_STEPS,
  },
  lymphatic_facial: {
    id: 'lymphatic_facial',
    title: 'Drenaje linfático facial',
    kicker: 'Anti-retención · 10 min',
    icon: 'Droplet',
    habitId: 'lymphatic_facial',
    scienceNote:
      'El sistema linfático no tiene bomba propia: depende del movimiento muscular y la respiración diafragmática. La "cara hinchada matutina" es 60–70 % linfa estancada por dormir horizontal. 10 minutos de drenaje direccional matutino reducen edema periorbital y subcutáneo de forma medible.',
    steps: LYMPHATIC_STEPS,
  },
};

/** Total seconds of a routine. */
export function getRoutineDuration(routine: WellnessRoutine): number {
  return routine.steps.reduce((acc, s) => acc + s.durationSec, 0);
}

/** Pretty "8 min" / "12 min" string. */
export function formatRoutineMinutes(routine: WellnessRoutine): string {
  const min = Math.round(getRoutineDuration(routine) / 60);
  return `${min} min`;
}
