import React, { useState } from 'react';
import { Beaker, Package, ShoppingCart, Merge, X, Percent, PenTool, FileImage, ChevronRight, Droplet, MoreVertical, ChevronDown, ChevronUp, Edit, Calendar, Hash, Tag, Info } from 'lucide-react';

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
  getUseByStatus,
  onViewDetails,
  onCompleteEntry
}) {
  // Calculate status badge
  const hasLowStock = Object.values(group.variants).some(v => v.totalVials <= 2);
  const statusBadge = hasLowStock ? 'low' : 'in';
  
  // Track which menu is open (only one at a time)
  const [openMenuId, setOpenMenuId] = useState(null);

  return (
    <div
      onClick={onCardClick}
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-2xl"
      style={{
        background: theme.isDark 
          ? `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.cardBackground}ee 100%)`
          : `linear-gradient(135deg, ${theme.cardBackground} 0%, #ffffff 100%)`,
        boxShadow: theme.isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`,
      }}
    >
      {/* Hover Border Glow - Makes it clear the card is interactive */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl overflow-hidden"
        style={{
          boxShadow: `inset 0 0 0 2px ${theme.primary}40, 0 0 20px ${theme.primary}20`
        }}
      />
      
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
              <p className="text-xs font-medium flex-1" style={{ color: theme.text }}>
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
              className="w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: '#c87a5c', color: '#ffffff' }}
            >
              Complete Entry
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold truncate" style={{ color: theme.text }}>
              {group.name}
            </h3>
          </div>
          
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div 
              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm"
              style={{ 
                backgroundColor: statusBadge === 'low' 
                  ? (theme.isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.12)')
                  : (theme.isDark ? 'rgba(87, 117, 87, 0.15)' : 'rgba(87, 117, 87, 0.12)'),
                color: statusBadge === 'low'
                  ? (theme.isDark ? '#fbbf24' : '#ca8a04')
                  : (theme.isDark ? '#6b8e6b' : '#557755')
              }}
            >
              {statusBadge === 'low' ? 'Low' : 'Well Stocked'}
            </div>
            <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: theme.text }}>
              {group.totalVials} Vials • {group.totalMg} {group.unit || 'mg'}
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
                
                {/* Variant Header Label */}
                <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60 flex items-center justify-between" style={{ color: theme.text }}>
                  <div className="flex items-center gap-1.5">
                    <Beaker size={10} style={{ color: '#8ca68c' }} />
                    {variant.mg} {variant.unit || 'mg'} Vials
                  </div>
                  <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: '#8ca68c' }} /> {/* Inner section divider */}
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
                      onMergeIndividualItem={onMergeIndividualItem}
                      onDeleteItem={onDeleteItem}
                      onViewOrder={onViewOrder}
                      onSendToRecon={onSendToRecon}
                      onPreviewImage={onPreviewImage}
                      getUseByStatus={getUseByStatus}
                      isLast={itemIdx === variant.items.length - 1}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* Tap to Open Indicator - Bottom Center */}
        <div className="flex justify-center mt-3 pt-2 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <div className="flex items-center gap-2 opacity-50 group-hover:opacity-80 transition-opacity">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.text }}>
              View Stock
            </span>
            <ChevronDown size={14} style={{ color: theme.primary }} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ItemStrip Component
 * A clean, single-line representation of an item that expands for more data.
 */
function ItemStrip({ 
  item, group, theme, isUnknownGroup, vendorMap, isReadOnly, 
  onMergeIndividualItem, onDeleteItem, onViewOrder, onSendToRecon, onPreviewImage, getUseByStatus, isLast,
  openMenuId, setOpenMenuId
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const showActionMenu = openMenuId === item.id;
  const vendorName = item.vendorId ? vendorMap[item.vendorId] : item.vendor || 'Unknown Vendor';
  const useByStatus = item.useByDate ? getUseByStatus(item.useByDate) : null;

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
            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
            e.currentTarget.style.boxShadow = theme.isDark 
              ? `inset 0 0 0 1px rgba(255, 255, 255, 0.1)`
              : `inset 0 0 0 1px rgba(0, 0, 0, 0.05)`;
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
          
          <div className="text-[12px] font-bold truncate" style={{ color: theme.text }}>
            {vendorName}
          </div>
          {item.date && (
            <div className="flex items-center gap-1 text-[10px] opacity-60 flex-shrink-0" style={{ color: theme.text }}>
              <Calendar size={10} />
              {new Date(item.date).toLocaleDateString(undefined, { month: 'numeric', year: '2-digit' })}
            </div>
          )}
          {useByStatus && (
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: useByStatus.status === 'expired' ? '#ef4444' : useByStatus.status === 'expiring' ? '#f59e0b' : '#10b981' }}
              title={`Use by: ${new Date(item.useByDate).toLocaleDateString()}`}
            />
          )}
        </div>

        <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
          <div className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10" style={{ color: theme.text }}>
            {item.quantity} {item.quantity === 1 ? 'vial' : 'vials'}
          </div>
          
          {/* Action Row - Always visible on mobile, hover on desktop */}
          <div className={`flex items-center gap-1 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover/strip:opacity-100'}`}>
            {!isUnknownGroup && (
              <button
                onClick={(e) => { e.stopPropagation(); onSendToRecon(item, group); }}
                className="p-1 rounded-full transition-colors"
                style={{ color: theme.isDark ? '#60a5fa' : '#2563eb', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}
                title="Recon"
              >
                <Droplet size={14} strokeWidth={2.5} />
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setOpenMenuId(showActionMenu ? null : item.id);
                }}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                style={{ color: theme.textLight }}
              >
                <MoreVertical size={14} strokeWidth={2.5} />
              </button>
              
              {showActionMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)} />
                  <div 
                    className="absolute right-0 top-full mt-1 z-[101] rounded-xl shadow-2xl border overflow-hidden min-w-[180px]"
                    style={{ backgroundColor: theme.isDark ? '#1f2937' : '#ffffff', borderColor: theme.border }}
                  >
                    {isUnknownGroup && (
                      <MenuAction icon={Merge} label="Merge Series" onClick={() => onMergeIndividualItem(item)} theme={theme} />
                    )}
                    {item.orderId && (
                      <MenuAction icon={ShoppingCart} label="View Order" onClick={() => onViewOrder(item.orderId)} theme={theme} />
                    )}
                    <MenuAction icon={X} label="Delete Entry" color="#c87a5c" onClick={() => { if(window.confirm('Delete entry?')) onDeleteItem(item); }} theme={theme} />
                  </div>
                </>
              )}
            </div>
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
        <div className="mt-1 mb-2 grid grid-cols-2 gap-x-4 gap-y-1.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <DataPoint icon={Percent} label="Purity" value={item.purity ? `${item.purity}%` : 'N/A'} theme={theme} />
          <DataPoint icon={Tag} label="Cap Color" value={item.capColor || 'N/A'} theme={theme} />
          <DataPoint icon={Hash} label="Batch #" value={item.batchNumber || 'N/A'} theme={theme} />
          <DataPoint icon={Calendar} label="Use By" value={item.useByDate ? new Date(item.useByDate).toLocaleDateString() : 'N/A'} theme={theme} />
          {item.notes && (
            <div className="col-span-2 mt-0.5 pt-1.5 border-t border-black/5 dark:border-white/5">
              <div className="flex items-start gap-2 text-[10px]" style={{ color: theme.textLight }}>
                <Info size={10} className="mt-0.5" />
                <span className="italic">{item.notes}</span>
              </div>
            </div>
          )}
          {item.documentation?.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-2 mt-0.5">
              {item.documentation.map((doc, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); if (doc.type === 'image') onPreviewImage(doc); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-black/5 dark:bg-white/10 transition-all hover:scale-105"
                  style={{ color: theme.primary }}
                >
                  <FileImage size={10} strokeWidth={2.5} />
                  View Lab Document
                </button>
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
      <Icon size={12} style={{ color: '#8ca68c' }} className="flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] uppercase tracking-widest opacity-50 font-black" style={{ color: theme.text }}>{label}</span>
        <span className="text-[11px] font-bold truncate" style={{ color: theme.text }}>{value}</span>
      </div>
    </div>
  );
}

function MenuAction({ icon: Icon, label, onClick, theme, color }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 transition-colors font-medium"
      style={{ color: color || theme.text }}
    >
      <Icon size={14} style={{ color: color || '#8ca68c' }} />
      {label}
    </button>
  );
}
