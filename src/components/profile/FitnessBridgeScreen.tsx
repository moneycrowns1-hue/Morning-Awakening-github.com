'use client';

// ═══════════════════════════════════════════════════════════
// FitnessBridgeScreen · Apple Fitness (vía Shortcut) modal
//
// Diseño · masthead editorial NightMissionPhase:
//   - Modal full-screen con header masthead (close + brand mono).
//   - Hero title lowercase + punto ámbar.
//   - Body con DataChips (pasos/calorías/ejercicio · activity rings)
//     o instrucciones de permisos.
//   - Footer · CTA principal V5 con label mono uppercase.
// Activity ring colors (Apple Fitness Move/Exercise/Stand) se
// preservan como design tokens fijos · son identidad de marca.
// ═══════════════════════════════════════════════════════════

import { X, ArrowUpRight, Activity, Flame, Footprints } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useNightPalette } from '@/lib/night/nightPalette';
import { haptics } from '@/lib/common/haptics';
import { withBasePath } from '@/lib/common/publicPath';

type Mode = 'connect' | 'permissions';

interface FitnessBridgeScreenProps {
  mode: Mode;
  onClose: () => void;
  onAction?: () => void;
}

const SHORTCUT_NAME = 'Morning Awakening Sync';
const SHORTCUT_ICLOUD_URL = '';

// Apple Fitness ring colors · fixed design tokens (brand identity).
const RING_MOVE     = '#ff375f';
const RING_EXERCISE = '#a3ff5f';
const RING_STAND    = '#5fc8ff';

export default function FitnessBridgeScreen({ mode, onClose, onAction }: FitnessBridgeScreenProps) {
  const { palette: N, paletteText: NT } = useNightPalette();

  const handlePrimary = () => {
    haptics.tick();
    onAction?.();
    if (mode === 'connect') {
      const runUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
      try { window.location.href = runUrl; } catch { /* ignore */ }
    } else {
      try { window.location.href = 'x-apple-health://'; } catch { /* ignore */ }
    }
  };

  const handleInstall = () => {
    haptics.tap();
    if (SHORTCUT_ICLOUD_URL) {
      window.open(SHORTCUT_ICLOUD_URL, '_blank');
    } else {
      window.open(withBasePath('/atajo-apple-health.html'), '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: N.void, color: NT.primary }}
    >
      {/* ─── Header · MASTHEAD editorial ─── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.85rem)' }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            aria-label="Cerrar"
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ color: NT.muted }}
          >
            <X size={14} strokeWidth={2.2} />
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                background: N.amber,
                borderRadius: 99,
                boxShadow: `0 0 8px ${hexToRgba(N.amber, 0.85)}`,
              }}
              className="night-breath"
            />
            <span
              className="font-mono uppercase tracking-[0.42em] font-[500]"
              style={{ color: NT.muted, fontSize: 9 }}
            >
              soporte · apple fitness
            </span>
          </button>
          <span
            className="font-mono uppercase tracking-[0.18em] font-[500]"
            style={{ color: NT.muted, fontSize: 10 }}
          >
            <span style={{ color: NT.primary, fontWeight: 600 }}>
              {mode === 'connect' ? 'connect' : 'permisos'}
            </span>
          </span>
        </div>
        <div className="h-[1px]" style={{ background: hexToRgba(N.amber, 0.14) }} />
      </div>

      {/* ─── Body ────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col relative z-10 min-h-0 px-6 overflow-y-auto">
        {/* Top corners */}
        <div className="mt-3 flex items-baseline justify-between">
          <span
            className="font-mono tabular-nums font-[600]"
            style={{ color: NT.primary, fontSize: 13, letterSpacing: '0.02em' }}
          >
            ⌬
            <span style={{ color: N.amber }}>.</span>
          </span>
          <span
            className="font-mono uppercase tracking-[0.32em] font-[700]"
            style={{ color: NT.muted, fontSize: 9 }}
          >
            · health bridge ·
          </span>
        </div>

        {mode === 'connect' ? (
          <ConnectBody N={N} NT={NT} onInstall={handleInstall} />
        ) : (
          <PermissionsBody N={N} NT={NT} />
        )}
      </div>

      {/* ─── Footer · CTA V5 ─────────────────── */}
      <div
        className="relative z-10 px-6 shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-3 pt-3">
          {mode === 'connect' ? (
            <button
              onClick={handlePrimary}
              className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985]"
              style={{
                padding: '14px 28px',
                background: N.amber,
                color: N.void,
                fontSize: 10.5,
                boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
              }}
            >
              conectar
            </button>
          ) : (
            <>
              <button
                onClick={() => { haptics.tap(); onClose(); }}
                className="flex-1 font-mono font-[600] tracking-[0.32em] uppercase transition-opacity active:opacity-70"
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  color: NT.soft,
                  fontSize: 10,
                  border: `1px solid ${hexToRgba(N.amber, 0.25)}`,
                }}
              >
                cerrar
              </button>
              <button
                onClick={handlePrimary}
                className="flex-1 font-mono font-[700] tracking-[0.32em] uppercase transition-transform active:scale-[0.985] flex items-center justify-center gap-2"
                style={{
                  padding: '14px 24px',
                  background: N.amber,
                  color: N.void,
                  fontSize: 10.5,
                  boxShadow: `0 8px 24px -6px ${hexToRgba(N.amber, 0.5)}`,
                }}
              >
                salud
                <ArrowUpRight size={13} strokeWidth={2.4} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

interface PaletteProps {
  N: ReturnType<typeof useNightPalette>['palette'];
  NT: ReturnType<typeof useNightPalette>['paletteText'];
}

function ConnectBody({ N, NT, onInstall }: PaletteProps & { onInstall: () => void }) {
  return (
    <>
      {/* Hero title */}
      <h1
        className="font-headline font-[700] lowercase tracking-[-0.04em] mt-5"
        style={{
          color: NT.primary,
          fontSize: 'clamp(2rem, 7.5vw, 2.8rem)',
          lineHeight: 0.95,
          textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
          textWrap: 'balance' as never,
          maxWidth: '14ch',
        }}
      >
        conectar apple fitness
        <span style={{ color: N.amber }}>.</span>
      </h1>

      <p
        className="mt-3 font-ui text-[12.5px] leading-[1.55] max-w-[36ch]"
        style={{ color: NT.soft }}
      >
        Morning Awakening lee tus pasos, calorías activas y minutos de ejercicio
        para ajustar el cardio matinal a tu actividad real.
      </p>

      {/* What we read · 3 chips */}
      <div className="mt-7 grid grid-cols-3 gap-2">
        <DataChip icon={<Footprints size={16} strokeWidth={1.8} />} label="pasos" tint={RING_STAND} N={N} NT={NT} />
        <DataChip icon={<Flame size={16} strokeWidth={1.8} />} label="calorías" tint={RING_MOVE} N={N} NT={NT} />
        <DataChip icon={<Activity size={16} strokeWidth={1.8} />} label="ejercicio" tint={RING_EXERCISE} N={N} NT={NT} />
      </div>

      {/* Activity rings mock + amber halo */}
      <div className="relative mt-8 mb-2 flex justify-center">
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            inset: -12,
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${hexToRgba(N.amber, 0.22)} 0%, transparent 70%)`,
            filter: 'blur(14px)',
            margin: 'auto',
          }}
        />
        <ActivityRingsMock />
      </div>

      <button
        onClick={onInstall}
        className="mt-2 mx-auto inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.32em] transition-opacity active:opacity-60"
        style={{ color: hexToRgba(N.amber, 0.85), fontSize: 9, fontWeight: 600 }}
      >
        ¿primera vez? instalá el atajo
        <ArrowUpRight size={11} strokeWidth={2.2} />
      </button>

      <p
        className="mt-6 mb-4 text-center font-ui text-[10.5px] leading-[1.55]"
        style={{ color: NT.muted }}
      >
        Tus datos de actividad se procesan en tu dispositivo. Los usamos para
        personalizar el cardio matinal según tu actividad real.
      </p>
    </>
  );
}

function PermissionsBody({ N, NT }: PaletteProps) {
  return (
    <>
      <h1
        className="font-headline font-[700] lowercase tracking-[-0.04em] mt-5"
        style={{
          color: NT.primary,
          fontSize: 'clamp(2rem, 7.5vw, 2.8rem)',
          lineHeight: 0.95,
          textShadow: `0 0 60px ${hexToRgba(N.amber, 0.22)}`,
          maxWidth: '14ch',
        }}
      >
        necesitamos permisos
        <span style={{ color: N.amber }}>.</span>
      </h1>

      <p
        className="mt-3 font-ui text-[12.5px] leading-[1.55] max-w-[36ch]"
        style={{ color: NT.soft }}
      >
        Parece que no tenemos permiso para leer tu actividad de Apple Health.
        Habilitalo en la app Salud → tu perfil → Apps → Morning Awakening.
      </p>

      {/* Breadcrumb path · jeton style */}
      <div
        className="mt-7 px-4 py-3.5 font-ui text-[12.5px] leading-[1.6]"
        style={{
          background: hexToRgba(N.amber, 0.06),
          border: `1px solid ${hexToRgba(N.amber, 0.18)}`,
          color: NT.soft,
        }}
      >
        <span style={{ color: NT.muted }}>Salud</span>{' '}
        <span style={{ color: hexToRgba(N.amber, 0.5) }}>›</span>{' '}
        <span style={{ color: NT.muted }}>Perfil</span>{' '}
        <span style={{ color: hexToRgba(N.amber, 0.5) }}>›</span>{' '}
        <span style={{ color: NT.muted }}>Apps</span>{' '}
        <span style={{ color: hexToRgba(N.amber, 0.5) }}>›</span>{' '}
        <span style={{ color: N.amber, fontWeight: 600 }}>Morning Awakening</span>{' '}
        <span style={{ color: hexToRgba(N.amber, 0.5) }}>›</span>{' '}
        <span style={{ color: NT.primary, fontWeight: 600 }}>Activar todo</span>
      </div>

      <div className="h-4" />
    </>
  );
}

function DataChip({
  icon,
  label,
  tint,
  N,
  NT,
}: { icon: React.ReactNode; label: string; tint: string } & PaletteProps) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3.5"
      style={{
        background: hexToRgba(tint, 0.08),
        border: `1px solid ${hexToRgba(tint, 0.32)}`,
      }}
    >
      <div style={{ color: tint }}>{icon}</div>
      <div
        className="font-mono uppercase tracking-[0.28em] font-[600]"
        style={{ color: NT.soft, fontSize: 9 }}
      >
        {label}
      </div>
    </div>
  );
}

/** Apple Fitness style three concentric rings (Move/Exercise/Stand). */
function ActivityRingsMock() {
  const ringSize = 100;
  const stroke = 9;
  return (
    <svg width={ringSize} height={ringSize} viewBox="0 0 100 100">
      <Ring r={44} stroke={stroke} color={RING_MOVE} progress={0.78} />
      <Ring r={32} stroke={stroke} color={RING_EXERCISE} progress={0.62} />
      <Ring r={20} stroke={stroke} color={RING_STAND} progress={0.85} />
    </svg>
  );
}

function Ring({ r, stroke, color, progress }: { r: number; stroke: number; color: string; progress: number }) {
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * progress;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} opacity={0.22} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}
