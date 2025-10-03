import React, { useState } from 'react';
import { HelpCircle, X, ShoppingCart, Package, Archive, FileText, Truck, CheckCircle, ChevronDown } from 'lucide-react';

const OrdersHelpPanel = ({ theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('ordersHelpDismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('ordersHelpDismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all hover:shadow-md hover:scale-105"
            style={{ 
              borderColor: theme.primary + '40', 
              color: theme.primary,
              backgroundColor: theme.primary + '08'
            }}
          >
            <HelpCircle size={18} />
            <span>How does order tracking work?</span>
            <ChevronDown size={16} />
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: theme.textLight }}
            title="Dismiss permanently"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-full max-w-4xl rounded-xl border-2 p-6 shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.primary + '20' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
              <Package size={24} style={{ color: theme.primary }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: theme.text }}>
              How Order Tracking Works
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Collapse"
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Dismiss permanently"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.primary + '05' }}>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.primary + '15' }}>
                <ShoppingCart size={20} style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: theme.text }}>1. Place Order</div>
                <div className="text-sm" style={{ color: theme.textLight }}>
                  Add peptides, set quantities, choose vendor, and track order status
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.info + '05' }}>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.info + '15' }}>
                <FileText size={20} style={{ color: theme.info }} />
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: theme.text }}>2. Upload Documentation</div>
                <div className="text-sm" style={{ color: theme.textLight }}>
                  Add COAs, vendor photos, and tracking info before delivery
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.warning + '05' }}>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.warning + '15' }}>
                <Truck size={20} style={{ color: theme.warning }} />
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: theme.text }}>3. Track Delivery</div>
                <div className="text-sm" style={{ color: theme.textLight }}>
                  Monitor shipping status and receive notifications when delivered
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.success + '05' }}>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.success + '15' }}>
                <Archive size={20} style={{ color: theme.success }} />
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: theme.text }}>4. Auto-Transfer to Stockpile</div>
                <div className="text-sm" style={{ color: theme.textLight }}>
                  Delivered items automatically move to your stockpile with all documentation
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            <span className="text-lg">💡</span>
            Order Categories & Features
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Domestic (US)', color: theme.primary },
              { label: 'International', color: theme.info },
              { label: 'Group Buy', color: theme.accent },
              { label: 'Pre-delivery docs', color: theme.textLight },
              { label: 'Delivery tracking', color: theme.textLight },
              { label: 'Auto stockpile sync', color: theme.success }
            ].map((item, index) => (
              <span
                key={index}
                className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:shadow-md"
                style={{ 
                  borderColor: item.color + '40',
                  color: item.color,
                  backgroundColor: item.color + '10'
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersHelpPanel;

