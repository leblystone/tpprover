import React from 'react';
import Modal from '../common/Modal';
import TaskDisplay from './TaskDisplay';
import { formatMMDDYYYY } from '../../utils/date';

export default function MonthModal({ 
  open, 
  onClose, 
  date, 
  theme, 
  scheduled = {}, 
  onToggleSlot 
}) {
  const title = date ? `${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}` : 'Month View';

  // Get all tasks for the month
  const getAllTasksForMonth = () => {
    if (!date) return [];
    
    const tasks = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayScheduled = scheduled[dateKey];
      
      if (dayScheduled?.bySlot) {
        // AM tasks
        if (dayScheduled.bySlot.AM) {
          if (dayScheduled.bySlot.AM.peptides?.length > 0) {
            dayScheduled.bySlot.AM.peptides.forEach((p, i) => {
              const task = {
                name: typeof p === 'object' ? p.name : p,
                dose: typeof p === 'object' ? p.dose : '',
                unit: typeof p === 'object' ? p.unit : '',
                type: 'peptide',
                time: 'AM',
                delivery: typeof p === 'object' ? p.delivery : 'injection',
                deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                penColor: typeof p === 'object' ? p.penColor : undefined,
                penType: typeof p === 'object' ? p.penType : undefined
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'AM'
              });
            });
          }
          
          if (dayScheduled.bySlot.AM.supplements?.length > 0) {
            dayScheduled.bySlot.AM.supplements.forEach((s, i) => {
              const task = {
                name: typeof s === 'object' ? s.name : s,
                dose: typeof s === 'object' ? s.dose : '',
                unit: typeof s === 'object' ? s.unit : '',
                type: 'supplement',
                time: 'AM',
                delivery: typeof s === 'object' ? s.delivery : 'oral'
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'AM'
              });
            });
          }
        }
        
        // Legacy Morning tasks (mapped to AM)
        if (dayScheduled.bySlot.Morning) {
          if (dayScheduled.bySlot.Morning.peptides?.length > 0) {
            dayScheduled.bySlot.Morning.peptides.forEach((p, i) => {
              const task = {
                name: typeof p === 'object' ? p.name : p,
                dose: typeof p === 'object' ? p.dose : '',
                unit: typeof p === 'object' ? p.unit : '',
                type: 'peptide',
                time: 'AM',
                delivery: typeof p === 'object' ? p.delivery : 'injection',
                deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                penColor: typeof p === 'object' ? p.penColor : undefined,
                penType: typeof p === 'object' ? p.penType : undefined
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'AM'
              });
            });
          }
          
          if (dayScheduled.bySlot.Morning.supplements?.length > 0) {
            dayScheduled.bySlot.Morning.supplements.forEach((s, i) => {
              const task = {
                name: typeof s === 'object' ? s.name : s,
                dose: typeof s === 'object' ? s.dose : '',
                unit: typeof s === 'object' ? s.unit : '',
                type: 'supplement',
                time: 'AM',
                delivery: typeof s === 'object' ? s.delivery : 'oral'
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'AM'
              });
            });
          }
        }
        
        // PM tasks
        if (dayScheduled.bySlot.PM) {
          if (dayScheduled.bySlot.PM.peptides?.length > 0) {
            dayScheduled.bySlot.PM.peptides.forEach((p, i) => {
              const task = {
                name: typeof p === 'object' ? p.name : p,
                dose: typeof p === 'object' ? p.dose : '',
                unit: typeof p === 'object' ? p.unit : '',
                type: 'peptide',
                time: 'PM',
                delivery: typeof p === 'object' ? p.delivery : 'injection',
                deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                penColor: typeof p === 'object' ? p.penColor : undefined,
                penType: typeof p === 'object' ? p.penType : undefined
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'PM'
              });
            });
          }
          
          if (dayScheduled.bySlot.PM.supplements?.length > 0) {
            dayScheduled.bySlot.PM.supplements.forEach((s, i) => {
              const task = {
                name: typeof s === 'object' ? s.name : s,
                dose: typeof s === 'object' ? s.dose : '',
                unit: typeof s === 'object' ? s.unit : '',
                type: 'supplement',
                time: 'PM',
                delivery: typeof s === 'object' ? s.delivery : 'oral'
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'PM'
              });
            });
          }
        }
        
        // Legacy Evening tasks (mapped to PM)
        if (dayScheduled.bySlot.Evening) {
          if (dayScheduled.bySlot.Evening.peptides?.length > 0) {
            dayScheduled.bySlot.Evening.peptides.forEach((p, i) => {
              const task = {
                name: typeof p === 'object' ? p.name : p,
                dose: typeof p === 'object' ? p.dose : '',
                unit: typeof p === 'object' ? p.unit : '',
                type: 'peptide',
                time: 'PM',
                delivery: typeof p === 'object' ? p.delivery : 'injection',
                deliveryMethod: typeof p === 'object' ? p.deliveryMethod : 'injection',
                penColor: typeof p === 'object' ? p.penColor : undefined,
                penType: typeof p === 'object' ? p.penType : undefined
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'PM'
              });
            });
          }
          
          if (dayScheduled.bySlot.Evening.supplements?.length > 0) {
            dayScheduled.bySlot.Evening.supplements.forEach((s, i) => {
              const task = {
                name: typeof s === 'object' ? s.name : s,
                dose: typeof s === 'object' ? s.dose : '',
                unit: typeof s === 'object' ? s.unit : '',
                type: 'supplement',
                time: 'PM',
                delivery: typeof s === 'object' ? s.delivery : 'oral'
              };
              tasks.push({
                ...task,
                date: currentDate,
                dateKey: dateKey,
                timeSlot: 'PM'
              });
            });
          }
        }
      }
    }
    
    return tasks;
  };

  const allTasks = getAllTasksForMonth();

  // Group tasks by date
  const tasksByDate = allTasks.reduce((acc, task) => {
    const dateKey = task.dateKey;
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: task.date,
        tasks: []
      };
    }
    acc[dateKey].tasks.push(task);
    return acc;
  }, {});

  if (!open || !date) {
    return null;
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={title} 
      theme={theme}
      size="large"
      footer={(
        <button 
          onClick={onClose} 
          className="px-4 py-2 rounded-md" 
          style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
        >
          Close
        </button>
      )}
    >
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.keys(tasksByDate).length === 0 ? (
          <div className="text-center py-8" style={{ color: theme?.textLight }}>
            No research scheduled for this month
          </div>
        ) : (
          Object.entries(tasksByDate)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([dateKey, { date, tasks }]) => (
              <div key={dateKey} className="border rounded-lg p-3" style={{ borderColor: theme?.border, backgroundColor: theme?.cardBackground }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: theme?.text }}>
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}, {formatMMDDYYYY(date)}
                  </h3>
                  <span className="text-xs" style={{ color: theme?.textLight }}>
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {tasks.map((task, i) => (
                    <TaskDisplay
                      key={`${dateKey}-${i}`}
                      task={task}
                      theme={theme}
                      date={task.date}
                      timeSlot={task.timeSlot}
                      onToggle={onToggleSlot}
                      size="normal"
                    />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </Modal>
  );
}
