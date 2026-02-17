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
      <div className="mb-6 px-4">
        <div className="flex justify-center">
          <div className="flex items-center gap-2 max-w-sm w-full">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-full border-2 text-xs font-medium transition-all hover:shadow-md hover:scale-105 flex-1 min-w-0"
              style={{ 
                borderColor: theme.primary + '40', 
                color: theme.primary,
                backgroundColor: theme.primary + '08'
              }}
            >
              <HelpCircle size={16} className="flex-shrink-0" />
              <span className="truncate">What can this section do?</span>
              <ChevronDown size={14} className="flex-shrink-0" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ color: theme.textLight }}
              title="Dismiss permanently"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-full max-w-4xl rounded-xl p-4 md:p-6 shadow-lg glass-panel-minimal" style={{ borderColor: theme.primary + '20' }}>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
              <Package size={20} className="md:w-6 md:h-6" style={{ color: theme.primary }} />
            </div>
            <h3 className="text-base md:text-lg font-bold" style={{ color: theme.text }}>
              Order Section Features
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Collapse"
            >
              <ChevronDown size={18} className="md:w-5 md:h-5 rotate-180" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Dismiss permanently"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-start gap-3 p-2 md:p-3 rounded-lg" style={{ backgroundColor: theme.primary + '05' }}>
              <div className="flex-shrink-0 p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
                <ShoppingCart size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-base font-semibold mb-0.5 md:mb-1" style={{ color: theme.text }}>Order Creation</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Add peptides, set quantities, choose vendor, and track order status
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 md:p-3 rounded-lg" style={{ backgroundColor: theme.info + '05' }}>
              <div className="flex-shrink-0 p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.info + '15' }}>
                <FileText size={16} className="md:w-5 md:h-5" style={{ color: theme.info }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-base font-semibold mb-0.5 md:mb-1" style={{ color: theme.text }}>Document Management</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Add COAs, vendor photos, and tracking info before delivery
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-4">
            <div className="flex items-start gap-3 p-2 md:p-3 rounded-lg" style={{ backgroundColor: theme.warning + '05' }}>
              <div className="flex-shrink-0 p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.warning + '15' }}>
                <Truck size={16} className="md:w-5 md:h-5" style={{ color: theme.warning }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-base font-semibold mb-0.5 md:mb-1" style={{ color: theme.text }}>Delivery Tracking</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Monitor shipping status and receive notifications when delivered
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2 md:p-3 rounded-lg" style={{ backgroundColor: theme.success + '05' }}>
              <div className="flex-shrink-0 p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.success + '15' }}>
                <Archive size={16} className="md:w-5 md:h-5" style={{ color: theme.success }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-base font-semibold mb-0.5 md:mb-1" style={{ color: theme.text }}>Auto-Transfer to Stockpile</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Delivered items automatically move to the stockpile with all documentation
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t" style={{ borderColor: theme.primary + '20' }}>
          <h4 className="text-sm md:text-base font-semibold mb-3" style={{ color: theme.text }}>
            Order Categories & Features
          </h4>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {[
              { label: 'Domestic (US)', color: 'blue' },
              { label: 'International', color: 'green' },
              { label: 'Group Buy', color: 'purple' },
              { label: 'Pre-delivery docs', color: 'orange' },
              { label: 'Delivery tracking', color: 'pink' },
              { label: 'Auto stockpile sync', color: 'teal' }
            ].map((item, index) => {
              const getFeatureColor = (color) => {
                const colors = {
                  blue: 'bg-blue-100 text-blue-800',
                  green: 'bg-green-100 text-green-800',
                  purple: 'bg-purple-100 text-purple-800',
                  orange: 'bg-orange-100 text-orange-800',
                  pink: 'bg-pink-100 text-pink-800',
                  teal: 'bg-teal-100 text-teal-800'
                };
                return colors[color] || 'bg-gray-100 text-gray-800';
              };
              
              return (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getFeatureColor(item.color)}`}
                >
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersHelpPanel;

