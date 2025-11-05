import React from 'react';
import { Calculator, Package, Users, FlaskConical, Plus } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ModernTooltip from '../../ui/ModernTooltip';
import { getButtonHoverHandlers } from '../../../utils/buttonHoverEffect';

const QuickActionsWidget = ({ widget, theme }) => {
  const actions = [
    {
      icon: Calculator,
      label: 'Reconstitute',
      color: theme.isDark ? '#0080a7' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Package,
      label: 'Add Order',
      color: theme.isDark ? '#c65368' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Users,
      label: 'Add Vendor',
      color: theme.isDark ? '#f07268' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: FlaskConical,
      label: 'Add Protocol',
      color: theme.isDark ? '#f07268' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openProtocol'));
      }
    }
  ];

  // Default to first action (Reconstitute) for center button, but could be made configurable
  const centerAction = actions[0];

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
      
      <div className="flex-1 p-4 sm:p-6 relative flex items-center justify-center">
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Action buttons arranged around center */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-[320px] sm:max-w-[360px]">
            {actions.map((action, index) => {
              const Icon = action.icon;
              // Only round the corner that faces the center button
              // Top-left (index 0): round bottom-right corner only (faces center)
              // Top-right (index 1): round bottom-left corner only (faces center)
              // Bottom-left (index 2): round top-right corner only (faces center)
              // Bottom-right (index 3): round top-left corner only (faces center)
              let roundedClass = '';
              if (index === 0) roundedClass = 'rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-[2.5rem]';
              if (index === 1) roundedClass = 'rounded-tl-lg rounded-tr-lg rounded-bl-[2.5rem] rounded-br-lg';
              if (index === 2) roundedClass = 'rounded-tl-lg rounded-tr-[2.5rem] rounded-bl-lg rounded-br-lg';
              if (index === 3) roundedClass = 'rounded-tl-[2.5rem] rounded-tr-lg rounded-bl-lg rounded-br-lg';
              
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`flex flex-col items-center justify-center p-4 sm:p-6 transition-all group action-button-hover aspect-square ${roundedClass}`}
                  style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    color: theme.text
                  }}
                  {...getButtonHoverHandlers(theme)}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 mb-1.5 sm:mb-2 icon-hover" style={{ color: action.color }} />
                  <span className="text-[9px] sm:text-[10px] text-center font-medium text-hover leading-tight" style={{ color: theme.text }}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Central floating action button - smaller and centered */}
          <button
            onClick={centerAction.onClick}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl transition-all duration-200 hover:scale-110 hover:shadow-2xl z-10 flex items-center justify-center"
            style={{ 
              backgroundColor: theme.primary,
              color: theme.textOnPrimary
            }}
          >
            <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
