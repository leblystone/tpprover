import React, { useMemo } from 'react';
import { Truck, Clock } from 'lucide-react';
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

const LeadTimeWidget = ({ widget, theme }) => {
  const orders = useLocal('tpprover_orders', []);

  const leadTimeData = useMemo(() => {
    let totalLeadTime = 0;
    let leadTimeCount = 0;
    let fastestDelivery = Infinity;
    let slowestDelivery = 0;

    for (const o of orders) {
      if (!o.shipDate || !o.deliveryDate) continue;
      const days = Math.max(0, Math.round((new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000));
      totalLeadTime += days;
      leadTimeCount++;
      fastestDelivery = Math.min(fastestDelivery, days);
      slowestDelivery = Math.max(slowestDelivery, days);
    }

    const avgLeadTime = leadTimeCount > 0 ? (totalLeadTime / leadTimeCount).toFixed(1) : null;
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

    return { 
      avgLeadTime, 
      deliveredOrders, 
      fastestDelivery: fastestDelivery === Infinity ? null : fastestDelivery,
      slowestDelivery: slowestDelivery === 0 ? null : slowestDelivery
    };
  }, [orders]);

  const getLeadTimeColor = (days) => {
    if (days <= 3) return theme.success;
    if (days <= 7) return theme.warning;
    return theme.error;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            Average Delivery
            <Truck size={20} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.lead_time} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        {leadTimeData.avgLeadTime ? (
          <>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center mb-2">
                <Truck size={24} style={{ color: theme.primary }} />
              </div>
              
              <div 
                className="text-3xl font-bold mb-1" 
                style={{ color: getLeadTimeColor(parseFloat(leadTimeData.avgLeadTime)) }}
              >
                {leadTimeData.avgLeadTime}
              </div>
              
              <div className="text-sm" style={{ color: theme.textLight }}>
                average days
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <div className="text-lg font-semibold" style={{ color: theme.success }}>
                  {leadTimeData.fastestDelivery}d
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  Fastest
                </div>
              </div>
              
              <div>
                <div className="text-lg font-semibold" style={{ color: theme.error }}>
                  {leadTimeData.slowestDelivery}d
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  Slowest
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="text-sm" style={{ color: theme.textLight }}>
                {leadTimeData.deliveredOrders} delivered orders
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock size={24} style={{ color: theme.textLight }} />
            </div>
            <p className="text-sm" style={{ color: theme.textLight }}>
              No delivery data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadTimeWidget;
