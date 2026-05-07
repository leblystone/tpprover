import React, { useState } from 'react';
import { Beaker, Package, Percent, PenTool, FileImage, Link, ExternalLink, ChevronRight, Droplet, ChevronDown, ChevronUp, Edit, Calendar, Hash, Tag, Info } from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';
import { getUnitLabel, canReconstitute } from '../../utils/unitConversion';
import { getPurposeIconComponent, inferPurposeIconFromCompound, PURPOSE_ICON_WEIGHT } from '../../utils/protocolPurposeIcons';

/**
 * StockpileGroupCard Component - Flattened Hierarchy Redesign
 * Features:
 * - Removed "cards within cards" nesting
 * - Icon-driven data points to reduce text heaviness
 * - Clean list style with subtle vertical indicators
 * - One-line item summaries with expandable details
 */
export default function StockpileGroupCard({ 
  group, 
  hasMatchingIncoming = false,
  theme, 
  isUnknownGroup, 
  vendorMap,
  isReadOnly,
  onCardClick,
  onMergeIndividualItem,
  onDeleteItem,
  onViewOrder,
  onSendToRecon,
  onPreviewImage,
  onViewDetails,
  onCompleteEntry
}) {
  const hasLowStock = Object.values(group.variants).some(v => v.totalVials <= 2);
  const showChip = hasLowStock || hasMatchingIncoming;
  const chipText = hasLowStock && hasMatchingIncoming
    ? 'Low - More en Route'
    : hasMatchingIncoming
      ? 'En Route'
      : hasLowStock
        ? 'Low'
        : '';
  const chipIsLowEnRoute = hasLowStock && hasMatchingIncoming;
  // Container unit from first item (vial, bottle, tablets) for header label
  const firstVariant = Object.values(group.variants)[0];
  const firstItem = firstVariant?.items?.[0];
  const containerUnit = firstItem?.unit || group.containerUnit || 'vial';
  const containerLabel = getUnitLabel(containerUnit, group.totalVials);

  // Track which menu is open (only one at a time)
  const [openMenuId, setOpenMenuId] = useState(null);
  // Track which item is pending deletion
  const [itemToDelete, setItemToDelete] = useState(null);

  // Resolve purpose icon: explicit on first item → auto-detect from name → none
  const explicitIcon = firstItem?.purposeIcon;
  const resolvedIconId = explicitIcon || inferPurposeIconFromCompound(group.name);
  const PurposeIcon = resolvedIconId ? getPurposeIconComponent(resolvedIconId) : null;

  return (
    <div
      onClick={onCardClick}
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] hover:shadow-2xl glass-panel-minimal"
      style={{
        boxShadow: theme.isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
      }}
    >
      {/* Decorative gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden rounded-2xl"
        style={{
          background: `radial-gradient(circle at top right, ${theme.primary}15 0%, transparent 60%)`
        }}
      />

      {/* Content */}
      <div className="relative p-3">
        {/* Unknown Group Alert Banner */}
        {isUnknownGroup && (
          <div 
            className="mb-3 p-2.5 rounded-xl border flex flex-col gap-2"
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(200, 122, 92, 0.12)' : 'rgba(200, 122, 92, 0.08)',
              borderColor: theme.isDark ? 'rgba(200, 122, 92, 0.3)' : 'rgba(200, 122, 92, 0.2)'
            }}
          >
            <div className="flex items-center gap-2">
              <PenTool size={14} style={{ color: '#c87a5c', flexShrink: 0 }} />
              <p className="text-xs font-normal flex-1" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                Incomplete entry - matching the research principal
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isReadOnly) {
                  window.dispatchEvent(new CustomEvent('tpp:show-upgrade-modal'));
                  return;
                }
                const firstItem = Object.values(group.variants)[0]?.items[0];
                if (firstItem && onCompleteEntry) onCompleteEntry(firstItem);
              }}
              className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#c87a5c', color: '#ffffff', fontFamily: 'Poppins, sans-serif' }}
            >
              Complete Entry
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              {PurposeIcon && (
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-lg p-1"
                  style={{
                    backgroundColor: theme.isDark ? `${theme.primary}22` : `${theme.primary}14`,
                  }}
                  title={resolvedIconId ? resolvedIconId.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) : undefined}
                >
                  <PurposeIcon
                    size={20}
                    weight={PURPOSE_ICON_WEIGHT}
                    style={{ color: theme.primary }}
                    aria-hidden
                  />
                </div>
              )}
              <h3 className="text-lg font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                {group.name}
              </h3>
            </div>
            {showChip && (
              <div 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border mt-1"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  backgroundColor: 'transparent',
                  borderWidth: '1px',
                  borderColor: chipIsLowEnRoute || (hasLowStock && !hasMatchingIncoming)
                    ? (theme.isDark ? 'rgba(251, 191, 36, 0.5)' : 'rgba(202, 138, 4, 0.4)')
                    : (theme.isDark ? 'rgba(107, 142, 107, 0.5)' : 'rgba(85, 119, 85, 0.4)'),
                  color: chipIsLowEnRoute || (hasLowStock && !hasMatchingIncoming)
                    ? (theme.isDark ? '#fbbf24' : '#ca8a04')
                    : (theme.isDark ? '#6b8e6b' : '#557755')
                }}
              >
                {chipText}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black leading-none tracking-tight" style={{ color: theme.primary, fontFamily: 'Poppins, sans-serif' }}>
                {group.totalMg > 0 ? group.totalMg : group.totalVials}
              </span>
              <div className="flex flex-col items-start justify-center">
                <span className="text-sm font-bold uppercase tracking-wide opacity-75 leading-tight" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                  {group.totalMg > 0 ? (group.unit || 'mg') : containerLabel}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wide opacity-50 leading-tight" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flat List of Variants */}
        <div className="space-y-2 mt-2">
          {Object.values(group.variants)
            .sort((a, b) => String(a.mg).localeCompare(String(b.mg)))
            .map((variant, index, array) => (
              <div key={variant.mg} className="relative pl-3">
                {/* Vertical indicator line for variant grouping - Sage Green */}
                <div 
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ backgroundColor: '#8ca68c', opacity: 0.4 }}
                />
                
                {/* Variant Header Label: amount per container type (e.g. 100 mg per vial) */}
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-75 flex items-center justify-between" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                  <div className="flex items-center gap-1.5">
                    <Beaker size={12} style={{ color: '#8ca68c' }} />
                    {variant.mg} {variant.unit || 'mg'} per {getUnitLabel(variant.items?.[0]?.unit || variant.containerUnit || 'vial', 1)}
                  </div>
                  <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} /> {/* Inner section divider */}
                </div>

                {/* Column Headers */}
                <div
                  className="flex items-center justify-between px-3 -mx-2 mb-0.5"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-widest opacity-40" style={{ color: theme.text }}>Vendor</span>
                  <div className="flex items-center gap-6 mr-8">
                    <span className="text-[9px] font-semibold uppercase tracking-widest opacity-40" style={{ color: theme.text }}>Qty</span>
                  </div>
                </div>

                {/* Items in this variant - Flattened List */}
                <div className="space-y-0.5">
                  {variant.items.map((item, itemIdx) => (
                    <ItemStrip
                      key={item.id}
                      item={item}
                      group={group}
                      theme={theme}
                      isUnknownGroup={isUnknownGroup}
                      vendorMap={vendorMap}
                      isReadOnly={isReadOnly}
                      onSendToRecon={onSendToRecon}
                      onPreviewImage={onPreviewImage}
                      onViewDetails={onViewDetails}
                      isLast={itemIdx === variant.items.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* Footer with Actions - match OrderList card styling */}
        <div className="mt-4 pt-3 border-t flex items-center justify-center" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              Edit Stock
            </span>
            <ChevronDown size={12} style={{ color: theme.primary }} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteItem(itemToDelete);
            setItemToDelete(null);
          }
        }}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        theme={theme}
      />
    </div>
  );
}

/**
 * ItemStrip Component
 * A clean, single-line representation of an item that expands for more data.
 */
function ItemStrip({ 
  item, group, theme, isUnknownGroup, vendorMap, isReadOnly, 
  onSendToRecon, onPreviewImage, onViewDetails, isLast
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const vendorName = item.vendorId ? vendorMap[item.vendorId] : item.vendor || 'Unknown Vendor';
  const needsReview = item.notes?.includes('Added during protocol start') || item.notes?.includes('Added during protocol edit');

  return (
    <div 
      className="group/strip transition-all duration-200"
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
    >
      {/* Main Strip */}
      <div className={`flex items-center justify-between py-1.5 px-3 -mx-2 rounded-lg transition-all duration-150 cursor-pointer ${!isLast && !isExpanded ? 'border-b border-black/[0.03] dark:border-white/[0.03]' : ''}`}
        style={{
          backgroundColor: isExpanded 
            ? (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
            : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.boxShadow = theme.isDark 
              ? `inset 0 0 0 1px rgba(255, 255, 255, 0.08)`
              : `inset 0 0 0 1px rgba(0, 0, 0, 0.04)`;
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Expand/Collapse Chevron */}
          <div className="flex-shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={14} style={{ color: theme.primary }} strokeWidth={2.5} />
          </div>
          
          {/* Needs Review Badge - click opens manage modal to fix details */}
          {needsReview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.();
              }}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 transition-opacity hover:opacity-90"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)',
                color: theme.isDark ? '#fbbf24' : '#ca8a04',
                fontFamily: 'Poppins, sans-serif'
              }}
              title="Added during protocol start - review details (click to open)"
            >
              Review
            </button>
          )}
          
          <div className="text-sm font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
            {vendorName}
          </div>
          {item.date && (
            <div className="flex items-center gap-1 text-xs opacity-70 flex-shrink-0" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              <Calendar size={12} />
              {new Date(item.date).toLocaleDateString(undefined, { month: 'numeric', year: '2-digit' })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
          <div className="text-xs font-semibold px-2 py-1 rounded-md bg-black/5 dark:bg-white/10" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
            {item.quantity} {getUnitLabel(item.unit, item.quantity)}
          </div>
          
          {/* Action Row - Recon only (menu removed) */}
          <div className={`flex items-center gap-1 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover/strip:opacity-100'}`}>
            {!isUnknownGroup && canReconstitute(item.unit) && (
              <button
                onClick={(e) => { e.stopPropagation(); onSendToRecon(item, group); }}
                className="p-1 rounded-full transition-colors"
                style={{ color: theme.isDark ? '#60a5fa' : '#2563eb', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}
                title="Recon"
              >
                <Droplet size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Data Grid */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '500px' : '0',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)'
        }}
      >
        <div className="mt-1 mb-2 grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <DataPoint icon={Percent} label="Purity" value={item.purity ? `${item.purity}%` : 'N/A'} theme={theme} />
          <DataPoint icon={Tag} label="Cap Color" value={item.capColor || 'N/A'} theme={theme} />
          <DataPoint icon={Hash} label="Batch #" value={item.batchNumber || 'N/A'} theme={theme} />
          {item.notes && (
            <div className={`col-span-2 mt-1 pt-2 border-t ${needsReview ? 'border-yellow-500/30' : 'border-black/5 dark:border-white/5'}`}>
              {needsReview ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails?.();
                  }}
                  className="w-full text-left flex items-start gap-2 text-xs p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:opacity-90 cursor-pointer transition-opacity"
                  style={{ color: theme.isDark ? '#fbbf24' : '#ca8a04', fontFamily: 'Poppins, sans-serif' }}
                >
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold mb-1" style={{ color: theme.isDark ? '#fbbf24' : '#ca8a04' }}>
                      Needs Review
                    </div>
                    <span className="font-normal">{item.notes}</span>
                  </div>
                </button>
              ) : (
                <div
                  className="flex items-start gap-2 text-xs p-2 rounded-lg"
                  style={{ color: theme.textLight, fontFamily: 'Poppins, sans-serif' }}
                >
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  <span className="italic font-normal">{item.notes}</span>
                </div>
              )}
            </div>
          )}
          {item.documentation?.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-2 mt-0.5">
              {item.documentation.map((doc, idx) => (
                doc.type === 'link' ? (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/10 transition-all hover:scale-105"
                    style={{ color: theme.primary, fontFamily: 'Poppins, sans-serif' }}
                  >
                    <ExternalLink size={12} strokeWidth={2.5} />
                    {doc.title || 'View Link'}
                  </a>
                ) : (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onPreviewImage(doc); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/10 transition-all hover:scale-105"
                    style={{ color: theme.primary, fontFamily: 'Poppins, sans-serif' }}
                  >
                    <FileImage size={12} strokeWidth={2.5} />
                    {doc.title || 'View Upload'}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function DataPoint({ icon: Icon, label, value, theme }) {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <Icon size={14} style={{ color: '#8ca68c' }} className="flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wide opacity-60 font-semibold" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>{label}</span>
        <span className="text-sm font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>{value}</span>
      </div>
    </div>
  );
}
