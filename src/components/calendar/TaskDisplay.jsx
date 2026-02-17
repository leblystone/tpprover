import React, { useState, useEffect } from 'react';
import { Pill, Check, PenTool, Beaker, Pipette } from 'lucide-react';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isTaskCompleted, generateTaskId } from '../../utils/taskCompletion';

// Delivery icon component
const DeliveryIcon = ({ task, theme, size = 14 }) => {
  if (task.type === 'peptide') {
    // Check both deliveryMethod and delivery fields, with fallback
    const deliveryMethod = task.deliveryMethod || task.delivery || 'injection';
    const deliveryLower = String(deliveryMethod).toLowerCase();
    
    if (deliveryLower === 'pen') {
      return <PenTool size={size} style={{ color: theme.textLight }} />;
    }
    if (deliveryLower === 'syringe' || deliveryLower === 'pipette' || deliveryLower === 'injection') {
      return <Pipette size={size} style={{ color: theme.textLight }} />;
    }
    if (deliveryLower === 'nasal') {
      return <Pipette size={size} style={{ color: theme.textLight }} />;
    }
    // Default fallback for peptides (typically injected)
    return <Pipette size={size} style={{ color: theme.textLight }} />;
  }
  
  if (task.type === 'supplement') {
    // Match TasksList logic: check both delivery and deliveryMethod
    const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
    if (delivery === 'injection' || delivery === 'syringe') {
      return <Pipette size={size} style={{ color: theme.textLight }} />;
    }
    if (delivery === 'powder') {
      return <Beaker size={size} style={{ color: theme.textLight }} />;
    }
    if (delivery === 'pill' || delivery === 'oral') {
      return <Pill size={size} style={{ color: theme.textLight }} />;
    }
    // Default to pill for supplements
    return <Pill size={size} style={{ color: theme.textLight }} />;
  }
  
  return null;
};

// Pen color resolution function
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

// Main TaskDisplay component
// Styled to match Today's Research widget (TasksList) for visual consistency
const TaskDisplay = ({ 
  task, 
  theme, 
  date, 
  timeSlot, 
  onToggle, 
  size = 'normal', // 'compact', 'normal', 'detailed'
  showCheckbox = true,
  showPenDetails = true,
  dateKey: dateKeyOverride,
  disableInjectionSelector = false // Allow parent to handle injection selector
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
      setIsCompleted(completed);
    };
    
    // Check immediately
    checkCompletion();
    
    // Listen for task completion events to update
    const handleTaskCompletionChange = (e) => {
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
    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
    
    // If injection selector is disabled, let parent handle it
    if (isInjection && !isCompleted && !disableInjectionSelector) {
      setShowInjectionSelector(true);
    } else if (onToggle) {
      onToggle(task, date);
    }
  };

  const isPM = timeSlot === 'PM';

  // Left border color matches Today's Research widget: PM = darker, AM = lighter
  const borderLeftColor = isPM
    ? `3px solid ${theme.isDark ? 'rgba(160, 180, 153, 0.5)' : theme.primaryDark || 'rgba(75, 95, 88, 0.5)'}`
    : `3px solid ${theme.isDark ? 'rgba(160, 180, 153, 0.2)' : theme.primary + '40'}`;

  // Checkbox color: PM gets darker shade (matches Today's Research)
  const checkboxBg = isCompleted
    ? (isPM
        ? (theme.isDark ? '#a0b499' : (theme.primaryDark || '#3d5a4c'))
        : (theme.isDark ? '#6b7f65' : theme.primary))
    : 'transparent';
  const checkboxBorder = isCompleted
    ? (isPM
        ? (theme.isDark ? '#a0b499' : (theme.primaryDark || '#3d5a4c'))
        : (theme.isDark ? '#6b7f65' : theme.primary))
    : `${theme.primaryLight}60`;

  return (
    <div 
      className="flex items-center justify-between gap-2 py-2.5 sm:py-3 px-3 min-w-0 transition-all duration-200"
      style={{ 
        backgroundColor: 'transparent',
        borderLeft: borderLeftColor,
      }}
    >
      {/* Left: Task name */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className={`font-semibold text-xs sm:text-sm truncate ${isCompleted ? 'line-through decoration-2' : ''}`} style={{ color: isCompleted ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.text }}>
            {task.name}
          </div>
        </div>
      </div>

      {/* Right: Details + Checkbox */}
      <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${isCompleted ? 'line-through decoration-2' : ''}`} style={{ color: isCompleted ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : undefined }}>
        {/* Dose and units */}
        <div className="text-right">
          <div className="font-medium text-xs sm:text-sm whitespace-nowrap" style={{ color: isCompleted ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.text }}>
            {task.dose}{task.unit ? ` ${task.unit}` : ''}
          </div>
        </div>

        {/* Pen color and type (if pen delivery or penColor present) */}
        {task.penColor && showPenDetails && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <div 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm flex-shrink-0"
              style={{ 
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                background: isCompleted ? (theme.isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db') : getChromeGradient(getResolvedPenColor(task.penColor)),
                opacity: isCompleted ? 0.5 : 1
              }}
              title={`Pen Color: ${task.penColor || 'Default'}`}
            />
            {task.penType && (
              <span className="text-[10px] sm:text-xs font-medium hidden xs:inline" style={{ color: isCompleted ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.textLight }}>
                {task.penType.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Delivery method icon */}
        <div className="flex-shrink-0" style={{ opacity: isCompleted ? 0.5 : 1 }}>
          <DeliveryIcon task={task} theme={theme} size={12} />
        </div>

        {/* Checkbox - Matching Today's Research widget design exactly */}
        {showCheckbox && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggle();
            }}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation"
            style={{
              borderColor: checkboxBorder,
              backgroundColor: checkboxBg,
              borderRadius: '4px',
              minWidth: '20px',
              minHeight: '20px',
              WebkitTapHighlightColor: 'transparent'
            }}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted && (
              <Check 
                size={14} 
                className="sm:w-[18px] sm:h-[18px] absolute text-white" 
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
