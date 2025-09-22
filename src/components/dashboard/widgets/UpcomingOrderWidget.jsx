import React from 'react';
import UpcomingOrderCard from '../UpcomingOrderCard';

const UpcomingOrderWidget = ({ widget, theme, order, onNewOrder }) => {
  return (
    <div className="h-full">
      <UpcomingOrderCard 
        theme={theme}
        order={order}
        onNewOrder={onNewOrder}
      />
    </div>
  );
};

export default UpcomingOrderWidget;
