import React, { useState, useMemo } from 'react';
import { CheckSquare, PenTool, Check, Beaker, Pill, Clock, MapPin, History, Pipette, Calendar } from 'lucide-react';
import TasksList from '../TasksList';
import InjectionSiteSelector from '../../common/InjectionSiteSelector';
import InjectionHistoryModal from '../../common/InjectionHistoryModal';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';
import { getInjectionHistory } from '../../../utils/injectionTracking';
import { debugLog } from '../../../utils/debugMode';
import { isInjectionSiteTrackingEnabled } from '../../../utils/injectionSiteSettings';

const DeliveryIcon = ({ task, theme }) => {
  // Handle peptide delivery methods
  if (task.type === 'peptide') {
    if (task.deliveryMethod === 'pen') {
      return <PenTool size={14} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'syringe' || task.deliveryMethod === 'pipette') {
      return <Pipette size={14} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'nasal') {
      return <Pipette size={14} style={{ color: theme.textLight }} />;
    }
  }
  
  // Handle supplement delivery methods
  if (task.type === 'supplement') {
    const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
    if (delivery === 'injection' || delivery === 'syringe') {
      return <Pipette size={14} style={{ color: theme.textLight }} />;
    }
    if (delivery === 'powder') {
      return <Beaker size={14} style={{ color: theme.textLight }} />;
    }
    if (delivery === 'pill' || delivery === 'oral') {
      return <Pill size={14} style={{ color: theme.textLight }} />;
    }
  }
  
  return null;
};

const getResolvedPenColor = (penColor) => {
  if (!penColor) return '#9ca3af';
  const raw = String(penColor || '').trim();
  // Type safety: ensure raw is a string before calling startsWith
  if (typeof raw !== 'string' || !raw) return '#9ca3af';
  const isHex = raw.startsWith('#');
  if (isHex) return raw;
  
  // Find color by name in penColors array
  const foundColor = penColors.find(color => 
    color.name.toLowerCase() === raw.toLowerCase()
  );
  
  
  return foundColor ? foundColor.hex : '#9ca3af';
};

const TasksWidget = ({ widget, theme, tasks, onToggle }) => {
  const [injectionTask, setInjectionTask] = useState(null);
  const [showInjectionHistory, setShowInjectionHistory] = useState(false);
  
  // Check if there are any injection tasks
  const hasInjectionTasks = useMemo(() => {
    if (!tasks) return false;
    return tasks.some(task => {
      const deliveryMethod = task.deliveryMethod || task.delivery;
      return deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    });
  }, [tasks]);
  
  debugLog('🎯 TasksWidget received:', { 
    tasksCount: tasks?.length || 0, 
    tasks: tasks?.slice(0, 3).map(t => ({ 
      name: t.name, 
      type: t.type, 
      deliveryMethod: t.deliveryMethod, 
      penColor: t.penColor,
      dose: t.dose,
      unit: t.unit
    })) || []
  }, 'tasks');
  
  
  const { showCompleted, groupByTime } = widget.settings;
  
  // Filter tasks based on settings
  let filteredTasks = tasks || [];
  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }
  
  debugLog('🎯 TasksWidget filtered:', { 
    filteredCount: filteredTasks.length,
    showCompleted,
    willUseCompactLayout: filteredTasks.length <= 3
  }, 'tasks');

  // If no tasks, show compact empty state
  if (filteredTasks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Today's Research
            </h3>
            <CheckSquare size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-sm text-center" style={{ color: theme.textLight }}>
            No research scheduled for today
          </p>
        </div>
      </div>
    );
  }

  // If few tasks, show compact layout with modernized display
  if (filteredTasks.length <= 3) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className={`px-4 py-3 flex-shrink-0 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Today's Research
            </h3>
            <CheckSquare size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden overflow-y-auto pr-2">
          <div className="space-y-3 overflow-hidden">
            {filteredTasks.map(task => {
              // Calculate progress if protocol data is available
              const protocol = task.protocol;
              let progressPercent = 0;
              let currentDay = 0;
              let totalDays = 0;
              let startDate = null;
              let endDate = null;
              
              if (protocol?.startDate) {
                startDate = new Date(protocol.startDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (protocol.endDate) {
                  endDate = new Date(protocol.endDate);
                } else if (protocol.duration && !protocol.duration.noEnd && protocol.duration.count > 0) {
                  endDate = new Date(startDate);
                  const unit = String(protocol.duration.unit).toLowerCase();
                  const count = Number(protocol.duration.count) || 0;
                  if (unit.includes('day')) endDate.setDate(endDate.getDate() + count - 1);
                  else if (unit.includes('week')) endDate.setDate(endDate.getDate() + (count * 7) - 1);
                  else if (unit.includes('month')) { endDate.setMonth(endDate.getMonth() + count); endDate.setDate(endDate.getDate() - 1); }
                }
                
                if (endDate) {
                  const total = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                  const current = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1);
                  totalDays = total;
                  currentDay = Math.min(current, total);
                  progressPercent = total > 0 ? Math.min(100, (currentDay / total) * 100) : 0;
                }
              }
              
              return (
                <div 
                  key={task.id} 
                  className="relative rounded-xl p-4 transition-all hover:shadow-lg"
                  style={{ 
                    backgroundColor: theme.cardBackground,
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : theme.border}`,
                    boxShadow: theme.isDark
                      ? `0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`
                      : `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)`
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Calendar icon on left */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center border"
                        style={{ 
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.border,
                          backgroundColor: theme.isDark ? '#1f2937' : theme.secondary
                        }}
                      >
                        <Calendar size={18} style={{ color: theme.primary }} />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h4 
                            className={`font-semibold text-sm truncate ${task.completed ? 'line-through decoration-2' : ''}`} 
                            style={{ color: task.completed ? '#9ca3af' : theme.text }}
                          >
                            {task.name}
                          </h4>
                          {task.emoji && <span className="text-base flex-shrink-0">{task.emoji}</span>}
                        </div>
                        <button
                          onClick={() => setShowInjectionHistory(true)}
                          className="flex-shrink-0 p-1 rounded hover:bg-opacity-20 transition-all"
                          style={{ color: theme.textLight }}
                          title="View history"
                        >
                          <History size={16} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="px-2 py-1 rounded-md text-xs font-medium"
                            style={{ 
                              backgroundColor: task.completed ? '#9ca3af' : `${theme.primary}20`,
                              color: task.completed ? '#ffffff' : theme.primary
                            }}
                          >
                            {task.time}
                          </div>
                          <div className="text-xs font-medium" style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                            {task.dose} {task.unit}
                          </div>
                        </div>
                        {task.deliveryMethod === 'pen' && (
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-3 h-3 rounded-full border border-gray-300 shadow-sm" 
                              style={{ 
                                background: task.completed ? '#d1d5db' : getChromeGradient(getResolvedPenColor(task.penColor)),
                                opacity: task.completed ? 0.5 : 1
                              }}
                            />
                            {task.penType && (
                              <span className="text-xs font-medium" style={{ color: task.completed ? '#9ca3af' : theme.textLight }}>
                                {task.penType.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ opacity: task.completed ? 0.5 : 1 }}>
                          <DeliveryIcon task={task} theme={theme} />
                        </div>
                        <button
                          onClick={() => {
                            // Prevent action if injection site selector is already showing
                            if (injectionTask) {
                              return;
                            }
                            
                            const deliveryMethod = task.deliveryMethod || task.delivery;
                            const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                            
                            // Only show injection site selector for incomplete injection tasks when tracking is enabled
                            if (isInjection && !task.completed && isInjectionSiteTrackingEnabled()) {
                              setInjectionTask(task);
                            } else {
                              // For completed tasks or non-injection tasks, toggle directly
                              onToggle(task);
                            }
                          }}
                          className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 cursor-pointer`}
                          style={{
                            borderColor: task.completed ? theme.primary : theme.border,
                            backgroundColor: task.completed ? theme.primary : 'transparent',
                            borderRadius: '4px'
                          }}
                        >
                          {task.completed && (
                            <Check size={12} className="text-white" style={{ strokeWidth: 3 }} />
                          )}
                        </button>
                      </div>
                      
                      {/* Progress bar - modern styled */}
                      {protocol && totalDays > 0 && (
                        <div className="relative w-full mt-3">
                          <div 
                            className="relative w-full h-6 rounded-lg overflow-hidden"
                            style={{ 
                              backgroundColor: theme.isDark ? '#374151' : '#e5e7eb',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            {/* Progress fill */}
                            <div 
                              className="absolute left-0 top-0 h-full rounded-lg transition-all duration-300"
                              style={{ 
                                width: `${progressPercent}%`,
                                background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                                boxShadow: `0 0 12px ${theme.primary}50`
                              }}
                            />
                            
                            {/* Labels overlay */}
                            <div className="absolute inset-0 flex items-center justify-between px-2.5 z-10">
                              <span 
                                className="text-[10px] font-semibold"
                                style={{ 
                                  color: theme.isDark ? '#9ca3af' : '#6b7280',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                              >
                                00/{String(totalDays).padStart(2, '0')}
                              </span>
                              <span 
                                className="text-[10px] font-semibold"
                                style={{ 
                                  color: theme.isDark ? '#9ca3af' : '#6b7280',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                              >
                                {String(currentDay).padStart(2, '0')}/{String(totalDays).padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Research Site History Button */}
          {hasInjectionTasks && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowInjectionHistory(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors hover:opacity-80"
                style={{ 
                  backgroundColor: theme.secondary,
                  color: theme.textLight
                }}
                title="View site history"
              >
                <History size={12} />
                <span>View History</span>
              </button>
            </div>
          )}
        </div>
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            // Close the selector first to prevent multiple clicks
            const taskToToggle = injectionTask;
            setInjectionTask(null);
            // Then toggle the task completion
            if (taskToToggle) {
              onToggle(taskToToggle);
            }
          }}
          onCancel={() => {
            debugLog('💉 TasksWidget injection cancelled', null, 'tasks');
            setInjectionTask(null);
          }}
          theme={theme}
          isVisible={!!injectionTask}
        />
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    );
  }

  // Default full layout for many tasks
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`px-4 py-3 flex-shrink-0 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            {widget.title}
          </h3>
          <CheckSquare size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden overflow-y-auto pr-2">
        <div>
          <TasksList 
            tasks={filteredTasks} 
            theme={theme} 
            onToggle={onToggle}
            groupByTime={groupByTime}
            setInjectionTask={setInjectionTask}
          />
        </div>
        
        {/* Research Site History Button */}
        {hasInjectionTasks && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowInjectionHistory(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md action-button-hover"
              style={{ 
                backgroundColor: theme.secondary,
                color: theme.textLight
              }}
              title="View site history"
            >
              <History size={12} className="icon-hover" />
              <span className="text-hover">View History</span>
            </button>
          </div>
        )}
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            // Close the selector first to prevent multiple clicks
            const taskToToggle = injectionTask;
            setInjectionTask(null);
            // Then toggle the task completion
            if (taskToToggle) {
              onToggle(taskToToggle);
            }
          }}
          onCancel={() => {
            debugLog('💉 TasksWidget injection cancelled', null, 'tasks');
            setInjectionTask(null);
          }}
          theme={theme}
          isVisible={!!injectionTask}
        />
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default TasksWidget;
