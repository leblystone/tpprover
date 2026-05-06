import React from 'react';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

const CompactMetricWidget = ({ 
  widget, 
  theme, 
  title,
  value,
  unit = '',
  trend = null, // 'up', 'down', or null
  color = null
}) => {
  const displayColor = color || theme.primary;
  
  return (
    <div className="h-full flex flex-col justify-center items-center p-4 text-center">
      <div className="text-xs font-medium mb-2" style={{ color: theme.textLight }}>
        {title}
      </div>
      
      <div className="flex items-center gap-2">
        <div 
          className="text-xl lg:text-lg font-bold" 
          style={{ color: displayColor }}
        >
          {value}
        </div>
        {unit && (
          <div className="text-sm" style={{ color: theme.textLight }}>
            {unit}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-2">
          {trend === 'up' ? (
            <TrendUp size={17} weight="duotone" className="text-green-500" />
          ) : (
            <TrendDown size={17} weight="duotone" className="text-red-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default CompactMetricWidget;
