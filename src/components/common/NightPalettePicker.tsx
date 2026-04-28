'use client';

// ═══════════════════════════════════════════════════════════════
// NightPalettePicker · selector compartido de paleta nocturna.
// Modos:
//   · popover · flota debajo del header (NightWelcomeScreen).
//   · inline  · grid embebido en una sección (SettingsScreen).
// Internamente usa useNightPalette() para mantenerse en sync con
// el resto de la app (broadcast por custom event + localStorage).
// ═══════════════════════════════════════════════════════════════

import { Check } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import { useNightPalette, type NightPaletteOption } from '@/lib/night/nightPalette';

interface NightPalettePickerProps {
  /**
   * popover · flota encima del contenido, requiere onClose.
   * inline  · ocupa el ancho de su contenedor (settings, modales).
   */
  mode?: 'popover' | 'inline';
  /** Solo aplica al modo popover. Se llama después de seleccionar o al tocar el backdrop. */
  onClose?: () => void;
  /** Override del título mono (por defecto "· paleta · noche ·"). */
  caption?: string;
}

export default function NightPalettePicker({
  mode = 'inline',
  onClose,
  caption = '· paleta · noche ·',
}: NightPalettePickerProps) {
  const {
    palette: N,
    paletteText: NT,
    id: activeId,
    setId,
    options,
  } = useNightPalette();

  const handleSelect = (id: NightPaletteOption['id']) => {
    haptics.tick();
    setId(id);
    if (mode === 'popover') onClose?.();
  };

  const swatches = (
    <div className="flex items-center justify-between gap-2.5">
      {options.map((opt) => {
        const active = opt.id === activeId;
        return (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            className="relative flex flex-col items-center gap-1.5 transition-transform active:scale-[0.94]"
            aria-label={opt.label}
            title={`${opt.label} · ${opt.hint}`}
          >
            {/* Swatch · mini night sky preview */}
            <span
              className="relative block rounded-full overflow-hidden"
              style={{
                width: 40,
                height: 40,
                background: `radial-gradient(ellipse at 50% 0%, ${opt.palette.ember_1} 0%, ${opt.palette.void} 70%)`,
                border: active
                  ? `1.5px solid ${opt.palette.amber}`
                  : `1px solid ${hexToRgba(opt.palette.amber, 0.25)}`,
                boxShadow: active
                  ? `0 0 0 3px ${hexToRgba(opt.palette.amber, 0.18)}, 0 0 14px ${hexToRgba(opt.palette.amber, 0.55)}`
                  : 'none',
              }}
            >
              {/* Halo ámbar */}
              <span
                aria-hidden
                className="absolute"
                style={{
                  inset: -2,
                  background: `radial-gradient(circle at 50% 38%, ${hexToRgba(opt.palette.amber, 0.45)} 0%, transparent 55%)`,
                  filter: 'blur(4px)',
                }}
              />
              {/* Mini luna */}
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  top: '24%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: `radial-gradient(circle at 38% 35%, #fff4e2 0%, ${opt.palette.amber_glow} 35%, ${opt.palette.amber} 75%, ${opt.palette.candle} 100%)`,
                  boxShadow: `0 0 8px ${hexToRgba(opt.palette.amber, 0.7)}, inset -2px -2px 4px ${hexToRgba(opt.palette.candle, 0.6)}`,
                }}
              />
              {/* Hairline ámbar */}
              <span
                aria-hidden
                className="absolute left-2 right-2"
                style={{
                  bottom: 7,
                  height: 1,
                  background: hexToRgba(opt.palette.amber, 0.55),
                }}
              />
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    color: opt.palette.void,
                    background: hexToRgba(opt.palette.amber, 0.85),
                    borderRadius: '50%',
                  }}
                >
                  <Check size={16} strokeWidth={3} />
                </span>
              )}
            </span>
            <span
              className="font-mono uppercase tracking-[0.18em]"
              style={{
                color: active ? opt.palette.amber : NT.muted,
                fontSize: 8.5,
                fontWeight: active ? 700 : 500,
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (mode === 'popover') {
    return (
      <>
        {/* Backdrop · tap para cerrar */}
        <div
          className="absolute inset-0 z-30"
          onClick={onClose}
          style={{ background: 'transparent' }}
        />
        {/* Card flotante */}
        <div
          className="absolute z-40 left-1/2 -translate-x-1/2 px-4 py-3.5"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 4.25rem)',
            background: hexToRgba(N.ember_deep, 0.92),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
            borderRadius: 14,
            boxShadow: `0 18px 40px -10px ${hexToRgba('#000', 0.6)}, 0 0 24px ${hexToRgba(N.amber, 0.12)}`,
          }}
        >
          <div
            className="font-mono uppercase tracking-[0.42em] font-[600] text-center mb-3"
            style={{ color: NT.muted, fontSize: 8.5 }}
          >
            {caption}
          </div>
          {swatches}
        </div>
      </>
    );
  }

  // inline · contenedor sin backdrop ni absolutamente posicionado
  return (
    <div
      className="w-full px-4 py-4 rounded-2xl"
      style={{
        background: hexToRgba(N.ember_deep, 0.5),
        border: `1px solid ${hexToRgba(N.amber, 0.14)}`,
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.42em] font-[600] text-center mb-3"
        style={{ color: NT.muted, fontSize: 8.5 }}
      >
        {caption}
      </div>
      {swatches}
    </div>
  );
}
