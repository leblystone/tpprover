import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import UpcomingBuys from '../UpcomingBuys';

const UpcomingBuysWidget = ({ widget, theme, buys, onAdd, isReadOnly = false, onUpgrade }) => {
  const { maxItems = 3 } = widget.settings;
  
  // Limit items based on settings
  const limitedBuys = buys ? buys.slice(0, maxItems) : [];

  // If no buys, show compact version
  if (!limitedBuys || limitedBuys.length === 0) {
    return (
      <div className="relative h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Upcoming Buys
            </h3>
            <Calendar size={20} style={{ color: theme.primary }} />
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
