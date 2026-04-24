'use client';

// ═══════════════════════════════════════════════════════════
// FitnessBridgeScreen · Apple Fitness (vía Shortcut) modal
//
// Misma arquitectura que HealthBridgeScreen pero orientado al
// flujo de mañana. Lee del MISMO snapshot (porque Apple Fitness
// vive dentro de Apple Health), pero la copy y los visuales
// hablan de pasos, calorías y minutos de ejercicio.
//
//   mode='connect'     → primera vez: instalá / corré el atajo
//                        de mañana, que incluye el bloque
//                        `fitness` en el JSON de salida.
//   mode='permissions' → datos vencidos (>6h) o el atajo falló.
// ═══════════════════════════════════════════════════════════

import { X, ArrowUpRight, Activity, Flame, Footprints } from 'lucide-react';
import { hexToRgba } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { withBasePath } from '@/lib/publicPath';

type Mode = 'connect' | 'permissions';

interface FitnessBridgeScreenProps {
  mode: Mode;
  onClose: () => void;
  onAction?: () => void;
}

const SHORTCUT_NAME = 'Morning Awakening Sync';
const SHORTCUT_ICLOUD_URL = '';

// Morning palette — warmer than the night theme (sunrise rose +
// peach + warm cream) so the Fitness modal feels distinct.
const SUN = {
  base: '#1a0f1f',
  warm_1: '#3a1f2a',
  warm_2: '#5a2f3a',
  rose: '#ff9aa2',
  peach: '#ffd4a8',
  cream: '#fff5e8',
  ring_move: '#ff375f',     // Apple Fitness Move ring
  ring_exercise: '#a3ff5f', // Exercise ring
  ring_stand: '#5fc8ff',    // Stand ring
};

const TEXT = {
  primary: '#fff5e8',
  soft: '#ffd9c2',
  muted: '#bf9d8a',
  divider: 'rgba(255, 213, 194, 0.18)',
};

export default function FitnessBridgeScreen({ mode, onClose, onAction }: FitnessBridgeScreenProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,5,8,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(SUN.warm_2, 0.92)} 0%, ${hexToRgba(SUN.base, 0.98)} 100%)`,
          border: `1px solid ${hexToRgba(SUN.peach, 0.18)}`,
          boxShadow: `0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px ${hexToRgba(SUN.peach, 0.08)} inset`,
        }}
      >
        <div
          className="mx-auto mt-3 w-10 h-[4px] rounded-full"
          style={{ background: hexToRgba(SUN.cream, 0.25) }}
        />

        {mode === 'connect' ? <ConnectBody onInstall={handleInstall} /> : <PermissionsBody />}

        <div className="px-6 pb-5 pt-2">
          {mode === 'connect' ? (
            <button
              onClick={handlePrimary}
              className="w-full rounded-full py-4 font-ui font-[500] text-[14px] tracking-wider transition-transform active:scale-[0.98]"
              style={{
                background: SUN.peach,
                color: SUN.base,
                boxShadow: `0 12px 32px -8px ${hexToRgba(SUN.peach, 0.6)}`,
              }}
            >
              Conectar
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full py-3.5 font-ui text-[13px] tracking-wider transition-transform active:scale-[0.98]"
                style={{
                  background: hexToRgba(SUN.base, 0.6),
                  border: `1px solid ${TEXT.divider}`,
                  color: TEXT.primary,
                }}
              >
                Cerrar
              </button>
              <button
                onClick={handlePrimary}
                className="flex-1 rounded-full py-3.5 font-ui font-[500] text-[13px] tracking-wider inline-flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
                style={{
                  background: SUN.peach,
                  color: SUN.base,
                  boxShadow: `0 12px 32px -8px ${hexToRgba(SUN.peach, 0.6)}`,
                }}
              >
                Salud
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        {mode === 'connect' && (
          <p
            className="px-6 pb-5 text-center text-[11px] leading-relaxed"
            style={{ color: TEXT.muted }}
          >
            Tus datos de actividad se procesan en tu dispositivo. Los usamos para personalizar el cardio matinal según tu actividad real.
          </p>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUN.base, 0.5),
            color: TEXT.muted,
          }}
          aria-label="Cerrar"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────

function ConnectBody({ onInstall }: { onInstall: () => void }) {
  return (
    <div className="px-6 pt-6 pb-3 text-center">
      <h2 className="font-display italic font-[400] text-[22px] leading-tight" style={{ color: TEXT.primary }}>
        Conectar Apple Fitness
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: TEXT.soft }}>
        Morning Awakening lee tus pasos, calorías activas y ejercicio para ajustar el cardio matinal a tu actividad real.
      </p>

      {/* What we read — three icon row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <DataChip
          icon={<Footprints size={16} strokeWidth={1.8} />}
          label="Pasos"
          tint={SUN.ring_stand}
        />
        <DataChip
          icon={<Flame size={16} strokeWidth={1.8} />}
          label="Calorías"
          tint={SUN.ring_move}
        />
        <DataChip
          icon={<Activity size={16} strokeWidth={1.8} />}
          label="Ejercicio"
          tint={SUN.ring_exercise}
        />
      </div>

      {/* Activity rings mock */}
      <ActivityRingsMock />

      <button
        onClick={onInstall}
        className="mt-3 inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80"
        style={{ color: SUN.peach }}
      >
        ¿Primera vez? Instalá el atajo
        <ArrowUpRight size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

function DataChip({ icon, label, tint }: { icon: React.ReactNode; label: string; tint: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-2xl py-3"
      style={{
        background: hexToRgba(SUN.base, 0.5),
        border: `1px solid ${hexToRgba(tint, 0.3)}`,
      }}
    >
      <div style={{ color: tint }}>{icon}</div>
      <div className="font-ui text-[10px] uppercase tracking-[0.22em]" style={{ color: TEXT.soft }}>
        {label}
      </div>
    </div>
  );
}

/** Apple Fitness style three concentric rings (Move/Exercise/Stand). */
function ActivityRingsMock() {
  const ringSize = 80;
  const stroke = 9;
  return (
    <div className="mt-6 flex justify-center">
      <svg width={ringSize} height={ringSize} viewBox="0 0 100 100">
        {/* Outer · Move (red) */}
        <Ring r={44} stroke={stroke} color={SUN.ring_move} progress={0.78} />
        {/* Middle · Exercise (green) */}
        <Ring r={32} stroke={stroke} color={SUN.ring_exercise} progress={0.62} />
        {/* Inner · Stand (blue) */}
        <Ring r={20} stroke={stroke} color={SUN.ring_stand} progress={0.85} />
      </svg>
    </div>
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

function PermissionsBody() {
  return (
    <div className="px-6 pt-6 pb-3 text-center">
      <h2 className="font-display italic font-[400] text-[22px] leading-tight" style={{ color: TEXT.primary }}>
        Necesitamos permisos
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: TEXT.soft }}>
        Parece que no tenemos permiso para leer tu actividad de Apple Health. Habilitalo en la app Salud → tu perfil → Apps → Morning Awakening.
      </p>

      {/* Path mock */}
      <div
        className="mt-5 rounded-2xl px-4 py-3 text-left text-[12px] leading-relaxed"
        style={{
          background: hexToRgba(SUN.base, 0.55),
          border: `1px solid ${TEXT.divider}`,
          color: TEXT.soft,
        }}
      >
        <span style={{ color: TEXT.muted }}>Salud</span> ›{' '}
        <span style={{ color: TEXT.muted }}>Perfil</span> ›{' '}
        <span style={{ color: TEXT.muted }}>Apps</span> ›{' '}
        <span style={{ color: SUN.peach }}>Morning Awakening</span> ›{' '}
        <span style={{ color: TEXT.primary }}>Activar todo</span>
      </div>
    </div>
  );
}
