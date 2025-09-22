import React from 'react';
import { Check, Plus, Target, Edit, Bed, Zap, Smile, ShieldAlert } from 'lucide-react';
import { formatMMDDYYYY } from '../../../utils/date';

const GoalsWidget = ({ 
  widget, 
  theme, 
  goals = [], 
  metrics = [], 
  onGoalToggle,
  onAddGoal,
  onAddMetric,
  onEditGoal,
  onEditMetric
}) => {
  const { showMetrics = true, showGoals = true, maxItems = 5 } = widget.settings;
  
  const displayGoals = showGoals ? goals.slice(0, maxItems) : [];
  const recentMetrics = showMetrics ? metrics.slice(0, 3) : [];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          {widget.title}
        </h3>
      </div>

      {showGoals && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>
              Goals
            </h4>
            <button
              onClick={onAddGoal}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              style={{ color: theme.primary }}
            >
              <Plus size={16} />
            </button>
          </div>
          
          {displayGoals.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: theme.textLight }}>
              No goals set. Click + to add one.
            </p>
          ) : (
            <div className="space-y-2">
              {displayGoals.map(goal => (
                <div key={goal.id} className="flex items-start gap-2">
                  <button 
                    onClick={() => onGoalToggle?.(goal.id)}
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      borderColor: goal.completed ? theme.success : theme.border, 
                      backgroundColor: goal.completed ? theme.success : 'transparent'
                    }}
                  >
                    {goal.completed && <Check size={10} className="text-white" />}
                  </button>
                  
                  <div className={goal.completed ? 'line-through' : ''} 
                       style={{ color: goal.completed ? theme.textLight : theme.text }}>
                    <div className="font-medium text-xs">{goal.text}</div>
                    {goal.dueDate && !goal.completed && (
                      <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                        Due: {formatMMDDYYYY(new Date(goal.dueDate))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onEditGoal?.(goal)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors ml-auto"
                    style={{ color: theme.textLight }}
                  >
                    <Edit size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showMetrics && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>
              Recent Metrics
            </h4>
            <button
              onClick={onAddMetric}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              style={{ color: theme.primary }}
            >
              <Plus size={16} />
            </button>
          </div>
          
          {recentMetrics.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: theme.textLight }}>
              No metrics recorded. Click + to add.
            </p>
          ) : (
            <div className="space-y-2">
              {recentMetrics.map(metric => (
                <div 
                  key={metric.id} 
                  className="p-3 rounded border" 
                  style={{ borderColor: theme.border, backgroundColor: theme.secondary }}
                >
                  <div className="flex items-center justify-between mb-2">
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
      )}
    </div>
  );
};

export default GoalsWidget;
