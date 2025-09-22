import React from 'react';
import UpcomingBuys from '../UpcomingBuys';

const UpcomingBuysWidget = ({ widget, theme, buys, onAdd }) => {
  const { maxItems = 3 } = widget.settings;
  
  // Limit items based on settings
  const limitedBuys = buys ? buys.slice(0, maxItems) : [];

  // If no buys, show compact version
  if (!limitedBuys || limitedBuys.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Upcoming Buys
          </h3>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-sm mb-4 text-center" style={{ color: theme.textLight }}>
            No planned purchases
          </p>
          <button
            onClick={onAdd}
            className="px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Schedule Buy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <UpcomingBuys 
        buys={limitedBuys} 
        theme={theme} 
        onAdd={onAdd}
      />
    </div>
  );
};

export default UpcomingBuysWidget;
