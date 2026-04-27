'use client';

// ═══════════════════════════════════════════════════════════
// ProductDetailSheet · bottom sheet GSAP que muestra el
// detalle de un producto (tópico u oral).
//
// Renderiza:
//   · Header con marca, categoría, link a la fuente.
//   · Ingredientes activos con función y rol.
//   · Cómo aplicarlo / posología.
//   · Indicaciones (uses).
//   · Advertencias (cautions) — destacadas en rojo si las hay.
//   · Compatibilidades / conflictos.
//   · INCI completa (colapsable, solo si está disponible).
//
// Animación de entrada/salida idéntica al ConditionsSheet:
// backdrop fade + sheet slide-up con expo.out.
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  X, ExternalLink, AlertTriangle, FlaskConical, Sparkles,
  CheckCircle2, ChevronDown,
} from 'lucide-react';
import { findTopical, findOral, type Product, type OralProduct } from '@/lib/coach/catalog';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

interface ProductDetailSheetProps {
  productId: string | null;
  onClose: () => void;
}

const FN_LABEL: Record<string, string> = {
  humectant: 'Humectante',
  emollient: 'Emoliente',
  occlusive: 'Oclusivo',
  barrier_lipid: 'Lípido de barrera',
  soothing: 'Calmante',
  thermal_water: 'Agua termal',
  active_bha: 'BHA · ácido salicílico',
  active_aha: 'AHA',
  active_retinoid: 'Retinoide',
  active_calcineurin_inhibitor: 'Inhibidor de calcineurina',
  active_corticoid: 'Corticoide tópico',
  active_antibiotic: 'Antibiótico',
  active_antihistamine: 'Antihistamínico',
  spf: 'Filtro solar',
  cleanser_surfactant: 'Tensoactivo limpiador',
};

const CATEGORY_LABEL: Record<string, string> = {
  cleanser: 'Limpiador',
  toner: 'Tónico',
  serum: 'Serum',
  moisturizer: 'Hidratante',
  sunscreen: 'Solar',
  eye_cream: 'Contorno de ojos',
  treatment_rx: 'Tratamiento Rx',
  treatment_otc: 'Tratamiento OTC',
  occlusive_balm: 'Bálsamo oclusivo',
  thermal_water: 'Agua termal',
  body_cream: 'Crema corporal',
  body_spray: 'Spray corporal',
  lip_balm: 'Bálsamo labial',
  multivitamin: 'Multivitamínico',
  amino_acid: 'Aminoácido',
  vitamin: 'Vitamina',
  mineral: 'Mineral',
  fatty_acid: 'Ácido graso',
  antihistamine: 'Antihistamínico',
  lubricant_eye: 'Lubricante ocular',
  other: 'Otro',
};

export default function ProductDetailSheet({ productId, onClose }: ProductDetailSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isAnimatingOut = useRef(false);
  const [showInci, setShowInci] = useState(false);

  // Resolver producto
  const product = useMemo(() => {
    if (!productId) return null;
    return findTopical(productId) ?? findOral(productId) ?? null;
  }, [productId]);

  const isOral = product && 'dose' in product;
  const open = !!productId;

  // Animación de entrada
  useEffect(() => {
    if (!open) return;
    const backdrop = backdropRef.current;
    const sheet = sheetRef.current;
    if (!backdrop || !sheet) return;

    isAnimatingOut.current = false;
    setShowInci(false);

    gsap.set(backdrop, { opacity: 0 });
    gsap.set(sheet, { yPercent: 100 });

    const tl = gsap.timeline();
    tl.to(backdrop, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0);
    tl.to(sheet, { yPercent: 0, duration: 0.36, ease: 'expo.out' }, 0.04);

    return () => { tl.kill(); };
  }, [open, productId]);

  const close = () => {
    if (isAnimatingOut.current) return;
    const backdrop = backdropRef.current;
    const sheet = sheetRef.current;
    if (!backdrop || !sheet) {
      onClose();
      return;
    }
    isAnimatingOut.current = true;
    haptics.tick();
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingOut.current = false;
        onClose();
      },
    });
    tl.to(sheet, { yPercent: 100, duration: 0.28, ease: 'power2.in' }, 0);
    tl.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]">
      <div
        ref={backdropRef}
        onClick={close}
        className="absolute inset-0"
        style={{
          background: hexToRgba(SUNRISE.night, 0.78),
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.predawn2, 0.96)} 0%, ${hexToRgba(SUNRISE.night, 0.98)} 100%)`,
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
          borderBottom: 'none',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            aria-hidden
            className="block w-10 h-1 rounded-full"
            style={{ background: hexToRgba(SUNRISE_TEXT.muted as unknown as string, 0.5) }}
          />
        </div>

        {!product ? (
          <NotFoundView productId={productId} onClose={close} />
        ) : isOral ? (
          <OralView product={product as OralProduct} onClose={close} />
        ) : (
          <TopicalView
            product={product as Product}
            onClose={close}
            showInci={showInci}
            onToggleInci={() => { haptics.tick(); setShowInci(v => !v); }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VISTAS POR TIPO
// ═══════════════════════════════════════════════════════════

function TopicalView({
  product,
  onClose,
  showInci,
  onToggleInci,
}: {
  product: Product;
  onClose: () => void;
  showInci: boolean;
  onToggleInci: () => void;
}) {
  return (
    <>
      <Header
        kicker={CATEGORY_LABEL[product.category] ?? product.category}
        title={product.name}
        url={product.url}
        onClose={onClose}
      />

      <div className="scroll-area flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        <p
          className="font-mono text-[11.5px] leading-snug px-3 py-2 mb-3 rounded-lg"
          style={{
            color: SUNRISE_TEXT.soft,
            background: hexToRgba(SUNRISE.rise2, 0.06),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
          }}
        >
          {product.oneLiner}
        </p>

        {product.formulaPurpose && (
          <Subsection icon={<Sparkles size={12} strokeWidth={1.85} />} label="Rol en la rutina">
            <p className="font-mono text-[11.5px] leading-snug" style={{ color: SUNRISE_TEXT.primary }}>
              {product.formulaPurpose}
            </p>
          </Subsection>
        )}

        {/* Activos */}
        {product.actives.length > 0 && (
          <Subsection icon={<FlaskConical size={12} strokeWidth={1.85} />} label="Activos clave">
            <div className="flex flex-col gap-1.5">
              {product.actives.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: hexToRgba(SUNRISE.predawn2, 0.4),
                    border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className="font-display italic font-[400] text-[14px] leading-tight"
                      style={{ color: SUNRISE_TEXT.primary }}
                    >
                      {a.name}
                    </span>
                    {a.concentration && (
                      <span
                        className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          background: hexToRgba(SUNRISE.rise2, 0.16),
                          color: SUNRISE.rise2,
                          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.4)}`,
                        }}
                      >
                        {a.concentration}
                      </span>
                    )}
                    <span
                      className="font-ui text-[8.5px] tracking-[0.28em] uppercase ml-auto"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {FN_LABEL[a.function] ?? a.function}
                    </span>
                  </div>
                  {a.role && (
                    <p
                      className="font-mono text-[10.5px] leading-snug"
                      style={{ color: SUNRISE_TEXT.muted }}
                    >
                      {a.role}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Subsection>
        )}

        {/* Cómo aplicar */}
        {product.howTo && (
          <Subsection icon={<CheckCircle2 size={12} strokeWidth={1.85} />} label="Cómo aplicar">
            <p className="font-mono text-[11.5px] leading-snug" style={{ color: SUNRISE_TEXT.primary }}>
              {product.howTo}
            </p>
          </Subsection>
        )}

        {/* Usos */}
        {product.uses.length > 0 && (
          <Subsection label="Indicaciones">
            <ul className="flex flex-col gap-1">
              {product.uses.map((u, i) => (
                <li
                  key={i}
                  className="font-mono text-[11px] leading-snug pl-3 relative"
                  style={{ color: SUNRISE_TEXT.soft }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[7px] w-1 h-1 rounded-full"
                    style={{ background: SUNRISE.rise2 }}
                  />
                  {u}
                </li>
              ))}
            </ul>
          </Subsection>
        )}

        {/* Advertencias */}
        {product.cautions && product.cautions.length > 0 && (
          <CautionsBox cautions={product.cautions} />
        )}

        {/* Texturas / pH */}
        {(product.texture || product.finish || product.phApprox) && (
          <Subsection label="Detalles físicos">
            <div className="flex flex-wrap gap-1.5">
              {product.texture && <Tag>{product.texture}</Tag>}
              {product.finish && product.finish !== 'na' && <Tag>{product.finish}</Tag>}
              {product.phApprox && <Tag>pH {product.phApprox}</Tag>}
            </div>
          </Subsection>
        )}

        {/* INCI completa colapsable */}
        {product.fullInci && product.fullInci.length > 0 && (
          <button
            type="button"
            onClick={onToggleInci}
            className="w-full mt-4 px-3 py-2 rounded-lg flex items-center justify-between text-left"
            style={{
              background: hexToRgba(SUNRISE.predawn2, 0.4),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
            }}
          >
            <span
              className="font-ui text-[10px] tracking-[0.28em] uppercase"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              INCI completa · {product.fullInci.length} ingredientes
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.85}
              style={{
                color: SUNRISE_TEXT.muted,
                transform: showInci ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms',
              }}
            />
          </button>
        )}
        {showInci && product.fullInci && (
          <p
            className="font-mono text-[10.5px] leading-relaxed mt-2 px-3 py-2 rounded-lg"
            style={{
              color: SUNRISE_TEXT.muted,
              background: hexToRgba(SUNRISE.night, 0.5),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.1)}`,
            }}
          >
            {product.fullInci.join(' · ')}
          </p>
        )}

        {product.verify && (
          <p
            className="font-mono text-[10px] tracking-wider mt-3 italic"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            ⚠ Datos pendientes de verificar contra etiqueta física.
          </p>
        )}
      </div>
    </>
  );
}

function OralView({ product, onClose }: { product: OralProduct; onClose: () => void }) {
  return (
    <>
      <Header
        kicker={`${CATEGORY_LABEL[product.category] ?? product.category} · ${product.dose}`}
        title={product.name}
        onClose={onClose}
      />

      <div className="scroll-area flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <InfoTile label="Posología" value={timingLabel(product.defaultTiming)} />
          <InfoTile label="Frecuencia" value={scheduleLabel(product.scheduleType)} />
        </div>

        {product.uses.length > 0 && (
          <Subsection label="Indicaciones">
            <ul className="flex flex-col gap-1">
              {product.uses.map((u, i) => (
                <li
                  key={i}
                  className="font-mono text-[11px] leading-snug pl-3 relative"
                  style={{ color: SUNRISE_TEXT.soft }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[7px] w-1 h-1 rounded-full"
                    style={{ background: SUNRISE.rise2 }}
                  />
                  {u}
                </li>
              ))}
            </ul>
          </Subsection>
        )}

        {product.cautions && product.cautions.length > 0 && (
          <CautionsBox cautions={product.cautions} />
        )}

        {(product.pairsWith?.length || product.conflictsWith?.length) && (
          <Subsection label="Combinaciones">
            {product.pairsWith && product.pairsWith.length > 0 && (
              <p className="font-mono text-[11px] leading-snug mb-1" style={{ color: SUNRISE_TEXT.soft }}>
                <span style={{ color: SUNRISE.rise2 }}>+ Combina con:</span> {product.pairsWith.join(' · ')}
              </p>
            )}
            {product.conflictsWith && product.conflictsWith.length > 0 && (
              <p className="font-mono text-[11px] leading-snug" style={{ color: '#ff9b6b' }}>
                ⊘ Separar de: {product.conflictsWith.join(' · ')}
              </p>
            )}
          </Subsection>
        )}

        {product.stockRemaining !== undefined && (
          <p
            className="font-mono text-[10px] tracking-wider mt-3"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Stock: {product.stockRemaining} unidades
            {product.lowStockThreshold !== undefined &&
              product.stockRemaining <= product.lowStockThreshold &&
              ' · reponer pronto'}
          </p>
        )}

        {product.verify && (
          <p
            className="font-mono text-[10px] tracking-wider mt-2 italic"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            ⚠ Dosis pendiente de verificar contra etiqueta física.
          </p>
        )}
      </div>
    </>
  );
}

function NotFoundView({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  return (
    <>
      <Header kicker="Producto" title="No encontrado" onClose={onClose} />
      <div className="px-5 pb-8">
        <p className="font-mono text-[11.5px] leading-snug" style={{ color: SUNRISE_TEXT.soft }}>
          No tengo datos del producto <code>{productId}</code> en el catálogo.
        </p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// PIEZAS COMPARTIDAS
// ═══════════════════════════════════════════════════════════

function Header({
  kicker,
  title,
  url,
  onClose,
}: {
  kicker: string;
  title: string;
  url?: string;
  onClose: () => void;
}) {
  return (
    <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <span
          className="font-ui text-[10px] tracking-[0.42em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {kicker}
        </span>
        <div
          className="font-display italic font-[400] text-[22px] leading-tight mt-0.5"
          style={{ color: SUNRISE_TEXT.primary }}
        >
          {title}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => haptics.tick()}
            className="inline-flex items-center gap-1 font-ui text-[10px] tracking-[0.22em] uppercase mt-1.5 transition-opacity active:opacity-70"
            style={{ color: SUNRISE.rise2 }}
          >
            Fuente <ExternalLink size={10} strokeWidth={1.85} />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{
          background: hexToRgba(SUNRISE.predawn2, 0.55),
          border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
          color: SUNRISE_TEXT.primary,
        }}
      >
        <X size={16} strokeWidth={1.85} />
      </button>
    </div>
  );
}

function Subsection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span style={{ color: SUNRISE.rise2 }}>{icon}</span>}
        <h3
          className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}

function CautionsBox({ cautions }: { cautions: string[] }) {
  return (
    <div
      className="mt-4 rounded-lg p-3"
      style={{
        background: hexToRgba('#ff6b6b', 0.08),
        border: `1px solid ${hexToRgba('#ff6b6b', 0.32)}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle size={12} strokeWidth={1.85} style={{ color: '#ff6b6b' }} />
        <h3
          className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
          style={{ color: '#ff6b6b' }}
        >
          Advertencias
        </h3>
      </div>
      <ul className="flex flex-col gap-1">
        {cautions.map((c, i) => (
          <li
            key={i}
            className="font-mono text-[11px] leading-snug pl-3 relative"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-[7px] w-1 h-1 rounded-full"
              style={{ background: '#ff6b6b' }}
            />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-full"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.5),
        color: SUNRISE_TEXT.soft,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
      }}
    >
      {children}
    </span>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: hexToRgba(SUNRISE.predawn2, 0.4),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
      }}
    >
      <span
        className="font-ui text-[9px] tracking-[0.28em] uppercase block"
        style={{ color: SUNRISE_TEXT.muted }}
      >
        {label}
      </span>
      <span
        className="font-display italic font-[400] text-[14px] leading-tight"
        style={{ color: SUNRISE_TEXT.primary }}
      >
        {value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function timingLabel(t: OralProduct['defaultTiming']): string {
  switch (t) {
    case 'morning': return 'Por la mañana';
    case 'lunch': return 'Con el almuerzo';
    case 'evening': return 'Por la tarde';
    case 'bedtime': return 'Antes de dormir';
    case 'with_meal': return 'Con comida (grasa)';
    case 'flexible': return 'Flexible';
  }
}

function scheduleLabel(s: OralProduct['scheduleType']): string {
  switch (s) {
    case 'daily': return 'Diaria';
    case 'as_needed': return 'A demanda';
    case 'irregular': return 'Irregular';
    case 'cycle': return 'Por ciclo';
  }
}
