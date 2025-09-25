import React from 'react';
import { Plus, Edit, Bed, Zap, Smile, ShieldAlert, Activity, Weight, Percent, TrendingUp, Calendar } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';
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
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Bio-Metrics
          </h3>
          <div className="flex items-center gap-2">
            <Activity size={20} style={{ color: theme.primary }} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={onAddMetric}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ borderColor: theme.primary, color: theme.primary }}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </ModernTooltip>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        {recentMetrics.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Activity size={32} className="mx-auto mb-3 opacity-50" style={{ color: theme.textLight }} />
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                No metrics recorded yet
              </p>
              <button
                onClick={onAddMetric}
                className="px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Plus size={16} className="inline mr-2" />
                Record First Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMetrics.map(metric => (
              <div 
                key={metric.id} 
                className="group p-3 rounded-lg border hover:shadow-md transition-all duration-200" 
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              >
                {/* Header with Date and Edit Button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} style={{ color: theme.primary }} />
                    <span className="font-semibold text-sm" style={{ color: theme.text }}>
                      {formatMMDDYYYY(new Date(metric.date))}
                    </span>
                  </div>
                  <button 
                    onClick={() => onEditMetric?.(metric)}
                    className="p-1.5 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: theme.textLight }}
                    title="Edit metrics"
                  >
                    <Edit size={14} />
                  </button>
                </div>

                {/* Key Metrics - Weight and Body Fat */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: theme.primary + '10' }}>
                    <Weight size={16} style={{ color: theme.primary }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: theme.textLight }}>Weight</div>
                      <div className="font-bold text-sm" style={{ color: theme.text }}>
                        {metric.weight ? `${metric.weight} lbs` : 'Not recorded'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: theme.success + '10' }}>
                    <Percent size={16} style={{ color: theme.success }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: theme.textLight }}>Body Fat</div>
                      <div className="font-bold text-sm" style={{ color: theme.text }}>
                        {metric.bodyfat ? `${metric.bodyfat}%` : 'Not recorded'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Wellness Metrics */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <div className="text-center">
                    <Bed size={12} className="mx-auto mb-1" style={{ color: theme.textLight }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Sleep</div>
                    <div className="text-xs font-semibold" style={{ color: theme.text }}>
                      {metric.sleep || '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <Zap size={12} className="mx-auto mb-1" style={{ color: theme.warning }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Energy</div>
                    <div className="text-xs font-semibold" style={{ color: theme.text }}>
                      {metric.energy || '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <Smile size={12} className="mx-auto mb-1" style={{ color: theme.success }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Mood</div>
                    <div className="text-xs font-semibold" style={{ color: theme.text }}>
                      {metric.mood || '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <ShieldAlert size={12} className="mx-auto mb-1" style={{ color: theme.error }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Pain</div>
                    <div className="text-xs font-semibold" style={{ color: theme.text }}>
                      {metric.pain || '-'}
                    </div>
                  </div>
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
