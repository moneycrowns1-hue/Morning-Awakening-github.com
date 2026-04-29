'use client';

// ═══════════════════════════════════════════════════════════════
// SubRoutineChipRow · chip-row "tu día" para activar contextos
// manuales (pre-gym, post-gym, sol fuerte, viaje, evento).
//
// Toca un chip → activa la sub-rutina con su TTL. Toca otra vez
// → la desactiva. Las sub-rutinas auto-activadas (por signals/
// clima/health) se muestran con etiqueta "auto" pero no son
// toggleables desde acá (vienen del estado del mundo).
// ═══════════════════════════════════════════════════════════════

import { X } from 'lucide-react';
import { hexToRgba } from '@/lib/common/theme';
import { useLegacyTheme } from '@/lib/common/legacyTheme';
import { haptics } from '@/lib/common/haptics';
import { SUB_ROUTINES, type SubRoutine, type SubRoutineId } from '@/lib/coach/subRoutines';

interface SubRoutineChipRowProps {
  /** IDs activas en este momento (auto + manual). */
  activeIds: Set<SubRoutineId>;
  /** IDs que están ahí porque el usuario las activó manualmente. */
  manualIds: Set<SubRoutineId>;
  /** IDs auto que el usuario ya dismisó hoy (hide de la fila). */
  dismissedToday: Set<SubRoutineId>;
  onActivate: (id: SubRoutineId, ttlH: number) => void;
  onDeactivate: (id: SubRoutineId) => void;
  /**
   * El usuario descarta una auto-rutina hoy. Se llama una sola
   * vez por id (idempotente arriba). El chip desaparece de la
   * fila inmediatamente. La penalty futura es responsabilidad
   * del log persistente.
   */
  onDismissAuto: (id: SubRoutineId) => void;
}

export default function SubRoutineChipRow({
  activeIds,
  manualIds,
  dismissedToday,
  onActivate,
  onDeactivate,
  onDismissAuto,
}: SubRoutineChipRowProps) {
  const { SUNRISE, SUNRISE_TEXT } = useLegacyTheme();

  // Solo mostramos las que el usuario PUEDE activar manualmente.
  const manualEnabled = SUB_ROUTINES.filter((sr) => sr.manualEnabled);
  // Y también las auto activas (no toggleables) que conviene mostrar,
  // excluyendo las que el usuario ya dismisó en este día.
  const autoActive = SUB_ROUTINES.filter(
    (sr) =>
      activeIds.has(sr.id) &&
      !manualIds.has(sr.id) &&
      !sr.manualEnabled &&
      !dismissedToday.has(sr.id),
  );

  const allChips: SubRoutine[] = [...manualEnabled, ...autoActive];
  if (allChips.length === 0) return null;

  return (
    <div>
      <div
        className="font-mono uppercase tracking-[0.32em] font-[600] mb-1.5"
        style={{ color: SUNRISE_TEXT.muted, fontSize: 9 }}
      >
        · tu día ·
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allChips.map((sr) => {
          const active = activeIds.has(sr.id);
          const isManual = manualIds.has(sr.id);
          const canToggle = sr.manualEnabled;
          const handle = () => {
            if (!canToggle) return;
            haptics.tap();
            if (isManual) onDeactivate(sr.id);
            else onActivate(sr.id, sr.ttlH);
          };
          return (
            <button
              key={sr.id}
              type="button"
              disabled={!canToggle}
              onClick={handle}
              aria-pressed={active}
              title={sr.hint}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform active:scale-[0.95]"
              style={{
                background: active
                  ? SUNRISE.rise2
                  : hexToRgba(SUNRISE.rise2, 0.06),
                border: `1px solid ${
                  active ? SUNRISE.rise2 : hexToRgba(SUNRISE.rise2, 0.18)
                }`,
                color: active ? SUNRISE.night : SUNRISE_TEXT.soft,
                opacity: canToggle ? 1 : 0.85,
                cursor: canToggle ? 'pointer' : 'default',
              }}
            >
              <span
                className="font-ui lowercase tracking-[0.02em] font-[600]"
                style={{ fontSize: 11 }}
              >
                {sr.label}
              </span>
              {active && !isManual && (
                <span
                  className="font-mono uppercase tracking-[0.18em] font-[600] px-1 rounded"
                  style={{
                    fontSize: 8.5,
                    background: hexToRgba(SUNRISE.night, 0.18),
                    color: SUNRISE.night,
                  }}
                >
                  auto
                </span>
              )}
              {active && !isManual && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Descartar ${sr.label}`}
                  title="No me aplica hoy"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.tap();
                    onDismissAuto(sr.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      haptics.tap();
                      onDismissAuto(sr.id);
                    }
                  }}
                  className="ml-0.5 inline-flex items-center justify-center rounded-full transition-transform active:scale-[0.9] cursor-pointer"
                  style={{
                    width: 16,
                    height: 16,
                    background: hexToRgba(SUNRISE.night, 0.16),
                    color: SUNRISE.night,
                  }}
                >
                  <X size={10} strokeWidth={2.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
