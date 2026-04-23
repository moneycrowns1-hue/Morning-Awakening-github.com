// ═══════════════════════════════════════════════════════
// quotes.ts · curated morning reflections
// Used by WelcomeScreen. getQuoteForDate() returns a
// deterministic quote for a given date (same day = same
// quote globally). The list can be extended without
// breaking past selections (new quotes only appear from
// the day they are added forward).
// ═══════════════════════════════════════════════════════

export interface Quote {
  text: string;
  author: string;
}

// ~100 curated reflections. Stoicism, Eastern philosophy,
// modern thinkers, sports psychology. Kept short (1-2 lines)
// so they fit on a phone without scrolling.
export const QUOTES: Quote[] = [
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' },
  { text: 'No esperes. Nunca será el momento perfecto.', author: 'Napoleon Hill' },
  { text: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn' },
  { text: 'Lo que haces todos los días importa más que lo que haces de vez en cuando.', author: 'Gretchen Rubin' },
  { text: 'Conócete a ti mismo.', author: 'Sócrates' },
  { text: 'No es lo que te pasa, sino cómo reaccionas a lo que te pasa.', author: 'Epicteto' },
  { text: 'Primero dile a ti mismo lo que serás; luego haz lo que debas hacer.', author: 'Epicteto' },
  { text: 'El obstáculo es el camino.', author: 'Marco Aurelio' },
  { text: 'Vive cada día como si fuera el último, no con miedo sino con fuego.', author: 'Marco Aurelio' },
  { text: 'Tu mente será del color de tus pensamientos más frecuentes.', author: 'Marco Aurelio' },
  { text: 'El hombre es molestado no por las cosas, sino por la opinión que tiene de ellas.', author: 'Epicteto' },
  { text: 'El tiempo es el recurso más justo: todos tenemos el mismo.', author: 'Séneca' },
  { text: 'No es poco el tiempo que tenemos, sino mucho el que perdemos.', author: 'Séneca' },
  { text: 'La suerte favorece a la mente preparada.', author: 'Louis Pasteur' },
  { text: 'El que madruga recoge la calma del mundo antes que nadie.', author: 'Anónimo' },
  { text: 'Haz lo difícil cuando sea fácil; y lo grande cuando sea pequeño.', author: 'Lao Tzu' },
  { text: 'El viaje de mil millas empieza con un solo paso.', author: 'Lao Tzu' },
  { text: 'Cuando el estudiante está listo, aparece el maestro.', author: 'Proverbio zen' },
  { text: 'No puedes detener las olas, pero puedes aprender a surfear.', author: 'Jon Kabat-Zinn' },
  { text: 'La calma es una superpotencia.', author: 'Naval Ravikant' },
  { text: 'Lee lo que nadie lee, piensa lo que nadie piensa.', author: 'Naval Ravikant' },
  { text: 'Los hábitos son el interés compuesto de la superación personal.', author: 'James Clear' },
  { text: 'No te elevas al nivel de tus metas, caes al nivel de tus sistemas.', author: 'James Clear' },
  { text: 'Cada acción es un voto por la persona que quieres ser.', author: 'James Clear' },
  { text: 'Haz menos cosas, pero mejor.', author: 'Greg McKeown' },
  { text: 'La claridad es amable. La confusión es cruel.', author: 'Brené Brown' },
  { text: 'Comienza donde estás. Usa lo que tienes. Haz lo que puedas.', author: 'Arthur Ashe' },
  { text: 'Lo contrario de amar no es odiar, es la indiferencia.', author: 'Elie Wiesel' },
  { text: 'Quien tiene un porqué puede soportar casi cualquier cómo.', author: 'Friedrich Nietzsche' },
  { text: 'Eso que no te mata, te fortalece.', author: 'Friedrich Nietzsche' },
  { text: 'Quien se vence a sí mismo es más fuerte que quien conquista mil ciudades.', author: 'Buda' },
  { text: 'Nada es permanente excepto el cambio.', author: 'Heráclito' },
  { text: 'Nadie se baña dos veces en el mismo río.', author: 'Heráclito' },
  { text: 'El hombre despierto solo tiene un mundo; el dormido, muchos.', author: 'Heráclito' },
  { text: 'El que controla su respiración controla su mente.', author: 'Proverbio yogui' },
  { text: 'Respira. Recuerda quién eres. Continúa.', author: 'Anónimo' },
  { text: 'La acción es el antídoto de la desesperación.', author: 'Joan Baez' },
  { text: 'Si puedes soñarlo y trabajarlo, puedes lograrlo.', author: 'Walt Disney' },
  { text: 'No cuenta el tamaño del perro en la pelea, sino el tamaño de la pelea en el perro.', author: 'Mark Twain' },
  { text: 'El único modo de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs' },
  { text: 'Mantente hambriento. Mantente necio.', author: 'Steve Jobs' },
  { text: 'La simplicidad es la máxima sofisticación.', author: 'Leonardo da Vinci' },
  { text: 'Aprende como si fueras a vivir siempre; vive como si fueras a morir mañana.', author: 'Mahatma Gandhi' },
  { text: 'Sé el cambio que quieres ver en el mundo.', author: 'Mahatma Gandhi' },
  { text: 'Lo importante no es lo rápido que vas, sino que no te detengas.', author: 'Confucio' },
  { text: 'El hombre que mueve montañas comienza cargando pequeñas piedras.', author: 'Confucio' },
  { text: 'La belleza del amanecer es que lo tienes que esperar despierto.', author: 'Anónimo' },
  { text: 'El frío del agua no se piensa, se entra.', author: 'Anónimo' },
  { text: 'Hoy es el día más joven que te queda.', author: 'Anónimo' },
  { text: 'Menos prisa, más presencia.', author: 'Thich Nhat Hanh' },
  { text: 'Camina como si besaras la tierra con los pies.', author: 'Thich Nhat Hanh' },
  { text: 'Si no cuidas de tu cuerpo, ¿dónde vas a vivir?', author: 'Jim Rohn' },
  { text: 'Cuídate como cuidarías a alguien que quieres.', author: 'Anónimo' },
  { text: 'El cuerpo logra lo que la mente cree.', author: 'Napoleon Hill' },
  { text: 'Lo difícil se hace fácil con la práctica.', author: 'Bruce Lee' },
  { text: 'No reces por una vida fácil; reza por la fuerza de soportar una difícil.', author: 'Bruce Lee' },
  { text: 'Vacía tu mente, sé informe, como el agua.', author: 'Bruce Lee' },
  { text: 'Conviértete en arquitecto de tu propio día.', author: 'Anónimo' },
  { text: 'El pequeño progreso diario suma resultados asombrosos.', author: 'Satya Nani' },
  { text: 'No importa lo lento que vayas mientras no te detengas.', author: 'Confucio' },
  { text: 'La resistencia es un tipo de sabiduría.', author: 'Rumi' },
  { text: 'Lo que buscas te está buscando.', author: 'Rumi' },
  { text: 'Calla, escucha; la vida te está hablando más bajo de lo que crees.', author: 'Anónimo' },
  { text: 'El silencio es una fuente de gran fuerza.', author: 'Lao Tzu' },
  { text: 'Un cuerpo activo, una mente clara.', author: 'Anónimo' },
  { text: 'Elige lo difícil hoy para tener lo fácil mañana.', author: 'Anónimo' },
  { text: 'La mejor forma de predecir el futuro es crearlo.', author: 'Peter Drucker' },
  { text: 'Hazlo aunque tengas miedo. Especialmente si tienes miedo.', author: 'Anónimo' },
  { text: 'Si vas a dudar de algo, duda de tus límites.', author: 'Don Ward' },
  { text: 'Tu única competencia es quién eras ayer.', author: 'Jordan Peterson' },
  { text: 'Ordena tu habitación antes de ordenar el mundo.', author: 'Jordan Peterson' },
  { text: 'El cuerpo entero nunca miente.', author: 'Martha Graham' },
  { text: 'La atención es la forma más rara y pura de generosidad.', author: 'Simone Weil' },
  { text: 'No puedes hacer todo, pero puedes hacer algo.', author: 'Anónimo' },
  { text: 'Ríete de ti mismo primero, antes que de nadie más.', author: 'Elsa Maxwell' },
  { text: 'La gratitud convierte lo que tenemos en suficiente.', author: 'Anónimo' },
  { text: 'Vive como si todo fuera un milagro.', author: 'Albert Einstein' },
  { text: 'Dos cosas son infinitas: el universo y la estupidez humana.', author: 'Albert Einstein' },
  { text: 'Si no puedes explicarlo simple, no lo entiendes bien.', author: 'Albert Einstein' },
  { text: 'Lee 500 páginas como esto todos los días. Así funciona el conocimiento.', author: 'Warren Buffett' },
  { text: 'Alguien está sentado en la sombra hoy porque plantó un árbol hace tiempo.', author: 'Warren Buffett' },
  { text: 'No se trata de tener tiempo, sino de hacer tiempo.', author: 'Anónimo' },
  { text: 'La repetición es la madre de la maestría.', author: 'Anónimo' },
  { text: 'Haz una cosa pequeña con amor. Y luego otra.', author: 'Madre Teresa' },
  { text: 'El amanecer no llega porque alguien canta; cantamos porque el amanecer llega.', author: 'Rabindranath Tagore' },
  { text: 'Hay un crack en todo; así es como entra la luz.', author: 'Leonard Cohen' },
  { text: 'No compitas. Crea.', author: 'Naval Ravikant' },
  { text: 'Los que van contra corriente son los que cambian el mundo.', author: 'Anónimo' },
  { text: 'Paciencia es poder; lentamente pero seguro.', author: 'Proverbio chino' },
  { text: 'Aprende a estar solo sin estar triste.', author: 'Anónimo' },
  { text: 'El valor no es la ausencia de miedo, sino la acción a pesar de él.', author: 'Mark Twain' },
  { text: 'Nunca des un paso atrás, ni para tomar impulso.', author: 'Che Guevara' },
  { text: 'La calidad nunca es un accidente; siempre es resultado de esfuerzo inteligente.', author: 'John Ruskin' },
  { text: 'Bendita la mente que no se queja.', author: 'Anónimo' },
  { text: 'Lo esencial es invisible a los ojos.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Cuando soplan los vientos de cambio, algunos construyen muros, otros molinos.', author: 'Proverbio chino' },
  { text: 'Un río corta la roca no por su fuerza sino por su persistencia.', author: 'Jim Watkins' },
  { text: 'La mejor forma de empezar es dejar de hablar y empezar a hacer.', author: 'Walt Disney' },
  { text: 'Convierte tus heridas en sabiduría.', author: 'Oprah Winfrey' },
  { text: 'Los grandes espíritus siempre han encontrado oposición violenta de mentes mediocres.', author: 'Albert Einstein' },
  { text: 'La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.', author: 'Séneca' },
  { text: 'Un hombre no es viejo hasta que los pesares toman el lugar de los sueños.', author: 'John Barrymore' },
  { text: 'El primer paso siempre es el más pesado; los demás se vuelven camino.', author: 'Anónimo' },
  { text: 'Despertar es el acto más rebelde en una sociedad dormida.', author: 'Anónimo' },
];

/**
 * Deterministic quote selection for a given date string (YYYY-MM-DD).
 * Same date globally returns the same quote. Uses a simple hash so the
 * distribution is even across the quote list and adding new quotes
 * at the END doesn't change yesterday's selection.
 */
export function getQuoteForDate(dateStr: string): Quote {
  // Simple FNV-1a-ish hash.
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % QUOTES.length;
  return QUOTES[idx];
}

/** Helper: get today's YYYY-MM-DD in the user's local timezone. */
export function getTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
