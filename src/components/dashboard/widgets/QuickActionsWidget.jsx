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
      icon: Plus,
      subIcon: Calculator,
      label: 'Add Peptide',
      color: theme.isDark ? '#0ea5e9' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Plus,
      subIcon: Package,
      label: 'Add Order',
      color: theme.isDark ? '#f43f5e' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Plus,
      subIcon: Users,
      label: 'Add Vendor',
      color: theme.isDark ? '#f59e0b' : theme.primary,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: Plus,
      subIcon: FlaskConical,
      label: 'Add Protocol',
      color: theme.isDark ? '#10b981' : theme.primary,
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
            
            return (
              <button
                key={index}
                onClick={action.onClick}
                className="relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group border"
                style={{ 
                  backgroundColor: theme.isDark ? (isHovered ? `${action.color}15` : 'transparent') : (isHovered ? `${action.color}08` : 'transparent'),
                  borderColor: isHovered ? `${action.color}40` : (theme.isDark ? `${theme.text}10` : `${theme.primary}15`),
                  transform: isPressed ? 'scale(0.98)' : 'none',
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
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 shrink-0"
                  style={{ 
                    backgroundColor: isHovered ? action.color : `${action.color}15`,
                    color: isHovered ? '#fff' : action.color
                  }}
                >
                  <action.subIcon size={16} />
                </div>
                
                <div className="flex flex-col items-start overflow-hidden">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-tight leading-none mb-0.5 whitespace-nowrap"
                    style={{ color: theme.text }}
                  >
                    {action.label}
                  </span>
                  <span 
                    className="text-[8px] opacity-40 font-medium uppercase"
                    style={{ color: theme.text }}
                  >
                    Create New
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
