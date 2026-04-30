// ═══════════════════════════════════════════════════════════════
// MORNING AWAKENING · GÉNESIS v5.0 — 13 Fases
// Cronograma: 5:00 AM – 6:50 AM (110 min)
// Bloque 1 · LA FRAGUA OSCURA     (GENESIS · AQUA · FLEX · SURGE · FORGE · PNEUMA · CRYO)
// Bloque 2 · VENTANA ANABÓLICA    (REFUEL · higiene de transición)
// Bloque 3 · EL FILO COGNITIVO    (HELIO · SILENTIUM · AXIS · LECTIO)
// Cierre    · EL ANCLAJE FINAL    (SIGILLUM — higiene dental de élite)
// ═══════════════════════════════════════════════════════════════

export interface SubStep {
  label: string;
  description: string;
  optional?: boolean;
}

export type AudioLayer = 'ignition' | 'bridge' | 'cognitive';

/** Modos del protocolo Génesis (resueltos por `genesisAdapter`). */
export type GenesisMode = 'full' | 'express' | 'recovery';

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
  /**
   * Modos en los que se incluye esta fase. Por defecto `['full']`
   * en cada definición de abajo explícito. El adapter usa esto para
   * filtrar la lista según el contexto (sleep debt, time pressure,
   * day profile).
   */
  includeIn: GenesisMode[];
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
    voiceLineBriefing: 'Fase uno. Génesis. Así empieza todo, Jugador. Antes de abrir los ojos del todo, dedica el primer pensamiento del día a Dios. Gratitud antes que cualquier otra cosa — ese es el anclaje espiritual que define el propósito de las próximas horas. Ahora pies al suelo, sin negociar. Abre persianas y ventana: en Ambato, a esta altitud, purgar el CO₂ acumulado es vital para que el cerebro despierte de verdad. Tiende la cama, impecable. Esa cama hecha es la primera victoria del día, y tu cerebro la registra. Acabas de decirle a tu mente: hoy gano yo. Vamos.',
    directive: 'Inicialización del sistema: gratitud a Dios, higiene ambiental (persianas + ventana para purgar CO₂ en altitud), primera victoria (cama tendida).',
    duration: 60,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'INITIALIZING GÉNESIS PROTOCOL v5.0...',
    completionLog: 'OPERATOR ONLINE. FIRST VICTORY REGISTERED.',
    scienceNote: 'Posponer la alarma fragmenta el sueño REM. El ritual de apertura (gratitud espiritual + luz + ventilación + cama) encadena varios Quick Wins en los primeros 60 segundos. En altitud (+2500 m) el CO₂ nocturno del cuarto se acumula más rápido — ventilar es el primer oxígeno real del día.',
    subSteps: [
      { label: 'Apaga la alarma — cero snooze', description: 'Al primer timbre. El snooze fragmenta el sueño REM.' },
      { label: 'Agradecimiento a Dios', description: 'El primer pensamiento del día antes de poner un pie en el suelo — anclaje espiritual y propósito.' },
      { label: 'Higiene ambiental · persianas + ventana', description: 'Luz directa + aire fresco. En Ambato purgar el CO₂ nocturno es vital para el cerebro.' },
      { label: 'Primera victoria · cama tendida', description: 'Sábanas estiradas, almohadas alineadas. Elimina la fricción mental inicial.' },
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
    includeIn: ['full', 'express', 'recovery'],
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
    includeIn: ['full', 'recovery'],
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
    includeIn: ['full'],
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
    voiceLineBriefing: 'Fase cinco. Forge. Aquí no hay excusas, Jugador. Veinticinco minutos de tensión mecánica pura — la intensidad es innegociable. Empuje. Tracción. Piernas. Núcleo. Descansos cortos, sesenta segundos y ni uno más. Forma antes que carga, siempre. En ayunas tu cuerpo está liberando testosterona, hormona de crecimiento y — lo más importante — B D N F: el fertilizante de neuronas nuevas que vas a necesitar hoy en histología y anatomía. Cada serie que levantas en serio es plasticidad neuronal que se traduce, horas después, en retención de lo que estudies. Cierra con el núcleo. Gánate el desayuno.',
    directive: 'Tensión mecánica: 25 minutos de hipertrofia con tu app de fuerza. Intensidad innegociable — buscas BDNF para la plasticidad neuronal que usarás en histología y anatomía.',
    duration: 1500,
    includeIn: ['full'],
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
    includeIn: ['full', 'recovery'],
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
    includeIn: ['full'],
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

  // ═══ BLOQUE 2: VENTANA ANABÓLICA (5:58 - 6:18) ═══
  // Skincare se separó de REFUEL: ahora vive en su propia fase
  // AURORA, justo después de CRYO, para aprovechar la ventana de
  // absorción post-ducha (~5 min en que la piel retiene 30 % más
  // humedad y la barrera lípidica está receptiva). Drenaje linfático
  // se mueve aquí para aprovechar la vasodilatación de rebote tras
  // el frío. REFUEL queda enfocado en alimento + higiene bucal.
  {
    id: 'aurora',
    phase: 8,
    codename: 'AURORA',
    title: 'CUIDADO FACIAL POST-CRYO',
    icon: '◉',
    blockLabel: 'BLOQUE 2 · VENTANA ANABÓLICA',
    scheduledTime: '05:58',
    layer: 'bridge',
    kanji: '光',
    kanjiReading: 'Hikari · Luz',
    voiceLineBriefing: 'Fase ocho. Aurora. Acabas de salir del frío. La piel está tensa, los poros cerrados pero la barrera está limpia y receptiva. El truco es no rascar — pat seco, dejando la cara ligeramente húmeda. Si toca drenaje linfático, ahora es el momento: dos cucharadas pequeñas de aceite mineral, el Johnson sirve como slip puro porque no penetra y lo limpias después. Movimientos siempre direccionales hacia las cláviculas, cinco minutos máximo. Después enjuagas el residuo con agua fresca, y aplicas los activos sobre la piel todavía algo húmeda: tónico, sérum, contorno con el dedo anular, hidratante con S P F para sellar. La vaselina puntual al final, en labios y comisuras. La piel post-cryo absorbe los activos como una esponja seca; aprovecha esa ventana de cinco minutos.',
    directive: 'Cuidado facial sobre piel post-cryo (poros tensos, barrera limpia): pat seco, drenaje linfático opcional con aceite Johnson como slip, enjuague suave, activos en cascada (tónico → sérum → contorno → hidratante con SPF → vaselina puntual).',
    duration: 480,
    includeIn: ['full', 'recovery'],
    systemLog: 'POST-CRYO ABSORPTION WINDOW — DERMAL UPTAKE MAX.',
    completionLog: 'BARRIER SEALED. SPF ACTIVE. DRAINAGE COMPLETE.',
    scienceNote: 'La piel inmediatamente post-shower retiene ~30 % más humedad y la barrera lipídica está parcialmente extraída — los activos hidratantes (humectantes, péptidos, ceramidas) penetran 2–3× más profundo cuando se aplican sobre piel húmeda. El drenaje linfático en este momento aprovecha la vasodilatación de rebote tras el frío: el flujo linfático se acelera y la cara desinfla. El aceite mineral del Johnson (sin fragancia, no comedogénico en uso puntual) funciona como slip ideal porque NO penetra: actúa solo como lubricación superficial y se retira con agua. SPF desde el amanecer es no negociable, incluso en interiores junto a ventanas (el UVA atraviesa el vidrio).',
    subSteps: [
      { label: 'Pat seco con toalla limpia', description: 'Sin frotar. Deja la piel ligeramente húmeda — la humedad de fondo es el vehículo de los activos.' },
      { label: 'Drenaje linfático opcional · 5 min', description: 'Solo si tienes la cara hinchada o tiempo extra. Dos cucharadas de aceite Johnson como slip, movimientos hacia las cláviculas. Abre el módulo del Hub Bienestar para la coreografía.' },
      { label: 'Enjuague rápido del residuo de aceite', description: 'Agua fresca para retirar el slip antes de aplicar los activos. El aceite mineral no debe quedar como hidratante en la cara.' },
      { label: 'Tónico / spray hidratante', description: 'Reequilibra el pH y prepara la barrera para los activos.' },
      { label: 'Sérum · activos concentrados', description: 'Vitamina C, niacinamida, péptidos. Sobre piel todavía húmeda — penetración 2–3× mayor.' },
      { label: 'Contorno de ojos con dedo anular', description: 'Toques suaves, zona más delgada y sensible. Antes de la crema general.' },
      { label: 'Hidratante con SPF', description: 'Sella la rutina y bloquea UVA/UVB desde el amanecer. SPF 30+ no negociable.' },
      { label: 'Vaselina · slugging puntual', description: 'Capa fina en labios, alas de la nariz y comisuras. Sella humedad sin comedogenicidad si se aplica al final.' },
    ],
    tips: [
      'La ventana óptima de absorción dura ~5 min post-shower — aplica todo en este margen.',
      'Si solo tienes Johnson, úsalo como slip de drenaje y enjuagalo. NO lo dejes como hidratante facial.',
      'SPF dentro de casa también — el UVA pasa a través del vidrio de las ventanas.',
    ],
  },
  {
    id: 'refuel',
    phase: 9,
    codename: 'REFUEL',
    title: 'DESAYUNO',
    icon: '◆',
    scheduledTime: '06:06',
    layer: 'cognitive',
    kanji: '糎',
    kanjiReading: 'Ryō · Sustento',
    voiceLineBriefing: 'Fase nueve. Refuel. Tu cuerpo acaba de romper músculo; ahora toca reconstruirlo. Proteína, carbohidratos complejos, grasas saludables. Come sin pantallas, sin prisa. Mastica despacio. Si ya pasaron noventa minutos desde que te despertaste, ahora sí — tu primer café. Al terminar, enjuágate la boca solo con agua, no te cepilles todavía. El ácido de la comida bajó el pH del esmalte, y cepillar ahora lo desgasta. Esperamos al cierre del protocolo para el cepillado de élite.',
    directive: 'Repostaje nutricional + higiene bucal de transición: desayuno enfocado (proteína, carbos complejos, grasas saludables) sin pantallas, café si pasaron 90 min desde el despertar, y enjuague bucal con agua para limpiar residuos sin abrasión. El cepillado va al final del protocolo.',
    duration: 600,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'ANABOLIC WINDOW — NUTRIENT DELIVERY ACTIVE.',
    completionLog: 'FUEL LOADED. GLYCOGEN STORES REPLENISHED.',
    scienceNote: 'La ventana anabólica post-ejercicio es el momento óptimo para nutrientes. Tras comer, el pH bucal baja por ~30 min: cepillarse inmediatamente erosiona el esmalte. Enjuagar con agua limpia residuos sin abrasión, y el cepillado se pospone al ANCLAJE FINAL, cuando el pH se ha recuperado.',
    subSteps: [
      { label: 'Desayuno · proteína + carbos complejos + grasas', description: 'Reparación muscular + reposición de glucógeno + soporte hormonal.' },
      { label: 'Café · si pasaron 90+ min desde el despertar', description: 'Regla Huberman: la adenosina ya se aclaró de forma natural y el café refuerza vigilia ya existente, sin enmascarar fatiga.' },
      { label: 'Enjuague bucal · solo con agua', description: 'Quita residuos sin abrasión. El cepillado va al cierre del protocolo, cuando el pH del esmalte se haya estabilizado.' },
    ],
    tips: [
      'Si corriste fuerte: más carbohidratos. Si fue Zona 2: más proteína.',
      'Sin pantallas durante la comida — el sistema parasimpático necesita silencio digital para digerir.',
    ],
  },

  // ═══ BLOQUE 3: EL FILO COGNITIVO (6:16 - 6:46) ═══
  // HELIO · SILENTIUM · AXIS · LECTIO
  {
    id: 'helio',
    phase: 10,
    codename: 'HELIO',
    title: 'LUZ SOLAR + ENTORNO',
    icon: '☀',
    blockLabel: 'BLOQUE 3 · EL FILO COGNITIVO',
    scheduledTime: '06:16',
    layer: 'cognitive',
    kanji: '陽',
    kanjiReading: 'Yō · Sol',
    voiceLineBriefing: 'Fase diez. Helio. Busca la luz natural: ventana abierta, ojos al horizonte. Cinco minutos de luz directa le dicen al núcleo supraquiasmático que es de día en serio — el cortisol matutino alcanza su pico, la melatonina se retira. En altitud esta luz es más pura y más rápida. Una gota de lubricante artificial en cada ojo si los sientes secos por la noche, hidrata la córnea antes de las próximas horas de pantalla. Deja la ventana entreabierta unos quince centímetros para que el aire siga renovándose mientras estudias — la temperatura ideal del cuarto está entre los dieciocho y veinte grados. Mientras tanto, organiza tu escritorio: dark mode absoluto en los monitores, libros de histología y visores médicos listos para cuando arranques. Un entorno inmaculado es una mente sin fricciones.',
    directive: 'Sincronización circadiana + locus: luz al horizonte por la ventana abierta, gotero ocular si toca, ventilación controlada del cuarto (18–20 °C), organiza escritorio, dark mode absoluto y deja libros y visores médicos listos para estudiar.',
    duration: 300,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'CIRCADIAN SYNC + LOCUS — ENVIRONMENT RESET.',
    completionLog: 'CIRCADIAN ANCHORED. WORKSPACE FRICTION: ZERO.',
    scienceNote: 'En altitud la atmósfera es más delgada: la radiación lumínica del amanecer es más potente y nítida. 5 minutos de luz directa anclan el ritmo circadiano de forma fulminante. La película lagrimal se evapora durante el sueño y la córnea amanece reseca — una gota de lágrima artificial sin conservantes restablece el espesor lagrimal antes de las horas frente a pantallas. La ventilación continua mantiene el CO₂ ambiental por debajo de 1000 ppm (umbral en el que la cognición cae mensurablemente). El entorno médico pre-configurado reduce la carga cognitiva parasitaria antes del estudio.',
    subSteps: [
      { label: 'Mira al horizonte · ventana abierta', description: 'Luz del amanecer directa a la retina. En altitud el impacto lumínico supera al nivel del mar.' },
      { label: 'Gotero ocular · una gota por ojo', description: 'Lubricante artificial sin conservantes. Hidrata la córnea reseca por la noche y prepara los ojos para 90+ min de pantalla.' },
      { label: 'Ventila el cuarto · ventana entreabierta', description: 'Deja la ventana 10–15 cm abierta para mantener el cuarto entre 18 y 20 °C y el CO₂ por debajo de 1000 ppm. Aire fresco en altitud = cognición nítida.' },
      { label: 'Organiza el escritorio', description: 'Superficie despejada, periféricos alineados, cero fricción visual.' },
      { label: 'Dark mode absoluto', description: 'Monitores, IDE, navegador y apps médicas en tema oscuro.' },
      { label: 'Libros y visores médicos listos', description: 'Histología, anatomía, atlas. Todo al alcance para arrancar sin buscar.' },
    ],
    tips: [
      'El entorno inmaculado reduce decisiones innecesarias (fatiga decisional).',
      'Si no tienes gotero, parpadea fuerte 20 veces — reactiva las glándulas de Meibomio.',
      'Luces lineales en posición para cuando baje el sol natural.',
    ],
  },
  {
    id: 'silentium',
    phase: 11,
    codename: 'SILENTIUM',
    title: 'AISLAMIENTO SENSORIAL',
    icon: '◌',
    scheduledTime: '06:20',
    layer: 'bridge',
    kanji: '静',
    kanjiReading: 'Sei · Silencio',
    voiceLineBriefing: 'Fase once. Silentium. Siéntate. Espalda recta. Ojos cerrados. Audio de alta fidelidad en los auriculares. Cinco minutos para estabilizar la dopamina antes del bombardeo de información académica que viene. Ancla la atención al aire entrando y saliendo por la nariz. La mente va a irse — vuélvela, sin juicio. Los estoicos lo llamaban premeditatio malorum: anticipar las fricciones del día para no reaccionar cuando lleguen. Imagínate resolviendo con frialdad lo que sabes que te va a costar. Luego, silencio puro.',
    directive: 'Aislamiento sensorial: auriculares + audio de alta fidelidad, postura inamovible, ojos cerrados. Silencio mental para estabilizar la dopamina antes del estudio.',
    duration: 300,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'SENSORY ISOLATION — DEEP REVERB ENGAGED.',
    completionLog: 'DOPAMINE STABILIZED. ATTENTION ANCHORED.',
    scienceNote: 'La meditación con audio envolvente colapsa la señal ambiental y fuerza al córtex a replegarse sobre un único estímulo. Estabilizar la dopamina antes de estudiar aumenta la capacidad de sostener foco académico 40-90 min sin búsqueda de recompensa.',
    subSteps: [
      { label: 'Auriculares · audio de alta fidelidad', description: 'Cierra el canal auditivo del entorno.' },
      { label: 'Postura inamovible · ojos cerrados', description: 'Sin ajustes ni movimiento durante los 5 minutos.' },
      { label: 'Respiración nasal como ancla', description: 'Solo el sonido del aire entrando y saliendo por la nariz.' },
      { label: 'Premeditatio Malorum', description: 'Visualiza las fricciones del día resolviéndose con frialdad.' },
    ],
    tips: [
      'Post-ducha fría = dopamina alta + mente despejada. Momento perfecto.',
      'Si la mente se va: vuelve al aire en la nariz, sin juicio.',
      'Si notas la mandíbula tensa al aterrizar, abre el módulo Bruxismo del Hub Bienestar tras Silentium.',
    ],
  },
  {
    id: 'axis',
    phase: 12,
    codename: 'AXIS',
    title: 'PROYECCIÓN TÁCTICA',
    icon: '✎',
    scheduledTime: '06:25',
    layer: 'cognitive',
    kanji: '軸',
    kanjiReading: 'Jiku · Eje',
    voiceLineBriefing: 'Fase doce. Axis. Coge el papel. A mano, siempre a mano — la letra activa áreas del cerebro que el teclado nunca alcanzará. Anota la fecha y define las tres Ranas del día: las tareas académicas críticas, las que si solo hicieras esas, el día ya sería una victoria. Tres, no cuatro. Lo que no cabe en tres líneas, hoy no importa. Este es el eje sobre el que giran las próximas doce horas. Escríbelo.',
    directive: 'Proyección táctica: journaling en papel. Anota la fecha y define tus 3 Ranas — las tareas académicas críticas e innegociables del día.',
    duration: 300,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'COGNITIVE CLARITY MODULE — TASK MAPPING.',
    completionLog: 'MISSION OBJECTIVES DEFINED. MENTAL CLUTTER: ZERO.',
    scienceNote: 'Escribir a mano activa áreas cerebrales que el teclado no alcanza. Externalizar las tareas del día libera memoria de trabajo (RAM mental). La claridad de propósito reduce la ansiedad un 43 % (Journal of Clinical Psychology).',
    hasJournaling: true,
    tips: [
      'Escribe a mano. La escritura manual activa más redes neuronales.',
      'Máximo 3 Ranas. Más = parálisis por análisis.',
      'Si no sabes qué escribir: "Ahora mismo siento..."',
    ],
  },
  {
    id: 'lectio',
    phase: 13,
    codename: 'LECTIO',
    title: 'PRE-ESTUDIO · FILO COGNITIVO',
    icon: '▣',
    scheduledTime: '06:30',
    layer: 'cognitive',
    kanji: '読',
    kanjiReading: 'Doku · Lectura',
    voiceLineBriefing: 'Fase trece. Lectio. Quince minutos para afilar el filo cognitivo. Empieza con lectura de cultura general o filosofía — lo que te haga más grande. Luego una revisión rápida de los temas que verás hoy en la facultad: histología, anatomía, lo que toque. No estudias a fondo, solo calientas el cerebro médico: le muestras al hipocampo el mapa de lo que viene para que la consolidación del día sea más limpia. Extrae una sola idea potente antes de cerrar el libro. Una, no diez.',
    directive: 'Pre-estudio: 10 min de lectura de cultura general o filosofía + 5 min de revisión rápida de los temas de la facultad de hoy. Calentamiento para el cerebro médico.',
    duration: 900,
    includeIn: ['full', 'recovery'],
    systemLog: 'KNOWLEDGE ACQUISITION — ACTIVE RECALL MODE.',
    completionLog: 'COGNITIVE EDGE ACTIVATED. MEDICAL BRAIN ONLINE.',
    scienceNote: 'Leer antes de estudiar desplaza el EEG hacia alfa/theta, estado óptimo para absorber información. Revisar el índice de lo que verás hoy funciona como "pre-cargar el caché" — el hipocampo crea ganchos previos que hacen la consolidación de la clase ~30 % más eficiente.',
    hasDailyInsight: true,
    subSteps: [
      { label: '10 min · lectura de cultura o filosofía', description: 'Marco Aurelio, Séneca, historia. Papel ideal.' },
      { label: '5 min · revisión rápida de temas de facultad', description: 'Histología, anatomía, lo que toque hoy. Solo el mapa, no el detalle.' },
      { label: 'Extrae una única lección fundamental', description: 'Una sola, la de mayor impacto. Síntesis en flashcard.' },
    ],
    tips: [
      'Papel/e-reader sin retroiluminación — no tablet ni teléfono.',
      'El objetivo no es estudiar, es calentar el cerebro médico.',
      'Active Recall + SRS son el único modo en que lo leído se queda.',
    ],
  },

  // ═══ CIERRE · EL ANCLAJE FINAL (6:45 - 6:50) ═══
  {
    id: 'sigillum',
    phase: 14,
    codename: 'SIGILLUM',
    title: 'EL ANCLAJE FINAL',
    icon: '✚',
    blockLabel: 'CIERRE · EL ANCLAJE FINAL',
    scheduledTime: '06:45',
    layer: 'cognitive',
    kanji: '印',
    kanjiReading: 'In · Sello',
    voiceLineBriefing: 'Fase catorce. Sigillum. El sello. Ahora sí, el pH de tu boca se ha estabilizado y el esmalte está listo: cepíllate los dientes con rigor. Hilo dental, cepillo con técnica, enjuague. El frescor final de la pasta es la señal neurológica inequívoca de que el entrenamiento terminó y empieza la ejecución. El protocolo Génesis está cerrado. Estás biológicamente optimizado, espiritualmente enfocado y listo para conquistar el núcleo del día.',
    directive: 'Higiene dental de élite en 3 pasos secuenciales: hilo dental → cepillado riguroso → enjuague bucal. Ahora que el pH bucal se estabilizó, el cepillado protege sin erosionar. El frescor final sella el protocolo y da inicio a la ejecución operativa.',
    duration: 300,
    includeIn: ['full', 'express', 'recovery'],
    systemLog: 'FINAL SEAL — DENTAL HYGIENE ELITE.',
    completionLog: 'GÉNESIS COMPLETE. READY TO CONQUER THE CORE.',
    scienceNote: 'Tras 45 min post-ingesta, el pH bucal vuelve a neutro y el esmalte ya no está desmineralizado: es cuando el cepillado protege sin erosionar. El orden importa: hilo PRIMERO desplaza la placa interproximal hacia donde el cepillo puede alcanzarla, y el enjuague final arrastra todo lo desplazado. Además, el frescor de la menta actúa como "imprinting" sensorial — el cerebro asocia esa señal con la transición de preparación → ejecución.',
    subSteps: [
      { label: 'Hilo dental', description: 'Primer paso obligatorio: remueve residuos y placa interproximal donde el cepillo no llega.' },
      { label: 'Cepillado · técnica Bass', description: '45° hacia la encía, movimientos cortos vibratorios, 2 minutos completos. Incluye lengua — ahí está el 70 % de la carga bacteriana.' },
      { label: 'Enjuague bucal', description: 'Colutorio (con o sin alcohol). Arrastra lo que el cepillo desplazó y deja barrera antibacteriana. El frescor marca el fin del protocolo.' },
    ],
    tips: [
      'Cepillarse antes de desayunar erosiona el esmalte — por eso se hace ahora.',
      'Cepillo de cerdas suaves + pasta con flúor. Cambiar cepillo cada 3 meses.',
      'Este es el último paso: ya estás listo para conquistar el día.',
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
