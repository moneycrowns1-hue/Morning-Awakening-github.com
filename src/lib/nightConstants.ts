// ═══════════════════════════════════════════════════════════════
// NIGHT PROTOCOL v2 — 8 Fases de Rendición
// Cronograma sugerido: alarma − 8 h (± 30 min gate).
// Bloque A · WIND-DOWN   (Tsuki · Nocte · Terra)   ≈ 16 min
// Bloque B · INTEGRATION (Thermo · Stillness · Scribe) ≈ 19 min
// Bloque C · SURRENDER   (Reverie · Slumber)       ≈ 10 min + ∞
// Tono: íntimo/contemplativo en 2ª persona (no "Operador").
// ═══════════════════════════════════════════════════════════════

import type { SubStep } from './constants';

export type NightBlock = 'wind-down' | 'integration' | 'surrender';

export interface NightMission {
  id: string;
  phase: number;
  codename: string;
  title: string;
  icon: string;
  kanji: string;
  kanjiReading: string;
  block: NightBlock;
  blockLabel: string;
  /** Seconds. `slumber` uses 0 (open-ended, ends when user taps or sleeps). */
  duration: number;
  /** Also included in express mode (4 fases ≈ 15 min). */
  express: boolean;
  /** Express-mode duration override (seconds). */
  durationExpress?: number;
  directive: string;
  systemLog: string;
  completionLog: string;
  scienceNote: string;
  voiceLineBriefing: string;
  subSteps?: SubStep[];
  tips?: string[];
  /** Overlay the component hooks into for this phase: breath|journal|read|lock. */
  interaction?: 'breath' | 'journal' | 'read' | 'lock';
}

export const NIGHT_MISSIONS: NightMission[] = [
  // ═══ BLOQUE A · WIND-DOWN ═══
  {
    id: 'tsuki',
    phase: 1,
    codename: 'TSUKI',
    title: 'CIERRE',
    icon: '◐',
    kanji: '月',
    kanjiReading: 'Tsuki · Luna',
    block: 'wind-down',
    blockLabel: 'BLOQUE A · WIND-DOWN',
    duration: 180,
    express: true,
    durationExpress: 120,
    directive: 'Apaga pantallas principales, atenúa las luces a ámbar cálido y cámbiate a ropa cómoda. Deja el teléfono en modo noche lejos de la cama.',
    systemLog: 'Cerrando el día...',
    completionLog: 'Día entregado. Este cuarto ahora es tuyo.',
    scienceNote: 'La luz azul suprime la melatonina hasta 3 horas. Atenuar y entibiar el entorno 60–90 min antes de dormir adelanta la "señal de noche" al núcleo supraquiasmático y facilita conciliar el sueño.',
    voiceLineBriefing:
      'Este día ya no te pertenece. Déjalo aquí, sobre la mesa, y apaga lo que brilla. Atenúa la luz hasta que sea ámbar, hasta que parezca una vela. Cámbiate. Deja el teléfono lejos. No hay nada allá afuera que no pueda esperar a mañana. Este cuarto, desde ahora, es tu refugio.',
    subSteps: [
      { label: 'Apaga pantallas principales', description: 'TV, laptop, monitor. El teléfono pasa a modo noche.' },
      { label: 'Atenúa las luces', description: 'Solo cálidas, ámbar suave. Evita cenitales frías.' },
      { label: 'Cámbiate a ropa cómoda', description: 'Pijama o ropa suelta. Marca la transición corporal.' },
      { label: 'Aleja el teléfono', description: 'Fuera del alcance del brazo desde la cama.' },
    ],
    tips: [
      'Deja lista ropa para mañana — evitarás fricción al levantarte.',
      'Una bombilla ámbar de $5 cambia radicalmente la señal circadiana.',
    ],
  },
  {
    id: 'nocte',
    phase: 2,
    codename: 'NOCTE',
    title: 'INTEGRAR',
    icon: '◑',
    kanji: '夕',
    kanjiReading: 'Yū · Atardecer',
    block: 'wind-down',
    blockLabel: 'BLOQUE A · WIND-DOWN',
    duration: 300,
    express: false,
    directive: 'Si aún no cenaste: cena ligera (proteína magra + vegetales) y una infusión (manzanilla, tila o valeriana). Si ya lo hiciste: 5 min de integración sensorial lenta con el té.',
    systemLog: 'Metabolismo calmándose...',
    completionLog: 'Nutrido y asentado.',
    scienceNote: 'Cenar 3 h antes de dormir reduce reflujo y mejora la arquitectura del sueño. Manzanilla y valeriana potencian GABA, el principal neurotransmisor inhibitorio: el cuerpo literalmente "baja revoluciones".',
    voiceLineBriefing:
      'Llegó el momento de alimentarte con suavidad. Si no has cenado, hazlo ligero — proteína, vegetales, nada pesado que tu digestión cargue a las dos de la mañana. Y una infusión caliente, entre tus manos. Siente la tibieza subir por los dedos. No es solo comer; es decirle al cuerpo que está a salvo, que hoy también recibió.',
    tips: [
      'Evita azúcar y cafeína después de las 17:00 — la vida media de la cafeína es 6 h.',
      'La infusión caliente también ayuda a bajar la T° core al enfriarse.',
    ],
  },
  {
    id: 'terra',
    phase: 3,
    codename: 'TERRA',
    title: 'CAMINAR',
    icon: '◒',
    kanji: '歩',
    kanjiReading: 'Aruku · Caminar',
    block: 'wind-down',
    blockLabel: 'BLOQUE A · WIND-DOWN',
    duration: 480,
    express: false,
    directive: 'Caminata lenta 8 min (interior o exterior) o, si no puedes salir, movilidad suave en el piso: abrir caderas, torsión espinal, gato-camello lento.',
    systemLog: 'Digestión en marcha...',
    completionLog: 'Cuerpo en paz.',
    scienceNote: 'Una caminata lenta post-cena reduce el pico de glucosa hasta 30 % y activa el sistema parasimpático (reposo-digestión). La movilidad lenta libera tensión del día sin elevar cortisol como lo haría el cardio.',
    voiceLineBriefing:
      'Mueve el cuerpo una última vez. No para entrenar, no para quemar nada. Solo para caminar. Lento. Observando. Si puedes salir, sal. Si no, abre las caderas en el piso, suelta la columna, respira en cada estiramiento. Le estás diciendo a tu sistema nervioso que la jornada terminó, y que puede apagarse.',
  },

  // ═══ BLOQUE B · INTEGRATION ═══
  {
    id: 'thermo',
    phase: 4,
    codename: 'THERMO',
    title: 'AGUA CALIENTE',
    icon: '◓',
    kanji: '湯',
    kanjiReading: 'Yu · Agua caliente',
    block: 'integration',
    blockLabel: 'BLOQUE B · INTEGRATION',
    duration: 600,
    express: false,
    directive: 'Ducha o baño caliente de 8–10 min, 60–90 min antes de dormir. Al salir, no te seques del todo — deja que tu piel termine de enfriarse sola.',
    systemLog: 'Vasodilatación periférica...',
    completionLog: 'Temperatura core bajando — ventana de melatonina abierta.',
    scienceNote: 'El agua caliente dilata los vasos de manos y pies, y al salir la temperatura core del cuerpo cae rápidamente. Esa caída es el disparador biológico #1 de la liberación de melatonina.',
    voiceLineBriefing:
      'Agua caliente, diez minutos, sin apuros. No es para limpiarte; ya estás limpio. Es para engañar al cuerpo. Sal, y no te seques del todo. La piel, al perder el calor, va a hundir tu temperatura central, y tu cerebro entenderá esa señal mejor que cualquier pastilla. Es cuando la melatonina se derrama.',
    tips: [
      'Ideal: terminar la ducha 60–90 min antes de tu Sleep Gate.',
      'Termina con 20 s de agua tibia si el contraste te gusta — no frío.',
    ],
  },
  {
    id: 'stillness',
    phase: 5,
    codename: 'STILLNESS',
    title: 'RESPIRACIÓN',
    icon: '◔',
    kanji: '静',
    kanjiReading: 'Sei · Quietud',
    block: 'integration',
    blockLabel: 'BLOQUE B · INTEGRATION',
    duration: 240,
    express: true,
    durationExpress: 240,
    directive: 'Respiración 4-7-8 × 4 ciclos con la mascota luna guiándote. Sentado cómodo o acostado. Lengua contra paladar superior.',
    systemLog: 'Parasimpático activado.',
    completionLog: 'Ritmo cardíaco bajo. Estás en calma.',
    scienceNote: '4-7-8 eleva la dominancia vagal y baja la frecuencia cardíaca ~10 bpm en 4 ciclos. Una HRV alta al dormir se correlaciona con sueño más profundo y más tiempo en SWS.',
    voiceLineBriefing:
      'Respira conmigo. Cuatro adentro, siete quietos, ocho afuera. No hay prisa. La luna va a acompañarte: cuando ella se expande, tú inhalas; cuando se sostiene, tú sostienes; cuando se contrae, tú sueltas. Cuatro veces. Basta con cuatro. Vas a notar cómo el pulso baja solo.',
    interaction: 'breath',
  },
  {
    id: 'scribe',
    phase: 6,
    codename: 'SCRIBE',
    title: 'TINTA',
    icon: '◕',
    kanji: '墨',
    kanjiReading: 'Sumi · Tinta',
    block: 'integration',
    blockLabel: 'BLOQUE B · INTEGRATION',
    duration: 300,
    express: true,
    durationExpress: 180,
    directive: 'Escribe 3 agradecimientos concretos del día, y las 3 prioridades innegociables de mañana. Una frase por cosa. No edites.',
    systemLog: 'Descarga cognitiva...',
    completionLog: 'Mente vaciada. Mañana ya está decidido.',
    scienceNote: 'El volcado mental pre-sueño ("worry journal") reduce el tiempo de latencia al dormir ~27 %. Escribir las prioridades de mañana le dice a tu corteza prefrontal que puede soltarlas.',
    voiceLineBriefing:
      'Saca el día de la cabeza y ponlo en papel. Tres cosas por las que estás agradecido, concretas, no genéricas. Luego tres cosas que mañana pasan sí o sí. Una frase cada una. Sin editar, sin adornar. Cuando lo escribes, tu mente deja de repetirlo en bucle. El papel recuerda por ti.',
    interaction: 'journal',
  },

  // ═══ BLOQUE C · SURRENDER ═══
  {
    id: 'reverie',
    phase: 7,
    codename: 'REVERIE',
    title: 'SUEÑO DESPIERTO',
    icon: '○',
    kanji: '夢',
    kanjiReading: 'Yume · Sueño',
    block: 'surrender',
    blockLabel: 'BLOQUE C · SURRENDER',
    duration: 600,
    express: false,
    directive: 'Lectura contemplativa en papel o e-reader sin retroiluminación: ficción, poesía, ensayo lento. Nada técnico, nada de tu trabajo, nada que exija resolver algo.',
    systemLog: 'Ondas alfa subiendo...',
    completionLog: 'Cerebro en modo divagación. Listo para cerrar los ojos.',
    scienceNote: '10 min de lectura contemplativa bajan el estrés 68 % (Univ. Sussex) y deslizan el EEG hacia alfa. Evita cualquier lectura que active el circuito de resolución de problemas.',
    voiceLineBriefing:
      'Lee algo que no tengas que entender. Una historia, un poema, algo lento. Diez minutos bastan. No hay que terminar el capítulo. No hay que memorizar nada. Deja que las palabras pasen por ti, como agua. En algún momento vas a notar que los ojos pesan. Ese es el permiso para cerrar el libro.',
    interaction: 'read',
    tips: [
      'Papel o e-reader sin retroiluminación — no tablet ni teléfono.',
      'Si lees en cama, posición semi-acostada, luz cálida puntual.',
    ],
  },
  {
    id: 'slumber',
    phase: 8,
    codename: 'SLUMBER',
    title: 'ENTREGA',
    icon: '●',
    kanji: '眠',
    kanjiReading: 'Nemuri · Dormir',
    block: 'surrender',
    blockLabel: 'BLOQUE C · SURRENDER',
    duration: 0,
    express: true,
    durationExpress: 0,
    directive: 'Pantalla mínima: mascota luna, hora, ventana de sueño y alarma. Cierra los ojos cuando estés listo.',
    systemLog: 'Slumber Lock activo.',
    completionLog: 'Protocolo completo. Dulces sueños.',
    scienceNote: 'Una pantalla final estable y oscura, sin notificaciones, funciona como ancla anti-rumiación. El cerebro asocia esta imagen con la transición a dormir tras 7–10 repeticiones.',
    voiceLineBriefing:
      'Lo hiciste. Las ocho puertas están cerradas. Ahora solo queda una cosa, y no la eliges tú: la entregas. Cierra los ojos cuando quieras. La luna se queda contigo. Mañana esto se repite, pero por ahora, solo suelta.',
    interaction: 'lock',
  },
];

/** IDs of fases incluidas en el modo express (≈15 min). */
export const EXPRESS_PHASE_IDS = NIGHT_MISSIONS.filter((m) => m.express).map((m) => m.id);

/** Returns the filtered mission list for the selected mode. */
export function getNightMissions(mode: 'full' | 'express'): NightMission[] {
  if (mode === 'full') return NIGHT_MISSIONS;
  return NIGHT_MISSIONS.filter((m) => m.express);
}

/** Total seconds for the given mode (excluding slumber's open-ended 0). */
export function totalNightDuration(mode: 'full' | 'express'): number {
  const list = getNightMissions(mode);
  return list.reduce((acc, m) => {
    const d = mode === 'express' ? (m.durationExpress ?? m.duration) : m.duration;
    return acc + d;
  }, 0);
}
