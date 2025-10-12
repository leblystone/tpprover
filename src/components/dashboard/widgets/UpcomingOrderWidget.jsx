import React from 'react';
import { Truck, Lock } from 'lucide-react';
import UpcomingOrderCard from '../UpcomingOrderCard';

const UpcomingOrderWidget = ({ widget, theme, order, onNewOrder, isReadOnly = false, onUpgrade }) => {
  // If no order, show compact version
  if (!order) {
    return (
      <div className="relative h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Incoming Orders
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
        
        {/* Lockout Overlay */}
        {isReadOnly && (
          <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                <Lock size={24} style={{ color: theme.primary }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                Trial has ended
              </p>
              <button
                onClick={() => {
                  if (onUpgrade) {
                    onUpgrade();
                  } else {
                    window.location.href = '/app/account';
                  }
                }}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 text-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If there's an order, show with consistent header
  return (
    <div className="relative h-full flex flex-col rounded-xl content-card" style={{ backgroundColor: theme.cardBackground }}>
      {/* Consistent Header */}
      <div className="px-4 py-3 border-b rounded-t-xl" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Incoming Orders
          </h3>
          <Truck size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      {/* Order Content */}
      <div className="flex-1 rounded-b-xl overflow-hidden">
        <UpcomingOrderCard 
          theme={theme}
          order={order}
          onNewOrder={onNewOrder}
          hideHeader={true}
        />
      </div>
      
      {/* Lockout Overlay */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-xl">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <Lock size={24} style={{ color: theme.primary }} />
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </p>
            <button
              onClick={() => {
                if (onUpgrade) {
                  onUpgrade();
                } else {
                  window.location.href = '/app/account';
                }
              }}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 text-sm"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingOrderWidget;
