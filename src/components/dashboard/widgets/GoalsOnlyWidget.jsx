import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Flag, Check, Plus, X, FloppyDisk, Archive, Trash, ClockCounterClockwise, PencilSimple, CaretDown } from '@phosphor-icons/react';
import ModernTooltip from '../../ui/ModernTooltip';
import GlassmorphismDatePicker from '../../common/GlassmorphismDatePicker';
import { generateId } from '../../../utils/string';
import { prepareItemForSave } from '../../../utils/userDataSave';
import { recordDeletion } from '../../../utils/deletionTracking';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const getSmartDateLabel = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return { label: `Overdue ${overdue}d`, status: 'overdue' };
  }
  if (diffDays === 0) return { label: 'Due today', status: 'today' };
  if (diffDays === 1) return { label: 'Due tomorrow', status: 'soon' };
  if (diffDays <= 3) return { label: `Due in ${diffDays}d`, status: 'soon' };
  if (diffDays > 14) return { label: `Due in ${Math.round(diffDays / 7)}w`, status: 'onTrack' };
  return { label: `Due in ${diffDays}d`, status: 'onTrack' };
};

const getDateColor = (status, isDark) => {
  switch (status) {
    case 'overdue': return isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a';
    case 'today':
    case 'soon': return isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706';
    case 'onTrack':
    default: return undefined;
  }
};

const GoalsOnlyWidget = ({ 
  widget, 
  theme, 
  goals: goalsFromProps,
  onGoalToggle,
  onAddGoal,
  onEditGoal
}) => {
  const { maxItems = 4 } = widget.settings;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', targetDate: '' });
  const [goals, setGoals] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [archivedGoals, setArchivedGoals] = useState([]);
  
  const usePropsGoals = goalsFromProps != null;
  const goalsToShow = usePropsGoals ? goalsFromProps : goals;
  const activeGoalsRaw = (goalsToShow || []).filter(g => !g.archived);
  const activeCount = activeGoalsRaw.filter(g => !g.completed).length;

  const displayGoals = useMemo(() => {
    const sorted = [...activeGoalsRaw].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      if (!a.completed && !b.completed) {
        const aDate = a.targetDate || a.dueDate;
        const bDate = b.targetDate || b.dueDate;
        if (aDate && bDate) return new Date(aDate) - new Date(bDate);
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;
      }
      return 0;
    });
    return sorted.slice(0, maxItems);
  }, [activeGoalsRaw, maxItems]);
  
  // Load goals from localStorage on mount and when cloud data arrives
  useEffect(() => {
    if (!usePropsGoals) loadGoals();
    const reload = () => { if (!usePropsGoals) loadGoals(); };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    window.addEventListener('tpp:user-goals-updated', reload);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', reload);
      window.removeEventListener('tpp:user-goals-updated', reload);
    };
  }, [usePropsGoals]);

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
      const archived = allGoals.filter(g => g.archived);
      const combinedGoals = [...updatedGoals, ...archived];
      
      localStorage.setItem('tpprover_user_goals', JSON.stringify(combinedGoals));
      setGoals(updatedGoals);
      window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: combinedGoals } }));
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;
    
    const goal = prepareItemForSave(
      {
        title: newGoal.title.trim(),
        targetDate: newGoal.targetDate || null,
        completed: false,
        createdAt: new Date().toISOString()
      },
      { isNew: true }
    );
    
    const updatedGoals = [goal, ...goals];
    saveGoals(updatedGoals);
    setNewGoal({ title: '', targetDate: '' });
    setShowAddForm(false);
  };

  const handleToggleGoal = (goalId) => {
    if (usePropsGoals && onGoalToggle) {
      onGoalToggle(goalId);
      return;
    }
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? prepareItemForSave({ ...goal, completed: !goal.completed }) : goal
    );
    saveGoals(updatedGoals);
  };

  const handleArchiveGoal = (goalId) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? prepareItemForSave({ ...goal, archived: true, archivedAt: new Date().toISOString() }) : goal
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
      const goalToDelete = allGoals.find(goal => goal.id === goalId);
      
      // Record deletion with item snapshot for restore functionality
      if (goalToDelete) {
        recordDeletion('goals', goalId, goalToDelete);
      } else {
        recordDeletion('goals', goalId);
      }
      
      const filteredGoals = allGoals.filter(goal => goal.id !== goalId);
      localStorage.setItem('tpprover_user_goals', JSON.stringify(filteredGoals));
      window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: filteredGoals } }));
      
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
      window.dispatchEvent(new CustomEvent('tpp:user-goals-updated', { detail: { goals: updatedGoals } }));
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
      <div className={`px-4 py-3 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Goals
            <Flag size={20} weight="duotone" style={{ color: theme.primary }} />
            {activeCount > 0 && (
              <span 
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ 
                  color: theme.isDark ? 'rgba(160, 180, 153, 0.85)' : theme.primary,
                  backgroundColor: theme.isDark ? 'rgba(160, 180, 153, 0.1)' : theme.primary + '12'
                }}
              >
                {activeCount} active
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.goals_only} theme={theme} />
            <ModernTooltip text="Add" position="top">
              <button
                onClick={() => (onAddGoal ? onAddGoal() : setShowAddForm(true))}
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
      
      <div className="flex-1 p-2 sm:p-4 min-h-0 overflow-hidden flex flex-col">
        {showAddForm && !onAddGoal ? (
          /* Inline Add Form (when not using dashboard modal) */
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
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed btn-primary-inset"
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
              <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
                <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                  No goals set yet
                </p>
                <button
                  type="button"
                  onClick={() => (onAddGoal ? onAddGoal() : setShowAddForm(true))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    color: theme.primary,
                    backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                    border: `1px solid ${theme.primary}40`
                  }}
                >
                  Add a Goal
                  <CaretDown size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <>
                {/* Goals List */}
                <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0">
                  {displayGoals.map((goal, index) => (
                    <div
                      key={goal.id}
                      className="group flex items-center gap-2 py-2.5 px-3 transition-all duration-200 relative"
                      style={{
                        backgroundColor: 'transparent',
                        borderLeft: `3px solid ${goal.completed 
                          ? (theme.isDark ? 'rgba(255,255,255,0.08)' : theme.primary + '25') 
                          : (theme.isDark ? 'rgba(255,255,255,0.12)' : theme.primary + '40')}`,
                        boxShadow: index < displayGoals.length - 1
                          ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}`
                          : 'none'
                      }}
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
                            goal.completed ? 'line-through opacity-50' : ''
                          }`}
                          style={{ color: goal.completed ? theme.textLight : theme.text }}
                        >
                          {goal.title || goal.text}
                        </p>
                        {goal.completed ? (
                          <p className="text-xs truncate" style={{ color: theme.textLight, opacity: 0.5 }}>
                            Done
                          </p>
                        ) : (() => {
                          const dateInfo = getSmartDateLabel(goal.targetDate || goal.dueDate);
                          if (!dateInfo) return null;
                          const color = getDateColor(dateInfo.status, theme.isDark) || theme.textLight;
                          return (
                            <p 
                              className="text-xs truncate"
                              style={{ 
                                color,
                                fontWeight: dateInfo.status === 'today' || dateInfo.status === 'overdue' ? 600 : 400
                              }}
                            >
                              {dateInfo.label}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* View/Edit Link */}
                <div className="pt-2 border-t flex-shrink-0 flex justify-center" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.border }}>
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
                    <PencilSimple size={12} weight="bold" />
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
                  <PencilSimple size={20} weight="bold" style={{ color: theme.textOnPrimary }} />
                </div>
                <div>
                  <h3 className="text-lg lg:text-base font-bold" style={{ color: theme.textOnPrimary }}>
                    View/Edit Goals
                  </h3>
                  <p className="text-sm opacity-90" style={{ color: theme.textOnPrimary }}>
                    {(usePropsGoals ? (goalsFromProps || []).filter(g => !g.archived) : goals).length} active, {(usePropsGoals ? (goalsFromProps || []).filter(g => g.archived) : archivedGoals).length} archived
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
              {((usePropsGoals ? (goalsFromProps || []).filter(g => !g.archived) : goals)).length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
                    Active Goals
                  </h4>
                  <div className="space-y-2">
                    {(usePropsGoals ? (goalsFromProps || []).filter(g => !g.archived) : goals).map((goal) => (
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
                                goal.completed ? 'line-through opacity-50' : ''
                              }`}
                              style={{ color: goal.completed ? theme.textLight : theme.text }}
                            >
                              {goal.title || goal.text}
                            </p>
                            {goal.completed ? (
                              <p className="text-xs truncate mt-1" style={{ color: theme.textLight, opacity: 0.5 }}>
                                Done
                              </p>
                            ) : (() => {
                              const dateInfo = getSmartDateLabel(goal.targetDate || goal.dueDate);
                              if (!dateInfo) return null;
                              const color = getDateColor(dateInfo.status, theme.isDark) || theme.textLight;
                              return (
                                <p 
                                  className="text-xs truncate mt-1"
                                  style={{ 
                                    color,
                                    fontWeight: dateInfo.status === 'today' || dateInfo.status === 'overdue' ? 600 : 400
                                  }}
                                >
                                  {dateInfo.label}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {onEditGoal && (
                            <button
                              onClick={() => { onEditGoal(goal); setShowHistory(false); }}
                              className="p-1.5 rounded transition-all hover:opacity-80"
                              style={{ 
                                backgroundColor: theme.primary + '20',
                                color: theme.primary
                              }}
                              title="Edit"
                            >
                              <PencilSimple size={14} weight="bold" />
                            </button>
                          )}
                          {!usePropsGoals && (
                            <>
                              <button
                                onClick={() => handleArchiveGoal(goal.id)}
                                className="p-1.5 rounded transition-all hover:opacity-80"
                                style={{ 
                                  backgroundColor: theme.primary + '20',
                                  color: theme.primary
                                }}
                                title="Archive"
                              >
                                <Archive size={14} weight="bold" />
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
                                <Trash size={14} weight="bold" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Archived Goals (local storage only) */}
              {(!usePropsGoals && archivedGoals.length > 0) ? (
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
                            {goal.title || goal.text}
                          </p>
                          {(goal.targetDate || goal.dueDate) && (
                            <p className="text-xs opacity-60 truncate mt-1" style={{ color: theme.textLight }}>
                              Due: {new Date((goal.targetDate || goal.dueDate)).toLocaleDateString()}
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
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center gap-1 btn-primary-inset"
                            style={{ 
                              backgroundColor: theme.primary,
                              color: theme.textOnPrimary
                            }}
                          >
                            <Archive size={12} weight="bold" />
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
                            <Trash size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Empty State */}
              {((usePropsGoals ? (goalsFromProps || []).filter(g => !g.archived) : goals).length === 0 && (!usePropsGoals ? archivedGoals : []).length === 0) ? (
                <div className="text-center py-8">
                  <PencilSimple size={48} weight="duotone" className="mx-auto mb-4 opacity-30" style={{ color: theme.textLight }} />
                  <h4 className="text-base lg:text-sm font-semibold mb-2" style={{ color: theme.text }}>
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
              <h3 className="text-base lg:text-sm font-bold mb-2" style={{ color: theme.text }}>
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