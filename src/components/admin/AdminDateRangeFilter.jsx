import React, { useEffect, useRef, useState } from 'react';
import { Funnel } from '@phosphor-icons/react';
import { elegantPalette, getPresetDateRange, todayDateKey } from '../../utils/adminHelpers';
import { AdminAnimatedNumber } from './adminUi';

const PRESETS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'lastYear', label: 'Last Year' },
  { id: 'all', label: 'All Time' },
];

/**
 * Shared admin date-range bar — presets + custom from/to inputs.
 * Controlled via dateFrom, dateTo, activePreset + onChange.
 */
export default function AdminDateRangeFilter({
  dateFrom,
  dateTo,
  activePreset,
  onChange,
  summaryCount,
  footer,
  palette = elegantPalette,
}) {
  const pal = palette;
  const today = todayDateKey();
  const presetRefs = useRef({});
  const presetWrapRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  const applyPreset = (preset) => {
    onChange(getPresetDateRange(preset));
  };

  const handleFromChange = (value) => {
    onChange({ dateFrom: value, dateTo, preset: null });
  };

  const handleToChange = (value) => {
    onChange({ dateFrom, dateTo: value, preset: null });
  };

  useEffect(() => {
    const updateIndicator = () => {
      if (!activePreset) {
        setIndicator((prev) => ({ ...prev, visible: false }));
        return;
      }
      const el = presetRefs.current[activePreset];
      const wrap = presetWrapRef.current;
      if (!el || !wrap) return;
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        visible: true,
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activePreset, dateFrom, dateTo]);

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2 rounded-lg border"
      style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}
    >
      <Funnel size={14} style={{ color: pal.gold.metallic }} />
      <span className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>
        Date Range
      </span>

      <div ref={presetWrapRef} className="relative flex items-center gap-1 flex-wrap rounded-md p-0.5" style={{ backgroundColor: '#f0f0f0' }}>
        {indicator.visible && (
          <span
            className="admin-preset-indicator absolute top-0.5 bottom-0.5 rounded pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              backgroundColor: pal.gold.metallic,
              boxShadow: '0 1px 3px rgba(47, 59, 58, 0.12)',
            }}
            aria-hidden
          />
        )}
        {PRESETS.map(({ id, label }) => {
          const isActive = activePreset === id;
          return (
            <button
              key={id}
              ref={(el) => { presetRefs.current[id] = el; }}
              type="button"
              onClick={() => applyPreset(id)}
              className="relative z-[1] px-2 py-0.5 rounded text-xs font-medium transition-colors duration-200 enabled:hover:scale-[1.02] enabled:active:scale-[0.98]"
              style={{
                color: isActive ? '#ffffff' : '#4a4a4a',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => handleFromChange(e.target.value)}
          className="text-xs border rounded px-1.5 py-0.5 transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#d0d0d0', color: '#1a1a1a', backgroundColor: '#f9f9f9', '--tw-ring-color': pal.gold.metallic }}
        />
        <span className="text-xs" style={{ color: '#6a6a6a' }}>
          —
        </span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          max={today}
          onChange={(e) => handleToChange(e.target.value)}
          className="text-xs border rounded px-1.5 py-0.5 transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: '#d0d0d0', color: '#1a1a1a', backgroundColor: '#f9f9f9', '--tw-ring-color': pal.gold.metallic }}
        />
      </div>

      {summaryCount != null && (
        <span className="text-xs ml-auto tabular-nums" style={{ color: '#6a6a6a' }}>
          <AdminAnimatedNumber value={summaryCount} className="font-semibold" style={{ color: '#1a1a1a' }} />
          {' '}users in range
        </span>
      )}

      {footer && (
        <div className="w-full flex flex-wrap gap-2 pt-1 border-t mt-1" style={{ borderColor: '#eee' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
