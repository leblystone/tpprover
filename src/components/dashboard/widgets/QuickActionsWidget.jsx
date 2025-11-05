import React, { useState } from 'react';
import { Calculator, Package, Users, FlaskConical } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ModernTooltip from '../../ui/ModernTooltip';

const QuickActionsWidget = ({ widget, theme }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pressedIndex, setPressedIndex] = useState(null);
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
      
      <div className="flex-1 p-1.5">
        <div className="flex flex-col h-full justify-evenly">
          {actions.map((action, index) => {
            const baseOpacities = ['1A', '2A', '3A', '4A'];
            const hoverOpacities = ['33', '44', '55', '66'];
            const activeOpacities = ['4F', '5F', '6F', '7F'];
            
            const isHovered = hoveredIndex === index;
            const isPressed = pressedIndex === index;
            
            let bgColor = `${theme.primary}${baseOpacities[index]}`;
            if (isPressed) {
              bgColor = `${theme.primary}${activeOpacities[index]}`;
            } else if (isHovered) {
              bgColor = `${theme.primary}${hoverOpacities[index]}`;
            }
            
            return (
            <button
              key={index}
              onClick={action.onClick}
              className="grid grid-cols-4 items-center px-3 py-1.5 rounded-lg transition-all duration-200 group w-full"
              style={{ 
                backgroundColor: bgColor,
                color: theme.text,
                transform: isHovered || isPressed ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered || isPressed ? `0 6px 16px ${theme.primary}20` : 'none'
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
              <div className="flex justify-start">
                <action.icon 
                  className="w-4 h-4 transition-transform duration-200" 
                  style={{ 
                    color: theme.text,
                    transform: isHovered || isPressed ? 'scale(1.15)' : 'scale(1)'
                  }} 
                />
              </div>
              <span className="col-span-2 text-center text-xs sm:text-sm font-semibold uppercase tracking-tight transition-opacity duration-200 whitespace-nowrap" style={{ color: theme.text, opacity: isHovered || isPressed ? 0.85 : 1 }}>
                {action.label}
              </span>
            </button>
          );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
