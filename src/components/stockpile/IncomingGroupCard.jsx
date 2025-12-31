import React from 'react';
import { Beaker, Package, ShoppingCart, ChevronRight } from 'lucide-react';

/**
 * IncomingGroupCard Component - Similar style to StockpileGroupCard
 * Simplified for incoming orders - just links to order
 */
export default function IncomingGroupCard({ 
  group, 
  theme, 
  onViewOrder,
  orders,
  vendorMap
}) {
  // Get the first order ID for this group (since items come from orders)
  const getFirstOrderId = () => {
    if (!orders || !group.name) return null;
    const nonDeliveredOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return !status.includes('delivered');
    });
    
    for (const order of nonDeliveredOrders) {
      if (!order.items) continue;
      const matchesName = (itemName, targetName) => {
        const normalizedItemName = itemName || '';
        if (targetName === 'Unknown') {
          return normalizedItemName === '' || normalizedItemName === 'Unknown';
        }
        return normalizedItemName === targetName;
      };
      
      const hasItem = order.items.some(item => matchesName(item.name, group.name));
      if (hasItem) return order.id;
    }
    return null;
  };

  const firstOrderId = getFirstOrderId();
  
  const handleCardClick = () => {
    if (firstOrderId && onViewOrder) {
      onViewOrder(firstOrderId);
    }
  };

  return (
    <div
      onClick={handleCardClick}
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
      {/* Hover Border Glow */}
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
        {/* Header Section */}
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              {group.name}
            </h3>
          </div>
          
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div 
              className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider shadow-sm"
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: theme.isDark ? `${theme.primary}25` : `${theme.primary}15`,
                color: theme.primary
              }}
            >
              Incoming
            </div>
            <div className="text-[10px] font-medium opacity-50 uppercase tracking-widest" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              {group.totalMg} {group.unit || 'mg'} en route
            </div>
          </div>
        </div>

        {/* Flat List of Variants */}
        <div className="space-y-2 mt-2">
          {Object.values(group.variants)
            .sort((a, b) => String(a.mg).localeCompare(String(b.mg)))
            .map((variant) => (
              <div key={variant.mg} className="relative pl-3">
                {/* Vertical indicator line */}
                <div 
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ backgroundColor: theme.primary, opacity: 0.4 }}
                />
                
                {/* Variant Header Label */}
                <div className="text-[10px] font-medium uppercase tracking-widest mb-1.5 opacity-60 flex items-center justify-between" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                  <div className="flex items-center gap-1.5">
                    <Beaker size={10} style={{ color: theme.primary }} />
                    {variant.mg} {variant.unit || 'mg'}
                  </div>
                  <div className="h-px flex-1 ml-3 opacity-30" style={{ backgroundColor: theme.primary }} />
                </div>

                {/* Vendors in this variant */}
                <div className="space-y-1">
                  {Object.entries(variant.vendors)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([vendor, qtyMg]) => {
                      const vials = Math.max(1, Math.round((Number(qtyMg) || 0) / (Number(variant.mg) || 1)));
                      return (
                        <div 
                          key={vendor}
                          className="flex items-center justify-between py-1 px-2 -mx-1 rounded-lg transition-all duration-150"
                          style={{
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Package size={12} style={{ color: theme.primary }} />
                            <span className="text-[12px] font-semibold truncate" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                              {vendor}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 ml-2 flex-shrink-0" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
                            {vials} {vials === 1 ? 'vial' : 'vials'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>

        {/* View Order Indicator - Bottom Center */}
        <div className="flex justify-center mt-3 pt-2 border-t" style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <div className="flex items-center gap-2 opacity-50 group-hover:opacity-80 transition-opacity">
            <ShoppingCart size={14} style={{ color: theme.primary }} strokeWidth={2} />
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: theme.text, fontFamily: 'Poppins, sans-serif' }}>
              View Order
            </span>
            <ChevronRight size={14} style={{ color: theme.primary }} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}

