import React, { useState, useEffect } from 'react';
import { Check, Plus, Target, X, Save } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';

const GoalsOnlyWidget = ({ 
  widget, 
  theme, 
  onGoalToggle
}) => {
  const { maxItems = 4 } = widget.settings;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', targetDate: '' });
  const [goals, setGoals] = useState([]);
  
  // Load goals from localStorage on mount
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    try {
      const savedGoals = localStorage.getItem('tpprover_user_goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const saveGoals = (updatedGoals) => {
    try {
      localStorage.setItem('tpprover_user_goals', JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };
  
  const displayGoals = goals.slice(0, maxItems);
  const completedCount = displayGoals.filter(goal => goal.completed).length;

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;
    
    const goal = {
      id: Date.now().toString(),
      title: newGoal.title.trim(),
      targetDate: newGoal.targetDate || null,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedGoals = [goal, ...goals];
    saveGoals(updatedGoals);
    setNewGoal({ title: '', targetDate: '' });
    setShowAddForm(false);
  };

  const handleToggleGoal = (goalId) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
    saveGoals(updatedGoals);
  };

  const handleCancel = () => {
    setNewGoal({ title: '', targetDate: '' });
    setShowAddForm(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Goals
          </h3>
          <Target size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4 min-h-0">
        {showAddForm ? (
          /* Inline Add Form */
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter your goal..."
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text
              }}
              autoFocus
            />
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.title.trim()}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Save size={14} />
                Save Goal
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: theme.secondary, color: theme.text }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Goals List */
          <div className="h-full flex flex-col">
            {displayGoals.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Target size={32} className="mb-3 opacity-50" style={{ color: theme.textLight }} />
                <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                  No goals set yet
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  <Plus size={14} className="inline mr-1" />
                  Add First Goal
                </button>
              </div>
            ) : (
              <>
                {/* Progress Summary */}
                <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: theme.text }}>
                      Progress
                    </span>
                    <span className="text-sm font-bold" style={{ color: theme.primary }}>
                      {completedCount}/{displayGoals.length}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: theme.primary,
                        width: `${displayGoals.length > 0 ? (completedCount / displayGoals.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Goals List */}
                <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
                  {displayGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="group flex items-center gap-2 p-2 rounded-lg transition-all hover:opacity-90"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGoal(goal.id);
                        }}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          goal.completed 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {goal.completed && (
                          <Check size={10} className="text-white" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p 
                          className={`text-xs font-medium truncate ${
                            goal.completed ? 'line-through opacity-60' : ''
                          }`}
                          style={{ color: theme.text }}
                        >
                          {goal.title}
                        </p>
                        {goal.targetDate && (
                          <p className="text-xs opacity-60 truncate" style={{ color: theme.textLight }}>
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Goal Button */}
                <div className="pt-2 border-t flex-shrink-0" style={{ borderColor: theme.border }}>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-1.5 px-2 rounded-lg border-2 border-dashed transition-all hover:opacity-80 flex items-center justify-center gap-1"
                    style={{ borderColor: theme.border, color: theme.textLight }}
                  >
                    <Plus size={12} />
                    <span className="text-xs">Add Goal</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsOnlyWidget;