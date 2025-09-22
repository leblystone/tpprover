import React from 'react';
import TasksList from '../TasksList';

const TasksWidget = ({ widget, theme, tasks, onToggle }) => {
  const { showCompleted, groupByTime } = widget.settings;
  
  // Filter tasks based on settings
  let filteredTasks = tasks || [];
  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }

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
