import React, { useState } from 'react';
import { Calculator, Package, Users, FlaskConical, Plus } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const QuickActionsWidget = ({ widget, theme }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pressedIndex, setPressedIndex] = useState(null);

  const actions = [
    {
      icon: Calculator,
      label: 'Calculator',
      color: theme.isDark ? '#0ea5e9' : theme.primary,
      description: 'New Recon',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Package,
      label: 'Add Order',
      color: theme.isDark ? '#f43f5e' : theme.primary,
      description: 'New Entry',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Users,
      label: 'Add Vendor',
      color: theme.isDark ? '#f59e0b' : theme.primary,
      description: 'New Source',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: FlaskConical,
      label: 'Add Protocol',
      color: theme.isDark ? '#10b981' : theme.primary,
      description: 'New Research',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openProtocol'));
      }
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`px-4 py-2 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: theme.text }}>
            Quick Actions
            <Zap size={14} style={{ color: theme.primary }} className="opacity-80" />
          </h3>
          <ExpandableTooltip content={WIDGET_TOOLTIPS.quick_actions} theme={theme} />
        </div>
      </div>
      
      <div className="flex-1 p-2">
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
          {actions.map((action, index) => {
            const isHovered = hoveredIndex === index;
            const isPressed = pressedIndex === index;
            
            // Refined colors: visible but clean
            const bgColor = theme.isDark 
              ? (isHovered ? `${action.color}25` : `${action.color}10`)
              : (isHovered ? `${action.color}15` : `${action.color}08`);
            
            const borderColor = theme.isDark
              ? (isHovered ? `${action.color}50` : `${theme.text}08`)
              : (isHovered ? `${action.color}30` : `${action.color}15`);

            return (
              <button
                key={index}
                onClick={action.onClick}
                className="relative flex flex-col items-center justify-center rounded-2xl transition-all duration-300 group overflow-hidden border"
                style={{ 
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  transform: isHovered ? 'translateY(-2px)' : (isPressed ? 'scale(0.96)' : 'none'),
                  boxShadow: isHovered ? `0 8px 16px -4px ${action.color}20` : 'none'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setPressedIndex(null);
                }}
                onMouseDown={() => setPressedIndex(index)}
                onMouseUp={() => setPressedIndex(null)}
                onTouchStart={() => setPressedIndex(index)}
                onTouchEnd={() => setPressedIndex(null)}
              >
                {/* Decorative background icon - subtle and centered */}
                <div 
                  className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
                  style={{ color: action.color }}
                >
                  <action.icon size={56} strokeWidth={1} />
                </div>

                <div 
                  className="relative z-10 mb-1.5 p-1.5 rounded-xl transition-all duration-300"
                  style={{ 
                    backgroundColor: isHovered ? `${action.color}20` : 'transparent',
                    color: action.color
                  }}
                >
                  <action.icon 
                    size={20} 
                    className={`transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                    strokeWidth={2.5}
                  />
                </div>
                
                <div className="flex flex-col items-center z-10 relative">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-tight text-center leading-none mb-1 transition-colors duration-300"
                    style={{ 
                      color: isHovered ? action.color : theme.text,
                      opacity: isHovered ? 1 : 0.9
                    }}
                  >
                    {action.label}
                  </span>
                  <span 
                    className="text-[8px] opacity-50 font-medium uppercase tracking-tighter"
                    style={{ color: theme.text }}
                  >
                    {action.description}
                  </span>
                </div>

                {/* Subtle indicator line */}
                <div 
                  className="absolute bottom-0 inset-x-0 h-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ backgroundColor: action.color }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
