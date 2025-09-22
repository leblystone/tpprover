import React from 'react';
import { Check, Plus, Edit } from 'lucide-react';
import { formatMMDDYYYY } from '../../../utils/date';

const GoalsOnlyWidget = ({ 
  widget, 
  theme, 
  goals = [], 
  onGoalToggle,
  onAddGoal,
  onEditGoal
}) => {
  const { maxItems = 5 } = widget.settings;
  const displayGoals = goals.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Goals
          </h3>
          <button
            onClick={onAddGoal}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ borderColor: theme.primary, color: theme.primary }}
            title="Add Goal"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        {displayGoals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
              No goals set yet.
            </p>
            <button
              onClick={onAddGoal}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={16} className="inline mr-2" />
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayGoals.map(goal => (
              <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.secondary }}>
                <button 
                  onClick={() => onGoalToggle?.(goal.id)}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    borderColor: goal.completed ? theme.success : theme.border, 
                    backgroundColor: goal.completed ? theme.success : 'transparent'
                  }}
                >
                  {goal.completed && <Check size={12} className="text-white" />}
                </button>
                
                <div className={`flex-1 ${goal.completed ? 'line-through' : ''}`} 
                     style={{ color: goal.completed ? theme.textLight : theme.text }}>
                  <div className="font-medium text-sm">{goal.text}</div>
                  {goal.dueDate && !goal.completed && (
                    <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                      Due: {formatMMDDYYYY(new Date(goal.dueDate))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onEditGoal?.(goal)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: theme.textLight }}
                >
                  <Edit size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsOnlyWidget;
