import React from 'react';
import { AlertTriangle, Trash2, Zap, Edit2 } from 'lucide-react';

export const SUPPLY_CATEGORIES = {
  syringe:          { label: 'Syringe',         emoji: '💉' },
  pen_needle:       { label: 'Pen Needle',       emoji: '🖊️' },
  bac_water:        { label: 'BAC Water',        emoji: '💧' },
  sterile_water:    { label: 'Sterile Water',    emoji: '🧴' },
  saline:           { label: 'Saline',           emoji: '🧪' },
  filter:           { label: 'Syringe Filter',   emoji: '🔬' },
  sterile_vial:     { label: 'Sterile Vial',     emoji: '🧫' },
  alcohol_swab:     { label: 'Alcohol Swab',     emoji: '🩹' },
  gloves:           { label: 'Gloves',           emoji: '🧤' },
  sharps_container: { label: 'Sharps Container', emoji: '🗑️' },
  nasal_spray:      { label: 'Nasal Spray',      emoji: '💨' },
  custom:           { label: 'Custom',           emoji: '📦' },
};

const AUTO_TRACK_LABELS = {
  pipette: 'Auto: Syringe dose',
  pen:     'Auto: Pen dose',
  recon:   'Auto: Recon',
};

export default function SupplyCard({ supply, theme, onEdit, onDelete }) {
  const qty = Number(supply.quantity) || 0;
  const threshold = Number(supply.lowThreshold) || 0;
  const isOut = qty <= 0;
  const isLow = !isOut && threshold > 0 && qty <= threshold;
  const cat = SUPPLY_CATEGORIES[supply.category] || SUPPLY_CATEGORIES.custom;
  const autoLabel = supply.autoTrack?.trigger ? AUTO_TRACK_LABELS[supply.autoTrack.trigger] : null;

  const quantityColor = isOut
    ? '#ef4444'
    : isLow
    ? '#f59e0b'
    : theme.primary;

  const borderColor = isOut
    ? 'rgba(239,68,68,0.35)'
    : isLow
    ? 'rgba(245,158,11,0.35)'
    : theme.border;

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden transition-all duration-200 cursor-pointer group"
      style={{
        backgroundColor: theme.cardBackground,
        border: `1px solid ${borderColor}`,
        boxShadow: theme.isDark
          ? '0 2px 8px rgba(0,0,0,0.3)'
          : '0 1px 4px rgba(0,0,0,0.08)',
      }}
      onClick={() => onEdit(supply)}
    >
      {/* Status badge */}
      {(isOut || isLow) && (
        <div
          className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isOut ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
            color: isOut ? '#ef4444' : '#f59e0b',
          }}
        >
          {isOut ? 'Empty' : 'Low'}
        </div>
      )}

      {/* Category emoji + name */}
      <div className="flex items-start gap-2.5 mb-3">
        <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{cat.emoji}</span>
        <div className="min-w-0 flex-1 pr-12">
          <p
            className="text-sm font-semibold leading-tight"
            style={{ color: theme.text }}
          >
            {supply.name}
          </p>
          {supply.brand && (
            <p className="text-xs mt-0.5 truncate" style={{ color: theme.textLight }}>
              {supply.brand}
            </p>
          )}
        </div>
      </div>

      {/* Quantity display */}
      <div className="flex items-end gap-1.5 mb-3">
        <span
          className="text-3xl font-bold leading-none transition-colors"
          style={{ color: quantityColor }}
        >
          {qty}
        </span>
        <span
          className="text-sm pb-0.5 font-medium"
          style={{ color: theme.textLight }}
        >
          {supply.unit || 'each'}
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
          >
            {cat.label}
          </span>
          {autoLabel && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
            >
              <Zap size={9} />
              {autoLabel}
            </span>
          )}
        </div>

        {/* Delete button — stop propagation so the card click (edit) doesn't also fire */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(supply); }}
          className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          style={{ color: theme.textLight }}
          title="Delete supply"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Notes excerpt */}
      {supply.notes && (
        <p
          className="mt-2 text-xs truncate"
          style={{ color: theme.textLight, opacity: 0.7 }}
        >
          {supply.notes}
        </p>
      )}
    </div>
  );
}
