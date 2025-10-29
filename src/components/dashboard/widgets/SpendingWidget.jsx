import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

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

    orders.forEach(order => {
      if (order.status === 'delivered' && order.deliveredDate) {
        const deliveryDate = new Date(order.deliveredDate);
        const itemsCost = order.items?.reduce((sum, item) => {
          const price = parseFloat(item.price) || 0;
          const quantity = parseInt(item.quantity, 10) || 1;
          return sum + (price * quantity);
        }, 0) || 0;
        
        // Check if shipping costs should be included
        const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
        const includeShipping = settings.orders?.includeShippingInCosts ?? true;
        const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0;
        const totalCost = itemsCost + shippingCost;
        
        // Total spend (all time)
        totalSpend += totalCost;
        
        // Last 90 days spend
        if (deliveryDate >= last90Days) {
          last90DaysSpend += totalCost;
        }
        
        // Last month spend
        if (deliveryDate >= lastMonth && deliveryDate <= lastMonthEnd) {
          lastMonthSpend += totalCost;
        }
      }
    });

    return { 
      lastMonthSpend, 
      last90DaysSpend, 
      totalSpend
    };
  }, [orders]);

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
          <DollarSign size={20} style={{ color: theme.primary }} />
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
