import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const SpendingWidget = ({ widget, theme }) => {
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

  const getTrendColor = (trend) => {
    if (trend > 10) return theme.error;
    if (trend > 0) return theme.warning;
    return theme.success;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Spending
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.spending} theme={theme} />
            <DollarSign size={20} style={{ color: theme.primary }} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center">
        {/* Primary Metric - Last Month */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <DollarSign size={24} style={{ color: theme.primary }} />
          </div>
          
          <div className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
            ${spendingData.lastMonthSpend.toFixed(2)}
          </div>
          
          <div className="text-sm" style={{ color: theme.textLight }}>
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
        </div>
      </div>
    </div>
  );
};

export default SpendingWidget;
