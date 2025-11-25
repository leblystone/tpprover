import React from 'react';
import { Truck, Lock } from 'lucide-react';
import UpcomingOrderCard from '../UpcomingOrderCard';

const UpcomingOrderWidget = ({ widget, theme, order, orders, onNewOrder, isReadOnly = false, onUpgrade }) => {
  // Determine if we have orders - prefer orders array, fall back to single order
  const hasOrdersProp = orders !== undefined && orders !== null && Array.isArray(orders)
  const ordersList = hasOrdersProp && orders.length > 0 
    ? orders 
    : (order ? [order] : [])
  const hasOrders = ordersList.length > 0

  // If no orders, show compact version
  if (!hasOrders) {
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
            className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <span className="text-hover">Add Order</span>
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
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
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

  // If there are orders, show with consistent header
  return (
    <div className="relative h-full flex flex-col rounded-xl content-card overflow-visible" style={{ backgroundColor: theme.cardBackground, minHeight: 0 }}>
      {/* Consistent Header */}
      <div className="px-4 py-3 border-b rounded-t-xl flex-shrink-0" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Incoming Orders
          </h3>
          <Truck size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      {/* Order Content - Allow content to properly flex and pagination to show */}
      <div className="flex-1 rounded-b-xl flex flex-col min-h-0 overflow-visible" style={{ minHeight: 0 }}>
        <UpcomingOrderCard 
          theme={theme}
          orders={hasOrdersProp ? orders : undefined}
          order={!hasOrdersProp && order ? order : undefined}
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
