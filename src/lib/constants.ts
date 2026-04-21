// ═══════════════════════════════════════════════════════════════
// MORNING AWAKENING v4.0 — 12 Fases Científicas
// Cronograma: 5:00 AM - 6:45 AM (105 min)
// Bloque 1: La Fragua Oscura | Bloque 2: Ventana Anabólica | Bloque 3: Filo Cognitivo
// ═══════════════════════════════════════════════════════════════

export interface SubStep {
  label: string;
  description: string;
  optional?: boolean;
}

export interface Mission {
  id: string;
  phase: number;
  codename: string;
  title: string;
  directive: string;
  duration: number;
  systemLog: string;
  completionLog: string;
  icon: string;
  scienceNote: string;
  subSteps?: SubStep[];
  breathingPattern?: 'wimhof';
  hasDailyInsight?: boolean;
  hasJournaling?: boolean;
  tips?: string[];
  blockLabel?: string;
  scheduledTime?: string;
}

export const MISSIONS: Mission[] = [
  // ═══ BLOQUE 1: LA FRAGUA OSCURA (5:00 - 6:00) ═══
  {
    id: 'genesis',
    phase: 1,
    codename: 'GENESIS',
    title: 'DESPERTAR',
    icon: '◈',
    blockLabel: 'BLOQUE 1: LA FRAGUA OSCURA',
    scheduledTime: '05:00',
    directive: 'Levántate al primer timbre. Haz tu cama. Es tu primera victoria del día. Confirma tu presencia.',
    duration: 0,
    systemLog: 'INITIALIZING MORNING PROTOCOL v4.0...',
    completionLog: 'OPERATOR ONLINE. FIRST VICTORY REGISTERED.',
    scienceNote: 'Posponer la alarma fragmenta el sueño REM. Hacer la cama es el "Quick Win" militar: completar una tarea en los primeros 60 segundos entrena a tu cerebro para encadenar victorias todo el día.',
    subSteps: [
      { label: 'Levántate al primer timbre', description: 'Cuenta 5-4-3-2-1 y pon los pies en el suelo.' },
      { label: 'Haz tu cama — INMACULADA', description: '60 segundos. Primera tarea completada del día.' },
    ],
    tips: [
      'Coloca el celular lejos de la cama para forzarte a levantarte.',
      'La cama hecha es un ancla visual de disciplina todo el día.',
    ],
  },
  {
    id: 'aqua',
    phase: 2,
    codename: 'AQUA',
    title: 'HIDRATACIÓN',
    icon: '◇',
    scheduledTime: '05:01',
    directive: 'Bebe 500ml de agua con una pizca de sal marina. Tu cuerpo perdió ~1 litro durante el sueño.',
    duration: 60,
    systemLog: 'HYDRATION PROTOCOL ENGAGED.',
    completionLog: 'HYDRATION COMPLETE. CELLULAR FUNCTION RESTORED.',
    scienceNote: 'Deshidratación leve (-2%) reduce la función cognitiva un 25%. El agua con sal aporta electrolitos para absorción celular óptima. Prepáralo la noche anterior.',
    tips: [
      'Deja el agua lista en tu mesa de noche antes de dormir.',
      'Agua con limón: vitamina C + digestión. La sal es el upgrade.',
    ],
  },
  {
    id: 'flex',
    phase: 3,
    codename: 'FLEX',
    title: 'MOVILIDAD',
    icon: '◈',
    scheduledTime: '05:02',
    directive: 'Movilidad funcional anti-sedentarismo. Abre caderas, estira isquiotibiales, extensiones torácicas. 8 minutos.',
    duration: 480,
    systemLog: 'MOBILITY CALIBRATION — ANTI-SEDENTARY PROTOCOL.',
    completionLog: 'PHYSICAL SYSTEMS CALIBRATED. INJURY RISK -50%.',
    scienceNote: 'Estar sentado acorta los flexores de cadera y comprime los discos lumbares. La movilidad matutina contrarresta esto, activa el sistema propioceptivo y reduce el riesgo de lesiones un 50% antes del cardio.',
    subSteps: [
      { label: 'Rotaciones de cuello y hombros', description: 'Círculos lentos, 10 en cada dirección.' },
      { label: 'Apertura de caderas (90/90 stretch)', description: 'Contrarresta las horas sentado. 30s por lado.' },
      { label: 'Estiramiento de isquiotibiales', description: 'Pierna recta sobre superficie elevada. 30s por lado.' },
      { label: 'Extensiones torácicas', description: 'Abre el pecho y la columna media. Tu espalda te lo agradecerá.' },
      { label: 'Cat-Cow + Plancha 30s', description: 'Flexibiliza columna y activa el core.' },
    ],
    tips: [
      'Enfócate en abrir lo que el escritorio cierra: caderas, pecho, columna.',
      'Movimientos dinámicos por la mañana, estáticos por la noche.',
    ],
  },
  {
    id: 'surge',
    phase: 4,
    codename: 'SURGE',
    title: 'CARDIO',
    icon: '▶',
    scheduledTime: '05:10',
    directive: 'Sal a correr 10 minutos. Alterna entre días de sprint y días de trote suave (Zona 2). Periodiza la intensidad.',
    duration: 600,
    systemLog: 'CARDIO TRAINING — OUTDOOR RUN INITIATED.',
    completionLog: 'ENDORPHIN RELEASE. CORE TEMP ELEVATED.',
    scienceNote: 'Correr libera BDNF (hace crecer neuronas nuevas en el hipocampo). IMPORTANTE en altitud: tus pulmones trabajan más duro. Si notas niebla mental después, baja a Zona 2. La periodización previene el agotamiento del sistema nervioso central.',
    subSteps: [
      { label: 'Sal al exterior', description: 'El frío matutino potencia la alerta.' },
      { label: 'Calienta 1-2 min trotando suave', description: 'Prepara articulaciones y cardiovascular.' },
      { label: 'Bloque principal 7-8 min', description: 'Día intenso: sprints. Día suave: trote Zona 2 conversacional.' },
      { label: 'Enfría 1 min caminando', description: 'Baja pulsaciones antes de parar.' },
    ],
    tips: [
      'PERIODIZACIÓN: No corras a tope todos los días. Alterna intensidad.',
      'Zona 2 = podrías mantener una conversación. Construye base aeróbica.',
      'En altitud (+2500m): el mismo esfuerzo gasta más oxígeno. Ajusta.',
    ],
  },
  {
    id: 'forge',
    phase: 5,
    codename: 'FORGE',
    title: 'FUERZA',
    icon: '⬡',
    scheduledTime: '05:20',
    directive: 'Entrenamiento de fuerza pesado. 25 minutos de densidad pura con descansos cortos. Sin excusas.',
    duration: 1500,
    systemLog: 'STRENGTH TRAINING SEQUENCE — FORGE MODE ACTIVE.',
    completionLog: 'MUSCULAR STIMULUS APPLIED. BDNF FLOWING.',
    scienceNote: '25 minutos en ayunas es el límite perfecto para evitar degradación muscular excesiva. El entrenamiento de fuerza libera testosterona, hormona de crecimiento y BDNF — tu cerebro funciona mejor después de levantar pesas.',
    subSteps: [
      { label: 'Ejercicio compuesto 1 (empuje)', description: 'Press banca, flexiones, press militar — 4 series.' },
      { label: 'Ejercicio compuesto 2 (tirón)', description: 'Dominadas, remo, peso muerto — 4 series.' },
      { label: 'Ejercicio compuesto 3 (piernas)', description: 'Sentadillas, lunges, hip thrust — 4 series.' },
      { label: 'Core/Accesorios', description: 'Plancha, abdominales, trabajo auxiliar — 2-3 series.' },
    ],
    tips: [
      'Densidad > Duración: descansos de 60-90s máximo entre series.',
      '25 min en ayunas es óptimo. Más tiempo = catabolismo muscular.',
      'Rota entre push/pull/legs a lo largo de la semana.',
    ],
  },
  {
    id: 'pneuma',
    phase: 6,
    codename: 'PNEUMA',
    title: 'RESPIRACIÓN WIM HOF',
    icon: '◎',
    scheduledTime: '05:45',
    directive: '3 rondas profundas e implacables. En altitud: NO fuerces la retención. El estímulo se logra en menos tiempo.',
    duration: 600,
    systemLog: 'WIM HOF PROTOCOL — ALTITUDE-CALIBRATED.',
    completionLog: 'AUTONOMIC SYSTEM CALIBRATED. NOREPINEPHRINE +300%.',
    scienceNote: 'AJUSTE DE ALTITUD: A +2500m tu SpO₂ base es menor. Llegarás a hipoxia más rápido en las retenciones. Si sientes mareo agudo antes de los 60-90s, inhala. El estímulo (alcalinizar sangre + adrenalina) se logra en menos tiempo por la altura.',
    breathingPattern: 'wimhof',
    tips: [
      'Sentado o acostado. NUNCA en agua ni de pie.',
      'ALTITUD: No compitas con cronómetros de nivel del mar.',
      'El hormigueo en las manos es normal — alcalosis respiratoria temporal.',
    ],
  },
  {
    id: 'cryo',
    phase: 7,
    codename: 'CRYO',
    title: 'DUCHA FRÍA',
    icon: '❄',
    scheduledTime: '05:55',
    directive: '3 minutos de frío extremo post-ejercicio. 2 minutos para secarte y vestirte. Controla la respiración.',
    duration: 300,
    systemLog: 'COLD EXPOSURE — HORMETIC STRESS MAXIMUM.',
    completionLog: 'DOPAMINE +250% (2-3h). RECOVERY ACCELERATED.',
    scienceNote: 'Post-ejercicio el contraste térmico es más potente. Dopamina +250% sostenida 2-3 horas. El frío acelera la recuperación muscular, reduce inflamación y entrena el control prefrontal sobre la respuesta de lucha/huida.',
    subSteps: [
      { label: '3 min ducha fría', description: 'Post-ejercicio tu cuerpo está caliente — el contraste es brutal.' },
      { label: 'Controla tu respiración', description: 'Exhala lentamente. Domina el reflejo de pánico.' },
      { label: '2 min secarte y vestirte', description: 'Ropa cómoda para el bloque cognitivo.' },
    ],
    tips: [
      'Terminar en FRÍO (no caliente) maximiza dopamina.',
      'El objetivo es superar el impulso de salir. Ahí está el crecimiento.',
    ],
  },

  // ═══ BLOQUE 2: VENTANA ANABÓLICA (6:00 - 6:15) ═══
  {
    id: 'refuel',
    phase: 8,
    codename: 'REFUEL',
    title: 'DESAYUNO',
    icon: '◆',
    blockLabel: 'BLOQUE 2: VENTANA ANABÓLICA',
    scheduledTime: '06:00',
    directive: 'Come con calma. Nutrición directa al músculo roto. Proteína + carbohidratos complejos + grasas saludables.',
    duration: 900,
    systemLog: 'ANABOLIC WINDOW — NUTRIENT DELIVERY ACTIVE.',
    completionLog: 'FUEL LOADED. GLYCOGEN STORES REPLENISHED.',
    scienceNote: 'La ventana anabólica post-ejercicio es el momento óptimo para nutrientes. Proteína repara el músculo, carbohidratos complejos reponen glucógeno, grasas saludables apoyan la función hormonal. Comer con calma mejora la digestión.',
    subSteps: [
      { label: 'Proteína (huevos, yogur, proteína)', description: 'Mínimo 20-30g para síntesis muscular.' },
      { label: 'Carbohidratos complejos', description: 'Avena, pan integral, fruta — reponen glucógeno.' },
      { label: 'Grasas saludables', description: 'Aguacate, nueces, aceite de oliva — función hormonal.', optional: true },
      { label: 'Come sin pantallas', description: 'Mastica despacio. La digestión empieza en la boca.' },
    ],
    tips: [
      'Si corriste fuerte: más carbohidratos. Si fue Zona 2: más proteína.',
      'Café ahora sí — ya pasaron 90+ min desde despertar (regla Huberman).',
    ],
  },

  // ═══ BLOQUE 3: EL FILO COGNITIVO (6:15 - 6:45) ═══
  {
    id: 'helio',
    phase: 9,
    codename: 'HELIO',
    title: 'LUZ SOLAR + ENTORNO',
    icon: '☀',
    blockLabel: 'BLOQUE 3: EL FILO COGNITIVO',
    scheduledTime: '06:15',
    directive: 'Luz natural del amanecer entrando por la ventana. Mientras tanto: configura tu entorno de trabajo. Cero fricción visual.',
    duration: 300,
    systemLog: 'CIRCADIAN SYNC + ENVIRONMENT RESET — LOCUS PROTOCOL.',
    completionLog: 'CIRCADIAN ANCHORED. WORKSPACE FRICTION: ZERO.',
    scienceNote: 'En altitud la atmósfera es más delgada: la radiación lumínica del amanecer es más potente y nítida. 5 minutos son más que suficientes para anclar tu ritmo circadiano de forma fulminante. El entorno limpio reduce la carga cognitiva parasitaria.',
    subSteps: [
      { label: 'Abre la ventana — luz natural directa', description: 'En altitud el impacto lumínico es superior al nivel del mar.' },
      { label: 'Limpia y organiza tu escritorio', description: 'Superficie libre de objetos innecesarios.' },
      { label: 'Software en dark mode', description: 'Reduce fatiga visual para las horas de pantalla.' },
      { label: 'Prepara tu espacio de estudio', description: 'Todo lo que necesitas al alcance. Nada que no necesitas a la vista.' },
    ],
    tips: [
      'El entorno inmaculado reduce decisiones innecesarias (fatiga decisional).',
      'Luces lineales en posición para cuando baje el sol natural.',
    ],
  },
  {
    id: 'void',
    phase: 10,
    codename: 'VOID',
    title: 'MEDITACIÓN',
    icon: '◌',
    scheduledTime: '06:20',
    directive: 'Premeditatio Malorum: 3 minutos visualizando obstáculos del día y resolviéndolos con frialdad. 2 minutos de silencio total.',
    duration: 300,
    systemLog: 'PREMEDITATIO MALORUM — STOIC COMBAT MEDITATION.',
    completionLog: 'PREFRONTAL CORTEX ARMED. PANIC RESPONSE NEUTRALIZED.',
    scienceNote: 'No es "dejar la mente en blanco". La Premeditatio Malorum estoica (Marcus Aurelius, Séneca) te prepara para los problemas ANTES de que ocurran. Visualizar obstáculos y resolverlos mentalmente entrena al cerebro a no entrar en pánico cuando aparezcan.',
    subSteps: [
      { label: 'Siéntate, espalda recta, ojos cerrados', description: 'Post-ducha fría tu mente está cristalina.' },
      { label: '3 min: Visualiza obstáculos del día', description: 'Un bug, fatiga al estudiar, un retraso. Visualízate resolviéndolo con frialdad.' },
      { label: '2 min: Silencio total', description: 'Observa la respiración. Sin controlar, sin juzgar.' },
    ],
    tips: [
      'Post-ducha fría = dopamina alta + mente despejada. Momento perfecto.',
      'Suspiro fisiológico para estrés agudo: 2 inhalaciones nasales rápidas + 1 exhalación larga bucal.',
    ],
  },
  {
    id: 'codex',
    phase: 11,
    codename: 'CODEX',
    title: 'JOURNALING',
    icon: '✎',
    scheduledTime: '06:25',
    directive: 'Anota tus tareas del día. Responde al prompt. Escribe a mano. 5 minutos de claridad absoluta.',
    duration: 300,
    systemLog: 'COGNITIVE CLARITY MODULE — TASK MAPPING.',
    completionLog: 'MISSION OBJECTIVES DEFINED. MENTAL CLUTTER: ZERO.',
    scienceNote: 'Escribir a mano activa áreas cerebrales que el teclado no alcanza. Externalizar las tareas del día libera memoria de trabajo (RAM mental). La claridad de propósito reduce la ansiedad un 43% (Journal of Clinical Psychology).',
    hasJournaling: true,
    tips: [
      'Escribe a mano. La escritura manual activa más redes neuronales.',
      'Anota máximo 3 tareas prioritarias. Más = parálisis por análisis.',
      'Si no sabes qué escribir: "Ahora mismo siento..."',
    ],
  },
  {
    id: 'cipher',
    phase: 12,
    codename: 'CIPHER',
    title: 'LECTURA + ACTIVE RECALL',
    icon: '▣',
    scheduledTime: '06:30',
    directive: '10 minutos leyendo filosofía, historia o biografías. 5 minutos procesando: extrae UNA idea y conviértela en flashcard de Active Recall.',
    duration: 900,
    systemLog: 'KNOWLEDGE ACQUISITION — ACTIVE RECALL MODE.',
    completionLog: 'DATA ASSIMILATED. SRS FLASHCARD CREATED. 6:45 AM — ARRANQUE.',
    scienceNote: 'Leer por leer no te hace culto — te hace consumidor de texto. El Active Recall (extraer una pregunta de lo leído) fuerza la consolidación sináptica. La Repetición Espaciada (SRS) previene la curva del olvido. 10 min lectura + 5 min procesamiento = retención real.',
    hasDailyInsight: true,
    subSteps: [
      { label: '10 min: Lee sin distracciones', description: 'Filosofía, historia, arte, biografías. Libro físico ideal.' },
      { label: 'Subraya UNA idea central', description: 'No 10 ideas. UNA. La que más impacto tiene.' },
      { label: '5 min: Convierte esa idea en pregunta', description: 'Active Recall: "¿Qué dijo Séneca sobre el tiempo?" → flashcard.' },
      { label: 'Anota la flashcard en tu sistema SRS', description: 'Anki, libreta de repaso, o tu app de estudio.', optional: true },
    ],
    tips: [
      'Ficción = empatía. No-ficción = conocimiento. Alterna géneros.',
      'Filosofía, historia, psicología y biografías: máximo impacto para crecimiento.',
      'Si no retienes lo que lees, no estás aprendiendo — estás pasando páginas.',
    ],
  },
];

// ── RANKS ──
export interface Rank {
  class: string;
  title: string;
  titleEs: string;
  minStreak: number;
  color: string;
}

export const RANKS: Rank[] = [
  { class: 'E', title: 'RECRUIT', titleEs: 'RECLUTA', minStreak: 0, color: '#666666' },
  { class: 'D', title: 'SOLDIER', titleEs: 'SOLDADO', minStreak: 3, color: '#4ADE80' },
  { class: 'C', title: 'KNIGHT', titleEs: 'CABALLERO', minStreak: 7, color: '#60A5FA' },
  { class: 'B', title: 'COMMANDER', titleEs: 'COMANDANTE', minStreak: 14, color: '#A78BFA' },
  { class: 'A', title: 'CAPTAIN', titleEs: 'CAPITÁN', minStreak: 21, color: '#F59E0B' },
  { class: 'S', title: 'SOVEREIGN', titleEs: 'SOBERANO', minStreak: 30, color: '#FF3366' },
];

export function getRank(streak: number): Rank {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (streak >= rank.minStreak) currentRank = rank;
  }
  return currentRank;
}

// ── STREAK DATA ──
export interface StreakData {
  streak: number;
  completedDays: number;
  lastCompletedDate: string | null;
  history: string[];
}

export const DEFAULT_STREAK_DATA: StreakData = {
  streak: 0,
  completedDays: 0,
  lastCompletedDate: null,
  history: [],
};

// ── UTILITY FUNCTIONS ──
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0] === dateStr;
}

export function isToday(dateStr: string): boolean {
  return getToday() === dateStr;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
