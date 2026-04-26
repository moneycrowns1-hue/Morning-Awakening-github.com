// ═══════════════════════════════════════════════════════════════
// DAILY CONTENT — Contenido cultural rotativo en español
// Filosofía, Vocabulario, Historia, Disciplina
// ═══════════════════════════════════════════════════════════════

export interface PhilosophyQuote {
  text: string;
  author: string;
  context: string;
}

export interface VocabularyWord {
  word: string;
  definition: string;
  example: string;
  origin: string;
}

export interface HistoryFact {
  fact: string;
  year: string;
  significance: string;
}

export interface DisciplineQuote {
  text: string;
  author: string;
  context: string;
}

export type DailyInsightData =
  | { type: 'philosophy'; content: PhilosophyQuote }
  | { type: 'vocabulary'; content: VocabularyWord }
  | { type: 'history'; content: HistoryFact }
  | { type: 'discipline'; content: DisciplineQuote };

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDailyContent(): DailyInsightData {
  const day = getDayOfYear();
  const types = ['philosophy', 'vocabulary', 'history', 'discipline'] as const;
  const type = types[day % 4];

  switch (type) {
    case 'philosophy':
      return { type, content: PHILOSOPHY[day % PHILOSOPHY.length] };
    case 'vocabulary':
      return { type, content: VOCABULARY[day % VOCABULARY.length] };
    case 'history':
      return { type, content: HISTORY[day % HISTORY.length] };
    case 'discipline':
      return { type, content: DISCIPLINE[day % DISCIPLINE.length] };
  }
}

// ── JOURNALING PROMPTS ──
export const JOURNALING_PROMPTS: string[] = [
  '¿Cuáles son tus 3 tareas prioritarias de hoy? Escríbelas en orden de impacto.',
  '¿Qué obstáculo vas a enfrentar hoy y cómo lo resolverás con frialdad?',
  'Escribe 3 cosas por las que estás agradecido y 1 cosa que vas a mejorar.',
  '¿Qué aprendiste ayer que puedes aplicar hoy?',
  '¿Qué versión de ti mismo quieres ser al terminar este día?',
  '¿Cuál es la tarea más incómoda de hoy? Hazla primero.',
  '¿Qué hábito estás construyendo esta semana? ¿Cómo vas?',
  'Si pudieras dar un consejo a tu yo de hace un año, ¿cuál sería?',
  '¿Qué distracción necesitas eliminar HOY para ser más efectivo?',
  '¿Cuál es la decisión más importante que tienes pendiente?',
  'Escribe tu horario del día bloque por bloque. Sin ambigüedad.',
  '¿Qué sacrificio estás dispuesto a hacer hoy por tu mejor versión?',
  '¿Qué concepto nuevo aprendiste esta semana? Explícalo como si enseñaras.',
  'Visualiza tu día perfecto de principio a fin. Escríbelo.',
  '¿Qué te impide avanzar ahora mismo? Sé brutalmente honesto.',
];

export function getDailyPrompt(): string {
  const day = getDayOfYear();
  return JOURNALING_PROMPTS[day % JOURNALING_PROMPTS.length];
}

// ── FILOSOFÍA ──
const PHILOSOPHY: PhilosophyQuote[] = [
  { text: 'No es que tengamos poco tiempo, sino que perdemos mucho.', author: 'Séneca', context: 'De la brevedad de la vida — Estoicismo romano, siglo I d.C.' },
  { text: 'La felicidad de tu vida depende de la calidad de tus pensamientos.', author: 'Marco Aurelio', context: 'Meditaciones — Emperador filósofo romano, 161-180 d.C.' },
  { text: 'No pretendas que las cosas ocurran como tú quieres. Desea que ocurran tal como ocurren, y te irá bien.', author: 'Epicteto', context: 'Enquiridión — Filósofo estoico nacido esclavo, siglo I d.C.' },
  { text: 'Quien tiene un porqué para vivir, puede soportar casi cualquier cómo.', author: 'Friedrich Nietzsche', context: 'El crepúsculo de los ídolos — Filosofía existencialista alemana, 1889.' },
  { text: 'Conócete a ti mismo.', author: 'Sócrates', context: 'Inscripción del Templo de Apolo en Delfos — Base de la filosofía occidental, siglo V a.C.' },
  { text: 'El que conquista a otros es fuerte; el que se conquista a sí mismo es poderoso.', author: 'Lao Tzu', context: 'Tao Te Ching — Filosofía taoísta china, siglo VI a.C.' },
  { text: 'La única verdadera sabiduría es saber que no sabes nada.', author: 'Sócrates', context: 'Diálogos platónicos — El método socrático de cuestionamiento.' },
  { text: 'Haz que tu camino sea recto. No pierdas tiempo mirando atrás.', author: 'Miyamoto Musashi', context: 'El Libro de los Cinco Anillos — Samurái legendario japonés, 1645.' },
  { text: 'El sufrimiento es inevitable, pero el sufrimiento es opcional.', author: 'Buda', context: 'Enseñanzas del budismo — Filosofía oriental, siglo V a.C.' },
  { text: 'Toda la ciencia no es más que un refinamiento del pensamiento cotidiano.', author: 'Albert Einstein', context: 'Física y filosofía del siglo XX.' },
  { text: 'Actúa sin esperar resultados.', author: 'Bhagavad Gita', context: 'Texto sagrado hindú — El dharma del deber sin apego al fruto, ~500 a.C.' },
  { text: 'La mente es su propio lugar y en sí misma puede hacer un cielo del infierno o un infierno del cielo.', author: 'John Milton', context: 'El paraíso perdido — Literatura inglesa, 1667.' },
  { text: 'No busques que los eventos sucedan como deseas, sino desea que sucedan como suceden.', author: 'Epicteto', context: 'Manual de vida — Control sobre lo que depende de nosotros.' },
  { text: 'El hombre absurdo es el que no cambia nunca.', author: 'Auguste Barthélemy', context: 'Reflexión sobre la adaptabilidad y el crecimiento personal.' },
  { text: 'Somos lo que hacemos repetidamente. La excelencia no es un acto, sino un hábito.', author: 'Aristóteles', context: 'Ética nicomáquea — Filosofía griega sobre la virtud y el carácter.' },
];

// ── VOCABULARIO CULTO ──
const VOCABULARY: VocabularyWord[] = [
  { word: 'Resiliencia', definition: 'Capacidad de adaptarse y recuperarse frente a la adversidad, trauma o estrés.', example: 'Su resiliencia ante la crisis demostró su fortaleza interior.', origin: 'Del latín resilire: "saltar hacia atrás, rebotar".' },
  { word: 'Erudición', definition: 'Conocimiento profundo y extenso adquirido a través del estudio y la lectura.', example: 'La erudición de su discurso dejó impresionado al auditorio.', origin: 'Del latín eruditio: "instrucción, enseñanza".' },
  { word: 'Paradigma', definition: 'Modelo o patrón aceptado que sirve como marco de referencia en un campo.', example: 'El descubrimiento cambió el paradigma de la medicina moderna.', origin: 'Del griego parádeigma: "modelo, ejemplo".' },
  { word: 'Pragmatismo', definition: 'Enfoque filosófico que evalúa las ideas por sus consecuencias prácticas.', example: 'Su pragmatismo le permitió encontrar soluciones donde otros solo veían problemas.', origin: 'Del griego pragma: "acción, asunto".' },
  { word: 'Estoicismo', definition: 'Doctrina filosófica que enseña el dominio de las pasiones mediante la virtud y la razón.', example: 'Enfrentó la noticia con un estoicismo admirable.', origin: 'Del griego stoa: la "Stoa Pintada" donde enseñaba Zenón de Citio.' },
  { word: 'Autotelismo', definition: 'Cualidad de una actividad que se realiza por sí misma, sin buscar recompensa externa.', example: 'La lectura es para él una actividad autotélica: lee por el placer de leer.', origin: 'Del griego auto (propio) + telos (fin, propósito).' },
  { word: 'Antifragilidad', definition: 'Propiedad de los sistemas que se fortalecen con el estrés, el caos y la adversidad.', example: 'Un buen atleta desarrolla antifragilidad: cada lesión lo vuelve más fuerte.', origin: 'Concepto acuñado por Nassim Nicholas Taleb en 2012.' },
  { word: 'Serendipia', definition: 'Hallazgo valioso que se produce de manera accidental o casual.', example: 'El descubrimiento de la penicilina fue una serendipia afortunada.', origin: 'Del inglés serendipity, inspirado en un cuento persa del siglo XVIII.' },
  { word: 'Temperancia', definition: 'Moderación y dominio sobre los propios apetitos y pasiones.', example: 'La temperancia es la virtud cardinal que regula los excesos.', origin: 'Del latín temperantia: "moderación, autocontrol".' },
  { word: 'Dialéctica', definition: 'Arte del diálogo y la argumentación como método para llegar a la verdad.', example: 'La dialéctica socrática consiste en preguntar hasta revelar contradicciones.', origin: 'Del griego dialektike: "arte de conversar".' },
  { word: 'Praxis', definition: 'Práctica o acción concreta, en oposición a la teoría pura.', example: 'Sin praxis, todo conocimiento se queda en abstracción inútil.', origin: 'Del griego praxis: "acción, práctica".' },
  { word: 'Entropía', definition: 'Medida del desorden en un sistema; tendencia natural al caos.', example: 'Sin disciplina, la entropía se apodera de tu rutina diaria.', origin: 'Del griego entropia: "transformación". Acuñado por Rudolf Clausius, 1865.' },
  { word: 'Kaizen', definition: 'Filosofía de mejora continua mediante pequeños cambios incrementales diarios.', example: 'El kaizen aplicado a los hábitos produce resultados extraordinarios a largo plazo.', origin: 'Del japonés kai (cambio) + zen (bueno): "cambio para mejor".' },
  { word: 'Megalopsiquía', definition: 'Grandeza de alma; la virtud de quien se considera digno de grandes cosas y lo es.', example: 'Aristóteles consideraba la megalopsiquía como la corona de todas las virtudes.', origin: 'Del griego megalopsychia: "grandeza de espíritu".' },
  { word: 'Ikigai', definition: 'Razón de ser; aquello que da propósito y sentido a tu existencia.', example: 'Encontrar tu ikigai es la intersección entre lo que amas, lo que necesita el mundo, y en lo que eres bueno.', origin: 'Del japonés iki (vida) + gai (valor, razón).' },
];

// ── HISTORIA ──
const HISTORY: HistoryFact[] = [
  { fact: 'La Biblioteca de Alejandría llegó a albergar más de 400.000 rollos de papiro, siendo el mayor centro de conocimiento del mundo antiguo.', year: '~300 a.C.', significance: 'Fundada por Ptolomeo I, representó el primer intento de reunir todo el saber humano en un solo lugar.' },
  { fact: 'Leonardo da Vinci diseñó un prototipo de helicóptero, tanque y traje de buceo más de 400 años antes de que fueran inventados.', year: '1480-1519', significance: 'Demostró que la observación meticulosa y la curiosidad infinita pueden adelantarse siglos a su tiempo.' },
  { fact: 'Los samuráis japoneses no solo eran guerreros: también practicaban caligrafía, poesía y la ceremonia del té.', year: 'Siglos XII-XIX', significance: 'El concepto de Bunbu Ryodo (el camino de las letras y las armas) enseña que la verdadera fortaleza combina lo físico con lo intelectual.' },
  { fact: 'La primera universidad del mundo, la Universidad de Al-Qarawiyyin, fue fundada por una mujer: Fatima al-Fihri.', year: '859 d.C.', significance: 'Fundada en Fez, Marruecos, sigue funcionando hoy. Una mujer cambió la historia de la educación mundial.' },
  { fact: 'Los monjes medievales copiaban libros a mano durante años enteros, preservando el conocimiento clásico para la humanidad.', year: 'Siglos V-XV', significance: 'Sin su disciplina y dedicación, la mayoría de obras de Aristóteles, Platón y los clásicos se habrían perdido para siempre.' },
  { fact: 'Benjamin Franklin se levantaba a las 5 AM cada día y se preguntaba: "¿Qué bien haré hoy?"', year: '1726-1790', significance: 'Su sistema de 13 virtudes semanales fue uno de los primeros frameworks de hábitos documentados de la historia.' },
  { fact: 'Nikola Tesla dominaba 8 idiomas, recitaba libros enteros de memoria y visualizaba sus inventos completamente antes de construirlos.', year: '1856-1943', significance: 'La visualización mental puede ser tan efectiva como la práctica física. Tesla lo demostró con más de 300 patentes.' },
  { fact: 'Los espartanos comenzaban su entrenamiento militar a los 7 años con el programa Agogé, uno de los sistemas de formación más intensos de la historia.', year: '~700 a.C.', significance: 'La disciplina espartana demuestra que la consistencia extrema desde temprana edad forja carácter inquebrantable.' },
  { fact: 'Marcus Aurelius escribía sus "Meditaciones" cada noche como ejercicio de reflexión personal, sin intención de publicarlas.', year: '170-180 d.C.', significance: 'El emperador más poderoso del mundo usaba el journaling como herramienta de autodominio. El diario personal existe desde hace casi 2000 años.' },
  { fact: 'Los polímatas del Renacimiento como Miguel Ángel no solo esculpían: también estudiaban anatomía diseccionando cadáveres para entender el cuerpo humano.', year: 'Siglo XV-XVI', significance: 'El conocimiento profundo requiere ensuciarse las manos. La teoría sin práctica es estéril.' },
  { fact: 'Heráclito de Éfeso propuso que "nadie se baña dos veces en el mismo río" — el cambio es la única constante.', year: '~500 a.C.', significance: 'Esta idea anticipó la física moderna por 2.500 años. Tú tampoco eres la misma persona que ayer.' },
  { fact: 'Los estoicos romanos practicaban la "premeditatio malorum": visualizar los peores escenarios para reducir la ansiedad.', year: 'Siglos I-II d.C.', significance: 'Técnica similar a la exposición gradual de la terapia cognitivo-conductual moderna, usada 2.000 años antes.' },
  { fact: 'El código Bushido de los samuráis tenía 7 virtudes: justicia, coraje, benevolencia, respeto, honestidad, honor y lealtad.', year: 'Siglo XII', significance: 'Un guerrero sin principios morales es solo un bruto. La ética transforma la fuerza en nobleza.' },
  { fact: 'Séneca, uno de los hombres más ricos de Roma, enseñaba que la verdadera riqueza es necesitar poco.', year: '4 a.C. - 65 d.C.', significance: 'La paradoja del estoico millonario: poseer sin ser poseído. El desapego no es pobreza sino libertad.' },
  { fact: 'El método de loci (palacio de memoria) fue inventado por el poeta griego Simónides hace más de 2.500 años y sigue siendo la técnica de memorización más efectiva.', year: '~500 a.C.', significance: 'Los campeones mundiales de memoria siguen usando esta técnica antigua. Las herramientas más poderosas no necesitan tecnología.' },
];

// ── DISCIPLINA Y MENTALIDAD ──
const DISCIPLINE: DisciplineQuote[] = [
  { text: 'La disciplina es elegir entre lo que quieres ahora y lo que más quieres en la vida.', author: 'Abraham Lincoln', context: 'La gratificación diferida es el mayor predictor de éxito según el Estudio del Marshmallow de Stanford.' },
  { text: 'No cuentes los días; haz que los días cuenten.', author: 'Muhammad Ali', context: 'Cada día sin propósito es un día perdido en tu evolución personal.' },
  { text: 'La motivación te pone en marcha. El hábito te mantiene en movimiento.', author: 'Jim Ryun', context: 'Los hábitos consumen un 43% de nuestras acciones diarias según Duke University.' },
  { text: 'Si no puedes volar, corre. Si no puedes correr, camina. Si no puedes caminar, gatea. Pero sigue avanzando.', author: 'Martin Luther King Jr.', context: 'El progreso no requiere perfección, solo persistencia.' },
  { text: 'La diferencia entre ordinario y extraordinario es ese pequeño extra.', author: 'Jimmy Johnson', context: 'El esfuerzo marginal se acumula exponencialmente con el tiempo.' },
  { text: 'No es lo que hacemos de vez en cuando lo que forma nuestras vidas, sino lo que hacemos consistentemente.', author: 'Tony Robbins', context: 'La neurociencia confirma: la repetición crea mielina, que acelera las conexiones neuronales.' },
  { text: 'El dolor que sientes hoy es la fuerza que sentirás mañana.', author: 'Anónimo', context: 'El principio de supercompensación: el cuerpo y la mente se adaptan al estrés haciéndose más fuertes.' },
  { text: 'Un guerrero no se rinde ante lo que quiere hacer. Un guerrero se rinde ante lo que debe hacer.', author: 'Carlos Castaneda', context: 'Las Enseñanzas de Don Juan — La diferencia entre deseo y deber define al guerrero espiritual.' },
  { text: 'Primero dominamos nuestros hábitos, luego nuestros hábitos nos dominan a nosotros.', author: 'John Dryden', context: 'Los primeros 66 días son críticos: ese es el tiempo promedio para automatizar un nuevo hábito.' },
  { text: 'La comodidad es el enemigo del progreso.', author: 'P.T. Barnum', context: 'La zona de confort es el lugar donde los sueños van a morir. El crecimiento vive justo al borde del miedo.' },
  { text: 'Cada mañana nacemos de nuevo. Lo que hacemos hoy es lo que más importa.', author: 'Buda', context: 'La neuroplasticidad confirma que el cerebro se reconfigura cada día. Literalmente eres una persona nueva.' },
  { text: 'No te detengas cuando estés cansado. Detente cuando hayas terminado.', author: 'Anónimo', context: 'El cerebro envía señales de fatiga al 40% de tu capacidad real — la mente se rinde antes que el cuerpo.' },
  { text: 'Las batallas que importan no son las que se libran por oro o prestigio, sino las que se libran dentro de uno mismo.', author: 'Sheldon Kopp', context: 'La guerra interna entre tu yo presente y tu yo ideal define tu carácter.' },
  { text: 'Sé agua, amigo mío. Vacía tu mente, sé informe, sin forma, como el agua.', author: 'Bruce Lee', context: 'Jeet Kune Do — La adaptabilidad es la forma suprema de inteligencia.' },
  { text: 'El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.', author: 'Proverbio chino', context: 'No existe el momento perfecto. La acción imperfecta supera siempre a la inacción perfecta.' },
];
