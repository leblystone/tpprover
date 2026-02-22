import React from 'react';
import { Truck, Lock, ChevronDown } from 'lucide-react';
import UpcomingOrderCard from '../UpcomingOrderCard';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const UpcomingOrderWidget = ({ widget, theme, order, orders, onNewOrder, isReadOnly = false, onUpgrade }) => {
  const hasOrders = (orders && orders.length > 0) || order;
  // If no orders, show compact version
  if (!hasOrders) {
    return (
      <div className="relative h-full flex flex-col">
        <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
              Incoming Orders
              <Truck size={20} style={{ color: theme.primary }} />
            </h3>
            <div className="flex items-center gap-2">
              <ExpandableTooltip content={WIDGET_TOOLTIPS.upcoming_order} theme={theme} />
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
          <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
            No active orders
          </p>
          <button
            type="button"
            onClick={onNewOrder}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              color: theme.isDark ? 'rgba(200, 215, 195, 0.9)' : theme.primary,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}15`,
              border: theme.isDark ? 'none' : `1px solid ${theme.primary}40`
            }}
          >
            Add an Order
            <ChevronDown size={14} />
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
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm btn-primary-inset"
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
    <div className="relative h-full flex flex-col rounded-xl content-card">
      {/* Consistent Header */}
      <div className="px-4 py-3 widget-separator rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Incoming Orders
            <Truck size={18} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.upcoming_order} theme={theme} position="right" />
          </div>
        </div>
      </div>
      
      {/* Order Content - pass orders array for pagination when available */}
      <div className="flex-1 rounded-b-xl overflow-hidden">
        <UpcomingOrderCard 
          theme={theme}
          order={orders?.length ? undefined : order}
          orders={orders?.length ? orders : undefined}
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
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 text-sm btn-primary-inset"
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
