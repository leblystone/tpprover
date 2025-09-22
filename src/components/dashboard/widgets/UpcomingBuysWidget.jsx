import React from 'react';
import UpcomingBuys from '../UpcomingBuys';

const UpcomingBuysWidget = ({ widget, theme, buys, onAdd }) => {
  const { maxItems = 3 } = widget.settings;
  
  // Limit items based on settings
  const limitedBuys = buys ? buys.slice(0, maxItems) : [];

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
