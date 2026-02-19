import React from 'react';
import AnalyticsDashboard from '../../analytics/AnalyticsDashboard';

const AnalyticsWidget = ({ widget, theme }) => {
  const defaultTab = widget?.settings?.defaultTab || 'compliance';
  return (
    <div className="p-6 h-full">
      <AnalyticsDashboard
        theme={theme}
        defaultTab={defaultTab}
        showFullScreenLink
      />
    </div>
  );
};

export default AnalyticsWidget;
