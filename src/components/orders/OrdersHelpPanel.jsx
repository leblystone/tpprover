import React, { useState } from 'react';
import { HelpCircle, X, ShoppingCart, Package, Archive, FileText, Truck, CheckCircle } from 'lucide-react';

const OrdersHelpPanel = ({ theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          <HelpCircle size={16} />
          <span>How does order tracking work?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4" style={{ backgroundColor: theme.success + '10', borderColor: theme.success + '40' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} style={{ color: theme.success }} />
          <h3 className="font-semibold text-sm" style={{ color: theme.text }}>
            📦 How Order Tracking Works
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded hover:bg-white hover:bg-opacity-50"
          style={{ color: theme.textLight }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <ShoppingCart size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>1. Place Order</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Add peptides, set quantities, choose vendor, and track order status
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.info }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>2. Upload Documentation</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Add COAs, vendor photos, and tracking info before delivery
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Truck size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.warning }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>3. Track Delivery</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Monitor shipping status and receive notifications when delivered
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Archive size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>4. Auto-Transfer to Stockpile</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Delivered items automatically move to your stockpile with all documentation
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
        <div className="text-xs font-medium mb-2" style={{ color: theme.text }}>
          💡 Order Categories:
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Domestic (US)',
            'International',
            'Group Buy',
            'Pre-delivery docs',
            'Delivery tracking',
            'Auto stockpile sync'
          ].map((feature, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full bg-white border"
              style={{ borderColor: theme.border, color: theme.textLight }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersHelpPanel;

