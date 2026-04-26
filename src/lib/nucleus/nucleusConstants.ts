// ═══════════════════════════════════════════════════════════
// NUCLEUS · Day mode (6:50 AM → 6:00 PM)
//
// 6 macro-blocks that bridge the morning Génesis protocol and
// the night Términus protocol. Each block carries a narrative,
// a directive, scientific rationale, and a list of micro-habits
// that may fire either ONCE at a fixed time or RECURRING every
// N minutes inside a window.
//
// Schedule (Lun-Vie por defecto · sáb/dom: skipWeekend hace
// que ARENA y PRE_ARENA no disparen pings):
//
//   06:50 - 08:00 · PRE_ARENA · Fuerza Bruta Cognitiva
//   08:00 - 13:00 · ARENA     · Captura Académica
//   13:00 - 14:00 · RECARGA   · Almuerzo + NSDR
//   14:00 - 16:30 · MONOLITO  · Asimilación
//   16:30 - 17:45 · REFUGIO   · Desconexión Sagrada
//   17:45 - 18:00 · SINTESIS  · Cierre del escritorio
//   18:00         → TÉRMINUS (lanzamiento al protocolo nocturno)
// ═══════════════════════════════════════════════════════════

import type { HabitId } from '../common/habits';
import type { DayProfile } from '../common/dayProfile';

export type NucleusBlockId =
  | 'pre_arena'
  | 'arena'
  | 'recarga'
  | 'monolito'
  | 'refugio'
  | 'sintesis';

export type MicroHabitTrigger =
  | { kind: 'once'; atHHMM: string }
  | { kind: 'recurring'; everyMinutes: number; fromHHMM: string; untilHHMM: string };

export interface NucleusMicroHabit {
  id: string;
  label: string;
  description: string;
  /** Lucide icon name (resolved at runtime in the UI). */
  icon: string;
  trigger: MicroHabitTrigger;
  /** Notification body text when this habit fires as a push. */
  notifyBody: string;
  /** Connects to the unified habit tracker. */
  habitId: HabitId;
  /** Day profiles in which this micro-habit fires. When undefined,
   *  inherits the parent block's activeOn (or all profiles if the
   *  block doesn't restrict either). */
  activeOn?: DayProfile[];
}

export interface NucleusBlock {
  id: NucleusBlockId;
  codename: string;
  title: string;
  /** Decorative kanji used as watermark in the timeline. */
  kanji: string;
  /** Romanized reading + meaning. */
  kanjiReading: string;
  /** Lucide icon shown next to the codename. */
  icon: string;
  startHHMM: string;
  endHHMM: string;
  /** First-person contemplative narrative shown when the block expands. */
  narrative: string;
  /** Concrete action verb-line. */
  directive: string;
  /** Scientific rationale (physiology / neuroscience). */
  scienceNote: string;
  /** Quick tactical tips. */
  tips: string[];
  microHabits: NucleusMicroHabit[];
  /** Day profiles in which this block is active. Blocks not active
   *  on the current profile are rendered dimmed in the timeline and
   *  produce no pings. When undefined, the block is active on every
   *  profile (workday + saturday + rest). */
  activeOn?: DayProfile[];
  /** Optional special action: launches an interactive sub-screen. */
  action?: 'nsdr';
}

export const NUCLEUS_BLOCKS: NucleusBlock[] = [
  // ─────────────────────────────────────────────────────────
  {
    id: 'pre_arena',
    codename: 'PRE-ARENA',
    title: 'Fuerza Bruta Cognitiva',
    kanji: '研',
    kanjiReading: 'Ken · Pulir',
    icon: 'BrainCircuit',
    startHHMM: '06:50',
    endHHMM: '08:00',
    narrative:
      'Acabas de terminar GÉNESIS. Tu mente está afilada y tu entorno inmaculado. No gastes esta energía en leer pasivamente — fuérzate a recordar. Fricción neuronal pura: la única que construye memoria real.',
    directive:
      'Abre tu plataforma de repetición espaciada (Somagnus / Anki). Active recall exclusivo de las materias densas: anatomía, histología, embriología.',
    scienceNote:
      'El active recall obliga al hipocampo a reconstruir el rastro de memoria sin pistas, lo que dispara LTP (potenciación a largo plazo). En altitud, el sodio extra acelera la conducción axonal — los potenciales de acción se disparan más rápido.',
    tips: [
      'Sin reabrir notas — solo reactivar lo que ya estudiaste.',
      'Si una flashcard se siente fácil, no es active recall — sube la fricción.',
      'Pomodoro corto (25/5) si la mente se dispersa.',
    ],
    activeOn: ['workday', 'saturday'],
    microHabits: [
      {
        id: 'salt_water_morning',
        label: 'Agua con pizca de sal',
        description: 'Sodio + magnesio para conducción axonal en altitud.',
        icon: 'Droplet',
        trigger: { kind: 'once', atHHMM: '06:55' },
        notifyBody: 'Bebe 250 ml de agua con una pizca de sal marina antes de empezar el active recall.',
        habitId: 'salt_water_morning',
      },
      {
        id: 'active_recall_pre_arena',
        label: 'Bloque de active recall',
        description: '60 min de recuperación activa de materias densas.',
        icon: 'BrainCircuit',
        trigger: { kind: 'once', atHHMM: '07:00' },
        notifyBody: 'PRE-ARENA: abre Somagnus/Anki y haz active recall puro hasta las 8:00.',
        habitId: 'active_recall_pre_arena',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'arena',
    codename: 'LA ARENA',
    title: 'Captura Académica · Facultad',
    kanji: '戦',
    kanjiReading: 'Sen · Combate',
    icon: 'Swords',
    startHHMM: '08:00',
    endHHMM: '13:00',
    narrative:
      'Entras a clases. Tu objetivo no es transcribir — es ser un francotirador de información. Escucha para entender. Solo conceptos clave, dudas y relaciones clínicas. Las flashcards las creas en casa.',
    directive:
      'Captura activa: conceptos clave + dudas + correlaciones clínicas. Café SOLO a las 9:00. Cada pausa: 20-20-20 + retracciones escapulares.',
    scienceNote:
      'Esperar 90+ min desde el despertar para la primera cafeína permite que la adenosina se aclare de forma natural — la cafeína no enmascara fatiga, refuerza vigilia ya existente. Resultado: energía sostenida sin el bajón de las 14:00.',
    tips: [
      'Anota dudas, no transcribas el slide — eso es ruido.',
      'Si tu profesor hace pausa, mira al horizonte 20s. No al móvil.',
      'Postura: pies al suelo, omóplatos juntos, cuello largo.',
    ],
    activeOn: ['workday'],
    microHabits: [
      {
        id: 'coffee_9am',
        label: 'Primer café · 9:00 AM',
        description: 'Adenosina aclarada — energía sostenida sin crash.',
        icon: 'Coffee',
        trigger: { kind: 'once', atHHMM: '09:00' },
        notifyBody: 'Hora del primer café. Espera obligatoria desde el despertar — sin crash a las 14:00.',
        habitId: 'coffee_9am',
      },
      {
        id: 'rule_20_20_20',
        label: 'Regla 20-20-20',
        description: 'Mira a 6 m durante 20 s — relaja los ciliares.',
        icon: 'Eye',
        trigger: { kind: 'recurring', everyMinutes: 25, fromHHMM: '08:25', untilHHMM: '12:55' },
        notifyBody: 'Mira al horizonte (6 m) durante 20 s. Relaja los ciliares.',
        habitId: 'rule_20_20_20',
      },
      {
        id: 'scapular_retractions',
        label: 'Retracciones escapulares',
        description: 'Junta omóplatos × 10 — contrarresta cuello de texto.',
        icon: 'Activity',
        trigger: { kind: 'recurring', everyMinutes: 50, fromHHMM: '08:50', untilHHMM: '12:50' },
        notifyBody: 'Junta los omóplatos × 10. Saca pecho. Cuello largo.',
        habitId: 'scapular_retractions',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'recarga',
    codename: 'RECARGA',
    title: 'Neuro-consolidación',
    kanji: '食',
    kanjiReading: 'Shoku · Sustento',
    icon: 'Soup',
    startHHMM: '13:00',
    endHHMM: '14:00',
    narrative:
      'Regresas saturado. Tu cerebro está en simpático alto y necesita vaciarse antes de volver a trabajar. Comida densa, cepillado para marcar transición, y NSDR obligatorio: el reset que mueve lo aprendido del hipocampo a corteza.',
    directive:
      'Almuerzo proteína + grasas (cero carbos pesados) → cepillado → NSDR 20 min boca arriba con audio Yoga Nidra.',
    scienceNote:
      'El NSDR (Yoga Nidra) coloca las ondas cerebrales en estado theta sin perder conciencia. En ese estado, el hipocampo "vacía" la memoria de corto plazo aprendida en la mañana hacia la corteza prefrontal y temporal — consolidación a largo plazo equivalente a horas de sueño.',
    tips: [
      'Carbos pesados al almuerzo = coma alimenticio. Los reservas para la noche.',
      'NSDR no es siesta: te tumbas pero NO te duermes. Si te duermes, despierta groggy.',
      'Yoga Nidra de Huberman o Reveri funcionan. Audífonos puestos.',
    ],
    action: 'nsdr',
    microHabits: [
      {
        id: 'lunch_clean',
        label: 'Almuerzo proteína + grasas',
        description: 'Cero carbos pesados. Sin pantallas.',
        icon: 'UtensilsCrossed',
        trigger: { kind: 'once', atHHMM: '13:00' },
        notifyBody: 'Almuerzo: proteína + grasas saludables. Cero carbos pesados.',
        habitId: 'lunch_clean',
      },
      {
        id: 'midday_brush',
        label: 'Cepillado de transición',
        description: 'Marca el fin de la comida.',
        icon: 'Sparkles',
        trigger: { kind: 'once', atHHMM: '13:30' },
        notifyBody: 'Cepillado de dientes — marca el fin de la comida.',
        habitId: 'midday_brush',
      },
      {
        id: 'nsdr_session',
        label: 'NSDR · 20 min',
        description: 'Yoga Nidra · transferencia hipocampo → corteza.',
        icon: 'Waves',
        trigger: { kind: 'once', atHHMM: '13:40' },
        notifyBody: 'NSDR ahora. Boca arriba, audífonos. 20 min de theta.',
        habitId: 'nsdr_session',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'monolito',
    activeOn: ['workday', 'saturday'],
    codename: 'EL MONOLITO',
    title: 'Asimilación',
    kanji: '柱',
    kanjiReading: 'Hashira · Pilar',
    icon: 'Columns3',
    startHHMM: '14:00',
    endHHMM: '16:30',
    narrative:
      'El segundo aire. Tu cerebro está reseteado por el NSDR. Este es el último bloque académico duro del día — úsalo para estructurar lo capturado y crear las flashcards que mañana tendrán que sangrar.',
    directive:
      'Deberes + estructura de apuntes + bancos de preguntas clínicas + creación de flashcards. Cero estimulantes desde aquí.',
    scienceNote:
      'La cafeína tiene una vida media de ~5-6 h. Consumirla después de las 14:00 sabotea la arquitectura del sueño profundo — aunque te duermas, reduce ondas delta. El protocolo nocturno se construye desde aquí.',
    tips: [
      'Si caes en YouTube/redes, regresa al pomodoro. La fricción es la señal.',
      'Crea flashcards desde tus dudas, no copies del libro.',
      'A las 16:00 cierra mentalmente: 30 min más y se acaba.',
    ],
    microHabits: [
      {
        id: 'no_caffeine_pm',
        label: 'Cero café desde 14:00',
        description: 'Protege el sueño profundo de esta noche.',
        icon: 'CoffeeOff',
        trigger: { kind: 'once', atHHMM: '14:00' },
        notifyBody: 'Última frontera de cafeína. Cero estimulantes desde ahora.',
        habitId: 'no_caffeine_pm',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'refugio',
    codename: 'EL REFUGIO',
    title: 'Desconexión Sagrada',
    kanji: '庵',
    kanjiReading: 'An · Refugio',
    icon: 'Tent',
    startHHMM: '16:30',
    endHHMM: '17:45',
    narrative:
      'Tu cerebro analítico terminó. Ahora activamos la Red Neuronal por Defecto — el modo donde nacen las ideas reales. Cero productividad, cero culpa. Es premio innegociable.',
    directive:
      'Ocio estratégico: anime / lectura ligera / caminata sin rumbo mirando al cielo. El optic flow desactiva la amígdala como ningún video de YouTube.',
    scienceNote:
      'El optic flow (paisaje visual en movimiento horizontal mientras caminas) inhibe directamente la amígdala — centro del estrés. El cielo abierto + nubes en movimiento es un descanso neurobiológico que los videos no replican porque la cabeza no se mueve.',
    tips: [
      'Si das walking → no audífonos. Solo entorno.',
      'Si das anime → uno solo, comprometido. No scroll.',
      'Cero notificaciones académicas. Silencia el grupo.',
    ],
    microHabits: [
      {
        id: 'optic_flow_walk',
        label: 'Walking + cielo',
        description: 'Optic flow → amígdala apagada.',
        icon: 'Cloud',
        trigger: { kind: 'once', atHHMM: '16:35' },
        notifyBody: 'Sal a caminar mirando al cielo. 20 minutos. Sin podcast.',
        habitId: 'optic_flow_walk',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'sintesis',
    codename: 'SÍNTESIS',
    title: 'Cierre del escritorio',
    kanji: '封',
    kanjiReading: 'Fū · Sellar',
    icon: 'Archive',
    startHHMM: '17:45',
    endHHMM: '18:00',
    narrative:
      'Vuelves al escritorio 15 minutos. No para producir — para sellar. Guardas libros, cierras pestañas, organizas esferos. Mañana arrancas sin fricción.',
    directive:
      'Inventario rápido: libros guardados · pestañas cerradas · escritorio inmaculado · ropa de mañana lista.',
    scienceNote:
      'La fricción de inicio del día siguiente se decide la noche anterior. Un escritorio cerrado reduce la carga cognitiva matutina y elimina excusas de procrastinación. El cerebro identifica orden visual con seguridad psicológica.',
    tips: [
      'Si lo dejas para mañana, tu yo de las 5 AM te lo cobrará.',
      'Cerrar pestañas = cerrar bucles mentales abiertos.',
    ],
    microHabits: [
      {
        id: 'desk_closure',
        label: 'Sello del escritorio',
        description: 'Pestañas cerradas, libros guardados, periféricos alineados.',
        icon: 'Archive',
        trigger: { kind: 'once', atHHMM: '17:45' },
        notifyBody: 'SÍNTESIS · 15 min para sellar el escritorio. Mañana sin fricción.',
        habitId: 'desk_closure',
      },
      {
        id: 'launch_terminus',
        label: 'Lanzamiento a TÉRMINUS',
        description: 'Inicio del descenso a sueño profundo.',
        icon: 'Moon',
        trigger: { kind: 'once', atHHMM: '18:00' },
        notifyBody: 'El núcleo fue conquistado. La medicina queda atrás. Inicia TÉRMINUS.',
        habitId: 'night_protocol',
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────

/** "HH:MM" → minutos desde medianoche. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((s) => parseInt(s, 10));
  return h * 60 + m;
}

/** Minutos desde medianoche de un Date. */
export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Bloque cuya ventana incluye `at`. Null si está fuera de día (06:50 → 18:00). */
export function getCurrentBlock(at: Date = new Date()): NucleusBlock | null {
  const m = dateToMinutes(at);
  for (const b of NUCLEUS_BLOCKS) {
    const s = hhmmToMinutes(b.startHHMM);
    const e = hhmmToMinutes(b.endHHMM);
    if (m >= s && m < e) return b;
  }
  return null;
}

/** Próximo bloque que aún no comienza. Null si el día NUCLEUS terminó. */
export function getNextBlock(at: Date = new Date()): NucleusBlock | null {
  const m = dateToMinutes(at);
  for (const b of NUCLEUS_BLOCKS) {
    if (m < hhmmToMinutes(b.startHHMM)) return b;
  }
  return null;
}

/** Progreso (0..1) del bloque actual. 0 si no hay bloque activo. */
export function getBlockProgress(block: NucleusBlock, at: Date = new Date()): number {
  const m = dateToMinutes(at);
  const s = hhmmToMinutes(block.startHHMM);
  const e = hhmmToMinutes(block.endHHMM);
  if (e === s) return 0;
  return Math.max(0, Math.min(1, (m - s) / (e - s)));
}

/** ¿Estamos dentro de la ventana NUCLEUS (06:50 → 18:00)? */
export function isNucleusWindow(at: Date = new Date()): boolean {
  const m = dateToMinutes(at);
  return m >= hhmmToMinutes('06:50') && m < hhmmToMinutes('18:00');
}

/** Número de bloque (1..6) o 0 si fuera de ventana. */
export function getBlockIndex(blockId: NucleusBlockId): number {
  return NUCLEUS_BLOCKS.findIndex((b) => b.id === blockId);
}

/** Es fin de semana (sábado o domingo). Mantenido por compatibilidad;
 *  el código nuevo debería usar `getDayProfile` de `dayProfile.ts`. */
export function isWeekend(at: Date = new Date()): boolean {
  const day = at.getDay();
  return day === 0 || day === 6;
}

/** ¿Está este bloque activo en el perfil de día dado? Bloques sin
 *  `activeOn` se consideran activos en todos los perfiles. */
export function isBlockActiveOnProfile(
  block: NucleusBlock,
  profile: DayProfile,
): boolean {
  if (!block.activeOn) return true;
  return block.activeOn.includes(profile);
}

/** ¿Está este micro-hábito activo en el perfil dado? Si el micro-hábito
 *  no especifica `activeOn`, hereda del bloque padre. Si el bloque
 *  tampoco lo especifica, se considera activo en todos los perfiles. */
export function isMicroHabitActiveOnProfile(
  mh: NucleusMicroHabit,
  block: NucleusBlock,
  profile: DayProfile,
): boolean {
  if (mh.activeOn) return mh.activeOn.includes(profile);
  return isBlockActiveOnProfile(block, profile);
}

/** Resumen "08:00 – 13:00" para UI. */
export function describeWindow(b: NucleusBlock): string {
  return `${b.startHHMM} – ${b.endHHMM}`;
}
