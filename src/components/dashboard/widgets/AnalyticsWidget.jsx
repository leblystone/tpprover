import React from 'react';
import AnalyticsDashboard from '../../analytics/AnalyticsDashboard';

const AnalyticsWidget = ({ widget, theme }) => {
  return (
    <div className="p-6 h-full">
      <AnalyticsDashboard theme={theme} />
    </div>
  );
};

export default AnalyticsWidget;
