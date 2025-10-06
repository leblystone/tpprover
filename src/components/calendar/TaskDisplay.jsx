import React, { useState, useEffect } from 'react';
import { Pill, Syringe, Check, PenTool, Droplet, Beaker } from 'lucide-react';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isTaskCompleted, generateTaskId } from '../../utils/taskCompletion';

// Delivery icon component
const DeliveryIcon = ({ task, theme, size = 14 }) => {
  if (task.type === 'peptide') {
    if (task.deliveryMethod === 'pen') {
      return <PenTool size={size} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'syringe') {
      return <Syringe size={size} style={{ color: theme.textLight }} />;
    }
    if (task.deliveryMethod === 'nasal') {
      return <Droplet size={size} style={{ color: theme.textLight }} />;
    }
  }
  
  if (task.type === 'supplement') {
    switch (String(task.delivery || '').toLowerCase()) {
      case 'injection': return <Syringe size={size} style={{ color: theme.textLight }} />;
      case 'powder': return <Beaker size={size} style={{ color: theme.textLight }} />;
      case 'pill':
      case 'oral':
      default: return <Pill size={size} style={{ color: theme.textLight }} />;
    }
  }
  
  return null;
};

// Pen color resolution function
const getResolvedPenColor = (penColor) => {
  if (!penColor) return '#9ca3af';
  const raw = String(penColor).trim();
  const isHex = raw.startsWith('#');
  if (isHex) return raw;
  
  // Find color by name in penColors array
  const foundColor = penColors.find(color => 
    color.name.toLowerCase() === raw.toLowerCase()
  );
  
  return foundColor ? foundColor.hex : '#9ca3af';
};

// Main TaskDisplay component
const TaskDisplay = ({ 
  task, 
  theme, 
  date, 
  timeSlot, 
  onToggle, 
  size = 'normal', // 'compact', 'normal', 'detailed'
  showCheckbox = true,
  showPenDetails = true,
  dateKey: dateKeyOverride
}) => {
  // Prefer an explicit date key if provided to avoid timezone parsing issues
  const dateKey = dateKeyOverride || (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '');
  const taskId = generateTaskId(task);
  
  // State to track completion status - this will trigger re-renders
  const [isCompleted, setIsCompleted] = useState(() => {
    return dateKey ? isTaskCompleted(taskId, dateKey, timeSlot) : (task.completed || false);
  });
  const [showInjectionSelector, setShowInjectionSelector] = useState(false);
  
  // Update completion status when props change or when global event fires
  useEffect(() => {
    const checkCompletion = () => {
      const completed = dateKey ? isTaskCompleted(taskId, dateKey, timeSlot) : (task.completed || false);
      console.log('🔍 TaskDisplay checking completion:', {
        taskName: task.name,
        taskId,
        dateKey,
        timeSlot,
        completed
      });
      setIsCompleted(completed);
    };
    
    // Check immediately
    checkCompletion();
    
    // Listen for task completion events to update
    const handleTaskCompletionChange = (e) => {
      console.log('📡 TaskDisplay received task completion event:', e.detail);
      checkCompletion();
    };
    
    window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    
    return () => {
      window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
    };
  }, [dateKey, taskId, timeSlot, task.completed, task.name]);

  const handleToggle = () => {
    // Check if this is an injection task that's not completed
    const deliveryMethod = task.deliveryMethod || task.delivery;
    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    
    if (isInjection && !isCompleted) {
      setShowInjectionSelector(true);
    } else if (onToggle) {
      onToggle(task, date);
    }
  };

  // Size-based styling
  const sizeClasses = {
    compact: {
      container: 'flex items-center gap-1 text-xs p-1 rounded',
      checkbox: 'w-3 h-3',
      name: 'text-xs',
      details: 'text-xs',
      penSwatch: 'w-2 h-2',
      penType: 'text-xs'
    },
    normal: {
      container: 'flex items-center gap-2 text-sm p-2 rounded',
      checkbox: 'w-4 h-4',
      name: 'text-sm',
      details: 'text-sm',
      penSwatch: 'w-3 h-3',
      penType: 'text-xs'
    },
    detailed: {
      container: 'flex items-center gap-3 text-base p-3 rounded',
      checkbox: 'w-5 h-5',
      name: 'text-base',
      details: 'text-sm',
      penSwatch: 'w-4 h-4',
      penType: 'text-sm'
    }
  };

  const styles = sizeClasses[size] || sizeClasses.normal;

  return (
    <div 
      className={`${styles.container} ${isCompleted ? 'line-through decoration-2 text-gray-400' : ''}`}
      style={{ 
        backgroundColor: isCompleted ? '#F3F4F6' : (task.type === 'peptide' ? theme.primary + '20' : theme.secondary),
        borderLeft: isCompleted ? '3px solid #4CAF50' : 'none',
        paddingLeft: isCompleted ? 'calc(0.5rem - 3px)' : undefined
      }}
    >
      {/* Task name */}
      <div className="flex-1 min-w-0">
        <div className={`${styles.name} font-semibold truncate`} style={{ color: isCompleted ? '#9ca3af' : theme.text }}>
          {task.name}
        </div>
      </div>

      {/* Right-aligned details */}
      <div className={`text-right flex items-center gap-2 ${isCompleted ? 'line-through decoration-2 text-gray-400' : ''}`}>
        {/* Dose and units */}
        <div className="text-right">
          <div className={`${styles.details} font-semibold`} style={{ color: isCompleted ? '#9ca3af' : theme.text }}>
            {task.dose}{task.unit ? ` ${task.unit}` : ''}
          </div>
        </div>

        {/* Pen color and type (if pen delivery) */}
        {task.deliveryMethod === 'pen' && showPenDetails && (
          <div className="flex items-center gap-1">
            <div 
              className={`${styles.penSwatch} rounded-full border border-gray-300 shadow-sm flex-shrink-0`}
              style={{ 
                background: isCompleted ? '#d1d5db' : getChromeGradient(getResolvedPenColor(task.penColor)),
                opacity: isCompleted ? 0.5 : 1
              }}
              title={`Pen Color: ${task.penColor || 'Default'}`}
            />
            {task.penType && (
              <span className={`${styles.penType} font-medium`} style={{ color: isCompleted ? '#9ca3af' : theme.textLight }}>
                {task.penType.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Delivery method icon */}
        <div style={{ opacity: isCompleted ? 0.5 : 1 }}>
          <DeliveryIcon task={task} theme={theme} size={size === 'compact' ? 10 : size === 'normal' ? 14 : 16} />
        </div>

        {/* Checkbox - Matching Today's Research widget design */}
        {showCheckbox && (
          <button
            onClick={handleToggle}
            className="relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer border-2 rounded-sm"
            style={{
              width: size === 'compact' ? '16px' : size === 'normal' ? '24px' : '24px',
              height: size === 'compact' ? '16px' : size === 'normal' ? '24px' : '24px',
              minWidth: size === 'compact' ? '16px' : '24px',
              minHeight: size === 'compact' ? '16px' : '24px',
              backgroundColor: isCompleted ? theme.primary : 'transparent',
              borderColor: isCompleted ? theme.primary : theme.border,
              borderRadius: '4px'
            }}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted && (
              <Check 
                size={size === 'compact' ? 14 : 18} 
                className="absolute text-white" 
                style={{ 
                  strokeWidth: 2.5,
                  top: '-3px',
                  right: '-3px'
                }}
              />
            )}
          </button>
        )}
      </div>
      
      <InjectionSiteSelector
        taskName={task.name}
        task={task}
        onConfirm={(injectionSite) => {
          if (onToggle) {
            onToggle(task, date);
          }
          setShowInjectionSelector(false);
        }}
        onCancel={() => setShowInjectionSelector(false)}
        theme={theme}
        isVisible={showInjectionSelector}
      />
    </div>
  );
};

export default TaskDisplay;
