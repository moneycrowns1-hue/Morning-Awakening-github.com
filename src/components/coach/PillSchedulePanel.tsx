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
      className="overflow-hidden"
      style={{
        borderRadius: 22,
        background: hexToRgba(SUNRISE.night, 0.55),
        border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* HEADER · split bento (dark info + dorado add button) */}
      <div className="flex items-stretch">
        <div className="flex-1 min-w-0 flex items-center gap-3" style={{ padding: '12px 16px' }}>
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: hexToRgba(SUNRISE.rise2, 0.16),
              color: SUNRISE.rise2,
            }}
          >
            <Pill size={15} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="font-headline font-[600] text-[16px] leading-tight lowercase tracking-[-0.015em]"
              style={{ color: SUNRISE_TEXT.primary }}
            >
              pastillas programadas
            </div>
            <div
              className="font-mono text-[10.5px] tracking-wider mt-0.5"
              style={{ color: SUNRISE_TEXT.muted }}
            >
              {scheduledProducts.length === 0
                ? 'sin horarios activos'
                : `${scheduledProducts.length} activa${scheduledProducts.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        {!picker && availableProducts.length > 0 && (
          <button
            type="button"
            onClick={() => { haptics.tick(); setPicker(true); }}
            aria-label="Añadir pastilla"
            className="shrink-0 flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{
              width: 64,
              background: SUNRISE.rise2,
              color: SUNRISE.night,
            }}
          >
            <Plus size={22} strokeWidth={2.5} style={{ color: SUNRISE.night }} />
          </button>
        )}
      </div>

      {/* EMPTY STATE */}
      {scheduledProducts.length === 0 && !picker && (
        <div
          className="px-4 py-3 font-mono text-[11px] leading-snug"
          style={{
            color: SUNRISE_TEXT.muted,
            borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}`,
          }}
        >
          Tocá <span style={{ color: SUNRISE.rise2, fontWeight: 700 }}>+</span> para que el coach te recuerde la toma diaria.
        </div>
      )}

      {/* SCHEDULE ROWS */}
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

      {/* PICKER */}
      {picker && (
        <div
          className="px-3 pt-3 pb-3 flex flex-col gap-1.5"
          style={{ borderTop: `1px solid ${hexToRgba(SUNRISE.rise2, 0.12)}` }}
        >
          <div
            className="font-ui text-[9.5px] tracking-[0.3em] uppercase pl-1 pb-1"
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
              className="text-left rounded-xl px-3 py-2 transition-transform active:scale-[0.99]"
              style={{
                background: hexToRgba(SUNRISE.night, 0.5),
                border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.16)}`,
              }}
            >
              <div
                className="font-headline font-[600] text-[13px] leading-tight lowercase tracking-[-0.01em]"
                style={{ color: SUNRISE_TEXT.primary }}
              >
                {p.name.toLowerCase()}
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
            className="font-ui text-[9.5px] tracking-[0.3em] uppercase py-2 mt-1"
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
      <div className="flex items-center gap-3">
        <span
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            color: SUNRISE.rise2,
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.3)}`,
          }}
        >
          <Pill size={13} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-headline font-[600] text-[13.5px] leading-tight lowercase tracking-[-0.01em] truncate"
            style={{ color: SUNRISE_TEXT.primary }}
          >
            {product.name.toLowerCase()}
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
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors"
          style={{
            background: hexToRgba(SUNRISE.rise2, 0.14),
            border: `1px solid ${hexToRgba(SUNRISE.rise2, 0.32)}`,
            color: SUNRISE.rise2,
          }}
        >
          <span className="font-mono text-[12px] tabular-nums font-[600]">
            {hh}:{mm}
          </span>
          <ChevronDown
            size={12}
            strokeWidth={2.2}
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
            background: hexToRgba('#ff6b6b', 0.12),
            color: '#ff6b6b',
            border: `1px solid ${hexToRgba('#ff6b6b', 0.32)}`,
          }}
          aria-label="Quitar"
        >
          <Trash2 size={11} strokeWidth={2} />
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
