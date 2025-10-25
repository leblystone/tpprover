import React, { useState, useMemo } from 'react';
import { CheckSquare, PenTool, Check, Beaker, Pill, Clock, MapPin, History, Pipette } from 'lucide-react';
import TasksList from '../TasksList';
import InjectionSiteSelector from '../../common/InjectionSiteSelector';
import InjectionHistoryModal from '../../common/InjectionHistoryModal';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';
import { getInjectionHistory } from '../../../utils/injectionTracking';
import { debugLog } from '../../../utils/debugMode';

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
  const raw = String(penColor).trim();
  const isHex = raw.startsWith('#');
  if (isHex) return raw;
  
  // Find color by name in penColors array
  const foundColor = penColors.find(color => 
    color.name.toLowerCase() === raw.toLowerCase()
  );
  
  console.log('🎨 TasksWidget Pen color resolution:', {
    input: penColor,
    raw: raw,
    foundColor: foundColor,
    result: foundColor ? foundColor.hex : '#9ca3af'
  });
  
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
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
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
        <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Today's Research
            </h3>
            <CheckSquare size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden overflow-y-auto pr-2">
          <div className="space-y-2 overflow-hidden">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold text-sm ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`} style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                        {task.name}
                      </div>
                      {/* Time chip - moved to right of peptide name */}
                      <div 
                        className="px-2 py-1 rounded-md text-xs text-white"
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
                
                <div className={`text-right flex items-center gap-2 ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`}>
                  <div className="text-right">
                    <div className="font-semibold text-sm" style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                      {task.dose} {task.unit}
                    </div>
                  </div>
                  {task.deliveryMethod === 'pen' && (
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300 shadow-sm flex-shrink-0" 
                        style={{ 
                          background: task.completed ? '#d1d5db' : getChromeGradient(getResolvedPenColor(task.penColor)),
                          opacity: task.completed ? 0.5 : 1
                        }}
                        title={`Pen Color: ${task.penColor || 'Default'}`}
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
                      console.log('🔍 TasksWidget button click - full task object:', task);
                      console.log('🔍 TasksWidget button click - task type:', typeof task);
                      console.log('🔍 TasksWidget button click - onToggle function:', typeof onToggle);
                      
                      // Check if this is an injection task that's not completed
                      const deliveryMethod = task.deliveryMethod || task.delivery;
                      const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                      
                      console.log('🔍 TasksWidget click debug:', {
                        taskName: task.name,
                        deliveryMethod,
                        isInjection,
                        completed: task.completed
                      });
                      
                      if (isInjection && !task.completed) {
                        console.log('💉 TasksWidget showing injection selector for:', task.name);
                        setInjectionTask(task);
                      } else {
                        console.log('🔄 TasksWidget calling onToggle with task:', task);
                        onToggle(task);
                      }
                    }}
                    className={`w-6 h-6 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer`}
                    style={{
                      borderColor: task.completed ? theme.primary : theme.border,
                      backgroundColor: task.completed ? theme.primary : 'transparent',
                      borderRadius: '4px',
                      minWidth: '24px',
                      minHeight: '24px'
                    }}
                    title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.completed && (
                      <Check 
                        size={16} 
                        className="text-white" 
                        style={{ 
                          strokeWidth: 3
                        }}
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
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
            onToggle(injectionTask);
            setInjectionTask(null);
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
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
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
          />
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
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            onToggle(injectionTask);
            setInjectionTask(null);
          }}
          onCancel={() => {
            debugLog('💉 TasksWidget injection cancelled', null, 'tasks');
            setInjectionTask(null);
          }}
          theme={theme}
          isVisible={!!injectionTask}
        />
      </div>
    </div>
  );
};

export default TasksWidget;
