import React from 'react';
import { Beaker, Package, ShoppingCart, Merge, X, Percent, PenTool, FileImage, ChevronRight } from 'lucide-react';

/**
 * StockpileGroupCard Component
 * Modern, aesthetic card design for stockpile groups
 * Features:
 * - Glassmorphic design with subtle gradients
 * - Smooth animations and hover effects
 * - Better visual hierarchy
 * - Touch-optimized for mobile
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
  getUseByStatus
}) {
  return (
    <div
      onClick={onCardClick}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: theme.isDark 
          ? `linear-gradient(135deg, ${theme.cardBackground} 0%, ${theme.cardBackground}ee 100%)`
          : `linear-gradient(135deg, ${theme.cardBackground} 0%, #ffffff 100%)`,
        boxShadow: theme.isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 2px 16px rgba(0, 0, 0, 0.06), 0 8px 32px rgba(0, 0, 0, 0.04)',
        border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}`
      }}
    >
      {/* Decorative gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${theme.primary}15 0%, transparent 70%)`
        }}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Unknown Group Alert Banner */}
        {isUnknownGroup && (
          <div 
            className="mb-4 p-3 rounded-xl flex items-center gap-2 border"
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(200, 122, 92, 0.12)' : 'rgba(200, 122, 92, 0.08)',
              borderColor: theme.isDark ? 'rgba(200, 122, 92, 0.3)' : 'rgba(200, 122, 92, 0.2)'
            }}
          >
            <PenTool size={14} style={{ color: '#c87a5c', flexShrink: 0 }} />
            <p className="text-xs font-medium" style={{ color: theme.text }}>
              Unnamed items - merge or delete to organize
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="text-lg font-bold truncate mb-1" 
              style={{ color: theme.text }}
            >
              {group.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"
                style={{ 
                  backgroundColor: isUnknownGroup ? '#c87a5c' : theme.primary, 
                  color: '#ffffff',
                  boxShadow: isUnknownGroup 
                    ? '0 2px 8px rgba(200, 122, 92, 0.3)'
                    : `0 2px 8px ${theme.primary}30`
                }}
              >
                {isUnknownGroup && <PenTool size={12} />}
                {group.totalMg > 0 
                  ? `${group.totalMg} ${group.unit || 'mg'}` 
                  : `${group.totalVials} ${group.totalVials === 1 ? 'vial' : 'vials'}`
                }
              </div>
            </div>
          </div>
          
          {/* Chevron indicator */}
          <div 
            className="flex items-center justify-center transition-all duration-300 group-hover:translate-x-1"
            style={{ 
              color: theme.primary
            }}
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-2.5">
          {Object.values(group.variants)
            .sort((a, b) => String(a.mg).localeCompare(String(b.mg)))
            .map(variant => (
              <VariantSection
                key={variant.mg}
                variant={variant}
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
              />
            ))}
        </div>

        {/* Action buttons footer */}
        {!isUnknownGroup && (
          <div 
            className="mt-4 pt-4 border-t"
            style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: theme.textLight }}>
              <span className="font-medium">
                {Object.keys(group.variants).length} variant{Object.keys(group.variants).length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * VariantSection Component
 * Displays individual variant within a group
 */
function VariantSection({ 
  variant, 
  group, 
  theme, 
  isUnknownGroup, 
  vendorMap,
  isReadOnly,
  onMergeIndividualItem,
  onDeleteItem,
  onViewOrder,
  onSendToRecon,
  onPreviewImage,
  getUseByStatus
}) {
  return (
    <div 
      className="rounded-xl p-3 border"
      style={{ 
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Variant header */}
      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex items-center gap-2.5 font-semibold" style={{ color: theme.text }}>
          <Beaker size={20} strokeWidth={2.5} style={{ color: theme.primary }} />
          {variant.mg} {variant.unit || 'mg'}
        </div>
        <div 
          className="px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{ 
            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            color: theme.text
          }}
        >
          {variant.totalVials} vial{variant.totalVials !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {variant.items.map(item => (
          <ItemRow
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
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ItemRow Component
 * Individual item within a variant
 */
function ItemRow({ 
  item, 
  group, 
  theme, 
  isUnknownGroup, 
  vendorMap,
  isReadOnly,
  onMergeIndividualItem,
  onDeleteItem,
  onViewOrder,
  onSendToRecon,
  onPreviewImage,
  getUseByStatus
}) {
  return (
    <div className="space-y-2">
      {/* Vendor and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: theme.text }}>
          <Package size={16} strokeWidth={2.5} style={{ color: theme.primary }} />
          {item.vendorId ? vendorMap[item.vendorId] : item.vendor}
        </div>
        
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Unknown group actions */}
          {isUnknownGroup && (
            <>
              <ActionButton
                icon={Merge}
                title="Merge into another peptide"
                color={theme.primary}
                hoverBg={theme.isDark ? '#374151' : `${theme.primary}15`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) {
                    window.dispatchEvent(new CustomEvent('tpp:show-upgrade-modal'));
                    return;
                  }
                  onMergeIndividualItem(item);
                }}
              />
              <ActionButton
                icon={X}
                title="Delete this item"
                color="#c87a5c"
                hoverBg={theme.isDark ? '#7c2d12' : '#fef3c7'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) {
                    window.dispatchEvent(new CustomEvent('tpp:show-upgrade-modal'));
                    return;
                  }
                  onDeleteItem(item);
                }}
              />
            </>
          )}
          
          {/* View order */}
          {item.orderId && (
            <ActionButton
              icon={ShoppingCart}
              title="View Source Order"
              color={theme.primary}
              hoverBg={theme.isDark ? '#374151' : `${theme.primary}15`}
              onClick={(e) => {
                e.stopPropagation();
                onViewOrder(item.orderId);
              }}
            />
          )}
          
          {/* Send to recon */}
          {!isUnknownGroup && (
            <ActionButton
              icon={() => (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12z"></path>
                </svg>
              )}
              title="Send to Recon Calculator"
              color={theme.primary}
              hoverBg={theme.isDark ? '#374151' : `${theme.primary}15`}
              onClick={(e) => {
                e.stopPropagation();
                onSendToRecon(item, group);
              }}
            />
          )}
        </div>
      </div>

      {/* Item details */}
      <div className="space-y-1.5 text-xs">
        {item.date && (
          <div style={{ color: theme.textLight }}>
            Acquired: {new Date(item.date).toLocaleDateString()}
          </div>
        )}
        
        {item.useByDate && (() => {
          const useByStatus = getUseByStatus(item.useByDate);
          return (
            <div 
              className="inline-block px-2 py-1 rounded-md text-xs font-medium"
              style={{
                backgroundColor: useByStatus?.status === 'expired' 
                  ? 'rgba(239, 68, 68, 0.15)'
                  : useByStatus?.status === 'expiring'
                  ? 'rgba(251, 191, 36, 0.15)'
                  : 'transparent',
                color: useByStatus?.status === 'expired'
                  ? '#ef4444'
                  : useByStatus?.status === 'expiring'
                  ? '#f59e0b'
                  : theme.textLight
              }}
            >
              Use By: {new Date(item.useByDate).toLocaleDateString()}
              {useByStatus?.status === 'expired' && ' (EXPIRED)'}
              {useByStatus?.status === 'expiring' && ' (Expiring Soon)'}
            </div>
          );
        })()}
        
        {item.purity && (
          <div className="flex items-center gap-1.5" style={{ color: theme.textLight }}>
            <Percent size={14} strokeWidth={2.5} style={{ color: theme.primary }} />
            {item.purity}% Purity
          </div>
        )}
        
        {item.documentation && item.documentation.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {item.documentation.map((doc, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (doc.type === 'image') {
                    onPreviewImage(doc);
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  color: theme.primary
                }}
              >
                <FileImage size={14} strokeWidth={2.5} />
                <span className="text-xs">View</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ActionButton Component
 * Reusable action button with hover effects
 */
function ActionButton({ icon: Icon, title, color, hoverBg, onClick }) {
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <button
      title={title}
      className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
      style={{ 
        color,
        backgroundColor: isHovered ? hoverBg : 'transparent'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Icon size={16} strokeWidth={2.5} />
    </button>
  );
}

