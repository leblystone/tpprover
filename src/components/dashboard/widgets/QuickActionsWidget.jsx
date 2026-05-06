import React, { useState } from 'react';
import { Lightning, Calculator, Package, Users, Flask, Plus } from '@phosphor-icons/react';
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
      buttonBg: '#6B7F77',
      description: 'New Recon',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openRecon'));
      }
    },
    {
      icon: Package,
      label: 'New\nOrder',
      color: theme.isDark ? '#f43f5e' : theme.primary,
      buttonBg: '#566D64',
      description: 'New Entry',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openOrder'));
      }
    },
    {
      icon: Users,
      label: 'New Vendor',
      color: theme.isDark ? '#f59e0b' : theme.primary,
      buttonBg: '#445952',
      description: 'New Source',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openVendor'));
      }
    },
    {
      icon: Flask,
      label: 'New Protocol',
      color: theme.isDark ? '#10b981' : theme.primary,
      buttonBg: '#3B4240',
      description: 'New Research',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('tpp:openProtocol'));
      }
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`px-4 py-1.5 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Shortcuts
            <Lightning size={20} weight="duotone" style={{ color: theme.primary }} className="opacity-80" />
          </h3>
          <ExpandableTooltip content={WIDGET_TOOLTIPS.quick_actions} theme={theme} />
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-1 py-0">
        <div className="flex items-start justify-around w-full">
          {actions.map((action, index) => {
            const isHovered = hoveredIndex === index;
            const isPressed = pressedIndex === index;

            // Frosted glass (reference style): semi-transparent white, strong blur, clear outline, soft floating shadow
            const glassBg = theme.isDark
              ? (isHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)')
              : (isHovered ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.62)');
            const glassBorder = theme.isDark
              ? (isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)')
              : (isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.08)');
            const glassShadow = theme.isDark
              ? (isHovered ? '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)')
              : (isHovered ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)' : '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)');

            return (
              <button
                key={index}
                type="button"
                onClick={action.onClick}
                className="flex flex-col items-center gap-1 cursor-pointer group"
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
                  className="rounded-full flex items-center justify-center transition-all duration-200 w-[72px] h-[72px] lg:w-14 lg:h-14"
                  style={{
                    color: 'white',
                    backgroundColor: action.buttonBg,
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.10)'
                  }}
                >
                  <action.icon
                    strokeWidth={2}
                    className={`w-8 h-8 lg:w-6 lg:h-6 transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}
                  />
                </div>
                <span
                  className="text-[13px] lg:text-xs font-semibold text-center leading-tight transition-colors duration-200 block break-words w-[72px] lg:w-14 min-h-[2.5em] mx-auto"
                  style={{
                    color: isHovered ? action.color : theme.text,
                    opacity: isHovered ? 1 : 0.75,
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
