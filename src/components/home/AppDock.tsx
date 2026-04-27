'use client';

// ═══════════════════════════════════════════════════════════
// AppDock · editorial bottom navigation (Poppr-aligned).
//
// REDESIGN v2:
//   · Sin pill glassmorphic flotante — sólo una regla
//     horizontal fina sobre fondo transparente con un degradé
//     muy suave hacia el borde inferior.
//   · 5 columnas tipográficas: número mono (01..05) +
//     label en font-headline lowercase. Iconos eliminados
//     (eran redundantes con el texto).
//   · Active state: barra fina dorada animada arriba del
//     número + número y label en color primario. Inactive:
//     muted.
//   · Badges (protocolos/herramientas) = punto dorado a la
//     derecha del número.
//
// Contrato sin cambios: `active`, `onChange`, `protocolsBadge`,
// `toolsBadge`, type `DockTab` exportado.
// ═══════════════════════════════════════════════════════════

import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

export type DockTab = 'home' | 'protocols' | 'tools' | 'calendar' | 'profile';

interface AppDockProps {
  active: DockTab;
  onChange: (tab: DockTab) => void;
  /** Optional dot on the Protocols tab (e.g. pending protocol now). */
  protocolsBadge?: boolean;
  /** Optional dot on the Tools tab (e.g. routine completed today). */
  toolsBadge?: boolean;
}

interface TabSpec {
  id: DockTab;
  label: string;
}

const TABS: TabSpec[] = [
  { id: 'home',      label: 'inicio' },
  { id: 'protocols', label: 'protocolos' },
  { id: 'tools',     label: 'herramientas' },
  { id: 'calendar',  label: 'calendario' },
  { id: 'profile',   label: 'perfil' },
];

export default function AppDock({ active, onChange, protocolsBadge, toolsBadge }: AppDockProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Soft fade-up gradient behind the dock so the labels
          remain legible without a hard pill background. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(SUNRISE.night, 0)} 0%, ${hexToRgba(SUNRISE.night, 0.55)} 65%, ${hexToRgba(SUNRISE.night, 0.85)} 100%)`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      />

      <div className="relative pointer-events-auto mx-auto max-w-3xl px-4 pb-2">
        {/* Top hairline */}
        <div
          aria-hidden
          className="h-px w-full mb-2"
          style={{ background: hexToRgba(SUNRISE.rise2, 0.18) }}
        />

        <div className="grid grid-cols-5 gap-1">
          {TABS.map((tab, idx) => {
            const isActive = tab.id === active;
            const showBadge =
              (tab.id === 'protocols' && protocolsBadge) ||
              (tab.id === 'tools' && toolsBadge);
            const numLabel = (idx + 1).toString().padStart(2, '0');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isActive) return;
                  haptics.tick();
                  onChange(tab.id);
                }}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center justify-start gap-1 py-2 transition-colors"
              >
                {/* Active marker — thin gold rule, animated width */}
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300"
                  style={{
                    width: isActive ? '60%' : '0%',
                    background: SUNRISE.rise2,
                    boxShadow: isActive ? `0 0 8px ${hexToRgba(SUNRISE.rise2, 0.6)}` : 'none',
                  }}
                />

                {/* Number + optional badge dot */}
                <span className="relative inline-flex items-center gap-1 leading-none">
                  <span
                    className="font-mono text-[10px] tabular-nums tracking-wider transition-colors"
                    style={{ color: isActive ? SUNRISE.rise2 : SUNRISE_TEXT.muted }}
                  >
                    {numLabel}
                  </span>
                  {showBadge && (
                    <span
                      aria-hidden
                      className="block w-[5px] h-[5px] rounded-full"
                      style={{
                        background: SUNRISE.rise2,
                        boxShadow: `0 0 5px ${hexToRgba(SUNRISE.rise2, 0.8)}`,
                      }}
                    />
                  )}
                </span>

                {/* Label */}
                <span
                  className="font-headline font-[500] text-[11px] leading-none tracking-[-0.005em] lowercase truncate max-w-full transition-colors"
                  style={{
                    color: isActive ? 'var(--sunrise-text)' : SUNRISE_TEXT.muted,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
