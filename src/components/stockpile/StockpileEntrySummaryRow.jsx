import React from 'react';
import { ChevronDown, Merge, Paperclip, X } from 'lucide-react';
import { Drop } from '@phosphor-icons/react';
import { canReconstitute, getUnitLabel } from '../../utils/unitConversion';

export const STOCKPILE_ENTRY_MANAGE_GRID = '1fr 60px 70px 56px 38px 28px';
export const STOCKPILE_ENTRY_CARD_STACKED_GRID = 'minmax(72px, 1fr) 52px 72px 58px 38px 54px';

const CAP_COLOR_MAP = {
  blue:   { color: '#3b82f6', metallic: false },
  navy:   { color: '#1e3a5f', metallic: false },
  red:    { color: '#ef4444', metallic: false },
  gold:   { color: '#ca8a04', metallic: true  },
  amber:  { color: '#d97706', metallic: true  },
  silver: { color: '#94a3b8', metallic: true  },
  chrome: { color: '#94a3b8', metallic: true  },
  green:  { color: '#22c55e', metallic: false },
  purple: { color: '#a855f7', metallic: false },
  violet: { color: '#7c3aed', metallic: false },
  orange: { color: '#f97316', metallic: false },
  black:  { color: '#374151', metallic: false },
  white:  { color: '#e2e8f0', metallic: false },
  pink:   { color: '#ec4899', metallic: false },
  yellow: { color: '#eab308', metallic: false },
  grey:   { color: '#94a3b8', metallic: true  },
  gray:   { color: '#94a3b8', metallic: true  },
  brown:  { color: '#92400e', metallic: false },
  teal:   { color: '#14b8a6', metallic: false },
  cyan:   { color: '#06b6d4', metallic: false },
};

export function getStockpileCapDotBackground(colorString) {
  if (!colorString) return null;
  const parts = String(colorString).split('/').map(p => p.trim().toLowerCase());
  const e1 = CAP_COLOR_MAP[parts[0]];
  const e2 = parts[1] ? CAP_COLOR_MAP[parts[1]] : null;
  if (!e1 && !e2) return null;

  const c1 = e1?.color;
  const c2 = e2?.color;
  const isMetallic = e1?.metallic || e2?.metallic;
  const shine = isMetallic
    ? 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, transparent 45%, rgba(0,0,0,0.2) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)';
  const colorLayer = c1 && c2
    ? `linear-gradient(90deg, ${c1} 50%, ${c2} 50%)`
    : (c1 || c2);

  return `${shine}, ${colorLayer}`;
}

function getVendorName(item, vendorMap) {
  return item.vendorId ? (vendorMap?.[item.vendorId] || item.vendor || 'Unknown') : (item.vendor || 'Unknown');
}

function getVendorInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function getAmountLabel(item) {
  return `${item.mg || '?'}${item.mgUnit || 'mg'}`;
}

function isReviewNeeded(item) {
  return item.notes?.includes('Added during protocol start') || item.notes?.includes('Added during protocol edit');
}

function CapDot({ background, value, size = 'w-5 h-5', showPlaceholder = false, theme }) {
  if (!background) {
    return showPlaceholder ? (
      <span className="text-xs font-semibold opacity-25" style={{ color: theme.text }}>—</span>
    ) : null;
  }

  return (
    <span
      className={`${size} rounded-full flex-shrink-0`}
      style={{
        background,
        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.12)',
      }}
      title={value}
      aria-label={value}
    />
  );
}

function PurityBadge({ purity, theme, showPlaceholder = false, compact = false }) {
  if (!purity) {
    return showPlaceholder ? (
      <span className="text-xs font-semibold opacity-25" style={{ color: theme.text }}>—</span>
    ) : null;
  }

  return (
    <span
      className={`${compact ? 'text-xs px-2.5 py-1' : 'text-xs px-2 py-0.5'} font-bold rounded-full`}
      style={{
        color: theme.primary,
        backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}12`,
        fontFamily: 'Poppins, sans-serif',
      }}
      title={`${purity}% purity`}
    >
      {purity}%
    </span>
  );
}

export default function StockpileEntrySummaryRow({
  item,
  group,
  mode = 'card',
  layoutMode = 'stacked',
  theme,
  vendorMap,
  isUnknownGroup = false,
  isExpanded = false,
  onToggle,
  showMerge = false,
  onMerge,
  onDelete,
  onSendToRecon,
  onReview,
}) {
  const vendorName = getVendorName(item, vendorMap);
  const initials = getVendorInitials(vendorName);
  const capDotBg = getStockpileCapDotBackground(item.capColor);
  const needsReview = isReviewNeeded(item);
  const hasDocs = item.documentation?.length > 0;
  const canSendToRecon = !isUnknownGroup && canReconstitute(item.unit) && onSendToRecon;

  if (mode === 'manage') {
    return (
      <div
        className="grid items-center px-4 py-3.5 cursor-pointer transition-all rounded-xl min-h-[58px]"
        style={{
          gridTemplateColumns: STOCKPILE_ENTRY_MANAGE_GRID,
          backgroundColor: isExpanded
            ? (theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
            : 'transparent'
        }}
        onClick={onToggle}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex-shrink-0 transition-transform duration-150 ease-out"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', willChange: 'transform' }}
          >
            <ChevronDown size={18} style={{ color: theme.primary }} strokeWidth={2.5} />
          </div>
          <div className="text-base font-bold truncate" style={{ color: theme.text }}>
            {vendorName}
          </div>
        </div>

        <div className="text-sm font-bold text-center" style={{ color: theme.text, opacity: 0.78 }}>
          {getAmountLabel(item)}
        </div>

        <div className="flex justify-center">
          <div className="text-sm font-bold px-3 py-1 rounded-lg bg-black/5 dark:bg-white/10" style={{ color: theme.text }}>
            {item.quantity || '0'} {getUnitLabel(item.unit, item.quantity)}
          </div>
        </div>

        <div className="flex justify-center">
          <PurityBadge purity={item.purity} theme={theme} showPlaceholder compact />
        </div>

        <div className="flex justify-center">
          <CapDot background={capDotBg} value={item.capColor} theme={theme} showPlaceholder />
        </div>

        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {showMerge && (
            <button
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                color: theme.primary
              }}
              onClick={onMerge}
              title="Merge"
            >
              <Merge size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const isGrid = layoutMode === 'columns';

  if (!isGrid) {
    return (
      <div
        className="rounded-xl border transition-all duration-200 overflow-hidden"
        style={{
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          backgroundColor: `${theme.primary}08`,
          borderLeftColor: theme.primary,
          borderLeftWidth: '3px',
        }}
      >
        <div
          className="grid items-center px-3 py-2.5 min-h-[48px]"
          style={{ gridTemplateColumns: STOCKPILE_ENTRY_CARD_STACKED_GRID }}
        >
          <div className="flex items-center justify-center min-w-0">
            <span
              className="text-sm font-bold truncate leading-tight min-w-0 text-center"
              style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}
              title={vendorName}
            >
              {vendorName}
            </span>
          </div>

          <div className="text-sm font-bold text-center" style={{ color: theme.text, opacity: 0.72 }}>
            {getAmountLabel(item)}
          </div>

          <div className="flex justify-center">
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{
                color: theme.isDark ? 'rgba(226,232,240,0.72)' : 'rgba(47,59,58,0.68)',
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {item.quantity || '0'} {getUnitLabel(item.unit, item.quantity)}
            </span>
          </div>

          <div className="flex justify-center">
            <PurityBadge purity={item.purity} theme={theme} showPlaceholder compact />
          </div>

          <div className="flex justify-center">
            <CapDot background={capDotBg} value={item.capColor} theme={theme} showPlaceholder />
          </div>

          <div
            className="self-stretch flex items-center justify-end pl-2 ml-1"
            style={{ borderLeft: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {canSendToRecon && (
              <button
                onClick={(e) => { e.stopPropagation(); onSendToRecon(item, group); }}
                className="w-9 h-9 flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
                style={{
                  color: theme.isDark ? '#bfdbfe' : '#60a5fa',
                  backgroundColor: 'transparent',
                }}
                title="Send to reconstitution calculator"
              >
                <Drop size={28} weight="duotone" color="currentColor" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border transition-all duration-200 overflow-hidden"
      style={{
        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
        backgroundColor: `${theme.primary}08`,
        borderLeftColor: theme.primary,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-stretch">

        {/* ── Left content ── */}
        <div className={`flex-1 min-w-0 flex items-center gap-2 ${isGrid ? 'px-2 py-2' : 'px-3 py-2.5'}`}>

          {/* Square initials chip */}
          <span
            className={`${isGrid ? 'w-7 h-7 rounded-lg text-[10px]' : 'w-8 h-8 rounded-xl text-[11px]'} flex-shrink-0 flex items-center justify-center font-black leading-none self-center`}
            style={{
              backgroundColor: `${theme.primary}18`,
              color: theme.primary,
              fontFamily: 'Poppins, sans-serif',
              boxShadow: theme.isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 2px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.20)'
                : 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 2px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.08)',
            }}
            aria-hidden
          >
            {initials.slice(0, 2)}
          </span>

          {/* Text block */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">

            {/* Line 1 */}
            <div className="flex items-center gap-1.5">
              <span
                className={`${isGrid ? 'hidden sm:block' : ''} flex-1 text-sm font-bold truncate leading-tight min-w-0`}
                style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}
                title={vendorName}
              >
                {vendorName}
              </span>

              {/* Qty + cap dot chip */}
              <span
                className="flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md"
                style={{
                  color: theme.isDark ? 'rgba(226,232,240,0.72)' : 'rgba(47,59,58,0.68)',
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  fontFamily: 'Poppins, sans-serif',
                }}
                title={`${item.quantity} ${getUnitLabel(item.unit, item.quantity)}${item.capColor ? ` • ${item.capColor}` : ''}`}
              >
                {capDotBg && (
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ background: capDotBg, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }}
                    aria-hidden
                  />
                )}
                {item.quantity} {getUnitLabel(item.unit, item.quantity)}
              </span>
              {isGrid && item.mg && (
                <span
                  className="sm:hidden text-xs font-semibold leading-none flex-shrink-0"
                  style={{ color: theme.text, opacity: 0.6, fontFamily: 'Poppins, sans-serif' }}
                >
                  {getAmountLabel(item)}
                </span>
              )}
            </div>

            {/* Line 2: larger grid + stacked details */}
            {(item.mg || hasDocs || item.purity) && (
              <div className={`${isGrid ? 'hidden sm:flex' : 'flex'} items-center gap-1.5`}>
                {item.mg && (
                  <span
                    className="text-xs font-semibold leading-none flex-shrink-0"
                    style={{ color: theme.text, opacity: 0.6, fontFamily: 'Poppins, sans-serif' }}
                  >
                    {getAmountLabel(item)}
                  </span>
                )}

                {hasDocs && (
                  <>
                    {item.mg && <span className="text-[10px] opacity-20 leading-none" style={{ color: theme.text }}>·</span>}
                    <Paperclip size={10} style={{ color: theme.text, opacity: 0.4 }} />
                  </>
                )}

                {item.purity && (
                  <>
                    {(item.mg || hasDocs) && (
                      <span
                        className="w-px h-3 flex-shrink-0"
                        style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)' }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="text-xs font-bold leading-none flex-shrink-0 ml-auto"
                      style={{ color: theme.primary, fontFamily: 'Poppins, sans-serif' }}
                      title={`${item.purity}% purity`}
                    >
                      {item.purity}%
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Recon button — stacked and larger grid rows ── */}
        {canSendToRecon && (
          <>
            <div
              className={`${isGrid ? 'hidden sm:block' : 'block'} w-px self-stretch my-2 flex-shrink-0`}
              style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onSendToRecon(item, group); }}
              className={`${isGrid ? 'hidden sm:flex px-2.5' : 'flex px-3.5'} flex-shrink-0 self-stretch items-center justify-center transition-all duration-150 hover:opacity-80 active:scale-95`}
              style={{ color: theme.isDark ? '#93c5fd' : '#2563eb', backgroundColor: 'transparent' }}
              title="Send to reconstitution calculator"
            >
              <Drop size={isGrid ? 20 : 22} weight="duotone" color="currentColor" aria-hidden />
            </button>
          </>
        )}

      </div>
    </div>
  );
}
