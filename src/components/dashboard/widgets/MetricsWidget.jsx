import React from 'react';
import { Plus, Edit, Bed, Zap, Smile, ShieldAlert } from 'lucide-react';
import { formatMMDDYYYY } from '../../../utils/date';

const MetricsWidget = ({ 
  widget, 
  theme, 
  metrics = [], 
  onAddMetric,
  onEditMetric
}) => {
  const { maxItems = 3 } = widget.settings;
  const recentMetrics = metrics.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Body Metrics
          </h3>
          <button
            onClick={onAddMetric}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            title="Add Entry"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        {recentMetrics.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
              No metrics recorded yet.
            </p>
            <button
              onClick={onAddMetric}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={16} className="inline mr-2" />
              Record First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMetrics.map(metric => (
              <div 
                key={metric.id} 
                className="p-4 rounded-lg border" 
                style={{ borderColor: theme.border, backgroundColor: theme.secondary }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-sm">
                    {formatMMDDYYYY(new Date(metric.date))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-semibold" 
                      style={{ backgroundColor: theme.infoBg, color: theme.info }}
                    >
                      {metric.weight || '-'} lbs
                    </span>
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-semibold" 
                      style={{ backgroundColor: theme.successBg, color: theme.success }}
                    >
                      {metric.bodyfat || '-'}%
                    </span>
                    <button 
                      onClick={() => onEditMetric?.(metric)}
                      className="p-1 rounded hover:opacity-80"
                    >
                      <Edit size={12} />
                    </button>
                  </div>
                </div>
                
                <div 
                  className="flex items-center justify-between text-xs border-t pt-2" 
                  style={{ borderColor: theme.border, color: theme.textLight }}
                >
                  <span className="flex items-center gap-1">
                    <Bed size={12}/> {metric.sleep || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={12}/> {metric.energy || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Smile size={12}/> {metric.mood || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldAlert size={12}/> {metric.pain || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsWidget;
