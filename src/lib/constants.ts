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

export type AudioLayer = 'ignition' | 'bridge' | 'cognitive';

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
  /** Biological layer for audio engine crossfade. */
  layer: AudioLayer;
  /** Decorative kanji displayed as watermark. */
  kanji: string;
  /** Romanized reading / meaning short label. */
  kanjiReading: string;
  /** Full commentator-style briefing for this phase, spoken ONCE at
   *  phase start. Concatenates the intro, the narration (benefit +
   *  science) and any mid-phase coaching notes into a single block so
   *  the audio is generated as ONE Qwen mp3 — this guarantees voice
   *  timbre consistency. After the briefing plays, the rest of the
   *  phase runs in silence (or background music); completion is shown
   *  as a visual "COMPLETADO" overlay, no voice. */
  voiceLineBriefing: string;
}

export const MISSIONS: Mission[] = [
  // ═══ BLOQUE 1: LA FRAGUA OSCURA (5:00 - 6:00) ═══
  {
    id: 'genesis',
    phase: 1,
    codename: 'GENESIS',
    title: 'DESPERTAR',
    icon: '◈',
    blockLabel: 'BLOQUE 1 · LA FRAGUA OSCURA',
    scheduledTime: '05:00',
    layer: 'ignition',
    kanji: '起',
    kanjiReading: 'Kī · Alzarse',
    voiceLineBriefing: 'Operador. Fase uno. Génesis. Confirma tu presencia. Primer acto del día: cuenta regresiva mental, pies al suelo, cama hecha en sesenta segundos. Este es el reflejo que entrena a tu cerebro a encadenar victorias durante las próximas dieciocho horas.',
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
    layer: 'ignition',
    kanji: '水',
    kanjiReading: 'Mizu · Agua',
    voiceLineBriefing: 'Fase dos. Aqua. Restaura la función celular. Quinientos mililitros con una pizca de sal marina. Durante la noche perdiste casi un litro de agua; sin hidratación, el cerebro opera al setenta y cinco por ciento de su capacidad. Bebe con calma.',
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
    layer: 'ignition',
    kanji: '柔',
    kanjiReading: 'Jū · Flexible',
    voiceLineBriefing: 'Fase tres. Flex. Calibra el cuerpo. Ocho minutos de movilidad dirigida: caderas, isquiotibiales, columna torácica. El cuerpo despierta rígido tras el sueño; esta es la rutina que reduce el riesgo de lesión hasta en un cincuenta por ciento antes del cardio. Abre lo que el escritorio cierra. Respira en cada estiramiento.',
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
    layer: 'ignition',
    kanji: '走',
    kanjiReading: 'Sō · Correr',
    voiceLineBriefing: 'Fase cuatro. Surge. Sal al frío. Corre. Diez minutos al frío de la mañana, alternando entre días de sprint y zona dos conversacional. Correr libera B D N F, una neurotrofina que hace crecer neuronas nuevas en el hipocampo. Postura alta, cadencia constante; respira por la nariz si puedes. Mantén esta intensidad durante todo el día.',
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
    layer: 'ignition',
    kanji: '鍛',
    kanjiReading: 'Tan · Forjar',
    voiceLineBriefing: 'Fase cinco. Forge. Densidad pura. Sin excusas. Veinticinco minutos: empuje, tracción, piernas, núcleo. El entrenamiento de fuerza en ayunas libera testosterona, hormona de crecimiento y B D N F; tu cerebro funciona mejor después de levantar peso. Descansos cortos de sesenta segundos. Forma antes que carga. En el último tercio, no bajes la guardia. Cierra con el núcleo.',
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
    layer: 'bridge',
    kanji: '息',
    kanjiReading: 'Iki · Aliento',
    voiceLineBriefing: 'Fase seis. Pneuma. Cierra los ojos. Respira. Tres rondas de hiperventilación controlada seguidas de retención apneica. En altitud, no forzar: escucha al cuerpo. El protocolo alcaliniza la sangre, dispara noradrenalina y calibra el sistema autónomo.',
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
    layer: 'bridge',
    kanji: '氷',
    kanjiReading: 'Kōri · Hielo',
    voiceLineBriefing: 'Fase siete. Cryo. Domina el reflejo. Controla la respiración. Tres minutos de frío extremo post-ejercicio. El contraste térmico dispara dopamina sostenida hasta dos horas; dominar el reflejo de huida es dominar la respuesta emocional del día entero. Exhala lento. Resiste el impulso. Terminar en frío maximiza la dopamina.',
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
    blockLabel: 'BLOQUE 2 · VENTANA ANABÓLICA',
    scheduledTime: '06:00',
    layer: 'cognitive',
    kanji: '糧',
    kanjiReading: 'Ryō · Sustento',
    voiceLineBriefing: 'Fase ocho. Refuel. Come con calma. Nutrición directa al músculo. Ventana anabólica abierta: proteína para reparar el músculo, carbohidratos complejos para reponer glucógeno, grasas saludables para la función hormonal. Sin pantallas. Mastica despacio.',
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
    blockLabel: 'BLOQUE 3 · EL FILO COGNITIVO',
    scheduledTime: '06:15',
    layer: 'cognitive',
    kanji: '陽',
    kanjiReading: 'Yō · Sol',
    voiceLineBriefing: 'Fase nueve. Helio. Luz directa. Entorno limpio. Diez minutos de luz solar directa al despertar: ancla el ritmo circadiano, suprime melatonina y optimiza el pulso de cortisol matutino. Mientras tanto, limpia el escritorio. Cero objetos innecesarios a la vista.',
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
    layer: 'bridge',
    kanji: '空',
    kanjiReading: 'Kū · Vacío',
    voiceLineBriefing: 'Fase diez. Void. Siéntate. Visualiza los obstáculos del día. Premeditatio Malorum estoica. El córtex prefrontal procesa mejor antes del conflicto que durante. Tres minutos: anticipa, resuelve en frío. Dos minutos de silencio: solo la respiración.',
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
    layer: 'cognitive',
    kanji: '書',
    kanjiReading: 'Sho · Escribir',
    voiceLineBriefing: 'Fase once. Codex. Escribe a mano. Máximo tres prioridades. Externalizar las tareas libera memoria de trabajo; la claridad de propósito reduce la ansiedad hasta un cuarenta y tres por ciento. Lo que no cabe en tres líneas, hoy no importa.',
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
    layer: 'cognitive',
    kanji: '知',
    kanjiReading: 'Chi · Conocimiento',
    voiceLineBriefing: 'Fase doce. Cipher. Lee. Extrae una idea. Convierte en pregunta. Diez minutos de lectura, cinco minutos de procesamiento. Active Recall más Repetición Espaciada; es la única manera de convertir lectura pasiva en conocimiento estructural. Una sola idea, la de mayor impacto. Conviértela en flashcard.',
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

// ── RANKS (dōjō: 7 niveles) ──
export interface Rank {
  class: string;
  title: string;
  titleEs: string;
  /** @deprecated Legacy field kept for backwards-compat with StatusBar. Use minLevel. */
  minStreak: number;
  minLevel: number;
  kanji: string;
  color: string;
}

export const RANKS: Rank[] = [
  { class: 'I',   title: 'INITIATE',  titleEs: 'INICIADO',   minLevel: 1,  minStreak: 0,  kanji: '初', color: '#7a6f63' },
  { class: 'II',  title: 'DISCIPLE',  titleEs: 'DISCÍPULO',  minLevel: 5,  minStreak: 3,  kanji: '徒', color: '#a48a3b' },
  { class: 'III', title: 'OPERATOR',  titleEs: 'OPERADOR',   minLevel: 10, minStreak: 7,  kanji: '士', color: '#c9a227' },
  { class: 'IV',  title: 'VETERAN',   titleEs: 'VETERANO',   minLevel: 20, minStreak: 14, kanji: '兵', color: '#d4af37' },
  { class: 'V',   title: 'RONIN',     titleEs: 'RONIN',      minLevel: 35, minStreak: 21, kanji: '浪', color: '#bc002d' },
  { class: 'VI',  title: 'SENSEI',    titleEs: 'SENSEI',     minLevel: 55, minStreak: 40, kanji: '師', color: '#e8dcc4' },
  { class: 'VII', title: 'SHOGUN',    titleEs: 'SHOGUN',     minLevel: 80, minStreak: 75, kanji: '将', color: '#f5e4a3' },
];

export function getRankByLevel(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

/** @deprecated Legacy — use getRankByLevel with OperatorProfile.level. */
export function getRank(streak: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (streak >= r.minStreak) current = r;
  return current;
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
