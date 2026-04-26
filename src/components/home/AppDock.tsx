'use client';

// ═══════════════════════════════════════════════════════════
// AppDock · barra inferior fixed con 5 tabs.
//
// Reemplaza la cabecera caótica de WelcomeScreen agrupando
// la navegación en: Inicio · Protocolos · Herramientas ·
// Calendario · Perfil. Usa safe-area-inset-bottom para iPad
// PWA. Indicador activo: pill superior + icono lleno.
// ═══════════════════════════════════════════════════════════

import { Home, Layers, Sparkles, Calendar, User, type LucideIcon } from 'lucide-react';
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
  Icon: LucideIcon;
}

const TABS: TabSpec[] = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'protocols', label: 'Protocolos', Icon: Layers },
  { id: 'tools', label: 'Herramientas', Icon: Sparkles },
  { id: 'calendar', label: 'Calendario', Icon: Calendar },
  { id: 'profile', label: 'Perfil', Icon: User },
];

export default function AppDock({ active, onChange, protocolsBadge, toolsBadge }: AppDockProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className="pointer-events-auto mx-auto max-w-3xl px-3 pb-2"
      >
        <div
          className="flex items-stretch justify-between rounded-2xl px-1.5 py-1.5"
          style={{
            background: hexToRgba(SUNRISE.night, 0.78),
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
            boxShadow: `0 18px 50px -22px ${hexToRgba(SUNRISE.night, 0.9)}`,
          }}
        >
          {TABS.map(tab => {
            const isActive = tab.id === active;
            const showBadge =
              (tab.id === 'protocols' && protocolsBadge) ||
              (tab.id === 'tools' && toolsBadge);
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
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors"
                style={{
                  color: isActive ? SUNRISE.rise2 : SUNRISE_TEXT.muted,
                  background: isActive ? hexToRgba(SUNRISE.rise2, 0.12) : 'transparent',
                }}
              >
                {/* top pill indicator when active */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[3px] h-[3px] w-7 rounded-full"
                    style={{
                      background: SUNRISE.rise2,
                      boxShadow: `0 0 10px ${hexToRgba(SUNRISE.rise2, 0.6)}`,
                    }}
                  />
                )}
                <span className="relative">
                  <tab.Icon
                    size={20}
                    strokeWidth={isActive ? 2 : 1.6}
                    fill={isActive ? hexToRgba(SUNRISE.rise2, 0.18) : 'none'}
                  />
                  {showBadge && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-1 block w-2 h-2 rounded-full"
                      style={{
                        background: SUNRISE.rise2,
                        boxShadow: `0 0 6px ${hexToRgba(SUNRISE.rise2, 0.8)}`,
                      }}
                    />
                  )}
                </span>
                <span
                  className="font-ui text-[9.5px] tracking-[0.18em] uppercase leading-none"
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
