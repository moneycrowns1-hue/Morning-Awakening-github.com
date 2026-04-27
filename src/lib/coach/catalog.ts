// ═══════════════════════════════════════════════════════════
// catalog.ts · catálogo maestro enriquecido
//
// Cada producto declara:
//   · `actives`        → ingredientes con FUNCIÓN clínica/cosmética
//                        (humectante, oclusivo, calmante, filtro UV…)
//   · `fullInci`       → lista INCI completa cuando se conoce
//   · `texture/finish` → para combinar (capas finas → gruesas)
//   · `compatibleWith` → IDs de productos que stackean bien
//   · `cautionWith`    → combos con riesgo + motivo
//
// Esto deja la data lista para que el coachEngine sugiera:
//   "Tu piel se siente seca → omega-3 + ceramidas (CeraVe MC) +
//    sello con Aquaphor labios; evita activos esta semana."
//
// Confianza de datos:
//   · Productos con INCI público estable (CeraVe US, Avène, Bioderma,
//     Eucerin, Aquaphor): info de alto detalle.
//   · Productos prescritos (Deriva-C, Tacroz, Dermovate, Loratadine):
//     ingrediente activo + excipientes principales del prospecto.
//   · Productos LATAM/regionales (Ceramid Gel, Savital, Nicotears,
//     Gelcavit, Lubriderm MX): activos publicitados; INCI completa
//     pendiente de etiqueta física → marcado con `verify: true`.
// ═══════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────
// TIPOS
// ───────────────────────────────────────────────────────────

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'eye_care'
  | 'sunscreen'
  | 'treatment_rx'
  | 'soothing'
  | 'lip_care'
  | 'body'
  | 'eye_drops'
  | 'hair_shampoo'
  | 'hair_conditioner'
  | 'hair_treatment'
  | 'oil'
  | 'supplement';

export type Slot = 'am' | 'pm' | 'either' | 'as_needed';

export type Origin =
  | 'avene'
  | 'cerave'
  | 'bioderma'
  | 'eucerin'
  | 'lubriderm'
  | 'glenmark'
  | 'sun_pharma'
  | 'gsk'
  | 'paracelso'
  | 'dermashop_ec'
  | 'saval'
  | 'herbal_essences'
  | 'savital'
  | 'generic';

/**
 * Función cosmética/clínica de un ingrediente.
 * El motor agrupa por función para evaluar redundancia o sinergia
 * entre productos que se aplican el mismo día.
 */
export type IngredientFunction =
  | 'active_retinoid'
  | 'active_antibiotic'
  | 'active_corticoid'
  | 'active_calcineurin_inhibitor'
  | 'active_aha'
  | 'active_bha'
  | 'active_antihistamine'
  | 'active_antifungal'
  | 'antioxidant'
  | 'humectant'        // atrae agua (HA, glicerina)
  | 'emollient'        // suaviza (squalane, esters)
  | 'occlusive'        // sella (petrolatum, dimethicone)
  | 'barrier_lipid'    // ceramidas, colesterol, ácidos grasos
  | 'soothing'         // niacinamida, panthenol, allantoin, bisabolol
  | 'thermal_water'
  | 'sunscreen_uvb'
  | 'sunscreen_uva'
  | 'sunscreen_broad'
  | 'antimicrobial'
  | 'preservative'
  | 'fragrance'
  | 'thickener'
  | 'solvent'
  | 'ph_adjuster'
  | 'colorant'
  | 'hair_repair'
  | 'hair_conditioning_agent'
  | 'caffeine'
  | 'plant_extract'
  | 'lubricant_eye'
  | 'other';

export interface ActiveIngredient {
  /** Nombre INCI o común. */
  name: string;
  /** Concentración cuando se conoce (ej: '0.1%', '5%'). */
  concentration?: string;
  /** Función cosmética/clínica principal. */
  function: IngredientFunction;
  /** Qué hace en ESTA fórmula concretamente. */
  role?: string;
}

export type Texture = 'spray' | 'water' | 'milk' | 'gel' | 'gel_cream' | 'lotion' | 'cream' | 'rich_cream' | 'ointment' | 'balm' | 'oil' | 'foam' | 'tablet' | 'capsule';

export type Finish = 'matte' | 'natural' | 'dewy' | 'oily' | 'tinted' | 'na';

export interface CautionPair {
  /** ID del producto con el que hay precaución. */
  id: string;
  /** Razón clínica/cosmética. */
  why: string;
}

export interface Product {
  id: string;
  name: string;
  brand: Origin;
  category: ProductCategory;
  slot: Slot;
  url: string;
  oneLiner: string;
  /** Activos curados con función — usado por el coachEngine. */
  actives: ActiveIngredient[];
  /** Lista INCI completa cuando se conoce públicamente. */
  fullInci?: string[];
  /** Indicaciones principales. */
  uses: string[];
  /** Cómo aplicarlo correctamente. */
  howTo?: string;
  /** Riesgos / advertencias clínicamente importantes. */
  cautions?: string[];
  /** Textura (capa fina → gruesa). */
  texture?: Texture;
  /** Acabado visual. */
  finish?: Finish;
  /** pH aproximado (cuando se conoce). */
  phApprox?: string;
  /** Rol funcional en una rutina (ej: "Sello oclusivo PM"). */
  formulaPurpose?: string;
  /** IDs de productos que stackean bien con este. */
  compatibleWith?: string[];
  /** Combos con precaución. */
  cautionWith?: CautionPair[];
  /** Si `true`, el coach lo SALTA cuando hay brote/sensibilidad. */
  skipOnFlare?: boolean;
  /** Tratamiento por curso (no crónico). */
  courseLimited?: boolean;
  /** Datos pendientes de confirmar contra etiqueta física. */
  verify?: boolean;
  /** Aún no se dictó marca/modelo exacto. */
  placeholder?: boolean;
}

// ═══════════════════════════════════════════════════════════
// CREMAS Y TÓPICOS — 23 entradas
// ═══════════════════════════════════════════════════════════

export const TOPICALS: Product[] = [
  // ── Avène ──────────────────────────────────────────────
  {
    id: 'avene_thermal_spring_water',
    name: 'Avène Thermal Spring Water (spray)',
    brand: 'avene',
    category: 'toner',
    slot: 'as_needed',
    url: 'https://www.aveneusa.com/thermal-spring-water#185=',
    oneLiner: 'Agua termal en spray, calmante. Conocida por su perfil mineral único bajo en sales.',
    actives: [
      { name: 'Avène Thermal Spring Water', function: 'thermal_water', role: 'Calmante; bicarbonato cálcico-magnésico, sílice, microbioma específico (Aqua Dolomiae).' },
      { name: 'Nitrogen', function: 'other', role: 'Propelente inerte (gas N₂) — formato sin conservantes.' },
    ],
    fullInci: ['Avene Thermal Spring Water (Avene Aqua)', 'Nitrogen'],
    uses: ['Calmar tras afeitado/depilación', 'Refrescar post-sol', 'Preparar piel antes de hidratante', 'Post-procedimiento (láser, peel)'],
    howTo: 'Spray a 20 cm, dejar 30 s en la piel, secar a toques (no frotar).',
    texture: 'spray',
    finish: 'natural',
    formulaPurpose: 'Capa de hidratación inicial sobre piel limpia; vehículo para aplicar serum sobre piel "damp".',
    compatibleWith: ['bioderma_sensibio_defensive', 'cerave_pm_lotion', 'cerave_moisturizing_cream', 'tacroz_forte', 'avene_cicalfate_plus'],
  },
  {
    id: 'avene_cicalfate_plus',
    name: 'Avène Cicalfate+ Restorative Protective Cream',
    brand: 'avene',
    category: 'soothing',
    slot: 'as_needed',
    url: 'https://www.aveneusa.com/cicalfateplus-restorative-protective-cream#185=776',
    oneLiner: 'Crema reparadora para piel agredida; acelera cicatrización epidérmica.',
    actives: [
      { name: 'Sucralfate', concentration: '~4%', function: 'soothing', role: 'Forma película protectora sobre lesión, libera factores reparadores.' },
      { name: 'Postbiotic [C+ Restore]', function: 'soothing', role: 'Postbiótico patentado; modula microbioma y reduce inflamación.' },
      { name: 'Copper sulfate', function: 'antimicrobial', role: 'Cu²⁺ con acción antiséptica suave.' },
      { name: 'Zinc sulfate', function: 'antimicrobial', role: 'Zn²⁺ acelera reepitelización y reduce inflamación.' },
      { name: 'Hyaluronic acid', function: 'humectant' },
      { name: 'Avène Thermal Spring Water', function: 'thermal_water' },
      { name: 'Petrolatum', function: 'occlusive', role: 'Sello oclusivo para reducir TEWL.' },
    ],
    uses: ['Reparación de heridas superficiales / costras / post-extracción', 'Post-láser, post-microaguja, post-quemadura solar', 'Zonas con dermatitis activa o piel agrietada'],
    howTo: 'Capa fina sobre piel limpia 2-3×/día hasta cicatrización.',
    cautions: ['Solo sobre piel limpia; no aplicar sobre infección activa sin consulta.'],
    texture: 'rich_cream',
    finish: 'natural',
    formulaPurpose: 'Reparador puntual post-brote o post-procedimiento.',
    compatibleWith: ['avene_thermal_spring_water', 'cerave_moisturizing_cream'],
  },
  {
    id: 'avene_ultra_fluid_spf50',
    name: 'Avène Ultra-Fluid Radiance SPF50+',
    brand: 'avene',
    category: 'sunscreen',
    slot: 'am',
    url: 'https://www.avene.co.uk/p/avene-ultra-fluid-radiance-spf50-3282770397697-b5405ca4',
    oneLiner: 'Protector facial fluido SPF50+ con leve tono unificador (Radiance).',
    actives: [
      { name: 'TriAsorB (Phenylene Bis-Diphenyltriazine)', function: 'sunscreen_broad', role: 'Filtro fotoestable amplio espectro UVA-UVB + luz azul.' },
      { name: 'Octocrylene', function: 'sunscreen_uvb' },
      { name: 'Tinosorb S (Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine)', function: 'sunscreen_broad' },
      { name: 'Avène Thermal Spring Water', function: 'thermal_water' },
      { name: 'Pre-tocopheryl', function: 'antioxidant', role: 'Precursor de vit E para protección oxidativa.' },
      { name: 'Iron oxides', function: 'colorant', role: 'Tono universal / protección luz visible.' },
    ],
    uses: ['Fotoprotección diaria de cara y cuello'],
    howTo: 'Última capa AM, 2 dedos para cara+cuello, reaplicar cada 2 h con sol directo.',
    texture: 'lotion',
    finish: 'tinted',
    formulaPurpose: 'Refuerzo SPF como capa final AM.',
    compatibleWith: ['cerave_am_spf30', 'bioderma_sensibio_defensive', 'tacroz_forte', 'deriva_c_micro'],
    verify: true, // formulación UE puede diferir de US/LATAM
  },

  // ── CeraVe ─────────────────────────────────────────────
  {
    id: 'cerave_moisturizing_cream',
    name: 'CeraVe Moisturizing Cream (tub)',
    brand: 'cerave',
    category: 'moisturizer',
    slot: 'either',
    url: 'https://www.cerave.com/skincare/moisturizers/moisturizing-cream',
    oneLiner: 'Crema rica con 3 ceramidas + MVE para piel seca/atópica; cara y cuerpo.',
    actives: [
      { name: 'Ceramide NP (Ceramide 3)', function: 'barrier_lipid' },
      { name: 'Ceramide AP (Ceramide 6-II)', function: 'barrier_lipid' },
      { name: 'Ceramide EOP (Ceramide 1)', function: 'barrier_lipid' },
      { name: 'Cholesterol', function: 'barrier_lipid', role: 'Lípido de barrera nativo.' },
      { name: 'Phytosphingosine', function: 'barrier_lipid' },
      { name: 'Sodium hyaluronate (Hyaluronic acid)', function: 'humectant' },
      { name: 'Glycerin', function: 'humectant' },
      { name: 'Petrolatum', function: 'occlusive' },
      { name: 'Dimethicone', function: 'occlusive' },
      { name: 'MVE Technology (Multivesicular Emulsion)', function: 'other', role: 'Liberación gradual de ceramidas a lo largo del día.' },
    ],
    uses: ['Hidratación intensiva PM', 'Refuerzo de barrera cutánea', 'Cuerpo en zonas secas'],
    howTo: 'Capa generosa PM o tras ducha; aplicar sobre piel "damp" para máxima absorción.',
    texture: 'rich_cream',
    finish: 'natural',
    formulaPurpose: 'Sello PM rico para piel atópica.',
    compatibleWith: ['avene_thermal_spring_water', 'bioderma_sensibio_defensive', 'tacroz_forte', 'dermovate_ointment', 'avene_cicalfate_plus'],
    cautionWith: [
      { id: 'deriva_c_micro', why: 'En PM activa puede sentirse pesada sobre retinoide; usar CeraVe PM Lotion en vez.' },
    ],
  },
  {
    id: 'cerave_eye_repair',
    name: 'CeraVe Eye Repair Cream',
    brand: 'cerave',
    category: 'eye_care',
    slot: 'either',
    url: 'https://www.cerave.com/skincare/moisturizers/eye-repair-cream',
    oneLiner: 'Contorno con ceramidas + niacinamida; ojeras y bolsas suaves.',
    actives: [
      { name: 'Ceramide NP, AP, EOP', function: 'barrier_lipid' },
      { name: 'Niacinamide', function: 'soothing', role: 'Mejora función barrera, reduce hiperpigmentación leve.' },
      { name: 'Hyaluronic acid', function: 'humectant' },
      { name: 'Marine and botanical complex', function: 'plant_extract', role: 'Iluminador de ojeras.' },
    ],
    uses: ['Ojeras', 'Bolsas (puffiness)', 'Hidratación zona orbital'],
    howTo: 'Punto pequeño con anular AM y/o PM, dar toques (no frotar).',
    texture: 'cream',
    finish: 'natural',
    compatibleWith: ['cerave_am_spf30', 'cerave_pm_lotion', 'bioderma_sensibio_defensive'],
    cautionWith: [
      { id: 'bioderma_sensibio_eye', why: 'Redundancia: usar uno u otro, no ambos en la misma sesión.' },
    ],
  },
  {
    id: 'cerave_am_spf30',
    name: 'CeraVe AM Facial Moisturizing Lotion SPF 30',
    brand: 'cerave',
    category: 'sunscreen',
    slot: 'am',
    url: 'https://www.cerave.com/skincare/moisturizers/am-facial-moisturizing-lotion-with-sunscreen',
    oneLiner: 'Hidratante AM con SPF 30 químico (US) + ceramidas + niacinamida.',
    actives: [
      { name: 'Homosalate', function: 'sunscreen_uvb' },
      { name: 'Octinoxate', function: 'sunscreen_uvb' },
      { name: 'Octocrylene', function: 'sunscreen_uvb' },
      { name: 'Zinc oxide', function: 'sunscreen_broad', role: 'UVA + UVB + visible.' },
      { name: 'Ceramide NP, AP, EOP', function: 'barrier_lipid' },
      { name: 'Niacinamide', function: 'soothing' },
      { name: 'Hyaluronic acid', function: 'humectant' },
      { name: 'Glycerin', function: 'humectant' },
    ],
    uses: ['Rutina AM en un paso (hidratación + SPF) cuando exposición es moderada'],
    howTo: '2 dedos cara+cuello como capa final hidratante; reforzar con SPF50+ si exposición directa.',
    cautions: ['SPF 30: si hay sol fuerte o piel sensible, sustituir por Avène Ultra-Fluid SPF50+.'],
    texture: 'lotion',
    finish: 'natural',
    formulaPurpose: 'Hidratante AM con SPF base.',
    compatibleWith: ['avene_ultra_fluid_spf50', 'bioderma_sensibio_defensive', 'avene_thermal_spring_water'],
  },
  {
    id: 'cerave_pm_lotion',
    name: 'CeraVe PM Facial Moisturizing Lotion',
    brand: 'cerave',
    category: 'moisturizer',
    slot: 'pm',
    url: 'https://www.cerave.com/skincare/moisturizers/pm-facial-moisturizing-lotion',
    oneLiner: 'Loción PM ligera, libre de aceite, con niacinamida y ceramidas.',
    actives: [
      { name: 'Ceramide NP, AP, EOP', function: 'barrier_lipid' },
      { name: 'Niacinamide', function: 'soothing', role: 'Calma irritación de retinoides.' },
      { name: 'Hyaluronic acid', function: 'humectant' },
      { name: 'Glycerin', function: 'humectant' },
      { name: 'Dimethicone', function: 'occlusive' },
    ],
    uses: ['Hidratación PM diaria', 'Buffer post-retinoide', 'Calmar irritación por activos'],
    howTo: 'Capa media tras tratamientos PM; en modo Deriva-C esperar 5-10 min después del retinoide.',
    texture: 'lotion',
    finish: 'natural',
    formulaPurpose: 'Hidratante PM ligero compatible con activos.',
    compatibleWith: ['deriva_c_micro', 'tacroz_forte', 'bioderma_sensibio_defensive', 'avene_thermal_spring_water'],
  },

  // ── Bioderma ───────────────────────────────────────────
  {
    id: 'bioderma_sensibio_defensive',
    name: 'Bioderma Sensibio Defensive Serum',
    brand: 'bioderma',
    category: 'serum',
    slot: 'either',
    url: 'https://www.bioderma.ca/en/all-products/sensibio/defensive-serum',
    oneLiner: 'Sérum reforzador de barrera para piel sensible/reactiva diaria.',
    actives: [
      { name: 'Niacinamide', function: 'soothing', role: 'Restaura barrera, calma rojez.' },
      { name: 'Glycerin', function: 'humectant' },
      { name: 'Vitamin E (Tocopherol)', function: 'antioxidant' },
      { name: 'D-A-F® (Dermatological Advanced Fluid)', function: 'soothing', role: 'Patente Bioderma para reducir reactividad neurosensorial.' },
      { name: 'Ginger extract', function: 'soothing' },
    ],
    uses: ['Capa sérum AM/PM antes de hidratante', 'Calmar reactividad post-activos'],
    howTo: '2-3 gotas tras limpiador, sobre piel "damp", antes de hidratante.',
    texture: 'lotion',
    finish: 'natural',
    formulaPurpose: 'Sérum hidratante antiinflamatorio diario.',
    compatibleWith: ['avene_thermal_spring_water', 'cerave_moisturizing_cream', 'cerave_pm_lotion', 'cerave_am_spf30', 'avene_ultra_fluid_spf50', 'ceramid_gel_dermashop'],
  },
  {
    id: 'bioderma_sensibio_eye',
    name: 'Bioderma Sensibio Eye',
    brand: 'bioderma',
    category: 'eye_care',
    slot: 'either',
    url: 'https://www.bioderma.us/en/p/sensibio-eye.html#28692B',
    oneLiner: 'Contorno calmante y descongestivo para piel sensible.',
    actives: [
      { name: 'Caffeine', function: 'caffeine', role: 'Reduce bolsas vía vasoconstricción.' },
      { name: 'Ginkgo biloba', function: 'plant_extract', role: 'Mejora microcirculación.' },
      { name: 'Bisabolol', function: 'soothing' },
      { name: 'D-A-F® patent', function: 'soothing' },
    ],
    uses: ['Ojeras', 'Bolsas', 'Pieles reactivas en zona orbital'],
    howTo: 'Punto pequeño con anular en órbita externa AM/PM.',
    texture: 'gel_cream',
    finish: 'natural',
    cautionWith: [
      { id: 'cerave_eye_repair', why: 'Redundancia con otro contorno; alternar, no apilar.' },
    ],
  },
  {
    id: 'bioderma_sensibio_ds_cream',
    name: 'Bioderma Sensibio DS+ Cream',
    brand: 'bioderma',
    category: 'treatment_rx',
    slot: 'pm',
    url: 'https://www.bioderma.ie/our-products/sensibio/ds-creme',
    oneLiner: 'Crema dirigida a piel con dermatitis seborreica (placas/escamas).',
    actives: [
      { name: 'Piroctone Olamine', function: 'active_antifungal', role: 'Activo contra Malassezia spp.' },
      { name: 'Saccharide isomerate', function: 'humectant' },
      { name: 'Salicylic acid', concentration: 'baja', function: 'active_bha', role: 'Queratolítico suave para descamación.' },
      { name: 'Bisabolol', function: 'soothing' },
    ],
    uses: ['Placas rojas/escamas en alas nasales, cejas, línea de pelo', 'Caspa facial recurrente'],
    howTo: 'Aplicar 2×/día sobre zona afectada hasta resolver, luego 1×/día mantenimiento.',
    cautions: ['Si quemazón persistente, reducir frecuencia.', 'Contiene salicílico bajo: pausar en brote atópico.'],
    skipOnFlare: true,
    texture: 'cream',
    finish: 'natural',
  },

  // ── Tratamientos prescritos / activos ──────────────────
  {
    id: 'deriva_c_micro',
    name: 'Deriva-C Micro (Adapalene 0.1% Microsphere + Clindamycin 1%)',
    brand: 'glenmark',
    category: 'treatment_rx',
    slot: 'pm',
    url: 'https://consultaremedios.com.br/deriva-c-micro/bula',
    oneLiner: 'Gel tópico para acné: retinoide + antibiótico en microsfera.',
    actives: [
      { name: 'Adapalene', concentration: '0.1%', function: 'active_retinoid', role: 'Modula queratinización folicular, antiinflamatorio.' },
      { name: 'Clindamycin phosphate', concentration: '1%', function: 'active_antibiotic', role: 'Reduce P. acnes (C. acnes).' },
    ],
    uses: ['Acné inflamatorio leve-moderado', 'Comedones'],
    howTo: 'Capa fina PM sobre piel SECA (esperar 15-20 min tras limpiador), evitando ojos/labios/comisuras/cuello.',
    cautions: [
      'Solo PM (adapaleno fotosensibilizante).',
      'SPF50+ obligatorio AM siguiente.',
      'Irritación inicial 2-4 sem; hidratar bien con CeraVe PM.',
      'No combinar con BHA/AHA/exfoliantes.',
      'Resistencia bacteriana si clinda > 12 sem.',
    ],
    skipOnFlare: true,
    courseLimited: true,
    texture: 'gel',
    finish: 'matte',
    compatibleWith: ['cerave_pm_lotion', 'avene_ultra_fluid_spf50', 'eucerin_aquaphor_lip'],
    cautionWith: [
      { id: 'cerave_moisturizing_cream', why: 'Demasiado oclusiva sobre retinoide → preferir CeraVe PM Lotion.' },
      { id: 'bioderma_sensibio_ds_cream', why: 'Doble queratolítico (adapaleno + salicílico) irrita.' },
    ],
  },
  {
    id: 'tacroz_forte',
    name: 'Tacroz Forte Ointment (Tacrolimus 0.1%)',
    brand: 'sun_pharma',
    category: 'treatment_rx',
    slot: 'either',
    url: 'https://www.medicinesfaq.com/brand/TACROZ-FORTE-OINTMENT',
    oneLiner: 'Inmunomodulador tópico (inhibidor de calcineurina) para dermatitis atópica.',
    actives: [
      { name: 'Tacrolimus', concentration: '0.1%', function: 'active_calcineurin_inhibitor', role: 'Suprime activación de células T, reduce inflamación atópica sin atrofia cutánea.' },
    ],
    uses: ['Dermatitis atópica moderada-severa', 'Eccema en zonas finas (cara, párpados) ahorrando esteroide'],
    howTo: 'Capa muy fina 2×/día sobre lesiones, masajear hasta absorber.',
    cautions: [
      'Sensación de quemazón los primeros 2-3 días (normal).',
      'SPF50+ obligatorio en zonas tratadas.',
      'No oclusión salvo indicación médica.',
      'No usar sobre infecciones activas (HSV, impétigo).',
    ],
    courseLimited: true,
    texture: 'ointment',
    finish: 'oily',
    compatibleWith: ['cerave_moisturizing_cream', 'cerave_pm_lotion', 'avene_thermal_spring_water', 'avene_ultra_fluid_spf50'],
  },
  {
    id: 'dermovate_ointment',
    name: 'Dermovate Ointment 0.05% (Clobetasol Propionate)',
    brand: 'gsk',
    category: 'treatment_rx',
    slot: 'either',
    url: 'https://www.medicinesfaq.com/brand/dermovate-ointment-0.05-',
    oneLiner: 'Corticoide tópico de potencia muy alta (rescate de brote).',
    actives: [
      { name: 'Clobetasol propionate', concentration: '0.05%', function: 'active_corticoid', role: 'Corticoide superpotente (clase I, US / clase IV UK); cortocircuita inflamación.' },
    ],
    uses: ['Brotes severos de psoriasis / liquen / eccema en zonas gruesas'],
    howTo: 'Capa MUY fina 1-2×/día por máximo 2 semanas seguidas.',
    cautions: [
      'NO usar en cara, ingles, axilas, pliegues (atrofia rápida).',
      'NO en niños sin indicación.',
      'Suspender al ceder el brote y bajar a corticoide más débil o tacrolimus.',
      'Riesgo de rebote si se corta abruptamente tras uso largo.',
    ],
    courseLimited: true,
    texture: 'ointment',
    finish: 'oily',
    compatibleWith: ['cerave_moisturizing_cream', 'avene_thermal_spring_water'],
    cautionWith: [
      { id: 'tacroz_forte', why: 'Aplicar en zonas distintas: dermovate en gruesos, tacroz en finos.' },
    ],
  },

  // ── SOS / labial / soothing ────────────────────────────
  {
    id: 'eucerin_aquaphor_lip',
    name: 'Eucerin Aquaphor SOS Lip Repair',
    brand: 'eucerin',
    category: 'lip_care',
    slot: 'as_needed',
    url: 'https://int.eucerin.com/products/aquaphor/sos-lip-repair',
    oneLiner: 'Bálsamo labial reparador con petrolatum + pantenol + bisabolol.',
    actives: [
      { name: 'Petrolatum', concentration: '~40%', function: 'occlusive', role: 'Sello oclusivo; reduce TEWL labial 99% (estudio Eucerin).' },
      { name: 'Panthenol (Pro-Vitamin B5)', function: 'soothing' },
      { name: 'Bisabolol', function: 'soothing' },
      { name: 'Glycerin', function: 'humectant' },
      { name: 'Shea butter', function: 'emollient' },
    ],
    uses: ['Labios agrietados / queilitis', 'Comisuras irritadas por retinoides'],
    howTo: 'Reaplicar cada vez que haya tirantez; siempre antes de dormir.',
    texture: 'balm',
    finish: 'oily',
    compatibleWith: ['deriva_c_micro', 'tacroz_forte'],
  },
  {
    id: 'bioderma_atoderm_sos_spray',
    name: 'Bioderma Atoderm SOS Spray',
    brand: 'bioderma',
    category: 'soothing',
    slot: 'as_needed',
    url: 'https://www.bioderma.com.au/products/atoderm/sos-spray',
    oneLiner: 'Spray anti-picor para piel atópica/muy seca.',
    actives: [
      { name: 'Niacinamide', function: 'soothing' },
      { name: 'Enoxolone (Glycyrrhetinic acid)', function: 'soothing', role: 'Antiinflamatorio derivado de regaliz.' },
      { name: 'Zanthoxylum extract', function: 'plant_extract', role: 'Calmante prurito.' },
      { name: 'Glycerin', function: 'humectant' },
    ],
    uses: ['Picor súbito en piel atópica', 'Brote leve sin lesión exudativa'],
    howTo: 'Spray a 10 cm, dejar absorber. Hasta 4×/día.',
    texture: 'spray',
    finish: 'natural',
    compatibleWith: ['tacroz_forte', 'cerave_moisturizing_cream', 'avene_thermal_spring_water'],
  },
  {
    id: 'castor_oil_paracelso',
    name: 'Aceite de Ricino (Paracelso BG)',
    brand: 'paracelso',
    category: 'oil',
    slot: 'pm',
    url: 'https://paracelsobg.com/producto/aceite-de-ricino/',
    oneLiner: 'Aceite de ricino puro · pestañas, cejas, cutículas.',
    actives: [
      { name: 'Ricinus communis seed oil', function: 'emollient', role: 'Rico en ácido ricinoleico (~90%); humectante de queratina.' },
    ],
    uses: ['Pestañas/cejas (estimular crecimiento)', 'Cutículas', 'Puntas del cabello'],
    howTo: 'Cantidad mínima con bastoncillo limpio PM.',
    cautions: ['Lejos de ojos abiertos para evitar irritación.'],
    texture: 'oil',
    finish: 'oily',
  },
  {
    id: 'ceramid_gel_siegfried',
    name: 'Ceramid Gel · Siegfried 100 ml',
    brand: 'dermashop_ec',
    category: 'moisturizer',
    slot: 'either',
    url: 'https://lafarma.com.ec/producto/ceramid-gel-siegfried-x-100ml/',
    oneLiner: 'Gel hidratante con Ceramidas Tipo II — restaurador de barrera para piel seca, atópica o usuarios de retinoides orales.',
    actives: [
      {
        name: 'Ceramides Type II',
        function: 'barrier_lipid',
        role: 'Normaliza queratinización y favorece cohesión celular; reduce pérdida transcutánea de agua (TEWL).',
      },
    ],
    uses: [
      'Piel seca con descamación',
      'Refuerzo de barrera en dermatitis atópica',
      'Soporte en ictiosis, psoriasis, xerodermia',
      'Acompañamiento en usuarios de retinoides orales (isotretinoína)',
    ],
    howTo: 'Aplicación tópica diaria en zonas que requieran hidratación; cara o cuerpo.',
    cautions: ['Uso externo; evitar contacto con ojos.'],
    texture: 'gel',
    finish: 'natural',
    formulaPurpose: 'Hidratante ligero alternativo al CeraVe en AM o noches cálidas; único activo (ceramidas) → muy bajo riesgo de reactividad.',
    compatibleWith: ['avene_thermal_spring_water', 'bioderma_sensibio_defensive', 'cerave_am_spf30', 'avene_ultra_fluid_spf50', 'tacroz_forte', 'cerave_pm_lotion'],
  },

  // ── Oftálmico ──────────────────────────────────────────
  {
    id: 'nicotears_drops',
    name: 'Nicotears (lágrimas artificiales · Saval)',
    brand: 'saval',
    category: 'eye_drops',
    slot: 'as_needed',
    url: 'https://meditodo.com/medicamento/nicotears-saval-py',
    oneLiner: 'Lágrimas artificiales lubricantes para ojo seco.',
    actives: [
      { name: 'Hypromellose (HPMC)', concentration: '0.3% (formulación típica)', function: 'lubricant_eye', role: 'Demulcente; aumenta tiempo de retención lacrimal.' },
      { name: 'Dextran 70', concentration: '0.1% (formulación típica)', function: 'lubricant_eye' },
    ],
    uses: ['Ojo seco por pantallas', 'Sensación arenosa / fatiga ocular'],
    howTo: '1-2 gotas por ojo, hasta 4-6×/día.',
    cautions: ['Si la sensación persiste > 72 h, evaluar con oftalmólogo.'],
    texture: 'water',
    finish: 'na',
    verify: true,
  },

  // ═══════════════════════════════════════════════════════
  // NUEVOS (Fase 0 · ronda 2)
  // ═══════════════════════════════════════════════════════
  {
    id: 'lubriderm_intensive_repair',
    name: 'Lubriderm Reparación Intensiva (crema corporal del usuario)',
    brand: 'lubriderm',
    category: 'body',
    slot: 'either',
    url: 'https://www.lubriderm.com.mx/nuestras-tecnologias/reparacion-intensiva',
    oneLiner: 'Loción corporal reparadora · piel seca a muy seca.',
    actives: [
      { name: 'Pro-Lipid Complex', function: 'barrier_lipid', role: 'Mezcla de lípidos similares a los de la piel para reforzar barrera (ácidos grasos + esteroles).' },
      { name: 'Glycerin', function: 'humectant' },
      { name: 'Petrolatum', function: 'occlusive' },
      { name: 'Dimethicone', function: 'occlusive' },
    ],
    uses: ['Piel corporal seca/áspera', 'Mantenimiento entre brotes atópicos en cuerpo'],
    howTo: 'Aplicar 1-2×/día, idealmente sobre piel todavía húmeda post-ducha.',
    texture: 'lotion',
    finish: 'natural',
    formulaPurpose: 'Hidratante corporal de mantenimiento (crema corporal principal del usuario).',
    compatibleWith: ['avene_thermal_spring_water', 'bioderma_atoderm_sos_spray'],
    verify: true, // INCI completa pendiente de etiqueta MX
  },
  {
    id: 'eucerin_dermatoclean_gel',
    name: 'Eucerin DermatoClean Gel Limpiador',
    brand: 'eucerin',
    category: 'cleanser',
    slot: 'either',
    url: 'https://www.eucerin.es/productos/dermato-clean/gel-limpiador',
    oneLiner: 'Gel limpiador suave de uso diario; retira maquillaje sin resecar piel sensible.',
    actives: [
      { name: 'Hyaluronic acid', function: 'humectant', role: 'Mantiene balance de hidratación durante limpieza.' },
      { name: 'Gluco-Glycerol', function: 'humectant', role: 'Activador de acuaporinas (canales de agua) para hidratación profunda.' },
      { name: 'Mild surfactants (sin sulfatos agresivos)', function: 'solvent' },
    ],
    uses: ['Limpieza facial AM/PM', 'Desmaquillado suave', 'Piel sensible / atópica'],
    howTo: 'Aplicar con manos húmedas, masaje circular 30 s, enjuagar con agua tibia, secar a toques. Idealmente seguir con tónico DermatoClean para piel mixta.',
    cautions: ['No usar agua caliente; agrava barrera atópica.'],
    texture: 'gel',
    finish: 'natural',
    formulaPurpose: 'Primer paso AM/PM — limpiador diario para piel sensible.',
    compatibleWith: ['avene_thermal_spring_water', 'bioderma_sensibio_defensive'],
  },
  {
    id: 'herbal_essences_argan_shampoo',
    name: 'Herbal Essences Aceite de Argán de Marruecos · Shampoo',
    brand: 'herbal_essences',
    category: 'hair_shampoo',
    slot: 'as_needed',
    url: 'https://herbalessencesla.com/es-la/productos/aceite-de-argan/shampoo-aceite-de-argan-de-marruecos/',
    oneLiner: 'Shampoo reparador con mezcla bio:renew y aceite de argán — cabello dañado/poco graso.',
    actives: [
      { name: 'Argan oil (Argania spinosa kernel oil)', function: 'hair_repair', role: 'Reduce porosidad, aporta brillo.' },
      { name: 'bio:renew blend (histidina + aloe + bayas)', function: 'hair_repair', role: 'Mezcla antioxidante propietaria de P&G.' },
      { name: 'Sulfate surfactants', function: 'solvent', role: 'Limpieza profunda — verificar tipo en etiqueta para piel atópica de cuero cabelludo.' },
    ],
    uses: ['Cabello dañado/seco', 'Restaurar brillo'],
    howTo: 'Masajear cuero cabelludo, enjuagar bien.',
    cautions: ['Si hay dermatitis seborreica activa o cuero atópico, evaluar versión libre de sulfatos.'],
    texture: 'gel',
    finish: 'na',
    compatibleWith: ['herbal_essences_argan_conditioner'],
    verify: true,
  },
  {
    id: 'herbal_essences_argan_conditioner',
    name: 'Herbal Essences Aceite de Argán de Marruecos · Acondicionador',
    brand: 'herbal_essences',
    category: 'hair_conditioner',
    slot: 'as_needed',
    url: 'https://herbalessencesla.com/es-la/productos/aceite-de-argan/acondicionador-aceite-de-argan-de-marruecos/',
    oneLiner: 'Acondicionador par del shampoo — sella cutícula y desenreda.',
    actives: [
      { name: 'Argan oil', function: 'hair_repair' },
      { name: 'bio:renew blend', function: 'hair_repair' },
      { name: 'Cationic conditioning agents (e.g., Behentrimonium chloride)', function: 'hair_conditioning_agent', role: 'Reduce frizz y carga estática.' },
    ],
    uses: ['Sellar cutícula tras shampoo', 'Desenredar'],
    howTo: 'Aplicar de medios a puntas, dejar 1-2 min, enjuagar.',
    texture: 'cream',
    finish: 'na',
    compatibleWith: ['herbal_essences_argan_shampoo', 'savital_romero_treatment'],
    verify: true,
  },
  {
    id: 'savital_romero_treatment',
    name: 'Savital Tratamiento Capilar · Elixir de Romero 425ml',
    brand: 'savital',
    category: 'hair_treatment',
    slot: 'as_needed',
    url: 'https://www.fybeca.com/savital-tratamiento-capilar-con-elixir-de-romero--425ml/ECFY_580590.html',
    oneLiner: 'Mascarilla/tratamiento intensivo con romero, biotina y sábila.',
    actives: [
      { name: 'Rosemary (Rosmarinus officinalis) extract', function: 'plant_extract', role: 'Ácido rosmarínico/carnósico — antioxidante y estimulante de microcirculación capilar (Panahi 2015 sugiere eficacia comparable a minoxidil 2% en alopecia androgenética leve).' },
      { name: 'Biotin (Vitamin B7)', function: 'hair_repair', role: 'Cofactor en queratinización.' },
      { name: 'Aloe vera (Sábila)', function: 'soothing', role: 'Calma cuero cabelludo, hidrata fibra.' },
      { name: 'Cationic conditioners', function: 'hair_conditioning_agent' },
    ],
    uses: ['Reparar cabello debilitado', 'Mejorar elasticidad y resistencia', 'Control de frizz'],
    howTo: 'Tras lavar, aplicar de medios a puntas, dejar 3 min, enjuagar.',
    cautions: ['Evitar contacto con ojos.'],
    texture: 'cream',
    finish: 'na',
    compatibleWith: ['herbal_essences_argan_shampoo', 'herbal_essences_argan_conditioner'],
  },
];

// ═══════════════════════════════════════════════════════════
// SUPLEMENTOS Y MEDICACIÓN ORAL
// ═══════════════════════════════════════════════════════════

export interface OralProduct {
  id: string;
  name: string;
  dose: string;
  category: 'amino_acid' | 'vitamin' | 'mineral' | 'fatty_acid' | 'multivitamin' | 'antihistamine';
  defaultTiming: 'morning' | 'lunch' | 'evening' | 'bedtime' | 'with_meal' | 'flexible';
  scheduleType: 'daily' | 'as_needed' | 'irregular' | 'cycle';
  uses: string[];
  cautions?: string[];
  pairsWith?: string[];
  conflictsWith?: string[];
  stockRemaining?: number;
  lowStockThreshold?: number;
  verify?: boolean;
}

export const ORAL: OralProduct[] = [
  {
    id: 'l_arginine_1000',
    name: 'L-Arginina',
    dose: '1000 mg',
    category: 'amino_acid',
    defaultTiming: 'morning',
    scheduleType: 'irregular',
    uses: ['Precursor de óxido nítrico (vasodilatación)', 'Soporte cardiovascular y circulatorio'],
    cautions: [
      'Tomar lejos de lisina (compiten por absorción).',
      'En ayunas o entre comidas para mejor absorción.',
      'Cuidado si herpes labial recurrente (puede activar HSV).',
    ],
    lowStockThreshold: 5,
  },
  {
    id: 'vitamin_e_400',
    name: 'Vitamina E',
    dose: '400 mg α-tocoferol',
    category: 'vitamin',
    defaultTiming: 'with_meal',
    scheduleType: 'irregular',
    uses: ['Antioxidante liposoluble', 'Soporte cutáneo y cardiovascular'],
    cautions: [
      'Liposoluble: tomar con comida que tenga grasa.',
      'Dosis alta (400 mg) — monitorizar si tomas anticoagulantes/AAS por riesgo de sangrado.',
      'Revisar con médico si combinas con omega-3 a largo plazo.',
    ],
    pairsWith: ['omega3_1000'],
  },
  {
    id: 'omega3_1000',
    name: 'Omega 3 (EPA+DHA)',
    dose: '1000 mg',
    category: 'fatty_acid',
    defaultTiming: 'with_meal',
    scheduleType: 'irregular',
    uses: ['Antiinflamatorio sistémico', 'Soporte cardiovascular y cutáneo'],
    cautions: [
      'Liposoluble: con comida.',
      'Conservar refrigerado si la cápsula así lo indica.',
      'Cuidado combinado con E + anticoagulantes (sangrado).',
    ],
    pairsWith: ['vitamin_e_400'],
  },
  {
    id: 'tryptophan_mg_b6_lajusticia',
    name: 'L-Triptófano + Magnesio + Vitamina B6 (Ana María Lajusticia)',
    dose: '1 comprimido (Triptófano 200 mg + Mg 200 mg + B6 1.4 mg — verificar etiqueta)',
    category: 'amino_acid',
    defaultTiming: 'bedtime',
    scheduleType: 'irregular',
    uses: [
      'Precursor de serotonina/melatonina (vía ruta Trp → 5-HTP → 5-HT)',
      'Soporte de sueño y estado de ánimo',
      'B6 como cofactor de la decarboxilasa que convierte 5-HTP en serotonina',
      'Magnesio: relajación muscular → útil para bruxismo nocturno',
    ],
    cautions: [
      'No combinar con ISRS/IMAO (riesgo síndrome serotoninérgico).',
      'Tomar 30-60 min antes de dormir, fuera de comida proteica para que el Trp cruce la BHE.',
      'Magnesio puede causar laxante a dosis >400 mg/día.',
    ],
    pairsWith: ['calcium_d3'],
    verify: true, // confirmar dosis exacta del comprimido AML
  },
  {
    id: 'gelcavit_student',
    name: 'Gelcavit Students (cápsulas blandas)',
    dose: '1 cápsula',
    category: 'multivitamin',
    defaultTiming: 'morning',
    scheduleType: 'irregular',
    uses: [
      'Multivitamínico de soporte cognitivo y energía',
      'Composición: Fósforo, Hierro, Vit C, Aceite de Germen de Trigo, Zinc, Vit A, Vit D2, Complejo B, Vit E, Calcio, Manganeso, Magnesio, Potasio',
      'Activa mente y renueva energía — útil en época de estudio',
    ],
    cautions: [
      'Contiene hierro → separar de Calcio + D3 al menos 2 h.',
      'Contiene Vit E → cuidado si ya tomas vitamin_e_400 aparte (suma).',
      'Almacenar a < 30 °C.',
    ],
    conflictsWith: ['calcium_d3'], // hierro vs calcio (absorción)
    verify: true, // dosis individuales de cada vit/min en la cápsula
  },
  {
    id: 'loratadine_10',
    name: 'Loratadina',
    dose: '10 mg',
    category: 'antihistamine',
    defaultTiming: 'morning',
    scheduleType: 'as_needed',
    uses: ['Antihistamínico H1 no sedante', 'Rinitis, urticaria, prurito alérgico', 'Primer escalón en brote de dermatitis atópica'],
    cautions: [
      'Si urticaria crónica refractaria, dosis 2-4× off-label requiere indicación médica.',
      'Evitar combinar con otros antihistamínicos sin pauta.',
    ],
  },
  {
    id: 'calcium_d3',
    name: 'Calcio + Vitamina D3',
    dose: '600 mg Calcio + D3 (combinado)',
    category: 'mineral',
    defaultTiming: 'with_meal',
    scheduleType: 'irregular',
    uses: ['Soporte óseo', 'Mantenimiento de niveles de D3 (latitud Ecuador interior)'],
    cautions: [
      'Separar al menos 2 h del Gelcavit Students (que tiene hierro) por interferencia de absorción.',
      'D3 es liposoluble: tomar con grasa.',
      'No exceder 1000 mg de Ca elemental al día sin indicación médica.',
    ],
    conflictsWith: ['gelcavit_student'],
    verify: true, // confirmar si los 600 mg son Ca elemental o sal de Ca
  },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function findTopical(id: string): Product | undefined {
  return TOPICALS.find(p => p.id === id);
}

export function findOral(id: string): OralProduct | undefined {
  return ORAL.find(p => p.id === id);
}

export function flareSensitiveTopicals(): Product[] {
  return TOPICALS.filter(p => p.skipOnFlare === true);
}

/**
 * Devuelve productos que comparten una función de ingrediente —
 * útil para detectar redundancias o sinergias.
 */
export function topicalsByFunction(fn: IngredientFunction): Product[] {
  return TOPICALS.filter(p => p.actives.some(a => a.function === fn));
}

export const CATALOG_STATS = {
  topicals: TOPICALS.length,
  oral: ORAL.length,
  total: TOPICALS.length + ORAL.length,
};
