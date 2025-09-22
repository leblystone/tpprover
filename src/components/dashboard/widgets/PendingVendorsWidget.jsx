import React from 'react';
import PendingVendorsView from '../PendingVendorsView';

const PendingVendorsWidget = ({ widget, theme, vendors, onViewAll, onComplete }) => {
  if (!vendors || vendors.length === 0) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-center" style={{ color: theme.textLight }}>
          No pending vendors to complete.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <PendingVendorsView 
        vendors={vendors} 
        theme={theme} 
        onViewAll={onViewAll}
        onComplete={onComplete}
      />
    </div>
  );
};

export default PendingVendorsWidget;
