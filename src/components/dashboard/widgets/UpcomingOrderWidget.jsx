import React from 'react';
import { Truck } from 'lucide-react';
import UpcomingOrderCard from '../UpcomingOrderCard';

const UpcomingOrderWidget = ({ widget, theme, order, onNewOrder }) => {
  // If no order, show compact version
  if (!order) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Incoming Peptides
            </h3>
            <Truck size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-sm mb-4 text-center" style={{ color: theme.textLight }}>
            No active orders
          </p>
          <button
            onClick={onNewOrder}
            className="px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Add Order
          </button>
        </div>
      </div>
    );
  }

  // If there's an order, show the full card
  return (
    <div className="h-full">
      <UpcomingOrderCard 
        theme={theme}
        order={order}
        onNewOrder={onNewOrder}
      />
    </div>
  );
};

export default UpcomingOrderWidget;
