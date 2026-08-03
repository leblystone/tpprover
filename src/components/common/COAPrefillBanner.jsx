import React from 'react';
import { FileSearch, Check, X } from 'lucide-react';

/**
 * Dismissable banner showing fields detected from a COA (or similar scan).
 *
 * Props:
 * - fields: { name?, mg?, mgUnit?, purity?, batchNumber?, vendor? }
 * - theme
 * - onApply()
 * - onDismiss()
 * - loading?: boolean
 * - title?: string
 */
export default function COAPrefillBanner({
  fields,
  theme,
  onApply,
  onDismiss,
  loading = false,
  title = 'Detected from COA',
}) {
  if (loading) {
    return (
      <div
        className="rounded-xl border px-3 py-2.5 flex items-center gap-2"
        style={{
          backgroundColor: theme?.isDark ? `${theme.primary}14` : `${theme.primary}0c`,
          borderColor: theme?.isDark ? `${theme.primary}40` : `${theme.primary}30`,
        }}
      >
        <FileSearch size={16} style={{ color: theme?.primary }} className="animate-pulse" />
        <span className="text-xs font-medium" style={{ color: theme?.text }}>
          Reading COA document…
        </span>
      </div>
    );
  }

  if (!fields) return null;

  const bits = [
    fields.name,
    fields.mg ? `${fields.mg}${fields.mgUnit ? ` ${fields.mgUnit}` : ' mg'}` : null,
    fields.purity ? `${fields.purity}% purity` : null,
    fields.batchNumber ? `Lot ${fields.batchNumber}` : null,
    fields.vendor || null,
  ].filter(Boolean);

  if (bits.length === 0) return null;

  return (
    <div
      className="rounded-xl border px-3 py-2.5 space-y-2"
      style={{
        backgroundColor: theme?.isDark ? `${theme.primary}14` : `${theme.primary}0c`,
        borderColor: theme?.isDark ? `${theme.primary}40` : `${theme.primary}30`,
      }}
    >
      <div className="flex items-start gap-2">
        <FileSearch size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme?.primary }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold" style={{ color: theme?.text }}>
            {title}
          </div>
          <div className="text-[11px] mt-0.5 leading-snug" style={{ color: theme?.textLight }}>
            {bits.join(' · ')}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md border-0 bg-transparent cursor-pointer"
          style={{ color: theme?.textLight }}
          aria-label="Dismiss"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
            border: 'none',
          }}
        >
          <Check size={14} />
          Apply
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: theme?.secondary,
            color: theme?.text,
            border: `1px solid ${theme?.border}`,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
