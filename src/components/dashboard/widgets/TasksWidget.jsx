import React from 'react';
import TasksList from '../TasksList';

const TasksWidget = ({ widget, theme, tasks, onToggle }) => {
  const { showCompleted, groupByTime } = widget.settings;
  
  // Filter tasks based on settings
  let filteredTasks = tasks || [];
  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }

  // If no tasks, show compact empty state
  if (filteredTasks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Today's Research
          </h3>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-sm text-center" style={{ color: theme.textLight }}>
            No research scheduled for today
          </p>
        </div>
      </div>
    );
  }

  // If few tasks, show compact layout
  if (filteredTasks.length <= 3) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Today's Research
          </h3>
        </div>
        
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded" style={{ backgroundColor: theme.secondary }}>
                <button
                  onClick={() => onToggle(task.id)}
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: task.completed ? theme.primary : theme.border,
                    backgroundColor: task.completed ? theme.primary : 'transparent'
                  }}
                >
                  {task.completed && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
                
                <div className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : ''}`}>
                  <span className="font-medium">{task.name}</span>
                  <span className="ml-2 text-xs" style={{ color: theme.textLight }}>
                    {task.dose} {task.unit}
                  </span>
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
    <div className="h-full flex flex-col">
      <div className="p-6 border-b" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          {widget.title}
        </h3>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
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
