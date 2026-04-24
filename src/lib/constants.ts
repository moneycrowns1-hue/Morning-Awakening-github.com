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
    voiceLineBriefing: 'Fase uno. Génesis. Así empieza todo, Jugador. Cuenta atrás: cinco, cuatro, tres, dos, uno. Pies al suelo. Sin negociar con la almohada. Ahora haz tu cama, impecable, sesenta segundos. Es pequeño, lo sé. Pero esa cama hecha es la primera victoria del día, y tu cerebro la registra. Acabas de decirle a tu mente: hoy gano yo. Vamos.',
    directive: 'Inicialización del sistema: apaga la alarma, da gracias, abre persianas, ventila y tiende la cama.',
    duration: 60,
    systemLog: 'INITIALIZING MORNING PROTOCOL v4.0...',
    completionLog: 'OPERATOR ONLINE. FIRST VICTORY REGISTERED.',
    scienceNote: 'Posponer la alarma fragmenta el sueño REM. El ritual de apertura (gratitud + luz + ventilación + cama) encadena múltiples "Quick Wins" en los primeros 60 segundos: tu cerebro queda programado para sumar victorias el resto del día.',
    subSteps: [
      { label: 'Apaga la alarma — cero snooze', description: 'Al primer timbre. El snooze fragmenta el sueño REM.' },
      { label: 'Agradecimiento a Dios', description: 'Un momento de silencio y gratitud antes de poner un pie en el suelo — tu conexión espiritual y el verdadero inicio del protocolo.' },
      { label: 'Levanta las persianas al máximo', description: 'Luz directa sobre la retina — ancla el ritmo circadiano.' },
      { label: 'Abre la ventana un cuarto', description: 'Ventila para purgar el CO₂ acumulado en la noche.' },
      { label: 'Tiende la cama — inmaculada', description: 'Estira sábanas, alinea almohadas. Primera victoria visual y física del día.' },
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
    voiceLineBriefing: 'Fase dos. Aqua. Durante la noche perdiste casi un litro de agua, y tu cerebro lo nota. Toma quinientos mililitros, con una pizca de sal marina. Sin prisa. Siente cómo vuelves a ti. Cada célula te lo está pidiendo. Bebe con calma; los próximos noventa minutos dependen de este vaso.',
    directive: 'Ingiere el vaso de agua preparado la noche anterior (500 ml con pizca de sal marina). Tu cuerpo perdió ~1 litro durante el sueño.',
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
    voiceLineBriefing: 'Fase tres. Flex. Tu cuerpo lleva ocho horas inmóvil. Caderas cerradas. Columna rígida. Isquiotibiales dormidos. Ocho minutos de movilidad consciente: ni uno más, ni uno menos. Abre lo que el escritorio te ha ido cerrando. Respira en cada estiramiento, profundo y largo. Esto no es calentar; es reclamar tu cuerpo antes de pedirle algo difícil.',
    directive: 'Lubricación biomecánica: rotaciones articulares completas, deep squat sostenido, gato-camello e isquiotibiales dinámicos. 8 minutos.',
    duration: 480,
    systemLog: 'MOBILITY CALIBRATION — ANTI-SEDENTARY PROTOCOL.',
    completionLog: 'PHYSICAL SYSTEMS CALIBRATED. INJURY RISK -50%.',
    scienceNote: 'Estar sentado acorta los flexores de cadera y comprime los discos lumbares. La movilidad matutina contrarresta esto, activa el sistema propioceptivo y reduce el riesgo de lesiones un 50% antes del cardio.',
    subSteps: [
      { label: 'Rotaciones articulares completas', description: 'Cuello, hombros, muñecas y tobillos. Círculos lentos, 10 en cada dirección.' },
      { label: 'Deep squat sostenido 60 s', description: 'Sentadilla profunda mantenida para abrir la cadera.' },
      { label: 'Transiciones gato-camello', description: 'En el piso, para despertar la columna.' },
      { label: 'Estiramiento dinámico de isquiotibiales', description: 'Movimiento controlado, sin rebotes.' },
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
    voiceLineBriefing: 'Fase cuatro. Surge. Sal. Al frío. A la calle. Diez minutos corriendo: hoy sprint, o zona dos si toca recuperar; tú sabes cómo vienes. Postura alta, cadencia constante, respira por la nariz si puedes. Mientras corres, tu cuerpo está fabricando B D N F, neuronas nuevas en tu hipocampo. Te estás haciendo literalmente más inteligente. No lo olvides cuando duela. Esta intensidad es la que se queda contigo todo el día.',
    directive: 'Pico termogénico: 2 min aceleración progresiva + 6 min ritmo intenso + 2 min desaceleración. 10 minutos totales.',
    duration: 600,
    systemLog: 'CARDIO TRAINING — OUTDOOR RUN INITIATED.',
    completionLog: 'ENDORPHIN RELEASE. CORE TEMP ELEVATED.',
    scienceNote: 'Correr libera BDNF (hace crecer neuronas nuevas en el hipocampo). IMPORTANTE en altitud: tus pulmones trabajan más duro. Si notas niebla mental después, baja a Zona 2. La periodización previene el agotamiento del sistema nervioso central.',
    subSteps: [
      { label: 'Calzado rápido + cronómetro', description: 'Sal al exterior y arranca el crono.' },
      { label: '2 min — Aceleración progresiva', description: 'Sube el ritmo de forma controlada hasta entrar en zona.' },
      { label: '6 min — Ritmo intenso', description: 'Forzando la respiración nasal si es posible.' },
      { label: '2 min — Desaceleración', description: 'Baja progresivamente hacia tu zona de entrenamiento.' },
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
    voiceLineBriefing: 'Fase cinco. Forge. Aquí no hay excusas, Jugador. Veinticinco minutos. Empuje. Tracción. Piernas. Núcleo. Descansos cortos, sesenta segundos y ni uno más. Forma antes que carga, siempre. En ayunas tu cuerpo está liberando testosterona y hormona de crecimiento como en pocos momentos del día: te estás forjando por dentro. En el último tercio no bajes la guardia; ahí se decide quién eres. Cierra con el núcleo. Gánate el desayuno.',
    directive: 'Tensión mecánica: 25 minutos de densidad pura. Ejecuta tu rutina programada sin alteraciones.',
    duration: 1500,
    systemLog: 'STRENGTH TRAINING SEQUENCE — FORGE MODE ACTIVE.',
    completionLog: 'MUSCULAR STIMULUS APPLIED. BDNF FLOWING.',
    scienceNote: '25 minutos en ayunas es el límite perfecto para evitar degradación muscular excesiva. El entrenamiento de fuerza libera testosterona, hormona de crecimiento y BDNF — tu cerebro funciona mejor después de levantar pesas.',
    subSteps: [
      { label: 'Ejecuta tu rutina programada', description: 'La que está en tu app de fuerza — sin alteraciones ni negociación.' },
    ],
    tips: [
      'Densidad > duración: descansos de 60-90 s máximo entre series.',
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
    voiceLineBriefing: 'Fase seis. Pneuma. Cierra los ojos. Siéntate cómodo. Tres rondas: respiraciones profundas y sostenidas, y luego retén sin aire. Tu sangre se alcaliniza, la noradrenalina se dispara, tu sistema autónomo se recalibra. En altitud no fuerces nada; escucha a tu cuerpo, él sabe. Si aparece el hormigueo en las manos, es normal, solo respira. Estás limpiando por dentro.',
    directive: 'Alcalinización: 3 rondas de 30 respiraciones + retención + inhalación de rescate (15 s). En altitud NO fuerces la retención.',
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
    voiceLineBriefing: 'Fase siete. Cryo. Ahora viene la que te pone a prueba, Jugador. Entras al agua fría. Tres minutos. Tu cuerpo va a gritar que salgas; no salgas. Exhala lento. Resiste el primer impulso. Ahí, justo ahí, es donde se entrena el control emocional para todo el día. La dopamina que liberas aquí te acompaña dos, tres horas. Y termina en frío: no negocies con el calor al final. Se gana dentro.',
    directive: 'Shock neuroquímico: entra de golpe, 30 s controlando respiración, 2.5 min estático bajo el chorro, 2 min secado rápido + vestimenta de trabajo.',
    duration: 300,
    systemLog: 'COLD EXPOSURE — HORMETIC STRESS MAXIMUM.',
    completionLog: 'DOPAMINE +250% (2-3h). RECOVERY ACCELERATED.',
    scienceNote: 'Post-ejercicio el contraste térmico es más potente. Dopamina +250% sostenida 2-3 horas. El frío acelera la recuperación muscular, reduce inflamación y entrena el control prefrontal sobre la respuesta de lucha/huida.',
    subSteps: [
      { label: 'Entrada al agua fría — cuerpo entero', description: 'Sin probarla con la mano. De golpe.' },
      { label: '30 s — control de respiración activa', description: 'Suprime el reflejo de jadeo. Exhala lento.' },
      { label: '2.5 min — exposición estática bajo el chorro', description: 'Quieto, sin escapar del frío.' },
      { label: '2 min — secado rápido + vestimenta de trabajo', description: 'Ropa lista para el bloque cognitivo.' },
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
    voiceLineBriefing: 'Fase ocho. Refuel. Tu cuerpo acaba de romper músculo; ahora toca reconstruirlo. Proteína para reparar, carbohidratos complejos para reponer energía, grasas saludables para tus hormonas. Come sin pantallas, sin prisa. Mastica despacio, disfrútalo. La digestión empieza en la boca, y este es el combustible que va a mover las próximas horas. Estás nutriendo al que despertó hace una hora.',
    directive: 'Repostaje: sirve la comida e ingiérela enfocado, mirando al exterior. Preparas la transición a HELIO.',
    duration: 900,
    systemLog: 'ANABOLIC WINDOW — NUTRIENT DELIVERY ACTIVE.',
    completionLog: 'FUEL LOADED. GLYCOGEN STORES REPLENISHED.',
    scienceNote: 'La ventana anabólica post-ejercicio es el momento óptimo para nutrientes. Proteína repara el músculo, carbohidratos complejos reponen glucógeno, grasas saludables apoyan la función hormonal. Comer con calma mejora la digestión.',
    subSteps: [
      { label: 'Sirve la comida', description: 'Plato listo: proteína + carbohidratos complejos + grasas saludables.' },
      { label: 'Ingesta enfocada mirando al exterior', description: 'Ubícate visualmente hacia la ventana — preparas la transición a HELIO.' },
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
    voiceLineBriefing: 'Fase nueve. Helio. Busca la luz natural: ventana abierta, o sal al balcón un momento. Diez minutos de luz directa le dicen a tu cerebro que es de día, que despierte en serio. Tu ritmo circadiano se ancla aquí, el cortisol matutino alcanza su pico, la melatonina se retira. Mientras tanto, organiza tu escritorio. Cero objetos fuera de lugar. Un entorno limpio es una mente limpia. Configura el espacio donde vas a pensar hoy.',
    directive: 'Reseteo de entorno + circadiano: ventana de par en par hacia el horizonte, barre la habitación, alinea periféricos, dark mode absoluto y cierra las pestañas de ayer.',
    duration: 300,
    systemLog: 'CIRCADIAN SYNC + ENVIRONMENT RESET — LOCUS PROTOCOL.',
    completionLog: 'CIRCADIAN ANCHORED. WORKSPACE FRICTION: ZERO.',
    scienceNote: 'En altitud la atmósfera es más delgada: la radiación lumínica del amanecer es más potente y nítida. 5 minutos son más que suficientes para anclar tu ritmo circadiano de forma fulminante. El entorno limpio reduce la carga cognitiva parasitaria.',
    subSteps: [
      { label: 'Abre la ventana de par en par — mira al horizonte', description: 'Luz del amanecer real. En altitud el impacto lumínico es superior al nivel del mar.' },
      { label: 'Barre rápidamente la habitación', description: 'Superficie y piso despejados.' },
      { label: 'Alinea los periféricos del escritorio', description: 'Cero objetos fuera de lugar.' },
      { label: 'Dark mode absoluto en todos los monitores', description: 'Reduce fatiga visual para las horas de pantalla.' },
      { label: 'Cierra las pestañas irrelevantes de ayer', description: 'Arranca la sesión limpia.' },
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
    title: 'AISLAMIENTO SENSORIAL',
    icon: '◌',
    scheduledTime: '06:20',
    layer: 'bridge',
    kanji: '空',
    kanjiReading: 'Kū · Vacío',
    voiceLineBriefing: 'Fase diez. Void. Siéntate. Espalda recta. Ojos cerrados. Tres minutos: visualiza los problemas del día antes de que ocurran. Ese bug, esa conversación difícil, esa tentación de procrastinar. Imagínate resolviéndolos con frialdad, sin sobresalto. Los estoicos la llamaban Premeditatio Malorum: anticipar lo peor para no reaccionar cuando llegue. Luego dos minutos de silencio; solo tu respiración. Sin juzgar. Sin controlar. Observar.',
    directive: 'Aislamiento sensorial: auriculares + motor de audio, postura inamovible, ojos cerrados. Ancla la atención al aire entrando y saliendo por la nariz.',
    duration: 300,
    systemLog: 'SENSORY ISOLATION — DEEP REVERB ENGAGED.',
    completionLog: 'SENSORY FIELD COLLAPSED. ATTENTION ANCHORED.',
    scienceNote: 'El aislamiento sensorial con reverb profundo colapsa la señal ambiental y fuerza al córtex a replegarse sobre un único estímulo. Anclar la atención a la respiración nasal entrena al prefrontal a sostener foco sin distracciones externas.',
    subSteps: [
      { label: 'Colócate los auriculares', description: 'Cierra el canal auditivo del entorno.' },
      { label: 'Inicia el motor de audio', description: 'Reverb profundo + frecuencias generadas ya configuradas.' },
      { label: 'Postura inamovible, ojos cerrados', description: 'Sin ajustes ni movimiento durante los 5 minutos.' },
      { label: 'Ancla la atención a la respiración nasal', description: 'Solo el sonido del aire entrando y saliendo por la nariz.' },
    ],
    tips: [
      'Post-ducha fría = dopamina alta + mente despejada. Momento perfecto.',
      'Si la mente se va: vuelve al aire en la nariz, sin juicio.',
    ],
  },
  {
    id: 'codex',
    phase: 11,
    codename: 'CODEX',
    title: 'PROYECCIÓN TÁCTICA',
    icon: '✎',
    scheduledTime: '06:25',
    layer: 'cognitive',
    kanji: '書',
    kanjiReading: 'Sho · Escribir',
    voiceLineBriefing: 'Fase once. Codex. Coge el papel. A mano, siempre a mano; la letra activa áreas del cerebro que el teclado nunca alcanzará. Máximo tres prioridades hoy. Tres, no cuatro. Lo que no cabe en tres líneas, hoy no importa. Externalizar las tareas libera memoria para pensar, y la claridad de propósito reduce la ansiedad casi a la mitad. Está en los estudios. Escribe lo que hoy harás de ti.',
    directive: 'Proyección táctica: abre el journal, escribe la fecha y define tus 3 tareas de impacto masivo — las "ranas" innegociables del día.',
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
    title: 'ABSORCIÓN CULTURAL',
    icon: '▣',
    scheduledTime: '06:30',
    layer: 'cognitive',
    kanji: '知',
    kanjiReading: 'Chi · Conocimiento',
    voiceLineBriefing: 'Fase doce. Cipher. Diez minutos de lectura: filosofía, historia, biografías. Lo que te haga más grande. Luego cinco minutos procesando: extrae una sola idea, la más potente. Conviértela en pregunta, y después en flashcard. Active Recall más Repetición Espaciada: así funciona la memoria real. Leer por leer te hace consumidor de texto; esto te hace otra cosa. Una idea al día, multiplicada por trescientos sesenta y cinco, cambia quién eres.',
    directive: 'Absorción cultural: 10 min de lectura profunda + 5 min extrayendo una única lección fundamental y sintetizándola en flashcard.',
    duration: 900,
    systemLog: 'KNOWLEDGE ACQUISITION — ACTIVE RECALL MODE.',
    completionLog: 'DATA ASSIMILATED. SRS FLASHCARD CREATED. 6:45 AM — ARRANQUE.',
    scienceNote: 'Leer por leer no te hace culto — te hace consumidor de texto. El Active Recall (extraer una pregunta de lo leído) fuerza la consolidación sináptica. La Repetición Espaciada (SRS) previene la curva del olvido. 10 min lectura + 5 min procesamiento = retención real.',
    hasDailyInsight: true,
    subSteps: [
      { label: '10 min — Lectura profunda', description: 'Filosofía, diseño, arquitectura o historia. Libro físico ideal.' },
      { label: '5 min — Extrae una única lección fundamental', description: 'No diez ideas. UNA, la de mayor impacto.' },
      { label: 'Sintetízala en una flashcard', description: 'Garantiza retención a largo plazo (Active Recall + SRS).' },
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
  { class: 'III', title: 'OPERATOR',  titleEs: 'JUGADOR' ,   minLevel: 10, minStreak: 7,  kanji: '士', color: '#c9a227' },
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
