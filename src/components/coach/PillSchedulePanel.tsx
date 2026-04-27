'use client';

// ═══════════════════════════════════════════════════════════
// PillSchedulePanel · sección "Pastillas programadas".
//
// Muestra los productos orales con horario activo (según
// `state.oralSchedule`), con time-picker y botón de quitar.
// Permite añadir nuevos a partir del catálogo `ORAL`.
//
// Cuando un producto tiene horario activo, el generador de
// reminders (lib/coach/reminders.ts § 6) crea un aviso `pill`
// diario que respeta el log de tomas — si ya tomó hoy, no avisa.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { Pill, Plus, Trash2, ChevronDown } from 'lucide-react';
import { ORAL, type OralProduct } from '@/lib/coach/catalog';
import type { OralSchedule, OralScheduleEntry } from '@/lib/coach/state';
import { SUNRISE, SUNRISE_TEXT, hexToRgba } from '@/lib/common/theme';
import { haptics } from '@/lib/common/haptics';

interface PillSchedulePanelProps {
  schedule: OralSchedule;
  onSet: (productId: string, entry: OralScheduleEntry) => void;
  onClear: (productId: string) => void;
}

const DEFAULT_HOUR_BY_TIMING: Record<OralProduct['defaultTiming'], { h: number; m: number }> = {
  morning: { h: 8, m: 0 },
  lunch: { h: 13, m: 0 },
  evening: { h: 19, m: 0 },
  bedtime: { h: 22, m: 0 },
  with_meal: { h: 13, m: 0 },
  flexible: { h: 12, m: 0 },
};

export default function PillSchedulePanel({ schedule, onSet, onClear }: PillSchedulePanelProps) {
  const [picker, setPicker] = useState(false);
  const scheduledIds = Object.keys(schedule);
  const scheduledProducts = scheduledIds
    .map(id => ORAL.find(p => p.id === id))
    .filter((p): p is OralProduct => !!p);

  const availableProducts = ORAL.filter(p => !scheduledIds.includes(p.id));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(SUNRISE.predawn2, 0.6)} 0%, ${hexToRgba(SUNRISE.predawn1, 0.35)} 100%)`,
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.18)}`,
      }}
    >
      <div className="px-4 py-2.5 flex items-center gap-2">
        <Pill size={12} strokeWidth={1.85} style={{ color: SUNRISE.rise2 }} />
        <span
          className="font-ui text-[9.5px] tracking-[0.32em] uppercase"
          style={{ color: SUNRISE_TEXT.muted }}
        >
          Pastillas programadas · {scheduledProducts.length}
        </span>
      </div>

      {scheduledProducts.length === 0 && !picker && (
        <div
          className="px-4 py-3 font-mono text-[11px] leading-snug"
          style={{
            color: SUNRISE_TEXT.muted,
            borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
          }}
        >
          Sin horarios activos. Añadí uno para que el coach te recuerde
          la toma diaria.
        </div>
      )}

      {scheduledProducts.length > 0 && (
        <div
          className="flex flex-col"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}` }}
        >
          {scheduledProducts.map(product => (
            <ScheduleRow
              key={product.id}
              product={product}
              entry={schedule[product.id]}
              onChange={entry => onSet(product.id, entry)}
              onRemove={() => { haptics.tap(); onClear(product.id); }}
            />
          ))}
        </div>
      )}

      {!picker && availableProducts.length > 0 && (
        <button
          type="button"
          onClick={() => { haptics.tick(); setPicker(true); }}
          className="w-full px-4 py-2.5 flex items-center justify-center gap-1.5 font-ui text-[10px] tracking-[0.28em] uppercase transition-colors"
          style={{
            color: SUNRISE.rise2,
            background: hexToRgba(SUNRISE.rise2, 0.06),
            borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
          }}
        >
          <Plus size={12} strokeWidth={1.85} /> Añadir pastilla
        </button>
      )}

      {picker && (
        <div
          className="px-3 py-2.5 flex flex-col gap-1.5"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}` }}
        >
          <div
            className="font-ui text-[9px] tracking-[0.28em] uppercase pl-1 pb-1"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Elegí del arsenal oral
          </div>
          {availableProducts.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                haptics.tap();
                const t = DEFAULT_HOUR_BY_TIMING[p.defaultTiming];
                onSet(p.id, { hour: t.h, minute: t.m });
                setPicker(false);
              }}
              className="text-left rounded-lg px-3 py-2 transition-transform active:scale-[0.99]"
              style={{
                background: hexToRgba(SUNRISE.rise2, 0.05),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.14)}`,
              }}
            >
              <div
                className="font-display italic font-[400] text-[13px] leading-tight"
                style={{ color: SUNRISE_TEXT.primary }}
              >
                {p.name}
              </div>
              <div
                className="font-mono text-[10px] tracking-wider mt-0.5"
                style={{ color: SUNRISE_TEXT.muted }}
              >
                {p.dose} · default: {p.defaultTiming}
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { haptics.tick(); setPicker(false); }}
            className="font-ui text-[9px] tracking-[0.28em] uppercase py-1.5 mt-1"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  product,
  entry,
  onChange,
  onRemove,
}: {
  product: OralProduct;
  entry: OralScheduleEntry;
  onChange: (entry: OralScheduleEntry) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const hh = entry.hour.toString().padStart(2, '0');
  const mm = entry.minute.toString().padStart(2, '0');

  return (
    <div
      className="px-4 py-2.5 flex flex-col gap-2"
      style={{ borderBottom: `1px solid ${hexToRgba(SUNRISE.rise2, 0.08)}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            color: SUNRISE.rise2,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
          }}
        >
          <Pill size={12} strokeWidth={1.85} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-mono text-[11.5px] leading-tight"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {product.name}
          </div>
          <div
            className="font-mono text-[9.5px] tracking-wider mt-0.5"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            {product.dose}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { haptics.tick(); setEditing(e => !e); }}
          className="font-display italic font-[400] text-[14px] leading-tight inline-flex items-center gap-1"
          style={{ color: SUNRISE.rise2 }}
        >
          {hh}:{mm}
          <ChevronDown
            size={12}
            strokeWidth={1.85}
            style={{
              transform: editing ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
            }}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-[0.94]"
          style={{
            background: hexToRgba('#ff6b6b', 0.1),
            color: '#ff6b6b',
            border: `1px solid ${hexToRgba('#ff6b6b', 0.3)}`,
          }}
          aria-label="Quitar"
        >
          <Trash2 size={11} strokeWidth={1.85} />
        </button>
      </div>
      {editing && (
        <div className="flex items-center gap-2 pl-10">
          <input
            type="number"
            min={0}
            max={23}
            value={entry.hour}
            onChange={e => {
              const h = Math.max(0, Math.min(23, Number(e.target.value) || 0));
              onChange({ ...entry, hour: h });
            }}
            className="w-14 rounded-md px-2 py-1 font-mono text-[12px] text-center"
            style={{
              background: hexToRgba(SUNRISE.predawn2, 0.6),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.25)}`,
              color: SUNRISE_TEXT.primary,
            }}
          />
          <span style={{ color: SUNRISE_TEXT.muted }}>:</span>
          <input
            type="number"
            min={0}
            max={59}
            step={5}
            value={entry.minute}
            onChange={e => {
              const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
              onChange({ ...entry, minute: m });
            }}
            className="w-14 rounded-md px-2 py-1 font-mono text-[12px] text-center"
            style={{
              background: hexToRgba(SUNRISE.predawn2, 0.6),
              border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.25)}`,
              color: SUNRISE_TEXT.primary,
            }}
          />
          <span
            className="font-ui text-[9px] tracking-[0.24em] uppercase"
            style={{ color: SUNRISE_TEXT.muted }}
          >
            hora local
          </span>
        </div>
      )}
    </div>
  );
}
