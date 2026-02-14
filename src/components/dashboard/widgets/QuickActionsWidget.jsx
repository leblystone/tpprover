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
      label: 'Peptide Calculator',
      color: theme.isDark ? '#0ea5e9' : theme.primary,
      description: 'New Recon',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Package,
      label: 'New\nOrder',
      color: theme.isDark ? '#f43f5e' : theme.primary,
      description: 'New Entry',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Users,
      label: 'New Vendor',
      color: theme.isDark ? '#f59e0b' : theme.primary,
      description: 'New Source',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: FlaskConical,
      label: 'New Protocol',
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
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Shortcuts
            <Zap size={18} style={{ color: theme.primary }} className="opacity-80" />
          </h3>
          <ExpandableTooltip content={WIDGET_TOOLTIPS.quick_actions} theme={theme} />
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-3 py-1">
        <div className="flex items-start justify-around w-full max-w-sm">
          {actions.map((action, index) => {
            const isHovered = hoveredIndex === index;
            const isPressed = pressedIndex === index;

            const circleBg = theme.isDark
              ? (isHovered ? `${action.color}35` : `${action.color}20`)
              : (isHovered ? `${action.color}25` : `${action.color}15`);

            return (
              <button
                key={index}
                type="button"
                onClick={action.onClick}
                className="flex flex-col items-center gap-2 cursor-pointer group"
                style={{
                  transform: isPressed ? 'scale(0.94)' : (isHovered ? 'translateY(-2px)' : 'none'),
                  transition: 'transform 0.22s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.15s ease',
                  opacity: isPressed ? 0.92 : 1
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
                  className="rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: circleBg,
                    border: `1.5px solid ${isHovered ? `${action.color}50` : `${action.color}30`}`,
                    boxShadow: isHovered
                      ? `0 6px 16px -4px ${action.color}40`
                      : (theme.isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.08)'),
                    color: action.color
                  }}
                >
                  <action.icon
                    size={26}
                    strokeWidth={2}
                    className={`transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}
                  />
                </div>
                <span
                  className="text-[13px] font-semibold text-center leading-tight transition-colors duration-200 block break-words"
                  style={{
                    color: isHovered ? action.color : theme.text,
                    opacity: isHovered ? 1 : 0.75,
                    width: 72,
                    minHeight: '2.5em',
                    margin: '0 auto',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line'
                  }}
                >
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
