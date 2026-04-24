// ═══════════════════════════════════════════════════════════════
// NIGHT PROTOCOL · TÉRMINUS (v3 — definitivo)
// Cronograma anclado al sueño, no a la alarma.
//
//   BLOQUE 0 · CIERRE METABÓLICO       — CLAUSURA · ÓPTICA · SEQUÍA
//   BLOQUE 1 · DESCOMPRESIÓN Y LIMPIEZA — TERMINUS · AEGIS · THERMA · HYGIENE
//   BLOQUE 2 · EL SANTUARIO (ámbar)    — KATHARSIS · PARASÍMPATO
//   BLOQUE 3 · APAGADO NEURONAL        — STASIS
//
// Tono: íntimo / contemplativo en 2ª persona.
// ═══════════════════════════════════════════════════════════════

import type { SubStep } from './constants';

export type NightBlock = 'metabolic' | 'descompression' | 'sanctuary' | 'shutdown';

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
  /** Seconds. */
  duration: number;
  /** Included in express mode (~15 min). */
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
  // ═══ BLOQUE 0 · CIERRE METABÓLICO ═══
  {
    id: 'clausura',
    phase: 1,
    codename: 'CLAUSURA',
    title: 'CIERRE METABÓLICO',
    icon: '◐',
    kanji: '閉',
    kanjiReading: 'Tojiru · Cerrar',
    block: 'metabolic',
    blockLabel: 'BLOQUE 0 · CIERRE METABÓLICO',
    duration: 120,
    express: false,
    directive:
      'Última comida del día. Ingesta de suplementos: Magnesio (Treonato o Bisglicinato), L-Teanina y vitaminas liposolubles con la comida.',
    systemLog: 'Cerrando la ventana metabólica...',
    completionLog: 'Comida y suplementos ingresados. El motor se apaga.',
    scienceNote:
      'Cenar ≥3 h antes de dormir reduce reflujo y mejora la arquitectura del sueño. El magnesio modula NMDA/GABA (baja excitabilidad), la L-teanina eleva ondas alfa sin sedar, y las liposolubles (D3/K2/A/E) se absorben con grasa de la cena.',
    voiceLineBriefing:
      'Esta es tu última comida del día. A partir de ahora, el cuerpo deja de procesar y empieza a reparar. Toma tus suplementos con la comida: magnesio, teanina, las liposolubles. No son adornos — son las instrucciones bioquímicas que le das a tu cerebro para que suelte. Come sin pantallas, sin prisa. Mastica. Cierra.',
    subSteps: [
      { label: 'Última comida del día', description: 'Ligera, densa en nutrientes. Nada después de esto.' },
      { label: 'Magnesio (Treonato o Bisglicinato)', description: 'Baja la excitabilidad neuronal y mejora SWS.' },
      { label: 'L-Teanina', description: 'Sube ondas alfa, calma sin sedar.' },
      { label: 'Vitaminas liposolubles', description: 'D3 · K2 · A · E — se absorben con la grasa de la cena.' },
    ],
    tips: [
      'Cenar 3 h antes de acostarte da el pico de melatonina más limpio.',
      'Evita líquidos abundantes después de esta fase — despertar nocturno por vejiga rompe el sueño.',
    ],
  },
  {
    id: 'optica',
    phase: 2,
    codename: 'ÓPTICA',
    title: 'FILTRO VISUAL',
    icon: '◑',
    kanji: '眼',
    kanjiReading: 'Me · Ojo',
    block: 'metabolic',
    blockLabel: 'BLOQUE 0 · CIERRE METABÓLICO',
    duration: 60,
    express: false,
    directive:
      'Si sigues frente al monitor, colócate las gafas bloqueadoras de luz azul. No negociable: cualquier pantalla tras esta hora pasa por el filtro.',
    systemLog: 'Espectro azul filtrado.',
    completionLog: 'Ojos protegidos. La melatonina ya está en camino.',
    scienceNote:
      'La luz azul (460–480 nm) suprime la melatonina hasta 3 h. Las gafas bloqueadoras ámbar reducen esa supresión ~70 % y adelantan la fase circadiana 30–90 min en usuarios nocturnos.',
    voiceLineBriefing:
      'Si aún estás frente a una pantalla, ponte las gafas. Es un acto pequeño, casi ridículo, pero es la diferencia entre que tu cerebro produzca melatonina o la bloquee tres horas más. No discutas con la física del ojo. Fíltrala.',
    tips: [
      'Si no usas gafas, activa los filtros cálidos del sistema (Night Shift / f.lux) al máximo.',
      'Luz del techo: apágala. Solo lámparas bajas y cálidas de aquí en adelante.',
    ],
  },
  {
    id: 'sequia',
    phase: 3,
    codename: 'SEQUÍA',
    title: 'ÚLTIMO SORBO',
    icon: '◒',
    kanji: '涸',
    kanjiReading: 'Kareru · Secarse',
    block: 'metabolic',
    blockLabel: 'BLOQUE 0 · CIERRE METABÓLICO',
    duration: 60,
    express: false,
    directive:
      'Último sorbo de agua del día. A partir de aquí, el cuerpo entra en modo hidratación cerrada para evitar despertares por vejiga.',
    systemLog: 'Ingesta hídrica cerrada.',
    completionLog: 'Sequía hasta el amanecer.',
    scienceNote:
      'Cortar líquidos 90 min antes de dormir reduce ~40 % los despertares nocturnos por nicturia, y aumenta el tiempo continuo de sueño profundo (SWS), que es donde ocurre la consolidación glimfática.',
    voiceLineBriefing:
      'Este es el último sorbo. Déjalo pasar despacio. No vas a necesitar más hasta mañana — y si te despiertas a las tres de la mañana con sed, es mucho mejor que despertarte a las tres para orinar. Cada despertar rompe un ciclo de sueño profundo que no vuelves a recuperar.',
  },

  // ═══ BLOQUE 1 · DESCOMPRESIÓN FÍSICA Y LIMPIEZA ═══
  {
    id: 'terminus',
    phase: 4,
    codename: 'TERMINUS',
    title: 'CORTE DIGITAL',
    icon: '◓',
    kanji: '終',
    kanjiReading: 'Owari · Final',
    block: 'descompression',
    blockLabel: 'BLOQUE 1 · DESCOMPRESIÓN',
    duration: 180,
    express: true,
    durationExpress: 120,
    directive:
      'Apagado total de monitores. Corte digital. Te quitas las gafas bloqueadoras. El trabajo del día termina aquí, aunque quede algo abierto.',
    systemLog: 'Cortando el flujo digital...',
    completionLog: 'Pantallas apagadas. El mundo puede esperar.',
    scienceNote:
      'Cerrar tareas con un límite explícito activa el "efecto Zeigarnik controlado": tu corteza prefrontal suelta la rumiación cuando hay un tope ritualizado. Sin tope, el cerebro sigue simulando escenarios laborales hasta 2 h dentro del sueño.',
    voiceLineBriefing:
      'Apaga los monitores. Todos. Aunque esté a la mitad, aunque falte poco. Mañana vuelve a encenderlo, y la tarea seguirá ahí, esperándote. Quítate las gafas: ya no hay nada que filtrar. El día, oficialmente, se cerró. El resto es tuyo.',
    subSteps: [
      { label: 'Apaga todos los monitores', description: 'Laptop, escritorio, segunda pantalla. Off, no sleep.' },
      { label: 'Quítate las gafas bloqueadoras', description: 'Ya no las necesitas — no hay espectro azul.' },
      { label: 'Cierra apps de trabajo', description: 'Slack, correo, Notion. El día terminó.' },
    ],
  },
  {
    id: 'aegis',
    phase: 5,
    codename: 'AEGIS',
    title: 'PREPARAR EL MAÑANA',
    icon: '◔',
    kanji: '盾',
    kanjiReading: 'Tate · Escudo',
    block: 'descompression',
    blockLabel: 'BLOQUE 1 · DESCOMPRESIÓN',
    duration: 300,
    express: false,
    directive:
      'Dejas la ropa de deporte lista, la toalla en posición, y el escritorio inmaculado para mañana. Abres la ventana del cuarto para que la temperatura baje a 18 °C.',
    systemLog: 'Escudo para mañana armado.',
    completionLog: 'Mañana ya no tiene fricción. El cuarto se está enfriando.',
    scienceNote:
      'Eliminar fricciones matinales reduce decisiones al despertar y protege la ventana de cortisol. Dormir a 18 °C (65 °F) es la temperatura óptima para SWS — por cada grado sobre 20 °C se pierde ~5 % de sueño profundo.',
    voiceLineBriefing:
      'Arma el escudo para la próxima versión de ti. Ropa de deporte afuera, toalla en posición, escritorio despejado. Mañana no debe decidir nada: solo moverse. Y abre la ventana. Busca los dieciocho grados. El cuerpo necesita frío para dormir profundo — es la única forma de que la melatonina trabaje.',
    subSteps: [
      { label: 'Ropa de deporte lista', description: 'Afuera, visible. Cero decisiones a las 5 am.' },
      { label: 'Toalla en posición', description: 'En la ruta del entrenamiento, doblada.' },
      { label: 'Escritorio inmaculado', description: 'Superficie despejada, mañana arrancas limpio.' },
      { label: 'Ventana abierta · 18 °C', description: 'El frío es el disparador #1 de sueño profundo.' },
    ],
  },
  {
    id: 'therma',
    phase: 6,
    codename: 'THERMA',
    title: 'DUCHA TIBIA',
    icon: '◕',
    kanji: '湯',
    kanjiReading: 'Yu · Agua caliente',
    block: 'descompression',
    blockLabel: 'BLOQUE 1 · DESCOMPRESIÓN',
    duration: 600,
    express: true,
    durationExpress: 360,
    directive:
      'Ducha tibia/caliente de 10 min. La vasodilatación periférica inicia la caída de tu temperatura central — ese descenso es el disparador biológico de la melatonina.',
    systemLog: 'Vasodilatación periférica activa...',
    completionLog: 'Temperatura core en descenso. Ventana de melatonina abierta.',
    scienceNote:
      'Una ducha tibia/caliente 60–90 min antes de dormir acelera la caída de la temperatura central ~0.5–1 °C tras salir, mejor que ningún fármaco. Ese gradiente térmico es el estímulo primario de liberación de melatonina desde la pineal.',
    voiceLineBriefing:
      'Agua tibia, diez minutos, sin apuros. No es para limpiarte — ya estás limpio. Es para engañar al cuerpo. Al salir, la piel pierde calor rápido, y tu temperatura central se hunde. Ese descenso es la señal que la pineal esperaba para abrir la melatonina. No hay pastilla que haga esto mejor que un grifo.',
    tips: [
      'Tibia/caliente, no hirviendo — no buscas sudor, buscas vasodilatación.',
      'Al salir, no te seques del todo. Deja que la piel termine de enfriarse sola.',
    ],
  },
  {
    id: 'hygiene',
    phase: 7,
    codename: 'HYGIENE',
    title: 'HIGIENE · PIJAMA',
    icon: '○',
    kanji: '潔',
    kanjiReading: 'Kiyoshi · Pureza',
    block: 'descompression',
    blockLabel: 'BLOQUE 1 · DESCOMPRESIÓN',
    duration: 300,
    express: false,
    directive:
      'Cepillado de dientes y aplicación de cremas sobre poros abiertos. Pijama. El cuerpo entra en modo reposo.',
    systemLog: 'Superficie corporal sellada.',
    completionLog: 'Limpio, hidratado, en pijama. Todo listo.',
    scienceNote:
      'Aplicar activos (retinoides, péptidos, ceramidas) sobre piel recién duchada multiplica la absorción 2–3× por poros dilatados y piel hidratada. El cepillado nocturno previene caries porque el flujo salival baja de noche.',
    voiceLineBriefing:
      'Cepíllate sin apuro. Aplica tus cremas ahora, con los poros abiertos — nunca van a absorber mejor. Ponte el pijama, o lo que uses para dormir. Cada prenda que te pones es una instrucción que le das al cuerpo: "esto ya no es el día, esto es la noche".',
    subSteps: [
      { label: 'Cepillado + hilo', description: 'El flujo salival baja de noche; la placa ataca más.' },
      { label: 'Cremas sobre poros abiertos', description: 'Absorción multiplicada por la ducha previa.' },
      { label: 'Pijama', description: 'Ropa ligera, transpirable. Marca la frontera corporal.' },
    ],
  },

  // ═══ BLOQUE 2 · EL SANTUARIO (LUZ ROJA/ÁMBAR) ═══
  {
    id: 'katharsis',
    phase: 8,
    codename: 'KATHARSIS',
    title: 'VACIADO MENTAL',
    icon: '◐',
    kanji: '墨',
    kanjiReading: 'Sumi · Tinta',
    block: 'sanctuary',
    blockLabel: 'BLOQUE 2 · EL SANTUARIO',
    duration: 900,
    express: true,
    durationExpress: 360,
    directive:
      'Brain Dump, Zeigarnik, Feynman, Gratitud I. En papel, en este orden. Sin editar. El objetivo es vaciar la RAM, no escribir bonito.',
    systemLog: 'Volcando RAM al papel...',
    completionLog: 'Mente descomprimida. Lo que había que cerrar, quedó fuera.',
    scienceNote:
      'El volcado mental pre-sueño reduce la latencia para dormir ~27 % (Harvey & Farrell). Escribir un problema abierto activa de forma controlada el efecto Zeigarnik — el subconsciente lo rumia durante N2/SWS y frecuentemente aparece resuelto al despertar.',
    voiceLineBriefing:
      'Abre el cuaderno. Primero, vacía. Todo lo que te da vueltas, escríbelo — sin jerarquía, sin editar. Luego, elige un problema técnico sin resolver, anótalo en una línea, y entrégaselo al subconsciente: él trabaja mejor que tú dormido. Después, una sola oración que resuma lo más complejo que entendiste hoy — estilo Feynman. Y cierra con tres victorias concretas del día. No "estoy agradecido por mi familia". Victorias específicas. Escríbelas.',
    interaction: 'journal',
    subSteps: [
      { label: 'Brain Dump', description: 'Todo lo que te da vueltas, al papel. Sin jerarquía, sin filtro.' },
      { label: 'Efecto Zeigarnik', description: 'Un problema técnico abierto → lo anotas → el subconsciente lo trabaja dormido.' },
      { label: 'Feynman de cierre', description: 'Una frase resumiendo lo más complejo del día.' },
      { label: 'Gratitud I', description: 'Tres victorias específicas del día. No genéricas.' },
    ],
    tips: [
      'Papel, no pantalla. El trazo manual activa otra vía de consolidación.',
      'Si te trabas, pon un timer de 3 min por sub-paso y sigue al próximo.',
    ],
  },
  {
    id: 'parasimpato',
    phase: 9,
    codename: 'PARASÍMPATO',
    title: 'LECTURA ANALÓGICA',
    icon: '◑',
    kanji: '鎮',
    kanjiReading: 'Shizumeru · Calmar',
    block: 'sanctuary',
    blockLabel: 'BLOQUE 2 · EL SANTUARIO',
    duration: 900,
    express: true,
    durationExpress: 240,
    directive:
      'Lectura analógica de alta cultura — Marco Aurelio, Séneca, historia. Programa el subconsciente en estado Theta antes de la cama. Papel o e-reader sin retroiluminación.',
    systemLog: 'Ondas alfa subiendo — theta a la vista.',
    completionLog: 'Subconsciente nutrido. Listo para cerrar los ojos.',
    scienceNote:
      'Leer alta cultura 15 min baja el estrés ~68 % (Univ. Sussex) y desplaza el EEG hacia alfa/theta. Los textos de densidad filosófica sirven como "siembra" — lo último que lee la corteza antes de dormir tiene probabilidad desproporcionada de integrarse en la consolidación.',
    voiceLineBriefing:
      'Toma a Marco Aurelio, a Séneca, o un libro de historia. Nada técnico, nada de tu trabajo, nada que exija resolver. Lee despacio. No importa si no terminas el capítulo. Lo último que tu corteza procesa antes de dormir es lo que se integra más profundo — siembra sabiduría antigua, no ruido moderno.',
    interaction: 'read',
    tips: [
      'Papel o e-reader E-Ink. No tablet, no teléfono.',
      'Si los ojos pesan, ese es el permiso para cerrar el libro. No lo fuerces.',
    ],
  },

  // ═══ BLOQUE 3 · APAGADO NEURONAL ═══
  {
    id: 'stasis',
    phase: 10,
    codename: 'STASIS',
    title: 'APAGADO NEURONAL',
    icon: '●',
    kanji: '眠',
    kanjiReading: 'Nemuri · Dormir',
    block: 'shutdown',
    blockLabel: 'BLOQUE 3 · APAGADO NEURONAL',
    duration: 300,
    express: true,
    durationExpress: 240,
    directive:
      'Vas a la cama. Oscuridad total. Cuarto a 18 °C. Mouth taping. Gratitud II. Respiración 4-7-8 estrictamente por la nariz.',
    systemLog: 'Entrando en stasis...',
    completionLog: 'Protocolo completo. El día queda entregado.',
    scienceNote:
      'La respiración 4-7-8 por la nariz eleva la dominancia vagal y baja la FC ~10 bpm en 4 ciclos. El mouth taping fuerza respiración nasal, que aumenta la producción de óxido nítrico, mejora la oxigenación y reduce apneas leves y ronquido en ~60 % de los casos.',
    voiceLineBriefing:
      'Última puerta. Cama. Oscuridad total. Si usas cinta bucal, colócatela ahora — la respiración nasal es la única que queremos de aquí al amanecer. Una oración silenciosa de gratitud, la última del día. Y respira: cuatro adentro, siete quietos, ocho afuera. Solo por la nariz. La luna se queda contigo. Mañana esto se repite, pero por ahora, suelta.',
    interaction: 'breath',
    subSteps: [
      { label: 'Cama · oscuridad total · 18 °C', description: 'Ningún LED encendido. Si hay, tápalo.' },
      { label: 'Mouth taping', description: 'Fuerza respiración nasal → óxido nítrico → sueño más profundo.' },
      { label: 'Gratitud II', description: 'Oración silenciosa y final. Una cosa. Una sola.' },
      { label: 'Respiración 4-7-8 nasal', description: 'Cuatro ciclos. Solo por la nariz. Ahí se acaba el día.' },
    ],
  },
];

/** IDs de fases incluidas en modo express (~15 min). */
export const EXPRESS_PHASE_IDS = NIGHT_MISSIONS.filter((m) => m.express).map((m) => m.id);

/** Returns the filtered mission list for the selected mode. */
export function getNightMissions(mode: 'full' | 'express'): NightMission[] {
  if (mode === 'full') return NIGHT_MISSIONS;
  return NIGHT_MISSIONS.filter((m) => m.express);
}

/** Total seconds for the given mode. */
export function totalNightDuration(mode: 'full' | 'express'): number {
  const list = getNightMissions(mode);
  return list.reduce((acc, m) => {
    const d = mode === 'express' ? (m.durationExpress ?? m.duration) : m.duration;
    return acc + d;
  }, 0);
}
