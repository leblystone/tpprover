import React, { useMemo, useState } from 'react';
import { DollarSign, Eye } from 'lucide-react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import SpendingDetailModal from '../SpendingDetailModal';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const SpendingWidget = ({ widget, theme }) => {
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const orders = useLocal('tpprover_orders', []);
  const stockpile = useLocal('tpprover_stockpile', []);

  const spendingData = useMemo(() => {
    const now = new Date();
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);
    
    // Get last month's date range
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let lastMonthSpend = 0;
    let last90DaysSpend = 0;
    let totalSpend = 0;
    
    // Create a set of order IDs that have costs (to avoid double-counting stockpile items)
    const ordersWithCosts = new Set();

    // Process all orders (regardless of status) - use order date for time calculations
    orders.forEach(order => {
      // Handle both new structure (items array) and old structure (cost field)
      let itemsCost = 0;
      if (order.items && order.items.length > 0) {
        // New structure: calculate from items array
        itemsCost = order.items.reduce((sum, item) => {
          const price = parseFloat(item.price) || 0;
          const quantity = parseInt(item.quantity, 10) || 1;
          return sum + (price * quantity);
        }, 0);
      } else if (order.cost) {
        // Old structure: use cost field directly
        itemsCost = parseFloat(String(order.cost).replace(/[^0-9.]/g, '')) || 0;
      }
      
      // Check if shipping costs should be included
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      const includeShipping = settings.orders?.includeShippingInCosts ?? true;
      const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0;
      const totalCost = itemsCost + shippingCost;
      
      // Only count if there's actually a cost
      if (totalCost > 0) {
        // Track that this order has a cost (for stockpile deduplication)
        ordersWithCosts.add(order.id);
        
        // Use order date (not delivery date) for time-based calculations
        const orderDate = order.date ? new Date(order.date) : null;
        
        // Total spend (all time) - count all orders with amounts
        totalSpend += totalCost;
        
        // Last 90 days spend - based on order date
        if (orderDate && orderDate >= last90Days) {
          last90DaysSpend += totalCost;
        }
        
        // Last month spend - based on order date
        if (orderDate && orderDate >= lastMonth && orderDate <= lastMonthEnd) {
          lastMonthSpend += totalCost;
        }
      }
    });
    
    // Process stockpile items - only count items that don't have an orderId OR 
    // items whose orderId doesn't exist in orders or doesn't have a cost
    stockpile.forEach(stockItem => {
      const orderId = stockItem.orderId;
      const costPerVial = parseFloat(stockItem.cost) || 0;
      const quantity = parseFloat(stockItem.quantity) || 0;
      const stockItemTotal = costPerVial * quantity;
      
      // Only count if there's a cost and quantity
      if (stockItemTotal > 0) {
        // Check if this stockpile item is linked to an order that we already counted
        const linkedOrderHasCost = orderId && ordersWithCosts.has(orderId);
        
        if (!linkedOrderHasCost) {
          // This is either a manually added item (no orderId) or linked to an order without cost
          // Count it in totals
          
          // Total spend (all time)
          totalSpend += stockItemTotal;
          
          // Time-based calculations for stockpile items
          const purchaseDate = stockItem.purchaseDate ? new Date(stockItem.purchaseDate) : null;
          
          // Last 90 days spend
          if (purchaseDate && purchaseDate >= last90Days) {
            last90DaysSpend += stockItemTotal;
          }
          
          // Last month spend
          if (purchaseDate && purchaseDate >= lastMonth && purchaseDate <= lastMonthEnd) {
            lastMonthSpend += stockItemTotal;
          }
        }
      }
    });

    return { 
      lastMonthSpend, 
      last90DaysSpend, 
      totalSpend
    };
  }, [orders, stockpile]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 widget-separator" style={{ borderColor: 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Spending
            <DollarSign size={18} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.spending} theme={theme} />
            <button
              type="button"
              onClick={() => setShowBreakdownModal(true)}
              className="rounded-full flex items-center justify-center action-button-hover transition-colors"
              style={{
                color: '#ffffff',
                backgroundColor: theme.primary,
                width: '28px',
                height: '28px',
                padding: 0,
                border: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              aria-label="View spending breakdown by vendor and peptide"
            >
              <Eye size={14} strokeWidth={2} style={{ color: '#ffffff' }} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 pb-5 flex flex-col justify-center">
        {/* Primary Metric - Last Month */}
        <div className="text-center mb-4">
          <div className="text-xl lg:text-lg font-bold mb-1" style={{ color: theme.text }}>
            ${spendingData.lastMonthSpend.toFixed(2)}
          </div>
          
          <div className="text-sm mt-0.5" style={{ color: theme.textLight }}>
            Last Month
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: theme.secondary }}>
            <span className="text-sm" style={{ color: theme.text }}>Last 90 Days:</span>
            <span className="text-sm font-semibold" style={{ color: theme.text }}>
              ${spendingData.last90DaysSpend.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: theme.secondary }}>
            <span className="text-sm" style={{ color: theme.text }}>Total Overall:</span>
            <span className="text-sm font-semibold" style={{ color: theme.primary }}>
              ${spendingData.totalSpend.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBreakdownModal(true)}
            className="text-xs mt-2 py-1 rounded hover:underline text-center w-full"
            style={{ color: theme.primary }}
          >
            View breakdown · By vendor & peptide
          </button>
        </div>
      </div>

      <SpendingDetailModal
        open={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        theme={theme}
      />
    </div>
  );
};

export default SpendingWidget;
