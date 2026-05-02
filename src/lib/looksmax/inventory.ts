// ═══════════════════════════════════════════════════════════
// inventory.ts · registro de herramientas físicas adquiridas
//
// El usuario marca qué herramientas posee. Cada tool declara
// qué hábitos / fases desbloquea. El motor del coach y el
// adapter de Génesis leen el inventario para decidir qué
// segmentos mostrar (raspado de lengua, drenaje con aceite,
// canela vs menta, etc.).
//
// Free-tier (mewing, chin tuck, yoga facial, hidratación,
// dormir boca arriba) NO requiere herramienta y se trackean
// siempre. Solo lo que cuesta dinero / requiere compra vive
// aquí.
//
// Persistencia: localStorage `ma-looksmax-inventory`. SSR-safe
// (todas las lecturas chequean `window`).
// ═══════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import type { HabitId } from '@/lib/common/habits';

const STORAGE_KEY = 'ma-looksmax-inventory';
const EVENT_NAME = 'ma:looksmax-inventory-change';

// ─── Identificadores ─────────────────────────────────────────

export type ToolId =
  // Higiene oral
  | 'tongue_scraper'
  | 'cinnamon_paste'
  | 'cinnamon_mouthwash'
  | 'dental_floss_premium'
  // Estructura facial
  | 'jawliner'
  | 'mouth_tape'
  | 'supine_pillow'
  | 'johnson_oil'
  | 'gua_sha'
  // Piel
  | 'spf_30'
  | 'vitc_serum'
  | 'salicylic_acid'
  | 'thermal_water'
  | 'tretinoin'
  | 'retinoid_otc'
  // Ojos
  | 'eye_drops'
  | 'latisse'
  | 'eyebrow_razor'
  // Cabello
  | 'derma_roller_05'
  | 'derma_roller_15'
  | 'minoxidil_5'
  | 'finasteride'
  | 'rosemary_oil'
  | 'silk_pillowcase'
  // Hidratación / metabolismo
  | 'liquid_potassium'
  | 'electrolyte_mix';

export type ToolPillar =
  | 'oral'
  | 'structure'
  | 'skin'
  | 'eyes'
  | 'hair'
  | 'metabolism';

export type ToolCostTier = 'low' | 'mid' | 'high' | 'medical';

export interface Tool {
  id: ToolId;
  label: string;
  pillar: ToolPillar;
  costTier: ToolCostTier;
  /** Qué hábitos del registro `habits.ts` se activan al marcar
   *  esta tool como adquirida. Pueden ser varios. */
  enables: HabitId[];
  /** Nota corta visible en la UI (educativa o advertencia). */
  notes: string;
  /** Si true, requiere consulta médica previa antes de activarse. */
  medicalGate?: boolean;
}

// ─── Catálogo ────────────────────────────────────────────────
// Listado completo, ordenado por pillar. La UI agrupa por pillar
// y dentro de cada pillar por costTier (low → medical).

export const TOOLS: Tool[] = [
  // ── Oral ────────────────────────────────────────────────
  {
    id: 'tongue_scraper',
    label: 'Raspador de lengua',
    pillar: 'oral',
    costTier: 'low',
    enables: ['tongue_scraper'],
    notes:
      'Elimina la capa blanca de la lengua mucho mejor que el cepillo. Objetivo: lengua rosada como la de un bebé.',
  },
  {
    id: 'cinnamon_paste',
    label: 'Pasta de canela',
    pillar: 'oral',
    costTier: 'low',
    enables: ['cinnamon_paste'],
    notes:
      'Bactericida real (no solo enmascarante como la menta). Ataca la raíz del mal aliento.',
  },
  {
    id: 'cinnamon_mouthwash',
    label: 'Enjuague de canela',
    pillar: 'oral',
    costTier: 'low',
    enables: ['cinnamon_paste'],
    notes:
      'Complemento al cepillado. Cubre toda la cavidad bucal incluyendo encías y mejillas internas.',
  },
  {
    id: 'dental_floss_premium',
    label: 'Hilo dental encerado',
    pillar: 'oral',
    costTier: 'low',
    enables: ['floss'],
    notes:
      'Indispensable cada noche. Sin hilo, llevas comida en descomposición fermentando entre los dientes.',
  },

  // ── Estructura facial ───────────────────────────────────
  {
    id: 'jawliner',
    label: 'Jawliner / chewing gum resistente',
    pillar: 'structure',
    costTier: 'low',
    enables: ['chewing_advanced'],
    notes:
      'Solo en molares posteriores, nunca en incisivos. Carga incorrecta puede dañar la articulación temporomandibular.',
  },
  {
    id: 'mouth_tape',
    label: 'Cinta microporosa (mouth tape)',
    pillar: 'structure',
    costTier: 'low',
    enables: ['mouth_tape'],
    notes:
      'Fuerza respiración nasal nocturna. Contraindicado en rinitis severa o apnea no diagnosticada.',
  },
  {
    id: 'supine_pillow',
    label: 'Almohada cervical / de avión',
    pillar: 'structure',
    costTier: 'low',
    enables: ['sleep_supine'],
    notes:
      'Mantiene la cabeza centrada al dormir. Previene asimetría facial por presión lateral nocturna.',
  },
  {
    id: 'johnson_oil',
    label: 'Aceite mineral Johnson',
    pillar: 'structure',
    costTier: 'low',
    enables: ['lymphatic_facial'],
    notes:
      'Slip puro para drenaje linfático. No comedogénico en uso puntual; siempre se enjuaga después.',
  },
  {
    id: 'gua_sha',
    label: 'Piedra Gua Sha',
    pillar: 'structure',
    costTier: 'low',
    enables: ['lymphatic_facial'],
    notes:
      'Herramienta clásica para drenaje linfático. Presión ligera, dirección hacia clavícula.',
  },

  // ── Piel ────────────────────────────────────────────────
  {
    id: 'spf_30',
    label: 'Protector solar SPF 30+',
    pillar: 'skin',
    costTier: 'low',
    enables: ['spf_am'],
    notes:
      'No negociable. Dos dedos completos para cara y cuello. UVA atraviesa el vidrio: úsalo aún en interiores.',
  },
  {
    id: 'vitc_serum',
    label: 'Vitamina C sérum',
    pillar: 'skin',
    costTier: 'mid',
    enables: ['vitc_am'],
    notes:
      'Antioxidante AM. Potencia el SPF neutralizando radicales del UV. Aplicar sobre piel limpia y húmeda.',
  },
  {
    id: 'salicylic_acid',
    label: 'Ácido salicílico (BHA)',
    pillar: 'skin',
    costTier: 'low',
    enables: ['exfoliation_weekly'],
    notes:
      'Exfoliación química semanal. NO combinar con retinoide la misma noche: irritación garantizada.',
  },
  {
    id: 'thermal_water',
    label: 'Agua termal (Avène / La Roche)',
    pillar: 'skin',
    costTier: 'low',
    enables: [],
    notes:
      'Calma flares leves. Aplicar 1 min sobre piel + sellar con humectante.',
  },
  {
    id: 'tretinoin',
    label: 'Tretinoína (Retin-A)',
    pillar: 'skin',
    costTier: 'medical',
    medicalGate: true,
    enables: ['retinoid_pm'],
    notes:
      'Receta médica. Producción de colágeno y renovación celular. Obligatorio SPF estricto al día siguiente. Sandwich con humectante si irrita.',
  },
  {
    id: 'retinoid_otc',
    label: 'Retinoide OTC (adapaleno 0.1%)',
    pillar: 'skin',
    costTier: 'mid',
    enables: ['retinoid_pm'],
    notes:
      'Adapaleno tamaño guisante para toda la cara. Más cantidad NO es mejor — solo irrita.',
  },

  // ── Ojos ────────────────────────────────────────────────
  {
    id: 'eye_drops',
    label: 'Gotero ocular (lágrima artificial)',
    pillar: 'eyes',
    costTier: 'low',
    enables: ['eye_drops_am'],
    notes:
      'Sin conservantes preferible. Rehidrata córnea tras 7-9 h sin parpadeo activo. Aplica al saco lagrimal, no sobre el iris.',
  },
  {
    id: 'latisse',
    label: 'Bimatoprost (Latisse)',
    pillar: 'eyes',
    costTier: 'medical',
    medicalGate: true,
    enables: [],
    notes:
      'Densifica pestañas pero existe riesgo documentado de pérdida de grasa periorbital (mirada hundida). Evaluar pros/contras con dermatólogo.',
  },
  {
    id: 'eyebrow_razor',
    label: 'Navaja de cejas',
    pillar: 'eyes',
    costTier: 'low',
    enables: ['brow_grooming_week'],
    notes:
      'Definición precisa de la forma. Forma ideal: inclinación neutral o positiva, evitar redondeada.',
  },

  // ── Cabello ─────────────────────────────────────────────
  {
    id: 'derma_roller_05',
    label: 'Derma-roller 0.5 mm',
    pillar: 'hair',
    costTier: 'low',
    enables: ['derma_roller_week'],
    notes:
      'Semanal. Aumenta absorción de minoxidil hasta 300%. Esterilizar antes y después de cada uso.',
  },
  {
    id: 'derma_roller_15',
    label: 'Derma-pen 1.5 mm',
    pillar: 'hair',
    costTier: 'mid',
    enables: [],
    notes:
      'Solo para cicatrices reales de acné. Profundidades menores son ineficaces para tejido cicatricial.',
  },
  {
    id: 'minoxidil_5',
    label: 'Minoxidil 5%',
    pillar: 'hair',
    costTier: 'medical',
    medicalGate: true,
    enables: ['minoxidil_application'],
    notes:
      'Vasodilatador. Espera shedding phase en las primeras semanas (renovación folicular, no fracaso). Evitar zona ocular.',
  },
  {
    id: 'finasteride',
    label: 'Finasterida',
    pillar: 'hair',
    costTier: 'medical',
    medicalGate: true,
    enables: ['finasteride_dose'],
    notes:
      'Inhibidor DHT. Requiere perfil hormonal previo. Riesgo de Síndrome Post-Finasterida (PFS) y efectos sexuales en ~2% de usuarios.',
  },
  {
    id: 'rosemary_oil',
    label: 'Aceite de romero',
    pillar: 'hair',
    costTier: 'low',
    enables: [],
    notes:
      'Alternativa natural. Estudios sugieren eficacia comparable a minoxidil 2% sobre 6 meses. Diluir en aceite portador.',
  },
  {
    id: 'silk_pillowcase',
    label: 'Funda de almohada de seda',
    pillar: 'hair',
    costTier: 'low',
    enables: [],
    notes:
      'Reduce fricción nocturna. Crítico para cabello tipo 3-4. También beneficia piel facial.',
  },

  // ── Metabolismo / hidratación ───────────────────────────
  {
    id: 'liquid_potassium',
    label: 'Potasio líquido',
    pillar: 'metabolism',
    costTier: 'low',
    enables: ['potassium_intake'],
    notes:
      'Mayor biodisponibilidad que pastillas. Diurético natural que equilibra el sodio y desinfla el rostro.',
  },
  {
    id: 'electrolyte_mix',
    label: 'Electrolitos comerciales',
    pillar: 'metabolism',
    costTier: 'low',
    enables: ['electrolyte_intake'],
    notes:
      'Sodio + potasio + magnesio en ratio óptimo. Útil post-cardio o en clima cálido.',
  },
];

// ─── Tipo de almacenamiento ──────────────────────────────────

interface StoredEntry {
  acquiredAt: string; // ISO datetime
  /** Solo true cuando el usuario confirmó haber consultado médico
   *  para una tool con `medicalGate`. Para tools sin gate es undefined. */
  medicalConfirmed?: boolean;
}

type InventoryStore = Partial<Record<ToolId, StoredEntry>>;

// ─── Persistencia (SSR-safe) ─────────────────────────────────

function load(): InventoryStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(store: InventoryStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch { /* ignore */ }
}

// ─── API funcional (consumible fuera de React) ───────────────

/** Devuelve true si el usuario marcó la tool como adquirida. */
export function hasTool(id: ToolId): boolean {
  return Boolean(load()[id]);
}

/** ISO datetime cuando la tool fue añadida, o null. */
export function acquiredAt(id: ToolId): string | null {
  return load()[id]?.acquiredAt ?? null;
}

/** Marca la tool como adquirida hoy. Para `medicalGate` requiere
 *  pasar `medicalConfirmed: true` o el set falla silenciosamente. */
export function addTool(id: ToolId, opts?: { medicalConfirmed?: boolean }): boolean {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return false;
  if (tool.medicalGate && !opts?.medicalConfirmed) return false;
  const store = load();
  store[id] = {
    acquiredAt: new Date().toISOString(),
    ...(tool.medicalGate ? { medicalConfirmed: true } : {}),
  };
  save(store);
  return true;
}

/** Remueve la tool del inventario. */
export function removeTool(id: ToolId): void {
  const store = load();
  delete store[id];
  save(store);
}

/** Snapshot completo (read-only para consumidores). */
export function loadInventory(): Readonly<InventoryStore> {
  return load();
}

/** Conjunto de tool IDs poseídas (útil para filtros rápidos). */
export function ownedToolIds(): Set<ToolId> {
  return new Set(Object.keys(load()) as ToolId[]);
}

// ─── Hook React (sincroniza entre componentes y pestañas) ────

/**
 * Hook reactivo del inventario. Se actualiza:
 *  - tras cada add/remove en la misma pestaña (custom event).
 *  - tras cambios en otras pestañas (storage event).
 */
export function useInventory(): {
  owned: Set<ToolId>;
  has: (id: ToolId) => boolean;
  add: (id: ToolId, opts?: { medicalConfirmed?: boolean }) => boolean;
  remove: (id: ToolId) => void;
  acquiredAt: (id: ToolId) => string | null;
} {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) onChange();
    });
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
    };
  }, []);

  // El `tick` no se usa directamente en los valores devueltos pero
  // fuerza el re-render que recomputa snapshots desde localStorage.
  void tick;

  return {
    owned: ownedToolIds(),
    has: hasTool,
    add: addTool,
    remove: removeTool,
    acquiredAt,
  };
}

// ─── Etiquetas humanas para UI ───────────────────────────────

export const PILLAR_LABEL: Record<ToolPillar, string> = {
  oral:       'higiene oral',
  structure:  'estructura facial',
  skin:       'piel',
  eyes:       'ojos',
  hair:       'cabello',
  metabolism: 'metabolismo',
};

export const COST_TIER_LABEL: Record<ToolCostTier, string> = {
  low:     'bajo',
  mid:     'medio',
  high:    'alto',
  medical: 'médico',
};

export const COST_TIER_ORDER: ToolCostTier[] = ['low', 'mid', 'high', 'medical'];
