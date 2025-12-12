import React from 'react';
import { Calendar, Lock, Plus } from 'lucide-react';
import UpcomingBuys from '../UpcomingBuys';
import ModernTooltip from '../../ui/ModernTooltip';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const UpcomingBuysWidget = ({ widget, theme, buys, onAdd, isReadOnly = false, onUpgrade }) => {
  const { maxItems = 3 } = widget.settings;
  
  // Limit items based on settings
  const limitedBuys = buys ? buys.slice(0, maxItems) : [];

  // If no buys, show compact version
  if (!limitedBuys || limitedBuys.length === 0) {
    return (
      <div className="relative h-full flex flex-col">
        <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
              Upcoming Buys
              <Calendar size={20} style={{ color: theme.primary }} />
            </h3>
            <div className="flex items-center gap-2">
              <ExpandableTooltip content={WIDGET_TOOLTIPS.upcoming_buys} theme={theme} />
              <ModernTooltip text="Add" position="top">
                <button
                  onClick={onAdd}
                  className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                  style={{ 
                    color: '#ffffff',
                    backgroundColor: theme.primary,
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    border: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-sm mb-4 text-center" style={{ color: theme.textLight }}>
            No planned purchases
          </p>
          <button
            onClick={onAdd}
            className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <span className="text-hover">Schedule Buy</span>
          </button>
        </div>
        
        {/* Lockout Overlay */}
        {isReadOnly && (
          <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
                <Lock size={24} style={{ color: theme.primary }} />
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
                Trial has ended
              </p>
              <button
                onClick={() => {
                  if (onUpgrade) onUpgrade();
                  else window.location.href = '/app/account';
                }}
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <span className="text-hover">Upgrade</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <UpcomingBuys 
        buys={limitedBuys} 
        theme={theme} 
        onAdd={onAdd}
      />
      
      {/* Lockout Overlay */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <Lock size={24} style={{ color: theme.primary }} />
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </p>
              <button
                onClick={() => {
                  if (onUpgrade) onUpgrade();
                  else window.location.href = '/app/account';
                }}
                className="px-4 py-2 rounded-lg font-medium action-button-hover text-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <span className="text-hover">Upgrade</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingBuysWidget;
