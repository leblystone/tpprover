import React, { useState, useMemo, useRef } from 'react';
import { CheckSquare, PenTool, Check, Beaker, Pill, Clock, MapPin, History, Pipette, ChevronDown, Zap, CheckCheck } from 'lucide-react';
import TasksList from '../TasksList';
import InjectionSiteSelector from '../../common/InjectionSiteSelector';
import InjectionHistoryModal from '../../common/InjectionHistoryModal';
import { penColors } from '../../../utils/penColors';
import { getChromeGradient } from '../../../utils/recon';
import { getInjectionHistory } from '../../../utils/injectionTracking';
import { debugLog } from '../../../utils/debugMode';
import { isInjectionSiteTrackingEnabled } from '../../../utils/injectionSiteSettings';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import ModernTooltip from '../../ui/ModernTooltip';
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

const BookmarkRibbon = ({ theme }) => (
  <div 
    className="absolute -top-1 right-16 w-6 h-10 pointer-events-none hidden sm:block"
    style={{ 
      zIndex: 1,
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))'
    }}
  >
    <div 
      className="w-full h-full"
      style={{
        backgroundColor: theme.primary,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
      }}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
        <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
            backgroundSize: '3px 3px'
        }} />
    </div>
  </div>
);

const TasksWidget = ({ widget, theme, tasks, onToggle, onOpenQuickStart, onOpenFullSetup }) => {
  const [injectionTask, setInjectionTask] = useState(null);
  const [showInjectionHistory, setShowInjectionHistory] = useState(false);
  const [showStartOptions, setShowStartOptions] = useState(false);
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
      <div className="h-full flex flex-col relative">
        <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 relative z-10 widget-separator`} style={{ 
        borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', 
        background: theme.isDark 
          ? `linear-gradient(135deg, ${theme.primary}30, rgba(255,255,255,0.05))` 
          : `linear-gradient(135deg, ${theme.primary}15, rgba(255,255,255,0.6))`,
        backdropFilter: 'blur(8px)'
      }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-bold flex items-center gap-2 truncate tracking-tight" style={{ color: theme.text }}>
              Today's Research
              <div className="p-1 rounded-md" style={{ background: theme.primary, color: '#fff' }}>
                <CheckSquare size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
              </div>
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
              {hasInjectionTasks && (
                <ModernTooltip text="Site History" position="top">
                  <button
                    onClick={() => setShowInjectionHistory(true)}
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
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                  </button>
                </ModernTooltip>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
          {!showStartOptions ? (
            <>
              <p className="text-sm text-center px-2" style={{ color: theme.textLight }}>
                No research scheduled for today
              </p>
              <button
                type="button"
                onClick={() => (onOpenQuickStart || onOpenFullSetup) && setShowStartOptions(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  color: theme.primary,
                  backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
                  border: `1px solid ${theme.primary}40`
                }}
              >
                Let&apos;s Start
                <ChevronDown size={14} />
              </button>
            </>
          ) : (
            <div className="w-full max-w-[260px] space-y-2 overflow-y-auto">
              {onOpenQuickStart && (
                <button
                  type="button"
                  onClick={() => { setShowStartOptions(false); onOpenQuickStart(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    color: theme.text,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    border: `1px solid ${theme.border}`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                >
                  <Zap size={18} style={{ color: theme.primary }} fill={theme.primary} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">Quick Start Protocol</div>
                    <div className="text-[10px] opacity-60">30 sec, add details later</div>
                  </div>
                </button>
              )}
              {onOpenFullSetup && (
                <button
                  type="button"
                  onClick={() => { setShowStartOptions(false); onOpenFullSetup(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    color: theme.text,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    border: `1px solid ${theme.border}`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : 'rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary; }}
                >
                  <CheckCheck size={18} style={{ color: theme.textLight }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">Full Protocol Setup</div>
                    <div className="text-[10px] opacity-60">Complete details</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
        
        <InjectionHistoryModal
          isOpen={showInjectionHistory}
          onClose={() => setShowInjectionHistory(false)}
          theme={theme}
        />
      </div>
    );
  }

  // If few tasks, show compact layout with modernized display
  if (filteredTasks.length <= 3) {
    return (
      <div className="h-full flex flex-col overflow-hidden relative">
      <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 flex-shrink-0 relative z-10 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', background: theme.isDark ? `linear-gradient(135deg, ${theme.primary}15, transparent)` : `linear-gradient(135deg, ${theme.primary}08, ${theme.primary}03)` }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
            Today's Research
            <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            {hasInjectionTasks && (
              <ModernTooltip text="Site History" position="top">
                <button
                  onClick={() => setShowInjectionHistory(true)}
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
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            )}
          </div>
        </div>
      </div>
        
        <div className="flex-1 p-2 sm:p-4 overflow-hidden overflow-y-auto pr-1 sm:pr-2">
          <TasksList
            tasks={filteredTasks}
            theme={theme}
            onToggle={onToggle}
            setInjectionTask={setInjectionTask}
          />
        </div>
        
        <InjectionSiteSelector
          taskName={injectionTask?.name}
          task={injectionTask}
          onConfirm={(injectionSite) => {
            debugLog('💉 TasksWidget injection confirmed:', injectionSite, 'tasks');
            const taskToToggle = injectionTask;
            setInjectionTask(null);
            if (taskToToggle) onToggle(taskToToggle);
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
    <div className="h-full flex flex-col overflow-hidden relative">
      <BookmarkRibbon theme={theme} />
      <div className={`px-4 py-3 flex-shrink-0 relative z-10 widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.15)', background: theme.isDark ? `linear-gradient(135deg, ${theme.primary}15, transparent)` : `linear-gradient(135deg, ${theme.primary}08, ${theme.primary}03)` }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate" style={{ color: theme.text }}>
            {widget.title}
            <CheckSquare size={16} className="sm:w-5 sm:h-5 flex-shrink-0" style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tasks} theme={theme} />
            {hasInjectionTasks && (
              <ModernTooltip text="Site History" position="top">
                <button
                  onClick={() => setShowInjectionHistory(true)}
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
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <History size={14} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                </button>
              </ModernTooltip>
            )}
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
