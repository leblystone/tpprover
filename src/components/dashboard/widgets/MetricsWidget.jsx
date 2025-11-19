import React, { useState } from 'react';
import { Plus, Edit, Bed, Smile, ShieldAlert, Activity, Weight, Percent, TrendingUp, Calendar, BarChart3, Eye, Lock } from 'lucide-react';
import { Zap } from '../../../icons/lucide-safe';
import ModernTooltip from '../../ui/ModernTooltip';
import Modal from '../../common/Modal';
import { formatMMDDYYYY } from '../../../utils/date';

// Comprehensive chart component for all metrics visualization
const ComprehensiveMetricsChart = ({ metrics, theme }) => {
  // Generate last 7 days from today
  const generateLast7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const last7Days = generateLast7Days();
  const dayLabels = last7Days.map(date => 
    date.toLocaleDateString('en-US', { weekday: 'short' })
  );

  // Map metrics to the last 7 days, filling in missing days with null
  const chartData = last7Days.map(date => {
    // Use local date string for comparison to avoid timezone issues
    const dateStr = date.getFullYear() + '-' + 
                   String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(date.getDate()).padStart(2, '0');
    
    const metric = metrics.find(m => {
      // Handle multiple date formats more robustly
      let metricDate;
      
      if (!m.date) return false;
      
      if (typeof m.date === 'string') {
        // Handle ISO strings, date strings, or other formats
        if (m.date.includes('T')) {
          metricDate = m.date.split('T')[0]; // ISO format
        } else if (m.date.includes('-')) {
          metricDate = m.date; // Already in YYYY-MM-DD format
        } else {
          // Try to parse as date
          const parsed = new Date(m.date);
          if (!isNaN(parsed)) {
            metricDate = parsed.getFullYear() + '-' + 
                        String(parsed.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(parsed.getDate()).padStart(2, '0');
          }
        }
      } else {
        // Handle Date objects
        const d = new Date(m.date);
        if (!isNaN(d)) {
          metricDate = d.getFullYear() + '-' + 
                      String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(d.getDate()).padStart(2, '0');
        }
      }
      
      return metricDate === dateStr;
    });
    
    return {
      date: date,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      weight: metric?.weight ? parseFloat(metric.weight) || null : null,
      bodyfat: metric?.bodyfat ? parseFloat(metric.bodyfat) || null : null,
      sleep: metric?.sleep ? (typeof metric.sleep === 'number' ? metric.sleep : parseInt(metric.sleep)) || null : null,
      energy: metric?.energy ? (typeof metric.energy === 'number' ? metric.energy : parseInt(metric.energy)) || null : null,
      mood: metric?.mood ? (typeof metric.mood === 'number' ? metric.mood : parseInt(metric.mood)) || null : null,
      pain: metric?.pain ? (6 - (typeof metric.pain === 'number' ? metric.pain : parseInt(metric.pain))) : null // Invert pain so higher is better
    };
  });

  // Check if we have any data points (excluding date and dayLabel)
  const hasData = chartData.some(d => {
    const { date, dayLabel, ...values } = d;
    return Object.values(values).some(v => v !== null && (typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)))));
  });

  if (!hasData) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BarChart3 size={12} style={{ color: theme.primary }} />
            <span className="text-xs font-semibold" style={{ color: theme.text }}>
              Health Trends
            </span>
          </div>
        </div>
        <div className="p-2 rounded border text-center" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <TrendingUp size={18} className="mx-auto mb-1 opacity-50" style={{ color: theme.textLight }} />
          <p className="text-[10px]" style={{ color: theme.textLight }}>
            No data for the last 7 days
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
            Add more entries to see trends
          </p>
        </div>
      </div>
    );
  }

  // Normalize different metrics to 0-100 scale for comparison
  const normalizeValue = (value, type) => {
    switch (type) {
      case 'weight':
        // Assume weight range 100-300 lbs, normalize to 0-100
        return value ? Math.max(0, Math.min(100, ((value - 100) / 200) * 100)) : null;
      case 'bodyfat':
        // Assume body fat 0-50%, normalize to 0-100
        return value ? Math.max(0, Math.min(100, (value / 50) * 100)) : null;
      case 'sleep':
      case 'energy':
      case 'mood':
      case 'pain':
        // These are 1-5 scale, normalize to 0-100
        return value ? ((value - 1) / 4) * 100 : null;
      default:
        return null;
    }
  };

  const chartHeight = 70; // Reduced chart height for compactness
  const chartWidth = 200;
  const labelHeight = 18; // Reduced space for day labels

  // Define distinct botanical colors from the design palette
  const metricColors = {
    weight: '#8B4513', // rich brown (like the vial labels)
    bodyfat: '#D2691E', // warm orange/coral (like the flowers)
    sleep: '#4682B4', // soft blue-teal (like the leaves)
    energy: '#DAA520', // golden yellow (like the botanical accents)
    mood: '#CD5C5C', // dusty rose (like the pink flowers)
    pain: '#708090' // sage gray (like the muted botanicals)
  };

  const metricLabels = {
    weight: 'Weight',
    bodyfat: 'Body Fat',
    sleep: 'Sleep',
    energy: 'Energy',
    mood: 'Mood',
    pain: 'Pain'
  };

  // Calculate available metrics after metricColors is defined
  const availableMetrics = Object.keys(metricColors).filter(metric =>
    chartData.some(d => d[metric] != null)
  );


  return (
    <div className="space-y-2">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <BarChart3 size={10} style={{ color: theme.primary }} />
          <span className="text-[10px] font-semibold" style={{ color: theme.text }}>
            Health Trends
          </span>
        </div>
        <span className="text-[10px]" style={{ color: theme.textLight }}>
          7 days
        </span>
      </div>

      {/* Chart */}
      <div className="p-1.5 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <svg width="100%" height={chartHeight + labelHeight} viewBox={`0 0 ${chartWidth} ${chartHeight + labelHeight}`}>
          {/* Grid lines */}
          {[0, 0.5, 1].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke={theme.border}
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}

          {/* Data lines for each metric */}
          {availableMetrics.map(metric => {
            const metricData = chartData.map((d, i) => ({
              x: (i / (chartData.length - 1)) * chartWidth,
              y: d[metric] != null ? chartHeight - (normalizeValue(d[metric], metric) / 100) * chartHeight : null,
              value: d[metric]
            }));

            // Only draw if we have at least one data point
            const validData = metricData.filter(d => d.y !== null);
            if (validData.length < 1) return null;

            return (
              <g key={metric}>
                {/* Line - only if we have 2+ points */}
                {validData.length >= 2 && (
                  <polyline
                    fill="none"
                    stroke={metricColors[metric]}
                    strokeWidth="2"
                    opacity="0.8"
                    points={validData.map(d => `${d.x},${d.y}`).join(' ')}
                  />
                )}

                {/* Data points */}
                {validData.map((d, i) => (
                  <circle
                    key={i}
                    cx={d.x}
                    cy={d.y}
                    r="2"
                    fill={metricColors[metric]}
                    stroke={theme.white}
                    strokeWidth="1"
                  />
                ))}
              </g>
            );
          })}

          {/* Day labels at bottom */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight + 14}
                textAnchor="middle"
                fontSize="8"
                fill={theme.textLight}
                fontWeight="500"
              >
                {d.dayLabel}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Compact Legend */}
      <div className="grid grid-cols-2 gap-0.5 text-[10px] mt-1">
        {availableMetrics.slice(0, 6).map(metric => (
          <div key={metric} className="flex items-center gap-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: metricColors[metric] }}
            />
            <span className="truncate" style={{ color: theme.text }}>{metricLabels[metric]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// All Entries Modal Component
const AllEntriesModal = ({ open, onClose, metrics, theme, onEditMetric, onReopen }) => {
  const sortedMetrics = [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Modal open={open} onClose={onClose} title="All Bio-Metric Entries" theme={theme} maxWidth="max-w-4xl">
      <div className="p-4 max-h-96 overflow-y-auto">
        {sortedMetrics.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No entries recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMetrics.map((metric, index) => (
              <div 
                key={metric.id || index} 
                className="p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer"
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                onClick={() => {
                  onEditMetric?.(metric, onReopen);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} style={{ color: theme.primary }} />
                    <span className="font-semibold" style={{ color: theme.text }}>
                      {formatMMDDYYYY(new Date(metric.date))}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMetric?.(metric, onReopen);
                      onClose();
                    }}
                    className="p-1 rounded transition-all" 
                    style={{ color: theme.textLight }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Edit entry"
                  >
                    <Edit size={14} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded" style={{ backgroundColor: theme.primary + '10' }}>
                    <Weight size={16} className="mx-auto mb-1" style={{ color: theme.primary }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Weight</div>
                    <div className="font-bold text-sm" style={{ color: theme.text }}>
                      {metric.weight ? `${metric.weight} lbs` : '-'}
                    </div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ backgroundColor: theme.success + '10' }}>
                    <Percent size={16} className="mx-auto mb-1" style={{ color: theme.success }} />
                    <div className="text-xs font-medium" style={{ color: theme.textLight }}>Body Fat</div>
                    <div className="font-bold text-sm" style={{ color: theme.text }}>
                      {metric.bodyfat ? `${metric.bodyfat}%` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

const MetricsWidget = ({ 
  widget, 
  theme, 
  metrics = [], 
  onAddMetric,
  onEditMetric,
  isReadOnly = false,
  onUpgrade
}) => {
  const [showAllEntries, setShowAllEntries] = useState(false);
  
  // Sort metrics by date (most recent first)
  const sortedMetrics = [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentMetrics = sortedMetrics.slice(0, 1); // Show only the most recent

  return (
    <div className="relative h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
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
      
      <div className="flex-1 p-2 overflow-hidden min-h-0">
        {recentMetrics.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Activity size={24} className="mx-auto mb-2 opacity-50" style={{ color: theme.textLight }} />
              <p className="text-xs mb-3" style={{ color: theme.textLight }}>
                No metrics recorded yet
              </p>
              <button
                onClick={onAddMetric}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Plus size={12} />
                Record First Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Main Content - Two Column Layout */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {/* Left Side - Comprehensive Chart */}
              <div className="flex flex-col min-h-0">
                <ComprehensiveMetricsChart metrics={sortedMetrics} theme={theme} />
              </div>
              
              {/* Right Side - Most Recent Entry */}
              <div className="space-y-1.5 min-h-0 flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold" style={{ color: theme.text }}>Latest</h4>
                  <button 
                    onClick={() => setShowAllEntries(true)}
                    className="px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 text-[10px]"
                    style={{ color: theme.textLight }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Eye size={10} />
                    All
                  </button>
                </div>
                
                {/* Most Recent Entry Card */}
                <div className="p-2 rounded flex-1 min-h-0 flex flex-col" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground }}>
                  {/* Date */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <Calendar size={8} style={{ color: theme.primary }} />
                    <span className="font-semibold text-[10px]" style={{ color: theme.text }}>
                      {formatMMDDYYYY(new Date(recentMetrics[0].date))}
                    </span>
                  </div>
                  
                  {/* Physical Measurements */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="text-center p-1.5 rounded" style={{ backgroundColor: theme.primary + '10' }}>
                      <Weight size={12} className="mx-auto mb-0.5" style={{ color: theme.primary }} />
                      <div className="text-[10px] font-medium" style={{ color: theme.textLight }}>Weight</div>
                      <div className="font-bold text-xs" style={{ color: theme.text }}>
                        {recentMetrics[0].weight ? `${recentMetrics[0].weight} lbs` : '-'}
                      </div>
                    </div>
                    <div className="text-center p-1.5 rounded" style={{ backgroundColor: theme.success + '10' }}>
                      <Percent size={12} className="mx-auto mb-0.5" style={{ color: theme.success }} />
                      <div className="text-[10px] font-medium" style={{ color: theme.textLight }}>Body Fat</div>
                      <div className="font-bold text-xs" style={{ color: theme.text }}>
                        {recentMetrics[0].bodyfat ? `${recentMetrics[0].bodyfat}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All Entries Modal */}
      <AllEntriesModal 
        open={showAllEntries}
        onClose={() => setShowAllEntries(false)}
        metrics={metrics}
        theme={theme}
        onEditMetric={onEditMetric}
        onReopen={() => setShowAllEntries(true)}
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
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 text-sm"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsWidget;