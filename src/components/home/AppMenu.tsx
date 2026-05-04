'use client';

// ═══════════════════════════════════════════════════════════
// AppMenu · fullscreen overlay navigation (Poppr pattern).
//
// Replaces the bottom AppDock with the agency-style overlay
// menu seen on poppr.be: a small trigger pinned top-right,
// which opens a full-viewport overlay with two columns:
//
//   · Right column → huge stacked nav items (lowercase,
//     font-headline). Each item reveals with a staggered
//     translateY + opacity transition.
//   · Bottom-left → operator meta (kicker + name · level ·
//     class · streak), mirroring Poppr's "GET IN TOUCH"
//     contact block.
//   · Top-left → MA brand mark (continuity with HUD).
//   · Top-right → close (X) in the same slot as the trigger.
//
// Active tab is highlighted (gold). ESC + outside-tap close
// the overlay. Body scroll-lock while open.
//
// Public surface is intentionally similar to AppDock: emits
// `onChange(DockTab)` when an item is selected. The 'calendar'
// entry is removed (calendar now lives inside Welcome).
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import type { DockTab } from './AppDock';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';
import type { OperatorProfile } from '@/lib/genesis/progression';

interface AppMenuProps {
  open: boolean;
  active: DockTab;
  onOpenChange: (open: boolean) => void;
  onChange: (tab: DockTab) => void;
  profile: OperatorProfile;
  streak: number;
  /** Optional dot on the Protocols entry. */
  protocolsBadge?: boolean;
  /** Optional dot on the Tools entry. */
  toolsBadge?: boolean;
}

interface MenuEntry {
  id: DockTab;
  label: string;
  /** Small annotation on the right of the item — e.g. "08" if it has 8 things to attend. */
  count?: number;
  /** Override colour of the count badge. */
  badgeColor?: string;
}

export default function AppMenu({
  open,
  active,
  onOpenChange,
  onChange,
  profile,
  streak,
  protocolsBadge,
  toolsBadge,
}: AppMenuProps) {
  // ESC closes the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Lock background scroll while overlay is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const entries: MenuEntry[] = [
    { id: 'home',      label: 'inicio' },
    { id: 'protocols', label: 'protocolos', count: protocolsBadge ? 1 : undefined, badgeColor: SUNRISE.rise2 },
    { id: 'tools',     label: 'herramientas', count: toolsBadge ? 1 : undefined, badgeColor: SUNRISE.rise2 },
    { id: 'profile',   label: 'perfil' },
    { id: 'system',    label: 'sistema' },
  ];

  return (
    <>
      {/* ═══ TRIGGER (visible when overlay is closed) ═══
           Poppr-style: solid dorado circle, black icon, no
           border, no label. Sits in the top-right corner. */}
      <button
        type="button"
        onClick={() => { haptics.tick(); onOpenChange(true); }}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="fixed z-50 inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)',
          right: '1rem',
          width: 52,
          height: 52,
          background: SUNRISE.rise2,
          color: SUNRISE.night,
          boxShadow: `0 8px 24px -6px ${hexToRgba(SUNRISE.rise2, 0.55)}`,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
      >
        <MenuIcon size={20} strokeWidth={2.2} style={{ color: SUNRISE.night }} />
      </button>

      {/* ═══ OVERLAY (visible when open) ═══ */}
      <div
        aria-hidden={!open}
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          background: `radial-gradient(ellipse at 75% 35%, ${hexToRgba(SUNRISE.predawn2, 0.92)} 0%, ${hexToRgba(SUNRISE.night, 0.97)} 60%, ${hexToRgba(SUNRISE.night, 0.99)} 100%)`,
          backdropFilter: 'blur(22px) saturate(120%)',
          WebkitBackdropFilter: 'blur(22px) saturate(120%)',
        }}
      >
        {/* Top-left: brand mark (continuity with HUD) */}
        <div
          className="absolute"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            left: '1.25rem',
          }}
        >
          <div
            className="font-ui text-[10px] tracking-[0.42em] uppercase"
            style={{ color: 'var(--sunrise-text)' }}
          >
            MA · {new Date().getFullYear().toString().slice(-2)}
          </div>
          <div
            className="font-ui text-[8.5px] tracking-[0.38em] uppercase mt-1"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            ritual operator
          </div>
        </div>

        {/* Top-right: close button (same slot as trigger) */}
        <button
          type="button"
          onClick={() => { haptics.tick(); onOpenChange(false); }}
          aria-label="Cerrar menú"
          className="absolute z-10 inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 0.7rem)',
            right: '1rem',
            width: 38,
            height: 38,
            background: hexToRgba(SUNRISE.night, 0.55),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.45)}`,
          }}
        >
          <X size={14} strokeWidth={1.85} style={{ color: 'var(--sunrise-text)' }} />
        </button>

        {/* Right column · huge nav items, stacked */}
        <nav
          aria-label="Navegación"
          className="absolute flex flex-col"
          style={{
            top: '50%',
            right: '1.5rem',
            transform: 'translateY(-50%)',
            alignItems: 'flex-end',
            gap: 'clamp(0.05rem, 0.6vh, 0.4rem)',
          }}
        >
          {entries.map((entry, idx) => {
            const isActive = entry.id === active;
            const delay = open ? `${120 + idx * 70}ms` : '0ms';
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  haptics.tick();
                  if (!isActive) onChange(entry.id);
                  onOpenChange(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className="group inline-flex items-center gap-3 transition-opacity active:opacity-70"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateX(0)' : 'translateX(28px)',
                  transition: `opacity 420ms cubic-bezier(.2,.7,.2,1) ${delay}, transform 480ms cubic-bezier(.2,.7,.2,1) ${delay}`,
                }}
              >
                {entry.count !== undefined && (
                  <span
                    className="inline-flex items-center justify-center rounded-full font-mono text-[10px] tabular-nums"
                    style={{
                      width: 22,
                      height: 22,
                      background: entry.badgeColor ?? SUNRISE.rise2,
                      color: SUNRISE.night,
                    }}
                  >
                    {entry.count}
                  </span>
                )}
                <span
                  className="font-headline font-[600] leading-[0.92] tracking-[-0.04em] lowercase transition-colors"
                  style={{
                    fontSize: 'clamp(2.6rem, 11vw, 4.8rem)',
                    color: isActive ? SUNRISE.rise2 : 'var(--sunrise-text)',
                  }}
                >
                  {entry.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom-left · operator meta block */}
        <div
          className="absolute"
          style={{
            left: '1.25rem',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 420ms cubic-bezier(.2,.7,.2,1) 360ms, transform 480ms cubic-bezier(.2,.7,.2,1) 360ms',
          }}
        >
          <div
            className="font-ui text-[9px] tracking-[0.42em] uppercase mb-2"
            style={{ color: SUNRISE.rise2 }}
          >
            operador
          </div>
          <div
            className="font-headline font-[500] text-[18px] leading-tight lowercase"
            style={{ color: 'var(--sunrise-text)' }}
          >
            {profile.name.toLowerCase()}
          </div>
          <div
            className="font-mono text-[10px] mt-2 leading-snug"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            lv {profile.level.toString().padStart(2, '0')} · {profile.operatorClass.toLowerCase()}
          </div>
          <div
            className="font-mono text-[10px] leading-snug"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            streak {streak.toString().padStart(2, '0')} · xp {profile.xp}
          </div>
        </div>
      </div>
    </>
  );
}
