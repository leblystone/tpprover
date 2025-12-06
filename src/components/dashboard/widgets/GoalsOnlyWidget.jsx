import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Target, X, Save, Archive, Trash2, History, Edit } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';
import GlassmorphismDatePicker from '../../common/GlassmorphismDatePicker';
import { generateId } from '../../../utils/string';

const GoalsOnlyWidget = ({ 
  widget, 
  theme, 
  onGoalToggle
}) => {
  const { maxItems = 4 } = widget.settings;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', targetDate: '' });
  const [goals, setGoals] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [archivedGoals, setArchivedGoals] = useState([]);
  
  // Load goals from localStorage on mount
  useEffect(() => {
    loadGoals();
  }, []);

  // Reload goals when modal opens to ensure fresh data
  useEffect(() => {
    if (showHistory) {
      loadGoals();
    }
  }, [showHistory]);

  const loadGoals = () => {
    try {
      const savedGoals = localStorage.getItem('tpprover_user_goals');
      if (savedGoals) {
        const allGoals = JSON.parse(savedGoals);
        // Filter out archived goals from display
        const activeGoals = allGoals.filter(goal => !goal.archived);
        const archived = allGoals.filter(goal => goal.archived);
        setGoals(activeGoals);
        setArchivedGoals(archived);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const saveGoals = (updatedGoals) => {
    try {
      // Load all goals (including archived) to preserve them
      const allGoalsStr = localStorage.getItem('tpprover_user_goals');
      let allGoals = allGoalsStr ? JSON.parse(allGoalsStr) : [];
      
      // Update active goals and merge with archived ones
      const archivedGoals = allGoals.filter(g => g.archived);
      const combinedGoals = [...updatedGoals, ...archivedGoals];
      
      localStorage.setItem('tpprover_user_goals', JSON.stringify(combinedGoals));
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
      id: generateId(),
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

  const handleArchiveGoal = (goalId) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId ? { ...goal, archived: true, archivedAt: new Date().toISOString() } : goal
    );
    saveGoals(updatedGoals);
    loadGoals(); // Reload to update archived list
    // Keep modal open so user can see the goal move to archived section
  };

  const handleDeleteGoal = (goalId) => {
    // Load all goals to remove from both active and archived
    try {
      const allGoalsStr = localStorage.getItem('tpprover_user_goals');
      let allGoals = allGoalsStr ? JSON.parse(allGoalsStr) : [];
      const filteredGoals = allGoals.filter(goal => goal.id !== goalId);
      localStorage.setItem('tpprover_user_goals', JSON.stringify(filteredGoals));
      
      // Update active goals display
      const activeGoals = goals.filter(goal => goal.id !== goalId);
      setGoals(activeGoals);
      setDeleteConfirmId(null);
      loadGoals(); // Reload to update archived list
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleRestoreGoal = (goalId) => {
    try {
      const allGoalsStr = localStorage.getItem('tpprover_user_goals');
      let allGoals = allGoalsStr ? JSON.parse(allGoalsStr) : [];
      const updatedGoals = allGoals.map(goal => 
        goal.id === goalId ? { ...goal, archived: false, archivedAt: undefined } : goal
      );
      localStorage.setItem('tpprover_user_goals', JSON.stringify(updatedGoals));
      loadGoals(); // Reload to update both active and archived lists
    } catch (error) {
      console.error('Failed to restore goal:', error);
    }
  };

  const handleCancel = () => {
    setNewGoal({ title: '', targetDate: '' });
    setShowAddForm(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Goals
          </h3>
          <div className="flex items-center gap-2">
            <Target size={20} style={{ color: theme.primary }} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={() => setShowAddForm(true)}
                className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                style={{ 
                  color: '#ffffff',
                  backgroundColor: theme.primary,
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  border: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Plus size={14} strokeWidth={3.5} style={{ color: '#ffffff' }} />
              </button>
            </ModernTooltip>
          </div>
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
            <GlassmorphismDatePicker
              value={newGoal.targetDate || ''}
              onChange={(dateString) => setNewGoal({ ...newGoal, targetDate: dateString })}
              theme={theme}
              placeholder="Goal Date"
              compact={true}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.title.trim()}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: theme.primary, 
                  color: theme.textOnPrimary || '#ffffff',
                  boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                }}
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
                <p className="text-sm" style={{ color: theme.textLight }}>
                  No goals set yet
                </p>
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
                      className="group flex items-center gap-2 p-2 rounded-lg transition-all hover:opacity-90 relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGoal(goal.id);
                        }}
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                        style={{
                          borderColor: goal.completed ? '#b5684a' : theme.border,
                          background: goal.completed ? 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!goal.completed) {
                            e.currentTarget.style.borderColor = '#b5684a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!goal.completed) {
                            e.currentTarget.style.borderColor = theme.border;
                          }
                        }}
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

                {/* View/Edit Link */}
                <div className="pt-2 border-t flex-shrink-0 flex justify-center" style={{ borderColor: theme.border }}>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="text-xs transition-all hover:opacity-80 flex items-center gap-1"
                    style={{ 
                      color: theme.textLight,
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.textLight;
                    }}
                  >
                    <Edit size={12} />
                    <span>View/Edit</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Goals View/Edit Modal */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />
          <div 
            className="relative w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.cardBackground }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ 
                borderColor: theme.border,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Edit size={20} style={{ color: theme.textOnPrimary }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: theme.textOnPrimary }}>
                    View/Edit Goals
                  </h3>
                  <p className="text-sm opacity-90" style={{ color: theme.textOnPrimary }}>
                    {goals.length} active, {archivedGoals.length} archived
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                style={{ color: theme.textOnPrimary }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Active Goals */}
              {goals.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
                    Active Goals
                  </h4>
                  <div className="space-y-2">
                    {goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg border flex items-center justify-between"
                        style={{ 
                          backgroundColor: theme.secondary,
                          borderColor: theme.border
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleGoal(goal.id)}
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                            style={{
                              borderColor: goal.completed ? '#b5684a' : theme.border,
                              background: goal.completed ? 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)' : 'transparent'
                            }}
                          >
                            {goal.completed && (
                              <Check size={10} className="text-white" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p 
                              className={`text-sm font-medium truncate ${
                                goal.completed ? 'line-through opacity-60' : ''
                              }`}
                              style={{ color: theme.text }}
                            >
                              {goal.title}
                            </p>
                            {goal.targetDate && (
                              <p className="text-xs opacity-60 truncate mt-1" style={{ color: theme.textLight }}>
                                Due: {new Date(goal.targetDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleArchiveGoal(goal.id)}
                            className="p-1.5 rounded transition-all hover:opacity-80"
                            style={{ 
                              backgroundColor: theme.primary + '20',
                              color: theme.primary
                            }}
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(goal.id)}
                            className="p-1.5 rounded transition-all hover:opacity-80"
                            style={{ 
                              backgroundColor: '#ef4444' + '20',
                              color: '#ef4444'
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Archived Goals */}
              {archivedGoals.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
                    Archived Goals
                  </h4>
                  <div className="space-y-2">
                    {archivedGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg border flex items-center justify-between"
                        style={{ 
                          backgroundColor: theme.secondary,
                          borderColor: theme.border,
                          opacity: 0.7
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p 
                            className={`text-sm font-medium truncate ${
                              goal.completed ? 'line-through opacity-60' : ''
                            }`}
                            style={{ color: theme.text }}
                          >
                            {goal.title}
                          </p>
                          {goal.targetDate && (
                            <p className="text-xs opacity-60 truncate mt-1" style={{ color: theme.textLight }}>
                              Due: {new Date(goal.targetDate).toLocaleDateString()}
                            </p>
                          )}
                          {goal.archivedAt && (
                            <p className="text-xs opacity-50 truncate mt-1" style={{ color: theme.textLight }}>
                              Archived: {new Date(goal.archivedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleRestoreGoal(goal.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center gap-1"
                            style={{ 
                              backgroundColor: theme.primary,
                              color: theme.textOnPrimary
                            }}
                          >
                            <Archive size={12} />
                            Restore
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(goal.id)}
                            className="p-1.5 rounded transition-all hover:opacity-80"
                            style={{ 
                              backgroundColor: '#ef4444' + '20',
                              color: '#ef4444'
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Empty State */}
              {goals.length === 0 && archivedGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Edit size={48} className="mx-auto mb-4 opacity-30" style={{ color: theme.textLight }} />
                  <h4 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                    No Goals
                  </h4>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    Create goals to get started.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div 
            className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.cardBackground }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
                Delete Goal?
              </h3>
              <p className="text-sm mb-6" style={{ color: theme.textLight }}>
                This action cannot be undone. Are you sure you want to delete this goal?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 border"
                  style={{ 
                    borderColor: theme.border,
                    color: theme.text
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteGoal(deleteConfirmId)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                  style={{ 
                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GoalsOnlyWidget;