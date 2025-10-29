import React from 'react';
import { Calculator, Package, Users, FlaskConical } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ModernTooltip from '../../ui/ModernTooltip';

const QuickActionsWidget = ({ widget, theme }) => {
  const actions = [
    {
      icon: Calculator,
      label: 'Reconstitute',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Package,
      label: 'Add Order',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Users,
      label: 'Add Vendor',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: FlaskConical,
      label: 'Add Protocol',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openProtocol'));
      }
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Quick Actions
          </h3>
          <Zap size={18} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-2">
        <div className="grid grid-cols-2 gap-2 h-full">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center p-3 rounded-lg transition-all hover:shadow-md min-h-[60px]"
              style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                color: theme.text
              }}
            >
              <action.icon className="w-8 h-8 mb-2" size={16} style={{ color: theme.primary }} />
              <span className="text-xs text-center font-medium" style={{ color: theme.text }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
