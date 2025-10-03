import React from 'react';
import { CheckSquare, Syringe, PenTool, Droplet, Check, Beaker, Pill } from 'lucide-react';
import TasksList from '../TasksList';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';

const DeliveryIcon = ({ task, theme }) => {
  // Handle peptide delivery methods
  if (task.type === 'peptide') {
    if (task.deliveryMethod === 'pen') {
      return <PenTool size={14} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'syringe') {
      return <Syringe size={14} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'nasal') {
      return <Droplet size={14} style={{ color: theme.textLight }} />;
    }
  }
  
  // Handle supplement delivery methods
  if (task.type === 'supplement') {
    const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
    if (delivery === 'injection') {
      return <Syringe size={14} style={{ color: theme.textLight }} />;
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
  console.log('🎯 TasksWidget received:', { 
    tasksCount: tasks?.length || 0, 
    tasks: tasks?.slice(0, 3).map(t => ({ 
      name: t.name, 
      type: t.type, 
      deliveryMethod: t.deliveryMethod, 
      penColor: t.penColor,
      dose: t.dose,
      unit: t.unit
    })) || []
  });
  
  const { showCompleted, groupByTime } = widget.settings;
  
  // Filter tasks based on settings
  let filteredTasks = tasks || [];
  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }
  
  console.log('🎯 TasksWidget filtered:', { 
    filteredCount: filteredTasks.length,
    showCompleted,
    willUseCompactLayout: filteredTasks.length <= 3
  });

  // If no tasks, show compact empty state
  if (filteredTasks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
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
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Today's Research
            </h3>
            <CheckSquare size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden">
          <div className="space-y-2 overflow-hidden">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => onToggle(task)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                    style={{
                      borderColor: task.completed ? theme.primary : theme.border,
                      backgroundColor: task.completed ? theme.primary : 'transparent'
                    }}
                  >
                    {task.completed && <Check size={12} className="text-white" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`} style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                      {task.name}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default full layout for many tasks
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            {widget.title}
          </h3>
          <CheckSquare size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden">
        <TasksList 
          tasks={filteredTasks} 
          theme={theme} 
          onToggle={onToggle}
          groupByTime={groupByTime}
        />
      </div>
    </div>
  );
};

export default TasksWidget;
