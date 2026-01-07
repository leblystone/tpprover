import React, { useState, useMemo, useRef } from 'react';
import { CheckSquare, PenTool, Check, Beaker, Pill, Clock, MapPin, History, Pipette } from 'lucide-react';
import TasksList from '../TasksList';
import InjectionSiteSelector from '../../common/InjectionSiteSelector';
import InjectionHistoryModal from '../../common/InjectionHistoryModal';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';
import { getInjectionHistory } from '../../../utils/injectionTracking';
import { debugLog } from '../../../utils/debugMode';
import { isInjectionSiteTrackingEnabled } from '../../../utils/injectionSiteSettings';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const DeliveryIcon = ({ task, theme }) => {
  // Handle peptide delivery methods
  if (task.type === 'peptide') {
    if (task.deliveryMethod === 'pen') {
      return <PenTool size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'syringe' || task.deliveryMethod === 'pipette') {
      return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'nasal') {
      return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
  }
  
  // Handle supplement delivery methods
  if (task.type === 'supplement') {
    const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
    if (delivery === 'injection' || delivery === 'syringe') {
      return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (delivery === 'powder') {
      return <Beaker size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
    }
    if (delivery === 'pill' || delivery === 'oral') {
      return <Pill size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
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
  const clickTimers = useRef({});
  
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
              Today's Research
              <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center">
          <p className="text-xs sm:text-sm text-center px-2" style={{ color: theme.textLight }}>
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold truncate" style={{ color: theme.text }}>
            Today's Research
          </h3>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            <CheckSquare size={16} className="sm:w-5 sm:h-5" style={{ color: theme.primary }} />
          </div>
        </div>
      </div>
        
        <div className="flex-1 p-2 sm:p-4 overflow-hidden overflow-y-auto pr-1 sm:pr-2">
          <div className="space-y-1.5 sm:space-y-2 overflow-hidden">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg min-w-0" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <div className={`font-semibold text-xs sm:text-sm truncate ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`} style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                        {task.name}
                      </div>
                      {/* Time chip - moved to right of peptide name */}
                      <div 
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs text-white whitespace-nowrap flex-shrink-0"
                        style={{ 
                          backgroundColor: task.completed ? '#9ca3af' : `${theme.primary}40`,
                          opacity: task.completed ? 0.6 : 0.8
                        }}
                      >
                        {task.time}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`}>
                  <div className="text-right">
                    <div className="font-semibold text-xs sm:text-sm whitespace-nowrap" style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                      {task.dose} {task.unit}
                    </div>
                  </div>
                  {task.deliveryMethod === 'pen' && (
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-gray-300 shadow-sm flex-shrink-0" 
                        style={{ 
                          background: task.completed ? '#d1d5db' : getChromeGradient(getResolvedPenColor(task.penColor)),
                          opacity: task.completed ? 0.5 : 1
                        }}
                        title={`Pen Color: ${task.penColor || 'Default'}`}
                      />
                      {task.penType && (
                        <span className="text-[10px] sm:text-xs font-medium hidden xs:inline" style={{ color: task.completed ? '#9ca3af' : theme.textLight }}>
                          {task.penType.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-shrink-0" style={{ opacity: task.completed ? 0.5 : 1 }}>
                    <DeliveryIcon task={task} theme={theme} />
                  </div>
                  
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent blur events on mobile
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Prevent rapid-fire clicks (debounce)
                      const taskKey = task.id || task.stableTaskId;
                      const lastClick = clickTimers.current[taskKey];
                      const now = Date.now();
                      
                      if (lastClick && (now - lastClick) < 300) {
                        return; // Ignore clicks within 300ms
                      }
                      clickTimers.current[taskKey] = now;
                      
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
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 cursor-pointer touch-manipulation`}
                    style={{
                      borderColor: task.completed ? theme.primary : theme.border,
                      backgroundColor: task.completed ? theme.primary : 'transparent',
                      borderRadius: '4px',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                    title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.completed && (
                      <Check size={10} className="sm:w-3 sm:h-3 text-white" style={{ strokeWidth: 3 }} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Research Site History Button */}
          {hasInjectionTasks && (
            <div className="mt-2 sm:mt-3 flex justify-end">
              <button
                onClick={() => setShowInjectionHistory(true)}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md transition-colors hover:opacity-80"
                style={{ 
                  backgroundColor: theme.secondary,
                  color: theme.textLight
                }}
                title="View site history"
              >
                <History size={10} className="sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">View History</span>
                <span className="xs:hidden">History</span>
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
            {widget.title}
            <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-2 sm:p-4 overflow-hidden overflow-y-auto pr-1 sm:pr-2">
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
          <div className="mt-2 sm:mt-3 flex justify-end">
            <button
              onClick={() => setShowInjectionHistory(true)}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-md action-button-hover"
              style={{ 
                backgroundColor: theme.secondary,
                color: theme.textLight
              }}
              title="View site history"
            >
              <History size={10} className="sm:w-3 sm:h-3 icon-hover" />
              <span className="hidden xs:inline text-hover">View History</span>
              <span className="xs:hidden text-hover">History</span>
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
