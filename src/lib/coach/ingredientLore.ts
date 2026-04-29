// ═══════════════════════════════════════════════════════════
// ingredientLore.ts · explicaciones por función cosmética
//
// Para cada `IngredientFunction` del catálogo, una mini-ficha:
// qué hace, cuándo es ideal, cuándo evitar, evidencia. La UI
// la usa en bottom-sheets "por qué este paso" y en tips.
//
// Curado para ser preciso pero accesible — sin jerga clínica
// pesada. Solo se incluyen las funciones que aparecen en
// productos reales del catálogo + las más útiles para tips.
// ═══════════════════════════════════════════════════════════

import type { IngredientFunction } from './catalog';

export interface IngredientLore {
  fn: IngredientFunction;
  /** Nombre humano de la función. */
  name: string;
  /** Una frase: qué hace en piel. */
  oneLiner: string;
  /** Contextos donde brilla. */
  whenIdeal: string[];
  /** Contextos donde evitar / con precaución. */
  whenAvoid: string[];
  /** Nivel de evidencia. */
  evidence: 'fuerte' | 'media' | 'tradicional';
}

export const INGREDIENT_LORE: Partial<Record<IngredientFunction, IngredientLore>> = {
  humectant: {
    fn: 'humectant',
    name: 'humectante',
    oneLiner:
      'Atrae agua a las capas superficiales (ej. glicerina, ácido hialurónico, urea, panthenol).',
    whenIdeal: [
      'Piel deshidratada (sensación tirante).',
      'Después de limpiar para fijar agua antes del sello.',
    ],
    whenAvoid: [
      'Solo, en clima muy seco sin oclusivo: puede tirar agua de capas profundas.',
    ],
    evidence: 'fuerte',
  },
  emollient: {
    fn: 'emollient',
    name: 'emoliente',
    oneLiner:
      'Llena los huecos entre corneocitos y suaviza textura (ej. squalane, ésteres ligeros, cocoyl glycinate).',
    whenIdeal: [
      'Piel áspera o con descamación leve.',
      'Como puente entre humectante y oclusivo.',
    ],
    whenAvoid: ['Acné activo con fórmulas pesadas en isopropil-mistos.'],
    evidence: 'fuerte',
  },
  occlusive: {
    fn: 'occlusive',
    name: 'oclusivo',
    oneLiner:
      'Sella la pérdida transepidérmica de agua (ej. petrolatum, dimeticona, ceras).',
    whenIdeal: [
      'Recovery post-flare (técnica Aquaphor sandwich).',
      'Frío seco, post-ducha caliente.',
    ],
    whenAvoid: [
      'Acné inflamatorio en zona T sin limpieza previa.',
      'Calor + humedad alta (atrapa sudor).',
    ],
    evidence: 'fuerte',
  },
  barrier_lipid: {
    fn: 'barrier_lipid',
    name: 'lípido de barrera',
    oneLiner:
      'Reemplaza ceramidas, colesterol y ácidos grasos faltantes en barreras dañadas.',
    whenIdeal: [
      'Atopia leve, recovery, post-tratamiento con activos fuertes.',
      'Ratio ceramida/colesterol/ác. graso 3:1:1 (CeraVe, Atoderm).',
    ],
    whenAvoid: ['Sin compañía de humectante: quedan secos y "pegajosos".'],
    evidence: 'fuerte',
  },
  soothing: {
    fn: 'soothing',
    name: 'calmante',
    oneLiner:
      'Reducen señal inflamatoria y rojeces (niacinamida, panthenol, allantoina, bisabolol, centella).',
    whenIdeal: [
      'Skin-feel reactivo (rojo, escozor).',
      'Combinables casi con todo.',
    ],
    whenAvoid: ['Sin equivalentes de eficacia clínica fuerte para flare severo.'],
    evidence: 'media',
  },
  thermal_water: {
    fn: 'thermal_water',
    name: 'agua termal',
    oneLiner:
      'Mineralización + selenio (Avène) o sales que estabilizan la respuesta inflamatoria.',
    whenIdeal: [
      'Post-sol, post-gym, escozor agudo.',
      'Capa rápida sobre la piel sin frotar.',
    ],
    whenAvoid: ['Como única hidratación: evapora y deshidrata si no se sella.'],
    evidence: 'media',
  },
  sunscreen_uvb: {
    fn: 'sunscreen_uvb',
    name: 'fotoprotección UVB',
    oneLiner: 'Filtra el 95–98% de la radiación UVB (responsable del eritema y del cáncer cutáneo).',
    whenIdeal: ['Toda exposición diurna.', 'Reaplicar cada 2 h en pico UV.'],
    whenAvoid: ['Sin sumar filtro UVA: protección parcial.'],
    evidence: 'fuerte',
  },
  sunscreen_uva: {
    fn: 'sunscreen_uva',
    name: 'fotoprotección UVA',
    oneLiner:
      'Bloquea UVA (envejecimiento, fotodermatosis); ideal con etiqueta PA+++/UVA-PF alto.',
    whenIdeal: ['Diario · incluso indoor cerca de ventanas.'],
    whenAvoid: ['Filtros antiguos sin balance UVA (anteriores a 2010).'],
    evidence: 'fuerte',
  },
  sunscreen_broad: {
    fn: 'sunscreen_broad',
    name: 'fotoprotección amplio espectro',
    oneLiner: 'Cubre UVB + UVA en una sola fórmula moderna.',
    whenIdeal: ['Default diario en pieles sensibles o post-tratamiento.'],
    whenAvoid: [],
    evidence: 'fuerte',
  },
  active_retinoid: {
    fn: 'active_retinoid',
    name: 'retinoide',
    oneLiner: 'Acelera renovación, modula sebo, activa colágeno (adapaleno, retinol, tretinoína).',
    whenIdeal: ['Acné, fotoenvejecimiento, queratosis pilar leve (PM).'],
    whenAvoid: [
      'Brote, piel barrera comprometida, embarazo (tretinoína/adapaleno con criterio).',
      'Mismo turno con ácidos exfoliantes.',
    ],
    evidence: 'fuerte',
  },
  active_calcineurin_inhibitor: {
    fn: 'active_calcineurin_inhibitor',
    name: 'inhibidor de calcineurina',
    oneLiner: 'Modulador inmune local sin atrofia (ej. tacrolimus). Útil en zonas finas.',
    whenIdeal: ['Atopia palpebral, perioral, pliegues — alternancia con corticoide.'],
    whenAvoid: ['Sin diagnóstico previo, infecciones cutáneas activas.'],
    evidence: 'fuerte',
  },
  active_corticoid: {
    fn: 'active_corticoid',
    name: 'corticoide tópico',
    oneLiner: 'Anti-inflamatorio potente; efectivo a corto plazo en flares delimitados.',
    whenIdeal: ['Flare definido por dermatólogo, ciclos cortos.'],
    whenAvoid: ['Uso prolongado, cara salvo indicación, atrofia previa.'],
    evidence: 'fuerte',
  },
  active_bha: {
    fn: 'active_bha',
    name: 'BHA (ácido salicílico)',
    oneLiner: 'Lipofílico — entra al folículo y normaliza queratinización.',
    whenIdeal: ['Comedones, dermatitis seborreica leve, espalda.'],
    whenAvoid: ['Piel reactiva, junto con retinoide en mismo turno.'],
    evidence: 'fuerte',
  },
  antioxidant: {
    fn: 'antioxidant',
    name: 'antioxidante',
    oneLiner: 'Neutraliza radicales libres del UV/contaminación (vit C, ferúlico, vit E).',
    whenIdeal: ['AM bajo el SPF, sinergiza la fotoprotección.'],
    whenAvoid: ['Vit C oxidada (color marrón) ya no funciona.'],
    evidence: 'media',
  },
  caffeine: {
    fn: 'caffeine',
    name: 'cafeína',
    oneLiner: 'Vasoconstrictor leve · descongestiona ojeras matinales y tensión periocular.',
    whenIdeal: ['AM en zona ojo cuando hay bolsa o mirada cansada.'],
    whenAvoid: ['Sin combinación con hidratación: deja zona seca.'],
    evidence: 'media',
  },
  antimicrobial: {
    fn: 'antimicrobial',
    name: 'antimicrobiano',
    oneLiner: 'Reduce carga bacteriana implicada en acné inflamatorio (ej. peróxido de benzoilo, sulfacetamida).',
    whenIdeal: ['Pústulas activas en cantidad localizada.'],
    whenAvoid: ['Junto a retinoide A en misma capa (oxidación).'],
    evidence: 'fuerte',
  },
  hair_repair: {
    fn: 'hair_repair',
    name: 'reparador capilar',
    oneLiner: 'Re-estructuran enlaces o reponen lípidos (bond builders, ceramidas).',
    whenIdeal: ['Después de decoloración, calor o sal/cloro.'],
    whenAvoid: ['Como único acondicionador (no aportan suavidad por sí solos).'],
    evidence: 'media',
  },
  lubricant_eye: {
    fn: 'lubricant_eye',
    name: 'lubricante ocular',
    oneLiner: 'Estabiliza la película lagrimal y reduce fatiga visual digital.',
    whenIdeal: ['Pantallas largas, aire seco, pre-/post-vuelo.'],
    whenAvoid: ['Conservantes irritantes en uso > 4 veces/día.'],
    evidence: 'fuerte',
  },
};

/**
 * Devuelve la lore de una función o `null` si no está documentada.
 */
export function loreFor(fn: IngredientFunction): IngredientLore | null {
  return INGREDIENT_LORE[fn] ?? null;
}

/**
 * Para una lista de funciones (de un producto), devuelve las
 * loras únicas en orden estable. Útil para "por qué este paso".
 */
export function loresFor(fns: IngredientFunction[]): IngredientLore[] {
  const seen = new Set<IngredientFunction>();
  const out: IngredientLore[] = [];
  for (const fn of fns) {
    if (seen.has(fn)) continue;
    seen.add(fn);
    const l = loreFor(fn);
    if (l) out.push(l);
  }
  return out;
}
