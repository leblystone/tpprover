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
    const monthlySpend = orders.reduce((acc, o) => {
      const month = (o.date || '').slice(0, 7);
      const cost = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0;
      acc[month] = (acc[month] || 0) + cost;
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlySpend).sort();
    const lastMonth = sortedMonths.slice(-1)[0];
    const previousMonth = sortedMonths.slice(-2, -1)[0];
    
    const lastMonthSpend = lastMonth ? monthlySpend[lastMonth] : 0;
    const previousMonthSpend = previousMonth ? monthlySpend[previousMonth] : 0;
    
    const trend = previousMonthSpend > 0 
      ? ((lastMonthSpend - previousMonthSpend) / previousMonthSpend) * 100 
      : 0;

    // Calculate total spend
    const totalSpend = Object.values(monthlySpend).reduce((sum, amount) => sum + amount, 0);

    return { 
      lastMonthSpend, 
      previousMonthSpend, 
      trend, 
      totalSpend,
      monthCount: sortedMonths.length 
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
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          Spending
        </h3>
      </div>
      
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <DollarSign size={24} style={{ color: theme.primary }} />
          </div>
          
          <div className="text-3xl font-bold mb-1" style={{ color: theme.text }}>
            ${spendingData.lastMonthSpend.toFixed(2)}
          </div>
          
          <div className="text-sm" style={{ color: theme.textLight }}>
            Last month
          </div>
        </div>

        {spendingData.previousMonthSpend > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {spendingData.trend > 0 ? (
              <TrendingUp size={16} style={{ color: getTrendColor(spendingData.trend) }} />
            ) : (
              <TrendingDown size={16} style={{ color: theme.success }} />
            )}
            <span 
              className="text-sm font-medium" 
              style={{ color: getTrendColor(spendingData.trend) }}
            >
              {Math.abs(spendingData.trend).toFixed(1)}%
            </span>
            <span className="text-xs" style={{ color: theme.textLight }}>
              vs previous month
            </span>
          </div>
        )}

        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: theme.textLight }}>
            ${spendingData.totalSpend.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: theme.textLight }}>
            Total spent
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingWidget;
